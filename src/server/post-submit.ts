import type { Firestore } from "firebase-admin/firestore";
import { formatRankMessage } from "@/features/rankings/compute";
import { applyPostSubmitGamification } from "@/server/gamification";
import { createNotification } from "@/server/notifications";
import { enqueueJob } from "@/server/jobs/job-runner";
import { recordActivity } from "@/server/services/engagement/activity.service";
import { missionsService } from "@/server/services/engagement/missions.service";
import { recordRankHistory } from "@/server/services/engagement/rank-history.service";
import { processIncrementalRanking } from "@/server/services/ranking/incremental-rank.service";
import { telegramNotificationService } from "@/server/telegram/notification-service";
import { paths } from "@/lib/firebase/paths";
import type { Exam, ExamResult, Question } from "@/types";

function chapterFromQuestion(q: Question): string {
  return q.tags?.[0] ?? q.sectionId ?? "General";
}

export interface McqSubmitContext {
  uid: string;
  resultId: string;
  exam: Exam;
  result: Omit<ExamResult, "id">;
  questions: Question[];
  timeTakenMs: number;
}

function analyzeAnswers(
  questions: Question[],
  answers: Record<string, number>
): { correct: number; wrong: number; skipped: number } {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  for (const q of questions) {
    const ans = answers[q.id];
    if (ans === undefined) skipped++;
    else if (ans === q.correctIndex) correct++;
    else wrong++;
  }
  return { correct, wrong, skipped };
}

/** Incremental rank + leaderboard cache + gamification (no full exam scan) */
export async function processMcqSubmission(
  db: Firestore,
  ctx: McqSubmitContext
): Promise<{
  rank: number;
  percentile: number;
  participantCount: number;
  xpEarned: number;
  rankDelta: number | null;
}> {
  const { exam, resultId, uid } = ctx;
  const examId = exam.id;
  const score = Number(ctx.result.score);
  const maxScore = ctx.questions.reduce((s, q) => s + (q.points ?? 1), 0);

  const { correct, wrong, skipped } = analyzeAnswers(
    ctx.questions,
    ctx.result.answers ?? {}
  );

  // 1. Mistake handling (Batched)
  const mistakeBatch = db.batch();
  const now = Date.now();
  for (const q of ctx.questions) {
    const ans = ctx.result.answers?.[q.id];
    if (ans !== undefined && ans !== q.correctIndex) {
      mistakeBatch.set(db.doc(paths.userMistake(uid, q.id)), {
        questionId: q.id,
        examId,
        subject: exam.subject ?? "General",
        chapter: chapterFromQuestion(q),
        updatedAt: now,
      });
    }
  }
  await mistakeBatch.commit();

  // 2. Ranking logic
  const prevRankSnap = await db.doc(paths.examRank(examId, uid)).get();
  const previousRank = prevRankSnap.exists ? (prevRankSnap.data()?.rank as number) : undefined;

  const ranking = await processIncrementalRanking(db, {
    examId, exam, uid, resultId, score, maxScore,
    submittedAt: ctx.result.submittedAt,
    timeTakenMs: ctx.timeTakenMs,
    correctCount: correct,
    wrongCount: wrong,
    skippedCount: skipped,
    studentName: ctx.result.studentProfile?.name ?? "Student",
    studentId: ctx.result.studentProfile?.studentId ?? "",
    previousRank,
  });

  // 3. Gamification (Await this first to get xpEarned)
  const { xpEarned, newBadges } = await applyPostSubmitGamification(db, {
    uid, examId,
    examTitle: exam.title,
    subject: exam.subject,
    score, maxScore,
    percentile: ranking.percentile,
    rank: ranking.rank,
    accuracy: ranking.accuracy,
    timeTakenMs: ctx.timeTakenMs,
    examDurationMin: exam.duration,
    correctCount: correct,
    wrongCount: wrong,
    skippedCount: skipped,
  });

  // 4. Group all side-effects to run in parallel
  const sideEffects = [
    db.doc(paths.result(resultId)).update({
      rank: ranking.rank,
      rankDelta: ranking.rankDelta,
      percentile: ranking.percentile,
      maxScore,
      accuracy: ranking.accuracy,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      timeTakenMs: ctx.timeTakenMs,
      isBestScore: true,
    }),
    updateGlobalLeaderboardEntry(
      db, uid,
      ctx.result.studentProfile?.name ?? "Student",
      ctx.result.studentProfile?.studentId ?? ""
    ),
    recordRankHistory(db, {
      uid, examId,
      examTitle: exam.title,
      subject: exam.subject ?? "General",
      rank: ranking.rank,
      previousRank: previousRank ?? null,
      percentile: ranking.percentile,
      score, maxScore,
    }),
    missionsService.increment(uid, "complete_exam", 1),
    missionsService.increment(uid, "earn_xp", xpEarned),
    recordActivity(db, {
      uid,
      studentId: ctx.result.studentProfile?.studentId ?? "",
      name: ctx.result.studentProfile?.name ?? "Student",
      type: "exam_submit",
      title: exam.title,
      message: `Rank #${ranking.rank} · Top ${ranking.percentile}%`,
    }),
    // Notifications and Badge Activities
    (async () => {
      const notifications = [
        createNotification(db, uid, {
          title: "Exam submitted",
          message: formatRankMessage(ranking.rank, ranking.participantCount, ranking.percentile),
          type: "success",
          link: `/exam/${examId}/result/${resultId}`,
        })
      ];
      if (ranking.rankDelta != null && ranking.rankDelta > 0) {
        notifications.push(createNotification(db, uid, {
          title: "Rank improved!",
          message: `You moved up ${ranking.rankDelta} place(s) to #${ranking.rank}`,
          type: "success",
          link: `/exam/${examId}/result/${resultId}`,
        }));
      }
      if (newBadges.length > 0) {
        notifications.push(createNotification(db, uid, {
          title: "Achievement unlocked",
          message: `You earned: ${newBadges.join(", ")}`,
          type: "success",
          link: "/student?tab=achievements",
        }));
        for (const badge of newBadges) {
          notifications.push(recordActivity(db, {
            uid,
            studentId: ctx.result.studentProfile?.studentId ?? "",
            name: ctx.result.studentProfile?.name ?? "Student",
            type: "achievement",
            title: "Achievement unlocked",
            message: badge,
          }));
        }
      }
      
      // Send Telegram notification (fire and forget)
      telegramNotificationService.notifyResult(
        uid,
        exam.title,
        score,
        maxScore
      ).catch(console.error);

      await Promise.all(notifications);
    })()
  ];

  await Promise.all(sideEffects);

  enqueueJob({ type: "analytics.rebuild", payload: { examId } });

  return {
    rank: ranking.rank,
    percentile: ranking.percentile,
    participantCount: ranking.participantCount,
    xpEarned,
    rankDelta: ranking.rankDelta,
  };
}

async function updateGlobalLeaderboardEntry(
  db: Firestore,
  uid: string,
  name: string,
  studentId: string
): Promise<void> {
  const profileSnap = await db.doc(paths.userProfile(uid)).get();
  const profile = profileSnap.data();
  await db.doc(paths.globalLeaderboardEntry(uid)).set(
    {
      uid,
      name,
      studentId,
      xp: profile?.xp ?? 0,
      level: profile?.level ?? 1,
      examsCompleted: profile?.stats?.examsCompleted ?? 0,
      avgPercentile: profile?.stats?.avgPercentile ?? 0,
      streak: profile?.streak?.current ?? 0,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

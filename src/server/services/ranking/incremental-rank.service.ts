import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import { computeRanks, type ScorableResult } from "@/features/rankings/compute";
import { trackQuery } from "@/server/observability/query-metrics";
import { examStatsRepository } from "@/server/repositories/exam-stats.repository";
import type { Exam, ExamResult } from "@/types";
import type {
  ExamLeaderboardDoc,
  LeaderboardTopEntry,
} from "@/types/gamification";
import type { PeriodLeaderboardDoc } from "@/types/aggregates";

const TOP_N = 50;

export interface IncrementalRankInput {
  examId: string;
  exam: Exam;
  uid: string;
  resultId: string;
  score: number;
  maxScore: number;
  submittedAt: number;
  timeTakenMs: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  studentName: string;
  studentId: string;
  previousRank?: number;
}

export interface IncrementalRankResult {
  rank: number;
  percentile: number;
  participantCount: number;
  rankDelta: number | null;
  accuracy: number;
}

function periodKeys(now = Date.now()) {
  const d = new Date(now);
  const year = d.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((d.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7
  );
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return {
    weekly: `weekly-${year}-W${String(week).padStart(2, "0")}`,
    monthly: `monthly-${year}-${month}`,
  };
}

/** O(1) count queries — no full collection scan */
async function countRankPosition(
  db: Firestore,
  examId: string,
  score: number,
  submittedAt: number
): Promise<number> {
  const resultsCol = db.collection(paths.results());

  const higherSnap = await resultsCol
    .where("examId", "==", examId)
    .where("score", ">", score)
    .count()
    .get();
  const higher = higherSnap.data().count;

  const tieSnap = await resultsCol
    .where("examId", "==", examId)
    .where("score", "==", score)
    .where("submittedAt", "<", submittedAt)
    .count()
    .get();
  const ties = tieSnap.data().count;

  return higher + ties + 1;
}

function mergeIntoTopN(
  current: LeaderboardTopEntry[],
  entry: LeaderboardTopEntry,
  maxScore: number
): LeaderboardTopEntry[] {
  const scorable: ScorableResult[] = [
    ...current.map((e) => ({
      uid: e.uid,
      resultId: "",
      score: e.score,
      submittedAt: 0,
      timeTakenMs: e.timeTakenMs,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      studentName: e.name,
      studentId: e.studentId,
    })),
    {
      uid: entry.uid,
      resultId: "",
      score: entry.score,
      submittedAt: Date.now(),
      timeTakenMs: entry.timeTakenMs,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      studentName: entry.name,
      studentId: entry.studentId,
    },
  ];
  const unique = new Map<string, ScorableResult>();
  for (const s of scorable) {
    const prev = unique.get(s.uid);
    if (!prev || s.score > prev.score) unique.set(s.uid, s);
  }
  const { top } = computeRanks([...unique.values()], maxScore);
  return top.slice(0, TOP_N);
}

async function updatePeriodLeaderboard(
  db: Firestore,
  periodKey: string,
  period: PeriodLeaderboardDoc["period"],
  entry: LeaderboardTopEntry,
  maxScore: number
): Promise<void> {
  const ref = db.doc(paths.periodLeaderboard(periodKey));
  const snap = await ref.get();
  const existing = (snap.data() as PeriodLeaderboardDoc | undefined)?.topEntries ?? [];
  const topEntries = mergeIntoTopN(existing, entry, maxScore);
  await ref.set({
    period,
    periodKey,
    topEntries,
    updatedAt: Date.now(),
  });
}

export async function processIncrementalRanking(
  db: Firestore,
  input: IncrementalRankInput
): Promise<IncrementalRankResult> {
  return trackQuery("ranking.incremental", async () => {
    const {
      examId,
      exam,
      uid,
      resultId,
      score,
      maxScore,
      submittedAt,
      timeTakenMs,
      studentName,
      studentId,
    } = input;

    const participantCount = await examStatsRepository.incrementParticipant(
      examId,
      maxScore
    );

    const rank = await countRankPosition(db, examId, score, submittedAt);
    const percentile =
      participantCount > 1
        ? Math.round(((participantCount - rank) / (participantCount - 1)) * 1000) / 10
        : 100;
    const accuracy =
      maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

    const rankDelta =
      input.previousRank != null ? input.previousRank - rank : null;

    const topEntry: LeaderboardTopEntry = {
      uid,
      studentId,
      name: studentName,
      rank,
      score,
      maxScore,
      percentile,
      accuracy,
      timeTakenMs,
    };

    const lbRef = db.doc(paths.examLeaderboard(examId));
    const lbSnap = await lbRef.get();
    const prevTop =
      (lbSnap.data() as ExamLeaderboardDoc | undefined)?.topEntries ?? [];
    const topEntries = mergeIntoTopN(prevTop, topEntry, maxScore);

    const leaderboard: ExamLeaderboardDoc = {
      examId,
      examTitle: exam.title,
      subject: exam.subject ?? "General",
      participantCount,
      updatedAt: Date.now(),
      topEntries,
    };
    await lbRef.set(leaderboard);

    await db.doc(paths.examRank(examId, uid)).set({
      examId,
      resultId,
      uid,
      rank,
      percentile,
      score,
      maxScore,
      accuracy,
      rankDelta,
      timeTakenMs,
      studentName,
      studentId,
      submittedAt,
    });

    const periods = periodKeys();
    await updatePeriodLeaderboard(
      db,
      periods.weekly,
      "weekly",
      topEntry,
      maxScore
    );
    await updatePeriodLeaderboard(
      db,
      periods.monthly,
      "monthly",
      topEntry,
      maxScore
    );

    if (exam.subject) {
      const subRef = db.doc(paths.subjectLeaderboard(exam.subject));
      const subSnap = await subRef.get();
      const subTop =
        (subSnap.data() as { topEntries?: LeaderboardTopEntry[] })?.topEntries ?? [];
      await subRef.set({
        subject: exam.subject,
        topEntries: mergeIntoTopN(subTop, topEntry, maxScore),
        updatedAt: Date.now(),
      });
    }

    await db.doc(paths.examAnalytics(examId)).set(
      {
        examId,
        participantCount,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return {
      rank,
      percentile,
      participantCount,
      rankDelta,
      accuracy,
    };
  });
}

/** Full rebuild — only for admin/job use */
export async function rebuildExamLeaderboard(
  db: Firestore,
  examId: string,
  examTitle: string,
  subject: string,
  maxScore: number
): Promise<void> {
  const snap = await db
    .collection(paths.results())
    .where("examId", "==", examId)
    .get();

  const scorable: ScorableResult[] = [];
  for (const doc of snap.docs) {
    const d = doc.data() as ExamResult;
    if (typeof d.score !== "number") continue;
    scorable.push({
      uid: d.uid,
      resultId: doc.id,
      score: d.score,
      submittedAt: d.submittedAt ?? 0,
      timeTakenMs: d.timeTakenMs ?? 0,
      correctCount: d.correctCount ?? 0,
      wrongCount: d.wrongCount ?? 0,
      skippedCount: d.skippedCount ?? 0,
      studentName: d.studentProfile?.name ?? "Student",
      studentId: d.studentProfile?.studentId ?? "",
    });
  }

  const { top } = computeRanks(scorable, maxScore);
  await db.doc(paths.examLeaderboard(examId)).set({
    examId,
    examTitle,
    subject,
    participantCount: scorable.length,
    updatedAt: Date.now(),
    topEntries: top,
  });

  await db.doc(paths.examStats(examId)).set({
    examId,
    participantCount: scorable.length,
    maxScore,
    updatedAt: Date.now(),
  });
}

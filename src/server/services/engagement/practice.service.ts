import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { calculateMcqScore } from "@/lib/exam/scoring";
import { XP_REWARDS } from "@/features/gamification/xp";
import { levelFromXp, titleForLevel } from "@/features/gamification/xp";
import { missionsService } from "@/server/services/engagement/missions.service";
import { recordActivity } from "@/server/services/engagement/activity.service";
import type { Exam, Question } from "@/types";
import type { PracticeMode, PracticeSession } from "@/types/engagement";

const DEFAULT_LIMIT = 20;

function chapterFromQuestion(q: Question): string {
  return q.tags?.[0] ?? q.sectionId ?? "General";
}

export class PracticeService {
  private db = getAdminDb();

  async startSession(
    uid: string,
    mode: PracticeMode,
    options: {
      subject?: string;
      chapter?: string;
      limit?: number;
      timedMinutes?: number;
    }
  ): Promise<{ session: PracticeSession; questions: Question[] }> {
    const limit = Math.min(50, options.limit ?? DEFAULT_LIMIT);
    let questions: Question[] = [];

    if (mode === "daily") {
      const dateKey = new Date().toISOString().slice(0, 10);
      const challengeRef = this.db.doc(paths.dailyChallenge(dateKey));
      const challenge = await challengeRef.get();
      if (challenge.exists) {
        const ids = (challenge.data()?.questionIds ?? []) as string[];
        questions = await this.loadQuestionsByIds(ids.slice(0, limit));
      } else {
        const qSnap = await this.db.collection(paths.questions()).limit(50).get();
        const ids = qSnap.docs.map((d) => d.id).sort(() => Math.random() - 0.5).slice(0, limit);
        await challengeRef.set({ dateKey, questionIds: ids, createdAt: Date.now() });
        questions = await this.loadQuestionsByIds(ids);
      }
    }

    if (mode === "mistakes") {
      const snap = await this.db.collection(paths.userMistakes(uid)).limit(limit).get();
      const ids = snap.docs.map((d) => d.id);
      questions = await this.loadQuestionsByIds(ids);
    }

    if (mode === "weak" || mode === "adaptive") {
      const mistakes = await this.db.collection(paths.userMistakes(uid)).limit(30).get();
      const mistakeIds = new Set(mistakes.docs.map((d) => d.id));
      const qSnap = await this.db.collection(paths.questions()).limit(300).get();
      questions = qSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Question)
        .filter((q) => mistakeIds.has(q.id) || q.difficulty === "hard")
        .slice(0, limit);
    }

    if (mode === "subject" && options.subject) {
      const examsSnap = await this.db
        .collection(paths.exams())
        .where("subject", "==", options.subject)
        .limit(20)
        .get();
      const examIds = examsSnap.docs.map((d) => d.id);
      questions = await this.loadQuestionsForExams(examIds, limit);
    }

    if (mode === "chapter" && options.subject && options.chapter) {
      const examsSnap = await this.db
        .collection(paths.exams())
        .where("subject", "==", options.subject)
        .limit(20)
        .get();
      const examIds = examsSnap.docs.map((d) => d.id);
      const all = await this.loadQuestionsForExams(examIds, 200);
      questions = all
        .filter((q) => chapterFromQuestion(q) === options.chapter)
        .slice(0, limit);
    }

    if (mode === "timed" || questions.length === 0) {
      const qSnap = await this.db
        .collection(paths.questions())
        .limit(limit * 3)
        .get();
      questions = qSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Question)
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
    }

    if (questions.length === 0) {
      throw new Error("No practice questions available");
    }

    const session: Omit<PracticeSession, "id"> = {
      uid,
      mode,
      subject: options.subject,
      chapter: options.chapter,
      questionIds: questions.map((q) => q.id),
      startedAt: Date.now(),
    };

    const ref = await this.db.collection(paths.userPracticeSessions(uid)).add(session);
    return {
      session: { id: ref.id, ...session },
      questions,
    };
  }

  async submitSession(
    uid: string,
    sessionId: string,
    answers: Record<string, number>,
    timeTakenMs: number
  ): Promise<PracticeSession & { xpEarned: number }> {
    const ref = this.db.doc(paths.userPracticeSession(uid, sessionId));
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Session not found");
    const session = { id: snap.id, ...snap.data() } as PracticeSession;
    if (session.uid !== uid) throw new Error("Forbidden");

    const questions = await this.loadQuestionsByIds(session.questionIds);
    const { score, maxScore } = calculateMcqScore(questions, answers, 0);
    const accuracy = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

    for (const q of questions) {
      const ans = answers[q.id];
      if (ans === undefined) continue;
      if (ans !== q.correctIndex) {
        const examSnap = await this.db.doc(paths.exam(q.examId)).get();
        const subject = (examSnap.data() as Exam | undefined)?.subject ?? "General";
        await this.db.doc(paths.userMistake(uid, q.id)).set({
          questionId: q.id,
          examId: q.examId,
          subject,
          chapter: chapterFromQuestion(q),
          updatedAt: Date.now(),
        });
      }
    }

    const xpEarned = Math.round(
      XP_REWARDS.examComplete * 0.3 + questions.length * 2
    );

    const completed: PracticeSession = {
      ...session,
      completedAt: Date.now(),
      score,
      maxScore,
      accuracy,
      timeTakenMs,
      answers,
    };
    await ref.set(completed);

    const profileRef = this.db.doc(paths.userProfile(uid));
    const profile = await profileRef.get();
    const currentXp = (profile.data()?.xp as number) ?? 0;
    const totalXp = currentXp + xpEarned;
    await profileRef.update({
      xp: totalXp,
      level: levelFromXp(totalXp),
      title: titleForLevel(levelFromXp(totalXp)),
      updatedAt: Date.now(),
    });

    await missionsService.increment(uid, "practice_questions", questions.length);
    await recordActivity(this.db, {
      uid,
      studentId: profile.data()?.studentId ?? "",
      name: profile.data()?.name ?? "Student",
      type: "practice",
      title: "Practice completed",
      message: `${accuracy}% accuracy · ${questions.length} questions`,
    });

    return { ...completed, xpEarned };
  }

  async getHistory(uid: string, limit = 20): Promise<PracticeSession[]> {
    const snap = await this.db
      .collection(paths.userPracticeSessions(uid))
      .orderBy("startedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PracticeSession);
  }

  private async loadQuestionsByIds(ids: string[]): Promise<Question[]> {
    const out: Question[] = [];
    await Promise.all(
      ids.map(async (id) => {
        const s = await this.db.doc(paths.question(id)).get();
        if (s.exists) out.push({ id: s.id, ...s.data() } as Question);
      })
    );
    return out;
  }

  private async loadQuestionsForExams(
    examIds: string[],
    limit: number
  ): Promise<Question[]> {
    const out: Question[] = [];
    for (const examId of examIds) {
      if (out.length >= limit) break;
      const snap = await this.db
        .collection(paths.questions())
        .where("examId", "==", examId)
        .limit(limit - out.length)
        .get();
      out.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question));
    }
    return out.sort(() => Math.random() - 0.5).slice(0, limit);
  }
}

export const practiceService = new PracticeService();

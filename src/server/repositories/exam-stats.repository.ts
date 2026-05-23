import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import type { ExamStatsDoc } from "@/types/aggregates";

export class ExamStatsRepository {
  private db = getAdminDb();

  async get(examId: string): Promise<ExamStatsDoc | null> {
    return trackQuery("exam_stats.get", async () => {
      const snap = await this.db.doc(paths.examStats(examId)).get();
      if (!snap.exists) return null;
      return snap.data() as ExamStatsDoc;
    });
  }

  async incrementParticipant(examId: string, maxScore: number): Promise<number> {
    return trackQuery("exam_stats.incrementParticipant", async () => {
      const ref = this.db.doc(paths.examStats(examId));
      await ref.set(
        {
          examId,
          participantCount: FieldValue.increment(1),
          maxScore,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      const snap = await ref.get();
      return (snap.data()?.participantCount as number) ?? 1;
    });
  }

  async setQuestionCount(examId: string, questionCount: number): Promise<void> {
    await this.db.doc(paths.examStats(examId)).set(
      { examId, questionCount, updatedAt: Date.now() },
      { merge: true }
    );
  }

  async adjustQuestionCount(examId: string, delta: number): Promise<void> {
    await this.db.doc(paths.examStats(examId)).set(
      {
        examId,
        questionCount: FieldValue.increment(delta),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }
}

export const examStatsRepository = new ExamStatsRepository();

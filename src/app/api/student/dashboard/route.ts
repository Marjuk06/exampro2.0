import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import type { Exam, ExamResult, RetakeRequest } from "@/types";

const EXAM_LIMIT = 50;
const RESULT_LIMIT = 100;

export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const db = getAdminDb();

  return trackQuery("api.student.dashboard", async () => {
    const [examsSnap, resultsSnap, retakesSnap] = await Promise.all([
      db
        .collection(paths.exams())
        .orderBy("createdAt", "desc")
        .limit(EXAM_LIMIT)
        .get(),
      db
        .collection(paths.results())
        .where("uid", "==", session.uid)
        .orderBy("submittedAt", "desc")
        .limit(RESULT_LIMIT)
        .get(),
      db
        .collection(paths.retakes())
        .where("uid", "==", session.uid)
        .limit(20)
        .get(),
    ]);

    const exams = examsSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Exam
    );
    const results = resultsSnap.docs.map((d) => ({
      ...(d.data() as ExamResult),
      id: d.id,
    }));
    const retakes = retakesSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as RetakeRequest
    );

    const examIds = [...new Set(exams.map((e) => e.id))];
    const questionCounts: Record<string, number> = {};

    await Promise.all(
      examIds.map(async (examId) => {
        const stats = await db.doc(paths.examStats(examId)).get();
        if (stats.exists && typeof stats.data()?.questionCount === "number") {
          questionCounts[examId] = stats.data()!.questionCount as number;
        } else {
          const countSnap = await db
            .collection(paths.questions())
            .where("examId", "==", examId)
            .count()
            .get();
          questionCounts[examId] = countSnap.data().count;
        }
      })
    );

    return jsonOk({ exams, results, retakes, questionCounts });
  });
});

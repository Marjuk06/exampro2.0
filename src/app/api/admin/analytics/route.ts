import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { filterMcqResults } from "@/lib/firestore/normalize";
import { formatPercent } from "@/lib/utils";
import { trackQuery } from "@/server/observability/query-metrics";
import type { ExamResult } from "@/types";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const db = getAdminDb();

  return trackQuery("api.admin.analytics", async () => {
    const globalSnap = await db.doc(paths.globalAnalytics()).get();
    if (globalSnap.exists) {
      const cached = globalSnap.data();
      const examsSnap = await db.collection(paths.exams()).limit(100).get();
      const exams = examsSnap.docs.map((d) => ({
        id: d.id,
        title: d.data().title,
      }));

      const resultsSnap = await db
        .collection(paths.results())
        .orderBy("submittedAt", "desc")
        .limit(500)
        .get();
      const results = resultsSnap.docs.map((d) => ({
        ...(d.data() as ExamResult),
        id: d.id,
      }));
      const mcq = filterMcqResults(results);

      return jsonOk({
        fromCache: true,
        totalResults: cached?.totalResults ?? mcq.length,
        mcqCount: mcq.length,
        exams,
        results: mcq,
        updatedAt: cached?.updatedAt,
      });
    }

    const [examsSnap, resultsSnap] = await Promise.all([
      db.collection(paths.exams()).limit(100).get(),
      db
        .collection(paths.results())
        .orderBy("submittedAt", "desc")
        .limit(500)
        .get(),
    ]);

    const exams = examsSnap.docs.map((d) => ({
      id: d.id,
      title: d.data().title,
    }));
    const results = resultsSnap.docs.map((d) => ({
      ...(d.data() as ExamResult),
      id: d.id,
    }));
    const mcq = filterMcqResults(results);

    const questionsByExam: Record<string, number> = {};
    const examIds = exams.map((e) => e.id);
    await Promise.all(
      examIds.map(async (examId) => {
        const c = await db
          .collection(paths.questions())
          .where("examId", "==", examId)
          .count()
          .get();
        questionsByExam[examId] = c.data().count;
      })
    );

    const enriched = mcq.map((r) => ({
      ...r,
      percent:
        questionsByExam[r.examId] && typeof r.score === "number"
          ? formatPercent(r.score, questionsByExam[r.examId]!)
          : 0,
    }));

    return jsonOk({
      fromCache: false,
      totalResults: results.length,
      mcqCount: mcq.length,
      exams,
      results: enriched,
      questionsByExam,
    });
  });
});

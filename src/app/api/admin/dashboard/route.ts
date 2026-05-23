import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { filterMcqResults, filterPendingCqResults } from "@/lib/firestore/normalize";
import { formatPercent } from "@/lib/utils";
import { trackQuery } from "@/server/observability/query-metrics";
import type { ExamResult } from "@/types";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const db = getAdminDb();

  return trackQuery("api.admin.dashboard", async () => {
    const now = Date.now();
    const [examsSnap, resultsSnap, liveSnap, globalSnap] = await Promise.all([
      db.collection(paths.exams()).limit(200).get(),
      db
        .collection(paths.results())
        .orderBy("submittedAt", "desc")
        .limit(500)
        .get(),
      db
        .collection(paths.liveSessions())
        .where("endTime", ">", now)
        .limit(100)
        .get(),
      db.doc(paths.globalAnalytics()).get(),
    ]);

    const results = resultsSnap.docs.map((d) => ({
      ...(d.data() as ExamResult),
      id: d.id,
    }));
    const mcq = filterMcqResults(results);
    const uniqueStudents = new Set(results.map((r) => r.uid).filter(Boolean)).size;
    const pendingCq = filterPendingCqResults(results).length;

    let avgScore = 0;
    if (mcq.length > 0) {
      const examIds = [...new Set(mcq.map((r) => r.examId))];
      const maxByExam: Record<string, number> = {};
      await Promise.all(
        examIds.map(async (examId) => {
          const stats = await db.doc(paths.examStats(examId)).get();
          maxByExam[examId] = (stats.data()?.maxScore as number) ?? 0;
        })
      );
      const sum = mcq.reduce((acc, r) => {
        const max = maxByExam[r.examId] ?? 0;
        return acc + (max ? formatPercent(Number(r.score), max) : 0);
      }, 0);
      avgScore = Math.round(sum / mcq.length);
    }

    return jsonOk({
      liveCount: liveSnap.size,
      examCount: examsSnap.size,
      pendingCq,
      uniqueStudents: globalSnap.exists
        ? (globalSnap.data()?.totalStudents ?? uniqueStudents)
        : uniqueStudents,
      avgScore,
      totalMcqSubmissions: globalSnap.exists
        ? (globalSnap.data()?.totalMcqResults ?? mcq.length)
        : mcq.length,
    });
  });
});

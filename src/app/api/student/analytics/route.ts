import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { filterMcqResults, filterCqResults } from "@/lib/firestore/normalize";
import { formatPercent } from "@/lib/utils";
import type { ExamResult } from "@/types";
import { trackQuery } from "@/server/observability/query-metrics";

export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const db = getAdminDb();

  return trackQuery("api.student.analytics", async () => {
    const snap = await db
      .collection(paths.results())
      .where("uid", "==", session.uid)
      .orderBy("submittedAt", "desc")
      .limit(100)
      .get();

    const results = snap.docs.map((d) => ({
      ...(d.data() as ExamResult),
      id: d.id,
    }));

    const mcq = filterMcqResults(results);
    const cq = filterCqResults(results);

    const chartData: Array<{ name: string; score: number }> = [];

    for (const r of mcq.slice(0, 20)) {
      const max = r.maxScore ?? 0;
      const examSnap = await db.doc(paths.exam(r.examId)).get();
      const title = examSnap.data()?.title ?? "Exam";
      chartData.push({
        name: (title as string).slice(0, 12),
        score: max ? formatPercent(Number(r.score), max) : 0,
      });
    }

    const avgScore =
      chartData.length > 0
        ? Math.round(chartData.reduce((a, c) => a + c.score, 0) / chartData.length)
        : 0;

    const profileSnap = await db.doc(paths.userProfile(session.uid)).get();
    const bestRank = profileSnap.data()?.stats?.bestRank ?? null;

    return jsonOk({
      examsTaken: mcq.length,
      avgScore,
      cqCount: cq.length,
      bestRank,
      chartData,
    });
  });
});

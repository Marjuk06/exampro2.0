import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import { filterMcqResults } from "@/lib/firestore/normalize";
import { formatPercent } from "@/lib/utils";
import { trackQuery } from "@/server/observability/query-metrics";
import type { ExamResult } from "@/types";
import type { ExamAnalyticsDoc, GlobalAnalyticsDoc } from "@/types/aggregates";

export async function rebuildGlobalAnalytics(db: Firestore): Promise<void> {
  await trackQuery("analytics.rebuild.global", async () => {
    const snap = await db
      .collection(paths.results())
      .orderBy("submittedAt", "desc")
      .limit(1000)
      .get();

    const results = snap.docs.map((d) => ({
      ...(d.data() as ExamResult),
      id: d.id,
    }));
    const mcq = filterMcqResults(results);
    const uids = new Set(mcq.map((r) => r.uid));

    const doc: GlobalAnalyticsDoc = {
      totalResults: results.length,
      totalMcqResults: mcq.length,
      totalStudents: uids.size,
      updatedAt: Date.now(),
    };
    await db.doc(paths.globalAnalytics()).set(doc);
  });
}

export async function rebuildExamAnalytics(
  db: Firestore,
  examId: string
): Promise<void> {
  await trackQuery("analytics.rebuild.exam", async () => {
    const snap = await db
      .collection(paths.results())
      .where("examId", "==", examId)
      .limit(500)
      .get();

    const mcq = filterMcqResults(
      snap.docs.map((d) => ({ ...(d.data() as ExamResult), id: d.id }))
    );

    const statsSnap = await db.doc(paths.examStats(examId)).get();
    const maxScore = (statsSnap.data()?.maxScore as number) ?? 0;

    let sumPercent = 0;
    for (const r of mcq) {
      if (typeof r.score === "number" && maxScore > 0) {
        sumPercent += formatPercent(r.score, maxScore);
      }
    }

    const doc: ExamAnalyticsDoc = {
      examId,
      participantCount: mcq.length,
      avgScore:
        mcq.length > 0
          ? Math.round(mcq.reduce((a, r) => a + Number(r.score ?? 0), 0) / mcq.length)
          : 0,
      avgPercent: mcq.length > 0 ? Math.round(sumPercent / mcq.length) : 0,
      updatedAt: Date.now(),
    };
    await db.doc(paths.examAnalytics(examId)).set(doc);
  });
}

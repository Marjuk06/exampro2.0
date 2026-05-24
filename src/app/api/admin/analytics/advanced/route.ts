import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";

/**
 * GET /api/admin/analytics/advanced?examId=...
 *
 * Returns:
 * - Cheating/suspicious behavior analysis
 * - Dropout rate (started live session but no result)
 * - Average time-per-exam distribution
 * - Score distribution
 * - Violation heatmap per student
 */
export const GET = withApiHandler(async (request) => {
  const session = await requireAuth();
  if (session.role !== "admin" && session.role !== "superadmin") {
    throw new ApiError(403, "Admin only");
  }

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  const db = getAdminDb();

  if (!examId) {
    // Global suspicious behaviour overview
    const [violationsSnap, resultsSnap] = await trackQuery(
      "admin.advanced_analytics.global",
      () =>
        Promise.all([
          db
            .collection(paths.violations())
            .orderBy("count", "desc")
            .limit(100)
            .get(),
          db
            .collection(paths.results())
            .orderBy("submittedAt", "desc")
            .limit(500)
            .get(),
        ])
    );

    // Students with high violations AND high score (suspicious)
    const suspiciousStudents: Array<{
      uid: string;
      name: string;
      violationCount: number;
      avgScore: number;
    }> = [];
    const violationsByUid = new Map<string, { count: number; name: string }>();
    for (const doc of violationsSnap.docs) {
      const d = doc.data();
      const uid = d.uid as string;
      if (!uid) continue;
      violationsByUid.set(uid, {
        count: Number(d.count ?? 1),
        name: String(d.studentName ?? "Unknown"),
      });
    }

    // Build avg score per uid from recent results
    const scoresByUid = new Map<string, { total: number; count: number }>();
    for (const doc of resultsSnap.docs) {
      const r = doc.data();
      if (typeof r.score !== "number" || !r.maxScore) continue;
      const uid = r.uid as string;
      const pct = (r.score / r.maxScore) * 100;
      const prev = scoresByUid.get(uid) ?? { total: 0, count: 0 };
      scoresByUid.set(uid, { total: prev.total + pct, count: prev.count + 1 });
    }

    // Flag students with violations > 3 AND avg score > 80%
    for (const [uid, { count, name }] of violationsByUid) {
      const scores = scoresByUid.get(uid);
      if (!scores) continue;
      const avgScore = scores.count > 0 ? scores.total / scores.count : 0;
      if (count >= 3 && avgScore >= 80) {
        suspiciousStudents.push({ uid, name, violationCount: count, avgScore: Math.round(avgScore) });
      }
    }
    suspiciousStudents.sort((a, b) => b.violationCount - a.violationCount);

    // Score distribution (buckets: 0-20, 21-40, 41-60, 61-80, 81-100)
    const scoreBuckets = [0, 0, 0, 0, 0];
    for (const doc of resultsSnap.docs) {
      const r = doc.data();
      if (typeof r.score !== "number" || !r.maxScore) continue;
      const pct = (r.score / r.maxScore) * 100;
      const bucket = Math.min(4, Math.floor(pct / 20));
      scoreBuckets[bucket]++;
    }

    // Avg time-per-exam
    const timeSamples = resultsSnap.docs
      .map((d) => Number(d.data().timeTakenMs ?? 0))
      .filter((t) => t > 0);
    const avgTimeMins =
      timeSamples.length > 0
        ? Math.round(
            timeSamples.reduce((s, t) => s + t, 0) /
              timeSamples.length /
              60000
          )
        : 0;

    return jsonOk({
      suspiciousStudents: suspiciousStudents.slice(0, 20),
      scoreDistribution: {
        labels: ["0–20%", "21–40%", "41–60%", "61–80%", "81–100%"],
        values: scoreBuckets,
      },
      avgTimeMins,
      sampleSize: resultsSnap.size,
    });
  }

  // Per-exam analytics: dropout rate
  const [liveSnap, resultsSnap] = await trackQuery(
    "admin.advanced_analytics.exam",
    () =>
      Promise.all([
        db
          .collection(paths.liveSessions())
          .where("examId", "==", examId)
          .limit(500)
          .get(),
        db
          .collection(paths.results())
          .where("examId", "==", examId)
          .limit(500)
          .get(),
      ])
  );

  const sessionUids = new Set(liveSnap.docs.map((d) => d.data().uid as string));
  const resultUids = new Set(resultsSnap.docs.map((d) => d.data().uid as string));
  const dropouts = [...sessionUids].filter((uid) => !resultUids.has(uid));
  const dropoutRate =
    sessionUids.size > 0
      ? Math.round((dropouts.length / sessionUids.size) * 100)
      : 0;

  // Avg time and score distribution for this exam
  const times: number[] = [];
  const scoreBuckets = [0, 0, 0, 0, 0];
  for (const doc of resultsSnap.docs) {
    const r = doc.data();
    if (r.timeTakenMs) times.push(Number(r.timeTakenMs));
    if (typeof r.score === "number" && r.maxScore) {
      const pct = (r.score / r.maxScore) * 100;
      const bucket = Math.min(4, Math.floor(pct / 20));
      scoreBuckets[bucket]++;
    }
  }

  const avgTimeMins =
    times.length > 0
      ? Math.round(times.reduce((s, t) => s + t, 0) / times.length / 60000)
      : 0;

  return jsonOk({
    examId,
    participantCount: sessionUids.size,
    submittedCount: resultUids.size,
    dropoutCount: dropouts.length,
    dropoutRate,
    avgTimeMins,
    scoreDistribution: {
      labels: ["0–20%", "21–40%", "41–60%", "61–80%", "81–100%"],
      values: scoreBuckets,
    },
  });
});

import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, jsonError, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import type { ExamLeaderboardDoc } from "@/types/gamification";

/**
 * GET /api/exam/live-ranking?examId=...
 *
 * Returns the cached exam leaderboard (1 Firestore read) + live participant count.
 * Designed for polling every 15s during an active exam.
 * Cost: 1 doc read per poll regardless of participant count.
 *
 * Response is cached for 10s at CDN level to further reduce server load.
 */
export const GET = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  if (!examId) return jsonError(new Error("examId required"));

  const db = getAdminDb();

  const [lbSnap, statsSnap, myRankSnap] = await trackQuery(
    "exam.live-ranking",
    () =>
      Promise.all([
        db.doc(paths.examLeaderboard(examId)).get(),
        db.doc(paths.examStats(examId)).get(),
        db.doc(paths.examRank(examId, session.uid)).get(),
      ])
  );

  const lb = lbSnap.data() as ExamLeaderboardDoc | undefined;
  const stats = statsSnap.data();
  const myRank = myRankSnap.data();

  // Compute estimated percentile for current user's position in live leaderboard
  const participantCount = stats?.participantCount ?? lb?.participantCount ?? 0;
  const myCurrentRank = myRank?.rank as number | undefined;
  const estimatedPercentile =
    myCurrentRank != null && participantCount > 1
      ? Math.round(
          ((participantCount - myCurrentRank) / (participantCount - 1)) * 1000
        ) / 10
      : null;

  return jsonOk({
    examId,
    participantCount,
    updatedAt: lb?.updatedAt ?? null,
    topEntries: lb?.topEntries?.slice(0, 10) ?? [],
    myRank: myCurrentRank ?? null,
    estimatedPercentile,
    /** Suggested poll interval — clients should respect this */
    pollIntervalMs: 15_000,
  });
});

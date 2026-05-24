import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";
import { getRecentMetrics } from "@/server/observability/query-metrics";

const START_TIME = Date.now();

/**
 * GET /api/admin/diagnostics/metrics
 *
 * Returns recent query metrics, uptime, and environment info.
 * Admin only.
 */
export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  if (session.role !== "admin" && session.role !== "superadmin") {
    throw new ApiError(403, "Admin only");
  }

  const metrics = getRecentMetrics();
  const slowQueries = metrics.filter((m) => m.durationMs >= 500);
  const avgDuration =
    metrics.length > 0
      ? Math.round(
          metrics.reduce((s, m) => s + m.durationMs, 0) / metrics.length
        )
      : 0;

  const topSlow = [...slowQueries]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 10);

  const queryFrequency: Record<string, number> = {};
  for (const m of metrics) {
    queryFrequency[m.name] = (queryFrequency[m.name] ?? 0) + 1;
  }
  const topFrequent = Object.entries(queryFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return jsonOk({
    status: "ok",
    uptime: {
      seconds: Math.floor((Date.now() - START_TIME) / 1000),
      since: new Date(START_TIME).toISOString(),
    },
    environment: process.env.NODE_ENV ?? "development",
    version: process.env.npm_package_version ?? "2.0.0",
    metrics: {
      total: metrics.length,
      slowCount: slowQueries.length,
      avgDurationMs: avgDuration,
      topSlow,
      topFrequent,
      recent: metrics.slice(-20).reverse(),
    },
  });
});

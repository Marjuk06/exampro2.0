import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import type { LiveSession } from "@/types";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const now = Date.now();

  return trackQuery("api.admin.live-sessions", async () => {
    const snap = await getAdminDb()
      .collection(paths.liveSessions())
      .where("endTime", ">", now)
      .orderBy("endTime", "asc")
      .limit(100)
      .get();

    const sessions = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as LiveSession
    );
    return jsonOk({ sessions });
  });
});

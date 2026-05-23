import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";

export const POST = withApiHandler(async () => {
  const session = await requireAdmin();
  const now = Date.now();
  const snap = await getAdminDb().collection(paths.liveSessions()).get();
  const batch = getAdminDb().batch();
  let count = 0;
  snap.docs.forEach((d) => {
    const endTime = d.data().endTime as number | undefined;
    if (endTime !== undefined && endTime <= now) {
      batch.delete(d.ref);
      count++;
    }
  });
  if (count > 0) await batch.commit();
  adminActionLog(session.uid, "live_session.prune", { count });
  return jsonOk({ removed: count });
});

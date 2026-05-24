import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { levelFromXp, titleForLevel } from "@/features/gamification/xp";
import { missionsService } from "@/server/services/engagement/missions.service";

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { missionId } = await request.json();
  if (!missionId) return jsonOk({ error: "missionId required" }, 400);

  const { xp, missions } = await missionsService.claim(session.uid, missionId);
  if (xp > 0) {
    const db = getAdminDb();
    const ref = db.doc(paths.userProfile(session.uid));
    const snap = await ref.get();
    const current = (snap.data()?.xp as number) ?? 0;
    const total = current + xp;
    await ref.update({
      xp: total,
      level: levelFromXp(total),
      title: titleForLevel(levelFromXp(total)),
      updatedAt: Date.now(),
    });
  }
  return jsonOk({ xp, missions });
});

import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk, parseJson } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { z } from "zod";

const prefsSchema = z.object({
  emailOnChallenge: z.boolean().optional(),
  emailOnFriendRequest: z.boolean().optional(),
  emailOnRankDrop: z.boolean().optional(),
  inAppOnStreak: z.boolean().optional(),
  inAppOnMission: z.boolean().optional(),
  inAppOnRankChange: z.boolean().optional(),
  /** FCM token for future push notifications */
  fcmToken: z.string().max(512).optional(),
});

/** GET /api/student/notifications/preferences — load current preferences */
export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const db = getAdminDb();
  const snap = await db.doc(paths.notificationPrefs(session.uid)).get();

  const defaults = {
    emailOnChallenge: true,
    emailOnFriendRequest: true,
    emailOnRankDrop: false,
    inAppOnStreak: true,
    inAppOnMission: true,
    inAppOnRankChange: true,
    fcmToken: null,
  };

  return jsonOk({ preferences: { ...defaults, ...(snap.data() ?? {}) } });
});

/** PATCH /api/student/notifications/preferences — update preferences */
export const PATCH = withApiHandler(async (request) => {
  const session = await requireAuth();
  const updates = await parseJson(request, prefsSchema.partial());
  const db = getAdminDb();

  await db.doc(paths.notificationPrefs(session.uid)).set(
    { ...updates, updatedAt: Date.now() },
    { merge: true }
  );

  return jsonOk({ ok: true });
});

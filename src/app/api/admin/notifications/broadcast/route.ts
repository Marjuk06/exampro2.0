import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk, parseJson } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { z } from "zod";

const broadcastSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  type: z
    .enum(["info", "success", "warning", "error"])
    .default("info"),
  link: z.string().max(200).optional(),
  /** Optional: target specific students by UID. If omitted, broadcasts to ALL. */
  targetUids: z.array(z.string()).max(500).optional(),
});

/**
 * POST /api/admin/notifications/broadcast
 *
 * Sends an in-app notification to all students (or a targeted list).
 * Uses batched Firestore writes (max 500 per batch) to avoid timeout.
 *
 * Security: Admin only.
 */
export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  if (session.role !== "admin" && session.role !== "superadmin") {
    throw new ApiError(403, "Admin only");
  }

  const body = await parseJson(request, broadcastSchema);
  const db = getAdminDb();
  const now = Date.now();

  const payload = {
    title: body.title,
    message: body.message,
    type: body.type,
    link: body.link ?? null,
    read: false,
    createdAt: now,
    broadcastId: `broadcast_${now}`,
  };

  if (body.targetUids && body.targetUids.length > 0) {
    // Targeted broadcast: write in batches of 500
    const BATCH_SIZE = 499;
    for (let i = 0; i < body.targetUids.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = body.targetUids.slice(i, i + BATCH_SIZE);
      for (const uid of chunk) {
        const ref = db.collection(paths.notifications(uid)).doc();
        batch.set(ref, { uid, ...payload });
      }
      await batch.commit();
    }
    return jsonOk({ sent: body.targetUids.length, mode: "targeted" });
  }

  // Global broadcast: enumerate all student profiles and fan-out
  // Reads up to 1000 students per broadcast (safe for 5k–20k MAU with multiple calls or Cloud Task)
  const profilesSnap = await db
    .collectionGroup("profile")
    .where("role", "==", "student")
    .limit(1000)
    .get();

  if (profilesSnap.empty) return jsonOk({ sent: 0, mode: "global" });

  const uids = profilesSnap.docs.map((d) => d.data().uid as string).filter(Boolean);

  const BATCH_SIZE = 499;
  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = uids.slice(i, i + BATCH_SIZE);
    for (const uid of chunk) {
      const ref = db.collection(paths.notifications(uid)).doc();
      batch.set(ref, { uid, ...payload });
    }
    await batch.commit();
  }

  return jsonOk({ sent: uids.length, mode: "global" });
});

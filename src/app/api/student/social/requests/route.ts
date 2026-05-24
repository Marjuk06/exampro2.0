import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk, parseJson } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { APP_ID } from "@/lib/constants";
import {
  sendFriendRequest,
  respondToFriendRequest,
  listPendingRequests,
} from "@/server/services/social/friend-request.service";
import { z } from "zod";

/** GET /api/student/social/requests — list pending incoming requests */
export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const db = getAdminDb();
  const requests = await listPendingRequests(db, APP_ID, session.uid);
  return jsonOk({ requests });
});

const sendSchema = z.object({
  toStudentId: z.string().min(1).max(50),
});

/** POST /api/student/social/requests — send a friend request */
export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { toStudentId } = await parseJson(request, sendSchema);
  const db = getAdminDb();

  // Load sender's name from their profile
  const profileSnap = await db
    .doc(`artifacts/${APP_ID}/users/${session.uid}/profile/main`)
    .get();
  const senderName = String(profileSnap.data()?.name ?? "Student");
  const senderStudentId = String(profileSnap.data()?.studentId ?? "");

  const result = await sendFriendRequest(
    db,
    APP_ID,
    session.uid,
    senderName,
    senderStudentId,
    toStudentId
  );
  return jsonOk(result);
});

const respondSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["accept", "reject"]),
});

/** PATCH /api/student/social/requests — accept or reject a request */
export const PATCH = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { requestId, action } = await parseJson(request, respondSchema);
  const db = getAdminDb();
  await respondToFriendRequest(db, APP_ID, requestId, session.uid, action);
  return jsonOk({ ok: true });
});

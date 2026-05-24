import type { Firestore, Timestamp } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import { createNotification } from "@/server/notifications";
import { ApiError } from "@/server/api/response";
import { trackQuery } from "@/server/observability/query-metrics";

export interface FriendRequest {
  id: string;
  from: string;
  fromName: string;
  fromStudentId: string;
  to: string;
  toStudentId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}

const COL = "friend_requests";

function friendRequestPath(appId: string, reqId: string): string {
  return `artifacts/${appId}/public/data/${COL}/${reqId}`;
}

function friendRequestsCollection(appId: string): string {
  return `artifacts/${appId}/public/data/${COL}`;
}

/**
 * Send a friend request from `fromUid` to the student identified by `toStudentId`.
 * Prevents duplicate pending requests in both directions.
 */
export async function sendFriendRequest(
  db: Firestore,
  appId: string,
  fromUid: string,
  fromName: string,
  fromStudentId: string,
  toStudentId: string
): Promise<{ requestId: string }> {
  // Resolve recipient by studentId via their public profile
  const profileSnap = await trackQuery("friend_request.resolve_recipient", () =>
    db
      .collection(`artifacts/${appId}/public/data/public_profiles`)
      .where("studentId", "==", toStudentId)
      .limit(1)
      .get()
  );
  if (profileSnap.empty) throw new ApiError(404, "Student not found");
  const toProfile = profileSnap.docs[0]!.data();
  const toUid = toProfile.uid as string;
  if (toUid === fromUid) throw new ApiError(400, "Cannot send request to yourself");

  // Check for existing pending request in either direction
  const [existingSnap] = await trackQuery("friend_request.check_existing", () =>
    Promise.all([
      db
        .collection(friendRequestsCollection(appId))
        .where("from", "==", fromUid)
        .where("to", "==", toUid)
        .where("status", "==", "pending")
        .limit(1)
        .get(),
    ])
  );
  if (!existingSnap.empty) throw new ApiError(409, "Request already pending");

  const ref = db.collection(friendRequestsCollection(appId)).doc();
  await ref.set({
    from: fromUid,
    fromName,
    fromStudentId,
    to: toUid,
    toStudentId,
    status: "pending",
    createdAt: Date.now(),
  });

  // Notify recipient
  await createNotification(db, toUid, {
    title: "Friend Request",
    message: `${fromName} sent you a friend request`,
    type: "social",
    link: `/student?tab=social`,
  });

  return { requestId: ref.id };
}

/**
 * Accept or reject a pending friend request.
 * On accept, creates bidirectional connections.
 */
export async function respondToFriendRequest(
  db: Firestore,
  appId: string,
  reqId: string,
  uid: string,
  action: "accept" | "reject"
): Promise<void> {
  const reqRef = db.doc(friendRequestPath(appId, reqId));
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) throw new ApiError(404, "Request not found");
  const req = reqSnap.data() as FriendRequest;
  if (req.to !== uid) throw new ApiError(403, "Not your request");
  if (req.status !== "pending") throw new ApiError(409, "Request already resolved");

  const batch = db.batch();
  batch.update(reqRef, { status: action, resolvedAt: Date.now() });

  if (action === "accept") {
    // Bidirectional connection
    const aConn = db.doc(`artifacts/${appId}/users/${uid}/connections/${req.from}`);
    const bConn = db.doc(`artifacts/${appId}/users/${req.from}/connections/${uid}`);
    const now = Date.now();
    batch.set(aConn, { uid: req.from, studentId: req.fromStudentId, name: req.fromName, type: "friend", createdAt: now });
    batch.set(bConn, { uid, studentId: req.toStudentId, name: req.fromName, type: "friend", createdAt: now });

    // Notify requester
    await createNotification(db, req.from, {
      title: "Friend Request Accepted",
      message: `Your friend request was accepted`,
      type: "social",
    });
  }

  await batch.commit();
}

/**
 * List all pending friend requests for a user (as recipient).
 */
export async function listPendingRequests(
  db: Firestore,
  appId: string,
  uid: string
): Promise<FriendRequest[]> {
  const snap = await trackQuery("friend_request.list_pending", () =>
    db
      .collection(friendRequestsCollection(appId))
      .where("to", "==", uid)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .limit(25)
      .get()
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FriendRequest);
}

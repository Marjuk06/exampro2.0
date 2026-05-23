import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import type { NotificationPayload } from "@/types/gamification";

export async function createNotification(
  db: Firestore,
  uid: string,
  payload: NotificationPayload
): Promise<void> {
  await db.collection(paths.notifications(uid)).add({
    uid,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    read: false,
    link: payload.link ?? null,
    createdAt: Date.now(),
  });
}

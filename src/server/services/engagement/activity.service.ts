import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { ActivityFeedItem } from "@/types/engagement";

export async function recordActivity(
  db: Firestore,
  input: Omit<ActivityFeedItem, "id" | "createdAt">
): Promise<void> {
  await db.collection(paths.activityFeed()).add({
    ...input,
    createdAt: Date.now(),
  });
}

export async function getActivityFeed(
  db: Firestore,
  limit = 30
): Promise<ActivityFeedItem[]> {
  const snap = await db
    .collection(paths.activityFeed())
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityFeedItem);
}

export async function getPublicActivityFeed(
  limit = 20
): Promise<ActivityFeedItem[]> {
  return getActivityFeed(getAdminDb(), limit);
}

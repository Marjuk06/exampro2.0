import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import type { NotificationItem } from "@/types";

export const GET = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const cursor = searchParams.get("cursor");

  return trackQuery("api.notifications.list", async () => {
    const db = getAdminDb();
    let q = db
      .collection(paths.notifications(session.uid))
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db
        .collection(paths.notifications(session.uid))
        .doc(cursor)
        .get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const snap = await q.get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    const items = page.map(
      (d) => ({ id: d.id, ...d.data() }) as NotificationItem
    );
    const nextCursor = hasMore ? page[page.length - 1]!.id : null;

    const unreadSnap = await db
      .collection(paths.notifications(session.uid))
      .where("read", "==", false)
      .count()
      .get();

    return jsonOk({
      items,
      unread: unreadSnap.data().count,
      nextCursor,
    });
  });
});

export const PATCH = withApiHandler(async (request) => {
  const session = await requireAuth();
  const body = await request.json();
  const { ids, markAllRead } = body as { ids?: string[]; markAllRead?: boolean };
  const db = getAdminDb();
  const col = db.collection(paths.notifications(session.uid));

  if (markAllRead) {
    const snap = await col.where("read", "==", false).limit(100).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    if (!snap.empty) await batch.commit();
    return jsonOk({ ok: true });
  }

  if (ids?.length) {
    const batch = db.batch();
    for (const id of ids) {
      batch.update(col.doc(id), { read: true });
    }
    await batch.commit();
  }

  return jsonOk({ ok: true });
});

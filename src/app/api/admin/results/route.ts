import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import type { ExamResult } from "@/types";

export const GET = withApiHandler(async (request) => {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const cursor = searchParams.get("cursor");
  const examId = searchParams.get("examId");

  return trackQuery("api.admin.results", async () => {
    const db = getAdminDb();
    let q = db.collection(paths.results()).orderBy("submittedAt", "desc");

    if (examId) {
      q = q.where("examId", "==", examId);
    }

    q = q.limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db.collection(paths.results()).doc(cursor).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const snap = await q.get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    const items = page.map((d) => ({
      ...(d.data() as ExamResult),
      id: d.id,
    }));

    return jsonOk({
      items,
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    });
  });
});

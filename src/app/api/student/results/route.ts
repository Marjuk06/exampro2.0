import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { ExamResult } from "@/types";

/** Returns only the authenticated user's results (sanitized server read). */
export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const snap = await getAdminDb()
    .collection(paths.results())
    .where("uid", "==", session.uid)
    .get();

  const results = snap.docs.map((d) => ({
    ...(d.data() as ExamResult),
    id: d.id,
  }));

  return jsonOk({ results });
});

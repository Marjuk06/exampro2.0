import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";

/** DELETE /api/admin/results/[resultId] — delete a single result */
export const DELETE = withApiHandler(async (_request, context) => {
  await requireAdmin();
  const { resultId } = await (context as { params: Promise<{ resultId: string }> }).params;

  if (!resultId) {
    throw new ApiError(400, "resultId required");
  }

  const db = getAdminDb();
  const resultRef = db.doc(paths.result(resultId));
  const snap = await resultRef.get();

  if (!snap.exists) {
    throw new ApiError(404, "Result not found");
  }

  await resultRef.delete();
  console.log(`[admin] deleted result ${resultId}`);

  return jsonOk({ ok: true, deleted: resultId });
});

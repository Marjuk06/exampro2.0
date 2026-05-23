import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { adminQuestionService } from "@/server/services/admin-question.service";

export const DELETE = withApiHandler(async (_request, context) => {
  const session = await requireAdmin();
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  await adminQuestionService.delete(id);
  adminActionLog(session.uid, "question.delete", { questionId: id });
  return jsonOk({ ok: true });
});

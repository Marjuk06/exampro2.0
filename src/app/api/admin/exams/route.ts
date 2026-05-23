import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, parseJson, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { adminExamService } from "@/server/services/admin-exam.service";
import { examFormSchema } from "@/lib/validations/exam";

export const POST = withApiHandler(async (request) => {
  const session = await requireAdmin();
  const data = await parseJson(request, examFormSchema);
  const id = await adminExamService.create(data);
  adminActionLog(session.uid, "exam.create", { examId: id });
  return jsonOk({ id });
});

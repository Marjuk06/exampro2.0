import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, parseJson, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { examRepository } from "@/server/repositories/exam.repository";
import { resultRepository } from "@/server/repositories/result.repository";
import { retakeRepository } from "@/server/repositories/retake.repository";

const schema = z.object({
  requestId: z.string().min(1),
  uid: z.string().min(1),
  examId: z.string().min(1),
  action: z.enum(["approve", "dismiss"]),
});

export const POST = withApiHandler(async (request) => {
  const session = await requireAdmin();
  const { requestId, uid, examId, action } = await parseJson(request, schema);

  if (action === "approve") {
    await resultRepository.deleteByUserAndExam(uid, examId);
    await examRepository.appendApprovedUser(examId, uid);
    adminActionLog(session.uid, "retake.approve", { uid, examId });
  } else {
    adminActionLog(session.uid, "retake.dismiss", { requestId });
  }

  await retakeRepository.delete(requestId);
  return jsonOk({ ok: true });
});

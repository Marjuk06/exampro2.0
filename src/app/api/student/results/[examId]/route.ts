import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { resultRepository } from "@/server/repositories/result.repository";

export const GET = withApiHandler(async (_request, context) => {
  const session = await requireAuth();
  const { examId } = await (context as { params: Promise<{ examId: string }> }).params;
  const result = await resultRepository.getByUserAndExam(session.uid, examId);
  if (!result) {
    return jsonOk({ result: null });
  }
  return jsonOk({ result });
});

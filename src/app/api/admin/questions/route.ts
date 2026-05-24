import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { adminQuestionService } from "@/server/services/admin-question.service";
import { bulkQuestionsSchema } from "@/lib/validations/exam";

const createSchema = z.object({
  examId: z.string().min(1),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().min(0).max(3),
  points: z.number().optional(),
});

export const POST = withApiHandler(async (request) => {
  const session = await requireAdmin();
  const body = await request.json();

  if (Array.isArray(body)) {
    const examId = request.headers.get("x-exam-id");
    if (!examId) {
      throw new (await import("@/server/api/response")).ApiError(400, "x-exam-id header required for bulk");
    }
    const items = bulkQuestionsSchema.parse(body);
    const ids = await adminQuestionService.bulkCreate(examId, items);
    adminActionLog(session.uid, "questions.bulk", { examId, count: ids.length });
    return jsonOk({ ids, count: ids.length });
  }

  const data = createSchema.parse(body);
  const id = await adminQuestionService.create(data);
  adminActionLog(session.uid, "question.create", { questionId: id, examId: data.examId });
  return jsonOk({ id });
});

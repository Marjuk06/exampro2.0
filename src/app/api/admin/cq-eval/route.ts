import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, parseJson, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { resultRepository } from "@/server/repositories/result.repository";

const schema = z.object({
  resultId: z.string().min(1),
  score: z.number().min(0),
  feedback: z.string().max(2000).optional(),
});

export const POST = withApiHandler(async (request) => {
  const session = await requireAdmin();
  const data = await parseJson(request, schema);
  await resultRepository.update(data.resultId, {
    score: data.score,
    feedback: data.feedback,
    gradedAt: Date.now(),
    gradedBy: session.uid,
  });
  adminActionLog(session.uid, "cq.grade", { resultId: data.resultId });
  return jsonOk({ ok: true });
});

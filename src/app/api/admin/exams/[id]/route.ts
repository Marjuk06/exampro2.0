import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk } from "@/server/api/response";
import { parseJson, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { clientIp, rateLimit } from "@/server/security/rate-limit";
import { adminExamService } from "@/server/services/admin-exam.service";
import { examFormSchema } from "@/lib/validations/exam";

const patchSchema = z.object({
  field: z.enum(["isHidden", "isResultPublished", "isAnswerRevealed"]),
  value: z.boolean(),
});

export const PATCH = withApiHandler(async (request, context) => {
  const session = await requireAdmin();
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const rl = await rateLimit(`admin:${session.uid}:${clientIp(request)}`);
  if (!rl.ok) throw new (await import("@/server/api/response")).ApiError(429, "Too many requests");

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    if (body.field && typeof body.value === "boolean") {
      const parsed = patchSchema.parse(body);
      await adminExamService.patchField(id, parsed.field, parsed.value);
      adminActionLog(session.uid, "exam.patch", { examId: id, field: parsed.field });
      return jsonOk({ ok: true });
    }
    const full = examFormSchema.parse(body);
    await adminExamService.update(id, full);
    adminActionLog(session.uid, "exam.update", { examId: id });
    return jsonOk({ ok: true });
  }

  throw new (await import("@/server/api/response")).ApiError(400, "Invalid body");
});

export const DELETE = withApiHandler(async (_request, context) => {
  const session = await requireAdmin();
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  await adminExamService.delete(id);
  adminActionLog(session.uid, "exam.delete", { examId: id });
  return jsonOk({ ok: true });
});

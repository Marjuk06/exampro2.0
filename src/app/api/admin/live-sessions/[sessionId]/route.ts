import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, parseJson, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { liveSessionRepository } from "@/server/repositories/live-session.repository";

const extendSchema = z.object({
  addMinutes: z.number().min(1).max(120),
});

export const PATCH = withApiHandler(async (request, context) => {
  const session = await requireAdmin();
  const { sessionId } = await (context as { params: Promise<{ sessionId: string }> }).params;
  const { addMinutes } = await parseJson(request, extendSchema);

  const live = await liveSessionRepository.get(sessionId);
  if (!live) {
    throw new (await import("@/server/api/response")).ApiError(404, "Session not found");
  }

  await liveSessionRepository.merge(sessionId, {
    endTime: live.endTime + addMinutes * 60_000,
    timeRequested: false,
  });

  adminActionLog(session.uid, "live_session.extend", { sessionId, addMinutes });
  return jsonOk({ ok: true });
});

export const DELETE = withApiHandler(async (_request, context) => {
  const session = await requireAdmin();
  const { sessionId } = await (context as { params: Promise<{ sessionId: string }> }).params;
  await liveSessionRepository.delete(sessionId);
  adminActionLog(session.uid, "live_session.delete", { sessionId });
  return jsonOk({ ok: true });
});

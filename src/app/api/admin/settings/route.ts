import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, parseJson, withApiHandler } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { settingsRepository } from "@/server/repositories/settings.repository";

const updateSchema = z.object({
  tgToken: z.string().optional(),
  tgChatId: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  betaMode: z.boolean().optional(),
  constructionBanner: z.boolean().optional(),
  constructionMessage: z.string().max(300).optional(),
});

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const settings = await settingsRepository.get();
  const { adminPasscode: _, ...safe } = settings as Record<string, unknown>;
  return jsonOk(safe);
});

export const PATCH = withApiHandler(async (request) => {
  const session = await requireAdmin();
  const data = await parseJson(request, updateSchema);
  await settingsRepository.update(data);
  adminActionLog(session.uid, "settings.update", { keys: Object.keys(data) });
  return jsonOk({ ok: true });
});

import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { TelegramLinkToken } from "@/types";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  
  const code = generateCode();
  const token: TelegramLinkToken = {
    id: code,
    uid: session.uid,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 15, // 15 minutes expiration
  };

  const db = getAdminDb();
  await db.doc(paths.telegramLink(code)).set(token);

  return jsonOk({
    code,
    expiresAt: token.expiresAt,
    botUsername: "ExamCenterBot", // Would normally come from env or settings
  });
});

import { z } from "zod";
import { requireSuperAdmin } from "@/server/auth/require-admin";
import { jsonOk, parseJson, withApiHandler } from "@/server/api/handler";
import { setUserCustomRole } from "@/server/auth/claims";
import { adminActionLog } from "@/server/security/logger";
import { userRepository } from "@/server/repositories/user.repository";

const schema = z.object({
  role: z.enum(["student", "admin", "superadmin"]),
});

export const POST = withApiHandler(async (request, context) => {
  const session = await requireSuperAdmin();
  const { uid } = await (context as { params: Promise<{ uid: string }> }).params;
  const { role } = await parseJson(request, schema);

  if (uid === session.uid && role !== "superadmin") {
    throw new (await import("@/server/api/response")).ApiError(
      400,
      "Cannot demote yourself"
    );
  }

  await setUserCustomRole(uid, role);
  await userRepository.updateProfile(uid, { role });
  adminActionLog(session.uid, "user.set_role", { targetUid: uid, role });

  return jsonOk({
    ok: true,
    message: "Role updated. User must sign out and sign in again (or refresh token).",
  });
});

import { isAdminRole } from "@/lib/permissions";
import { requireAuth } from "@/server/auth/require-auth";
import type { SessionPayload } from "@/types";
import { ApiError } from "@/server/api/response";

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!isAdminRole(session.role)) {
    throw new ApiError(403, "Admin access required");
  }
  return session;
}

export async function requireSuperAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "superadmin") {
    throw new ApiError(403, "Superadmin access required");
  }
  return session;
}

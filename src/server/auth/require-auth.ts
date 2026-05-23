import { getServerSession } from "@/lib/auth/session";
import type { SessionPayload } from "@/types";
import { ApiError } from "@/server/api/response";

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getServerSession();
  if (!session) {
    throw new ApiError(401, "Unauthorized");
  }
  return session;
}

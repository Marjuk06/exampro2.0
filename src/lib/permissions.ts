import type { SessionPayload, UserRole } from "@/types";

export function isAdminRole(role: UserRole): boolean {
  return role === "admin" || role === "superadmin";
}

export function canAccessAdmin(session: SessionPayload | null): boolean {
  return !!session && isAdminRole(session.role);
}

export function canAccessStudent(session: SessionPayload | null): boolean {
  return !!session;
}

export function assertAdmin(session: SessionPayload | null): asserts session is SessionPayload {
  if (!session || !isAdminRole(session.role)) {
    throw new Error("Unauthorized: admin access required");
  }
}

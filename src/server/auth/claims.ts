import { getAdminAuth } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { UserRole } from "@/types";

const VALID_ROLES: UserRole[] = ["student", "admin", "superadmin"];

/** Read authoritative role from Firebase custom claims (NOT Firestore). */
export function getRoleFromClaims(decoded: DecodedIdToken): UserRole {
  const claim = decoded.role;
  if (typeof claim === "string" && VALID_ROLES.includes(claim as UserRole)) {
    return claim as UserRole;
  }
  return "student";
}

export async function setUserCustomRole(
  uid: string,
  role: UserRole
): Promise<void> {
  await getAdminAuth().setCustomUserClaims(uid, { role });
}

/** Bootstrap first superadmin from env (one-time setup). */
export async function bootstrapSuperadminIfConfigured(
  uid: string,
  email?: string
): Promise<UserRole | null> {
  const byUid = process.env.INITIAL_SUPERADMIN_UID;
  const byEmail = process.env.INITIAL_SUPERADMIN_EMAIL?.toLowerCase();

  const match =
    (byUid && byUid === uid) ||
    (byEmail && email?.toLowerCase() === byEmail);

  if (!match) return null;

  await setUserCustomRole(uid, "superadmin");
  return "superadmin";
}

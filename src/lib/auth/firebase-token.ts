import { getAdminAuth } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<DecodedIdToken> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("ID token is required");
  }

  return getAdminAuth().verifyIdToken(idToken, true);
}

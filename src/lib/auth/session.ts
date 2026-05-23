import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionPayload, UserRole } from "@/types";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-change-in-production-32chars!"
);

export async function createSessionToken(payload: {
  uid: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  return new SignJWT({
    uid: payload.uid,
    email: payload.email,
    role: payload.role,
    exp,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      uid: payload.uid as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

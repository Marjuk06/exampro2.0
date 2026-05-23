import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/auth/firebase-token";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { getAdminDb, validateFirebaseAdminConfig } from "@/lib/firebase/admin";
import { FirebaseCredentialsError } from "@/lib/firebase/parse-credentials";
import { generateStudentId } from "@/lib/utils";
import {
  bootstrapSuperadminIfConfigured,
  getRoleFromClaims,
} from "@/server/auth/claims";
import { securityLog } from "@/server/security/logger";
import { rateLimit, clientIp } from "@/server/security/rate-limit";
import { syncPublicProfile } from "@/server/gamification";
import { userRepository } from "@/server/repositories/user.repository";
import type { UserProfile } from "@/types";

const isDev = process.env.NODE_ENV === "development";

function sessionError(message: string, status: number, details?: string) {
  return NextResponse.json(
    {
      error: message,
      ...(isDev && details ? { details } : {}),
    },
    { status }
  );
}

export async function POST(request: Request) {
  const rl = await rateLimit(`auth:${clientIp(request)}`);
  if (!rl.ok) {
    return sessionError("Too many requests", 429);
  }

  const adminCheck = validateFirebaseAdminConfig();
  if (!adminCheck.ok) {
    console.error("[auth/session] Admin SDK config invalid:", adminCheck.error);
    return sessionError(
      "Server authentication is not configured",
      503,
      adminCheck.error
    );
  }

  let body: { idToken?: string };
  try {
    body = await request.json();
  } catch {
    return sessionError("Invalid JSON body", 400);
  }

  const { idToken } = body;
  if (!idToken) {
    return sessionError("Missing idToken", 400);
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    let role = getRoleFromClaims(decoded);
    const bootRole = await bootstrapSuperadminIfConfigured(
      decoded.uid,
      decoded.email
    );
    if (bootRole) role = bootRole;
    const db = getAdminDb();
    const now = Date.now();

    let profile = await userRepository.getProfile(decoded.uid);

    if (!profile) {
      profile = {
        uid: decoded.uid,
        email: decoded.email ?? "",
        name: decoded.name ?? decoded.email?.split("@")[0] ?? "Student",
        studentId: generateStudentId(),
        role,
        avatarUrl: decoded.picture,
        createdAt: now,
        updatedAt: now,
        xp: 0,
        level: 1,
        title: "Novice Scholar",
        badges: [],
        streak: {
          current: 0,
          longest: 0,
          lastActivityDate: null,
          freezesRemaining: 1,
        },
        stats: {
          examsCompleted: 0,
          mcqCompleted: 0,
          cqCompleted: 0,
          totalScorePoints: 0,
          bestRank: null,
          avgPercentile: 0,
          lastExamAt: null,
        },
      };
      await userRepository.setProfile(decoded.uid, profile);
      await syncPublicProfile(db, profile.uid);
    } else {
      if (profile.role !== role) {
        await userRepository.updateProfile(decoded.uid, { role });
        profile = { ...profile, role };
      } else {
        await userRepository.updateProfile(decoded.uid, { updatedAt: now });
      }
      const { updateLoginStreak } = await import("@/server/gamification");
      await updateLoginStreak(db, decoded.uid);
      const refreshed = await userRepository.getProfile(decoded.uid);
      if (refreshed) profile = refreshed;
    }

    const token = await createSessionToken({
      uid: profile.uid,
      email: profile.email,
      role,
    });
    await setSessionCookie(token);

    securityLog("session_created", { uid: profile.uid, role });

    return NextResponse.json({ profile: { ...profile, role } });
  } catch (e) {
    console.error("[auth/session] Error:", e);
    securityLog("auth_failed", {
      reason: e instanceof Error ? e.message : "unknown",
    });

    if (e instanceof FirebaseCredentialsError) {
      return sessionError("Server authentication misconfigured", 503, e.message);
    }

    const message = e instanceof Error ? e.message : "Unknown error";

    if (
      message.includes("private key") ||
      message.includes("DECODER") ||
      message.includes("PEM")
    ) {
      return sessionError(
        "Server authentication misconfigured",
        503,
        `Firebase Admin private key error: ${message}`
      );
    }

    if (message.includes("Firebase ID token has expired")) {
      return sessionError("Token expired", 401, message);
    }

    return sessionError("Invalid token", 401, isDev ? message : undefined);
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

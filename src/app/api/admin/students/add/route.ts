import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, jsonError, withApiHandler } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";
import { paths } from "@/lib/firebase/paths";
import { userRepository } from "@/server/repositories/user.repository";
import { syncPublicProfile } from "@/server/gamification";
import type { UserProfile } from "@/types";

export const POST = withApiHandler(async (request) => {
  await requireAdmin();

  const body = await request.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return jsonError(new ApiError(400, "Name, email, and password are required"));
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  try {
    // 1. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // 2. Generate custom Student ID
    // Look up current counter or generate random
    const studentId = `STU-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Create UserProfile in Firestore
    const profile: UserProfile = {
      uid,
      email,
      name,
      studentId,
      role: "student",
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

    await userRepository.setProfile(uid, profile);

    // 4. Sync Public Profile
    await syncPublicProfile(db, uid);

    return jsonOk({ studentId, uid });
  } catch (error: any) {
    console.error("Error creating student:", error);
    return jsonError(new ApiError(500, error.message || "Failed to create student"));
  }
});

import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import { createNotification } from "@/server/notifications";
import { ApiError } from "@/server/api/response";
import type { Question } from "@/types";

export type ChallengeType = "1v1" | "best_of_3";
export type ChallengeStatus = "pending" | "active" | "completed" | "declined";

export interface Challenge {
  id: string;
  type: ChallengeType;
  status: ChallengeStatus;
  challengerId: string;
  challengerName: string;
  challengerStudentId: string;
  challengedId: string;
  challengedName: string;
  challengedStudentId: string;
  examId: string;
  examTitle: string;
  /** XP winner earns; loser gains nothing (never loses XP) */
  wagerXp: number;
  challengerScore: number | null;
  challengedScore: number | null;
  challengerTimeTakenMs: number | null;
  challengedTimeTakenMs: number | null;
  winnerId: string | null;
  questionIds: string[];
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  /** Expires 24h after creation if not accepted */
  expiresAt: number;
}

/** Create a 1v1 challenge from challenger to challengedStudentId */
export async function createChallenge(
  db: Firestore,
  challengerId: string,
  challengerName: string,
  challengerStudentId: string,
  challengedStudentId: string,
  examId: string,
  examTitle: string,
  wagerXp: number,
  type: ChallengeType = "1v1"
): Promise<{ challengeId: string }> {
  // Lookup challenged student via public_profiles collection
  const pubProfilesPath = paths.publicProfile(challengedStudentId)
    .split("/")
    .slice(0, -1)
    .join("/");
  const profSnap2 = await db
    .collection(pubProfilesPath)
    .where("studentId", "==", challengedStudentId)
    .limit(1)
    .get();

  if (profSnap2.empty) throw new ApiError(404, "Student not found");
  const challengedProfile = profSnap2.docs[0]!.data();
  const challengedId = challengedProfile.uid as string;
  const challengedName = String(challengedProfile.name ?? "Student");

  if (challengedId === challengerId) throw new ApiError(400, "Cannot challenge yourself");

  // Check for existing active challenge between these two for same exam
  const existingSnap = await db
    .collection(paths.challenges())
    .where("challengerId", "==", challengerId)
    .where("challengedId", "==", challengedId)
    .where("status", "in", ["pending", "active"])
    .limit(1)
    .get();
  if (!existingSnap.empty) throw new ApiError(409, "Active challenge already exists");

  // Fetch exam questions to snapshot question IDs (server-authoritative)
  const questionsSnap = await db
    .collection(paths.questions())
    .where("examId", "==", examId)
    .limit(20)
    .get();
  if (questionsSnap.empty) throw new ApiError(404, "Exam has no questions");
  const questionIds = questionsSnap.docs.map((d) => d.id);

  const now = Date.now();
  const challengeRef = db.collection(paths.challenges()).doc();
  await challengeRef.set({
    type,
    status: "pending",
    challengerId,
    challengerName,
    challengerStudentId,
    challengedId,
    challengedName,
    challengedStudentId,
    examId,
    examTitle,
    wagerXp: Math.max(0, Math.min(wagerXp, 500)), // cap at 500 XP
    challengerScore: null,
    challengedScore: null,
    challengerTimeTakenMs: null,
    challengedTimeTakenMs: null,
    winnerId: null,
    questionIds,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    expiresAt: now + 24 * 60 * 60 * 1000,
  } satisfies Omit<Challenge, "id">);

  // Notify challenged student
  await createNotification(db, challengedId, {
    title: "Challenge Received!",
    message: `${challengerName} challenged you to ${examTitle} for ${wagerXp} XP`,
    type: "challenge",
    link: `/student?tab=social`,
  });

  return { challengeId: challengeRef.id };
}

/** Accept or decline a challenge */
export async function respondToChallenge(
  db: Firestore,
  challengeId: string,
  uid: string,
  action: "accept" | "decline"
): Promise<void> {
  const challengeRef = db.doc(paths.challenge(challengeId));
  const snap = await challengeRef.get();
  if (!snap.exists) throw new ApiError(404, "Challenge not found");
  const c = snap.data() as Challenge;
  if (c.challengedId !== uid) throw new ApiError(403, "Not your challenge");
  if (c.status !== "pending") throw new ApiError(409, "Challenge already resolved");
  if (Date.now() > c.expiresAt) throw new ApiError(410, "Challenge expired");

  const newStatus: ChallengeStatus = action === "accept" ? "active" : "declined";
  await challengeRef.update({
    status: newStatus,
    startedAt: action === "accept" ? Date.now() : null,
  });

  const message =
    action === "accept"
      ? `${c.challengedName} accepted your challenge! Time to compete.`
      : `${c.challengedName} declined your challenge.`;

  await createNotification(db, c.challengerId, {
    title: action === "accept" ? "Challenge Accepted!" : "Challenge Declined",
    message,
    type: "challenge",
    link: `/student?tab=social`,
  });
}

/**
 * Submit a challenge answer set (server-authoritative scoring).
 * Validates that only questions in the challenge's questionIds are accepted.
 * If both players submitted, resolve winner.
 */
export async function submitChallengeAnswers(
  db: Firestore,
  challengeId: string,
  uid: string,
  answers: Record<string, number>,
  timeTakenMs: number
): Promise<{ score: number; maxScore: number; xpEarned: number; isWinner: boolean }> {
  const challengeRef = db.doc(paths.challenge(challengeId));
  const snap = await challengeRef.get();
  if (!snap.exists) throw new ApiError(404, "Challenge not found");
  const c = snap.data() as Challenge;

  const isChallenger = c.challengerId === uid;
  const isChallenged = c.challengedId === uid;
  if (!isChallenger && !isChallenged) throw new ApiError(403, "Not a participant");
  if (c.status !== "active") throw new ApiError(409, "Challenge not active");

  // Check not already submitted
  if (isChallenger && c.challengerScore !== null)
    throw new ApiError(409, "Already submitted");
  if (isChallenged && c.challengedScore !== null)
    throw new ApiError(409, "Already submitted");

  // Server-side scoring against stored question IDs
  const questionSnaps = await db
    .collection(paths.questions())
    .where("__name__", "in", c.questionIds.slice(0, 10)) // Firestore `in` limit
    .get();
  const questionMap = new Map(
    questionSnaps.docs.map((d) => [d.id, d.data() as Question])
  );

  let score = 0;
  for (const qId of c.questionIds) {
    const q = questionMap.get(qId);
    if (!q) continue;
    if (answers[qId] === q.correctIndex) score++;
  }
  const maxScore = c.questionIds.length;

  const updates: Record<string, unknown> = {};
  if (isChallenger) {
    updates.challengerScore = score;
    updates.challengerTimeTakenMs = timeTakenMs;
  } else {
    updates.challengedScore = score;
    updates.challengedTimeTakenMs = timeTakenMs;
  }

  // Re-fetch after update to check if both submitted
  await challengeRef.update(updates);
  const freshSnap = await challengeRef.get();
  const fresh = freshSnap.data() as Challenge;

  let xpEarned = 0;
  let isWinner = false;

  if (fresh.challengerScore !== null && fresh.challengedScore !== null) {
    // Both submitted — resolve
    let winnerId: string | null = null;
    const cScore = fresh.challengerScore;
    const dScore = fresh.challengedScore;
    if (cScore > dScore) {
      winnerId = c.challengerId;
    } else if (dScore > cScore) {
      winnerId = c.challengedId;
    } else {
      // Tie-break: faster time wins
      const cTime = fresh.challengerTimeTakenMs ?? Infinity;
      const dTime = fresh.challengedTimeTakenMs ?? Infinity;
      winnerId = cTime < dTime ? c.challengerId : c.challengedId;
    }

    await challengeRef.update({ status: "completed", winnerId, completedAt: Date.now() });

    // Award XP to winner (never deduct from loser)
    if (winnerId === uid) {
      isWinner = true;
      xpEarned = c.wagerXp;
      // Award XP via engagement doc
      const engRef = db.doc(paths.userEngagement(uid));
      await engRef.set({ xp: (await engRef.get()).data()?.xp ?? 0 + xpEarned }, { merge: true });
    }

    // Notify both
    const loserUid = winnerId === c.challengerId ? c.challengedId : c.challengerId;
    const winnerName = winnerId === c.challengerId ? c.challengerName : c.challengedName;
    await Promise.all([
      createNotification(db, winnerId, {
        title: "Challenge Won! 🏆",
        message: `You won the ${c.examTitle} challenge and earned ${c.wagerXp} XP!`,
        type: "challenge",
      }),
      createNotification(db, loserUid, {
        title: "Challenge Result",
        message: `${winnerName} won the ${c.examTitle} challenge. Better luck next time!`,
        type: "challenge",
      }),
    ]);
  }

  return { score, maxScore, xpEarned, isWinner };
}

/** List challenges for a user (as either participant). */
export async function listUserChallenges(
  db: Firestore,
  uid: string,
  limit = 20
): Promise<Challenge[]> {
  // Two queries: as challenger + as challenged
  const [asChallenger, asChallenged] = await trackQuery("challenge.list_user", () =>
    Promise.all([
      db
        .collection(paths.challenges())
        .where("challengerId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get(),
      db
        .collection(paths.challenges())
        .where("challengedId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get(),
    ])
  );

  const all = new Map<string, Challenge>();
  for (const snap of [asChallenger, asChallenged]) {
    for (const doc of snap.docs) {
      all.set(doc.id, { id: doc.id, ...doc.data() } as Challenge);
    }
  }

  return [...all.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

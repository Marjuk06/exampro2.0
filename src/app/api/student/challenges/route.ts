import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import {
  createChallenge,
  respondToChallenge,
  submitChallengeAnswers,
  listUserChallenges,
} from "@/server/services/social/challenge.service";
import { z } from "zod";

/** GET /api/student/challenges — list user's challenges */
export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const db = getAdminDb();
  const challenges = await listUserChallenges(db, session.uid, 20);
  return jsonOk({ challenges });
});

const createSchema = z.object({
  action: z.literal("create"),
  challengedStudentId: z.string().min(1).max(50),
  examId: z.string().min(1),
  wagerXp: z.number().int().min(10).max(500).default(100),
  type: z.enum(["1v1", "best_of_3"]).default("1v1"),
});

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
  challengeId: z.string().min(1),
});

const submitSchema = z.object({
  action: z.literal("submit"),
  challengeId: z.string().min(1),
  answers: z.record(z.string(), z.number().int().min(0).max(10)),
  timeTakenMs: z.number().int().min(0),
});

const bodySchema = z.discriminatedUnion("action", [
  createSchema,
  submitSchema,
]);

/** POST /api/student/challenges */
export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const db = getAdminDb();
  const body = await request.json();

  // Handle respond (accept/decline) as a separate action not in discriminatedUnion
  if (body.action === "accept" || body.action === "decline") {
    const parsed = respondSchema.parse(body);
    await respondToChallenge(db, parsed.challengeId, session.uid, parsed.action);
    return jsonOk({ ok: true });
  }

  const parsed = bodySchema.parse(body);

  if (parsed.action === "create") {
    // Load challenger profile
    const profileSnap = await db.doc(paths.userProfile(session.uid)).get();
    const challengerName = String(profileSnap.data()?.name ?? "Student");
    const challengerStudentId = String(profileSnap.data()?.studentId ?? "");

    // Load exam title
    const examSnap = await db.doc(paths.exam(parsed.examId)).get();
    const examTitle = String(examSnap.data()?.title ?? "Exam");

    const result = await createChallenge(
      db,
      session.uid,
      challengerName,
      challengerStudentId,
      parsed.challengedStudentId,
      parsed.examId,
      examTitle,
      parsed.wagerXp,
      parsed.type
    );
    return jsonOk(result);
  }

  // action === "submit"
  const result = await submitChallengeAnswers(
    db,
    parsed.challengeId,
    session.uid,
    parsed.answers,
    parsed.timeTakenMs
  );
  return jsonOk(result);
});

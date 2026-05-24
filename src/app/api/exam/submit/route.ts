import { paths } from "@/lib/firebase/paths";
import { getAdminDb } from "@/lib/firebase/admin";
import { submitMcqSchema } from "@/lib/validations/exam";
import { calculateMcqScore } from "@/lib/exam/scoring";
import { processMcqSubmission } from "@/server/post-submit";
import { RETAKE_COOLDOWN_HOURS } from "@/lib/constants";
import type { Exam, Question, ExamResult } from "@/types";

import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();

  const body = await request.json();
  const parsed = submitMcqSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Validation failed");
  }

  const { examId, answers, bookmarks, violationCount, timeTakenMs, startedAt } =
    parsed.data;
  const db = getAdminDb();

  const examSnap = await db.doc(paths.exam(examId)).get();
  if (!examSnap.exists) {
    throw new ApiError(404, "Exam not found");
  }
  const exam = { id: examSnap.id, ...examSnap.data() } as Exam;

  const existing = await db
    .collection(paths.results())
    .where("uid", "==", session.uid)
    .where("examId", "==", examId)
    .limit(1)
    .get();

  const attemptRef = db.doc(paths.userExamAttempts(session.uid, examId));
  const attemptSnap = await attemptRef.get();
  const currentAttempts = attemptSnap.data()?.count ?? 0;
  const lastSubmittedAt = attemptSnap.data()?.lastSubmittedAt ?? 0;
  const attemptNumber = currentAttempts + 1;

  if (!existing.empty) {
    if (!exam.allowRetakes || currentAttempts >= (exam.maxRetakes ?? 1)) {
      throw new ApiError(409, "Already submitted or max retakes reached");
    }
    const cooldownMs = RETAKE_COOLDOWN_HOURS * 60 * 60 * 1000;
    if (Date.now() - lastSubmittedAt < cooldownMs) {
      throw new ApiError(429, `Please wait ${RETAKE_COOLDOWN_HOURS} hours between retake attempts.`);
    }
  }

  const sessionId = `${session.uid}_${examId}`;
  const liveSnap = await db.doc(paths.liveSession(sessionId)).get();
  let resolvedTimeTakenMs = timeTakenMs ?? 0;
  if (liveSnap.exists) {
    const live = liveSnap.data();
    if (live?.endTime && Date.now() > live.endTime + 60_000) {
      throw new ApiError(403, "Time expired");
    }
    if (!resolvedTimeTakenMs && live?.startTime) {
      resolvedTimeTakenMs = Math.max(0, Date.now() - live.startTime);
    }
  }
  if (!resolvedTimeTakenMs && startedAt) {
    resolvedTimeTakenMs = Math.max(0, Date.now() - startedAt);
  }

  const qSnap = await db
    .collection(paths.questions())
    .where("examId", "==", examId)
    .get();
  const questions = qSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Question
  );

  const { score, maxScore } = calculateMcqScore(
    questions,
    answers,
    exam.negativeMarking ?? 0
  );

  const profileSnap = await db.doc(paths.userProfile(session.uid)).get();
  const profile = profileSnap.data();

  await attemptRef.set(
    { count: attemptNumber, lastSubmittedAt: Date.now() },
    { merge: true }
  );

  const result: Omit<ExamResult, "id"> = {
    uid: session.uid,
    examId,
    examType: exam.examType === "cq" ? "cq" : "mcq",
    studentProfile: {
      uid: session.uid,
      name: profile?.name ?? "Student",
      studentId: profile?.studentId ?? "",
    },
    answers,
    bookmarks: bookmarks ?? [],
    score,
    percentage: maxScore ? Math.round((score / maxScore) * 100) : 0,
    violationCount: violationCount ?? 0,
    submittedAt: Date.now(),
    timeTakenMs: resolvedTimeTakenMs,
    attemptNumber,
    maxScore,
  };

  const resultRef = await db.collection(paths.results()).add(result);
  await db.doc(paths.liveSession(sessionId)).delete().catch(() => {});

  let ranking = {
    rank: 0,
    percentile: 0,
    participantCount: 0,
    xpEarned: 0,
    rankDelta: null as number | null,
  };
  try {
    ranking = await processMcqSubmission(db, {
      uid: session.uid,
      resultId: resultRef.id,
      exam,
      result,
      questions,
      timeTakenMs: resolvedTimeTakenMs,
    });
  } catch (e) {
    console.error("[submit] post-processing failed:", e);
  }

  return jsonOk({
    resultId: resultRef.id,
    score,
    maxScore,
    rank: ranking.rank,
    percentile: ranking.percentile,
    participantCount: ranking.participantCount,
    xpEarned: ranking.xpEarned,
    rankDelta: ranking.rankDelta,
  });
}, { rateLimitKey: (req) => `submit:${req.headers.get("x-forwarded-for") || "unknown"}` });

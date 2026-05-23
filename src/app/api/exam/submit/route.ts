import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { submitMcqSchema } from "@/lib/validations/exam";
import { calculateMcqScore } from "@/lib/exam/scoring";
import { rateLimit } from "@/lib/api/rate-limit";
import { processMcqSubmission } from "@/server/post-submit";
import type { Exam, Question, ExamResult } from "@/types";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`submit:${session.uid}`);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = submitMcqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { examId, answers, bookmarks, violationCount, timeTakenMs, startedAt } =
    parsed.data;
  const db = getAdminDb();

  const examSnap = await db.doc(paths.exam(examId)).get();
  if (!examSnap.exists) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }
  const exam = { id: examSnap.id, ...examSnap.data() } as Exam;

  const existing = await db
    .collection(paths.results())
    .where("uid", "==", session.uid)
    .where("examId", "==", examId)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  const sessionId = `${session.uid}_${examId}`;
  const liveSnap = await db.doc(paths.liveSession(sessionId)).get();
  let resolvedTimeTakenMs = timeTakenMs ?? 0;
  if (liveSnap.exists) {
    const live = liveSnap.data();
    if (live?.endTime && Date.now() > live.endTime + 60_000) {
      return NextResponse.json({ error: "Time expired" }, { status: 403 });
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

  const attemptRef = db.doc(paths.userExamAttempts(session.uid, examId));
  const attemptSnap = await attemptRef.get();
  const attemptNumber = (attemptSnap.data()?.count ?? 0) + 1;
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

  let ranking = { rank: 0, percentile: 0, participantCount: 0, xpEarned: 0 };
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

  return NextResponse.json({
    resultId: resultRef.id,
    score,
    maxScore,
    rank: ranking.rank,
    percentile: ranking.percentile,
    participantCount: ranking.participantCount,
    xpEarned: ranking.xpEarned,
  });
}

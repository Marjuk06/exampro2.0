import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { MAX_CQ_IMAGES } from "@/lib/constants";
import { optimizeImageBuffer } from "@/lib/media/optimize-image";

import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";
import { RETAKE_COOLDOWN_HOURS } from "@/lib/constants";
import type { Exam } from "@/types";

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();

  const formData = await request.formData();
  const examId = formData.get("examId") as string;
  if (!examId) {
    throw new ApiError(400, "examId required");
  }

  const files = formData.getAll("images") as File[];
  if (!files.length) {
    throw new ApiError(400, "No images");
  }
  if (files.length > MAX_CQ_IMAGES) {
    throw new ApiError(400, `Max ${MAX_CQ_IMAGES} images`);
  }

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

  const bucket = getAdminStorage().bucket();
  const imageUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const raw = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImageBuffer(raw, { maxWidth: 1920 });
    const fileName = `${Date.now()}_${i}.webp`;
    const storagePath = paths.cqStorage(session.uid, examId, fileName);
    const gcsFile = bucket.file(storagePath);
    await gcsFile.save(optimized.buffer, {
      metadata: {
        contentType: optimized.contentType,
        metadata: {
          originalName: file.name,
          width: String(optimized.width ?? ""),
          height: String(optimized.height ?? ""),
        },
      },
    });
    const [url] = await gcsFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    imageUrls.push(url);
  }

  const profileSnap = await db.doc(paths.userProfile(session.uid)).get();
  const profile = profileSnap.data();
  const sessionId = `${session.uid}_${examId}`;

  await attemptRef.set(
    { count: attemptNumber, lastSubmittedAt: Date.now() },
    { merge: true }
  );

  const resultRef = await db.collection(paths.results()).add({
    uid: session.uid,
    examId,
    examType: "cq",
    studentProfile: {
      uid: session.uid,
      name: profile?.name ?? "Student",
      studentId: profile?.studentId ?? "",
    },
    cqImageUrls: imageUrls,
    score: "Pending",
    submittedAt: Date.now(),
    attemptNumber,
  });

  await db.doc(paths.liveSession(sessionId)).delete().catch(() => {});

  return jsonOk({ ok: true, resultId: resultRef.id, imageCount: imageUrls.length });
}, { rateLimitKey: (req) => `cq:${req.headers.get("x-forwarded-for") || "unknown"}` });

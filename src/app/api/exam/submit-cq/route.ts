import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { rateLimit } from "@/lib/api/rate-limit";
import { MAX_CQ_IMAGES } from "@/lib/constants";
import { optimizeImageBuffer } from "@/lib/media/optimize-image";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`cq:${session.uid}`);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const formData = await request.formData();
  const examId = formData.get("examId") as string;
  if (!examId) {
    return NextResponse.json({ error: "examId required" }, { status: 400 });
  }

  const files = formData.getAll("images") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No images" }, { status: 400 });
  }
  if (files.length > MAX_CQ_IMAGES) {
    return NextResponse.json({ error: `Max ${MAX_CQ_IMAGES} images` }, { status: 400 });
  }

  const db = getAdminDb();
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

  await db.collection(paths.results()).add({
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
  });

  await db.doc(paths.liveSession(sessionId)).delete().catch(() => {});

  return NextResponse.json({ ok: true, imageCount: imageUrls.length });
}

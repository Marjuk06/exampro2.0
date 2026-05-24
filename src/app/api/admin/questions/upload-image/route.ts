import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { v4 as uuid } from "uuid";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const WEBP_QUALITY = 82;
const MAX_DIMENSION = 1280;

/**
 * POST /api/admin/questions/upload-image
 *
 * Accepts multipart/form-data with:
 *   - file: image file (jpeg, png, webp, gif)
 *   - questionId: (optional) attach image to existing question
 *
 * Pipeline: validate MIME + size → Sharp WebP resize → GCS upload → return URL
 */
export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  if (session.role !== "admin" && session.role !== "superadmin") {
    throw new ApiError(403, "Admin only");
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const questionId = formData.get("questionId") as string | null;

  if (!file) throw new ApiError(400, "No file provided");
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ApiError(400, `Invalid file type: ${file.type}. Allowed: jpeg, png, webp, gif`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ApiError(413, `File too large: ${Math.round(file.size / 1024)}KB. Max 5MB`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Sharp processing: resize + convert to WebP
  const sharp = (await import("sharp")).default;
  const processed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const metadata = await sharp(processed).metadata();

  // Upload to Firebase Storage
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const fileId = uuid();
  const storagePath = questionId
    ? paths.questionImageStorage(questionId, `${fileId}.webp`)
    : `question-images/${fileId}.webp`;

  const fileRef = bucket.file(storagePath);
  await fileRef.save(processed, {
    metadata: {
      contentType: "image/webp",
      metadata: {
        originalName: file.name,
        width: String(metadata.width ?? ""),
        height: String(metadata.height ?? ""),
        uploadedBy: session.uid,
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  // Make file publicly readable
  await fileRef.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  // If questionId provided, update the question document with the image URL
  if (questionId) {
    const db = getAdminDb();
    await db.doc(paths.question(questionId)).update({
      imageUrl: publicUrl,
      imageUpdatedAt: Date.now(),
    });
  }

  return jsonOk({
    url: publicUrl,
    storagePath,
    width: metadata.width,
    height: metadata.height,
    sizeBytes: processed.length,
    format: "webp",
  });
});

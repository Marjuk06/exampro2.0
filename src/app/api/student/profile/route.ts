import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { syncPublicProfile } from "@/server/gamification";

export const PATCH = withApiHandler(async (request) => {
  const session = await requireAuth();
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const bio = form.get("bio") as string | null;
    const favoriteSubjectsRaw = form.get("favoriteSubjects") as string | null;
    const avatar = form.get("avatar") as File | null;

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (bio != null) updates.bio = bio;
    if (favoriteSubjectsRaw) {
      updates.favoriteSubjects = JSON.parse(favoriteSubjectsRaw) as string[];
    }

    if (avatar && avatar.size > 0) {
      const buffer = Buffer.from(await avatar.arrayBuffer());
      const fileName = `avatar_${Date.now()}.webp`;
      const bucket = getAdminStorage().bucket();
      const file = bucket.file(paths.avatarStorage(session.uid, fileName));
      await file.save(buffer, { metadata: { contentType: avatar.type || "image/webp" } });
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      });
      updates.avatarUrl = url;
    }

    const db = getAdminDb();
    await db.doc(paths.userProfile(session.uid)).update(updates);
    await syncPublicProfile(db, session.uid);
    return jsonOk({ ok: true });
  }

  const body = await request.json();
  const db = getAdminDb();
  const updates: Record<string, unknown> = { updatedAt: Date.now() };

  if (body.resetAvatar === true) {
    const { getAuth } = await import("firebase-admin/auth");
    const userRecord = await getAuth().getUser(session.uid);
    if (userRecord.photoURL) {
      updates.avatarUrl = userRecord.photoURL;
    } else {
      updates.avatarUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${session.uid}`;
    }
  } else {
    const allowed = ["bio", "favoriteSubjects", "name", "avatarUrl"] as const;
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
  }

  await db.doc(paths.userProfile(session.uid)).update(updates);
  await syncPublicProfile(db, session.uid);
  return jsonOk({ ok: true });
});

import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk, parseJson } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  createClan,
  joinClan,
  listTopClans,
  getClanMembers,
} from "@/server/services/social/clan.service";
import { z } from "zod";
import { paths } from "@/lib/firebase/paths";

/** GET /api/student/social/clans?clanId=... — list top clans or get one */
export const GET = withApiHandler(async (request) => {
  await requireAuth();
  const db = getAdminDb();
  const { searchParams } = new URL(request.url);
  const clanId = searchParams.get("clanId");

  if (clanId) {
    const [clanSnap, membersResult] = await Promise.all([
      db.doc(paths.clan(clanId)).get(),
      getClanMembers(db, clanId),
    ]);
    if (!clanSnap.exists) return jsonOk({ clan: null, members: [] });
    return jsonOk({
      clan: { id: clanSnap.id, ...clanSnap.data() },
      members: membersResult,
    });
  }

  const clans = await listTopClans(db, 25);
  return jsonOk({ clans });
});

const createSchema = z.object({
  name: z.string().min(2).max(50),
  tag: z.string().min(2).max(5),
  description: z.string().max(200).default(""),
});

/** POST /api/student/social/clans — create a clan */
export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { name, tag, description } = await parseJson(request, createSchema);
  const db = getAdminDb();

  const profileSnap = await db.doc(paths.userProfile(session.uid)).get();
  const ownerName = String(profileSnap.data()?.name ?? "Student");
  const ownerXp = Number(profileSnap.data()?.xp ?? 0);

  const result = await createClan(db, session.uid, name, tag, description, ownerName, ownerXp);
  return jsonOk(result);
});

const joinSchema = z.object({
  clanId: z.string().min(1),
});

/** PUT /api/student/social/clans — join a clan */
export const PUT = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { clanId } = await parseJson(request, joinSchema);
  const db = getAdminDb();

  const profileSnap = await db.doc(paths.userProfile(session.uid)).get();
  const name = String(profileSnap.data()?.name ?? "Student");
  const studentId = String(profileSnap.data()?.studentId ?? "");
  const xp = Number(profileSnap.data()?.xp ?? 0);

  await joinClan(db, session.uid, name, studentId, xp, clanId);
  return jsonOk({ ok: true });
});

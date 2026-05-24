import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import { createNotification } from "@/server/notifications";
import { ApiError } from "@/server/api/response";

export const MAX_CLAN_MEMBERS = 50;
export const CLAN_TAG_REGEX = /^[A-Z0-9]{2,5}$/;

export interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  totalXp: number;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ClanMember {
  uid: string;
  name: string;
  studentId: string;
  role: "owner" | "admin" | "member";
  xp: number;
  joinedAt: number;
}

/** Create a new clan. Each user can only be in 1 clan at a time. */
export async function createClan(
  db: Firestore,
  uid: string,
  name: string,
  tag: string,
  description: string,
  ownerName: string,
  ownerXp: number
): Promise<{ clanId: string }> {
  // Validate tag
  if (!CLAN_TAG_REGEX.test(tag.toUpperCase()))
    throw new ApiError(400, "Tag must be 2-5 uppercase alphanumeric characters");

  // Check if user already in a clan
  const memberSnap = await db.doc(paths.clanMembership(uid)).get();
  if (memberSnap.exists) throw new ApiError(409, "You are already in a clan");

  // Check clan name uniqueness
  const nameSnap = await trackQuery("clan.check_name", () =>
    db.collection(paths.clans()).where("name", "==", name).limit(1).get()
  );
  if (!nameSnap.empty) throw new ApiError(409, "Clan name already taken");

  const clanRef = db.collection(paths.clans()).doc();
  const now = Date.now();
  const batch = db.batch();

  batch.set(clanRef, {
    name,
    tag: tag.toUpperCase(),
    description,
    ownerId: uid,
    ownerName,
    memberCount: 1,
    totalXp: ownerXp,
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  } satisfies Omit<Clan, "id">);

  // Add owner as member in clan members subcollection
  const memberRef = db
    .collection(`${paths.clan(clanRef.id)}/members`)
    .doc(uid);
  batch.set(memberRef, {
    uid,
    name: ownerName,
    role: "owner",
    xp: ownerXp,
    joinedAt: now,
  });

  // Create clan membership record on user
  batch.set(db.doc(paths.clanMembership(uid)), {
    clanId: clanRef.id,
    clanName: name,
    role: "owner",
    joinedAt: now,
  });

  await batch.commit();
  return { clanId: clanRef.id };
}

/** Join a public clan (or accept invite). */
export async function joinClan(
  db: Firestore,
  uid: string,
  name: string,
  studentId: string,
  xp: number,
  clanId: string
): Promise<void> {
  // Check user not in another clan
  const memberSnap = await db.doc(paths.clanMembership(uid)).get();
  if (memberSnap.exists) throw new ApiError(409, "You are already in a clan");

  const clanRef = db.doc(paths.clan(clanId));
  const clanSnap = await clanRef.get();
  if (!clanSnap.exists) throw new ApiError(404, "Clan not found");
  const clan = clanSnap.data() as Clan;
  if (!clan.isPublic) throw new ApiError(403, "Clan is not public");
  if (clan.memberCount >= MAX_CLAN_MEMBERS)
    throw new ApiError(409, `Clan is full (max ${MAX_CLAN_MEMBERS} members)`);

  const now = Date.now();
  const batch = db.batch();

  // Add member
  const memberRef = db.collection(`${paths.clan(clanId)}/members`).doc(uid);
  batch.set(memberRef, { uid, name, studentId, role: "member", xp, joinedAt: now });

  // Update clan aggregates
  batch.update(clanRef, {
    memberCount: (clan.memberCount ?? 0) + 1,
    totalXp: (clan.totalXp ?? 0) + xp,
    updatedAt: now,
  });

  // Create membership record
  batch.set(db.doc(paths.clanMembership(uid)), {
    clanId,
    clanName: clan.name,
    role: "member",
    joinedAt: now,
  });

  await batch.commit();

  // Notify clan owner
  await createNotification(db, clan.ownerId, {
    title: "New Clan Member",
    message: `${name} joined your clan ${clan.name}`,
    type: "social",
  });
}

/** List top clans by totalXp. */
export async function listTopClans(db: Firestore, limit = 25): Promise<Clan[]> {
  const snap = await trackQuery("clan.list_top", () =>
    db.collection(paths.clans()).orderBy("totalXp", "desc").limit(limit).get()
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Clan);
}

/** Get clan members. */
export async function getClanMembers(
  db: Firestore,
  clanId: string
): Promise<ClanMember[]> {
  const snap = await trackQuery("clan.get_members", () =>
    db
      .collection(`${paths.clan(clanId)}/members`)
      .orderBy("xp", "desc")
      .limit(MAX_CLAN_MEMBERS)
      .get()
  );
  return snap.docs.map((d) => d.data() as ClanMember);
}

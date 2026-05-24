import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { UserConnection } from "@/types/engagement";

export class SocialService {
  private db = getAdminDb();

  async listConnections(uid: string): Promise<UserConnection[]> {
    const snap = await this.db.collection(paths.userConnections(uid)).limit(50).get();
    return snap.docs.map((d) => ({ ...d.data(), uid: d.id }) as UserConnection);
  }

  async addConnection(
    uid: string,
    targetStudentId: string,
    type: "friend" | "rival"
  ): Promise<UserConnection> {
    const targetSnap = await this.db
      .collection(paths.globalLeaderboard())
      .where("studentId", "==", targetStudentId)
      .limit(1)
      .get();

    let targetUid = "";
    let name = targetStudentId;
    if (!targetSnap.empty) {
      const d = targetSnap.docs[0]!;
      targetUid = d.id;
      name = String(d.data().name ?? name);
    } else {
      const profiles = await this.db
        .collectionGroup("profile")
        .where("studentId", "==", targetStudentId)
        .limit(1)
        .get()
        .catch(() => null);
      if (profiles?.docs[0]) {
        targetUid = profiles.docs[0].ref.parent.parent?.id ?? "";
        name = String(profiles.docs[0].data().name ?? name);
      }
    }

    if (!targetUid) throw new Error("Student not found");
    if (targetUid === uid) throw new Error("Cannot connect to yourself");

    const conn: UserConnection = {
      uid: targetUid,
      studentId: targetStudentId,
      name,
      type,
      createdAt: Date.now(),
    };
    await this.db.doc(paths.userConnection(uid, targetUid)).set(conn);
    return conn;
  }

  async removeConnection(uid: string, otherUid: string): Promise<void> {
    await this.db.doc(paths.userConnection(uid, otherUid)).delete();
  }

  async compareWith(uid: string, otherUid: string) {
    const db = this.db;
    const [mine, theirs] = await Promise.all([
      db.doc(paths.userProfile(uid)).get(),
      db.doc(paths.userProfile(otherUid)).get(),
    ]);
    return {
      me: {
        xp: mine.data()?.xp ?? 0,
        level: mine.data()?.level ?? 1,
        streak: mine.data()?.streak?.current ?? 0,
        bestRank: mine.data()?.stats?.bestRank ?? null,
      },
      them: {
        xp: theirs.data()?.xp ?? 0,
        level: theirs.data()?.level ?? 1,
        streak: theirs.data()?.streak?.current ?? 0,
        bestRank: theirs.data()?.stats?.bestRank ?? null,
      },
    };
  }
}

export const socialService = new SocialService();

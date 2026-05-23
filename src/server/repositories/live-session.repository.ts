import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { LiveSession } from "@/types";

export class LiveSessionRepository {
  private db = getAdminDb();

  sessionId(uid: string, examId: string): string {
    return `${uid}_${examId}`;
  }

  async get(sessionId: string): Promise<LiveSession | null> {
    const snap = await this.db.doc(paths.liveSession(sessionId)).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as LiveSession;
  }

  async set(sessionId: string, data: LiveSession): Promise<void> {
    await this.db.doc(paths.liveSession(sessionId)).set(data);
  }

  async merge(
    sessionId: string,
    updates: Partial<LiveSession> & { lastHeartbeat?: number }
  ): Promise<void> {
    await this.db.doc(paths.liveSession(sessionId)).set(updates, { merge: true });
  }

  async heartbeat(sessionId: string): Promise<void> {
    await this.db.doc(paths.liveSession(sessionId)).set(
      { lastHeartbeat: Date.now() },
      { merge: true }
    );
  }

  async delete(sessionId: string): Promise<void> {
    await this.db.doc(paths.liveSession(sessionId)).delete().catch(() => {});
  }

  async assertOwner(sessionId: string, uid: string): Promise<LiveSession> {
    const session = await this.get(sessionId);
    if (!session || session.uid !== uid) {
      throw new Error("Invalid live session");
    }
    return session;
  }
}

export const liveSessionRepository = new LiveSessionRepository();

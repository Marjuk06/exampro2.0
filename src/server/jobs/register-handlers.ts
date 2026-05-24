import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { registerJobHandler } from "@/server/jobs/job-runner";
import {
  rebuildExamAnalytics,
  rebuildGlobalAnalytics,
} from "@/server/services/analytics-rebuild.service";
import { rebuildExamLeaderboard } from "@/server/services/ranking/incremental-rank.service";

let registered = false;

export function ensureJobHandlersRegistered(): void {
  if (registered) return;
  registered = true;

  registerJobHandler({
    type: "analytics.rebuild",
    async run(payload) {
      const db = getAdminDb();
      const examId = payload.examId as string | undefined;
      if (examId) {
        await rebuildExamAnalytics(db, examId);
      }
      await rebuildGlobalAnalytics(db);
    },
  });

  registerJobHandler({
    type: "live_sessions.prune",
    async run() {
      const db = getAdminDb();
      const now = Date.now();
      const snap = await db
        .collection(paths.liveSessions())
        .where("endTime", "<=", now)
        .limit(200)
        .get();
      if (snap.empty) return;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },
  });

  registerJobHandler({
    type: "ranking.refresh_exam",
    async run(payload) {
      const db = getAdminDb();
      const examId = payload.examId as string;
      const examTitle = payload.examTitle as string;
      const subject = payload.subject as string;
      const maxScore = payload.maxScore as number;
      if (!examId) return;
      await rebuildExamLeaderboard(db, examId, examTitle, subject, maxScore);
    },
  });

  // Phase 4: Warn students whose streak is at risk (no activity today)
  registerJobHandler({
    type: "streaks.warn",
    async run() {
      const db = getAdminDb();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const threshold = startOfDay.getTime();

      // Find students with active streaks who haven't practiced today
      const engSnap = await db
        .collectionGroup("engagement")
        .where("streakDays", ">", 0)
        .where("lastActivityAt", "<", threshold)
        .limit(500)
        .get();

      if (engSnap.empty) return;

      const { createNotification } = await import("@/server/notifications");
      const BATCH_SIZE = 50;
      for (let i = 0; i < engSnap.docs.length; i += BATCH_SIZE) {
        const chunk = engSnap.docs.slice(i, i + BATCH_SIZE);
        await Promise.all(
          chunk.map((doc) => {
            const uid = doc.ref.path.split("/users/")[1]?.split("/")[0];
            if (!uid) return Promise.resolve();
            const streak = doc.data().streakDays as number;
            return createNotification(db, uid, {
              title: "🔥 Streak at risk!",
              message: `Your ${streak}-day streak ends at midnight. Practice now to keep it alive!`,
              type: "warning",
              link: "/student?tab=practice",
            });
          })
        );
      }
    },
  });

  // Phase 4: Prune expired challenges (older than 24h in pending status)
  registerJobHandler({
    type: "challenges.prune",
    async run() {
      const db = getAdminDb();
      const snap = await db
        .collection(paths.challenges())
        .where("status", "==", "pending")
        .where("expiresAt", "<=", Date.now())
        .limit(200)
        .get();
      if (snap.empty) return;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.update(d.ref, { status: "declined", expiredAt: Date.now() }));
      await batch.commit();
    },
  });
}


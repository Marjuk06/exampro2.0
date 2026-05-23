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
}

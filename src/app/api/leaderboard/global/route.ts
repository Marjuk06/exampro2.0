import { getServerSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { trackQuery } from "@/server/observability/query-metrics";
import type { PeriodLeaderboardDoc } from "@/types/aggregates";

function currentPeriodKey(period: string): string | null {
  const d = new Date();
  const year = d.getUTCFullYear();
  if (period === "weekly") {
    const start = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil(
      ((d.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7
    );
    return `weekly-${year}-W${String(week).padStart(2, "0")}`;
  }
  if (period === "monthly") {
    return `monthly-${year}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

export const GET = withApiHandler(async (request) => {
  const session = await getServerSession();
  if (!session) {
    return jsonOk({ error: "Unauthorized" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "alltime";
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));
  const cursor = searchParams.get("cursor");

  return trackQuery("api.leaderboard.global", async () => {
    const db = getAdminDb();

    if (period === "weekly" || period === "monthly") {
      const key = currentPeriodKey(period);
      if (key) {
        const snap = await db.doc(paths.periodLeaderboard(key)).get();
        if (snap.exists) {
          const doc = snap.data() as PeriodLeaderboardDoc;
          const entries = (doc.topEntries ?? []).slice(0, limit).map((e, i) => ({
            rank: i + 1,
            uid: e.uid,
            studentId: e.studentId,
            name: e.name,
            xp: 0,
            level: 0,
            streak: 0,
            examsCompleted: 0,
            score: e.score,
            maxScore: e.maxScore,
            percentile: e.percentile,
          }));
          const myEntry = entries.find((e) => e.uid === session.uid) ?? null;
          return jsonOk({ period, entries, myEntry, fromCache: true });
        }
      }
    }

    let q = db.collection(paths.globalLeaderboard()).orderBy("xp", "desc").limit(limit + 1);

    if (cursor) {
      const c = await db.collection(paths.globalLeaderboard()).doc(cursor).get();
      if (c.exists) q = q.startAfter(c);
    }

    const snap = await q.get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    type Entry = {
      rank: number;
      uid: string;
      studentId: string;
      name: string;
      xp: number;
      level: number;
      streak: number;
      examsCompleted: number;
    };

    const entries: Entry[] = page.map((d, i) => ({
      rank: i + 1,
      ...(d.data() as Omit<Entry, "rank">),
    }));

    const mySnap = await db.doc(paths.globalLeaderboardEntry(session.uid)).get();
    const myEntry = mySnap.exists
      ? { rank: 0, ...(mySnap.data() as Omit<Entry, "rank">) }
      : entries.find((e) => e.uid === session.uid) ?? null;

    return jsonOk({
      period,
      entries,
      myEntry,
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
      fromCache: false,
    });
  });
});

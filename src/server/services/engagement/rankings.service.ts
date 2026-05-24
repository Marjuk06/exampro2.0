import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { NearbyRankEntry } from "@/types/engagement";
import type { ExamLeaderboardDoc } from "@/types/gamification";

export async function getNearbyRanks(
  examId: string,
  uid: string,
  window = 2
): Promise<NearbyRankEntry[]> {
  const db = getAdminDb();
  const lbSnap = await db.doc(paths.examLeaderboard(examId)).get();
  if (!lbSnap.exists) return [];

  const board = lbSnap.data() as ExamLeaderboardDoc;
  const entries = board.topEntries ?? [];
  const myIdx = entries.findIndex((e) => e.uid === uid);
  if (myIdx < 0) {
    const rankSnap = await db.doc(paths.examRank(examId, uid)).get();
    if (!rankSnap.exists) return [];
    const mine = rankSnap.data()!;
    return [
      {
        rank: mine.rank as number,
        uid,
        studentId: mine.studentId as string,
        name: mine.studentName as string,
        score: mine.score as number,
        maxScore: mine.maxScore as number,
        isMe: true,
      },
    ];
  }

  const start = Math.max(0, myIdx - window);
  const end = Math.min(entries.length, myIdx + window + 1);
  return entries.slice(start, end).map((e) => ({
    rank: e.rank,
    uid: e.uid,
    studentId: e.studentId,
    name: e.name,
    score: e.score,
    maxScore: e.maxScore,
    isMe: e.uid === uid,
  }));
}

export async function getSubjectRank(
  subject: string,
  uid: string
): Promise<{ rank: number; percentile: number; participantCount: number } | null> {
  const db = getAdminDb();
  const snap = await db.doc(paths.subjectLeaderboard(subject)).get();
  if (!snap.exists) return null;
  const top = (snap.data()?.topEntries ?? []) as Array<{ uid: string; rank: number; percentile: number }>;
  const me = top.find((e) => e.uid === uid);
  if (!me) return null;
  return {
    rank: me.rank,
    percentile: me.percentile,
    participantCount: top.length,
  };
}

export async function getGlobalRankPosition(uid: string): Promise<number | null> {
  const db = getAdminDb();
  const me = await db.doc(paths.globalLeaderboardEntry(uid)).get();
  if (!me.exists) return null;
  const myXp = (me.data()?.xp as number) ?? 0;
  const higher = await db
    .collection(paths.globalLeaderboard())
    .where("xp", ">", myXp)
    .count()
    .get();
  return higher.data().count + 1;
}

import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import type { RankHistoryEntry } from "@/types/engagement";

export async function recordRankHistory(
  db: Firestore,
  input: {
    uid: string;
    examId: string;
    examTitle: string;
    subject: string;
    rank: number;
    previousRank: number | null;
    percentile: number;
    score: number;
    maxScore: number;
  }
): Promise<RankHistoryEntry> {
  const rankDelta =
    input.previousRank != null ? input.previousRank - input.rank : null;

  const entry: Omit<RankHistoryEntry, "id"> = {
    examId: input.examId,
    examTitle: input.examTitle,
    subject: input.subject,
    rank: input.rank,
    previousRank: input.previousRank,
    rankDelta,
    percentile: input.percentile,
    score: input.score,
    maxScore: input.maxScore,
    recordedAt: Date.now(),
  };

  const ref = await db.collection(paths.userRankHistory(input.uid)).add(entry);
  return { id: ref.id, ...entry };
}

export async function getRankHistory(
  db: Firestore,
  uid: string,
  limit = 20
): Promise<RankHistoryEntry[]> {
  const snap = await db
    .collection(paths.userRankHistory(uid))
    .orderBy("recordedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RankHistoryEntry);
}

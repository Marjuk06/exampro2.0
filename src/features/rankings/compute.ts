import type { ExamRankEntry, LeaderboardTopEntry } from "@/types/gamification";

export interface ScorableResult {
  uid: string;
  resultId: string;
  score: number;
  submittedAt: number;
  timeTakenMs: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  studentName: string;
  studentId: string;
}

/** Sort: higher score first, then faster time, then earlier submit */
export function sortResults(a: ScorableResult, b: ScorableResult): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.timeTakenMs !== b.timeTakenMs) return a.timeTakenMs - b.timeTakenMs;
  return a.submittedAt - b.submittedAt;
}

export function computeRanks(
  results: ScorableResult[],
  maxScore: number
): { entries: ExamRankEntry[]; top: LeaderboardTopEntry[] } {
  const sorted = [...results].sort(sortResults);
  const total = sorted.length;

  const entries: ExamRankEntry[] = sorted.map((r, index) => {
    const rank = index + 1;
    const percentile =
      total > 1 ? Math.round(((total - rank) / (total - 1)) * 1000) / 10 : 100;
    const accuracy =
      maxScore > 0 ? Math.round((r.score / maxScore) * 1000) / 10 : 0;

    return {
      uid: r.uid,
      examId: "",
      resultId: r.resultId,
      rank,
      percentile,
      score: r.score,
      maxScore,
      accuracy,
      correctCount: r.correctCount,
      wrongCount: r.wrongCount,
      skippedCount: r.skippedCount,
      timeTakenMs: r.timeTakenMs,
      studentName: r.studentName,
      studentId: r.studentId,
      submittedAt: r.submittedAt,
    };
  });

  const top: LeaderboardTopEntry[] = entries.slice(0, 50).map((e) => ({
    uid: e.uid,
    studentId: e.studentId,
    name: e.studentName,
    rank: e.rank,
    score: e.score,
    maxScore: e.maxScore,
    percentile: e.percentile,
    accuracy: e.accuracy,
    timeTakenMs: e.timeTakenMs,
  }));

  return { entries, top };
}

export function formatRankMessage(rank: number, total: number, percentile: number): string {
  if (total <= 0) return "No ranking data";
  return `You ranked #${rank} out of ${total.toLocaleString()} students (Top ${percentile}%)`;
}

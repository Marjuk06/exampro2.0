import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { LeaderboardTopEntry } from "@/types/gamification";

export interface LiveRankingData {
  examId: string;
  participantCount: number;
  updatedAt: number | null;
  topEntries: LeaderboardTopEntry[];
  myRank: number | null;
  estimatedPercentile: number | null;
  pollIntervalMs: number;
}

/**
 * Polls the live ranking endpoint during an active exam.
 * refetchInterval is driven by the server's `pollIntervalMs` response.
 */
export function useLiveRanking(examId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.liveRanking(examId),
    queryFn: () =>
      fetchJson<LiveRankingData>(`/api/exam/live-ranking?examId=${examId}`),
    enabled,
    refetchInterval: 15_000,  // poll every 15s
    staleTime: 10_000,
    retry: 2,
    // Don't refetch on window focus during exam to avoid disruption
    refetchOnWindowFocus: false,
  });
}

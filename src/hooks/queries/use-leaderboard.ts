"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { LeaderboardTopEntry } from "@/types/gamification";

export interface ExamLeaderboardResponse {
  examId: string;
  participantCount: number;
  topEntries: LeaderboardTopEntry[];
  myRank: {
    rank: number;
    percentile: number;
    score: number;
    maxScore: number;
  } | null;
}

export function useGlobalLeaderboard(period = "alltime", limit = 25) {
  return useQuery({
    queryKey: queryKeys.globalLeaderboard(period, limit),
    queryFn: () =>
      fetchJson(`/api/leaderboard/global?period=${period}&limit=${limit}`),
    staleTime: 45_000,
  });
}

import { useInfiniteQuery } from "@tanstack/react-query";

export function useInfiniteGlobalLeaderboard(period = "alltime", limit = 25) {
  return useInfiniteQuery({
    queryKey: ["leaderboard", "global", period],
    queryFn: async ({ pageParam }) => {
      const cursorParam = pageParam ? `&cursor=${pageParam}` : "";
      type LEntry = { uid: string; name: string; studentId: string; rank: number; score?: number; percentile?: number; xp: number; level: number; streak: number; avatar?: string; examsCompleted: number; [key: string]: unknown };
      return fetchJson<{ entries: LEntry[]; myEntry: LEntry | null; nextCursor?: string | null }>(`/api/leaderboard/global?period=${period}&limit=${limit}${cursorParam}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    staleTime: 45_000,
  });
}

export function useExamLeaderboard(examId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.examLeaderboard(examId),
    queryFn: () =>
      fetchJson<ExamLeaderboardResponse>(`/api/leaderboard/exam/${examId}`),
    enabled: enabled && !!examId,
    staleTime: 30_000,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";

export function useGlobalLeaderboard(period = "alltime", limit = 25) {
  return useQuery({
    queryKey: queryKeys.globalLeaderboard(period, limit),
    queryFn: () =>
      fetchJson(`/api/leaderboard/global?period=${period}&limit=${limit}`),
    staleTime: 45_000,
  });
}

export function useExamLeaderboard(examId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.examLeaderboard(examId),
    queryFn: () => fetchJson(`/api/leaderboard/exam/${examId}`),
    enabled: enabled && !!examId,
    staleTime: 30_000,
  });
}

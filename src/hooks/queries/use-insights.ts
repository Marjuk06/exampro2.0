"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { RankHistoryEntry, StudentInsights } from "@/types/engagement";

export function useStudentInsights(enabled = true) {
  return useQuery({
    queryKey: queryKeys.insights,
    queryFn: () =>
      fetchJson<{ insights: StudentInsights; rankHistory: RankHistoryEntry[] }>(
        "/api/student/insights"
      ),
    enabled,
    staleTime: 60_000,
  });
}

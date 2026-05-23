"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";

export interface StudentAnalyticsData {
  examsTaken: number;
  avgScore: number;
  cqCount: number;
  bestRank: number | null;
  chartData: Array<{ name: string; score: number }>;
}

export function useStudentAnalytics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentAnalytics,
    queryFn: () => fetchJson<StudentAnalyticsData>("/api/student/analytics"),
    enabled,
    staleTime: 60_000,
  });
}

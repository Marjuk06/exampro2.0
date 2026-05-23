"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { ExamResult } from "@/types";

export interface AdminAnalyticsData {
  fromCache: boolean;
  totalResults: number;
  mcqCount: number;
  exams: Array<{ id: string; title: string }>;
  results: ExamResult[];
  questionsByExam?: Record<string, number>;
  updatedAt?: number;
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: queryKeys.adminAnalytics,
    queryFn: () => fetchJson<AdminAnalyticsData>("/api/admin/analytics"),
    staleTime: 60_000,
  });
}

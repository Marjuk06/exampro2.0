"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { Exam, ExamResult, RetakeRequest } from "@/types";

export interface StudentDashboardData {
  exams: Exam[];
  results: ExamResult[];
  retakes: RetakeRequest[];
  questionCounts: Record<string, number>;
}

export function useStudentDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentDashboard,
    queryFn: () => fetchJson<StudentDashboardData>("/api/student/dashboard"),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

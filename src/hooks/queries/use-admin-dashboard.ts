"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";

export interface AdminDashboardData {
  liveCount: number;
  examCount: number;
  pendingCq: number;
  uniqueStudents: number;
  avgScore: number;
  totalMcqSubmissions: number;
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: () => fetchJson<AdminDashboardData>("/api/admin/dashboard"),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

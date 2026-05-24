"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { EngagementHubData } from "@/types/engagement";

export function useEngagementHub() {
  return useQuery({
    queryKey: queryKeys.engagement,
    queryFn: () => fetchJson<EngagementHubData>("/api/student/engagement"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useClaimDailyReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ xp: number; streakDays: number; hub: EngagementHubData }>(
        "/api/student/engagement",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim_daily" }),
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.engagement });
    },
  });
}

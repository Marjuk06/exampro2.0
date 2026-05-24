"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import { filterActiveLiveSessions } from "@/lib/live-sessions";
import { useClientNow } from "@/hooks/use-client-now";
import type { LiveSession } from "@/types";


export function useActiveLiveSessions() {
  const now = useClientNow(30_000);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminLiveSessions,
    queryFn: () =>
      fetchJson<{ sessions: LiveSession[] }>("/api/admin/live-sessions"),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const allSessions = data?.sessions ?? [];

  const activeSessions =
    now === null ? [] : filterActiveLiveSessions(allSessions, now);

  return { activeSessions, allSessions, loading: isLoading, now };
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { NotificationItem } from "@/types";

interface NotificationsPage {
  items: NotificationItem[];
  unread: number;
  nextCursor: string | null;
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => fetchJson<NotificationsPage>("/api/notifications?limit=20"),
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { markAllRead?: boolean; ids?: string[] }) =>
      fetchJson("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

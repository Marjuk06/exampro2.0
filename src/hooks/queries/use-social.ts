import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { ActivityFeedItem, UserConnection } from "@/types/engagement";

export interface SocialData {
  connections: UserConnection[];
  feed: ActivityFeedItem[];
}

export function useSocialData(enabled = true) {
  return useQuery({
    queryKey: queryKeys.social,
    queryFn: () => fetchJson<SocialData>("/api/student/social"),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAddConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { studentId: string; type: "friend" | "rival" }) =>
      fetchJson<{ connection: UserConnection }>("/api/student/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...vars }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.social });
    },
  });
}

export function useRemoveConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (otherUid: string) =>
      fetchJson<{ ok: boolean }>(`/api/student/social?uid=${otherUid}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.social });
    },
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { toStudentId: string }) =>
      fetchJson<{ requestId: string }>("/api/student/social/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.friendRequests });
    },
  });
}

export function useRespondFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { requestId: string; action: "accept" | "reject" }) =>
      fetchJson<{ ok: boolean }>("/api/student/social/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.friendRequests });
      void qc.invalidateQueries({ queryKey: queryKeys.social });
    },
  });
}

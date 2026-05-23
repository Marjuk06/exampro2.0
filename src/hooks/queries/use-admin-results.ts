"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import type { ExamResult } from "@/types";

interface ResultsPage {
  items: ExamResult[];
  nextCursor: string | null;
}

export function useAdminResults(examId?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminResults(examId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "50" });
      if (pageParam) params.set("cursor", String(pageParam));
      if (examId && examId !== "all") params.set("examId", examId);
      return fetchJson<ResultsPage>(`/api/admin/results?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

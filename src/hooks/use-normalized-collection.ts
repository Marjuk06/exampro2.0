"use client";

import { useMemo } from "react";
import type { QueryConstraint } from "firebase/firestore";
import {
  useFirestoreCollection,
  orderBy,
} from "@/hooks/use-firestore-collection";

/**
 * Firestore snapshot hook with per-document normalization for legacy/malformed data.
 */
export function useNormalizedFirestoreCollection<T extends { id: string }>(
  pathSegments: string[],
  normalize: (raw: Record<string, unknown> & { id: string }) => T,
  constraints: QueryConstraint[] = []
) {
  const { data, loading, error } = useFirestoreCollection<{
    id: string;
  }>(pathSegments, constraints);

  const normalized = useMemo(
    () =>
      data.map((doc) =>
        normalize(doc as Record<string, unknown> & { id: string })
      ),
    // normalize is a stable module import in all callers
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  return { data: normalized, loading, error };
}

export { orderBy };

"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

/**
 * Firestore listener with required scope constraints (privacy-safe).
 */
export function useScopedFirestoreCollection<T extends { id: string }>(
  pathSegments: string[],
  constraints: QueryConstraint[],
  enabled = true
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const key = `${pathSegments.join("/")}:${enabled}:${constraints.length}`;

  useEffect(() => {
    if (!enabled || constraints.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirebaseDb();
    const ref = collection(db, ...(pathSegments as [string, ...string[]]));
    const q = query(ref, ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}

export { where };

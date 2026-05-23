"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  query,
  orderBy,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

export function useFirestoreCollection<T extends { id: string }>(
  pathSegments: string[],
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    const ref = collection(db, ...(pathSegments as [string, ...string[]]));
    const q = constraints.length ? query(ref, ...constraints) : ref;

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
        );
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathSegments.join("/")]);

  return { data, loading, error };
}

export { orderBy, limit };

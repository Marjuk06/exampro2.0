"use client";

import { useEffect, useState } from "react";

/**
 * Returns current timestamp only after mount to avoid SSR/client drift
 * for time-sensitive UI (exam status, deadlines, timers).
 */
export function useClientNow(intervalMs?: number): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (!intervalMs) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

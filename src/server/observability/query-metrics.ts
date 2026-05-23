type MetricEntry = {
  name: string;
  durationMs: number;
  readCount?: number;
  writeCount?: number;
  meta?: Record<string, unknown>;
  at: string;
};

const SLOW_MS = 500;
const recent: MetricEntry[] = [];
const MAX_RECENT = 100;

export async function trackQuery<T>(
  name: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const durationMs = Date.now() - start;
    const entry: MetricEntry = {
      name,
      durationMs,
      meta,
      at: new Date().toISOString(),
    };
    if (durationMs >= SLOW_MS) {
      console.warn("[slow-query]", JSON.stringify(entry));
    }
    recent.push(entry);
    if (recent.length > MAX_RECENT) recent.shift();
  }
}

export function recordFirestoreOps(
  name: string,
  reads: number,
  writes: number
): void {
  recent.push({
    name,
    durationMs: 0,
    readCount: reads,
    writeCount: writes,
    at: new Date().toISOString(),
  });
}

export function getRecentMetrics(): MetricEntry[] {
  return [...recent];
}

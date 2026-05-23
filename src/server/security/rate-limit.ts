import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/constants";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
}

export interface RateLimitStore {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

/** In-memory store (single instance). Replace with Upstash Redis in production. */
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();

  async check(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: limit - 1 };
    }

    if (entry.count >= limit) {
      return { ok: false, remaining: 0 };
    }

    entry.count++;
    return { ok: true, remaining: limit - entry.count };
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

/** Plug in Upstash/Redis: `setRateLimitStore(new UpstashRateLimitStore())` */
export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

export async function rateLimit(
  key: string,
  limit = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
): Promise<RateLimitResult> {
  return store.check(key, limit, windowMs);
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

import type { StreakState } from "@/types/gamification";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Update streak on login or exam activity */
export function applyActivityStreak(
  streak: StreakState | undefined,
  useFreeze = false
): StreakState {
  const base: StreakState = streak ?? {
    current: 0,
    longest: 0,
    lastActivityDate: null,
    freezesRemaining: 1,
  };

  const today = todayUtc();
  if (base.lastActivityDate === today) {
    return base;
  }

  if (base.lastActivityDate === yesterdayUtc()) {
    const current = base.current + 1;
    return {
      ...base,
      current,
      longest: Math.max(base.longest, current),
      lastActivityDate: today,
    };
  }

  // Missed a day — try freeze
  if (
    useFreeze &&
    base.freezesRemaining > 0 &&
    base.lastActivityDate &&
    base.lastActivityDate < yesterdayUtc()
  ) {
    return {
      ...base,
      freezesRemaining: base.freezesRemaining - 1,
      lastActivityDate: today,
    };
  }

  return {
    ...base,
    current: 1,
    longest: Math.max(base.longest, 1),
    lastActivityDate: today,
  };
}

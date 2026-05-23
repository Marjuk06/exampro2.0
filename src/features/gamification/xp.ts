/** XP and level progression */

export const XP_REWARDS = {
  examComplete: 50,
  perfectScore: 100,
  top10Percent: 80,
  top1Percent: 150,
  dailyStreak: 20,
  retakeImprovement: 30,
} as const;

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let needed = xpForLevel(level);
  let total = 0;
  while (total + needed <= xp && level < 100) {
    total += needed;
    level++;
    needed = xpForLevel(level);
  }
  return level;
}

export function titleForLevel(level: number): string {
  if (level >= 50) return "Grandmaster";
  if (level >= 30) return "Elite Scholar";
  if (level >= 20) return "Expert";
  if (level >= 10) return "Rising Star";
  if (level >= 5) return "Dedicated Learner";
  return "Novice Scholar";
}

export function xpProgressInLevel(xp: number): {
  level: number;
  current: number;
  needed: number;
  percent: number;
} {
  const level = levelFromXp(xp);
  let spent = 0;
  for (let l = 1; l < level; l++) {
    spent += xpForLevel(l);
  }
  const needed = xpForLevel(level);
  const current = xp - spent;
  return {
    level,
    current,
    needed,
    percent: needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 0,
  };
}

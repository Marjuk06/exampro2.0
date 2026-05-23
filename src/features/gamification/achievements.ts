import type { AchievementDefinition } from "@/types/gamification";

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first_exam",
    title: "First Steps",
    description: "Complete your first exam",
    icon: "🎯",
    xpReward: 25,
  },
  {
    id: "perfect_score",
    title: "Perfect Score",
    description: "Score 100% on an MCQ exam",
    icon: "💯",
    xpReward: 100,
  },
  {
    id: "top_1_percent",
    title: "Top 1%",
    description: "Rank in the top 1% of an exam",
    icon: "🏆",
    xpReward: 150,
  },
  {
    id: "streak_7",
    title: "7 Day Streak",
    description: "Study 7 days in a row",
    icon: "🔥",
    xpReward: 70,
  },
  {
    id: "streak_30",
    title: "30 Day Streak",
    description: "Study 30 days in a row",
    icon: "⚡",
    xpReward: 300,
  },
  {
    id: "fast_solver",
    title: "Fast Solver",
    description: "Finish an exam in under half the allotted time",
    icon: "⏱️",
    xpReward: 40,
  },
];

export function evaluateAchievements(input: {
  badges: string[];
  percentile: number;
  accuracy: number;
  streak: number;
  timeTakenMs: number;
  examDurationMin: number;
  isFirstExam: boolean;
}): { newBadges: string[]; bonusXp: number } {
  const earned = new Set(input.badges);
  let bonusXp = 0;

  function grant(id: string) {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def || earned.has(id)) return;
    earned.add(id);
    bonusXp += def.xpReward;
  }

  if (input.isFirstExam) grant("first_exam");
  if (input.accuracy >= 100) grant("perfect_score");
  if (input.percentile <= 1) grant("top_1_percent");
  if (input.streak >= 7) grant("streak_7");
  if (input.streak >= 30) grant("streak_30");
  const halfTimeMs = input.examDurationMin * 60 * 1000 * 0.5;
  if (halfTimeMs > 0 && input.timeTakenMs > 0 && input.timeTakenMs < halfTimeMs) {
    grant("fast_solver");
  }

  const newBadges = [...earned].filter((b) => !input.badges.includes(b));
  return { newBadges, bonusXp };
}

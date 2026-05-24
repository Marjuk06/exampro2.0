import type { MissionProgress, MissionType } from "@/types/engagement";

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function weekKey(d = new Date()): string {
  const year = d.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((d.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function defaultDailyMissions(periodKey: string): MissionProgress[] {
  return [
    {
      id: "daily_exam",
      type: "complete_exam",
      period: "daily",
      title: "Exam Warrior",
      description: "Complete 1 official exam today",
      target: 1,
      progress: 0,
      xpReward: 40,
      completed: false,
      claimed: false,
      periodKey,
    },
    {
      id: "daily_practice",
      type: "practice_questions",
      period: "daily",
      title: "Practice Makes Perfect",
      description: "Answer 15 practice questions",
      target: 15,
      progress: 0,
      xpReward: 30,
      completed: false,
      claimed: false,
      periodKey,
    },
    {
      id: "daily_streak",
      type: "maintain_streak",
      period: "daily",
      title: "Stay Sharp",
      description: "Keep your study streak alive",
      target: 1,
      progress: 0,
      xpReward: 25,
      completed: false,
      claimed: false,
      periodKey,
    },
  ];
}

export function defaultWeeklyMissions(periodKey: string): MissionProgress[] {
  return [
    {
      id: "weekly_exams",
      type: "complete_exam",
      period: "weekly",
      title: "Weekly Grinder",
      description: "Complete 3 exams this week",
      target: 3,
      progress: 0,
      xpReward: 120,
      completed: false,
      claimed: false,
      periodKey,
    },
    {
      id: "weekly_xp",
      type: "earn_xp",
      period: "weekly",
      title: "XP Hunter",
      description: "Earn 500 XP this week",
      target: 500,
      progress: 0,
      xpReward: 80,
      completed: false,
      claimed: false,
      periodKey,
    },
  ];
}

export function getCurrentPeriodKeys() {
  return { daily: utcDateKey(), weekly: weekKey() };
}

export function applyMissionProgress(
  missions: MissionProgress[],
  type: MissionType,
  amount = 1
): MissionProgress[] {
  return missions.map((m) => {
    if (m.type !== type || m.completed) return m;
    const progress = Math.min(m.target, m.progress + amount);
    return {
      ...m,
      progress,
      completed: progress >= m.target,
    };
  });
}

export { utcDateKey, weekKey };

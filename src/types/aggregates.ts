import type { LeaderboardTopEntry } from "@/types/gamification";

/** Per-exam aggregate — avoids full result scans */
export interface ExamStatsDoc {
  examId: string;
  participantCount: number;
  questionCount: number;
  maxScore: number;
  updatedAt: number;
}

export interface PeriodLeaderboardDoc {
  period: "weekly" | "monthly" | "alltime";
  periodKey: string;
  updatedAt: number;
  topEntries: LeaderboardTopEntry[];
}

export interface GlobalAnalyticsDoc {
  totalResults: number;
  totalMcqResults: number;
  totalStudents: number;
  updatedAt: number;
}

export interface ExamAnalyticsDoc {
  examId: string;
  participantCount: number;
  avgScore: number;
  avgPercent: number;
  updatedAt: number;
}

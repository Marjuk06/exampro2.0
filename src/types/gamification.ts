/** Gamification, rankings, and public profile types */

export interface StreakState {
  current: number;
  longest: number;
  /** YYYY-MM-DD in UTC */
  lastActivityDate: string | null;
  freezesRemaining: number;
}

export interface UserGamification {
  xp: number;
  level: number;
  title: string;
  streak: StreakState;
  badges: string[];
}

export interface UserStatsAggregate {
  examsCompleted: number;
  mcqCompleted: number;
  cqCompleted: number;
  totalScorePoints: number;
  bestRank: number | null;
  avgPercentile: number;
  lastExamAt: number | null;
}

export interface PublicProfile {
  uid: string;
  studentId: string;
  name: string;
  email?: string;
  bio: string;
  avatarUrl?: string;
  gamification: UserGamification;
  stats: UserStatsAggregate;
  strongestSubjects: string[];
  weakestSubjects: string[];
  updatedAt: number;
}

export interface ExamRankEntry {
  uid: string;
  examId: string;
  resultId: string;
  rank: number;
  percentile: number;
  score: number;
  maxScore: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTakenMs: number;
  studentName: string;
  studentId: string;
  submittedAt: number;
}

export interface LeaderboardTopEntry {
  uid: string;
  studentId: string;
  name: string;
  rank: number;
  score: number;
  maxScore: number;
  percentile: number;
  accuracy: number;
  timeTakenMs: number;
}

export interface ExamLeaderboardDoc {
  examId: string;
  examTitle: string;
  subject: string;
  participantCount: number;
  updatedAt: number;
  topEntries: LeaderboardTopEntry[];
}

export type LeaderboardPeriod = "exam" | "weekly" | "monthly" | "alltime";

export interface GlobalLeaderboardEntry {
  uid: string;
  studentId: string;
  name: string;
  xp: number;
  level: number;
  examsCompleted: number;
  avgPercentile: number;
  streak: number;
  rank: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "social" | "challenge";
  link?: string;
}

export const DEFAULT_GAMIFICATION: UserGamification = {
  xp: 0,
  level: 1,
  title: "Novice Scholar",
  streak: {
    current: 0,
    longest: 0,
    lastActivityDate: null,
    freezesRemaining: 1,
  },
  badges: [],
};

export const DEFAULT_STATS: UserStatsAggregate = {
  examsCompleted: 0,
  mcqCompleted: 0,
  cqCompleted: 0,
  totalScorePoints: 0,
  bestRank: null,
  avgPercentile: 0,
  lastExamAt: null,
};

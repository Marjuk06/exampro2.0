/** Phase 3 — engagement, practice, social, missions */

export type PracticeMode =
  | "subject"
  | "chapter"
  | "weak"
  | "mistakes"
  | "timed"
  | "daily"
  | "adaptive";

export interface PracticeQuestionRef {
  questionId: string;
  examId: string;
  subject: string;
  chapter?: string;
}

export interface PracticeSession {
  id: string;
  uid: string;
  mode: PracticeMode;
  subject?: string;
  chapter?: string;
  questionIds: string[];
  startedAt: number;
  completedAt?: number;
  score?: number;
  maxScore?: number;
  accuracy?: number;
  timeTakenMs?: number;
  answers?: Record<string, number>;
}

export type MissionPeriod = "daily" | "weekly";

export type MissionType =
  | "complete_exam"
  | "practice_questions"
  | "maintain_streak"
  | "earn_xp"
  | "bookmark_questions";

export interface MissionProgress {
  id: string;
  type: MissionType;
  period: MissionPeriod;
  title: string;
  description: string;
  target: number;
  progress: number;
  xpReward: number;
  completed: boolean;
  claimed: boolean;
  periodKey: string;
}

export interface DailyRewardState {
  lastClaimDate: string | null;
  streakDays: number;
  totalClaims: number;
}

export interface BookmarkEntry {
  questionId: string;
  examId: string;
  subject: string;
  chapter?: string;
  note?: string;
  difficulty?: "easy" | "medium" | "hard";
  markedDifficult?: boolean;
  folderId?: string;
  createdAt: number;
}

export interface RevisionFolder {
  id: string;
  name: string;
  questionCount: number;
  createdAt: number;
}

export type ConnectionType = "friend" | "rival";

export interface UserConnection {
  uid: string;
  studentId: string;
  name: string;
  type: ConnectionType;
  createdAt: number;
}

export interface RankHistoryEntry {
  id: string;
  examId: string;
  examTitle: string;
  subject: string;
  rank: number;
  previousRank: number | null;
  rankDelta: number | null;
  percentile: number;
  score: number;
  maxScore: number;
  recordedAt: number;
}

export interface SubjectRankSnapshot {
  subject: string;
  rank: number;
  percentile: number;
  participantCount: number;
}

export interface NearbyRankEntry {
  rank: number;
  uid: string;
  studentId: string;
  name: string;
  score: number;
  maxScore: number;
  isMe?: boolean;
}

export interface TopicPerformance {
  subject: string;
  chapter: string;
  attempted: number;
  correct: number;
  accuracy: number;
  avgTimeMs: number;
}

export interface StudentInsights {
  strongestTopics: TopicPerformance[];
  weakestTopics: TopicPerformance[];
  weakSubjects: string[];
  weakChapters: string[];
  recommendations: string[];
  totalQuestionsAttempted: number;
  avgAccuracy: number;
  avgTimeMs: number;
  improvementTrend: Array<{ label: string; accuracy: number }>;
  heatmap: Array<{ subject: string; chapter: string; accuracy: number }>;
}

export interface ActivityFeedItem {
  id: string;
  uid: string;
  studentId: string;
  name: string;
  type:
    | "exam_submit"
    | "achievement"
    | "rank_up"
    | "streak"
    | "practice"
    | "challenge";
  title: string;
  message: string;
  createdAt: number;
}

export interface EngagementHubData {
  globalRank: number | null;
  globalXp: number;
  level: number;
  title: string;
  streak: number;
  xpProgress: { current: number; needed: number; percent: number };
  dailyReward: DailyRewardState & { canClaim: boolean; todayReward: number };
  missions: MissionProgress[];
  featuredExams: Array<{ id: string; title: string; subject: string }>;
  weeklyGoal: { target: number; progress: number };
  recentRankChange: RankHistoryEntry | null;
}

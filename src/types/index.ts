export type UserRole = "student" | "admin" | "superadmin";

export type ExamType = "mcq" | "cq" | "mixed";

export type ExamStatus = "upcoming" | "active" | "expired" | "completed";

export interface AppSettings {
  tgToken?: string;
  tgChatId?: string;
  maintenanceMode?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  studentId: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  /** Gamification — optional on legacy profiles */
  xp?: number;
  level?: number;
  title?: string;
  streak?: import("@/types/gamification").StreakState;
  badges?: string[];
  stats?: import("@/types/gamification").UserStatsAggregate;
  favoriteSubjects?: string[];
  practiceQuestionsAnswered?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ExamSection {
  id: string;
  title: string;
  questionIds: string[];
  negativeMarking?: number;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  examType?: ExamType;
  duration: number;
  isUnlimited: boolean;
  startTime: number | null;
  endTime: number | null;
  isHidden: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowedStudents: string[];
  approvedUsers: string[];
  isResultPublished: boolean;
  isAnswerRevealed: boolean;
  negativeMarking: number;
  sections?: ExamSection[];
  tags?: string[];
  difficulty?: "easy" | "medium" | "hard";
  proctoringEnabled: boolean;
  maxViolations: number;
  createdAt: number;
  updatedAt?: number;
}

export interface Question {
  id: string;
  examId: string;
  sectionId?: string;
  text: string;
  options: string[];
  correctIndex: number;
  /** Optional diagram / image URL (Firebase Storage) */
  imageUrl?: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  points?: number;
  createdAt: number;
}

export interface StudentProfileSnapshot {
  name: string;
  studentId: string;
  uid: string;
}

export interface ExamResult {
  id: string;
  uid: string;
  examId: string;
  /** May be missing on legacy Firestore documents */
  examType?: ExamType;
  studentProfile?: StudentProfileSnapshot;
  answers?: Record<string, number>;
  bookmarks?: string[];
  score: number | string;
  percentage?: number;
  cqImageUrls?: string[];
  feedback?: string;
  violationCount?: number;
  submittedAt: number;
  gradedAt?: number;
  gradedBy?: string;
  /** Ranking snapshot (set server-side on MCQ submit) */
  rank?: number;
  rankDelta?: number | null;
  percentile?: number;
  maxScore?: number;
  accuracy?: number;
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
  timeTakenMs?: number;
  attemptNumber?: number;
  isBestScore?: boolean;
}

export interface LiveSession {
  id: string;
  uid: string;
  studentName: string;
  studentId: string;
  examId: string;
  examTitle: string;
  startTime: number;
  endTime: number;
  timeRequested: boolean;
  answers?: Record<string, number>;
  bookmarks?: string[];
  lastHeartbeat?: number;
}

export interface RetakeRequest {
  id: string;
  uid: string;
  studentName: string;
  studentId: string;
  examId: string;
  examTitle: string;
  timestamp: number;
}

export interface ViolationLog {
  id: string;
  uid: string;
  examId: string;
  sessionId: string;
  type: ViolationType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type ViolationType =
  | "tab_switch"
  | "visibility_hidden"
  | "fullscreen_exit"
  | "copy_paste"
  | "right_click"
  | "keyboard_shortcut"
  | "devtools"
  | "multiple_tabs";

export interface NotificationItem {
  id: string;
  uid: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: number;
  link?: string;
}

export interface ExamAttemptState {
  examId: string;
  answers: Record<string, number>;
  bookmarks: string[];
  startedAt: number;
  endTime: number;
}

export interface SessionPayload {
  uid: string;
  email: string;
  role: UserRole;
  exp: number;
}

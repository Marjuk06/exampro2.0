export const APP_ID = process.env.NEXT_PUBLIC_APP_ID ?? "mcq-pro-app";

export const COLLECTIONS = {
  exams: "exams",
  questions: "questions",
  results: "results",
  retakes: "retakes",
  liveSessions: "live_sessions",
  violations: "violations",
  notifications: "notifications",
  logs: "logs",
  rankings: "rankings",
  examLeaderboards: "exam_leaderboards",
  examRanks: "exam_ranks",
  globalLeaderboard: "global_leaderboard",
  publicProfiles: "public_profiles",
  settings: "settings",
} as const;

/** Minimum hours between retake requests for the same exam */
export const RETAKE_COOLDOWN_HOURS = 24;
export const MAX_EXAM_ATTEMPTS_DEFAULT = 3;

export const FIRESTORE_PATHS = {
  publicData: (segment: string) =>
    ["artifacts", APP_ID, "public", "data", segment] as const,
  userProfile: (uid: string) =>
    ["artifacts", APP_ID, "users", uid, "profile", "main"] as const,
  settings: () =>
    ["artifacts", APP_ID, "public", "data", "config", "settings"] as const,
};

export const SESSION_COOKIE = "mcqpro_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const MAX_CQ_IMAGES = 10;
export const MAX_VIOLATIONS_DEFAULT = 5;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 30;

export const PASS_THRESHOLD = 0.6;

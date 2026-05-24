export const queryKeys = {
  studentDashboard: ["student", "dashboard"] as const,
  studentAnalytics: ["student", "analytics"] as const,
  studentResults: (examId?: string) =>
    examId ? (["student", "results", examId] as const) : (["student", "results"] as const),
  globalLeaderboard: (period: string, page: number) =>
    ["leaderboard", "global", period, page] as const,
  examLeaderboard: (examId: string) => ["leaderboard", "exam", examId] as const,
  notifications: (cursor?: string) =>
    ["notifications", cursor ?? "initial"] as const,
  adminDashboard: ["admin", "dashboard"] as const,
  adminAnalytics: ["admin", "analytics"] as const,
  adminResults: (examId?: string) =>
    ["admin", "results", examId ?? "all"] as const,
  adminLiveSessions: ["admin", "live-sessions"] as const,
  profile: (studentId: string) => ["profile", studentId] as const,
  engagement: ["student", "engagement"] as const,
  insights: ["student", "insights"] as const,
  practice: ["student", "practice"] as const,
  bookmarks: ["student", "bookmarks"] as const,
  rankings: ["student", "rankings"] as const,
  social: ["student", "social"] as const,
  // Phase 4
  challenges: ["student", "challenges"] as const,
  challengeDetail: (id: string) => ["student", "challenges", id] as const,
  friendRequests: ["student", "friend-requests"] as const,
  clan: (clanId: string) => ["clan", clanId] as const,
  clanLeaderboard: ["leaderboard", "clan"] as const,
  liveRanking: (examId: string) => ["exam", "live-ranking", examId] as const,
  notificationPrefs: ["student", "notification-prefs"] as const,
  adminDiagnostics: ["admin", "diagnostics"] as const,
  publicSettings: ["settings", "public"] as const,
};


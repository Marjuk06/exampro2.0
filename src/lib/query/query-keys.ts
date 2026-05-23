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
};

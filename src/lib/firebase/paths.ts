import { APP_ID } from "@/lib/constants";

export const paths = {
  exams: () => `artifacts/${APP_ID}/public/data/exams`,
  exam: (id: string) => `artifacts/${APP_ID}/public/data/exams/${id}`,
  questions: () => `artifacts/${APP_ID}/public/data/questions`,
  question: (id: string) => `artifacts/${APP_ID}/public/data/questions/${id}`,
  results: () => `artifacts/${APP_ID}/public/data/results`,
  result: (id: string) => `artifacts/${APP_ID}/public/data/results/${id}`,
  retakes: () => `artifacts/${APP_ID}/public/data/retakes`,
  retake: (id: string) => `artifacts/${APP_ID}/public/data/retakes/${id}`,
  liveSessions: () => `artifacts/${APP_ID}/public/data/live_sessions`,
  liveSession: (id: string) =>
    `artifacts/${APP_ID}/public/data/live_sessions/${id}`,
  violations: () => `artifacts/${APP_ID}/public/data/violations`,
  notifications: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/notifications`,
  settings: () => `artifacts/${APP_ID}/public/data/config/settings`,
  userProfile: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/profile/main`,
  cqStorage: (uid: string, examId: string, fileName: string) =>
    `cq-submissions/${uid}/${examId}/${fileName}`,
  examLeaderboard: (examId: string) =>
    `artifacts/${APP_ID}/public/data/exam_leaderboards/${examId}`,
  examRanks: () => `artifacts/${APP_ID}/public/data/exam_ranks`,
  examRank: (examId: string, uid: string) =>
    `artifacts/${APP_ID}/public/data/exam_ranks/${examId}_${uid}`,
  globalLeaderboard: () =>
    `artifacts/${APP_ID}/public/data/global_leaderboard`,
  globalLeaderboardEntry: (uid: string) =>
    `artifacts/${APP_ID}/public/data/global_leaderboard/${uid}`,
  publicProfile: (studentId: string) =>
    `artifacts/${APP_ID}/public/data/public_profiles/${studentId}`,
  userBookmarks: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/bookmarks`,
  userBookmark: (uid: string, questionId: string) =>
    `artifacts/${APP_ID}/users/${uid}/bookmarks/${questionId}`,
  userExamAttempts: (uid: string, examId: string) =>
    `artifacts/${APP_ID}/users/${uid}/exam_attempts/${examId}`,
  examStats: (examId: string) =>
    `artifacts/${APP_ID}/public/data/exam_stats/${examId}`,
  periodLeaderboard: (periodKey: string) =>
    `artifacts/${APP_ID}/public/data/period_leaderboards/${periodKey}`,
  globalAnalytics: () =>
    `artifacts/${APP_ID}/public/data/analytics/global`,
  examAnalytics: (examId: string) =>
    `artifacts/${APP_ID}/public/data/analytics/exams/${examId}`,
  subjectLeaderboard: (subject: string) =>
    `artifacts/${APP_ID}/public/data/subject_leaderboards/${encodeURIComponent(subject)}`,
};

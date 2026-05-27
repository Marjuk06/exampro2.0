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
  chapterLeaderboard: (subject: string, chapter: string) =>
    `artifacts/${APP_ID}/public/data/chapter_leaderboards/${encodeURIComponent(subject)}_${encodeURIComponent(chapter)}`,
  userPracticeSessions: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/practice_sessions`,
  userPracticeSession: (uid: string, sessionId: string) =>
    `artifacts/${APP_ID}/users/${uid}/practice_sessions/${sessionId}`,
  userEngagement: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/engagement/main`,
  userMissions: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/engagement/missions`,
  userRankHistory: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/rank_history`,
  userConnections: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/connections`,
  userConnection: (uid: string, otherUid: string) =>
    `artifacts/${APP_ID}/users/${uid}/connections/${otherUid}`,
  userRevisionFolders: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/revision_folders`,
  userRevisionFolder: (uid: string, folderId: string) =>
    `artifacts/${APP_ID}/users/${uid}/revision_folders/${folderId}`,
  userMistakes: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/mistakes`,
  userMistake: (uid: string, questionId: string) =>
    `artifacts/${APP_ID}/users/${uid}/mistakes/${questionId}`,
  activityFeed: () => `artifacts/${APP_ID}/public/data/activity_feed`,
  activityFeedItem: (id: string) =>
    `artifacts/${APP_ID}/public/data/activity_feed/${id}`,
  dailyChallenge: (dateKey: string) =>
    `artifacts/${APP_ID}/public/data/daily_challenges/${dateKey}`,
  featuredExams: () =>
    `artifacts/${APP_ID}/public/data/featured_exams/current`,
  avatarStorage: (uid: string, fileName: string) =>
    `avatars/${uid}/${fileName}`,
  // Phase 4: Social
  friendRequests: () =>
    `artifacts/${APP_ID}/public/data/friend_requests`,
  friendRequest: (reqId: string) =>
    `artifacts/${APP_ID}/public/data/friend_requests/${reqId}`,
  clans: () =>
    `artifacts/${APP_ID}/public/data/clans`,
  clan: (clanId: string) =>
    `artifacts/${APP_ID}/public/data/clans/${clanId}`,
  clanMembership: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/clan_membership/current`,
  // Phase 4: Challenges
  challenges: () =>
    `artifacts/${APP_ID}/public/data/challenges`,
  challenge: (cid: string) =>
    `artifacts/${APP_ID}/public/data/challenges/${cid}`,
  challengeParticipants: (cid: string) =>
    `artifacts/${APP_ID}/public/data/challenges/${cid}/participants`,
  challengeParticipant: (cid: string, uid: string) =>
    `artifacts/${APP_ID}/public/data/challenges/${cid}/participants/${uid}`,
  // Phase 4: Notification preferences
  notificationPrefs: (uid: string) =>
    `artifacts/${APP_ID}/users/${uid}/engagement/preferences`,
  // Phase 4: Question images
  questionImageStorage: (questionId: string, fileName: string) =>
    `questions/${questionId}/${fileName}`,
  // Telegram Integration
  telegramLinks: () => `artifacts/${APP_ID}/public/data/telegram_links`,
  telegramLink: (tokenId: string) => `artifacts/${APP_ID}/public/data/telegram_links/${tokenId}`,
  telegramLogs: () => `artifacts/${APP_ID}/public/data/telegram_logs`,
  telegramLog: (docId: string) => `artifacts/${APP_ID}/public/data/telegram_logs/${docId}`,
  telegramBroadcasts: () => `artifacts/${APP_ID}/public/data/telegram_broadcasts`,
  telegramBroadcast: (docId: string) => `artifacts/${APP_ID}/public/data/telegram_broadcasts/${docId}`,
};

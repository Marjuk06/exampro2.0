"use client";

import { APP_ID } from "@/lib/constants";

/** Client-side Firestore path segments for public collections */
export const publicPaths = {
  exams: ["artifacts", APP_ID, "public", "data", "exams"] as const,
  questions: ["artifacts", APP_ID, "public", "data", "questions"] as const,
  results: ["artifacts", APP_ID, "public", "data", "results"] as const,
  retakes: ["artifacts", APP_ID, "public", "data", "retakes"] as const,
  liveSessions: ["artifacts", APP_ID, "public", "data", "live_sessions"] as const,
  settings: ["artifacts", APP_ID, "public", "data", "config", "settings"] as const,
  examLeaderboards: ["artifacts", APP_ID, "public", "data", "exam_leaderboards"] as const,
  examRanks: ["artifacts", APP_ID, "public", "data", "exam_ranks"] as const,
  globalLeaderboard: ["artifacts", APP_ID, "public", "data", "global_leaderboard"] as const,
  publicProfiles: ["artifacts", APP_ID, "public", "data", "public_profiles"] as const,
};

export function userBookmarksPath(uid: string) {
  return ["artifacts", APP_ID, "users", uid, "bookmarks"] as const;
}

export function userProfilePath(uid: string) {
  return ["artifacts", APP_ID, "users", uid, "profile", "main"] as const;
}

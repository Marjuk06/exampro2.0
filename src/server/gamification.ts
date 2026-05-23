import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import { evaluateAchievements } from "@/features/gamification/achievements";
import { applyActivityStreak } from "@/features/gamification/streak";
import {
  levelFromXp,
  titleForLevel,
  XP_REWARDS,
} from "@/features/gamification/xp";
import {
  DEFAULT_GAMIFICATION,
  DEFAULT_STATS,
  type PublicProfile,
  type UserGamification,
  type UserStatsAggregate,
} from "@/types/gamification";
import type { UserProfile } from "@/types";

function mergeGamification(profile: UserProfile): UserGamification {
  return {
    ...DEFAULT_GAMIFICATION,
    xp: profile.xp ?? 0,
    level: profile.level ?? 1,
    title: profile.title ?? DEFAULT_GAMIFICATION.title,
    streak: profile.streak ?? DEFAULT_GAMIFICATION.streak,
    badges: profile.badges ?? [],
  };
}

function mergeStats(profile: UserProfile): UserStatsAggregate {
  return { ...DEFAULT_STATS, ...(profile.stats ?? {}) };
}

/** Login / session: bump study streak */
export async function updateLoginStreak(db: Firestore, uid: string): Promise<void> {
  const ref = db.doc(paths.userProfile(uid));
  const snap = await ref.get();
  if (!snap.exists) return;
  const profile = snap.data() as UserProfile;
  const g = mergeGamification(profile);
  const streak = applyActivityStreak(g.streak);
  const xp = g.xp + (streak.current > g.streak.current ? XP_REWARDS.dailyStreak : 0);
  const level = levelFromXp(xp);
  await ref.update({
    streak,
    xp,
    level,
    title: titleForLevel(level),
    updatedAt: Date.now(),
  });
  await syncPublicProfile(db, uid);
}

export async function syncPublicProfile(db: Firestore, uid: string): Promise<void> {
  const snap = await db.doc(paths.userProfile(uid)).get();
  if (!snap.exists) return;
  const profile = snap.data() as UserProfile;
  const g = mergeGamification(profile);
  const stats = mergeStats(profile);
  const publicDoc: PublicProfile = {
    uid,
    studentId: profile.studentId,
    name: profile.name,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatarUrl,
    gamification: g,
    stats,
    strongestSubjects: stats.examsCompleted > 0 ? [] : [],
    weakestSubjects: [],
    updatedAt: Date.now(),
  };
  await db.doc(paths.publicProfile(profile.studentId)).set(publicDoc, { merge: true });
}

export interface PostSubmitGamificationInput {
  uid: string;
  examId: string;
  examTitle: string;
  subject: string;
  score: number;
  maxScore: number;
  percentile: number;
  rank: number;
  accuracy: number;
  timeTakenMs: number;
  examDurationMin: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
}

export async function applyPostSubmitGamification(
  db: Firestore,
  input: PostSubmitGamificationInput
): Promise<{ xpEarned: number; newBadges: string[] }> {
  const ref = db.doc(paths.userProfile(input.uid));
  const snap = await ref.get();
  if (!snap.exists) return { xpEarned: 0, newBadges: [] };

  const profile = snap.data() as UserProfile;
  const g = mergeGamification(profile);
  const stats = mergeStats(profile);

  let xpEarned = XP_REWARDS.examComplete;
  if (input.accuracy >= 100) xpEarned += XP_REWARDS.perfectScore;
  if (input.percentile <= 10) xpEarned += XP_REWARDS.top10Percent;
  if (input.percentile <= 1) xpEarned += XP_REWARDS.top1Percent;

  const streak = applyActivityStreak(g.streak);
  if (streak.current > g.streak.current) {
    xpEarned += XP_REWARDS.dailyStreak;
  }

  const isFirstExam = stats.examsCompleted === 0;
  const { newBadges, bonusXp } = evaluateAchievements({
    badges: g.badges,
    percentile: input.percentile,
    accuracy: input.accuracy,
    streak: streak.current,
    timeTakenMs: input.timeTakenMs,
    examDurationMin: input.examDurationMin,
    isFirstExam,
  });
  xpEarned += bonusXp;

  const totalXp = g.xp + xpEarned;
  const level = levelFromXp(totalXp);
  const badges = [...new Set([...g.badges, ...newBadges])];

  const avgPercentile =
    stats.examsCompleted > 0
      ? Math.round(
          (stats.avgPercentile * stats.examsCompleted + input.percentile) /
            (stats.examsCompleted + 1)
        )
      : input.percentile;

  const nextStats: UserStatsAggregate = {
    ...stats,
    examsCompleted: stats.examsCompleted + 1,
    mcqCompleted: stats.mcqCompleted + 1,
    totalScorePoints: stats.totalScorePoints + input.score,
    bestRank:
      stats.bestRank === null ? input.rank : Math.min(stats.bestRank, input.rank),
    avgPercentile,
    lastExamAt: Date.now(),
  };

  await ref.update({
    xp: totalXp,
    level,
    title: titleForLevel(level),
    streak,
    badges,
    stats: nextStats,
    updatedAt: Date.now(),
  });

  await syncPublicProfile(db, input.uid);
  return { xpEarned, newBadges };
}

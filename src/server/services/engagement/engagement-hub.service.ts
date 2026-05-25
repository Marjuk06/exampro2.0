import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { xpProgressInLevel } from "@/features/gamification/xp";
import { utcDateKey } from "@/features/gamification/missions";
import { missionsService } from "@/server/services/engagement/missions.service";
import { getRankHistory } from "@/server/services/engagement/rank-history.service";
import { getGlobalRankPosition } from "@/server/services/engagement/rankings.service";
import type { EngagementHubData } from "@/types/engagement";
import type { UserProfile } from "@/types";

export async function getEngagementHub(uid: string): Promise<EngagementHubData> {
  const db = getAdminDb();
  
  const [
    profileSnap,
    globalRank,
    engagementSnap,
    missions,
    history,
    featuredSnap
  ] = await Promise.all([
    db.doc(paths.userProfile(uid)).get(),
    getGlobalRankPosition(uid),
    db.doc(paths.userEngagement(uid)).get(),
    missionsService.getMissions(uid),
    getRankHistory(db, uid, 1),
    db.doc(paths.featuredExams()).get()
  ]);

  const profile = profileSnap.data() as UserProfile | undefined;
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.streak?.current ?? 0;
  const xpProgress = xpProgressInLevel(xp);

  const engagement = engagementSnap.data() ?? {};
  const today = utcDateKey();
  const lastClaim = (engagement.lastDailyClaim as string | null) ?? null;
  const canClaim = lastClaim !== today;
  const dailyStreak = (engagement.dailyRewardStreak as number) ?? 0;
  let featuredExams = (featuredSnap.data()?.exams ?? []) as Array<{
    id: string;
    title: string;
    subject: string;
  }>;
  if (featuredExams.length === 0) {
    const examsSnap = await db
      .collection(paths.exams())
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();
    featuredExams = examsSnap.docs.map((d) => ({
      id: d.id,
      title: String(d.data().title ?? "Exam"),
      subject: String(d.data().subject ?? "General"),
    }));
  }

  const weeklyProgress = missions.find((m) => m.id === "weekly_exams")?.progress ?? 0;

  return {
    globalRank,
    globalXp: xp,
    level,
    title: profile?.title ?? "Novice Scholar",
    streak,
    xpProgress: {
      current: xpProgress.current,
      needed: xpProgress.needed,
      percent: xpProgress.percent,
    },
    dailyReward: {
      lastClaimDate: lastClaim,
      streakDays: dailyStreak,
      totalClaims: (engagement.totalDailyClaims as number) ?? 0,
      canClaim,
      todayReward: 15 + dailyStreak * 5,
    },
    missions,
    featuredExams,
    weeklyGoal: { target: 3, progress: weeklyProgress },
    recentRankChange: history[0] ?? null,
  };
}

export async function claimDailyReward(uid: string): Promise<{
  xp: number;
  streakDays: number;
}> {
  const db = getAdminDb();
  const today = utcDateKey();
  const ref = db.doc(paths.userEngagement(uid));
  const snap = await ref.get();
  const data = snap.data() ?? {};

  if (data.lastDailyClaim === today) {
    throw new Error("Already claimed today");
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = utcDateKey(yesterday);
  const streakDays =
    data.lastDailyClaim === yesterdayKey
      ? ((data.dailyRewardStreak as number) ?? 0) + 1
      : 1;
  const xp = 15 + streakDays * 5;

  const profileRef = db.doc(paths.userProfile(uid));
  const profile = await profileRef.get();
  const currentXp = (profile.data()?.xp as number) ?? 0;
  const totalXp = currentXp + xp;

  await ref.set(
    {
      lastDailyClaim: today,
      dailyRewardStreak: streakDays,
      totalDailyClaims: ((data.totalDailyClaims as number) ?? 0) + 1,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  const { levelFromXp, titleForLevel } = await import("@/features/gamification/xp");
  const newLevel = levelFromXp(totalXp);
  const newTitle = titleForLevel(newLevel);
  await profileRef.update({
    xp: totalXp,
    level: newLevel,
    title: newTitle,
    updatedAt: Date.now(),
  });

  // Keep leaderboard entry in sync
  const lbRef = db.doc(paths.globalLeaderboardEntry(uid));
  await lbRef.set(
    {
      uid,
      studentId: profile.data()?.studentId,
      name: profile.data()?.name,
      xp: totalXp,
      level: newLevel,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return { xp, streakDays };
}

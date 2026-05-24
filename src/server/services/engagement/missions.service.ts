import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import {
  applyMissionProgress,
  defaultDailyMissions,
  defaultWeeklyMissions,
  getCurrentPeriodKeys,
} from "@/features/gamification/missions";
import type { MissionProgress, MissionType } from "@/types/engagement";

export class MissionsService {
  private db = getAdminDb();

  async getMissions(uid: string): Promise<MissionProgress[]> {
    const keys = getCurrentPeriodKeys();
    const ref = this.db.doc(paths.userMissions(uid));
    const snap = await ref.get();
    const stored = (snap.data()?.items ?? []) as MissionProgress[];

    const daily = stored.filter(
      (m) => m.period === "daily" && m.periodKey === keys.daily
    );
    const weekly = stored.filter(
      (m) => m.period === "weekly" && m.periodKey === keys.weekly
    );

    const items = [
      ...(daily.length ? daily : defaultDailyMissions(keys.daily)),
      ...(weekly.length ? weekly : defaultWeeklyMissions(keys.weekly)),
    ];

    if (!daily.length || !weekly.length) {
      await ref.set({ items, updatedAt: Date.now() }, { merge: true });
    }
    return items;
  }

  async increment(
    uid: string,
    type: MissionType,
    amount = 1
  ): Promise<MissionProgress[]> {
    const items = await this.getMissions(uid);
    const updated = applyMissionProgress(items, type, amount);
    await this.db.doc(paths.userMissions(uid)).set({
      items: updated,
      updatedAt: Date.now(),
    });
    return updated;
  }

  async claim(uid: string, missionId: string): Promise<{
    xp: number;
    missions: MissionProgress[];
  }> {
    const items = await this.getMissions(uid);
    let xp = 0;
    const updated = items.map((m) => {
      if (m.id !== missionId || !m.completed || m.claimed) return m;
      xp += m.xpReward;
      return { ...m, claimed: true };
    });
    await this.db.doc(paths.userMissions(uid)).set({
      items: updated,
      updatedAt: Date.now(),
    });
    return { xp, missions: updated };
  }
}

export const missionsService = new MissionsService();

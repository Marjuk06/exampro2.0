"use client";

import { ACHIEVEMENTS } from "@/features/gamification/achievements";
import { xpProgressInLevel } from "@/features/gamification/xp";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AchievementsPanel() {
  const { profile } = useAuth();
  if (!profile) return null;

  const badges = profile.badges ?? [];
  const xp = profile.xp ?? 0;
  const prog = xpProgressInLevel(xp);

  return (
    <div className="space-y-6">
      <Card className="border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Your level</p>
              <p className="text-4xl font-bold text-purple-400">{prog.level}</p>
              <p className="text-sm">{profile.title ?? "Novice Scholar"}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{xp} XP</p>
              <p className="text-xs text-muted-foreground">
                {prog.current}/{prog.needed} to next level
              </p>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
              style={{ width: `${prog.percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACHIEVEMENTS.map((a) => {
              const earned = badges.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 ${
                    earned
                      ? "border-green-500/30 bg-green-500/10"
                      : "border-white/5 opacity-60"
                  }`}
                >
                  <span className="text-3xl">{a.icon}</span>
                  <p className="mt-2 font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <p className="mt-1 text-xs text-purple-400">+{a.xpReward} XP</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

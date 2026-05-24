"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Award, Flame, Star, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { xpProgressInLevel } from "@/features/gamification/xp";
import { ACHIEVEMENTS } from "@/features/gamification/achievements";
import type { PublicProfile } from "@/types/gamification";

export function PublicProfileView({ studentId }: { studentId: string }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [recentRanks, setRecentRanks] = useState<
    Array<{ examTitle?: string; rank: number; percentile: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/profile/${encodeURIComponent(studentId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Profile not found");
        return r.json();
      })
      .then((d) => {
        setProfile(d.profile);
        setRecentRanks(d.recentRanks ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [studentId]);

  function shareProfile() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: profile?.name ?? "Profile", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <p className="py-20 text-center text-muted-foreground">
        {error ?? "Profile not found"}
      </p>
    );
  }

  const g = profile.gamification;
  const xpProg = xpProgressInLevel(g.xp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <Card className="overflow-hidden border-purple-500/20">
        <div className="h-24 bg-gradient-to-r from-blue-600/40 via-purple-600/40 to-pink-600/40" />
        <CardContent className="relative px-6 pb-6 pt-0">
          <Avatar className="-mt-12 h-24 w-24 border-4 border-background">
            <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-purple-500 text-2xl font-bold">
              {(profile.name?.charAt(0) ?? "?").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-4 text-2xl font-bold">{profile.name}</h1>
          <p className="text-muted-foreground">{profile.studentId}</p>
          <button
            type="button"
            onClick={shareProfile}
            className="mt-2 text-xs text-blue-400 hover:underline"
          >
            Share profile
          </button>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <BadgePill icon={<Star className="h-4 w-4" />} label={`Level ${g.level}`} />
            <BadgePill icon={<Trophy className="h-4 w-4" />} label={g.title} />
            {g.streak.current > 0 && (
              <BadgePill
                icon={<Flame className="h-4 w-4 text-orange-400" />}
                label={`${g.streak.current} day streak`}
              />
            )}
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>XP progress</span>
              <span>
                {xpProg.current}/{xpProg.needed} XP
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${xpProg.percent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Exams" value={profile.stats.examsCompleted} />
        <Stat label="Avg percentile" value={`${profile.stats.avgPercentile}%`} />
        <Stat label="Best rank" value={profile.stats.bestRank ?? "—"} />
        <Stat label="Total XP" value={g.xp} />
      </div>

      {recentRanks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent ranks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRanks.slice(0, 5).map((r, i) => (
              <div
                key={i}
                className="flex justify-between rounded-lg border border-white/10 p-3 text-sm"
              >
                <span>{String(r.examTitle ?? "Exam")}</span>
                <span className="text-blue-400">
                  #{r.rank} · Top {r.percentile}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-400" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACHIEVEMENTS.map((a) => {
              const earned = g.badges.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 text-center ${
                    earned
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-white/5 opacity-50 grayscale"
                  }`}
                >
                  <span className="text-2xl">{a.icon}</span>
                  <p className="mt-1 text-sm font-medium">{a.title}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BadgePill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm">
      {icon}
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-blue-400">{value}</p>
      </CardContent>
    </Card>
  );
}

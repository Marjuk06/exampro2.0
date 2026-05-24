"use client";

import { motion } from "framer-motion";
import { Flame, Gift, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useClaimDailyReward, useEngagementHub } from "@/hooks/queries/use-engagement";
import { RankMovementBadge } from "@/components/student/rank-movement-badge";
import { toast } from "sonner";

export function EngagementHub() {
  const { data, isLoading } = useEngagementHub();
  const claim = useClaimDailyReward();

  if (isLoading || !data) {
    return (
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse border-white/5">
            <CardContent className="h-24 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  async function handleClaim() {
    try {
      const res = await claim.mutateAsync();
      toast.success(`+${res.xp} XP · Day ${res.streakDays} reward streak`);
    } catch {
      toast.error("Could not claim reward");
    }
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <HubStat
          icon={<Trophy className="h-5 w-5 text-yellow-400" />}
          label="Global rank"
          value={data.globalRank != null ? `#${data.globalRank}` : "—"}
        />
        <HubStat
          icon={<Flame className="h-5 w-5 text-orange-400" />}
          label="Streak"
          value={`${data.streak} days`}
        />
        <HubStat
          icon={<Zap className="h-5 w-5 text-purple-400" />}
          label="Level"
          value={`Lv.${data.level}`}
          sub={data.title}
        />
        <HubStat
          icon={<Target className="h-5 w-5 text-blue-400" />}
          label="Weekly goal"
          value={`${data.weeklyGoal.progress}/${data.weeklyGoal.target}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-purple-500/20 lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">XP Progress</span>
              <span className="text-sm text-muted-foreground">
                {data.xpProgress.current}/{data.xpProgress.needed}
              </span>
            </div>
            <Progress value={data.xpProgress.percent} className="h-2" />
            {data.recentRankChange && (
              <div className="mt-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Latest exam:</span>
                <RankMovementBadge delta={data.recentRankChange.rankDelta} />
                <span className="text-sm">
                  #{data.recentRankChange.rank} · {data.recentRankChange.examTitle}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardContent className="flex h-full flex-col justify-between p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-400" />
              <span className="font-medium">Daily reward</span>
            </div>
            <p className="text-sm text-muted-foreground">
              +{data.dailyReward.todayReward} XP available
            </p>
            <Button
              size="sm"
              className="mt-2 w-full"
              disabled={!data.dailyReward.canClaim || claim.isPending}
              onClick={handleClaim}
            >
              {data.dailyReward.canClaim ? "Claim reward" : "Claimed today"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {data.missions.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.missions.slice(0, 3).map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={m.completed ? "border-green-500/30" : "border-white/10"}>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span>
                      {m.progress}/{m.target}
                    </span>
                    <span className="text-purple-400">+{m.xpReward} XP</span>
                  </div>
                  <Progress
                    value={Math.min(100, (m.progress / m.target) * 100)}
                    className="mt-2 h-1"
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function HubStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="border-white/10">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

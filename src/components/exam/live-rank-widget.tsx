"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Medal, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveRanking } from "@/hooks/queries/use-live-ranking";
import { cn } from "@/lib/utils";

interface LiveRankWidgetProps {
  examId: string;
  className?: string;
}

/**
 * Non-blocking live rank widget — polls every 15s during an active exam.
 * Shows rank, participant count, estimated percentile, and top 3 competitors.
 * Designed to be placed as a collapsible sidebar in the exam UI.
 */
export function LiveRankWidget({ examId, className }: LiveRankWidgetProps) {
  const { data, isLoading } = useLiveRanking(examId);

  if (isLoading && !data) {
    return (
      <Card
        className={cn("border-blue-500/20 bg-blue-500/5 animate-pulse", className)}
      >
        <CardContent className="h-24 p-4" />
      </Card>
    );
  }

  if (!data) return null;

  const { participantCount, myRank, estimatedPercentile, topEntries } = data;

  return (
    <Card className={cn("border-blue-500/20 bg-black/30 backdrop-blur-sm", className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-green-400">LIVE RANKING</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {participantCount.toLocaleString()}
          </span>
        </div>

        {/* My rank */}
        <AnimatePresence mode="wait">
          {myRank != null ? (
            <motion.div
              key={myRank}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mb-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-muted-foreground">Your rank</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-blue-400">#{myRank}</span>
                {estimatedPercentile != null && (
                  <span className="ml-2 text-xs text-green-400">
                    Top {estimatedPercentile}%
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="unranked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 text-xs text-muted-foreground"
            >
              Submit to see your rank
            </motion.p>
          )}
        </AnimatePresence>

        {/* Top 3 mini-list */}
        {topEntries.length > 0 && (
          <div className="space-y-1.5 border-t border-white/10 pt-3">
            <p className="mb-1 text-xs text-muted-foreground">Top performers</p>
            {topEntries.slice(0, 3).map((e, i) => (
              <div
                key={e.uid}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Medal
                    className={cn(
                      "h-3 w-3 shrink-0",
                      i === 0
                        ? "text-yellow-400"
                        : i === 1
                          ? "text-gray-300"
                          : "text-amber-600"
                    )}
                  />
                  <span className="max-w-[100px] truncate text-white/80">
                    {e.name}
                  </span>
                </div>
                <span className="text-muted-foreground">{e.score}</span>
              </div>
            ))}
          </div>
        )}

        {/* Activity indicator */}
        <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground/50">
          <Activity className="h-2.5 w-2.5" />
          <span>Updates every 15s</span>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useGlobalLeaderboard, useExamLeaderboard } from "@/hooks/queries/use-leaderboard";
import { motion } from "framer-motion";
import { Medal, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";
import type { LeaderboardTopEntry } from "@/types/gamification";

interface GlobalEntry {
  rank: number;
  uid: string;
  studentId: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  examsCompleted: number;
}

export function LeaderboardPanel() {
  const { data, isLoading } = useGlobalLeaderboard("alltime", 25);
  const global = (data as { entries?: GlobalEntry[] })?.entries ?? [];
  const myGlobal = (data as { myEntry?: GlobalEntry | null })?.myEntry ?? null;
  const loading = isLoading;

  return (
    <Tabs defaultValue="global">
      <TabsList className="mb-6">
        <TabsTrigger value="global">Global XP</TabsTrigger>
        <TabsTrigger value="tips">How rankings work</TabsTrigger>
      </TabsList>
      <TabsContent value="global">
        {myGlobal && (
          <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Your global rank</p>
                <p className="text-2xl font-bold text-blue-400">#{myGlobal.rank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">Level {myGlobal.level}</p>
                <p className="font-bold text-purple-400">{myGlobal.xp} XP</p>
              </div>
            </CardContent>
          </Card>
        )}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : global.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Complete exams to appear on the leaderboard.
          </p>
        ) : (
          <div className="space-y-2">
            {global.map((e, i) => (
              <motion.div
                key={e.uid}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <LeaderboardRow
                  rank={e.rank}
                  name={e.name}
                  studentId={e.studentId}
                  meta={`Lv.${e.level} · ${e.xp} XP · ${e.examsCompleted} exams`}
                  highlight={e.uid === myGlobal?.uid}
                />
              </motion.div>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="tips">
        <Card>
          <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
            <p>
              Rankings are computed when you submit an MCQ exam. Higher score ranks first;
              ties break by faster completion time.
            </p>
            <p>Earn XP from exams, streaks, top percentiles, and achievements.</p>
            <p>Open any completed exam to see your exam-specific rank and leaderboard.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export function ExamLeaderboardCard({ examId }: { examId: string }) {
  const { data } = useExamLeaderboard(examId);
  if (!data) return null;

  return (
    <Card className="mb-6 border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Exam Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.myRank && (
          <p className="mb-4 text-center text-lg">
            You ranked{" "}
            <span className="font-bold text-blue-400">#{data.myRank.rank}</span> of{" "}
            {data.participantCount.toLocaleString()} · Top{" "}
            <span className="font-bold text-green-400">{data.myRank.percentile}%</span>
          </p>
        )}
        <div className="space-y-2">
          {data.topEntries.slice(0, 10).map((e) => (
            <LeaderboardRow
              key={e.uid}
              rank={e.rank}
              name={e.name}
              studentId={e.studentId}
              meta={`${e.score}/${e.maxScore} · ${e.accuracy}% acc · ${formatDuration(Math.floor(e.timeTakenMs / 1000))}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardRow({
  rank,
  name,
  studentId,
  meta,
  highlight,
}: {
  rank: number;
  name: string;
  studentId: string;
  meta: string;
  highlight?: boolean;
}) {
  const medal =
    rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
        highlight ? "border-blue-500/40 bg-blue-500/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/30 font-bold ${medal}`}>
        {rank <= 3 ? <Medal className="h-5 w-5" /> : rank}
      </div>
      <div className="min-w-0 flex-1">
        <a href={`/profile/${studentId}`} className="font-medium hover:text-blue-400">
          {name}
        </a>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
}

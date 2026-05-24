"use client";

import { useState } from "react";
import { useGlobalLeaderboard, useExamLeaderboard } from "@/hooks/queries/use-leaderboard";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";
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

type Period = "alltime" | "weekly" | "monthly";

export function LeaderboardPanel() {
  const [period, setPeriod] = useState<Period>("alltime");
  const { data, isLoading } = useGlobalLeaderboard(period, 25);
  const global = (data as { entries?: GlobalEntry[] })?.entries ?? [];
  const myGlobal = (data as { myEntry?: GlobalEntry | null })?.myEntry ?? null;

  const podium = global.slice(0, 3);
  const rest = global.slice(3);

  return (
    <Tabs defaultValue="rankings">
      <TabsList className="mb-6 flex-wrap">
        <TabsTrigger value="rankings">Rankings</TabsTrigger>
        <TabsTrigger value="tips">How it works</TabsTrigger>
      </TabsList>
      <TabsContent value="rankings" className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {(["alltime", "weekly", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-muted-foreground hover:bg-white/15"
              }`}
            >
              {p === "alltime" ? "All-time" : p}
            </button>
          ))}
        </div>

        {myGlobal && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Your rank</p>
                <p className="text-2xl font-bold text-blue-400">
                  {myGlobal.rank > 0 ? `#${myGlobal.rank}` : "Unranked"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">Level {myGlobal.level}</p>
                <p className="font-bold text-purple-400">{myGlobal.xp} XP</p>
                {myGlobal.streak > 0 && (
                  <p className="text-xs text-orange-400">{myGlobal.streak} day streak</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
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
          <>
            {podium.length >= 3 && (
              <div className="mb-8 grid grid-cols-3 items-end gap-2 sm:gap-4">
                <PodiumPlace entry={podium[1]!} place={2} height="h-28" />
                <PodiumPlace entry={podium[0]!} place={1} height="h-36" crown />
                <PodiumPlace entry={podium[2]!} place={3} height="h-24" />
              </div>
            )}
            <div className="space-y-2">
              {rest.map((e, i) => (
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
                    meta={`Lv.${e.level} · ${e.xp} XP`}
                    highlight={e.uid === myGlobal?.uid}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </TabsContent>
      <TabsContent value="tips">
        <Card>
          <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
            <p>Global XP leaderboard ranks all active students. Weekly and monthly boards track top exam performances.</p>
            <p>Exam rankings use score, then speed. Your rank updates instantly after each MCQ submit.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function PodiumPlace({
  entry,
  place,
  height,
  crown,
}: {
  entry: GlobalEntry;
  place: number;
  height: string;
  crown?: boolean;
}) {
  const colors =
    place === 1 ? "from-yellow-500/30" : place === 2 ? "from-gray-400/30" : "from-amber-700/30";
  return (
    <div className="flex flex-col items-center text-center">
      {crown && <Crown className="mb-1 h-6 w-6 text-yellow-400" />}
      <div
        className={`flex w-full flex-col items-center justify-end rounded-t-xl bg-gradient-to-t ${colors} to-transparent ${height} border border-white/10 p-2`}
      >
        <Medal
          className={`mb-1 h-5 w-5 ${
            place === 1 ? "text-yellow-400" : place === 2 ? "text-gray-300" : "text-amber-600"
          }`}
        />
        <p className="truncate text-xs font-bold">{entry.name}</p>
        <p className="text-[10px] text-muted-foreground">{entry.xp} XP</p>
      </div>
      <p className="mt-1 text-lg font-bold">#{place}</p>
    </div>
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
              highlight={data.myRank?.rank === e.rank}
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
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/30 font-bold ${medal}`}
      >
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

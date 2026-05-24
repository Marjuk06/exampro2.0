"use client";

import { useState } from "react";
import { Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveLiveSessions } from "@/hooks/use-active-live-sessions";
import { formatDuration } from "@/lib/utils";
import type { LiveSession } from "@/types";

export default function LiveMonitorPage() {
  const { activeSessions, allSessions, loading, now } = useActiveLiveSessions();
  const [clearing, setClearing] = useState(false);

  async function addTime(ls: LiveSession, mins: number) {
    const res = await fetch(`/api/admin/live-sessions/${ls.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addMinutes: mins }),
    });
    if (res.ok) toast.success(`Added +${mins} minutes`);
    else toast.error("Failed to extend time");
  }

  function promptCustom(ls: LiveSession) {
    const v = prompt("Minutes to add:", "15");
    if (v && !isNaN(Number(v)) && parseInt(v, 10) > 0) {
      addTime(ls, parseInt(v, 10));
    }
  }

  async function clearAllStale() {
    setClearing(true);
    const res = await fetch("/api/admin/live-sessions/prune", { method: "POST" });
    const data = await res.json();
    setClearing(false);
    if (res.ok) toast.success(`Removed ${data.removed ?? 0} expired session(s)`);
    else toast.error("Clear failed");
  }

  const staleCount =
    now !== null ? allSessions.filter((s) => s.endTime <= now).length : 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Radio className="h-6 w-6 animate-pulse text-green-400" />
          Live Exam Hall Monitor
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {loading && now === null
              ? "Loading..."
              : `${activeSessions.length} student(s) active`}
          </span>
          {staleCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllStale}
              disabled={clearing}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Clear {staleCount} expired
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeSessions.map((ls) => {
          const tr = now ? Math.floor((ls.endTime - now) / 1000) : 0;
          const isLow = tr > 0 && tr < 120;
          return (
            <Card
              key={ls.id}
              className={`relative border-t-4 ${isLow ? "border-yellow-500" : "border-green-500"}`}
            >
              {ls.timeRequested && (
                <div className="absolute -top-3 right-4 animate-bounce rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-black">
                  Time Requested!
                </div>
              )}
              <CardContent className="p-5">
                <h4 className="font-bold">{ls.studentName}</h4>
                <p className="text-xs text-muted-foreground">{ls.studentId}</p>
                <p className="mb-3 text-xs text-blue-400">{ls.examTitle}</p>
                <div className="mb-4 flex justify-between rounded-lg border border-white/5 bg-black/30 p-3">
                  <span className="text-xs text-muted-foreground">Time Left</span>
                  <span
                    className={`font-mono text-lg font-bold ${isLow ? "animate-pulse text-yellow-400" : "text-green-400"}`}
                  >
                    {formatDuration(tr)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => addTime(ls, 5)}>
                    +5m
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => addTime(ls, 10)}>
                    +10m
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => promptCustom(ls)}>
                    Custom
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!loading && activeSessions.length === 0 && (
          <Card className="col-span-full py-10 text-center text-muted-foreground">
            No students are currently taking exams.
            {staleCount > 0 && (
              <p className="mt-2 text-sm text-yellow-400/80">
                {staleCount} expired session(s) were hidden. Use &quot;Clear expired&quot; to remove them from the database.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

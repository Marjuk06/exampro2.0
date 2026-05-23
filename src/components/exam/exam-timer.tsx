"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

interface ExamTimerProps {
  endTime: number;
  onExpire: () => void;
}

export function ExamTimer({ endTime, onExpire }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((endTime - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const tr = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemaining(tr);
      if (tr <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const isLow = remaining < 60;

  return (
    <div className="glass flex items-center gap-2 rounded-full border border-white/5 px-4 py-2 shadow-lg">
      <Timer className={cn("h-4 w-4", isLow ? "animate-pulse text-red-400" : "text-blue-400")} />
      <span
        className={cn(
          "font-mono text-lg font-bold",
          isLow ? "animate-pulse text-red-400" : "text-blue-400"
        )}
      >
        {formatDuration(remaining)}
      </span>
    </div>
  );
}

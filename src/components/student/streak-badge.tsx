"use client";

import { Flame } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export function StreakBadge() {
  const { profile } = useAuth();
  const streak = profile?.streak?.current ?? 0;
  if (streak < 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-1 sm:px-3 text-sm font-medium text-orange-400">
      <Flame className="h-4 w-4" />
      <span className="hidden sm:inline">
        {streak} day{streak !== 1 ? "s" : ""}
      </span>
      <span className="sm:hidden">{streak}</span>
    </div>
  );
}

"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function RankMovementBadge({
  delta,
  className,
}: {
  delta: number | null | undefined;
  className?: string;
}) {
  if (delta == null || delta === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full bg-white/10 px-2 py-0.5 text-xs",
          className
        )}
      >
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        up ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400",
        className
      )}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta)}
    </span>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";

// Make sure the CSS is added to globals.css

interface CustomLoaderProps {
  className?: string;
  variant?: "circle" | "triangle" | "rect";
}

export function CustomLoader({ className, variant = "circle" }: CustomLoaderProps) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <div className={cn("loader", variant === "triangle" && "triangle")}>
        <svg viewBox={variant === "triangle" ? "0 0 86 80" : "0 0 80 80"}>
          {variant === "circle" && <circle r="32" cy="40" cx="40" id="test"></circle>}
          {variant === "triangle" && <polygon points="43 8 79 72 7 72"></polygon>}
          {variant === "rect" && <rect height="64" width="64" y="8" x="8"></rect>}
        </svg>
      </div>
    </div>
  );
}

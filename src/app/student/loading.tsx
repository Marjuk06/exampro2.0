"use client";

import { CustomLoader } from "@/components/ui/custom-loader";

export default function Loading() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <CustomLoader variant="circle" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading Exam Center...</p>
    </div>
  );
}

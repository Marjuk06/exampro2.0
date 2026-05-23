"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExamDashboard } from "@/components/student/exam-dashboard";
import { StudentAnalytics } from "@/components/student/student-analytics";
import { AchievementsPanel } from "@/components/student/achievements-panel";
import { LeaderboardPanel } from "@/features/leaderboard/leaderboard-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

function StudentTabs() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "exams";

  return (
    <Tabs defaultValue={defaultTab} key={defaultTab}>
      <TabsList className="mb-6 flex h-auto flex-wrap gap-1">
        <TabsTrigger value="exams">Exams</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="achievements">Achievements</TabsTrigger>
      </TabsList>
      <TabsContent value="exams">
        <ExamDashboard />
      </TabsContent>
      <TabsContent value="leaderboard">
        <h2 className="mb-4 text-2xl font-bold">Rankings</h2>
        <LeaderboardPanel />
      </TabsContent>
      <TabsContent value="analytics">
        <StudentAnalytics />
      </TabsContent>
      <TabsContent value="achievements">
        <AchievementsPanel />
      </TabsContent>
    </Tabs>
  );
}

export default function StudentPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <StudentTabs />
    </Suspense>
  );
}

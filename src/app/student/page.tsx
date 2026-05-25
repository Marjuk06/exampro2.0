"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExamDashboard } from "@/components/student/exam-dashboard";
import { StudentAnalytics } from "@/components/student/student-analytics";
import { AchievementsPanel } from "@/components/student/achievements-panel";
import { LeaderboardPanel } from "@/features/leaderboard/leaderboard-panel";
import { EngagementHub } from "@/components/student/engagement-hub";
import { PracticePanel } from "@/components/student/practice-panel";
import { RevisionPanel } from "@/components/student/revision-panel";
import { SocialPanel } from "@/components/student/social-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";

function StudentTabs() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "exams";

  return (
    <>
      <Tabs defaultValue={defaultTab} key={defaultTab}>
        <TabsList className="mb-6 flex h-auto w-full justify-start overflow-x-auto whitespace-nowrap md:flex-wrap">
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="revision">Revision</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>
        <TabsContent value="exams">
          <ErrorBoundary section="Exam Dashboard">
            <ExamDashboard />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="dashboard">
          <h2 className="mb-4 text-2xl font-bold">Your Dashboard</h2>
          <ErrorBoundary section="Engagement Hub">
            <EngagementHub />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="practice">
          <h2 className="mb-4 text-2xl font-bold">Practice Center</h2>
          <ErrorBoundary section="Practice Panel">
            <PracticePanel />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="leaderboard">
          <h2 className="mb-4 text-2xl font-bold">Rankings</h2>
          <ErrorBoundary section="Leaderboard">
            <LeaderboardPanel />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="analytics">
          <ErrorBoundary section="Analytics">
            <StudentAnalytics />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="revision">
          <h2 className="mb-4 text-2xl font-bold">Revision</h2>
          <ErrorBoundary section="Revision Panel">
            <RevisionPanel />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="social">
          <h2 className="mb-4 text-2xl font-bold">Social</h2>
          <ErrorBoundary section="Social Panel">
            <SocialPanel />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="achievements">
          <ErrorBoundary section="Achievements">
            <AchievementsPanel />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </>
  );
}

import { CustomLoader } from "@/components/ui/custom-loader";

export default function StudentPage() {
  return (
    <main> 
      <Suspense fallback={
        <div className="flex h-64 w-full items-center justify-center">
          <CustomLoader variant="circle" />
        </div>
      }>
        <StudentTabs />
      </Suspense>
    </main>
  );
}
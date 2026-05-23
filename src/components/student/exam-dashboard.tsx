"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  Inbox,
  Lock,
  Play,
  Shuffle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { useStudentDashboard } from "@/hooks/queries/use-student-dashboard";
import { getExamStatus, canStudentAccessExam } from "@/lib/exam/scoring";
import type { Exam, ExamResult, RetakeRequest } from "@/types";
import { cn } from "@/lib/utils";
import { useClientNow } from "@/hooks/use-client-now";
import { ClientDate } from "@/components/ui/client-date";
import { ExamDashboardSkeleton } from "@/components/student/exam-dashboard-skeleton";
import { formatExamTypeLabel, isCqExamType } from "@/lib/firestore/normalize";

export function ExamDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const now = useClientNow(60_000);
  const { data, isLoading } = useStudentDashboard(!!profile);

  if (authLoading || !profile || isLoading || !data) {
    return <ExamDashboardSkeleton />;
  }

  const { exams, results, retakes, questionCounts } = data;

  const visible = exams.filter((e) => {
    if (e.isHidden) return false;
    return canStudentAccessExam(e, profile.studentId, profile.uid);
  });

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Available Exams</h2>
        <p className="text-muted-foreground">Select a subject to begin your assessment.</p>
      </div>

      {visible.length === 0 ? (
        <Card className="py-10 text-center">
          <Inbox className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-muted-foreground">No public exams available right now.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((exam, i) => {
            const myResult = results.find(
              (r) => r.uid === profile.uid && r.examId === exam.id
            );
            const qCount = questionCounts[exam.id] ?? 0;
            const hasOverride = exam.approvedUsers?.includes(profile.uid);
            const status = now
              ? getExamStatus(exam, now, hasOverride)
              : ("active" as const);
            const pendingRetake = retakes.find(
              (r) => r.uid === profile.uid && r.examId === exam.id
            );

            const isShakeable =
              !myResult && status === "active";

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={cn(
                    "flex h-full flex-col border-t-4",
                    myResult ? "border-green-500" : "border-blue-500",
                    isShakeable && "animate-gentle-shake ring-2 ring-blue-500/50"
                  )}
                >
                  <CardContent className="flex flex-1 flex-col p-6">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-xl font-bold">{exam.title}</h3>
                      <StatusBadge status={status} hasResult={!!myResult} />
                    </div>
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-medium text-blue-400">
                      <span>{exam.subject}</span>
                      <Badge variant={isCqExamType(exam.examType) ? "purple" : "default"}>
                        {formatExamTypeLabel(exam.examType)}
                      </Badge>
                    </div>
                    <div className="mb-6 flex-1 space-y-2 text-sm text-muted-foreground">
                      <Row label="Duration" value={`${exam.duration} mins`} />
                      <Row label="Questions" value={String(qCount)} />
                      {exam.shuffleQuestions && (
                        <Row
                          label="Order"
                          value={
                            <span className="text-yellow-400">
                              <Shuffle className="mr-1 inline h-3 w-3" />
                              Shuffled
                            </span>
                          }
                        />
                      )}
                      {!exam.isUnlimited && exam.endTime && (
                        <Row
                          label="Deadline"
                          value={
                            <ClientDate
                              timestamp={exam.endTime}
                              className="text-red-300"
                            />
                          }
                          valueClassName="text-red-300"
                        />
                      )}
                      {myResult && (
                        <div className="mt-4 border-t border-white/10 pt-4">
                          <Row
                            label="Your Score"
                            value={
                              exam.isResultPublished
                                ? String(myResult.score)
                                : "Hidden"
                            }
                            className={
                              exam.isResultPublished ? "text-green-400 font-bold" : ""
                            }
                          />
                        </div>
                      )}
                    </div>
                    <ExamActionButton
                      exam={exam}
                      status={status}
                      myResult={myResult}
                      pendingRetake={!!pendingRetake}
                      hasOverride={hasOverride}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName,
  className,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  const resolvedValueClass = valueClassName ?? className;
  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      <span className={cn("text-white", resolvedValueClass)}>{value}</span>
    </div>
  );
}

function StatusBadge({
  status,
  hasResult,
}: {
  status: string;
  hasResult: boolean;
}) {
  if (status === "upcoming")
    return (
      <Badge variant="default">
        <Clock className="mr-1 h-3 w-3" /> Upcoming
      </Badge>
    );
  if (status === "expired" && !hasResult)
    return (
      <Badge variant="danger">
        <XCircle className="mr-1 h-3 w-3" /> Missed
      </Badge>
    );
  if (status === "expired" && hasResult)
    return (
      <Badge variant="muted">
        <Lock className="mr-1 h-3 w-3" /> Closed
      </Badge>
    );
  return (
    <Badge variant="success">
      <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
      Active
    </Badge>
  );
}

function ExamActionButton({
  exam,
  status,
  myResult,
  pendingRetake,
  hasOverride,
}: {
  exam: Exam;
  status: string;
  myResult?: ExamResult;
  pendingRetake: boolean;
  hasOverride: boolean;
}) {
  if (status === "upcoming") {
    return (
      <Button disabled className="w-full opacity-50">
        Not Started Yet
      </Button>
    );
  }

  if (status === "expired" && !myResult) {
    if (pendingRetake) {
      return (
        <Button disabled className="w-full opacity-50">
          Access Requested...
        </Button>
      );
    }
    return <RetakeRequestButton examId={exam.id} examTitle={exam.title} />;
  }

  const label = myResult
    ? "View Result"
    : hasOverride
      ? "Start (Access Granted)"
      : "Start Exam";

  return (
    <Link href={`/exam/${exam.id}`} className="w-full">
      <Button
        variant={myResult ? "outline" : "default"}
        className="w-full"
      >
        {myResult ? <Lock className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
        {label}
      </Button>
    </Link>
  );
}

function RetakeRequestButton({
  examId,
  examTitle,
}: {
  examId: string;
  examTitle: string;
}) {
  const { profile } = useAuth();

  async function handleClick() {
    if (!profile) return;
    const res = await fetch("/api/student/retakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, examTitle }),
    });
    const data = await res.json();
    const { toast } = await import("sonner");
    if (!res.ok) {
      toast.error(data.error ?? "Request failed");
      return;
    }
    toast.success("Request sent to Admin!");
  }

  return (
    <Button variant="destructive" className="w-full" onClick={handleClick}>
      Request Access
    </Button>
  );
}

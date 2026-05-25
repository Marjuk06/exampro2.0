"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExamResultView } from "@/components/exam/exam-result-view";
import { StudentHeader } from "@/components/layout/student-header";
import type { Exam, ExamResult, Question } from "@/types";

interface ResultPageClientProps {
  exam?: Exam;
  result?: ExamResult;
  questions?: Question[];
  error?: string;
  examId?: string;
}

export function ResultPageClient({
  exam,
  result,
  questions,
  error,
  examId,
}: ResultPageClientProps) {
  if (error) {
    return (
      <>
        <StudentHeader />
        <div className="mx-auto max-w-2xl px-4 pt-24 sm:pt-28">
          <Card className="border-red-500/30">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-red-400">Result Not Found</h2>
              <p className="text-muted-foreground">{error}</p>
              <Link href={examId ? `/exam/${examId}` : "/student"}>
                <Button variant="outline" className="mt-2">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {examId ? "Back to Exam" : "Back to Dashboard"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <StudentHeader />
      <div className="mx-auto max-w-5xl px-4 pt-20 pb-12 sm:pt-24">
        <ExamResultView
          exam={exam!}
          result={result!}
          questions={questions!}
        />
      </div>
    </>
  );
}

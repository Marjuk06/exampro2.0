"use client";

import Link from "next/link";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";
import { formatResultScore, isCqExamType } from "@/lib/firestore/normalize";
import { ExamLeaderboardCard } from "@/features/leaderboard/leaderboard-panel";
import { ResultPdfButton } from "@/components/exam/result-pdf-button";
import { RankMovementBadge } from "@/components/student/rank-movement-badge";
import { formatDuration } from "@/lib/utils";
import type { Exam, ExamResult, Question } from "@/types";

interface ExamResultViewProps {
  exam: Exam;
  result: ExamResult;
  questions: Question[];
}

export function ExamResultView({ exam, result, questions }: ExamResultViewProps) {
  if (isCqExamType(exam.examType)) {
    const displayScore = exam.isResultPublished
      ? formatResultScore(result.score)
      : "Hidden";
    const isPending = displayScore === "Pending";
    return (
      <div className="mx-auto w-full max-w-xl">
        <Link href="/student">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
        <Card className="text-center">
          <CardContent className="p-12">
            <div
              className={cn(
                "mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full",
                isPending ? "bg-yellow-500/20" : "bg-green-500/20"
              )}
            >
              {isPending ? (
                <Clock className="h-12 w-12 text-yellow-400" />
              ) : (
                <Check className="h-12 w-12 text-green-400" />
              )}
            </div>
            <h2 className="mb-2 text-3xl font-bold">Written Submission Received</h2>
            <p className="mb-4 text-xl font-bold">
              Your Score:{" "}
              <span
                className={cn(
                  displayScore === "Hidden" && "text-gray-500",
                  isPending && "text-yellow-400",
                  !isPending && displayScore !== "Hidden" && "text-purple-400"
                )}
              >
                {displayScore}
              </span>
            </p>
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {(result.cqImageUrls ?? []).map((img, idx) => (
                <a key={idx} href={img} target="_blank" rel="noreferrer">
                  <img
                    src={img}
                    alt={`Answer ${idx + 1}`}
                    className="h-20 rounded border border-white/20 object-cover transition hover:opacity-80"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!exam.isResultPublished) {
    return (
      <div className="mx-auto w-full max-w-xl text-center">
        <Link href="/student">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12">
            <Check className="mx-auto mb-6 h-16 w-16 text-green-400" />
            <h2 className="mb-4 text-3xl font-bold">Exam Completed!</h2>
            <p className="text-muted-foreground">Results are hidden by the instructor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const score = Number(result.score);
  const percentage = formatPercent(score, questions.length);
  const gradeColor =
    percentage >= 80 ? "text-green-400" : percentage >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link href="/student">
        <Button variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </Link>
      <Card className="mb-8 text-center">
        <CardContent className="p-8">
          <h2 className="mb-6 text-xl font-medium uppercase tracking-widest text-muted-foreground">
            {exam.title} — Result
          </h2>
          <div className="relative mx-auto mb-4 flex h-40 w-40 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${percentage}, 100`}
                className={gradeColor}
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-4xl font-bold">{score}</span>
              <span className="text-sm text-muted-foreground">/{questions.length}</span>
            </div>
          </div>
          <p className="text-lg">
            Score: <span className={cn("font-bold", gradeColor)}>{percentage}%</span>
          </p>
          {result.rank != null && result.rank > 0 && (
            <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-base">
              Rank <span className="font-bold text-blue-400">#{result.rank}</span>
              {result.rankDelta != null && result.rankDelta !== 0 && (
                <RankMovementBadge delta={result.rankDelta} />
              )}
              {result.percentile != null && (
                <>
                  · Top <span className="font-bold text-green-400">{result.percentile}%</span>
                </>
              )}
            </p>
          )}
          {result.timeTakenMs != null && result.timeTakenMs > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Time: {formatDuration(Math.floor(result.timeTakenMs / 1000))}
              {result.accuracy != null && ` · Accuracy: ${result.accuracy}%`}
            </p>
          )}
          <div className="mt-4 flex justify-center gap-2">
            <ResultPdfButton exam={exam} result={result} questions={questions} />
          </div>
        </CardContent>
      </Card>

      <ExamLeaderboardCard examId={exam.id} />

      {exam.isAnswerRevealed && (
        <div className="space-y-4">
          {questions.map((q, i) => {
            const stuAns = result.answers?.[q.id];
            const isCorrect = stuAns === q.correctIndex;
            return (
              <Card
                key={q.id}
                className={cn(
                  "border",
                  isCorrect ? "border-green-500/30" : "border-red-500/30"
                )}
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <h4 className="font-medium whitespace-pre-wrap">
                      <span className="mr-2 text-muted-foreground">Q{i + 1}.</span>
                      {q.text}
                    </h4>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                        isCorrect
                          ? "bg-green-500/20 text-green-700 dark:text-green-400"
                          : stuAns === undefined
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-red-500/20 text-red-700 dark:text-red-400"
                      )}
                    >
                      {isCorrect ? "Correct" : stuAns === undefined ? "Skipped" : "Wrong"}
                    </span>
                  </div>
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt=""
                      className="mb-4 max-h-48 rounded-lg border border-white/10 object-contain"
                      loading="lazy"
                    />
                  )}
                  {q.explanation && (
                    <p className="mb-3 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-200">
                      {q.explanation}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oIdx) => {
                      let styling = "bg-secondary text-secondary-foreground border border-border/50";
                      if (oIdx === q.correctIndex)
                        styling = "bg-green-500/20 border border-green-500/50 text-green-700 dark:text-green-100";
                      else if (oIdx === stuAns && !isCorrect)
                        styling = "bg-red-500/20 border border-red-500/50 text-red-700 dark:text-red-100";
                      return (
                        <div key={oIdx} className={cn("rounded-lg px-4 py-3 text-sm", styling)}>
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

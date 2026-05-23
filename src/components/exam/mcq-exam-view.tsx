"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Hand, Send, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ExamTimer } from "@/components/exam/exam-timer";
import { QuestionPalette } from "@/components/exam/question-palette";
import { useAuth } from "@/components/providers/auth-provider";
import { useExamStore } from "@/store/exam-store";
import { useProctoring } from "@/hooks/use-proctoring";
import { seededShuffle, uidToSeed, cn } from "@/lib/utils";
import type { Exam, Question } from "@/types";

interface McqExamViewProps {
  exam: Exam;
  questions: Question[];
  endTime: number;
  sessionId: string;
}

export function McqExamView({ exam, questions, endTime, sessionId }: McqExamViewProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { answers, bookmarks, setAnswer, toggleBookmark, reset } = useExamStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const orderedQuestions = useMemo(() => {
    if (!exam.shuffleQuestions || !profile) return questions;
    return seededShuffle(questions, uidToSeed(profile.uid));
  }, [questions, exam.shuffleQuestions, profile]);

  const startedAt = useMemo(() => endTime - exam.duration * 60_000, [endTime, exam.duration]);

  const submitExam = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const timeTakenMs = Math.max(0, Date.now() - startedAt);
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          answers,
          bookmarks,
          violationCount: useExamStore.getState().violationCount,
          timeTakenMs,
          startedAt,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submit failed");
      }
      const data = await res.json();
      reset();
      if (data.rank) {
        toast.success(
          `Submitted! Rank #${data.rank} of ${data.participantCount} (+${data.xpEarned ?? 0} XP)`
        );
      } else {
        toast.success("Exam submitted successfully!");
      }
      router.push(`/exam/${exam.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, exam.id, answers, bookmarks, reset, router, startedAt]);

  const onExpire = useCallback(() => {
    toast.info("Time's up! Auto-submitting...");
    submitExam();
  }, [submitExam]);

  const { requestFullscreen } = useProctoring({
    enabled: exam.proctoringEnabled !== false,
    examId: exam.id,
    sessionId,
    maxViolations: exam.maxViolations ?? 5,
    onViolation: (type, count) => {
      useExamStore.getState().incrementViolations();
      toast.warning(`Proctoring alert: ${type.replace(/_/g, " ")} (${count})`);
    },
    onForceSubmit: () => {
      toast.error("Too many violations. Submitting exam.");
      submitExam();
    },
  });

  useEffect(() => {
    if (exam.proctoringEnabled !== false) {
      requestFullscreen();
    }
  }, [exam.proctoringEnabled, requestFullscreen]);

  // Answer sync — less frequent to reduce Firestore writes
  useEffect(() => {
    const t = setInterval(() => {
      fetch("/api/exam/live-session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers, bookmarks }),
      }).catch(() => {});
    }, 45_000);
    return () => clearInterval(t);
  }, [sessionId, answers, bookmarks]);

  // Lightweight heartbeat — no answer payload
  useEffect(() => {
    const t = setInterval(() => {
      fetch("/api/exam/live-session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, heartbeat: true }),
      }).catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
  }, [sessionId]);

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / orderedQuestions.length) * 100;
  const currentQ = orderedQuestions[currentIndex];

  async function requestExtraTime() {
    await fetch("/api/exam/live-session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, timeRequested: true }),
    });
    toast.info("Time extension requested. Admin will review.");
  }

  function handleSubmitClick() {
    const unanswered = orderedQuestions.length - answeredCount;
    if (unanswered > 0) {
      toast.error(`${unanswered} question(s) unanswered.`);
      return;
    }
    submitExam();
  }

  if (!currentQ) return null;

  return (
    <div className="flex w-full max-w-5xl gap-6">
      <QuestionPalette
        questions={orderedQuestions}
        answers={answers}
        bookmarks={bookmarks}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
        onToggleBookmark={toggleBookmark}
      />

      <div className="flex-1 space-y-6">
        <Card className="relative overflow-hidden border-t-4 border-blue-500">
          <div className="absolute right-4 top-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-yellow-400"
              onClick={requestExtraTime}
            >
              <Hand className="mr-1 h-4 w-4" /> Time
            </Button>
            <ExamTimer endTime={endTime} onExpire={onExpire} />
          </div>
          <CardContent className="p-8 pr-44">
            <h2 className="text-2xl font-bold">{exam.title}</h2>
            <p className="text-sm text-muted-foreground">
              {exam.subject} · MCQ
              {exam.shuffleQuestions && (
                <span className="ml-2 text-yellow-400">
                  <Shuffle className="mr-1 inline h-3 w-3" /> Shuffled
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <h3 className="flex items-start gap-3 text-lg font-medium">
                    <span className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-sm text-blue-400">
                      Q{currentIndex + 1}
                    </span>
                    <span className="whitespace-pre-wrap">{currentQ.text}</span>
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBookmark(currentQ.id)}
                  >
                    Bookmark
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {currentQ.options.map((opt, oIndex) => {
                    const selected = answers[currentQ.id] === oIndex;
                    return (
                      <button
                        key={oIndex}
                        type="button"
                        onClick={() => setAnswer(currentQ.id, oIndex)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-all",
                          selected
                            ? "border-blue-500 bg-blue-500/30 ring-2 ring-blue-500"
                            : "border-white/10 bg-white/5 hover:border-white/30"
                        )}
                      >
                        <span className={selected ? "font-medium text-white" : "text-gray-300"}>
                          {opt}
                        </span>
                        {selected ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-400" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-gray-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentIndex >= orderedQuestions.length - 1}
            onClick={() => setCurrentIndex((i) => i + 1)}
          >
            Next
          </Button>
        </div>

        <Card className="sticky bottom-6 z-10">
          <CardContent className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
            <div className="w-full sm:w-auto">
              <p className="text-sm text-muted-foreground">
                Progress:{" "}
                <span className="font-bold text-white">
                  {answeredCount}/{orderedQuestions.length} Answered
                </span>
              </p>
              <Progress value={progress} className="mt-2 w-full sm:w-64" />
            </div>
            <Button onClick={handleSubmitClick} disabled={submitting} className="shadow-lg shadow-blue-500/30">
              <Send className="mr-2 h-4 w-4" />
              Submit Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

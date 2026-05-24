"use client";

import { useState } from "react";
import { BookOpen, Clock, RefreshCw, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJson } from "@/lib/query/fetch-json";
import type { PracticeMode } from "@/types/engagement";
import { toast } from "sonner";

interface PracticeQuestion {
  id: string;
  text: string;
  options: string[];
  imageUrl?: string;
}

export function PracticePanel() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    accuracy: number;
    xpEarned: number;
    score: number;
    maxScore: number;
  } | null>(null);
  const [startedAt, setStartedAt] = useState(0);

  async function start(mode: PracticeMode, subject?: string) {
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchJson<{
        session: { id: string };
        questions: PracticeQuestion[];
      }>("/api/student/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", mode, subject, limit: 15 }),
      });
      setSessionId(data.session.id);
      setQuestions(data.questions);
      setAnswers({});
      setCurrent(0);
      setStartedAt(Date.now());
    } catch {
      toast.error("Could not start practice session");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetchJson<{
        accuracy: number;
        xpEarned: number;
        score: number;
        maxScore: number;
      }>("/api/student/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          sessionId,
          answers,
          timeTakenMs: Date.now() - startedAt,
        }),
      });
      setResult(res);
      setSessionId(null);
      toast.success(`+${res.xpEarned} XP earned`);
    } catch {
      toast.error("Submit failed");
    } finally {
      setLoading(false);
    }
  }

  const q = questions[current];

  if (result) {
    return (
      <Card className="border-green-500/30">
        <CardContent className="p-8 text-center">
          <p className="text-3xl font-bold text-green-400">{result.accuracy}%</p>
          <p className="text-muted-foreground">
            {result.score}/{result.maxScore} correct · +{result.xpEarned} XP
          </p>
          <Button className="mt-4" onClick={() => setResult(null)}>
            Practice again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (sessionId && q) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>
              Question {current + 1}/{questions.length}
            </span>
            <Badge variant="default">{Object.keys(answers).length} answered</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-medium">{q.text}</p>
          {q.imageUrl && (
            <img
              src={q.imageUrl}
              alt="Question"
              className="max-h-48 rounded-lg object-contain"
              loading="lazy"
            />
          )}
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                  answers[q.id] === i
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
              Prev
            </Button>
            {current < questions.length - 1 ? (
              <Button className="flex-1" onClick={() => setCurrent((c) => c + 1)}>
                Next
              </Button>
            ) : (
              <Button className="flex-1" disabled={loading} onClick={submit}>
                Finish practice
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const modes: Array<{
    mode: PracticeMode;
    label: string;
    desc: string;
    icon: React.ReactNode;
    subject?: string;
  }> = [
    { mode: "daily", label: "Daily Challenge", desc: "Today's curated questions", icon: <Zap className="h-5 w-5" /> },
    { mode: "weak", label: "Weak Topics", desc: "Focus on mistakes & hard Qs", icon: <Target className="h-5 w-5" /> },
    { mode: "mistakes", label: "Mistake Review", desc: "Retry questions you missed", icon: <RefreshCw className="h-5 w-5" /> },
    { mode: "timed", label: "Timed Practice", desc: "Random mixed questions", icon: <Clock className="h-5 w-5" /> },
    { mode: "subject", label: "Subject Practice", desc: "Practice by subject", icon: <BookOpen className="h-5 w-5" />, subject: "General" },
    { mode: "adaptive", label: "Adaptive Mode", desc: "Weak-area focused practice", icon: <Target className="h-5 w-5" /> },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modes.map((m) => (
        <Card key={m.mode} className="border-white/10 transition hover:border-blue-500/30">
          <CardContent className="p-5">
            <div className="mb-3 text-blue-400">{m.icon}</div>
            <p className="font-semibold">{m.label}</p>
            <p className="mb-4 text-sm text-muted-foreground">{m.desc}</p>
            <Button
              size="sm"
              className="w-full"
              disabled={loading}
              onClick={() => start(m.mode, m.subject)}
            >
              Start
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

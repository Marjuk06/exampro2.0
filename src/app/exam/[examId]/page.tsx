"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { publicPaths } from "@/lib/firestore/public-data";
import { useAuth } from "@/components/providers/auth-provider";
import { McqExamView } from "@/components/exam/mcq-exam-view";
import { CqExamView } from "@/components/exam/cq-exam-view";
import { ExamResultView } from "@/components/exam/exam-result-view";
import { StudentHeader } from "@/components/layout/student-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useExamStore } from "@/store/exam-store";
import { getExamStatus, canStudentAccessExam } from "@/lib/exam/scoring";
import type { Exam, Question } from "@/types";
import { toast } from "sonner";
import { useClientNow } from "@/hooks/use-client-now";
import { useMounted } from "@/hooks/use-mounted";

export default function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const { profile, loading: authLoading } = useAuth();
  const [myResult, setMyResult] = useState<import("@/types").ExamResult | null>(null);
  const [resultLoading, setResultLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const { endTime, sessionId, setSession, setExamId } = useExamStore();
  const now = useClientNow();
  const mounted = useMounted();
  const searchParams = useSearchParams();
  const isRetake = searchParams.get("retake") === "true";

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb();
      const examSnap = await getDoc(doc(db, ...publicPaths.exams, examId));
      if (!examSnap.exists()) {
        setLoading(false);
        return;
      }
      setExam({ id: examSnap.id, ...examSnap.data() } as Exam);

      const qSnap = await getDocs(
        query(collection(db, ...publicPaths.questions), where("examId", "==", examId))
      );
      setQuestions(
        qSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Question)
          .sort((a, b) => a.createdAt - b.createdAt)
      );
      setLoading(false);
    }
    load();
  }, [examId]);

  useEffect(() => {
    if (!profile) {
      setResultLoading(false);
      return;
    }
    setResultLoading(true);
    fetch(`/api/student/results/${examId}`)
      .then((r) => r.json())
      .then((d) => setMyResult(d.result ?? null))
      .catch(() => setMyResult(null))
      .finally(() => setResultLoading(false));
  }, [profile, examId]);

  const hasOverride = Boolean(
    exam && profile && exam.approvedUsers?.includes(profile.uid)
  );
  const status = useMemo(() => {
    if (!exam || now === null) return null;
    return getExamStatus(exam, now, hasOverride);
  }, [exam, now, hasOverride]);

  useEffect(() => {
    if (status === "upcoming") {
      toast.error("Exam hasn't started yet");
    }
  }, [status]);

  useEffect(() => {
    if (!exam || !profile || (myResult && !isRetake)) return;

    async function startSession() {
      const res = await fetch("/api/exam/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam!.id,
          examTitle: exam!.title,
          duration: exam!.duration,
          studentName: profile!.name,
          studentId: profile!.studentId,
          isRetake,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.sessionId, data.endTime);
        setExamId(examId);
        setSessionReady(true);
      }
    }

    startSession();

    return () => {
      fetch(`/api/exam/live-session?examId=${examId}`, { method: "DELETE" }).catch(
        () => {}
      );
    };
  }, [exam, profile, myResult, examId, setSession, setExamId]);

  if (authLoading || loading || resultLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Link href="/auth/login">
          <Button>Sign in to continue</Button>
        </Link>
      </div>
    );
  }

  if (!exam) {
    return (
      <>
        <StudentHeader />
        <div className="mx-auto max-w-2xl px-4 pt-20 sm:pt-24">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-red-400">Exam Not Found</h2>
              <Link href="/student">
                <Button className="mt-4">Return Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!canStudentAccessExam(exam, profile.studentId, profile.uid)) {
    return (
      <>
        <StudentHeader />
        <div className="mx-auto max-w-2xl px-4 pt-20 sm:pt-24">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-red-400">Access Denied</h2>
              <p className="text-muted-foreground">Your ID is not permitted.</p>
              <Link href="/student">
                <Button className="mt-4">Return Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (myResult && !isRetake) {
    return (
      <>
        <StudentHeader />
        <div className="mx-auto max-w-5xl px-4 pt-20 sm:pt-24">
          <ExamResultView exam={exam} result={myResult} questions={questions} />
        </div>
      </>
    );
  }

  if (!mounted || now === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status === "upcoming") {
    return (
      <>
        <StudentHeader />
        <div className="mx-auto max-w-2xl px-4 pt-20 sm:pt-24 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-yellow-400">Exam Not Started</h2>
              <Link href="/student">
                <Button className="mt-4">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (status === "expired") {
    return (
      <>
        <StudentHeader />
        <div className="mx-auto max-w-2xl px-4 pt-20 sm:pt-24 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-red-400">Exam Expired</h2>
              <Link href="/student">
                <Button className="mt-4">Request Access</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!questions.length) {
    return (
      <>
        <StudentHeader />
        <div className="mx-auto max-w-2xl px-4 pt-20 sm:pt-24 text-center">
          <Card>
            <CardContent className="p-12">
              <h2 className="text-2xl font-bold">No questions yet</h2>
              <Link href="/student">
                <Button className="mt-4">Go Back</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!sessionReady || !endTime || !sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <StudentHeader />
      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-12 pt-20 sm:pt-24">
        {exam.examType === "cq" ? (
          <CqExamView
            exam={exam}
            questions={questions}
            endTime={endTime}
            sessionId={sessionId}
          />
        ) : (
          <McqExamView
            exam={exam}
            questions={questions}
            endTime={endTime}
            sessionId={sessionId}
          />
        )}
      </div>
    </>
  );
}

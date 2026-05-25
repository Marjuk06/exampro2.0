import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { ResultPageClient } from "./result-page-client";
import type { Exam, ExamResult, Question } from "@/types";

interface Props {
  params: Promise<{ examId: string; resultId: string }>;
}

export default async function ResultPage({ params }: Props) {
  const { examId, resultId } = await params;

  // ── 1. Auth check ──────────────────────────────────────────────────────
  const session = await getServerSession();
  if (!session) {
    redirect(`/auth/login?redirect=/exam/${examId}/result/${resultId}`);
  }
  const { uid, role } = session;

  // ── 2. Fetch result ─────────────────────────────────────────────────────
  const db = getAdminDb();
  const resultSnap = await db.doc(paths.result(resultId)).get();

  if (!resultSnap.exists) {
    return (
      <ResultPageClient
        error="Result not found. It may have been deleted or the link is incorrect."
        examId={examId}
      />
    );
  }

  const result = { id: resultSnap.id, ...resultSnap.data() } as ExamResult;

  // ── 3. Validate examId match & ownership ────────────────────────────────
  if (result.examId !== examId) {
    return (
      <ResultPageClient
        error="Result does not belong to this exam."
        examId={examId}
      />
    );
  }

  const isOwner = result.uid === uid;
  const isAdmin = role === "admin" || role === "superadmin";
  if (!isOwner && !isAdmin) {
    return (
      <ResultPageClient
        error="You do not have permission to view this result."
        examId={examId}
      />
    );
  }

  // ── 4. Fetch exam ───────────────────────────────────────────────────────
  const examSnap = await db.doc(paths.exam(examId)).get();
  if (!examSnap.exists) {
    return (
      <ResultPageClient
        error="Exam not found."
        examId={examId}
      />
    );
  }
  const exam = { id: examSnap.id, ...examSnap.data() } as Exam;

  // ── 5. Fetch questions ──────────────────────────────────────────────────
  const qSnap = await db
    .collection(paths.questions())
    .where("examId", "==", examId)
    .get();
  const questions = qSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Question)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  console.log("[result-page] loaded", {
    examId,
    resultId,
    uid,
    resultUid: result.uid,
    questionCount: questions.length,
  });

  return (
    <ResultPageClient
      exam={exam}
      result={result}
      questions={questions}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { examId } = await params;
  return {
    title: "Exam Result — MCQPro",
    description: `View your exam result for ${examId}`,
  };
}

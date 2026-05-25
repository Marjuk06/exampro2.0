import type { Exam, ExamResult, ExamType, Question, RetakeRequest } from "@/types";

const EXAM_TYPES: readonly ExamType[] = ["mcq", "cq", "mixed"];

export type NormalizedExamType = ExamType | "unknown";

/** Coerce Firestore / legacy values to a known exam type. */
export function normalizeExamType(value: unknown): NormalizedExamType {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (EXAM_TYPES.includes(lower as ExamType)) {
      return lower as ExamType;
    }
  }
  return "unknown";
}

/** Safe display label for badges and tables. */
export function formatExamTypeLabel(value: unknown): string {
  return normalizeExamType(value).toUpperCase();
}

export function isCqExamType(value: unknown): boolean {
  return normalizeExamType(value) === "cq";
}

export function isMcqExamType(value: unknown): boolean {
  const t = normalizeExamType(value);
  return t === "mcq" || t === "mixed";
}

export function isPendingCqScore(score: unknown): boolean {
  return score === "Pending" || score === "pending";
}

export function normalizeStudentProfile(
  raw?: Partial<ExamResult["studentProfile"]> | null
): NonNullable<ExamResult["studentProfile"]> {
  return {
    uid: typeof raw?.uid === "string" ? raw.uid : "",
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : "Unknown",
    studentId:
      typeof raw?.studentId === "string" && raw.studentId.trim()
        ? raw.studentId.trim()
        : "—",
  };
}

export function formatResultScore(score: ExamResult["score"] | unknown): string {
  if (score === undefined || score === null) return "—";
  if (typeof score === "number" && !Number.isNaN(score)) return String(score);
  if (typeof score === "string" && score.trim()) return score.trim();
  return "—";
}

export function getSubmittedAtMs(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value) && value > 0) {
    return value;
  }
  return Date.now();
}

/** Normalize a raw Firestore result document for safe UI access. */
export function normalizeExamResult(
  raw: Record<string, unknown> & { id: string }
): ExamResult {
  const examType = normalizeExamType(raw.examType);
  const scoreRaw = raw.score;

  let score: ExamResult["score"];
  if (typeof scoreRaw === "number" && !Number.isNaN(scoreRaw)) {
    score = scoreRaw;
  } else if (typeof scoreRaw === "string") {
    score = scoreRaw;
  } else if (examType === "cq") {
    score = "Pending";
  } else {
    score = 0;
  }

  return {
    id: raw.id,
    uid: typeof raw.uid === "string" ? raw.uid : "",
    examId: typeof raw.examId === "string" ? raw.examId : "",
    examType: examType === "unknown" ? "mcq" : examType,
    studentProfile: normalizeStudentProfile(
      raw.studentProfile as Partial<ExamResult["studentProfile"]>
    ),
    answers:
      raw.answers && typeof raw.answers === "object"
        ? (raw.answers as Record<string, number>)
        : undefined,
    bookmarks: Array.isArray(raw.bookmarks)
      ? (raw.bookmarks as string[])
      : undefined,
    score,
    percentage:
      typeof raw.percentage === "number" ? raw.percentage : undefined,
    cqImageUrls: Array.isArray(raw.cqImageUrls)
      ? (raw.cqImageUrls as string[])
      : Array.isArray(raw.cqImages)
        ? (raw.cqImages as string[])
        : undefined,
    feedback: typeof raw.feedback === "string" ? raw.feedback : undefined,
    violationCount:
      typeof raw.violationCount === "number" ? raw.violationCount : undefined,
    submittedAt: getSubmittedAtMs(raw.submittedAt),
    gradedAt: typeof raw.gradedAt === "number" ? raw.gradedAt : undefined,
    gradedBy: typeof raw.gradedBy === "string" ? raw.gradedBy : undefined,
  };
}

export function normalizeExam(raw: Record<string, unknown> & { id: string }): Exam {
  return {
    ...(raw as unknown as Exam),
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "Untitled Exam",
    subject: typeof raw.subject === "string" ? raw.subject : "—",
    examType:
      normalizeExamType(raw.examType) === "unknown"
        ? "mcq"
        : (normalizeExamType(raw.examType) as ExamType),
    duration: typeof raw.duration === "number" ? raw.duration : 10,
    allowedStudents: Array.isArray(raw.allowedStudents)
      ? (raw.allowedStudents as string[])
      : [],
    approvedUsers: Array.isArray(raw.approvedUsers)
      ? (raw.approvedUsers as string[])
      : [],
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0,
  };
}

export function filterMcqResults(results: ExamResult[]): ExamResult[] {
  return results.filter(
    (r) => isMcqExamType(r.examType) && typeof r.score === "number"
  );
}

export function filterCqResults(results: ExamResult[]): ExamResult[] {
  return results.filter((r) => isCqExamType(r.examType));
}

export function filterPendingCqResults(results: ExamResult[]): ExamResult[] {
  return results.filter(
    (r) => isCqExamType(r.examType) && isPendingCqScore(r.score)
  );
}

export function getExamTitle(
  exams: Pick<Exam, "id" | "title">[],
  examId: string | undefined
): string {
  if (!examId) return "Unknown Exam";
  return exams.find((e) => e.id === examId)?.title ?? "Unknown Exam";
}

export function questionCountForExam(
  questions: Pick<Question, "examId">[],
  examId: string | undefined
): number {
  if (!examId) return 0;
  return questions.filter((q) => q?.examId === examId).length;
}

export function normalizeRetakeRequest(
  raw: Record<string, unknown> & { id: string }
): RetakeRequest {
  return {
    id: raw.id,
    uid: typeof raw.uid === "string" ? raw.uid : "",
    studentName:
      typeof raw.studentName === "string" ? raw.studentName : "Unknown",
    studentId: typeof raw.studentId === "string" ? raw.studentId : "—",
    examId: typeof raw.examId === "string" ? raw.examId : "",
    examTitle: typeof raw.examTitle === "string" ? raw.examTitle : "Unknown Exam",
    timestamp: getSubmittedAtMs(raw.timestamp),
    status: (typeof raw.status === "string" ? raw.status : "pending") as RetakeRequest["status"],
  };
}

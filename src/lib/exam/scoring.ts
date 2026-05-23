import type { Exam, Question } from "@/types";

export function calculateMcqScore(
  questions: Question[],
  answers: Record<string, number>,
  negativeMarking = 0
): { score: number; maxScore: number; breakdown: Record<string, boolean> } {
  let score = 0;
  const breakdown: Record<string, boolean> = {};
  let maxScore = 0;

  for (const q of questions) {
    const points = q.points ?? 1;
    maxScore += points;
    const studentAnswer = answers[q.id];
    const correct = studentAnswer === q.correctIndex;
    breakdown[q.id] = correct;

    if (correct) {
      score += points;
    } else if (studentAnswer !== undefined && negativeMarking > 0) {
      score -= points * negativeMarking;
    }
  }

  return { score: Math.max(0, score), maxScore, breakdown };
}

export function getExamStatus(
  exam: Exam,
  now = Date.now(),
  hasOverride = false
): "upcoming" | "active" | "expired" {
  if (exam.isUnlimited) return "active";
  if (exam.startTime && now < exam.startTime) return "upcoming";
  if (!hasOverride && exam.endTime && now > exam.endTime) return "expired";
  return "active";
}

export function canStudentAccessExam(
  exam: Exam,
  studentId: string,
  uid: string
): boolean {
  if (exam.allowedStudents?.length) {
    return exam.allowedStudents.includes(studentId);
  }
  if (exam.approvedUsers?.includes(uid)) return true;
  return true;
}

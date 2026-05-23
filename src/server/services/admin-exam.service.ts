import { examFormSchema } from "@/lib/validations/exam";
import { examRepository } from "@/server/repositories/exam.repository";
import type { z } from "zod";

export function buildExamPayload(data: z.infer<typeof examFormSchema>) {
  return {
    title: data.title,
    subject: data.subject,
    examType: data.examType,
    duration: data.duration,
    isUnlimited: data.isUnlimited,
    startTime: data.startTime ? new Date(data.startTime).getTime() : null,
    endTime: data.endTime ? new Date(data.endTime).getTime() : null,
    isHidden: data.isHidden,
    shuffleQuestions: data.shuffleQuestions,
    shuffleOptions: data.shuffleOptions ?? false,
    allowedStudents: data.allowedStudents
      ? data.allowedStudents.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    negativeMarking: data.negativeMarking,
    proctoringEnabled: data.proctoringEnabled,
    maxViolations: data.maxViolations,
    tags: data.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [],
    difficulty: data.difficulty ?? "medium",
  };
}

export const adminExamService = {
  async create(data: z.infer<typeof examFormSchema>) {
    const payload = buildExamPayload(data);
    return examRepository.create({
      ...payload,
      approvedUsers: [],
      isResultPublished: false,
      isAnswerRevealed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Parameters<typeof examRepository.create>[0]);
  },

  async update(id: string, data: z.infer<typeof examFormSchema>) {
    const payload = buildExamPayload(data);
    await examRepository.update(id, payload);
  },

  async patchField(id: string, field: string, value: boolean) {
    await examRepository.update(id, { [field]: value } as Record<string, boolean>);
  },

  async delete(id: string) {
    await examRepository.delete(id);
  },
};

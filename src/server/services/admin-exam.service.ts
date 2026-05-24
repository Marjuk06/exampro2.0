import { examFormSchema } from "@/lib/validations/exam";
import { examRepository } from "@/server/repositories/exam.repository";
import { recordActivity } from "@/server/services/engagement/activity.service";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
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
    const id = await examRepository.create({
      ...payload,
      approvedUsers: [],
      isResultPublished: false,
      isAnswerRevealed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Parameters<typeof examRepository.create>[0]);
    
    if (!payload.isHidden) {
      await recordActivity(getAdminDb(), {
        uid: "system",
        name: "System",
        studentId: "system",
        type: "challenge",
        title: "New Exam Available!",
        message: `The exam "${payload.title}" is now open.`,
        actionLink: `/exam/${id}`,
      });
    }
    return id;
  },

  async update(id: string, data: z.infer<typeof examFormSchema>) {
    const payload = buildExamPayload(data);
    await examRepository.update(id, payload);
  },

  async patchField(id: string, field: string, value: boolean) {
    await examRepository.update(id, { [field]: value } as Record<string, boolean>);
    
    if (field === "isResultPublished" && value === true) {
      const examSnap = await getAdminDb().doc(paths.exam(id)).get();
      if (examSnap.exists) {
        await recordActivity(getAdminDb(), {
          uid: "system",
          name: "System",
          studentId: "system",
          type: "achievement",
          title: "Results Published!",
          message: `Results for "${examSnap.data()?.title}" are out now. Check the leaderboard!`,
          actionLink: `/exam/${id}`,
        });
      }
    }
  },

  async delete(id: string) {
    await examRepository.delete(id);
  },
};

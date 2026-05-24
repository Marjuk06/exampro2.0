import { questionRepository } from "@/server/repositories/question.repository";
import { examStatsRepository } from "@/server/repositories/exam-stats.repository";

export const adminQuestionService = {
  async create(input: {
    examId: string;
    text: string;
    options: string[];
    correctIndex: number;
    points?: number;
    difficulty?: string;
    imageUrl?: string;
    explanation?: string;
  }) {
    const id = await questionRepository.create({
      examId: input.examId,
      text: input.text,
      options: input.options,
      correctIndex: input.correctIndex,
      points: input.points ?? 1,
      difficulty: input.difficulty as "easy" | "medium" | "hard" | undefined,
      imageUrl: input.imageUrl,
      explanation: input.explanation,
      createdAt: Date.now(),
    });
    await examStatsRepository.adjustQuestionCount(input.examId, 1);
    return id;
  },

  async bulkCreate(
    examId: string,
    items: Array<{
      text: string;
      options: string[];
      correctIndex: number;
      points?: number;
    }>
  ) {
    const ids: string[] = [];
    for (const item of items) {
      const id = await this.create({
        examId,
        text: item.text,
        options: item.options,
        correctIndex: item.correctIndex,
        points: item.points,
      });
      ids.push(id);
    }
    return ids;
  },

  async delete(id: string) {
    const q = await questionRepository.getById(id);
    await questionRepository.delete(id);
    if (q?.examId) {
      await examStatsRepository.adjustQuestionCount(q.examId, -1);
    }
  },

  async bulkDelete(items: Array<{ id: string; examId: string }>) {
    if (!items.length) return;
    const ids = items.map((i) => i.id);
    await questionRepository.bulkDelete(ids);

    const examCounts: Record<string, number> = {};
    for (const item of items) {
      if (item.examId) {
        examCounts[item.examId] = (examCounts[item.examId] || 0) + 1;
      }
    }

    for (const [examId, count] of Object.entries(examCounts)) {
      await examStatsRepository.adjustQuestionCount(examId, -count);
    }
  },
};

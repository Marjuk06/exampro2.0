import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ExamStoreState {
  examId: string | null;
  answers: Record<string, number>;
  bookmarks: string[];
  violationCount: number;
  sessionId: string | null;
  endTime: number | null;
  setExamId: (id: string | null) => void;
  setAnswer: (questionId: string, optionIndex: number) => void;
  toggleBookmark: (questionId: string) => void;
  incrementViolations: () => number;
  setSession: (sessionId: string, endTime: number) => void;
  reset: () => void;
}

const initial = {
  examId: null,
  answers: {},
  bookmarks: [],
  violationCount: 0,
  sessionId: null,
  endTime: null,
};

export const useExamStore = create<ExamStoreState>()(
  persist(
    (set, get) => ({
      ...initial,
      setExamId: (examId) => set({ examId }),
      setAnswer: (questionId, optionIndex) =>
        set((s) => ({
          answers: { ...s.answers, [questionId]: optionIndex },
        })),
      toggleBookmark: (questionId) =>
        set((s) => {
          const bookmarks = s.bookmarks.includes(questionId)
            ? s.bookmarks.filter((b) => b !== questionId)
            : [...s.bookmarks, questionId];
          return { bookmarks };
        }),
      incrementViolations: () => {
        const next = get().violationCount + 1;
        set({ violationCount: next });
        return next;
      },
      setSession: (sessionId, endTime) => set({ sessionId, endTime }),
      reset: () => set(initial),
    }),
    { name: "mcqpro-exam-session", partialize: (s) => ({
      examId: s.examId,
      answers: s.answers,
      bookmarks: s.bookmarks,
      violationCount: s.violationCount,
      sessionId: s.sessionId,
      endTime: s.endTime,
    }) }
  )
);

"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

interface QuestionPaletteProps {
  questions: Question[];
  answers: Record<string, number>;
  bookmarks: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onToggleBookmark: (questionId: string) => void;
}

export function QuestionPalette({
  questions,
  answers,
  bookmarks,
  currentIndex,
  onSelect,
}: QuestionPaletteProps) {
  return (
    <div className="glass-panel hidden w-48 shrink-0 rounded-2xl p-4 lg:block">
      <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
        Question Palette
      </p>
      <div className="grid grid-cols-4 gap-2">
        {questions.map((q, i) => {
          const answered = answers[q.id] !== undefined;
          const bookmarked = bookmarks.includes(q.id);
          return (
            <div key={q.id} className="relative">
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-all",
                  currentIndex === i && "ring-2 ring-blue-500",
                  answered ? "bg-blue-500/40 text-white" : "bg-white/5 text-gray-400",
                  "hover:bg-white/10"
                )}
              >
                {i + 1}
              </button>
              {bookmarked && (
                <Bookmark className="absolute -right-1 -top-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

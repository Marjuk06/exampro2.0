"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exam, ExamResult, Question } from "@/types";

interface ResultPdfButtonProps {
  exam: Exam;
  result: ExamResult;
  questions: Question[];
}

/** Opens a print-friendly window for PDF save via browser */
export function ResultPdfButton({ exam, result, questions }: ResultPdfButtonProps) {
  function handlePrint() {
    const score = Number(result.score);
    const pct = result.percentage ?? 0;
    const html = `
<!DOCTYPE html>
<html><head><title>${exam.title} — Result</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
  h1 { color: #1e40af; }
  .meta { margin: 16px 0; }
  .q { margin: 12px 0; padding: 8px; border: 1px solid #ddd; border-radius: 8px; }
  .correct { background: #ecfdf5; }
  .wrong { background: #fef2f2; }
</style></head><body>
  <h1>${exam.title}</h1>
  <div class="meta">
    <p><strong>Student:</strong> ${result.studentProfile?.name ?? "—"} (${result.studentProfile?.studentId ?? "—"})</p>
    <p><strong>Score:</strong> ${score}/${questions.length} (${pct}%)</p>
    ${result.rank ? `<p><strong>Rank:</strong> #${result.rank} (Top ${result.percentile}%)</p>` : ""}
    <p><strong>Date:</strong> ${new Date(result.submittedAt).toLocaleString()}</p>
  </div>
  <h2>Answer Review</h2>
  ${questions
    .map((q, i) => {
      const ans = result.answers?.[q.id];
      const ok = ans === q.correctIndex;
      const cls = ans === undefined ? "" : ok ? "correct" : "wrong";
      return `<div class="q ${cls}"><p><strong>Q${i + 1}.</strong> ${q.text}</p>
        <p>Your answer: ${ans !== undefined ? q.options[ans] : "Skipped"}</p>
        <p>Correct: ${q.options[q.correctIndex]}</p>
        ${q.explanation ? `<p><em>${q.explanation}</em></p>` : ""}
      </div>`;
    })
    .join("")}
  <p style="margin-top:40px;font-size:12px;color:#666;">MCQ Pro 2.0 — Official Result Sheet</p>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
      <Download className="h-4 w-4" />
      Download PDF
    </Button>
  );
}

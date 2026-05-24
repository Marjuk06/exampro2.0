"use client";

import { useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exam, ExamResult, Question } from "@/types";
import { ResultPdfTemplate } from "@/components/exam/result-pdf-template";
import { useReactToPrint } from "react-to-print";

interface ResultPdfButtonProps {
  exam: Exam;
  result: ExamResult;
  questions: Question[];
}

export function ResultPdfButton({ exam, result, questions }: ResultPdfButtonProps) {
  const pdfRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: pdfRef,
    documentTitle: `${exam.title.replace(/[^a-zA-Z0-9]/g, "_")}_AnswerSheet`,
  });

  return (
    <>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handlePrint()} 
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download Answer Sheet
        </Button>
      </div>

      {/* Hidden PDF Template rendered to DOM but only visible during print via CSS */}
      <div className="hidden">
        <ResultPdfTemplate ref={pdfRef} exam={exam} result={result} questions={questions} />
      </div>
    </>
  );
}

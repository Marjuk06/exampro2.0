"use client";

import { useRef, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Exam, ExamResult, Question } from "@/types";
import { ResultPdfTemplate } from "@/components/exam/result-pdf-template";
import { useReactToPrint } from "react-to-print";
import { usePublicSettings } from "@/hooks/queries/use-public-settings";

interface ResultPdfButtonProps {
  exam: Exam;
  result: ExamResult;
  questions: Question[];
}

export function ResultPdfButton({ exam, result, questions }: ResultPdfButtonProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { settings } = usePublicSettings();

  const handlePrint = useReactToPrint({
    contentRef: pdfRef,
    documentTitle: `${exam.title.replace(/[^a-zA-Z0-9]/g, "_")}_MCQPro_AnswerSheet`,
    onAfterPrint: () => {
      setIsOpen(false);
      setIsGenerating(false);
    },
    onPrintError: () => setIsGenerating(false),
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    // Allow state to update and render spinner before freezing the main thread for PDF gen
    setTimeout(() => {
      handlePrint();
      // If print dialog is canceled in some browsers, onAfterPrint might not fire reliably immediately.
      // But we will rely on it, or just clear it.
      setTimeout(() => setIsGenerating(false), 2000);
    }, 100);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download Answer Sheet
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download Answer Sheet</DialogTitle>
            <DialogDescription>Select a theme for your PDF report.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Light Theme Option */}
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "group relative flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all",
                theme === "light" ? "border-blue-500 bg-blue-500/5" : "border-muted hover:border-muted-foreground"
              )}
            >
              <div className="flex h-32 w-24 flex-col gap-2 rounded bg-white p-2 shadow-sm ring-1 ring-gray-200">
                <div className="h-2 w-1/2 rounded bg-blue-600" />
                <div className="h-1 w-3/4 rounded bg-gray-300" />
                <div className="mt-2 h-6 w-full rounded border border-gray-200 bg-gray-50" />
                <div className="h-6 w-full rounded border border-green-200 bg-green-50" />
              </div>
              <span className="font-medium text-foreground">Light Theme</span>
            </button>

            {/* Dark Theme Option */}
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "group relative flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all",
                theme === "dark" ? "border-blue-500 bg-blue-500/5" : "border-muted hover:border-muted-foreground"
              )}
            >
              {settings.betaMode && (
                <div className="absolute -top-3 right-4 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white shadow-sm border border-blue-400">
                  BETA
                </div>
              )}
              <div className="flex h-32 w-24 flex-col gap-2 rounded bg-slate-900 p-2 shadow-sm ring-1 ring-slate-800">
                <div className="h-2 w-1/2 rounded bg-blue-400" />
                <div className="h-1 w-3/4 rounded bg-slate-600" />
                <div className="mt-2 h-6 w-full rounded border border-slate-700 bg-slate-800" />
                <div className="h-6 w-full rounded border border-green-800 bg-green-900/50" />
              </div>
              <span className="font-medium text-foreground">Dark Theme</span>
            </button>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {isGenerating ? "Generating..." : "Generate PDF"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Hidden PDF Template rendered to DOM but only visible during print via CSS */}
      <div className="hidden">
        <ResultPdfTemplate ref={pdfRef} exam={exam} result={result} questions={questions} theme={theme} />
      </div>
    </>
  );
}

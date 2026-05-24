"use client";

import { useState, useRef } from "react";
import { Download, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exam, ExamResult, Question } from "@/types";
import { ResultPdfTemplate } from "@/components/exam/result-pdf-template";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface ResultPdfButtonProps {
  exam: Exam;
  result: ExamResult;
  questions: Question[];
}

export function ResultPdfButton({ exam, result, questions }: ResultPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressStep, setProgressStep] = useState(0); // 0: none, 1: loading, 2: success
  const pdfRef = useRef<HTMLDivElement>(null);

  async function handleDownloadPdf() {
    if (isGenerating || !pdfRef.current) return;
    setIsGenerating(true);
    setProgressStep(1);
    setProgressText("Preparing document layout...");

    try {
      // Dynamic import to prevent SSR issues and keep initial bundle small
      const [html2canvas, jsPDF] = await Promise.all([
        import("html2canvas").then((m) => m.default),
        import("jspdf").then((m) => m.jsPDF),
      ]);

      setProgressText("Rendering high-quality graphics...");
      
      // Wait for font rendering just in case
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      setProgressText("Finalizing PDF export...");

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [794, 1123], // A4 size in pixels at 96 DPI
      });

      // Calculate pages
      const pdfWidth = 794;
      const pdfHeight = 1123;
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if the content overflows A4 height
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${exam.title.replace(/[^a-zA-Z0-9]/g, "_")}_Result.pdf`);
      
      setProgressStep(2);
      setProgressText("Download Complete!");
      setTimeout(() => {
        setIsGenerating(false);
        setProgressStep(0);
      }, 2000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setProgressText("Error generating PDF.");
      setTimeout(() => {
        setIsGenerating(false);
        setProgressStep(0);
      }, 3000);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGenerating} className="gap-2">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Detailed PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={handlePrint}>
          Print
        </Button>
      </div>

      {/* Hidden PDF Template rendered to DOM for html2canvas */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <ResultPdfTemplate ref={pdfRef} exam={exam} result={result} questions={questions} />
      </div>

      <Dialog open={isGenerating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden text-center p-8">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Generating Report</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            {progressStep === 1 ? (
              <div className="relative flex h-16 w-16 items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
                <FileText className="absolute h-6 w-6 text-blue-500" />
              </div>
            ) : progressStep === 2 ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </motion.div>
            ) : null}
            <p className="text-lg font-medium text-muted-foreground animate-pulse">
              {progressText}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

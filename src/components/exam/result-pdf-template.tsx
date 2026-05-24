import React, { forwardRef } from "react";
import type { Exam, ExamResult, Question } from "@/types";
import { formatResultScore, isCqExamType, getSubmittedAtMs } from "@/lib/firestore/normalize";

interface ResultPdfTemplateProps {
  exam: Exam;
  result: ExamResult;
  questions: Question[];
}

export const ResultPdfTemplate = forwardRef<HTMLDivElement, ResultPdfTemplateProps>(
  ({ exam, result, questions }, ref) => {
    const isCq = isCqExamType(exam.examType);
    const scoreText = formatResultScore(result.score);
    const pct = result.percentage ?? 0;
    const submittedAt = getSubmittedAtMs(result.submittedAt);
    const timeSpent = result.timeTakenMs ? Math.round(result.timeTakenMs / 1000) : 0;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    return (
      <div
        ref={ref}
        style={{
          width: "210mm",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "20mm 15mm",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <style>
          {`
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0;
                background: #ffffff;
              }
              .no-break {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          `}
        </style>

        {/* Header Section */}
        <div style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "15px", marginBottom: "25px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, color: "#1e3a8a", lineHeight: 1.2 }}>{exam.title}</h1>
            <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px", margin: 0 }}>Official Exam Result & Performance Report</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#111827", letterSpacing: "-0.5px" }}>MCQ Pro</div>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>Exam Center Hub</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "40px" }}>
          {/* Student Info */}
          <div style={{ padding: "16px", borderRadius: "8px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Candidate Information</h3>
            <p style={{ margin: "4px 0", fontSize: "20px", fontWeight: "bold", color: "#111827" }}>{result.studentProfile?.name || "Unknown Student"}</p>
            <p style={{ margin: "4px 0", fontSize: "14px", color: "#4b5563" }}>ID: {result.studentProfile?.studentId || "—"}</p>
            <p style={{ margin: "4px 0", fontSize: "14px", color: "#4b5563" }}>Date: {new Date(submittedAt).toLocaleString()}</p>
          </div>

          {/* Performance Info */}
          <div style={{ padding: "16px", borderRadius: "8px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Performance Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Final Score</p>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: "bold", color: "#1e40af" }}>{scoreText}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Accuracy</p>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: "bold", color: "#1e40af" }}>{pct}%</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Time Spent</p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#1e3a8a" }}>{minutes}m {seconds}s</p>
              </div>
              {result.rank && (
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Rank</p>
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#1e3a8a" }}>#{result.rank}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Questions Detail */}
        <h2 style={{ fontSize: "20px", borderBottom: "2px solid #e5e7eb", paddingBottom: "8px", marginBottom: "20px", color: "#111827" }}>
          Answer Sheet & Detailed Review
        </h2>

        <div style={{ display: "block" }}>
          {questions.map((q, i) => {
            const studentAns = result.answers?.[q.id];
            
            if (isCq) {
              const ansObj = typeof studentAns === "object" ? (studentAns as { mark?: number | string; comment?: string }) : null;
              const mark = ansObj?.mark ?? null;
              const comment = ansObj?.comment ?? null;
              return (
                <div key={q.id} className="no-break" style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#ffffff", marginBottom: "20px", pageBreakInside: "avoid" }}>
                  <p style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "600", color: "#111827", lineHeight: 1.5 }}>
                    <span style={{ color: "#3b82f6", marginRight: "6px" }}>Q{i + 1}.</span> {q.text}
                  </p>
                  <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "6px", border: "1px solid #f3f4f6" }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: "#374151" }}>Marks Awarded: {mark ?? "Pending"}</p>
                    {comment && <p style={{ margin: "8px 0 0 0", fontSize: "14px", fontStyle: "italic", color: "#6b7280" }}>Evaluator Comment: {comment}</p>}
                  </div>
                </div>
              );
            }

            // MCQ Logic
            const isCorrect = studentAns === q.correctIndex;
            const isSkipped = studentAns === undefined;
            const statusColor = isCorrect ? "#059669" : isSkipped ? "#6b7280" : "#dc2626";
            const statusText = isCorrect ? "Correct" : isSkipped ? "Skipped" : "Incorrect";
            const statusBg = isCorrect ? "#ecfdf5" : isSkipped ? "#f3f4f6" : "#fef2f2";
            const statusBorder = isCorrect ? "#a7f3d0" : isSkipped ? "#e5e7eb" : "#fecaca";

            return (
              <div key={q.id} className="no-break" style={{ padding: "16px", border: `1px solid ${statusBorder}`, backgroundColor: statusBg, borderRadius: "8px", marginBottom: "20px", pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#111827", flex: 1, lineHeight: 1.5 }}>
                    <span style={{ color: "#3b82f6", marginRight: "6px" }}>Q{i + 1}.</span> {q.text}
                  </p>
                  <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", backgroundColor: statusColor, color: "#fff", whiteSpace: "nowrap" }}>
                    {statusText}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px", marginTop: "12px" }}>
                  {q.options?.map((opt, optIdx) => {
                    const isStudentChoice = studentAns === optIdx;
                    const isActualCorrect = q.correctIndex === optIdx;
                    
                    const optStyle = { 
                      padding: "10px 12px", 
                      borderRadius: "6px", 
                      border: "1px solid #e5e7eb", 
                      backgroundColor: "#ffffff", 
                      fontSize: "14px",
                      color: "#374151",
                      display: "flex",
                      alignItems: "center"
                    };
                    
                    if (isActualCorrect) {
                      optStyle.border = "1px solid #059669";
                      optStyle.backgroundColor = "#d1fae5";
                      optStyle.color = "#064e3b";
                    } else if (isStudentChoice && !isActualCorrect) {
                      optStyle.border = "1px solid #dc2626";
                      optStyle.backgroundColor = "#fee2e2";
                      optStyle.color = "#7f1d1d";
                    }

                    return (
                      <div key={optIdx} style={optStyle}>
                        <strong style={{ marginRight: "10px", color: isActualCorrect ? "#059669" : isStudentChoice ? "#dc2626" : "#6b7280" }}>{String.fromCharCode(65 + optIdx)}.</strong> 
                        <span style={{ flex: 1 }}>{opt}</span>
                        {isStudentChoice && <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "bold", color: isActualCorrect ? "#059669" : "#dc2626" }}>{isActualCorrect ? "✓ Your Answer" : "✗ Your Answer"}</span>}
                        {isActualCorrect && !isStudentChoice && <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "bold", color: "#059669" }}>✓ Correct Answer</span>}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: "6px", fontSize: "13px", color: "#4b5563", border: "1px dashed #d1d5db" }}>
                    <strong style={{ color: "#374151" }}>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>
          Generated by MCQ Pro Online Exam Center • {new Date().toLocaleDateString()}
        </div>
      </div>
    );
  }
);
ResultPdfTemplate.displayName = "ResultPdfTemplate";

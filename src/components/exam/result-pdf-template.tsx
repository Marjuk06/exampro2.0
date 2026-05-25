import React, { forwardRef } from "react";
import type { Exam, ExamResult, Question } from "@/types";
import { formatResultScore, isCqExamType, getSubmittedAtMs } from "@/lib/firestore/normalize";

interface ResultPdfTemplateProps {
  exam: Exam;
  result: ExamResult;
  questions: Question[];
  theme?: "light" | "dark";
}

export const ResultPdfTemplate = forwardRef<HTMLDivElement, ResultPdfTemplateProps>(
  ({ exam, result, questions, theme = "light" }, ref) => {
    const isCq = isCqExamType(exam.examType);
    const scoreText = formatResultScore(result.score);
    const pct = result.percentage ?? 0;
    const submittedAt = getSubmittedAtMs(result.submittedAt);
    const timeSpent = result.timeTakenMs ? Math.round(result.timeTakenMs / 1000) : 0;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    const isDark = theme === "dark";
    const bgPrimary = isDark ? "#0f172a" : "#ffffff";
    const bgSecondary = isDark ? "#1e293b" : "#f9fafb";
    const textPrimary = isDark ? "#f8fafc" : "#000000";
    const textSecondary = isDark ? "#cbd5e1" : "#4b5563";
    const textMuted = isDark ? "#94a3b8" : "#6b7280";
    const borderPrimary = isDark ? "#334155" : "#e5e7eb";
    const accentPrimary = isDark ? "#60a5fa" : "#1e3a8a";

    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          maxWidth: "186mm",
          backgroundColor: bgPrimary,
          color: textPrimary,
          fontFamily: "Inter, system-ui, sans-serif",
          margin: "0 auto",
          boxSizing: "border-box"
        }}
      >
        <style>
          {`
            @media print {
              @page {
                size: A4 portrait;
                margin: 14mm 12mm 14mm 12mm;
              }
              html, body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background: ${bgPrimary} !important;
                height: 100%;
              }
              .no-break {
                page-break-inside: avoid !important;
                break-inside: avoid-page !important;
                display: block;
              }
            }
          `}
        </style>

        <div style={{ padding: "0" }}>

          {/* Header Section */}
          <div style={{ borderBottom: `1px solid ${borderPrimary}`, paddingBottom: "6px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: accentPrimary, lineHeight: 1.2 }}>{exam.title}</h1>
              <p style={{ fontSize: "10px", color: textMuted, marginTop: "2px", margin: 0 }}>Result & Performance Report</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: "900", color: textPrimary, letterSpacing: "-0.5px" }}>Exam Center</div>
              <p style={{ fontSize: "9px", color: textMuted, margin: 0 }}>Free Assessment Platform</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
            {/* Student Info */}
            <div style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: bgSecondary, border: `1px solid ${borderPrimary}` }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "10px", color: textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Candidate Information</h3>
              <p style={{ margin: "2px 0", fontSize: "14px", fontWeight: "bold", color: textPrimary }}>{result.studentProfile?.name || "Unknown Student"}</p>
              <p style={{ margin: "2px 0", fontSize: "10px", color: textSecondary }}>ID: {result.studentProfile?.studentId || "—"}</p>
              <p style={{ margin: "2px 0", fontSize: "10px", color: textSecondary }}>Date: {new Date(submittedAt).toLocaleString()}</p>
            </div>

            {/* Performance Info */}
            <div style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: isDark ? "#1e3a8a20" : "#eff6ff", border: isDark ? "1px solid #1e3a8a40" : "1px solid #bfdbfe" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "10px", color: isDark ? "#93c5fd" : "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Performance Summary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "10px", color: isDark ? "#60a5fa" : "#3b82f6" }}>Final Score</p>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: isDark ? "#bfdbfe" : "#1e40af" }}>{scoreText}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10px", color: isDark ? "#60a5fa" : "#3b82f6" }}>Accuracy</p>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: isDark ? "#bfdbfe" : "#1e40af" }}>{pct}%</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10px", color: isDark ? "#60a5fa" : "#3b82f6" }}>Time Spent</p>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold", color: isDark ? "#bfdbfe" : "#1e3a8a" }}>{minutes}m {seconds}s</p>
                </div>
                {result.rank && (
                  <div>
                    <p style={{ margin: 0, fontSize: "10px", color: isDark ? "#60a5fa" : "#3b82f6" }}>Rank</p>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold", color: isDark ? "#bfdbfe" : "#1e3a8a" }}>#{result.rank}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Questions Detail */}
          <h2 style={{ fontSize: "14px", borderBottom: `1px solid ${borderPrimary}`, paddingBottom: "4px", marginBottom: "10px", color: textPrimary }}>
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
                  <div key={q.id} className="no-break" style={{ padding: "6px 8px", border: `1px solid ${borderPrimary}`, borderRadius: "4px", backgroundColor: bgPrimary, marginBottom: "8px", pageBreakInside: "avoid" }}>
                    <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "600", color: textPrimary, lineHeight: 1.3 }}>
                      <span style={{ color: isDark ? "#60a5fa" : "#3b82f6", marginRight: "4px" }}>Q{i + 1}.</span> {q.text}
                    </p>
                    <div style={{ marginTop: "4px", padding: "6px", backgroundColor: bgSecondary, borderRadius: "4px", border: `1px solid ${borderPrimary}` }}>
                      <p style={{ margin: 0, fontSize: "10px", fontWeight: "bold", color: textSecondary }}>Marks Awarded: {mark ?? "Pending"}</p>
                      {comment && <p style={{ margin: "4px 0 0 0", fontSize: "10px", fontStyle: "italic", color: textMuted }}>Evaluator Comment: {comment}</p>}
                    </div>
                  </div>
                );
              }

              // MCQ Logic
              const isCorrect = studentAns === q.correctIndex;
              const isSkipped = studentAns === undefined;
              const statusColor = isCorrect ? (isDark ? "#059669" : "#059669") : isSkipped ? (isDark ? "#4b5563" : "#6b7280") : (isDark ? "#dc2626" : "#dc2626");
              const statusText = isCorrect ? "Correct" : isSkipped ? "Skipped" : "Incorrect";
              const statusBg = isCorrect ? (isDark ? "#064e3b40" : "#ecfdf5") : isSkipped ? (isDark ? "#1f293740" : "#f3f4f6") : (isDark ? "#7f1d1d40" : "#fef2f2");
              const statusBorder = isCorrect ? (isDark ? "#065f46" : "#a7f3d0") : isSkipped ? (isDark ? "#374151" : "#e5e7eb") : (isDark ? "#991b1b" : "#fecaca");

              return (
                <div key={q.id} className="no-break" style={{ padding: "6px 8px", border: `1px solid ${statusBorder}`, backgroundColor: statusBg, borderRadius: "4px", marginBottom: "8px", pageBreakInside: "avoid" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px", gap: "6px" }}>
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: "600", color: textPrimary, flex: 1, lineHeight: 1.3 }}>
                      <span style={{ color: isDark ? "#60a5fa" : "#3b82f6", marginRight: "4px" }}>Q{i + 1}.</span> {q.text}
                    </p>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "9px",
                      fontWeight: "bold",
                      backgroundColor: isCorrect ? (isDark ? "#064e3b40" : "#d1fae5") : isSkipped ? (isDark ? "#1f2937" : "#e5e7eb") : (isDark ? "#7f1d1d40" : "#fee2e2"),
                      color: isCorrect ? (isDark ? "#34d399" : "#065f46") : isSkipped ? (isDark ? "#9ca3af" : "#4b5563") : (isDark ? "#f87171" : "#991b1b"),
                      border: `1px solid ${isCorrect ? (isDark ? "#065f46" : "#a7f3d0") : isSkipped ? (isDark ? "#374151" : "#d1d5db") : (isDark ? "#991b1b" : "#fecaca")}`,
                      whiteSpace: "nowrap"
                    }}>
                      {statusText}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginTop: "4px" }}>
                    {q.options?.map((opt, optIdx) => {
                      const isStudentChoice = studentAns === optIdx;
                      const isActualCorrect = q.correctIndex === optIdx;

                      const optStyle = {
                        padding: "4px 6px",
                        borderRadius: "3px",
                        border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                        backgroundColor: isDark ? "#1f2937" : "#ffffff",
                        fontSize: "10px",
                        color: textSecondary,
                        display: "flex",
                        alignItems: "center"
                      };

                      if (isActualCorrect) {
                        optStyle.border = `1px solid ${isDark ? "#059669" : "#059669"}`;
                        optStyle.backgroundColor = isDark ? "#064e3b" : "#d1fae5";
                        optStyle.color = isDark ? "#6ee7b7" : "#064e3b";
                      } else if (isStudentChoice && !isActualCorrect) {
                        optStyle.border = `1px solid ${isDark ? "#dc2626" : "#dc2626"}`;
                        optStyle.backgroundColor = isDark ? "#7f1d1d" : "#fee2e2";
                        optStyle.color = isDark ? "#fca5a5" : "#7f1d1d";
                      }

                      return (
                        <div key={optIdx} style={optStyle}>
                          <strong style={{ marginRight: "4px", color: isActualCorrect ? (isDark ? "#34d399" : "#059669") : isStudentChoice ? (isDark ? "#f87171" : "#dc2626") : textMuted }}>{String.fromCharCode(65 + optIdx)}.</strong>
                          <span style={{ flex: 1 }}>{opt}</span>
                          {isStudentChoice && <span style={{ marginLeft: "4px", fontSize: "8px", fontWeight: "bold", color: isActualCorrect ? (isDark ? "#34d399" : "#059669") : (isDark ? "#f87171" : "#dc2626") }}>{isActualCorrect ? "✓" : "✗"}</span>}
                          {isActualCorrect && !isStudentChoice && <span style={{ marginLeft: "4px", fontSize: "8px", fontWeight: "bold", color: isDark ? "#34d399" : "#059669" }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div style={{ marginTop: "6px", padding: "6px", backgroundColor: isDark ? "#1e3a8a30" : "rgba(255,255,255,0.7)", borderRadius: "3px", fontSize: "9px", color: textSecondary, border: `1px dashed ${isDark ? "#3b82f6" : "#d1d5db"}` }}>
                      <strong style={{ color: textPrimary }}>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Section */}
          <div style={{ borderTop: `1px solid ${borderPrimary}`, marginTop: "12px", paddingTop: "15px", paddingBottom: "4mm", textAlign: "center", fontSize: "9px", color: textSecondary }}>
            Generated by Exam Center • {new Date().toLocaleDateString()}
          </div>

        </div>
      </div>
    );
  }
);
ResultPdfTemplate.displayName = "ResultPdfTemplate";

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
          width: "794px",
          minHeight: "1123px",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "sans-serif",
          padding: "40px 50px",
          position: "relative",
        }}
      >
        {/* Header Section */}
        <div style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "20px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "bold", margin: 0, color: "#1e3a8a" }}>{exam.title}</h1>
            <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>Official Exam Result & Performance Report</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#111827" }}>MCQ Pro</div>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>Exam Center Hub</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "40px" }}>
          <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#374151" }}>Student Information</h3>
            <p style={{ margin: "4px 0", fontSize: "18px", fontWeight: "bold" }}>{result.studentProfile?.name || "Unknown Student"}</p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>ID: {result.studentProfile?.studentId || "—"}</p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>Submitted: {new Date(submittedAt).toLocaleString()}</p>
          </div>

          <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#1d4ed8" }}>Performance Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Score</p>
                <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>{scoreText}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Accuracy</p>
                <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>{pct}%</p>
              </div>
              {result.rank && (
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Rank</p>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>#{result.rank}</p>
                </div>
              )}
              {result.percentile && (
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Percentile</p>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>Top {result.percentile}%</p>
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>Time Spent</p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>{minutes}m {seconds}s</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "#3b82f6" }}>XP Earned</p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#8b5cf6" }}>+{result.score} XP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Detail */}
        <h2 style={{ fontSize: "22px", borderBottom: "2px solid #e5e7eb", paddingBottom: "10px", marginBottom: "20px", color: "#111827" }}>
          Detailed Review
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {questions.map((q, i) => {
            const studentAns = result.answers?.[q.id];
            
            if (isCq) {
              const mark = typeof studentAns === "object" ? (studentAns as any).mark : null;
              const comment = typeof studentAns === "object" ? (studentAns as any).comment : null;
              return (
                <div key={q.id} style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", pageBreakInside: "avoid" }}>
                  <p style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold" }}>
                    <span style={{ color: "#3b82f6", marginRight: "8px" }}>Q{i + 1}.</span> {q.text}
                  </p>
                  <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>Marks Awarded: {mark ?? "Pending"}</p>
                    {comment && <p style={{ margin: "8px 0 0 0", fontSize: "14px", fontStyle: "italic", color: "#4b5563" }}>Evaluator Comment: {comment}</p>}
                  </div>
                </div>
              );
            }

            // MCQ Logic
            const isCorrect = studentAns === q.correctIndex;
            const isSkipped = studentAns === undefined;
            const statusColor = isCorrect ? "#10b981" : isSkipped ? "#6b7280" : "#ef4444";
            const statusText = isCorrect ? "Correct" : isSkipped ? "Skipped" : "Wrong";
            const statusBg = isCorrect ? "#ecfdf5" : isSkipped ? "#f3f4f6" : "#fef2f2";

            return (
              <div key={q.id} style={{ padding: "20px", border: `1px solid ${isCorrect ? "#a7f3d0" : isSkipped ? "#e5e7eb" : "#fecaca"}`, backgroundColor: statusBg, borderRadius: "12px", pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", flex: 1 }}>
                    <span style={{ color: "#3b82f6", marginRight: "8px" }}>Q{i + 1}.</span> {q.text}
                  </p>
                  <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: "bold", backgroundColor: statusColor, color: "#fff", marginLeft: "16px" }}>
                    {statusText}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                  {q.options?.map((opt, optIdx) => {
                    const isStudentChoice = studentAns === optIdx;
                    const isActualCorrect = q.correctIndex === optIdx;
                    
                    let optStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", fontSize: "14px" };
                    
                    if (isActualCorrect) {
                      optStyle.border = "2px solid #10b981";
                      optStyle.backgroundColor = "#ecfdf5";
                    } else if (isStudentChoice && !isActualCorrect) {
                      optStyle.border = "2px solid #ef4444";
                      optStyle.backgroundColor = "#fef2f2";
                    }

                    return (
                      <div key={optIdx} style={optStyle}>
                        <strong style={{ marginRight: "8px" }}>{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                        {isStudentChoice && <span style={{ marginLeft: "8px", fontSize: "12px", color: isActualCorrect ? "#10b981" : "#ef4444" }}>(Your Answer)</span>}
                        {isActualCorrect && !isStudentChoice && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#10b981" }}>(Correct)</span>}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "rgba(255,255,255,0.6)", borderRadius: "8px", fontSize: "13px", color: "#4b5563" }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: "12px", color: "#9ca3af", paddingBottom: "20px" }}>
          Generated by MCQ Pro Online Exam Center • {new Date().toLocaleDateString()}
        </div>
      </div>
    );
  }
);
ResultPdfTemplate.displayName = "ResultPdfTemplate";

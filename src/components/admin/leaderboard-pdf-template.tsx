import React, { forwardRef } from "react";
import type { ExamResult } from "@/types";
import { formatResultScore, formatExamTypeLabel, getExamTitle, isCqExamType, isPendingCqScore, normalizeStudentProfile, getSubmittedAtMs } from "@/lib/firestore/normalize";

interface LeaderboardPdfTemplateProps {
  results: ExamResult[];
  exams: { id: string; title: string }[];
  filterExam: string;
}

export const LeaderboardPdfTemplate = forwardRef<HTMLDivElement, LeaderboardPdfTemplateProps>(
  ({ results, exams, filterExam }, ref) => {
    const examName = filterExam === "all" ? "All Exams" : getExamTitle(exams, filterExam);

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
        <div style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "20px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, color: "#111827" }}>Leaderboard Export</h1>
            <p style={{ fontSize: "16px", color: "#6b7280", marginTop: "4px" }}>Filter: {examName}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a8a" }}>MCQ Pro Admin</div>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>Generated {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6", textAlign: "left" }}>
              <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>Exam</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>Student</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>ID</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>Type</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>Score</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const profile = normalizeStudentProfile(r.studentProfile);
              const examTitle = getExamTitle(exams, r.examId);
              const score = formatResultScore(r.score);
              const type = formatExamTypeLabel(r.examType);
              const isPending = isCqExamType(r.examType) && isPendingCqScore(r.score);
              const submittedAt = getSubmittedAtMs(r.submittedAt);
              const dateStr = submittedAt > 0 ? new Date(submittedAt).toLocaleDateString() : "—";

              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                  <td style={{ padding: "12px", fontWeight: "bold", color: "#3b82f6" }}>{examTitle}</td>
                  <td style={{ padding: "12px" }}>{profile.name}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{profile.studentId}</td>
                  <td style={{ padding: "12px" }}>{type}</td>
                  <td style={{ padding: "12px", fontWeight: "bold", color: isPending ? "#d97706" : "#10b981" }}>{score}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{dateStr}</td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>No results found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
);
LeaderboardPdfTemplate.displayName = "LeaderboardPdfTemplate";

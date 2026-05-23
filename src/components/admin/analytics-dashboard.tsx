"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAnalytics } from "@/hooks/queries/use-admin-analytics";
import { PASS_THRESHOLD } from "@/lib/constants";
import {
  filterCqResults,
  filterMcqResults,
  formatExamTypeLabel,
  formatResultScore,
  getExamTitle,
  getSubmittedAtMs,
  normalizeStudentProfile,
} from "@/lib/firestore/normalize";
import { formatPercent, sanitizeCsvCell } from "@/lib/utils";
import { toast } from "sonner";

const BUCKET_COLORS = ["#ef4444", "#f97316", "#eab308", "#60a5fa", "#22c55e"];

export function AnalyticsDashboard() {
  const { data, isLoading } = useAdminAnalytics();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-l-4 border-blue-500/30">
              <CardContent className="h-20 p-5" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { exams, results: rawResults, questionsByExam = {} } = data;
  const mcqResults = filterMcqResults(rawResults);

  const buckets = [
    { label: "0 – 20%", count: 0 },
    { label: "21 – 40%", count: 0 },
    { label: "41 – 60%", count: 0 },
    { label: "61 – 80%", count: 0 },
    { label: "81 – 100%", count: 0 },
  ];

  function resultPercent(r: (typeof mcqResults)[number]): number {
    const enriched = r as (typeof r) & { percent?: number };
    if (typeof enriched.percent === "number") return enriched.percent;
    const q = questionsByExam[r.examId];
    return q ? formatPercent(Number(r.score), q) : 0;
  }

  mcqResults.forEach((r) => {
    const pct = resultPercent(r);
    if (!pct) return;
    if (pct <= 20) buckets[0]!.count++;
    else if (pct <= 40) buckets[1]!.count++;
    else if (pct <= 60) buckets[2]!.count++;
    else if (pct <= 80) buckets[3]!.count++;
    else buckets[4]!.count++;
  });

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  const avgScore =
    mcqResults.length > 0
      ? Math.round(
          mcqResults.reduce((a, r) => a + resultPercent(r), 0) / mcqResults.length
        )
      : 0;

  const passRate =
    mcqResults.length > 0
      ? Math.round(
          (mcqResults.filter((r) => {
            const q = questionsByExam[r.examId];
            return q && Number(r.score) / q >= PASS_THRESHOLD;
          }).length /
            mcqResults.length) *
            100
        )
      : 0;

  const examBreakdown = exams
    .map((e) => {
      const eResults = mcqResults.filter((r) => r.examId === e.id);
      const qCount = questionsByExam[e.id];
      const avg =
        eResults.length && qCount
          ? Math.round(
              eResults.reduce((a, r) => a + formatPercent(Number(r.score), qCount), 0) /
                eResults.length
            )
          : null;
      return { title: e.title ?? "Untitled", count: eResults.length, avg: avg ?? 0 };
    })
    .filter((e) => e.count > 0);

  function exportCsv() {
    if (!rawResults.length) {
      toast.error("No results to export");
      return;
    }
    const headers = ["Exam", "Student Name", "Student ID", "Type", "Score", "Date"];
    const rows = rawResults.map((r) => {
      const profile = normalizeStudentProfile(r.studentProfile);
      const qCount = questionsByExam[r.examId];
      const scoreDisplay =
        typeof r.score === "number" && qCount
          ? `${r.score}/${qCount} (${formatPercent(Number(r.score), qCount)}%)`
          : formatResultScore(r.score);
      const submittedAt = getSubmittedAtMs(r.submittedAt);
      return [
        getExamTitle(exams, r.examId),
        profile.name,
        profile.studentId,
        formatExamTypeLabel(r.examType),
        scoreDisplay,
        submittedAt > 0 ? new Date(submittedAt).toLocaleString() : "—",
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map(sanitizeCsvCell).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rawResults.length} results`);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="MCQ Submissions" value={mcqResults.length} />
        <MiniStat
          label="CQ Submissions"
          value={filterCqResults(rawResults).length}
        />
        <MiniStat label="Avg MCQ Score" value={`${avgScore}%`} />
        <MiniStat label={`Pass Rate (≥${PASS_THRESHOLD * 100}%)`} value={`${passRate}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MCQ Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mcqResults.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No MCQ results yet.</p>
            ) : (
              buckets.map((b, i) => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                    {b.label}
                  </span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="bar-fill flex h-full items-center rounded-full pl-3"
                      style={{
                        ["--target-width" as string]: `${(b.count / maxCount) * 100}%`,
                        width: `${(b.count / maxCount) * 100}%`,
                        background: `${BUCKET_COLORS[i]}22`,
                        border: `1px solid ${BUCKET_COLORS[i]}55`,
                      }}
                    >
                      {b.count > 0 && (
                        <span className="text-xs font-bold" style={{ color: BUCKET_COLORS[i] }}>
                          {b.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">{b.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-Exam Average</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {examBreakdown.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                  <YAxis dataKey="title" type="category" width={100} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(0,0,0,0.85)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="avg" fill="#a855f7" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-l-4 border-blue-500">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-blue-400">{value}</p>
      </CardContent>
    </Card>
  );
}

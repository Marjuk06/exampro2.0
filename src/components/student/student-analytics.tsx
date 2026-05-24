"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { useStudentAnalytics } from "@/hooks/queries/use-student-analytics";
import { useStudentInsights } from "@/hooks/queries/use-insights";
import { RankMovementBadge } from "@/components/student/rank-movement-badge";

const HEAT_COLORS = ["#ef4444", "#f97316", "#eab308", "#60a5fa", "#22c55e"];

function heatColor(accuracy: number) {
  if (accuracy < 40) return HEAT_COLORS[0];
  if (accuracy < 60) return HEAT_COLORS[1];
  if (accuracy < 75) return HEAT_COLORS[2];
  if (accuracy < 90) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
}

export function StudentAnalytics() {
  const { profile } = useAuth();
  const { data, isLoading } = useStudentAnalytics(!!profile);
  const { data: insightsData, isLoading: insightsLoading } = useStudentInsights(!!profile);

  if (!profile) return null;
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
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

  const { examsTaken, avgScore, cqCount, bestRank, chartData } = data;
  const insights = insightsData?.insights;
  const rankHistory = insightsData?.rankHistory ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Exams Taken" value={examsTaken} />
        <StatCard label="Avg Score" value={`${avgScore}%`} />
        <StatCard
          label="Topic Accuracy"
          value={insights ? `${insights.avgAccuracy}%` : "—"}
        />
        <StatCard
          label="Best Rank"
          value={bestRank != null ? `#${bestRank}` : "—"}
        />
        <StatCard label="CQ Submitted" value={cqCount} />
      </div>

      {insights && !insightsLoading && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weakest topics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.weakestTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Take more exams for insights.</p>
                ) : (
                  insights.weakestTopics.map((t) => (
                    <div
                      key={`${t.subject}-${t.chapter}`}
                      className="flex justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm"
                    >
                      <span>
                        {t.subject} — {t.chapter}
                      </span>
                      <span className="font-bold text-red-400">{t.accuracy}%</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended practice</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {insights.recommendations.map((r, i) => (
                    <li key={i} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {insights.heatmap.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accuracy heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {insights.heatmap.slice(0, 24).map((h, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2 text-xs text-white"
                      style={{ background: heatColor(h.accuracy) }}
                      title={`${h.accuracy}%`}
                    >
                      {h.chapter.slice(0, 12)} ({h.accuracy}%)
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {rankHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rank history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rankHistory.slice(0, 8).map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm"
              >
                <span className="font-medium">{h.examTitle}</span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">#{h.rank}</span>
                  <RankMovementBadge delta={h.rankDelta} />
                  <span className="text-muted-foreground">Top {h.percentile}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No MCQ results yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-l-4 border-blue-500">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-blue-400">{value}</p>
      </CardContent>
    </Card>
  );
}

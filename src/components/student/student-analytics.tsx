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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { useStudentAnalytics } from "@/hooks/queries/use-student-analytics";

export function StudentAnalytics() {
  const { profile } = useAuth();
  const { data, isLoading } = useStudentAnalytics(!!profile);

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Exams Taken" value={examsTaken} />
        <StatCard label="Avg Score" value={`${avgScore}%`} />
        <StatCard label="CQ Submitted" value={cqCount} />
        <StatCard
          label="Best Rank"
          value={bestRank != null ? `#${bestRank}` : "—"}
        />
      </div>
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
                <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
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

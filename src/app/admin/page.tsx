"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks/queries/use-admin-dashboard";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  const stats = [
    {
      label: "Live Students",
      value: data?.liveCount ?? "—",
      color: "border-green-500 text-green-400",
    },
    {
      label: "Total Exams",
      value: data?.examCount ?? "—",
      color: "border-blue-500",
    },
    {
      label: "Pending CQ Evals",
      value: data?.pendingCq ?? "—",
      color: "border-purple-500 text-purple-400",
    },
    {
      label: "Unique Students",
      value: data?.uniqueStudents ?? "—",
      color: "border-teal-500 text-teal-400",
    },
    {
      label: "Avg MCQ Score",
      value: data != null ? `${data.avgScore}%` : "—",
      color: "border-orange-500 text-orange-400",
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Overview</h2>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse border-l-4 border-white/10">
              <CardContent className="h-24 p-6" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`border-l-4 ${s.color}`}>
                <CardContent className="p-6">
                  <p className="mb-1 text-sm text-muted-foreground">{s.label}</p>
                  <h3
                    className={`text-3xl font-bold ${s.color.split(" ").slice(1).join(" ")}`}
                  >
                    {s.value}
                  </h3>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

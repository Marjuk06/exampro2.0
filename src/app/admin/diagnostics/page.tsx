"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SlowQuery {
  name: string;
  durationMs: number;
  at: string;
}

interface DiagnosticsData {
  status: string;
  uptime: { seconds: number; since: string };
  environment: string;
  version: string;
  metrics: {
    total: number;
    slowCount: number;
    avgDurationMs: number;
    topSlow: SlowQuery[];
    topFrequent: { name: string; count: number }[];
    recent: SlowQuery[];
  };
}

export default function DiagnosticsPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.adminDiagnostics,
    queryFn: () => fetchJson<DiagnosticsData>("/api/admin/diagnostics/metrics"),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const uptimeFormatted = data
    ? (() => {
        const s = data.uptime.seconds;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : "—";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Diagnostics</h2>
          <p className="text-sm text-muted-foreground">
            Real-time server health and query performance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
          label="Status"
          value={data?.status === "ok" ? "Healthy" : "—"}
          color="border-green-500"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-blue-400" />}
          label="Uptime"
          value={uptimeFormatted}
          color="border-blue-500"
        />
        <StatCard
          icon={<Database className="h-5 w-5 text-purple-400" />}
          label="Queries tracked"
          value={data?.metrics.total ?? "—"}
          color="border-purple-500"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-yellow-400" />}
          label="Slow queries"
          value={data?.metrics.slowCount ?? "—"}
          color={
            (data?.metrics.slowCount ?? 0) > 5
              ? "border-red-500"
              : "border-yellow-500"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top slow queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-yellow-400" />
              Slow queries (≥500ms)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.metrics.topSlow.length ? (
              <p className="text-sm text-muted-foreground">
                No slow queries recorded. ✓
              </p>
            ) : (
              <div className="space-y-2">
                {data.metrics.topSlow.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2"
                  >
                    <span className="font-mono text-xs text-yellow-300">
                      {q.name}
                    </span>
                    <Badge
                      variant="warning"
                    >
                      {q.durationMs}ms
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most frequent queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-blue-400" />
              Most frequent queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.metrics.topFrequent.length ? (
              <p className="text-sm text-muted-foreground">
                No query data yet.
              </p>
            ) : (
              <div className="space-y-2">
                {data.metrics.topFrequent.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {q.name}
                    </span>
                    <Badge variant="muted">{q.count}×</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Server info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-purple-400" />
            Server info
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <InfoRow label="Version" value={data?.version ?? "—"} />
          <InfoRow label="Environment" value={data?.environment ?? "—"} />
          <InfoRow label="Avg query" value={data ? `${data.metrics.avgDurationMs}ms` : "—"} />
          <InfoRow
            label="Last updated"
            value={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardContent className="p-5">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono font-medium">{value}</p>
    </div>
  );
}

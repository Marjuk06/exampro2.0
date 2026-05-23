"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNormalizedFirestoreCollection } from "@/hooks/use-normalized-collection";
import { publicPaths } from "@/lib/firestore/public-data";
import { normalizeRetakeRequest } from "@/lib/firestore/normalize";
import { ClientDate } from "@/components/ui/client-date";

export default function RetakeRequestsPage() {
  const { data: retakes } = useNormalizedFirestoreCollection(
    [...publicPaths.retakes],
    normalizeRetakeRequest
  );

  async function handleAction(
    requestId: string,
    uid: string,
    examId: string,
    action: "approve" | "dismiss"
  ) {
    const res = await fetch("/api/admin/retake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, uid, examId, action }),
    });
    if (res.ok) {
      toast.success(action === "approve" ? "Access granted" : "Request dismissed");
    } else {
      toast.error("Action failed");
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Access / Retake Requests</h2>
      <div className="space-y-4">
        {retakes.map((r) => (
          <Card key={r.id} className="border-l-4 border-yellow-500">
            <CardContent className="flex flex-col items-center justify-between gap-4 p-5 md:flex-row">
              <div>
                <h4 className="font-bold">
                  {r.studentName || "Unknown"}{" "}
                  <span className="text-sm text-muted-foreground">
                    ({r.studentId || "—"})
                  </span>
                </h4>
                <p className="text-sm text-blue-400">{r.examTitle || "Unknown Exam"}</p>
                <p className="text-xs text-muted-foreground">
                  <ClientDate timestamp={r.timestamp} />
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                  onClick={() => handleAction(r.id, r.uid, r.examId, "approve")}
                >
                  Grant Access
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-400"
                  onClick={() => handleAction(r.id, r.uid, r.examId, "dismiss")}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {retakes.length === 0 && (
          <Card className="py-8 text-center text-muted-foreground">No pending requests.</Card>
        )}
      </div>
    </div>
  );
}

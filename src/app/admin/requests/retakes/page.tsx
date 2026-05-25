"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { RetakeRequest } from "@/types";

export default function AdminRetakesPage() {
  const [requests, setRequests] = useState<RetakeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/admin/retakes" : `/api/admin/retakes?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests(data);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to fetch retake requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/retakes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Request ${status} successfully`);
      fetchRequests();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Retake Approvals</h2>
        <select 
          className="p-2 rounded bg-secondary text-secondary-foreground border border-border"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "pending" | "approved" | "rejected" | "all")}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="used">Used</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg bg-secondary/20">
          <p className="text-muted-foreground">No retake requests found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div key={req.id} className="p-4 border rounded-lg bg-card flex justify-between items-center flex-wrap gap-4">
              <div>
                <p className="font-bold">{req.studentName} <span className="text-sm font-normal text-muted-foreground">({req.studentId})</span></p>
                <p className="text-sm">Exam: {req.examTitle}</p>
                <p className="text-xs text-muted-foreground">{new Date(req.timestamp).toLocaleString()}</p>
                <div className="mt-2 text-xs font-semibold uppercase tracking-wide">
                  Status: <span className={
                    req.status === 'pending' ? "text-yellow-500" :
                    req.status === 'approved' ? "text-green-500" :
                    req.status === 'rejected' ? "text-red-500" : "text-blue-500"
                  }>{req.status}</span>
                </div>
              </div>
              {req.status === "pending" && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    disabled={actionLoading === req.id}
                    onClick={() => handleAction(req.id, "rejected")}
                  >
                    {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={actionLoading === req.id}
                    onClick={() => handleAction(req.id, "approved")}
                  >
                    {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

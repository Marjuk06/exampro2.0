"use client";

import { useState } from "react";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ExamForm } from "@/components/admin/exam-form";
import { useFirestoreCollection, orderBy, limit } from "@/hooks/use-firestore-collection";
import { publicPaths } from "@/lib/firestore/public-data";
import { examLink } from "@/lib/utils";
import { formatExamTypeLabel, isCqExamType, normalizeExam } from "@/lib/firestore/normalize";
import type { Exam, Question } from "@/types";

export default function AdminExamsPage() {
  const { data: exams } = useFirestoreCollection<Exam>([...publicPaths.exams], [
    orderBy("createdAt", "desc"),
    limit(100),
  ]);
  const { data: questions } = useFirestoreCollection<Question>(
    [...publicPaths.questions],
    [limit(2000)]
  );
  const [editing, setEditing] = useState<Exam | null>(null);

  async function updateField(id: string, field: string, val: boolean) {
    const res = await fetch(`/api/admin/exams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value: val }),
    });
    if (!res.ok) toast.error("Update failed");
  }

  async function deleteExam(id: string) {
    if (!confirm("Delete this exam? Questions and results are kept.")) return;
    const res = await fetch(`/api/admin/exams/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Exam deleted");
    else toast.error("Delete failed");
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(examLink(id));
    toast.success("Link copied!");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manage Exams</h2>
      </div>
      {editing ? (
        <ExamForm exam={editing} onSuccess={() => setEditing(null)} />
      ) : (
        <ExamForm />
      )}
      <div className="space-y-4">
        {exams.map((raw) => {
          const e = normalizeExam({
            ...(raw as unknown as Record<string, unknown>),
            id: raw.id,
          });
          const qCount = questions.filter((q) => q?.examId === e.id).length;
          return (
          <Card key={e.id} className={`border-l-4 ${e.isHidden ? "border-gray-500" : "border-blue-500"}`}>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                  {e.title || "Untitled"}
                  <span className="text-sm font-normal text-blue-400">{e.subject || "—"}</span>
                  <Badge variant={isCqExamType(e.examType) ? "purple" : "default"}>
                    {formatExamTypeLabel(e.examType)}
                  </Badge>
                </h4>
                <p className="text-sm text-muted-foreground">
                  {e.duration ?? 0} mins · {qCount} questions
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => copyLink(e.id)}>
                  <Link2 className="mr-1 h-3 w-3" /> Link
                </Button>
                <Toggle label="Hide" checked={!!e.isHidden} onChange={(v) => updateField(e.id, "isHidden", v)} />
                <Toggle label="Results" checked={!!e.isResultPublished} onChange={(v) => updateField(e.id, "isResultPublished", v)} />
                {!isCqExamType(e.examType) && (
                  <Toggle label="Answers" checked={e.isAnswerRevealed} onChange={(v) => updateField(e.id, "isAnswerRevealed", v)} />
                )}
                <Button variant="ghost" size="icon" onClick={() => setEditing(e)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteExam(e.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

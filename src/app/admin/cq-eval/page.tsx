"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useNormalizedFirestoreCollection } from "@/hooks/use-normalized-collection";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { publicPaths } from "@/lib/firestore/public-data";
import {
  filterPendingCqResults,
  getExamTitle,
  normalizeExamResult,
  normalizeStudentProfile,
} from "@/lib/firestore/normalize";
import type { Exam, ExamResult } from "@/types";

export default function CqEvalPage() {
  const { data: results } = useNormalizedFirestoreCollection(
    [...publicPaths.results],
    normalizeExamResult
  );
  const { data: exams } = useFirestoreCollection<Exam>([...publicPaths.exams]);
  const pending = filterPendingCqResults(results);

  async function saveScore(resultId: string, scoreStr: string) {
    const score = parseInt(scoreStr, 10);
    if (isNaN(score) || score < 0) {
      toast.error("Enter valid score");
      return;
    }
    const res = await fetch("/api/admin/cq-eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultId, score }),
    });
    if (!res.ok) {
      toast.error("Failed to save score");
      return;
    }
    toast.success("Score saved");
  }

  return (
    <div>
      <div className="mb-6 flex justify-between">
        <h2 className="text-2xl font-bold text-purple-400">Evaluate CQ Submissions</h2>
        <span className="text-sm text-muted-foreground">{pending.length} pending</span>
      </div>
      <div className="space-y-6">
        {pending.map((r) => (
          <CqCard
            key={r.id}
            result={r}
            examTitle={getExamTitle(exams, r.examId)}
            onSave={saveScore}
          />
        ))}
        {pending.length === 0 && (
          <Card className="py-10 text-center text-muted-foreground">
            All caught up! No pending evaluations.
          </Card>
        )}
      </div>
    </div>
  );
}

function CqCard({
  result,
  examTitle,
  onSave,
}: {
  result: ExamResult;
  examTitle: string;
  onSave: (id: string, score: string) => void;
}) {
  const [score, setScore] = useState("");
  const profile = normalizeStudentProfile(result.studentProfile);
  const images = result.cqImageUrls ?? [];

  return (
    <Card className="border-l-4 border-purple-500">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h4 className="text-lg font-bold">
              {profile.name}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({profile.studentId})
              </span>
            </h4>
            <p className="text-sm text-blue-400">{examTitle}</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Score"
              className="w-24 text-center"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
            <Button variant="purple" onClick={() => onSave(result.id, score)}>
              Save
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {images.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">No images uploaded.</p>
          ) : (
            images.map((img, idx) => (
              <a key={idx} href={img} target="_blank" rel="noreferrer" className="group relative">
                <img
                  src={img}
                  alt={`Answer ${idx + 1}`}
                  className="h-28 w-full rounded-lg border border-white/20 object-cover transition group-hover:opacity-80"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white">
                  {idx + 1}
                </span>
              </a>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

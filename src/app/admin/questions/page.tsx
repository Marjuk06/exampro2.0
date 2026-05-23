"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirestoreCollection, orderBy, limit } from "@/hooks/use-firestore-collection";
import { publicPaths } from "@/lib/firestore/public-data";
import { bulkQuestionsSchema } from "@/lib/validations/exam";
import { isCqExamType } from "@/lib/firestore/normalize";
import type { Exam, Question } from "@/types";

export default function AdminQuestionsPage() {
  const { data: exams } = useFirestoreCollection<Exam>([...publicPaths.exams], [
    orderBy("createdAt", "desc"),
    limit(100),
  ]);
  const { data: questions } = useFirestoreCollection<Question>(
    [...publicPaths.questions],
    [orderBy("createdAt", "asc"), limit(500)]
  );
  const [filterExam, setFilterExam] = useState("all");
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [text, setText] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correctIdx, setCorrectIdx] = useState("0");
  const [bulkJson, setBulkJson] = useState("");

  const filtered =
    filterExam && filterExam !== "all"
      ? questions.filter((q) => q.examId === filterExam)
      : questions;

  async function saveQuestion() {
    if (!examId || !text.trim()) {
      toast.error("Select exam and enter question text");
      return;
    }
    const exam = exams.find((e) => e.id === examId);
    const isMcq = !isCqExamType(exam?.examType);
    if (isMcq && opts.some((o) => !o.trim())) {
      toast.error("Fill all options");
      return;
    }
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId,
        text: text.trim(),
        options: isMcq ? opts.map((o) => o.trim()) : ["", "", "", ""],
        correctIndex: isMcq ? parseInt(correctIdx, 10) : 0,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to save question");
      return;
    }
    toast.success("Question saved");
    setText("");
    setOpts(["", "", "", ""]);
  }

  async function bulkImport() {
    if (!examId) return;
    let parsed;
    try {
      parsed = bulkQuestionsSchema.parse(JSON.parse(bulkJson));
    } catch {
      toast.error("Invalid JSON");
      return;
    }
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-exam-id": examId,
      },
      body: JSON.stringify(parsed),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error("Import failed");
      return;
    }
    toast.success(`Imported ${data.count ?? 0} questions`);
    setBulkJson("");
  }

  async function deleteQuestion(id: string) {
    const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Deleted");
    else toast.error("Delete failed");
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Manage Questions</h2>
        <Select value={filterExam} onValueChange={setFilterExam}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Exams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-6 border-blue-500/50">
        <CardHeader>
          <CardTitle className="text-blue-400">Add Single Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={examId} onValueChange={setExamId}>
            <SelectTrigger>
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Question text..." value={text} onChange={(e) => setText(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            {opts.map((o, i) => (
              <Input
                key={i}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                value={o}
                onChange={(e) => {
                  const next = [...opts];
                  next[i] = e.target.value;
                  setOpts(next);
                }}
              />
            ))}
          </div>
          <Select value={correctIdx} onValueChange={setCorrectIdx}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map((i) => (
                <SelectItem key={i} value={String(i)}>
                  Correct: {String.fromCharCode(65 + i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={saveQuestion}>Save Question</Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-green-500/50">
        <CardHeader>
          <CardTitle className="text-green-400">Bulk Import JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="font-mono text-sm"
            rows={5}
            placeholder='[{"text":"Q?","options":["A","B","C","D"],"correctIndex":0}]'
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
          />
          <Button className="w-full bg-green-700" onClick={bulkImport}>
            Import Questions
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.map((q) => {
          const ex = exams.find((e) => e.id === q.examId);
          return (
            <Card key={q.id} className="border-l-4 border-blue-500/60">
              <CardContent className="flex justify-between gap-4 p-4">
                <div>
                  <span className="text-xs text-blue-400">{ex?.title}</span>
                  <p className="mt-1 whitespace-pre-wrap font-medium">{q.text}</p>
                  {!isCqExamType(ex?.examType) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {q.options?.map((o, idx) => (
                        <span
                          key={idx}
                          className={idx === q.correctIndex ? "font-bold text-green-400" : ""}
                        >
                          {String.fromCharCode(65 + idx)}. {o}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

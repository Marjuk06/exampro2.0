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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const filtered =
    filterExam && filterExam !== "all"
      ? questions.filter((q) => q.examId === filterExam)
      : questions;

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((q) => q.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

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
    if (res.ok) {
      toast.success("Deleted");
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else toast.error("Delete failed");
  }

  async function deleteBulk() {
    if (!selectedIds.length) return;
    setIsDeletingBulk(true);
    try {
      const items = selectedIds.map((id) => {
        const q = questions.find((q) => q.id === id);
        return { id, examId: q?.examId ?? "" };
      });
      const res = await fetch("/api/admin/questions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      toast.success(`Deleted ${selectedIds.length} questions`);
      setSelectedIds([]);
      setShowDeleteModal(false);
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setIsDeletingBulk(false);
    }
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

      {filtered.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-white/5 p-3">
          <Checkbox
            checked={selectedIds.length === filtered.length && filtered.length > 0}
            onCheckedChange={toggleSelectAll}
            id="selectAll"
          />
          <label htmlFor="selectAll" className="text-sm font-medium cursor-pointer select-none">
            Select All ({filtered.length})
          </label>
        </div>
      )}

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
            <Card key={q.id} className={`border-l-4 transition-colors ${selectedIds.includes(q.id) ? 'border-red-500/60 bg-red-500/5' : 'border-blue-500/60'}`}>
              <CardContent className="flex justify-between gap-4 p-4">
                <div className="flex gap-4">
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.includes(q.id)}
                      onCheckedChange={() => toggleSelect(q.id)}
                    />
                  </div>
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
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-black/80 px-6 py-4 shadow-2xl backdrop-blur-lg"
          >
            <span className="font-medium text-white">
              {selectedIds.length} question{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="gap-2 rounded-full font-bold"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="border-red-500/20 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedIds.length}{" "}
              question{selectedIds.length > 1 ? "s" : ""} from the database and recalculate exam counts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBulk}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                deleteBulk();
              }}
              disabled={isDeletingBulk}
            >
              {isDeletingBulk ? "Deleting..." : "Yes, delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

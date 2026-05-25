"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { examFormSchema, type ExamFormValues } from "@/lib/validations/exam";
import type { Exam } from "@/types";

interface ExamFormProps {
  exam?: Exam;
  onSuccess?: () => void;
}

export function ExamForm({ exam, onSuccess }: ExamFormProps) {
  const [open, setOpen] = useState(!exam);
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: exam
      ? {
          title: exam.title,
          subject: exam.subject,
          examType: exam.examType === "mixed" ? "mcq" : exam.examType,
          duration: exam.duration,
          isUnlimited: exam.isUnlimited,
          startTime: exam.startTime
            ? new Date(exam.startTime).toISOString().slice(0, 16)
            : "",
          endTime: exam.endTime
            ? new Date(exam.endTime).toISOString().slice(0, 16)
            : "",
          isHidden: exam.isHidden,
          shuffleQuestions: exam.shuffleQuestions,
          shuffleOptions: exam.shuffleOptions ?? false,
          allowedStudents: (exam.allowedStudents ?? []).join(", "),
          negativeMarking: exam.negativeMarking ?? 0,
          proctoringEnabled: exam.proctoringEnabled ?? true,
          maxViolations: exam.maxViolations ?? 5,
          allowRetakes: exam.allowRetakes ?? false,
          requireRetakeApproval: exam.requireRetakeApproval ?? false,
          maxRetakes: exam.maxRetakes ?? 1,
        }
      : {
          title: "",
          subject: "",
          examType: "mcq",
          duration: 10,
          isUnlimited: true,
          isHidden: false,
          shuffleQuestions: false,
          shuffleOptions: false,
          negativeMarking: 0,
          proctoringEnabled: true,
          maxViolations: 5,
          allowRetakes: false,
          requireRetakeApproval: false,
          maxRetakes: 1,
        },
  });

  const isUnlimited = form.watch("isUnlimited");
  const allowRetakes = form.watch("allowRetakes");

  async function onSubmit(data: ExamFormValues) {
    try {
      if (exam) {
        const res = await fetch(`/api/admin/exams/${exam.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success("Exam updated");
      } else {
        const res = await fetch("/api/admin/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success("Exam created");
      }
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to save exam");
    }
  }

  if (!open && !exam) {
    return (
      <Button onClick={() => setOpen(true)} className="mb-6">
        Create Exam
      </Button>
    );
  }

  return (
    <Card className="mb-8 border-purple-500/50">
      <CardHeader>
        <CardTitle className="text-purple-400">
          {exam ? "Edit Exam" : "New Exam Details"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input placeholder="Exam Title" className="md:col-span-2" {...form.register("title")} />
            <Input placeholder="Subject" {...form.register("subject")} />
            <Select
              value={form.watch("examType")}
              onValueChange={(v) => form.setValue("examType", v as ExamFormValues["examType"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="cq">CQ (Written)</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" {...form.register("duration")} />
            </div>
            <div className={isUnlimited ? "opacity-50" : ""}>
              <Label>Start Time</Label>
              <Input type="datetime-local" disabled={isUnlimited} {...form.register("startTime")} />
            </div>
            <div className={isUnlimited ? "opacity-50" : ""}>
              <Label>End Time</Label>
              <Input type="datetime-local" disabled={isUnlimited} {...form.register("endTime")} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={isUnlimited}
                onCheckedChange={(c) => form.setValue("isUnlimited", c)}
              />
              Unlimited window
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.watch("isHidden")}
                onCheckedChange={(c) => form.setValue("isHidden", c)}
              />
              Hide from dashboard
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.watch("shuffleQuestions")}
                onCheckedChange={(c) => form.setValue("shuffleQuestions", c)}
              />
              Shuffle questions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.watch("proctoringEnabled")}
                onCheckedChange={(c) => form.setValue("proctoringEnabled", c)}
              />
              Proctoring
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={allowRetakes}
                onCheckedChange={(c) => form.setValue("allowRetakes", c)}
              />
              Allow Retakes
            </label>
            {allowRetakes && (
              <>
                <label className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  <Switch
                    checked={form.watch("requireRetakeApproval")}
                    onCheckedChange={(c) => form.setValue("requireRetakeApproval", c)}
                  />
                  Require Admin Approval
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <Label>Max Retakes</Label>
                  <Input type="number" className="w-20" {...form.register("maxRetakes")} />
                </div>
              </>
            )}
          </div>
          <div>
            <Label>Allowed Student IDs (comma-separated)</Label>
            <Input placeholder="STU-1234, STU-5678" {...form.register("allowedStudents")} />
          </div>
          <Button type="submit">{exam ? "Update Exam" : "Save Exam"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

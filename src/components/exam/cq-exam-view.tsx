"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CloudUpload, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExamTimer } from "@/components/exam/exam-timer";
import { MAX_CQ_IMAGES } from "@/lib/constants";
import { useExamStore } from "@/store/exam-store";
import type { Exam, Question } from "@/types";

interface CqExamViewProps {
  exam: Exam;
  questions: Question[];
  endTime: number;
  sessionId: string;
}

export function CqExamView({ exam, questions, endTime }: CqExamViewProps) {
  const router = useRouter();
  const { reset } = useExamStore();
  const [phase, setPhase] = useState<"writing" | "upload">("writing");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const onExpire = useCallback(() => setPhase("upload"), []);

  async function submitCq() {
    if (!files.length) {
      toast.error("Please select at least one image.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("examId", exam.id);
      files.forEach((f) => formData.append("images", f));

      const res = await fetch("/api/exam/submit-cq", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      reset();
      toast.success("CQ Exam submitted successfully!");
      router.push(`/exam/${exam.id}`);
    } catch {
      toast.error("Save failed. Try smaller images.");
    } finally {
      setUploading(false);
    }
  }

  if (phase === "upload") {
    return (
      <Card className="mx-auto w-full max-w-2xl border-t-4 border-purple-500">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20">
            <Camera className="h-8 w-8 text-purple-400" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-purple-400">
            Time&apos;s Up — Upload Your Answers
          </h2>
          <p className="mb-6 text-muted-foreground">
            Take clear photos of your written answers. Max {MAX_CQ_IMAGES} images.
          </p>
          <label className="mb-6 block cursor-pointer rounded-xl border border-dashed border-white/20 bg-black/50 p-8 transition hover:border-purple-500/50">
            <Upload className="mx-auto mb-2 h-8 w-8 text-purple-400" />
            <span>Drag & drop or click to upload</span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_CQ_IMAGES))}
            />
          </label>
          {files.length > 0 && (
            <p className="mb-4 text-sm text-green-400">{files.length} file(s) selected</p>
          )}
          <Button variant="purple" className="w-full py-3 text-lg" onClick={submitCq} disabled={uploading}>
            <CloudUpload className="mr-2 h-5 w-5" />
            {uploading ? "Uploading..." : "Upload & Submit Assessment"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <Card className="relative border-t-4 border-purple-500">
        <div className="absolute right-4 top-4">
          <ExamTimer endTime={endTime} onExpire={onExpire} />
        </div>
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold">{exam.title}</h2>
          <p className="text-sm text-muted-foreground">{exam.subject} · Written Exam</p>
        </CardContent>
      </Card>

      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="p-6">
            <h3 className="flex gap-3 text-lg font-medium">
              <span className="rounded-lg bg-white/10 px-3 py-1 text-sm text-purple-400">
                Q{i + 1}
              </span>
              <span className="whitespace-pre-wrap">{q.text}</span>
            </h3>
          </CardContent>
        </Card>
      ))}

      <Card className="sticky bottom-6">
        <CardContent className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
          <span className="text-sm text-muted-foreground">
            Write answers on paper. Upload photos when finished or time expires.
          </span>
          <Button variant="purple" onClick={() => setPhase("upload")}>
            Finish Writing & Upload
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

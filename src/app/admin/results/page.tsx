"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminResults } from "@/hooks/queries/use-admin-results";
import { useFirestoreCollection, limit, orderBy } from "@/hooks/use-firestore-collection";
import { publicPaths } from "@/lib/firestore/public-data";
import {
  formatExamTypeLabel,
  formatResultScore,
  getExamTitle,
  getSubmittedAtMs,
  isCqExamType,
  isPendingCqScore,
  normalizeStudentProfile,
} from "@/lib/firestore/normalize";
import type { Exam, ExamResult } from "@/types";
import { ClientDate } from "@/components/ui/client-date";

export default function AdminResultsPage() {
  const [filter, setFilter] = useState("all");
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminResults(filter);

  const { data: exams } = useFirestoreCollection<Exam>(
    [...publicPaths.exams],
    [orderBy("createdAt", "desc"), limit(100)]
  );

  const results = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const examList = exams.map((e) => ({ id: e.id, title: e.title ?? "Unknown" }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <h2 className="text-2xl font-bold">All Results Archive</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Exams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {examList.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="border-b border-white/10 bg-black/40 p-4">Exam</th>
              <th className="border-b border-white/10 bg-black/40 p-4">Student</th>
              <th className="border-b border-white/10 bg-black/40 p-4">ID</th>
              <th className="border-b border-white/10 bg-black/40 p-4">Type</th>
              <th className="border-b border-white/10 bg-black/40 p-4">Score</th>
              <th className="border-b border-white/10 bg-black/40 p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Loading results…
                </td>
              </tr>
            )}
            {!isLoading && results.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No results found.
                </td>
              </tr>
            )}
            {!isLoading &&
              results.map((r) => (
                <ResultRow key={r.id} result={r} exams={examList} />
              ))}
          </tbody>
        </table>
      </div>
      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ResultRow({
  result: r,
  exams,
}: {
  result: ExamResult;
  exams: { id: string; title: string }[];
}) {
  const profile = normalizeStudentProfile(r.studentProfile);
  const examTypeLabel = formatExamTypeLabel(r.examType);
  const scoreText = formatResultScore(r.score);
  const isPending = isCqExamType(r.examType) && isPendingCqScore(r.score);
  const submittedAt = getSubmittedAtMs(r.submittedAt);

  return (
    <tr className="transition hover:bg-white/5">
      <td className="border-b border-white/5 p-4 text-sm font-medium text-blue-400">
        {getExamTitle(exams, r.examId)}
      </td>
      <td className="border-b border-white/5 p-4">{profile.name}</td>
      <td className="border-b border-white/5 p-4 text-sm text-muted-foreground">
        {profile.studentId}
      </td>
      <td className="border-b border-white/5 p-4">
        <Badge variant={isCqExamType(r.examType) ? "purple" : "default"}>
          {examTypeLabel}
        </Badge>
      </td>
      <td
        className={`border-b border-white/5 p-4 font-bold ${
          isPending ? "text-yellow-400" : "text-green-400"
        }`}
      >
        {scoreText}
      </td>
      <td className="border-b border-white/5 p-4 text-sm text-muted-foreground">
        {submittedAt > 0 ? (
          <ClientDate timestamp={submittedAt} options={{ dateStyle: "medium" }} />
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

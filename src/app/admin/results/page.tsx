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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Loader2, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { useAdminResults } from "@/hooks/queries/use-admin-results";
import { useFirestoreCollection, limit, orderBy } from "@/hooks/use-firestore-collection";
import { publicPaths } from "@/lib/firestore/public-data";
import { LeaderboardPdfTemplate } from "@/components/admin/leaderboard-pdf-template";
import { motion } from "framer-motion";
import { useRef } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"latest" | "highest">("latest");
  
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

  const rawResults = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const examList = exams.map((e) => ({ id: e.id, title: e.title ?? "Unknown" }));

  const results = useMemo(() => {
    let filtered = [...rawResults];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const profile = normalizeStudentProfile(r.studentProfile);
        const title = getExamTitle(examList, r.examId).toLowerCase();
        return (
          profile.name.toLowerCase().includes(q) ||
          profile.studentId.toLowerCase().includes(q) ||
          title.includes(q)
        );
      });
    }
    if (sortOrder === "highest") {
      filtered.sort((a, b) => Number(b.score) - Number(a.score));
    }
    return filtered;
  }, [rawResults, searchQuery, sortOrder, examList]);

  const [isExporting, setIsExporting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressStep, setProgressStep] = useState(0);
  const pdfRef = useRef<HTMLDivElement>(null);

  const exportCsv = () => {
    if (!results.length) return;
    const headers = ["Exam", "Student Name", "Student ID", "Type", "Score", "Date"];
    const rows = results.map(r => {
      const profile = normalizeStudentProfile(r.studentProfile);
      const title = getExamTitle(examList, r.examId);
      const score = formatResultScore(r.score);
      const type = formatExamTypeLabel(r.examType);
      const date = getSubmittedAtMs(r.submittedAt) > 0 ? new Date(getSubmittedAtMs(r.submittedAt)).toLocaleDateString() : "";
      return `"${title}","${profile.name}","${profile.studentId}","${type}","${score}","${date}"`;
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Leaderboard_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPdf = async () => {
    if (isExporting || !pdfRef.current || !results.length) return;
    setIsExporting(true);
    setProgressStep(1);
    setProgressText("Preparing leaderboard layout...");

    try {
      const [html2canvas, jsPDF] = await Promise.all([
        import("html2canvas").then(m => m.default),
        import("jspdf").then(m => m.jsPDF)
      ]);

      setProgressText("Rendering high-quality graphics...");
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
      setProgressText("Finalizing PDF export...");

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [794, 1123] });
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * 794) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, 794, imgHeight);
      heightLeft -= 1123;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, 794, imgHeight);
        heightLeft -= 1123;
      }

      pdf.save(`Leaderboard_Export_${new Date().toISOString().split("T")[0]}.pdf`);
      setProgressStep(2);
      setProgressText("Download Complete!");
      setTimeout(() => { setIsExporting(false); setProgressStep(0); }, 2000);
    } catch (err) {
      console.error(err);
      setProgressText("Error generating PDF.");
      setTimeout(() => { setIsExporting(false); setProgressStep(0); }, 3000);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-between gap-3 items-center">
        <h2 className="text-2xl font-bold">All Results Archive</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search student or exam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm w-48"
          />
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
          <Select value={sortOrder} onValueChange={(val: "latest" | "highest") => setSortOrder(val)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest First</SelectItem>
              <SelectItem value="highest">Highest Score</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={results.length === 0}>
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="purple" className="gap-2" onClick={exportPdf} disabled={results.length === 0 || isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export PDF
          </Button>
        </div>
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

      {/* Hidden PDF Layout */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <LeaderboardPdfTemplate ref={pdfRef} results={results} exams={examList} filterExam={filter} />
      </div>

      <Dialog open={isExporting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden p-8">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Generating Report</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            {progressStep === 1 ? (
              <div className="relative flex h-16 w-16 items-center justify-center">
                <Loader2 className="absolute h-16 w-16 animate-spin text-blue-500" />
                <FileText className="absolute h-6 w-6 text-blue-500" />
              </div>
            ) : progressStep === 2 ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </motion.div>
            ) : null}
            <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse text-center">
              {progressText}
            </p>
          </div>
        </DialogContent>
      </Dialog>
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

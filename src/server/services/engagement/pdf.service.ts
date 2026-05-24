import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { ExamResult } from "@/types";

const APP_NAME = "MCQ Pro";

async function loadPdfLib() {
  const mod = await import("pdf-lib");
  return mod;
}

export async function generateResultCertificate(
  resultId: string,
  uid: string
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await loadPdfLib();
  const db = getAdminDb();
  const resultSnap = await db.doc(paths.result(resultId)).get();
  if (!resultSnap.exists) throw new Error("Result not found");
  const result = { id: resultSnap.id, ...resultSnap.data() } as ExamResult;
  if (result.uid !== uid) throw new Error("Forbidden");

  const examSnap = await db.doc(paths.exam(result.examId)).get();
  const examTitle = String(examSnap.data()?.title ?? "Exam");
  const rankSnap = await db.doc(paths.examRank(result.examId, uid)).get();
  const rank = rankSnap.data()?.rank as number | undefined;
  const percentile = rankSnap.data()?.percentile as number | undefined;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  page.drawText(APP_NAME, { x: 50, y: height - 60, size: 14, font: fontReg, color: rgb(0.4, 0.4, 0.9) });
  page.drawText("Exam Result Certificate", { x: 50, y: height - 100, size: 24, font });
  page.drawText(examTitle, { x: 50, y: height - 140, size: 16, font: fontReg });
  page.drawText(`Student: ${result.studentProfile?.name ?? "Student"}`, { x: 50, y: height - 180, size: 12, font: fontReg });
  page.drawText(`ID: ${result.studentProfile?.studentId ?? "—"}`, { x: 50, y: height - 200, size: 12, font: fontReg });
  page.drawText(`Score: ${result.score}${result.maxScore ? ` / ${result.maxScore}` : ""}`, { x: 50, y: height - 240, size: 14, font });
  if (rank != null) {
    page.drawText(`Rank: #${rank}${percentile != null ? ` · Top ${percentile}%` : ""}`, { x: 50, y: height - 270, size: 12, font: fontReg });
  }
  page.drawText(`Verify: ${resultId}`, { x: 50, y: 80, size: 8, font: fontReg, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(`Generated ${new Date().toISOString().slice(0, 10)}`, { x: 50, y: 65, size: 8, font: fontReg, color: rgb(0.5, 0.5, 0.5) });

  return pdf.save();
}

export async function generateAchievementCertificate(
  uid: string,
  badgeId: string
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await loadPdfLib();
  const db = getAdminDb();
  const profile = await db.doc(paths.userProfile(uid)).get();
  const badges = (profile.data()?.badges ?? []) as string[];
  if (!badges.includes(badgeId)) throw new Error("Achievement not earned");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  page.drawText("Achievement Certificate", { x: 50, y: height - 100, size: 24, font });
  page.drawText(String(profile.data()?.name ?? "Student"), { x: 50, y: height - 160, size: 18, font: fontReg });
  page.drawText(`Badge: ${badgeId.replace(/_/g, " ").toUpperCase()}`, { x: 50, y: height - 200, size: 14, font });
  page.drawText(`Verify: ${uid}:${badgeId}`, { x: 50, y: 80, size: 8, font: fontReg, color: rgb(0.5, 0.5, 0.5) });

  return pdf.save();
}

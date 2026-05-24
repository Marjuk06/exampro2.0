import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { ExamResult } from "@/types";

const APP_NAME = "MCQ Pro";
const VERIFY_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://mcqpro.app";

async function loadPdfLib() {
  return import("pdf-lib");
}

async function generateQRCode(text: string): Promise<Uint8Array> {
  const QRCode = await import("qrcode");
  const dataUrl = await QRCode.toDataURL(text, {
    width: 80,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  // Extract base64 after "data:image/png;base64,"
  const base64 = dataUrl.split(",")[1] ?? "";
  return Buffer.from(base64, "base64");
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

// ─── Result Certificate ───────────────────────────────────────────────────────

export async function generateResultCertificate(
  resultId: string,
  uid: string
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts, degrees } = await loadPdfLib();
  const db = getAdminDb();

  const resultSnap = await db.doc(paths.result(resultId)).get();
  if (!resultSnap.exists) throw new Error("Result not found");
  const result = { id: resultSnap.id, ...resultSnap.data() } as ExamResult;
  if (result.uid !== uid) throw new Error("Forbidden");

  const examSnap = await db.doc(paths.exam(result.examId)).get();
  const examTitle = String(examSnap.data()?.title ?? "Exam");
  const examSubject = String(examSnap.data()?.subject ?? "");

  const rankSnap = await db.doc(paths.examRank(result.examId, uid)).get();
  const rank = rankSnap.data()?.rank as number | undefined;
  const percentile = rankSnap.data()?.percentile as number | undefined;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);

  // Background gradient (simulated with layered rectangles)
  const [r1, g1, b1] = hexToRgb("0F172A");
  const [r2, g2, b2] = hexToRgb("1E3A5F");
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(r1, g1, b1) });
  page.drawRectangle({ x: 0, y: height * 0.55, width, height: height * 0.45, color: rgb(r2, g2, b2) });

  // Top accent bar
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: rgb(0.24, 0.57, 0.96) });

  // Watermark
  page.drawText("MCQ PRO", {
    x: 120,
    y: height / 2 - 20,
    size: 90,
    font: bold,
    color: rgb(1, 1, 1),
    opacity: 0.04,
    rotate: degrees(-35),
  });

  // App name
  page.drawText(APP_NAME, {
    x: 50,
    y: height - 50,
    size: 13,
    font: bold,
    color: rgb(0.24, 0.57, 0.96),
  });

  // Title
  page.drawText("EXAM RESULT CERTIFICATE", {
    x: 50,
    y: height - 100,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(examTitle, {
    x: 50,
    y: height - 130,
    size: 14,
    font: reg,
    color: rgb(0.7, 0.8, 1),
  });
  if (examSubject) {
    page.drawText(examSubject, {
      x: 50,
      y: height - 150,
      size: 11,
      font: reg,
      color: rgb(0.5, 0.6, 0.8),
    });
  }

  // Divider
  page.drawLine({
    start: { x: 50, y: height - 168 },
    end: { x: width - 50, y: height - 168 },
    thickness: 0.5,
    color: rgb(0.24, 0.57, 0.96),
    opacity: 0.4,
  });

  // Student info
  const studentName = result.studentProfile?.name ?? "Student";
  const studentId = result.studentProfile?.studentId ?? "—";
  page.drawText("Awarded to", {
    x: 50,
    y: height - 200,
    size: 10,
    font: reg,
    color: rgb(0.5, 0.6, 0.8),
  });
  page.drawText(studentName, {
    x: 50,
    y: height - 225,
    size: 26,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Student ID: ${studentId}`, {
    x: 50,
    y: height - 250,
    size: 11,
    font: reg,
    color: rgb(0.5, 0.6, 0.8),
  });

  // Score card
  const scorePercent = result.percentage ?? 0;
  const scoreColor =
    scorePercent >= 80
      ? rgb(0.13, 0.77, 0.37)
      : scorePercent >= 60
        ? rgb(0.96, 0.73, 0.15)
        : rgb(0.93, 0.27, 0.27);

  page.drawRectangle({ x: 50, y: height - 340, width: 160, height: 70, color: rgb(0.1, 0.17, 0.3) });
  page.drawText("SCORE", { x: 68, y: height - 288, size: 9, font: reg, color: rgb(0.5, 0.6, 0.8) });
  page.drawText(`${result.score}/${result.maxScore ?? "?"}`, { x: 68, y: height - 308, size: 20, font: bold, color: scoreColor });
  page.drawText(`${scorePercent}%`, { x: 68, y: height - 328, size: 11, font: reg, color: scoreColor });

  if (rank != null) {
    page.drawRectangle({ x: 230, y: height - 340, width: 160, height: 70, color: rgb(0.1, 0.17, 0.3) });
    page.drawText("RANK", { x: 248, y: height - 288, size: 9, font: reg, color: rgb(0.5, 0.6, 0.8) });
    page.drawText(`#${rank}`, { x: 248, y: height - 308, size: 20, font: bold, color: rgb(0.24, 0.57, 0.96) });
    if (percentile != null) {
      page.drawText(`Top ${percentile}%`, { x: 248, y: height - 328, size: 11, font: reg, color: rgb(0.5, 0.7, 1) });
    }
  }

  // QR code verification
  try {
    const qrData = await generateQRCode(`${VERIFY_BASE_URL}/verify/${resultId}`);
    const qrImage = await pdf.embedPng(qrData);
    page.drawImage(qrImage, { x: width - 130, y: 60, width: 80, height: 80 });
    page.drawText("Scan to verify", { x: width - 130, y: 50, size: 7, font: reg, color: rgb(0.4, 0.5, 0.7) });
  } catch {
    // QR generation failure is non-blocking
  }

  // Footer
  page.drawText(`Issued: ${new Date().toISOString().slice(0, 10)}`, {
    x: 50, y: 80, size: 8, font: reg, color: rgb(0.3, 0.4, 0.6),
  });
  page.drawText(`Verify ID: ${resultId}`, {
    x: 50, y: 65, size: 7, font: reg, color: rgb(0.25, 0.35, 0.5),
  });

  return pdf.save();
}

// ─── Achievement Certificate ──────────────────────────────────────────────────

export async function generateAchievementCertificate(
  uid: string,
  badgeId: string
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts, degrees } = await loadPdfLib();
  const db = getAdminDb();

  const profileSnap = await db.doc(paths.userProfile(uid)).get();
  const profile = profileSnap.data() ?? {};
  const badges = (profile.badges ?? []) as string[];
  if (!badges.includes(badgeId)) throw new Error("Achievement not earned");

  const studentName = String(profile.name ?? "Student");
  const badgeLabel = badgeId.replace(/_/g, " ").toUpperCase();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);

  const [r1, g1, b1] = hexToRgb("0F172A");
  const [r2, g2, b2] = hexToRgb("1A1F3A");
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(r1, g1, b1) });
  page.drawRectangle({ x: 0, y: height * 0.5, width, height: height * 0.5, color: rgb(r2, g2, b2) });
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: rgb(0.92, 0.67, 0.13) });

  page.drawText("MCQ PRO", {
    x: 130, y: height / 2 - 20, size: 90, font: bold,
    color: rgb(1, 1, 1), opacity: 0.04, rotate: degrees(-35),
  });

  page.drawText(APP_NAME, { x: 50, y: height - 50, size: 13, font: bold, color: rgb(0.92, 0.67, 0.13) });
  page.drawText("ACHIEVEMENT CERTIFICATE", { x: 50, y: height - 100, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawLine({
    start: { x: 50, y: height - 115 },
    end: { x: width - 50, y: height - 115 },
    thickness: 0.5,
    color: rgb(0.92, 0.67, 0.13),
    opacity: 0.4,
  });

  page.drawText("Awarded to", { x: 50, y: height - 160, size: 10, font: reg, color: rgb(0.5, 0.6, 0.8) });
  page.drawText(studentName, { x: 50, y: height - 190, size: 28, font: bold, color: rgb(1, 1, 1) });

  page.drawText("for unlocking the achievement", { x: 50, y: height - 250, size: 12, font: reg, color: rgb(0.5, 0.6, 0.8) });
  page.drawRectangle({ x: 50, y: height - 330, width: width - 100, height: 60, color: rgb(0.1, 0.1, 0.2) });
  page.drawText(badgeLabel, {
    x: 70, y: height - 300, size: 20, font: bold, color: rgb(0.92, 0.67, 0.13),
  });

  try {
    const qrData = await generateQRCode(`${VERIFY_BASE_URL}/verify/achievement/${uid}/${badgeId}`);
    const qrImage = await pdf.embedPng(qrData);
    page.drawImage(qrImage, { x: width - 130, y: 60, width: 80, height: 80 });
    page.drawText("Scan to verify", { x: width - 130, y: 50, size: 7, font: reg, color: rgb(0.4, 0.5, 0.7) });
  } catch {
    // Non-blocking
  }

  page.drawText(`Issued: ${new Date().toISOString().slice(0, 10)}`, { x: 50, y: 80, size: 8, font: reg, color: rgb(0.3, 0.4, 0.6) });
  page.drawText(`Verify: ${uid}:${badgeId}`, { x: 50, y: 65, size: 7, font: reg, color: rgb(0.25, 0.35, 0.5) });

  return pdf.save();
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export async function generateResultsCsv(
  db: ReturnType<typeof getAdminDb>,
  examId: string
): Promise<string> {
  const snap = await db
    .collection(paths.results())
    .where("examId", "==", examId)
    .orderBy("submittedAt", "desc")
    .limit(1000)
    .get();

  const header = [
    "Student Name",
    "Student ID",
    "Score",
    "Max Score",
    "Percentage",
    "Rank",
    "Submitted At",
    "Time (mins)",
  ].join(",");

  const rows = snap.docs.map((d) => {
    const r = d.data();
    const name = String(r.studentProfile?.name ?? "").replace(/,/g, " ");
    const studentId = String(r.studentProfile?.studentId ?? "");
    const score = Number(r.score ?? 0);
    const maxScore = Number(r.maxScore ?? 0);
    const pct = Number(r.percentage ?? 0);
    const rank = Number(r.rank ?? 0);
    const date = new Date(Number(r.submittedAt ?? 0)).toISOString().slice(0, 19);
    const mins = Math.round(Number(r.timeTakenMs ?? 0) / 60000);
    return [name, studentId, score, maxScore, pct, rank, date, mins].join(",");
  });

  return [header, ...rows].join("\n");
}

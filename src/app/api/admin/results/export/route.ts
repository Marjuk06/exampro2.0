import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler } from "@/server/api/handler";
import { ApiError } from "@/server/api/response";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateResultsCsv } from "@/server/services/engagement/pdf.service";

/**
 * GET /api/admin/results/export?examId=...&format=csv|pdf
 *
 * Exports exam results as CSV (default) or summary PDF.
 */
export const GET = withApiHandler(async (request) => {
  const session = await requireAuth();
  if (session.role !== "admin" && session.role !== "superadmin") {
    throw new ApiError(403, "Admin only");
  }

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  if (!examId) throw new ApiError(400, "examId required");

  const db = getAdminDb();
  const csv = await generateResultsCsv(db, examId);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exam-results-${examId}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});

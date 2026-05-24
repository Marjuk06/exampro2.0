import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler } from "@/server/api/handler";
import {
  generateAchievementCertificate,
  generateResultCertificate,
} from "@/server/services/engagement/pdf.service";

export const GET = withApiHandler(
  async (request, context) => {
    const session = await requireAuth();
    const { type } = await (context as { params: Promise<{ type: string }> }).params;
    const { searchParams } = new URL(request.url);
    const resultId = searchParams.get("resultId");
    const badgeId = searchParams.get("badgeId");

    let pdf: Uint8Array;
    let filename = "report.pdf";

    if (type === "result" && resultId) {
      pdf = await generateResultCertificate(resultId, session.uid);
      filename = `result-${resultId}.pdf`;
    } else if (type === "achievement" && badgeId) {
      pdf = await generateAchievementCertificate(session.uid, badgeId);
      filename = `achievement-${badgeId}.pdf`;
    } else {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
);

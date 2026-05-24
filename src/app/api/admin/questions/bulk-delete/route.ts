import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { withApiHandler, jsonOk } from "@/server/api/handler";
import { adminActionLog } from "@/server/security/logger";
import { adminQuestionService } from "@/server/services/admin-question.service";

export const POST = withApiHandler(async (request) => {
  const session = await requireAdmin();
  const body = await request.json();
  const items = body.items as Array<{ id: string; examId: string }>;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Invalid items array" }, { status: 400 });
  }

  await adminQuestionService.bulkDelete(items);
  adminActionLog(session.uid, "question.bulkDelete", { count: items.length });

  return jsonOk({ success: true, count: items.length });
});

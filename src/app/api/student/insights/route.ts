import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { computeStudentInsights } from "@/server/services/engagement/student-insights.service";
import { getRankHistory } from "@/server/services/engagement/rank-history.service";

export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const db = getAdminDb();
  const [insights, rankHistory] = await Promise.all([
    computeStudentInsights(db, session.uid),
    getRankHistory(db, session.uid, 15),
  ]);
  return jsonOk({ insights, rankHistory });
});

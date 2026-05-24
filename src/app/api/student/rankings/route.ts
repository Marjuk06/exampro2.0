import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import {
  getGlobalRankPosition,
  getNearbyRanks,
  getSubjectRank,
} from "@/server/services/engagement/rankings.service";
import { getRankHistory } from "@/server/services/engagement/rank-history.service";

export const GET = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  const subject = searchParams.get("subject");

  const db = getAdminDb();
  const [globalRank, rankHistory] = await Promise.all([
    getGlobalRankPosition(session.uid),
    getRankHistory(db, session.uid, 20),
  ]);

  let nearby: Awaited<ReturnType<typeof getNearbyRanks>> = [];
  if (examId) nearby = await getNearbyRanks(examId, session.uid);

  let subjectRank = null;
  if (subject) subjectRank = await getSubjectRank(subject, session.uid);

  const profileSnap = await db.doc(paths.userProfile(session.uid)).get();
  const favoriteSubjects = (profileSnap.data()?.favoriteSubjects as string[]) ?? [];

  return jsonOk({
    globalRank,
    subjectRank,
    nearby,
    rankHistory,
    favoriteSubjects,
  });
});

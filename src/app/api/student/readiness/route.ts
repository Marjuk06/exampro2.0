import { requireAuth } from "@/server/auth/require-auth";
import { withApiHandler, jsonOk } from "@/server/api/handler";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { computeStudentInsights } from "@/server/services/engagement/student-insights.service";
import {
  computeExamReadiness,
  buildSmartPracticeQueue,
} from "@/server/services/ai/adaptive.service";
import { trackQuery } from "@/server/observability/query-metrics";

/**
 * GET /api/student/readiness?examId=...
 * Returns an Exam Readiness Score and smart practice queue for the student.
 */
export const GET = withApiHandler(async (request) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId") ?? undefined;

  const db = getAdminDb();
  const uid = session.uid;

  const [engSnap, rankSnap] = await trackQuery("readiness.load_engagement", () =>
    Promise.all([
      db.doc(paths.userEngagement(uid)).get(),
      db
        .collection(paths.userRankHistory(uid))
        .orderBy("submittedAt", "desc")
        .limit(5)
        .get(),
    ])
  );

  const eng = engSnap.data() ?? {};
  const streakDays = Number(eng.streakDays ?? 0);

  // Count practice sessions this week
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const practiceSnap = await trackQuery("readiness.practice_count", () =>
    db
      .collection(paths.userPracticeSessions(uid))
      .where("createdAt", ">=", weekAgo)
      .limit(7)
      .get()
  );
  const practiceDaysThisWeek = practiceSnap.size;

  // Get average accuracy and percentile from rank history
  const rankDocs = rankSnap.docs.map((d) => d.data());
  const avgPercentile =
    rankDocs.length > 0
      ? rankDocs.reduce((s, d) => s + Number(d.percentile ?? 50), 0) /
        rankDocs.length
      : 50;
  const avgAccuracy =
    rankDocs.length > 0
      ? rankDocs.reduce((s, d) => s + Number(d.accuracy ?? 50), 0) /
        rankDocs.length
      : 0;

  const readiness = computeExamReadiness(
    avgAccuracy,
    avgPercentile,
    streakDays,
    practiceDaysThisWeek
  );

  // Smart practice queue — focused on exam subject if examId provided
  let subject: string | undefined;
  if (examId) {
    const examSnap = await db.doc(paths.exam(examId)).get();
    subject = examSnap.data()?.subject as string | undefined;
  }

  const smartQueue = await buildSmartPracticeQueue(db, {
    uid,
    subject,
    limit: 10,
    weakFocused: true,
  });

  return jsonOk({
    readiness,
    smartQueue: smartQueue.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      imageUrl: q.imageUrl,
      subject: q.subject,
      chapter: q.tags?.[0] ?? q.sectionId ?? "General",
    })),
  });
});

import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import type { Exam, ExamResult, Question } from "@/types";
import type { StudentInsights, TopicPerformance } from "@/types/engagement";

function chapterFromQuestion(q: Question): string {
  return q.tags?.[0] ?? q.sectionId ?? "General";
}

/**
 * Batch-load questions for a set of exam IDs in parallel.
 * Returns a Map<examId, Question[]> — O(unique_exams) reads, not O(results).
 */
async function batchLoadQuestionsByExam(
  db: Firestore,
  examIds: Set<string>
): Promise<Map<string, Question[]>> {
  const map = new Map<string, Question[]>();
  if (examIds.size === 0) return map;

  await Promise.all(
    [...examIds].map(async (examId) => {
      const snap = await db
        .collection(paths.questions())
        .where("examId", "==", examId)
        .limit(100)
        .get();
      map.set(
        examId,
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question)
      );
    })
  );
  return map;
}

export async function computeStudentInsights(
  db: Firestore,
  uid: string
): Promise<StudentInsights> {
  const [resultsSnap, mistakesSnap, examsSnap] = await Promise.all([
    db
      .collection(paths.results())
      .where("uid", "==", uid)
      .orderBy("submittedAt", "desc")
      .limit(80)
      .get(),
    db.collection(paths.userMistakes(uid)).limit(200).get(),
    db.collection(paths.exams()).limit(100).get(),
  ]);

  const exams = new Map(
    examsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Exam])
  );

  // ✅ FIXED: Collect all unique exam IDs from results, then batch-load questions
  // in parallel. Before: up to 80 sequential Firestore reads. After: N_unique_exams parallel reads.
  const uniqueExamIds = new Set<string>();
  for (const doc of resultsSnap.docs) {
    const r = doc.data() as ExamResult;
    if (typeof r.score === "number" && r.answers) {
      uniqueExamIds.add(r.examId);
    }
  }
  const questionsByExam = await batchLoadQuestionsByExam(db, uniqueExamIds);

  const topicMap = new Map<string, TopicPerformance>();

  for (const doc of resultsSnap.docs) {
    const r = doc.data() as ExamResult;
    if (typeof r.score !== "number" || !r.answers) continue;

    const exam = exams.get(r.examId);
    const subject = exam?.subject ?? "General";
    const questions = questionsByExam.get(r.examId) ?? [];

    for (const q of questions) {
      const chapter = chapterFromQuestion(q);
      const key = `${subject}::${chapter}`;
      const prev = topicMap.get(key) ?? {
        subject,
        chapter,
        attempted: 0,
        correct: 0,
        accuracy: 0,
        avgTimeMs: 0,
      };
      const ans = r.answers[q.id];
      if (ans === undefined) continue;
      prev.attempted += 1;
      if (ans === q.correctIndex) prev.correct += 1;
      topicMap.set(key, prev);
    }
  }

  for (const m of mistakesSnap.docs) {
    const d = m.data();
    const subject = String(d.subject ?? "General");
    const chapter = String(d.chapter ?? "General");
    const key = `${subject}::${chapter}`;
    const prev = topicMap.get(key) ?? {
      subject,
      chapter,
      attempted: 0,
      correct: 0,
      accuracy: 0,
      avgTimeMs: 0,
    };
    prev.attempted += 1;
    topicMap.set(key, prev);
  }

  const topics = [...topicMap.values()].map((t) => ({
    ...t,
    accuracy:
      t.attempted > 0 ? Math.round((t.correct / t.attempted) * 1000) / 10 : 0,
  }));

  const sorted = [...topics].sort((a, b) => a.accuracy - b.accuracy);
  const weakestTopics = sorted.filter((t) => t.attempted >= 3).slice(0, 5);
  const strongestTopics = [...topics]
    .filter((t) => t.attempted >= 3)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);

  const weakSubjects = [...new Set(weakestTopics.map((t) => t.subject))];
  const weakChapters = weakestTopics.map((t) => `${t.subject} — ${t.chapter}`);

  const recommendations: string[] = [];
  if (weakestTopics[0]) {
    recommendations.push(
      `Practice ${weakestTopics[0].chapter} in ${weakestTopics[0].subject} (${weakestTopics[0].accuracy}% accuracy)`
    );
  }
  if (mistakesSnap.size > 0) {
    recommendations.push(`Review ${mistakesSnap.size} saved mistakes`);
  }
  recommendations.push("Complete today's daily challenge for bonus XP");

  const totalAttempted = topics.reduce((a, t) => a + t.attempted, 0);
  const totalCorrect = topics.reduce((a, t) => a + t.correct, 0);

  const mcqResults = resultsSnap.docs
    .map((d) => d.data() as ExamResult)
    .filter((r) => typeof r.score === "number")
    .slice(0, 10)
    .reverse();

  const improvementTrend = mcqResults.map((r, i) => {
    const exam = exams.get(r.examId);
    return {
      label: (exam?.title ?? `Exam ${i + 1}`).slice(0, 10),
      accuracy: r.percentage ?? 0,
    };
  });

  return {
    strongestTopics,
    weakestTopics,
    weakSubjects,
    weakChapters,
    recommendations,
    totalQuestionsAttempted: totalAttempted,
    avgAccuracy:
      totalAttempted > 0
        ? Math.round((totalCorrect / totalAttempted) * 1000) / 10
        : 0,
    avgTimeMs: 0,
    improvementTrend,
    heatmap: topics.map((t) => ({
      subject: t.subject,
      chapter: t.chapter,
      accuracy: t.accuracy,
    })),
  };
}

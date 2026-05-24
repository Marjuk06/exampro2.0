import type { Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/paths";
import { trackQuery } from "@/server/observability/query-metrics";
import type { Question } from "@/types";

// ─── Exam Readiness Score ─────────────────────────────────────────────────────

export interface ExamReadinessResult {
  score: number;       // 0–100
  label: "Not Ready" | "Developing" | "Exam Ready" | "Expert";
  breakdown: {
    accuracy: number;
    percentile: number;
    streak: number;
    practiceConsistency: number;
  };
  recommendation: string;
}

/**
 * Compute an Exam Readiness Score — a weighted heuristic:
 *   accuracy × 0.40 + percentile × 0.30 + streak_normalized × 0.15 + practice_consistency × 0.15
 *
 * All inputs server-side. No external AI needed.
 */
export function computeExamReadiness(
  avgAccuracy: number,        // 0–100
  avgPercentile: number,      // 0–100 (top percentile = lower number → invert)
  streakDays: number,
  practiceDaysThisWeek: number
): ExamReadinessResult {
  const accuracyScore = Math.min(100, avgAccuracy);
  const percentileScore = Math.min(100, 100 - avgPercentile); // top 10% → 90 points
  const streakScore = Math.min(100, (streakDays / 30) * 100);
  const practiceScore = Math.min(100, (practiceDaysThisWeek / 7) * 100);

  const raw =
    accuracyScore * 0.4 +
    percentileScore * 0.3 +
    streakScore * 0.15 +
    practiceScore * 0.15;

  const score = Math.round(raw);

  const label: ExamReadinessResult["label"] =
    score >= 80 ? "Expert"
    : score >= 60 ? "Exam Ready"
    : score >= 35 ? "Developing"
    : "Not Ready";

  const recommendation =
    score >= 80
      ? "You're in peak form. Take the exam with confidence!"
      : score >= 60
        ? "Good preparation. Focus on your weakest topics for a final boost."
        : score >= 35
          ? "Keep practicing! Focus on accuracy and maintain your daily streak."
          : "Take more practice sessions, especially on weak topics, before the exam.";

  return {
    score,
    label,
    breakdown: {
      accuracy: Math.round(accuracyScore),
      percentile: Math.round(percentileScore),
      streak: Math.round(streakScore),
      practiceConsistency: Math.round(practiceScore),
    },
    recommendation,
  };
}

// ─── Adaptive Question Ranking ────────────────────────────────────────────────

interface QuestionWeight {
  questionId: string;
  weight: number;
}

/**
 * Adaptive difficulty engine:
 * 1. Score each question by how often the user got it wrong (higher = prioritize more)
 * 2. Apply recency decay — recent mistakes count more
 * 3. Return question IDs sorted by priority (highest first)
 *
 * No external AI needed — pure heuristic.
 */
export async function rankQuestionsAdaptively(
  db: Firestore,
  uid: string,
  candidateQuestions: Question[]
): Promise<Question[]> {
  if (candidateQuestions.length === 0) return [];

  // Load mistake records for these question IDs
  const questionIds = candidateQuestions.map((q) => q.id);
  const mistakeDocs = await trackQuery("adaptive.load_mistakes", () =>
    db
      .collection(paths.userMistakes(uid))
      .limit(300)
      .get()
  );

  const mistakeMap = new Map<string, { updatedAt: number; count: number }>();
  for (const doc of mistakeDocs.docs) {
    if (questionIds.includes(doc.id)) {
      const d = doc.data();
      mistakeMap.set(doc.id, {
        updatedAt: Number(d.updatedAt ?? 0),
        count: Number(d.errorCount ?? 1),
      });
    }
  }

  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const weights: QuestionWeight[] = candidateQuestions.map((q) => {
    const mistake = mistakeMap.get(q.id);
    if (!mistake) return { questionId: q.id, weight: 0 };

    // Exponential recency decay: weight × e^(-age/1_week)
    const ageDays = (now - mistake.updatedAt) / ONE_WEEK_MS;
    const decayed = mistake.count * Math.exp(-ageDays);
    return { questionId: q.id, weight: decayed };
  });

  const questionMap = new Map(candidateQuestions.map((q) => [q.id, q]));

  // Sort: highest weight first, then shuffle equally-weighted questions
  return weights
    .sort((a, b) => {
      if (Math.abs(b.weight - a.weight) < 0.001) return Math.random() - 0.5;
      return b.weight - a.weight;
    })
    .map((w) => questionMap.get(w.questionId)!)
    .filter(Boolean);
}

// ─── Smart Practice Queue ─────────────────────────────────────────────────────

export interface SmartQueueOptions {
  uid: string;
  subject?: string;
  limit?: number;
  /** If true, force focus on flagged weak topics from insights */
  weakFocused?: boolean;
}

/**
 * Builds a personalized smart practice queue:
 * 1. Load mistakes + weak topic data
 * 2. Weight candidate questions
 * 3. Return ordered queue
 */
export async function buildSmartPracticeQueue(
  db: Firestore,
  options: SmartQueueOptions
): Promise<Question[]> {
  const limit = Math.min(50, options.limit ?? 20);

  // Load candidate questions
  let qSnap;
  if (options.subject) {
    qSnap = await trackQuery("adaptive.load_questions_by_subject", () =>
      db
        .collection(paths.questions())
        .where("subject", "==", options.subject)
        .limit(100)
        .get()
    );
  } else {
    qSnap = await trackQuery("adaptive.load_questions_random", () =>
      db.collection(paths.questions()).limit(100).get()
    );
  }

  const candidates = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);

  const ranked = await rankQuestionsAdaptively(db, options.uid, candidates);
  return ranked.slice(0, limit);
}

// ─── Confidence Score ─────────────────────────────────────────────────────────

/**
 * Per-topic confidence: accuracy weighted by question count and recency.
 * Returns a 0–100 score per topic.
 */
export function computeTopicConfidence(
  accuracy: number,
  attempted: number,
  daysSinceLastAttempt: number
): number {
  if (attempted === 0) return 0;
  const sampleConfidence = Math.min(1, attempted / 10); // 10+ attempts = full confidence
  const recencyDecay = Math.exp(-daysSinceLastAttempt / 14); // decay over 2 weeks
  return Math.round(accuracy * sampleConfidence * recencyDecay);
}

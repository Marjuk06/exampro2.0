import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { practiceService } from "@/server/services/engagement/practice.service";
import type { PracticeMode } from "@/types/engagement";

export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const history = await practiceService.getHistory(session.uid);
  return jsonOk({ history });
});

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const body = await request.json();
  const { action } = body as { action: string };

  if (action === "start") {
    const { mode, subject, chapter, limit } = body as {
      mode: PracticeMode;
      subject?: string;
      chapter?: string;
      limit?: number;
    };
    const { session: practiceSession, questions } = await practiceService.startSession(
      session.uid,
      mode,
      { subject, chapter, limit }
    );
    return jsonOk({
      session: practiceSession,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        imageUrl: q.imageUrl,
        points: q.points,
        difficulty: q.difficulty,
      })),
    });
  }

  if (action === "submit") {
    const { sessionId, answers, timeTakenMs } = body as {
      sessionId: string;
      answers: Record<string, number>;
      timeTakenMs: number;
    };
    const result = await practiceService.submitSession(
      session.uid,
      sessionId,
      answers,
      timeTakenMs
    );
    return jsonOk(result);
  }

  return jsonOk({ error: "Unknown action" }, 400);
});

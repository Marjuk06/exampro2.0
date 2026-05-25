import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { ApiError } from "@/server/api/response";
import { jsonError, jsonOk } from "@/server/api/response";
import { liveSessionRepository } from "@/server/repositories/live-session.repository";
import { rateLimit } from "@/server/security/rate-limit";
import type { LiveSession } from "@/types";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimit(`live:${session.uid}`);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { examId, examTitle, duration, studentName, studentId, isRetake } =
      await request.json();

    const sessionId = liveSessionRepository.sessionId(session.uid, examId);
    const existing = await liveSessionRepository.get(sessionId);
    const now = Date.now();

    if (existing && existing.uid !== session.uid) {
      throw new ApiError(403, "Session conflict");
    }

    if (existing && existing.endTime > now) {
      return jsonOk({
        sessionId,
        endTime: existing.endTime,
        resumed: true,
      });
    }

    if (existing) {
      await liveSessionRepository.delete(sessionId);
    }

    const endTime = now + duration * 60_000;
    const liveSession: LiveSession = {
      id: sessionId,
      uid: session.uid,
      studentName,
      studentId,
      examId,
      examTitle,
      startTime: now,
      endTime,
      timeRequested: false,
    };

    await liveSessionRepository.set(sessionId, liveSession);

    if (isRetake) {
      const { retakeRepository } = await import("@/server/repositories/retake.repository");
      const retakes = await retakeRepository.findRecentByUserExam(session.uid, examId, 0);
      const approved = retakes.filter(r => r.status === "approved").sort((a,b) => b.timestamp - a.timestamp);
      if (approved.length > 0) {
        await retakeRepository.update(approved[0].id, { status: "used" });
      }
    }

    return jsonOk({ sessionId, endTime, resumed: false });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");
    if (!examId) {
      return NextResponse.json({ error: "examId required" }, { status: 400 });
    }

    const sessionId = liveSessionRepository.sessionId(session.uid, examId);
    const live = await liveSessionRepository.get(sessionId);
    if (live && live.uid === session.uid) {
      await liveSessionRepository.delete(sessionId);
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, answers, bookmarks, timeRequested, heartbeat } =
      await request.json();
    if (!sessionId || typeof sessionId !== "string") {
      throw new ApiError(400, "sessionId required");
    }

    await liveSessionRepository.assertOwner(sessionId, session.uid);

    if (heartbeat === true) {
      await liveSessionRepository.heartbeat(sessionId);
      return jsonOk({ ok: true });
    }

    const updates: Partial<LiveSession> = {};
    if (answers) updates.answers = answers;
    if (bookmarks) updates.bookmarks = bookmarks;
    if (timeRequested !== undefined) updates.timeRequested = timeRequested;

    await liveSessionRepository.merge(sessionId, {
      ...updates,
      lastHeartbeat: Date.now(),
    });

    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

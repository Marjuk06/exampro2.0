import type { LiveSession } from "@/types";

/** Session is actively in progress (timer not expired). */
export function isLiveSessionActive(session: LiveSession, now: number): boolean {
  return session.endTime > now;
}

export function filterActiveLiveSessions(
  sessions: LiveSession[],
  now: number
): LiveSession[] {
  return sessions.filter((s) => isLiveSessionActive(s, now));
}

/** Expired sessions left in Firestore after tab close / crash. */
export function isLiveSessionStale(session: LiveSession, now: number): boolean {
  return session.endTime <= now;
}

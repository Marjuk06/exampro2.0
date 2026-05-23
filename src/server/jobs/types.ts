export type JobType =
  | "ranking.refresh_exam"
  | "analytics.rebuild"
  | "notifications.digest"
  | "live_sessions.prune"
  | "leaderboard.rebuild_period";

export interface JobPayload {
  type: JobType;
  payload: Record<string, unknown>;
  attempts?: number;
  enqueuedAt: number;
}

export interface JobHandler {
  type: JobType;
  run(payload: Record<string, unknown>): Promise<void>;
}

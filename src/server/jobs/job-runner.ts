import type { JobHandler, JobPayload } from "@/server/jobs/types";

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(handler: JobHandler): void {
  handlers.set(handler.type, handler);
}

/** Inline runner — swap for Cloud Tasks / Pub/Sub later */
export async function runJob(job: JobPayload): Promise<void> {
  const { ensureJobHandlersRegistered } = await import(
    "@/server/jobs/register-handlers"
  );
  ensureJobHandlersRegistered();
  const handler = handlers.get(job.type);
  if (!handler) {
    console.warn("[job] no handler for", job.type);
    return;
  }
  await handler.run(job.payload);
}

export async function enqueueJob(
  job: Omit<JobPayload, "enqueuedAt">
): Promise<void> {
  const full: JobPayload = { ...job, enqueuedAt: Date.now() };
  // Fire-and-forget inline; production: publish to queue
  runJob(full).catch((e) =>
    console.error("[job] failed", job.type, e)
  );
}

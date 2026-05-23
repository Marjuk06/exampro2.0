type SecurityEvent =
  | "auth_failed"
  | "admin_action"
  | "rate_limit"
  | "forbidden"
  | "session_created";

export function securityLog(
  event: SecurityEvent,
  data?: Record<string, unknown>
): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...data,
  };
  console.info("[security]", JSON.stringify(entry));
}

export function adminActionLog(
  uid: string,
  action: string,
  meta?: Record<string, unknown>
): void {
  securityLog("admin_action", { uid, action, ...meta });
}

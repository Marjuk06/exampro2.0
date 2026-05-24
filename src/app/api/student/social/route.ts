import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { getPublicActivityFeed } from "@/server/services/engagement/activity.service";
import { socialService } from "@/server/services/engagement/social.service";

export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const [connections, feed] = await Promise.all([
    socialService.listConnections(session.uid),
    getPublicActivityFeed(25),
  ]);
  return jsonOk({ connections, feed });
});

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const body = await request.json();

  if (body.action === "add") {
    const conn = await socialService.addConnection(
      session.uid,
      body.studentId,
      body.type ?? "friend"
    );
    return jsonOk({ connection: conn });
  }

  if (body.action === "compare" && body.otherUid) {
    const comparison = await socialService.compareWith(session.uid, body.otherUid);
    return jsonOk(comparison);
  }

  return jsonOk({ error: "Unknown action" }, 400);
});

export const DELETE = withApiHandler(async (request) => {
  const session = await requireAuth();
  const otherUid = new URL(request.url).searchParams.get("uid");
  if (!otherUid) return jsonOk({ error: "uid required" }, 400);
  await socialService.removeConnection(session.uid, otherUid);
  return jsonOk({ ok: true });
});

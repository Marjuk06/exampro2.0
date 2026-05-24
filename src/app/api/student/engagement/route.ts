import { requireAuth } from "@/server/auth/require-auth";
import { ApiError } from "@/server/api/response";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import {
  claimDailyReward,
  getEngagementHub,
} from "@/server/services/engagement/engagement-hub.service";

export const GET = withApiHandler(async () => {
  const session = await requireAuth();
  const hub = await getEngagementHub(session.uid);
  return jsonOk(hub);
});

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const body = await request.json();
  if (body.action === "claim_daily") {
    const result = await claimDailyReward(session.uid);
    const hub = await getEngagementHub(session.uid);
    return jsonOk({ ...result, hub });
  }
  throw new ApiError(400, "Unknown action");
});

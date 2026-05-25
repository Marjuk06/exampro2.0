import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { retakeRepository } from "@/server/repositories/retake.repository";

export const GET = withApiHandler(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  
  const requests = await retakeRepository.list({ status });
  return jsonOk(requests);
});

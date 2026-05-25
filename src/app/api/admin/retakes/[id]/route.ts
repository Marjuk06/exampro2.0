import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, parseJson, withApiHandler } from "@/server/api/handler";
import { retakeRepository } from "@/server/repositories/retake.repository";

const schema = z.object({
  status: z.enum(["approved", "rejected", "used"]),
});

export const PATCH = withApiHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request, context: any) => {
    await requireAdmin();
    const data = await parseJson(request, schema);
    const { id } = context.params as { id: string };

    await retakeRepository.update(id, { status: data.status });
    return jsonOk({ success: true });
  }
);

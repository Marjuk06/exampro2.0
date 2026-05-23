import { z } from "zod";
import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, parseJson, withApiHandler } from "@/server/api/handler";
import { retakeService } from "@/server/services/retake.service";
import { userRepository } from "@/server/repositories/user.repository";

const schema = z.object({
  examId: z.string().min(1),
  examTitle: z.string().min(1),
});

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const data = await parseJson(request, schema);
  const profile = await userRepository.getProfile(session.uid);
  if (!profile) {
    throw new (await import("@/server/api/response")).ApiError(404, "Profile not found");
  }

  const id = await retakeService.createRequest({
    uid: session.uid,
    studentName: profile.name,
    studentId: profile.studentId,
    examId: data.examId,
    examTitle: data.examTitle,
  });

  return jsonOk({ id });
});

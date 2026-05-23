import { RETAKE_COOLDOWN_HOURS } from "@/lib/constants";
import { retakeRepository } from "@/server/repositories/retake.repository";
import { ApiError } from "@/server/api/response";

export const retakeService = {
  async createRequest(input: {
    uid: string;
    studentName: string;
    studentId: string;
    examId: string;
    examTitle: string;
  }) {
    const since = Date.now() - RETAKE_COOLDOWN_HOURS * 60 * 60 * 1000;
    const recent = await retakeRepository.findRecentByUserExam(
      input.uid,
      input.examId,
      since
    );
    if (recent.length > 0) {
      throw new ApiError(
        429,
        `Please wait ${RETAKE_COOLDOWN_HOURS} hours before requesting again`
      );
    }

    return retakeRepository.create({
      uid: input.uid,
      studentName: input.studentName,
      studentId: input.studentId,
      examId: input.examId,
      examTitle: input.examTitle,
      timestamp: Date.now(),
    });
  },
};

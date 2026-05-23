import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { RetakeRequest } from "@/types";

export class RetakeRepository {
  private db = getAdminDb();

  async create(data: Omit<RetakeRequest, "id">): Promise<string> {
    const ref = await this.db.collection(paths.retakes()).add(data);
    return ref.id;
  }

  async delete(id: string): Promise<void> {
    await this.db.doc(paths.retake(id)).delete();
  }

  async findRecentByUserExam(
    uid: string,
    examId: string,
    sinceMs: number
  ): Promise<RetakeRequest[]> {
    const snap = await this.db
      .collection(paths.retakes())
      .where("uid", "==", uid)
      .where("examId", "==", examId)
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as RetakeRequest)
      .filter((r) => r.timestamp >= sinceMs);
  }
}

export const retakeRepository = new RetakeRepository();

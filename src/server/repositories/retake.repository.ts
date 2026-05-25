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

  async update(id: string, data: Partial<RetakeRequest>): Promise<void> {
    await this.db.doc(paths.retake(id)).update(data);
  }

  async list(options?: { status?: string }): Promise<RetakeRequest[]> {
    let q: FirebaseFirestore.Query = this.db.collection(paths.retakes());
    if (options?.status) {
      q = q.where("status", "==", options.status);
    }
    const snap = await q.orderBy("timestamp", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RetakeRequest);
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

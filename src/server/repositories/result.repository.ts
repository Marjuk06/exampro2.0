import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { ExamResult } from "@/types";

export class ResultRepository {
  private db = getAdminDb();

  async getByUserAndExam(uid: string, examId: string): Promise<ExamResult | null> {
    const snap = await this.db
      .collection(paths.results())
      .where("uid", "==", uid)
      .where("examId", "==", examId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return { id: doc.id, ...doc.data() } as ExamResult;
  }

  async create(data: Omit<ExamResult, "id">): Promise<string> {
    const ref = await this.db.collection(paths.results()).add(data);
    return ref.id;
  }

  async update(id: string, data: Partial<ExamResult>): Promise<void> {
    await this.db.doc(paths.result(id)).update(data);
  }

  async deleteByUserAndExam(uid: string, examId: string): Promise<number> {
    const snap = await this.db
      .collection(paths.results())
      .where("uid", "==", uid)
      .where("examId", "==", examId)
      .get();
    const batch = this.db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return snap.size;
  }

  async listByExam(examId: string): Promise<ExamResult[]> {
    const snap = await this.db
      .collection(paths.results())
      .where("examId", "==", examId)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExamResult);
  }
}

export const resultRepository = new ResultRepository();

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { Exam } from "@/types";

export class ExamRepository {
  private db = getAdminDb();

  async getById(id: string): Promise<Exam | null> {
    const snap = await this.db.doc(paths.exam(id)).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Exam;
  }

  async create(data: Omit<Exam, "id">): Promise<string> {
    const ref = await this.db.collection(paths.exams()).add(data);
    return ref.id;
  }

  async update(id: string, data: Partial<Exam>): Promise<void> {
    await this.db.doc(paths.exam(id)).set(
      { ...data, updatedAt: Date.now() },
      { merge: true }
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.doc(paths.exam(id)).delete();
  }

  async appendApprovedUser(examId: string, uid: string): Promise<void> {
    const ref = this.db.doc(paths.exam(examId));
    const snap = await ref.get();
    const approved = snap.data()?.approvedUsers ?? [];
    if (!approved.includes(uid)) {
      await ref.update({ approvedUsers: [...approved, uid] });
    }
  }
}

export const examRepository = new ExamRepository();

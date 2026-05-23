import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { Question } from "@/types";

export class QuestionRepository {
  private db = getAdminDb();

  async listByExam(examId: string): Promise<Question[]> {
    const snap = await this.db
      .collection(paths.questions())
      .where("examId", "==", examId)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
  }

  async create(data: Omit<Question, "id">): Promise<string> {
    const ref = await this.db.collection(paths.questions()).add(data);
    return ref.id;
  }

  async getById(id: string): Promise<Question | null> {
    const snap = await this.db.doc(paths.question(id)).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Question;
  }

  async delete(id: string): Promise<void> {
    await this.db.doc(paths.question(id)).delete();
  }
}

export const questionRepository = new QuestionRepository();

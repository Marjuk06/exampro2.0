import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { BookmarkEntry, RevisionFolder } from "@/types/engagement";
import type { Question } from "@/types";

function chapterFromQuestion(q: Question): string {
  return q.tags?.[0] ?? q.sectionId ?? "General";
}

export class BookmarksService {
  private db = getAdminDb();

  async list(uid: string, folderId?: string): Promise<BookmarkEntry[]> {
    const snap = await this.db
      .collection(paths.userBookmarks(uid))
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    let items = snap.docs.map((d) => ({ ...d.data(), questionId: d.id }) as BookmarkEntry);
    if (folderId) items = items.filter((b) => b.folderId === folderId);
    return items;
  }

  async add(
    uid: string,
    questionId: string,
    meta?: { note?: string; folderId?: string; markedDifficult?: boolean }
  ): Promise<BookmarkEntry> {
    const qSnap = await this.db.doc(paths.question(questionId)).get();
    if (!qSnap.exists) throw new Error("Question not found");
    const q = { id: qSnap.id, ...qSnap.data() } as Question;
    const examSnap = await this.db.doc(paths.exam(q.examId)).get();
    const subject = String(examSnap.data()?.subject ?? "General");

    const entry: BookmarkEntry = {
      questionId,
      examId: q.examId,
      subject,
      chapter: chapterFromQuestion(q),
      note: meta?.note,
      difficulty: q.difficulty,
      markedDifficult: meta?.markedDifficult,
      folderId: meta?.folderId,
      createdAt: Date.now(),
    };
    await this.db.doc(paths.userBookmark(uid, questionId)).set(entry);
    return entry;
  }

  async remove(uid: string, questionId: string): Promise<void> {
    await this.db.doc(paths.userBookmark(uid, questionId)).delete();
  }

  async listFolders(uid: string): Promise<RevisionFolder[]> {
    const snap = await this.db.collection(paths.userRevisionFolders(uid)).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RevisionFolder);
  }

  async createFolder(uid: string, name: string): Promise<RevisionFolder> {
    const ref = await this.db.collection(paths.userRevisionFolders(uid)).add({
      name,
      questionCount: 0,
      createdAt: Date.now(),
    });
    return { id: ref.id, name, questionCount: 0, createdAt: Date.now() };
  }
}

export const bookmarksService = new BookmarksService();

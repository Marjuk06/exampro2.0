import { requireAuth } from "@/server/auth/require-auth";
import { jsonOk, withApiHandler } from "@/server/api/handler";
import { bookmarksService } from "@/server/services/engagement/bookmarks.service";

export const GET = withApiHandler(async (request) => {
  const session = await requireAuth();
  const folderId = new URL(request.url).searchParams.get("folderId") ?? undefined;
  const [bookmarks, folders] = await Promise.all([
    bookmarksService.list(session.uid, folderId),
    bookmarksService.listFolders(session.uid),
  ]);
  return jsonOk({ bookmarks, folders });
});

export const POST = withApiHandler(async (request) => {
  const session = await requireAuth();
  const body = await request.json();
  if (body.action === "create_folder") {
    const folder = await bookmarksService.createFolder(session.uid, body.name);
    return jsonOk({ folder });
  }
  const entry = await bookmarksService.add(session.uid, body.questionId, {
    note: body.note,
    folderId: body.folderId,
    markedDifficult: body.markedDifficult,
  });
  return jsonOk({ entry });
});

export const DELETE = withApiHandler(async (request) => {
  const session = await requireAuth();
  const questionId = new URL(request.url).searchParams.get("questionId");
  if (!questionId) return jsonOk({ error: "questionId required" }, 400);
  await bookmarksService.remove(session.uid, questionId);
  return jsonOk({ ok: true });
});

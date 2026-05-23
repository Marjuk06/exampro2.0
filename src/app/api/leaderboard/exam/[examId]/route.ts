import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { ExamLeaderboardDoc } from "@/types/gamification";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { examId } = await params;
  const db = getAdminDb();
  const snap = await db.doc(paths.examLeaderboard(examId)).get();

  if (!snap.exists) {
    return NextResponse.json({
      examId,
      participantCount: 0,
      topEntries: [],
      myRank: null,
    });
  }

  const board = snap.data() as ExamLeaderboardDoc;
  const myRankSnap = await db.doc(paths.examRank(examId, session.uid)).get();
  const myRank = myRankSnap.exists ? myRankSnap.data() : null;

  return NextResponse.json({
    ...board,
    myRank,
  });
}

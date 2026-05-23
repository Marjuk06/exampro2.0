import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { PublicProfile } from "@/types/gamification";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId } = await params;
  const db = getAdminDb();
  const snap = await db.doc(paths.publicProfile(studentId)).get();

  if (!snap.exists) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const profile = snap.data() as PublicProfile;

  const recentSnap = await db
    .collection(paths.examRanks())
    .where("studentId", "==", studentId)
    .orderBy("submittedAt", "desc")
    .limit(10)
    .get()
    .catch(() => null);

  const recentRanks = recentSnap
    ? recentSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    : [];

  return NextResponse.json({ profile, recentRanks });
}

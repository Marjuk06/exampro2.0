import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await getAdminDb().doc(paths.userProfile(session.uid)).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: snap.data() });
}

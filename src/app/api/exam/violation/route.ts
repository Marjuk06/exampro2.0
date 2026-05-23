import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { violationSchema } from "@/lib/validations/exam";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = violationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { examId, sessionId, type, metadata } = parsed.data;

  await getAdminDb().collection(paths.violations()).add({
    uid: session.uid,
    examId,
    sessionId,
    type,
    metadata: metadata ?? {},
    timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true });
}

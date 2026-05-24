import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonOk, withApiHandler } from "@/server/api/handler";

export const GET = withApiHandler(async (request) => {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() || "";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Number(searchParams.get("limit") || "20"));

  const db = getAdminDb();

  // Firestore doesn't support full-text search well natively, 
  // and we don't have Algolia/Typesense configured. 
  // We'll query public_profiles. If it's too large, we should implement a dedicated search index.
  // For now, we fetch a batch of public profiles and filter in memory for wildcard matching.
  
  const snap = await db.collectionGroup("public_profiles").get();
  
  let allStudents = snap.docs.map(d => {
    const data = d.data();
    return {
      uid: data.uid,
      studentId: data.studentId,
      name: data.name,
      email: data.email || "", // Assuming email might be stored or we just search what we have
      examsCompleted: data.stats?.examsCompleted || 0,
      xp: data.gamification?.xp || 0,
      level: data.gamification?.level || 1,
    };
  });

  if (q) {
    allStudents = allStudents.filter(s => 
      s.name?.toLowerCase().includes(q) || 
      s.studentId?.toLowerCase().includes(q) || 
      s.email?.toLowerCase().includes(q)
    );
  }

  // Sort by exams completed (desc) or name
  allStudents.sort((a, b) => b.examsCompleted - a.examsCompleted || a.name.localeCompare(b.name));

  const total = allStudents.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginated = allStudents.slice(offset, offset + limit);

  return jsonOk({
    students: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    }
  });
});

import { getAdminDb } from "../src/lib/firebase/admin";
import { rebuildExamLeaderboard } from "../src/server/services/ranking/incremental-rank.service";
import { paths } from "../src/lib/firebase/paths";

async function main() {
  const db = getAdminDb();
  
  // Rebuild Exam Leaderboards
  const exams = await db.collection(paths.exams()).get();
  let count = 0;
  for (const doc of exams.docs) {
    const exam = doc.data();
    if (exam.examType === "mcq" || exam.examType === "cq") {
      const qSnap = await db.collection(paths.questions()).where("examId", "==", doc.id).get();
      let maxScore = 0;
      for (const qDoc of qSnap.docs) {
        maxScore += (qDoc.data().points ?? 1);
      }
      
      await rebuildExamLeaderboard(db, doc.id, exam.title, exam.subject ?? "General", maxScore);
      console.log(`Rebuilt leaderboard for exam: ${exam.title} (${doc.id})`);
      count++;
    }
  }
  
  console.log(`Successfully rebuilt ${count} exam leaderboards.`);
}

main().catch(console.error);

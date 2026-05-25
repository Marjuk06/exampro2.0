import { getAdminDb } from "../src/lib/firebase/admin";
import { paths } from "../src/lib/firebase/paths";

async function main() {
  const db = getAdminDb();
  
  console.log("--- Global Leaderboard ---");
  const globalSnap = await db.collection(paths.globalLeaderboard()).get();
  console.log(`Global entries count: ${globalSnap.docs.length}`);
  globalSnap.docs.forEach(doc => {
    console.log(doc.id, doc.data());
  });

  console.log("\n--- Exam Leaderboards ---");
  // Let's get the collection path for exam leaderboards.
  // Wait, paths.examLeaderboard(id) returns a specific doc.
  // Let's just list the known exam 'b3JLLRBfqX2qo57aYF2y'
  const examLbSnap = await db.doc(paths.examLeaderboard('b3JLLRBfqX2qo57aYF2y')).get();
  if (examLbSnap.exists) {
    console.log("Exam LB for 'b3JLLRBfqX2qo57aYF2y':", JSON.stringify(examLbSnap.data(), null, 2));
  } else {
    console.log("Exam LB for 'b3JLLRBfqX2qo57aYF2y' DOES NOT EXIST!");
  }
}

main().catch(console.error);

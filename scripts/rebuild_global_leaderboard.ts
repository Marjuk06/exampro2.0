import { getAdminDb } from "../src/lib/firebase/admin";
import { paths } from "../src/lib/firebase/paths";

async function main() {
  const db = getAdminDb();
  console.log("Rebuilding Global Leaderboard...");

  // Fetch all user profiles
  // userProfile: (uid: string) => `artifacts/${APP_ID}/users/${uid}/profile/main`
  // But we can't query across users easily without collectionGroup unless we know uids.
  // We can query all public_profiles!
  
  const publicProfilesSnap = await db.collection(paths.publicProfile("").replace(/\/[^/]+$/, "")).get();
  console.log(`Found ${publicProfilesSnap.docs.length} public profiles.`);

  let count = 0;
  for (const doc of publicProfilesSnap.docs) {
    const pub = doc.data();
    if (pub.uid) {
      // Get full profile to get exact XP etc, although pub.gamification has it
      const xp = pub.gamification?.xp ?? 0;
      const level = pub.gamification?.level ?? 1;
      
      await db.doc(paths.globalLeaderboardEntry(pub.uid)).set({
        uid: pub.uid,
        name: pub.name ?? "Student",
        studentId: pub.studentId ?? "",
        xp: xp,
        level: level,
        examsCompleted: pub.stats?.examsCompleted ?? 0,
        avgPercentile: pub.stats?.avgPercentile ?? 0,
        streak: pub.gamification?.streak?.current ?? 0,
        updatedAt: Date.now()
      }, { merge: true });
      count++;
    }
  }

  console.log(`Successfully rebuilt ${count} global leaderboard entries.`);
}

main().catch(console.error);

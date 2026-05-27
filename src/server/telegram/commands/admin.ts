import { Telegraf } from "telegraf";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";

// Helper to get user role by chat ID
async function getUserRoleByChatId(chatId: string): Promise<string | null> {
  const db = getAdminDb();
  // We need to query userProfile collection where telegramChatId == chatId
  // However, users collection is structured like users/{uid}/profile/main
  // For admin commands, we should instead check if the chatId matches the global admin tgChatId in settings
  // or use a collection group query
  const snap = await db.collectionGroup("profile")
    .where("telegramChatId", "==", chatId)
    .limit(1)
    .get();
  
  if (snap.empty) return null;
  return snap.docs[0].data().role;
}

export function adminHandlers(bot: Telegraf) {
  bot.command("stats", async (ctx) => {
    const role = await getUserRoleByChatId(ctx.chat.id.toString());
    if (role !== "admin" && role !== "superadmin") {
      return ctx.reply("🚫 You are not authorized to use admin commands.");
    }

    const db = getAdminDb();
    const globalStats = await db.doc(paths.globalAnalytics()).get();
    const data = globalStats.data();

    if (!data) {
      return ctx.reply("No stats available.");
    }

    const msg = `📊 <b>Exam Center Stats</b>\n\nTotal Students: ${data.totalStudents || 0}\nTotal Exams: ${data.totalExams || 0}\nTotal Submissions: ${data.totalSubmissions || 0}`;
    await ctx.reply(msg, { parse_mode: "HTML" });
  });

  bot.command("publish", async (ctx) => {
    const role = await getUserRoleByChatId(ctx.chat.id.toString());
    if (role !== "admin" && role !== "superadmin") {
      return ctx.reply("🚫 Unauthorized.");
    }

    // A real implementation would parse the exam ID and update firestore
    await ctx.reply("This command requires an Exam ID (e.g. /publish EXAM_123). Not fully implemented yet.");
  });
}

import { Telegraf } from "telegraf";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import { adminHandlers } from "./commands/admin";
import { aiHandlers } from "./commands/ai";

let botCache: Telegraf | null = null;
let lastToken = "";

export async function getBot() {
  const settings = await settingsRepository.get();
  if (!settings.tgToken) return null;

  if (botCache && lastToken === settings.tgToken) {
    return botCache;
  }

  const bot = new Telegraf(settings.tgToken);
  lastToken = settings.tgToken;

  bot.start(async (ctx) => {
    // Expected format: /start 123456
    const text = (ctx.message as any)?.text;
    if (!text) return;
    const parts = text.split(" ");
    const code = parts.length > 1 ? parts[1] : null;

    if (code) {
       const db = getAdminDb();
       const tokenDoc = await db.doc(paths.telegramLink(code)).get();
       if (tokenDoc.exists) {
           const data = tokenDoc.data();
           if (data && data.expiresAt > Date.now()) {
               await db.doc(paths.userProfile(data.uid)).update({
                   telegramChatId: ctx.chat.id.toString(),
                   telegramUsername: ctx.from.username || "",
               });
               await ctx.reply("✅ Successfully linked your Exam Center account!");
               // Invalidate token
               await db.doc(paths.telegramLink(code)).delete();
           } else {
               await ctx.reply("❌ Link code expired or invalid.");
           }
       } else {
           await ctx.reply("❌ Invalid link code.");
       }
    } else {
       await ctx.reply("Welcome to Exam Center Bot! Go to Settings -> Telegram in your dashboard to generate a linking code.");
    }
  });

  adminHandlers(bot);
  aiHandlers(bot);

  botCache = bot;
  return bot;
}

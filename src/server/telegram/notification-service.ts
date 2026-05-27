import { getBot } from "./bot";
import { userRepository } from "@/server/repositories/user.repository";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";

export class TelegramNotificationService {
  async sendMessage(uid: string, message: string) {
    const profile = await userRepository.getProfile(uid);
    if (!profile?.telegramChatId) return;

    const bot = await getBot();
    if (!bot) return;

    try {
      await bot.telegram.sendMessage(profile.telegramChatId, message, { parse_mode: "HTML" });
    } catch (e) {
      console.error("Failed to send telegram message", e);
    }
  }

  async sendAdminAlert(message: string) {
    const settings = await settingsRepository.get();
    if (!settings.tgChatId) return;

    const bot = await getBot();
    if (!bot) return;

    try {
      await bot.telegram.sendMessage(settings.tgChatId, message, { parse_mode: "HTML" });
    } catch (e) {
      console.error("Failed to send admin alert", e);
    }
  }

  async notifyCheatAlert(uid: string, examId: string, violationType: string) {
    const profile = await userRepository.getProfile(uid);
    const name = profile?.name || "Unknown Student";
    const msg = `🚨 <b>Anti-Cheat Alert</b>\n\nStudent: <b>${name}</b>\nExam ID: <b>${examId}</b>\nViolation: <b>${violationType}</b>`;
    await this.sendAdminAlert(msg);
  }

  async notifyResult(uid: string, examTitle: string, score: number | string, maxScore?: number) {
    const msg = `📝 <b>Result Published</b>\n\nExam: <b>${examTitle}</b>\nScore: <b>${score} ${maxScore ? `/ ${maxScore}` : ""}</b>\n\nCheck your dashboard for detailed analytics.`;
    await this.sendMessage(uid, msg);
  }
}

export const telegramNotificationService = new TelegramNotificationService();

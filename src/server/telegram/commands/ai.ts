import { Telegraf } from "telegraf";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function aiHandlers(bot: Telegraf) {
  bot.command("solve_doubt", async (ctx) => {
    const text = (ctx.message as any)?.text;
    const query = text.replace("/solve_doubt", "").trim();

    if (!query) {
      return ctx.reply("Please provide a question. Example: /solve_doubt What is photosynthesis?");
    }

    if (!process.env.GEMINI_API_KEY) {
      return ctx.reply("AI features are not configured (Missing API Key).");
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an expert tutor for students. Answer this doubt clearly and concisely: ${query}`
      });
      await ctx.reply(`🧠 <b>AI Tutor</b>\n\n${response.text}`, { parse_mode: "HTML" });
    } catch (e) {
      console.error(e);
      await ctx.reply("Failed to generate AI response.");
    }
  });

  bot.command("generate_mcq", async (ctx) => {
    const text = (ctx.message as any)?.text;
    const topic = text.replace("/generate_mcq", "").trim();

    if (!topic) {
      return ctx.reply("Please provide a topic. Example: /generate_mcq Physics: Kinematics");
    }

    if (!process.env.GEMINI_API_KEY) {
      return ctx.reply("AI features are not configured.");
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a challenging multiple choice question about: ${topic}. Format exactly like this:
Q: [Question]
A) [Option 1]
B) [Option 2]
C) [Option 3]
D) [Option 4]
Correct: [Correct Option Letter]
Explanation: [Short explanation]`
      });
      await ctx.reply(`📝 <b>Practice MCQ</b>\n\n${response.text}`, { parse_mode: "HTML" });
    } catch (e) {
      console.error(e);
      await ctx.reply("Failed to generate MCQ.");
    }
  });
}

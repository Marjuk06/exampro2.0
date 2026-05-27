import { NextResponse } from "next/server";
import { getBot } from "@/server/telegram/bot";

export async function POST(req: Request) {
  try {
    const bot = await getBot();
    if (!bot) {
      return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
    }

    const body = await req.json();
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

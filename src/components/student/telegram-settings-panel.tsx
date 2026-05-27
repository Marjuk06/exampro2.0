"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Send, CheckCircle2, Copy } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export function TelegramSettingsPanel() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [linkData, setLinkData] = useState<{ code: string; expiresAt: number; botUsername: string } | null>(null);

  const isLinked = !!profile?.telegramChatId;

  async function generateLinkCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate code");
      
      setLinkData(data);
      toast.success("Code generated!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!linkData) return;
    navigator.clipboard.writeText(linkData.code);
    toast.success("Code copied to clipboard!");
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-400" />
            Telegram Integration
          </CardTitle>
          <CardDescription>
            Connect your Telegram account to receive instant notifications for new exams, results, and reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLinked ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-semibold">Successfully Linked</p>
                <p className="text-sm opacity-80">
                  Connected to @{profile?.telegramUsername || "Unknown"} (Chat ID: {profile?.telegramChatId})
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!linkData ? (
                <Button onClick={generateLinkCode} disabled={loading} className="w-full sm:w-auto">
                  {loading ? "Generating..." : "Generate Link Code"}
                </Button>
              ) : (
                <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-muted-foreground">
                    1. Open Telegram and search for <strong>@{linkData.botUsername}</strong> (or click the button below).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Send the following code to the bot:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="rounded-lg bg-blue-500/20 px-4 py-2 text-xl font-bold tracking-widest text-blue-400">
                      /start {linkData.code}
                    </code>
                    <Button variant="ghost" size="icon" onClick={copyCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Code expires in {Math.round((linkData.expiresAt - Date.now()) / 60000)} minutes.
                  </p>
                  <Button asChild className="w-full sm:w-auto mt-2" variant="outline">
                    <a href={`https://t.me/${linkData.botUsername}?start=${linkData.code}`} target="_blank" rel="noreferrer">
                      Open Telegram Bot
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import type { AppSettings, UserRole } from "@/types";
import { Construction, FlaskConical, SaveIcon, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Toggle Card ──────────────────────────────────────────────────────────────

function ToggleCard({
  title,
  description,
  icon,
  enabled,
  onToggle,
  saving,
  accentClass,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
  saving: boolean;
  accentClass: string;
}) {
  return (
    <Card className={cn("border transition-colors", enabled ? accentClass : "border-white/10")}>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 rounded-lg p-2", enabled ? "bg-white/10" : "bg-white/5")}>
            {icon}
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={saving}
          className="shrink-0 focus-visible:outline-none"
          aria-label={`Toggle ${title}`}
        >
          <motion.div animate={{ opacity: saving ? 0.5 : 1 }}>
            {enabled ? (
              <ToggleRight className={cn("h-9 w-9 transition-colors", enabled ? "text-blue-400" : "text-muted-foreground/40")} />
            ) : (
              <ToggleLeft className="h-9 w-9 text-muted-foreground/40" />
            )}
          </motion.div>
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [betaMode, setBetaMode] = useState(false);
  const [constructionBanner, setConstructionBanner] = useState(false);
  const [constructionMessage, setConstructionMessage] = useState(
    "🚧 MCQ Pro 2.0 is currently in Beta — some features are under active development."
  );
  const [targetUid, setTargetUid] = useState("");
  const [targetRole, setTargetRole] = useState<UserRole>("admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d: AppSettings) => {
        if (d.tgToken) setTgToken(d.tgToken);
        if (d.tgChatId) setTgChatId(d.tgChatId);
        setBetaMode(d.betaMode ?? false);
        setConstructionBanner(d.constructionBanner ?? false);
        setConstructionMessage(
          d.constructionMessage ??
            "🚧 MCQ Pro 2.0 is currently in Beta — some features are under active development."
        );
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  /** Generic save helper — invalidates public settings cache on success */
  async function save(key: string, data: Partial<AppSettings>) {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved");
      // Invalidate the public settings query so BetaTag + AppBanner update immediately
      void qc.invalidateQueries({ queryKey: queryKeys.publicSettings });
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(null);
    }
  }

  async function toggleBetaMode() {
    const next = !betaMode;
    setBetaMode(next);
    await save("beta", { betaMode: next });
  }

  async function toggleConstructionBanner() {
    const next = !constructionBanner;
    setConstructionBanner(next);
    await save("banner", { constructionBanner: next });
  }

  async function saveBannerMessage() {
    await save("bannerMsg", { constructionMessage });
  }

  async function saveTelegram() {
    await save("telegram", { tgToken, tgChatId });
  }

  async function assignRole() {
    if (!targetUid.trim()) {
      toast.error("Enter user UID");
      return;
    }
    const res = await fetch(`/api/superadmin/users/${targetUid.trim()}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: targetRole }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(data.message ?? "Role updated");
      setTargetUid("");
    } else {
      toast.error(data.error ?? "Failed to assign role");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Settings</h2>
      <p className="mb-8 text-sm text-muted-foreground">
        Control app-wide flags, notifications, and access roles.
      </p>

      <div className="space-y-8">
        {/* ── App Appearance ─────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            App Appearance
          </h3>
          <div className="space-y-3">
            <ToggleCard
              title="Beta Mode"
              description="Show a BETA badge on the app logo in every header and the admin sidebar."
              icon={<FlaskConical className={cn("h-5 w-5", betaMode ? "text-indigo-400" : "text-muted-foreground")} />}
              enabled={betaMode}
              onToggle={toggleBetaMode}
              saving={saving === "beta"}
              accentClass="border-indigo-500/40 bg-indigo-500/5"
            />

            <ToggleCard
              title="Under Construction Banner"
              description="Show an eye-catching amber construction banner at the very top of every page. Dismissible by users."
              icon={<Construction className={cn("h-5 w-5", constructionBanner ? "text-amber-400" : "text-muted-foreground")} />}
              enabled={constructionBanner}
              onToggle={toggleConstructionBanner}
              saving={saving === "banner"}
              accentClass="border-amber-500/40 bg-amber-500/5"
            />

            {/* Banner message editor — always visible so admin can pre-set it */}
            <Card className="border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Banner Message</CardTitle>
                <CardDescription className="text-xs">
                  Customize the text shown in the construction banner. Supports emoji. Max 300 characters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={constructionMessage}
                  onChange={(e) => setConstructionMessage(e.target.value)}
                  maxLength={300}
                  placeholder="🚧 Custom message here…"
                  className="text-sm"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {constructionMessage.length}/300
                  </span>
                  <Button
                    size="sm"
                    onClick={saveBannerMessage}
                    disabled={saving === "bannerMsg"}
                    className="gap-1.5"
                  >
                    <SaveIcon className="h-3.5 w-3.5" />
                    {saving === "bannerMsg" ? "Saving…" : "Save Message"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Notifications ───────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Telegram Alerts
          </h3>
          <Card className="border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-400">Telegram Bot</CardTitle>
              <CardDescription>
                Send admin notifications (new registrations, suspicious activity) to a Telegram channel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bot Token</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="1234567890:ABC..."
                />
              </div>
              <div>
                <Label>Chat ID</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  placeholder="-100..."
                />
              </div>
              <Button
                className="w-full gap-1.5"
                onClick={saveTelegram}
                disabled={saving === "telegram"}
              >
                <SaveIcon className="h-4 w-4" />
                {saving === "telegram" ? "Saving…" : "Save Telegram Settings"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* ── RBAC (Superadmin only) ───────────────────────────────── */}
        {profile?.role === "superadmin" && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Access Control
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-400">RBAC — Assign Role</CardTitle>
                  <CardDescription>
                    Promote or demote any user via Firebase custom claims.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>User UID (Firebase)</Label>
                    <Input
                      className="mt-1 font-mono text-sm"
                      placeholder="Firebase Auth UID"
                      value={targetUid}
                      onChange={(e) => setTargetUid(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={targetRole}
                      onValueChange={(v) => setTargetRole(v as UserRole)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" variant="purple" onClick={assignRole}>
                    Assign role (custom claims)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    User must refresh their session after role changes.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security model</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>
                    Admin access uses Firebase custom claims verified on the server. Sensitive
                    Firestore collections are write-locked; all mutations go through secured API
                    routes. Phase 4 introduces scoped social, challenge, and clan collections
                    with per-user rules.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

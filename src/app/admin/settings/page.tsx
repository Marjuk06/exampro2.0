"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import type { AppSettings, UserRole } from "@/types";

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [targetUid, setTargetUid] = useState("");
  const [targetRole, setTargetRole] = useState<UserRole>("admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.tgToken) setTgToken(d.tgToken);
        if (d.tgChatId) setTgChatId(d.tgChatId);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function saveTelegram() {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tgToken, tgChatId }),
    });
    if (res.ok) toast.success("Telegram settings saved");
    else toast.error("Save failed");
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
    return <p className="text-muted-foreground">Loading settings…</p>;
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Settings</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-400">Telegram Bot Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Bot Token</Label>
              <Input
                className="font-mono text-sm"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
              />
            </div>
            <div>
              <Label>Chat ID</Label>
              <Input
                className="font-mono text-sm"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={saveTelegram}>
              Save Telegram Settings
            </Button>
          </CardContent>
        </Card>

        {profile?.role === "superadmin" && (
          <Card className="border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400">RBAC — Assign Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>User UID (Firebase)</Label>
                <Input
                  className="font-mono text-sm"
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
                  <SelectTrigger>
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
        )}

        <Card>
          <CardHeader>
            <CardTitle>Security model</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Admin access uses Firebase custom claims verified on the server. Sensitive
              Firestore collections are write-locked; all mutations go through secured API
              routes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Swords, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ActivityFeedItem, UserConnection } from "@/types/engagement";
import { toast } from "sonner";

export function SocialPanel() {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [studentId, setStudentId] = useState("");

  async function load() {
    const res = await fetch("/api/student/social");
    const data = await res.json();
    setConnections(data.connections ?? []);
    setFeed(data.feed ?? []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function add(type: "friend" | "rival") {
    if (!studentId.trim()) return;
    const res = await fetch("/api/student/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", studentId: studentId.trim(), type }),
    });
    if (!res.ok) {
      toast.error("Could not add connection");
      return;
    }
    toast.success(type === "rival" ? "Rival added!" : "Friend added!");
    setStudentId("");
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" /> Friends & rivals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="max-w-[200px]"
            />
            <Button size="sm" onClick={() => add("friend")}>
              <UserPlus className="mr-1 h-4 w-4" /> Friend
            </Button>
            <Button size="sm" variant="outline" onClick={() => add("rival")}>
              <Swords className="mr-1 h-4 w-4" /> Rival
            </Button>
          </div>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connections yet.</p>
          ) : (
            <ul className="space-y-2">
              {connections.map((c) => (
                <li
                  key={c.uid}
                  className="flex items-center justify-between rounded-lg border border-white/10 p-3"
                >
                  <a href={`/profile/${c.studentId}`} className="font-medium hover:text-blue-400">
                    {c.name}
                  </a>
                  <span className="text-xs capitalize text-muted-foreground">{c.type}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Community activity</CardTitle>
        </CardHeader>
        <CardContent className="max-h-80 space-y-3 overflow-y-auto">
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            feed.map((item) => (
              <div key={item.id} className="border-b border-white/5 pb-2 text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">{item.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Bookmark, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BookmarkEntry, RevisionFolder } from "@/types/engagement";
import { toast } from "sonner";

export function RevisionPanel() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [folders, setFolders] = useState<RevisionFolder[]>([]);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/student/bookmarks");
    const data = await res.json();
    setBookmarks(data.bookmarks ?? []);
    setFolders(data.folders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function createFolder() {
    if (!folderName.trim()) return;
    const res = await fetch("/api/student/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_folder", name: folderName }),
    });
    if (!res.ok) {
      toast.error("Failed to create folder");
      return;
    }
    setFolderName("");
    toast.success("Folder created");
    load();
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading revision data…</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="h-5 w-5" /> Revision folders
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            placeholder="New folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={createFolder}>Create</Button>
          {folders.map((f) => (
            <span
              key={f.id}
              className="rounded-full border border-white/10 px-3 py-1 text-sm"
            >
              {f.name} ({f.questionCount})
            </span>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bookmark className="h-5 w-5" /> Saved questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bookmark questions during exams or save mistakes automatically after wrong answers.
            </p>
          ) : (
            <ul className="space-y-2">
              {bookmarks.map((b) => (
                <li
                  key={b.questionId}
                  className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{b.subject}</p>
                    <p className="text-muted-foreground">
                      {b.chapter ?? "General"} · {b.questionId.slice(0, 8)}…
                    </p>
                  </div>
                  {b.markedDifficult && (
                    <span className="text-xs text-orange-400">Difficult</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useNotifications,
  useMarkNotificationsRead,
} from "@/hooks/queries/use-notifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  async function markAllRead() {
    await markRead.mutateAsync({ markAllRead: true });
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <Card className="absolute right-0 top-12 z-50 w-80 shadow-xl">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-white/10 p-3">
                <span className="text-sm font-semibold">Notifications</span>
                {unread > 0 && (
                  <button
                    type="button"
                    className="text-xs text-blue-400 hover:underline"
                    onClick={markAllRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </p>
                ) : (
                  items.map((n) => (
                    <div
                      key={n.id}
                      className={`border-b border-white/5 p-3 text-sm ${
                        !n.read ? "bg-blue-500/5" : ""
                      }`}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="text-muted-foreground">{n.message}</p>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="mt-1 inline-block text-xs text-blue-400"
                          onClick={() => setOpen(false)}
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationBell } from "@/components/student/notification-bell";
import { StreakBadge } from "@/components/student/streak-badge";

export function StudentHeader() {
  const { profile } = useAuth();

  return (
    <header className="glass fixed top-0 z-40 flex w-full items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
      <Link href="/student" className="flex items-center gap-2 sm:gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold tracking-wider sm:text-xl">Exam Center</h1>
      </Link>
      <div className="flex items-center gap-1 sm:gap-3">
        <StreakBadge />
        <NotificationBell />
        <ThemeToggle />
        <LogoutButton />
        {profile && (
          <Link
            href={`/profile/${profile.studentId}`}
            className="glass hidden items-center gap-3 rounded-full px-4 py-2 sm:flex"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-purple-500 text-sm font-bold">
                {(profile.name?.trim()?.charAt(0) ?? "?").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{profile.name}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Menu, X, User } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationBell } from "@/components/student/notification-bell";
import { StreakBadge } from "@/components/student/streak-badge";
import { BetaTag } from "@/components/layout/beta-banner";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

export function StudentHeader() {
  const { profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="glass fixed top-0 z-50 flex w-full flex-col border-b border-white/10">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/student" className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wider sm:text-xl">Exam Center</h1>
              <BetaTag />
            </div>
          </div>
        </Link>
        
        {/* Desktop View */}
        <div className="hidden items-center gap-3 sm:flex">
          <StreakBadge />
          <NotificationBell />
          <ThemeToggle />
          <LogoutButton />
          {profile && (
            <Link
              href={`/profile/${profile.studentId}`}
              className="glass flex items-center gap-3 rounded-full px-4 py-2 hover:bg-white/5 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-purple-500 text-sm font-bold text-white">
                  {(profile.name?.trim()?.charAt(0) ?? "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{profile.name}</span>
            </Link>
          )}
        </div>

        {/* Mobile View Toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <StreakBadge />
          <NotificationBell />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative z-50"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-background/95 backdrop-blur-lg sm:hidden"
          >
            <div className="flex flex-col gap-4 px-4 pb-6 pt-2">
              {profile && (
                <Link
                  href={`/profile/${profile.studentId}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm"
                >
                  <Avatar className="h-10 w-10 border border-blue-500/30">
                    <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                    <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-purple-500 text-lg font-bold text-white">
                      {(profile.name?.trim()?.charAt(0) ?? "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold">{profile.name}</span>
                    <span className="text-xs text-muted-foreground">ID: {profile.studentId}</span>
                  </div>
                </Link>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className="text-sm font-medium">Theme</span>
                  <ThemeToggle />
                </div>
                {profile && (
                  <Link
                    href={`/profile/${profile.studentId}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-medium text-blue-400 hover:bg-white/10"
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </Link>
                )}
              </div>
              
              <div className="mt-2 flex w-full justify-center rounded-xl py-6" onClick={() => setMobileMenuOpen(false)}>
                <LogoutButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
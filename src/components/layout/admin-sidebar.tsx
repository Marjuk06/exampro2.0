"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, BarChart3, Bell, BookOpen, ClipboardList, LayoutDashboard, ListChecks, PenLine, Radio, Settings, Shield, Users } from "lucide-react";

export const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/live", label: "Live Monitor", icon: Radio, badgeKey: "live" },
  { href: "/admin/exams", label: "Manage Exams", icon: BookOpen },
  { href: "/admin/questions", label: "Questions", icon: ListChecks },
  { href: "/admin/cq-eval", label: "Evaluate CQ", icon: PenLine, badgeKey: "cq" },
  { href: "/admin/results", label: "All Results", icon: Users },
  { href: "/admin/requests", label: "Retake Requests", icon: Bell, badgeKey: "retakes" },
  { href: "/admin/students", label: "Students", icon: ClipboardList },
  { href: "/admin/diagnostics", label: "Diagnostics", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BetaTag } from "@/components/layout/beta-banner";

interface AdminSidebarProps {
  counts?: { live?: number; cq?: number; retakes?: number };
  className?: string;
}

export function AdminSidebar({ counts, className }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("glass flex h-screen w-64 shrink-0 flex-col border-r border-white/10", className)}>
      <div className="flex items-center gap-3 border-b border-white/10 p-6">
        <div className="rounded-lg bg-purple-600 p-2 shadow-lg">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-bold tracking-wide">Admin</span>
          <BetaTag className="self-start" />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const badge =
            item.badgeKey === "live"
              ? counts?.live
              : item.badgeKey === "cq"
                ? counts?.cq
                : item.badgeKey === "retakes"
                  ? counts?.retakes
                  : 0;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  "nav-item flex items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors",
                  active
                    ? "border-r-[3px] border-blue-500 bg-blue-500/20 text-blue-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
                {badge ? (
                  <Badge
                    variant={item.badgeKey === "live" ? "success" : "danger"}
                    className="animate-pulse text-[10px]"
                  >
                    {badge}
                  </Badge>
                ) : null}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

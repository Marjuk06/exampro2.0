"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar, navItems } from "@/components/layout/admin-sidebar";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  
  // Find current active page title
  const activeNavItem = navItems.find(item => item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const pageTitle = activeNavItem ? activeNavItem.label : "Admin Panel";

  return (
    <div className="flex h-screen flex-col overflow-hidden sm:flex-row">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 p-4 sm:hidden">
        <span className="text-lg font-bold text-white">{pageTitle}</span>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? "absolute z-50 block h-[calc(100vh-65px)] w-full sm:static sm:h-screen sm:w-64" : "hidden sm:block"}`}>
        <AdminSidebar className="w-full sm:w-64" />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-8">{children}</div>
      </main>
    </div>
  );
}

"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { destroyServerSession, signOutFirebase } from "@/hooks/use-auth";

export function LogoutButton({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await destroyServerSession();
      await signOutFirebase();
      toast.success("Logged out");
      router.push("/auth/login");
    } catch {
      toast.error("Logout failed");
    }
  }

  return (
    <Button variant={variant} size="sm" onClick={handleLogout} className="gap-2">
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Logout</span>
    </Button>
  );
}

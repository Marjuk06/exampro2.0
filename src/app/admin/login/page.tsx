"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { isAdminRole } from "@/lib/permissions";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { establishServerSession } from "@/hooks/use-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const { profile, loading, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && profile && isAdminRole(profile.role)) {
      router.replace("/admin");
    }
  }, [loading, profile, router]);

  async function refreshAdminSession() {
    setRefreshing(true);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        toast.error("Sign in first at the student login page");
        router.push("/auth/login");
        return;
      }
      const token = await user.getIdToken(true);
      await establishServerSession(token);
      await refreshProfile();
      const me = await fetch("/api/auth/me");
      const data = await me.json();
      if (data.profile && isAdminRole(data.profile.role)) {
        toast.success("Admin session active");
        router.push("/admin");
      } else {
        toast.error(
          "No admin privileges on this account. Ask a superadmin to grant access."
        );
      }
    } catch {
      toast.error("Could not refresh session");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-t-4 border-purple-500">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20">
            <Shield className="h-8 w-8 text-purple-400" />
          </div>
          <CardTitle>Admin Access</CardTitle>
          <p className="text-sm text-muted-foreground">
            Admin rights are assigned via secure Firebase custom claims — not a shared passcode.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            variant="purple"
            onClick={refreshAdminSession}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh admin session
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            First-time setup: set{" "}
            <code className="rounded bg-white/10 px-1">INITIAL_SUPERADMIN_UID</code> or{" "}
            <code className="rounded bg-white/10 px-1">INITIAL_SUPERADMIN_EMAIL</code> in
            server env, sign in, then refresh.
          </p>
          <Link href="/auth/login" className="block text-center text-sm text-blue-400 hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

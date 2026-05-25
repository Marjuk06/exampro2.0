"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authLoginSchema } from "@/lib/validations/exam";
import type { z } from "zod";
import {
  signInWithGoogle,
  signInWithEmail,
  establishServerSession,
} from "@/hooks/use-auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { sendPasswordResetEmail } from "firebase/auth";

type LoginForm = z.infer<typeof authLoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(authLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function finishAuth() {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error("No user");
    const token = await user.getIdToken();
    const profile = await establishServerSession(token);
    router.push(profile.role === "admin" || profile.role === "superadmin" ? "/admin" : "/student");
  }

  async function onGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
      await finishAuth();
      toast.success("Welcome back!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      await signInWithEmail(data.email, data.password);
      await finishAuth();
      toast.success("Signed in successfully");
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    const email = form.getValues("email");
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error).message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-t-4 border-blue-500">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20">
              <GraduationCap className="h-8 w-8 text-blue-400" />
            </div>
            <CardTitle className="text-3xl">Student Login</CardTitle>
            <CardDescription>
              Sign in to access your exams and track performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="secondary"
              className="w-full bg-white text-slate-900 hover:bg-gray-100"
              onClick={onGoogle}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-muted-foreground">or email</span>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-xs text-blue-400 hover:underline"
                    disabled={loading}
                  >
                    Forgot Password?
                  </button>
                </div>
                <Input id="password" type="password" {...form.register("password")} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Sign In
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/auth/register" className="text-blue-400 hover:underline">
                Register
              </Link>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              <Link href="/admin/login" className="hover:text-purple-400">
                Admin access →
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

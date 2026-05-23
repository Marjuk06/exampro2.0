"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authRegisterSchema } from "@/lib/validations/exam";
import type { z } from "zod";
import { registerWithEmail, establishServerSession } from "@/hooks/use-auth";
import { updateProfile } from "firebase/auth";

type RegisterForm = z.infer<typeof authRegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(authRegisterSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(data: RegisterForm) {
    setLoading(true);
    try {
      const cred = await registerWithEmail(data.email, data.password);
      await updateProfile(cred.user, { displayName: data.name });
      const token = await cred.user.getIdToken(true);
      await establishServerSession(token);
      toast.success("Account created!");
      router.push("/student");
    } catch {
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...form.register("name")} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...form.register("password")} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Register
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-blue-400 hover:underline">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

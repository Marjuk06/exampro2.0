"use client";

import { useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== repeatPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error("You must be logged in with an email to change your password.");
      }

      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        toast.error("Incorrect current password.");
      } else {
        toast.error(err.message || "Failed to update password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user || !user.providerData.some(p => p.providerId === "password")) {
    return null;
  }

  return (
    <Card className="border-red-500/20 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400">
          <KeyRound className="h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>
          Change your account password. You will need your current password to confirm this change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input 
              id="current-password" 
              type="password" 
              required 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input 
                id="new-password" 
                type="password" 
                required 
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeat-password">Repeat New Password</Label>
              <Input 
                id="repeat-password" 
                type="password" 
                required 
                minLength={6}
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading} variant="destructive">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

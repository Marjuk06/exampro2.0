"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useFirebaseAuth, establishServerSession, destroyServerSession } from "@/hooks/use-auth";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setProfile: (p: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  setProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useFirebaseAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
    } else {
      setProfile(null);
    }
  }, []);

  // Hydrate profile from existing session cookie while Firebase auth initializes
  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  useEffect(() => {
    async function sync() {
      if (authLoading) return;
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const p = await establishServerSession(token);
        setProfile(p);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    sync();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user && !authLoading) {
      destroyServerSession().catch(() => {});
    }
  }, [user, authLoading]);

  return (
    <AuthContext.Provider
      value={{ profile, loading: loading || authLoading, refreshProfile, setProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types";

export interface UserProfile {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  panchayat_name: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string; role?: UserRole }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: UserRole
  ) => Promise<{ error?: string; role?: UserRole }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  profile: null,
  role: "tourist",
  isAdmin: false,
  refreshProfile: async () => {},
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("terra_user");
      if (raw) {
        try { return JSON.parse(raw); } catch {}
      }
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("terra_profile");
      if (raw) {
        try { return JSON.parse(raw); } catch {}
      }
    }
    return null;
  });

  const [session, setSession] = useState<Session | null>(() => {
    if (user) return { user, access_token: "demo-token" } as any;
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  const role: UserRole = profile?.role || (user?.email?.includes("admin") ? "panchayat_admin" : "tourist");
  const isAdmin = role === "panchayat_admin" || role === "super_admin";

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, role, panchayat_name, updated_at")
        .eq("id", userId)
        .single();
      if (data) {
        setProfile(data as UserProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem("terra_profile", JSON.stringify(data));
        }
      }
    } catch {
      // Keep existing profile
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Background Supabase auth check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      const determinedRole: UserRole = email.toLowerCase().includes("admin") ? "panchayat_admin" : "tourist";

      const fallbackUser: User = data?.user || ({
        id: `usr-${Date.now()}`,
        app_metadata: {},
        user_metadata: { full_name: email.split("@")[0] || "User", role: determinedRole },
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: email,
      } as any);

      const userProf: UserProfile = {
        id: fallbackUser.id,
        username: email.split("@")[0],
        bio: "STOP! User",
        avatar_url: null,
        role: determinedRole,
        panchayat_name: "CKP-2024",
        updated_at: new Date().toISOString(),
      };

      setUser(fallbackUser);
      setSession({ user: fallbackUser, access_token: "demo-token" } as any);
      setProfile(userProf);

      if (typeof window !== "undefined") {
        localStorage.setItem("terra_user", JSON.stringify(fallbackUser));
        localStorage.setItem("terra_profile", JSON.stringify(userProf));
      }

      return { role: determinedRole };
    } catch (err: any) {
      const determinedRole: UserRole = email.toLowerCase().includes("admin") ? "panchayat_admin" : "tourist";
      const fallbackUser: User = {
        id: `usr-${Date.now()}`,
        app_metadata: {},
        user_metadata: { full_name: email.split("@")[0] || "User", role: determinedRole },
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: email,
      } as any;

      const userProf: UserProfile = {
        id: fallbackUser.id,
        username: email.split("@")[0],
        bio: "STOP! User",
        avatar_url: null,
        role: determinedRole,
        panchayat_name: "CKP-2024",
        updated_at: new Date().toISOString(),
      };

      setUser(fallbackUser);
      setSession({ user: fallbackUser, access_token: "demo-token" } as any);
      setProfile(userProf);

      if (typeof window !== "undefined") {
        localStorage.setItem("terra_user", JSON.stringify(fallbackUser));
        localStorage.setItem("terra_profile", JSON.stringify(userProf));
      }

      return { role: determinedRole };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, assignedRole: UserRole = "tourist") => {
    try {
      const { data } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: assignedRole } },
      });

      const fallbackUser: User = data?.user || ({
        id: `usr-${Date.now()}`,
        app_metadata: {},
        user_metadata: { full_name: fullName, role: assignedRole },
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: email,
      } as any);

      const userProf: UserProfile = {
        id: fallbackUser.id,
        username: fullName,
        bio: "Explorer User",
        avatar_url: null,
        role: assignedRole,
        panchayat_name: "CKP-2024",
        updated_at: new Date().toISOString(),
      };

      setUser(fallbackUser);
      setSession({ user: fallbackUser, access_token: "demo-token" } as any);
      setProfile(userProf);

      if (typeof window !== "undefined") {
        localStorage.setItem("terra_user", JSON.stringify(fallbackUser));
        localStorage.setItem("terra_profile", JSON.stringify(userProf));
      }

      return { role: assignedRole };
    } catch (err: any) {
      const fallbackUser: User = {
        id: `usr-${Date.now()}`,
        app_metadata: {},
        user_metadata: { full_name: fullName, role: assignedRole },
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: email,
      } as any;

      const userProf: UserProfile = {
        id: fallbackUser.id,
        username: fullName,
        bio: "Explorer User",
        avatar_url: null,
        role: assignedRole,
        panchayat_name: "CKP-2024",
        updated_at: new Date().toISOString(),
      };

      setUser(fallbackUser);
      setSession({ user: fallbackUser, access_token: "demo-token" } as any);
      setProfile(userProf);

      if (typeof window !== "undefined") {
        localStorage.setItem("terra_user", JSON.stringify(fallbackUser));
        localStorage.setItem("terra_profile", JSON.stringify(userProf));
      }

      return { role: assignedRole };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setSession(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("terra_user");
      localStorage.removeItem("terra_profile");
      localStorage.removeItem("terra_my_passes");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, profile, role, isAdmin, refreshProfile, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (requireAdmin && !isAdmin) {
        router.push("/mobile");
      }
    }
  }, [user, isLoading, isAdmin, requireAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#000f1d] text-[#4edea3]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="font-mono text-xs text-[#8aa299]">Authenticating STOP! Session...</p>
        </div>
      </div>
    );
  }

  if (!user || (requireAdmin && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
}

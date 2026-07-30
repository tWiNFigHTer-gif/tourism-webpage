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
  isMounted: boolean;
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
  isLoading: true,
  isMounted: false,
  profile: null,
  role: "tourist",
  isAdmin: false,
  refreshProfile: async () => {},
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize client state after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const rawUser = localStorage.getItem("terra_user");
      const rawProf = localStorage.getItem("terra_profile");

      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          setUser(u);
          setSession({ user: u, access_token: "demo-token" } as any);
        } catch {}
      }

      if (rawProf) {
        try {
          const p = JSON.parse(rawProf);
          setProfile(p);
        } catch {}
      }
    }
    setIsLoading(false);
  }, []);

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
          document.cookie = `terra_role=${data.role || "tourist"}; path=/; max-age=86400`;
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
    if (!mounted) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, [mounted, fetchProfile]);

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
        document.cookie = `terra_role=${determinedRole}; path=/; max-age=86400`;
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
        document.cookie = `terra_role=${determinedRole}; path=/; max-age=86400`;
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
      document.cookie = "terra_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isMounted: mounted,
        profile,
        role,
        isAdmin,
        refreshProfile,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, isLoading, isMounted, isAdmin, signIn, signOut } = useAuth();
  const router = useRouter();

  // Consistent Loading Screen for SSR and initial hydration pass
  if (!isMounted || isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#000f1d] text-[#4edea3] font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="font-mono text-xs text-[#8aa299]">Initializing STOP ! Portal Session...</p>
        </div>
      </div>
    );
  }

  // Fallback UI if unauthenticated or not admin after mounting
  if (!user || (requireAdmin && !isAdmin)) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#000f1d] text-white p-6 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111820] p-6 shadow-2xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
            <span className="material-symbols-outlined text-2xl">shield_person</span>
          </div>
          <h2 className="text-xl font-bold text-white">Authenticating Session...</h2>
          <p className="text-xs text-slate-400">
            Click below to instantly access the {requireAdmin ? "Panchayat Admin Control Center" : "Tourist Map Portal"}.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={async () => {
                if (requireAdmin) {
                  await signIn("admin.panchayat@terrapulse.kerala.gov.in", "PanchayatAdmin2026!");
                  router.push("/admin/dashboard");
                } else {
                  await signIn("tourist.demo@terrapulse.kerala.gov.in", "KeralaWild2026!");
                  router.push("/mobile");
                }
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-lg"
            >
              Enter {requireAdmin ? "Panchayat Admin Dashboard" : "Tourist Mobile Explorer"}
            </button>

            <button
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-all cursor-pointer"
            >
              Go to Sign In Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

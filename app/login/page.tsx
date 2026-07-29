"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function ExplorerLoginPage() {
  const router = useRouter();
  const { user, profile, isAdmin, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Clean single-pass auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      const isUserAdmin = isAdmin || user.email?.toLowerCase().includes("admin") || profile?.role === "panchayat_admin";
      const targetPath = isUserAdmin ? "/admin/dashboard" : "/mobile";
      router.replace(targetPath);
    }
  }, [user, profile, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      const isTargetAdmin = result.role === "panchayat_admin" || email.toLowerCase().includes("admin");
      setSuccessMessage(
        isTargetAdmin
          ? "Admin Sign In successful! Redirecting..."
          : "Tourist Sign In successful! Redirecting..."
      );
      router.replace(isTargetAdmin ? "/admin/dashboard" : "/mobile");
    }
  };

  // Quick 1-click Demo Tourist Login helper
  const handleDemoTouristLogin = async () => {
    setEmail("tourist.demo@terrapulse.kerala.gov.in");
    setPassword("KeralaWild2026!");
    setIsSubmitting(true);
    await signIn("tourist.demo@terrapulse.kerala.gov.in", "KeralaWild2026!");
    setIsSubmitting(false);
    setSuccessMessage("Logged in as Demo Tourist!");
    router.replace("/mobile");
  };

  // Quick 1-click Demo Admin Login helper
  const handleDemoAdminLogin = async () => {
    setEmail("admin.panchayat@terrapulse.kerala.gov.in");
    setPassword("PanchayatAdmin2026!");
    setIsSubmitting(true);
    await signIn("admin.panchayat@terrapulse.kerala.gov.in", "PanchayatAdmin2026!");
    setIsSubmitting(false);
    setSuccessMessage("Logged in as Panchayat Official!");
    router.replace("/admin/dashboard");
  };

  return (
    <div
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 py-8"
      style={{ backgroundColor: "#000F1D", color: "#f0f4f8" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <div className="absolute inset-0 z-0 opacity-25">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, rgba(78,222,163,0.1) 0%, rgba(0,15,29,0.95) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#111820]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: "#4edea3",
              }}
            >
              STOP!
            </h1>
          </div>

          <span
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            DPI AUTHENTICATION
          </span>
        </div>

        <div className="mt-6">
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: 700, color: "#ffffff" }}>
            Sign In to STOP!
          </h2>
          <p className="mt-1.5 text-xs text-[#8aa299]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Role-based redirection: Admin credentials route to Panchayat Dashboard; Tourist credentials route to Mobile Explorer.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
              error
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
              check_circle
            </span>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#bbcabf]">Email Address</label>
            <div className="flex h-11 items-center rounded-xl border border-white/10 bg-[#0c2132]/90 px-3.5 focus-within:border-emerald-400/60">
              <span className="material-symbols-outlined text-[#4a6380] mr-2.5" style={{ fontSize: "20px" }}>
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@terrapulse.kerala.gov.in or tourist@gmail.com"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#4a6380]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#bbcabf]">Password</label>
            <div className="flex h-11 items-center rounded-xl border border-white/10 bg-[#0c2132]/90 px-3.5 focus-within:border-emerald-400/60">
              <span className="material-symbols-outlined text-[#4a6380] mr-2.5" style={{ fontSize: "20px" }}>
                lock
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#4a6380]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#4a6380] hover:text-white"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-bold text-[#003824] shadow-lg hover:bg-emerald-400 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Account</span>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  arrow_forward
                </span>
              </>
            )}
          </button>

          <div className="my-2 flex items-center justify-center gap-3 text-[11px] text-[#4a6380]">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span>INSTANT DEMO ACCESS</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDemoTouristLogin}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span>Tourist Demo</span>
            </button>

            <button
              type="button"
              onClick={handleDemoAdminLogin}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">shield_person</span>
              <span>Admin Demo</span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-[#8aa299]">
          Need a new account?{" "}
          <Link href="/register" className="font-semibold text-emerald-400 hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}

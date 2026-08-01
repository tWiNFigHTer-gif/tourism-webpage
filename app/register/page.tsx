"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

export default function ExplorerRegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("tourist");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setWarningMessage("");
    setSuccessMessage("");

    if (!agreeTerms) {
      setWarningMessage("You must agree to the DPI regulations to continue.");
      return;
    }

    if (!fullName || !email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
            full_name: fullName,
          },
        },
      });

      await signUp(email, password, fullName, selectedRole);

      if (error) {
        setErrorMessage(error.message || "Registration failed. Please try again.");
      } else {
        setSuccessMessage("Account created! Redirecting you to your portal...");
        const isAdmin = selectedRole === "panchayat_admin" || selectedRole === "super_admin" || email.toLowerCase().includes("admin");
        setTimeout(() => {
          if (isAdmin) {
            router.push("/admin/dashboard");
          } else {
            router.push("/mobile");
          }
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
            ACCOUNT REGISTRATION
          </span>
        </div>

        <div className="mt-6">
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: 700, color: "#ffffff" }}>
            Create Account
          </h2>
          <p className="mt-1.5 text-xs text-[#8aa299]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Select your role to configure appropriate access permissions.
          </p>
        </div>

        {warningMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 font-medium">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
              warning
            </span>
            <span>{warningMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 font-medium">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
              check_circle
            </span>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Role Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#bbcabf]">Select Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole("tourist")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === "tourist"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-400"
                    : "border-white/10 bg-[#0c2132]/60 text-[#94a3b8]"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  tour
                </span>
                <span>Tourist Explorer</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole("panchayat_admin")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === "panchayat_admin"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-400"
                    : "border-white/10 bg-[#0c2132]/60 text-[#94a3b8]"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  shield_person
                </span>
                <span>Panchayat Admin</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#bbcabf]">Full Name</label>
            <div className="flex h-11 items-center rounded-xl border border-white/10 bg-[#0c2132]/90 px-3.5 focus-within:border-emerald-400/60">
              <span className="material-symbols-outlined text-[#4a6380] mr-2.5" style={{ fontSize: "20px" }}>
                person
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Arjun Nair"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#4a6380]"
              />
            </div>
          </div>

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
                placeholder="user@keralawild.gov.in"
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
                placeholder="At least 6 characters"
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

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                if (e.target.checked) setWarningMessage("");
              }}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#0c2132] accent-emerald-500 shrink-0 cursor-pointer"
            />
            <label htmlFor="agreeTerms" className="text-xs text-[#8aa299] cursor-pointer leading-tight">
              I agree to adherence rules for DPI Spatial Tourism & Carrying Capacity regulations.
            </label>
          </div>

          <button
            type="submit"
            disabled={!agreeTerms || isSubmitting}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-bold text-[#003824] shadow-lg hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#003824] border-t-transparent" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register Account</span>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  person_add
                </span>
              </>
            )}
          </button>

          {/* Inline red error message below submit button */}
          {errorMessage && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium">
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-[#8aa299]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}

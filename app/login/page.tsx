"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/useAuth"

export default function ExplorerLoginPage() {
  const router = useRouter()
  const { user, signIn } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/mobile")
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.")
      return
    }

    setIsSubmitting(true)
    const { error } = await signIn(email, password)
    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error)
    } else {
      setSuccessMessage("Sign in successful! Redirecting to mobile explorer...")
      setTimeout(() => {
        router.replace("/mobile")
      }, 300)
    }
  }

  // Quick 1-click Demo Explorer Login helper
  const handleDemoLogin = async () => {
    setEmail("explorer.demo@terrapulse.kerala.gov.in")
    setPassword("KeralaWild2026!")
    setIsSubmitting(true)
    await signIn("explorer.demo@terrapulse.kerala.gov.in", "KeralaWild2026!")
    setIsSubmitting(false)
    setSuccessMessage("Logged in as Demo Explorer!")
    setTimeout(() => {
      router.replace("/mobile")
    }, 300)
  }

  return (
    <div
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 py-8"
      style={{ backgroundColor: "#0a0e13", color: "#f0f4f8" }}
    >
      {/* ── Google Fonts & Icons ───────────────────────────────────── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── Background topographic forest overlay ──────────────────── */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4Ar_PHNV9Es5TJpmYiH91zQ5jiY9TsSGdy6PssrSLwuBg3p_qoRoceaGwJIUnRHq81UUb_TOAIgGfEC8to3S6MdOqm5A_eggIMs4vRHsQApOIDQyufwkAu28KLHtYAdriaMkdz8UpckwLHCLxwrPbZBOfxlBP-mVIPGqvavXlhfzp6j0FP6zVaAAivN3G3_3waAJoh4iuN_QUTaJRY2ck4HfmWHJ9kGiBVgmTbY0pwNyOCDZnR_2idggtTiqbpGshU_8mi5oekxRD"
          alt="Topographic forest map"
          className="h-full w-full object-cover"
          style={{ opacity: 0.35, mixBlendMode: "luminosity" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, rgba(10,14,19,0.70) 0%, rgba(10,14,19,0.95) 100%)",
          }}
        />
      </div>

      {/* ── Stitch Explorer Login Glassmorphism Card ────────────────── */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#111820]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        {/* Brand Header */}
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
                letterSpacing: "-0.02em",
                color: "#4edea3",
              }}
            >
              KERALA WILD
            </h1>
          </div>

          <span
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            EXPLORER PORTAL
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-6">
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "24px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            Welcome Back, Explorer
          </h2>
          <p className="mt-1.5 text-xs text-[#8aa299]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Sign in to access your carrying-capacity entry passes, saved eco-trails, and field hazard reports.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
              error
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
              check_circle
            </span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Email Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#bbcabf]">Email Address</label>
            <div className="flex h-11 items-center rounded-xl border border-white/10 bg-[#0c2132]/90 px-3.5 transition-all focus-within:border-emerald-400/60 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className="material-symbols-outlined text-[#4a6380] mr-2.5" style={{ fontSize: "20px" }}>
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="explorer@keralawild.gov.in"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#4a6380]"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#bbcabf]">Explorer Password</label>
              <a href="#" className="text-[11px] font-medium text-emerald-400 hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="flex h-11 items-center rounded-xl border border-white/10 bg-[#0c2132]/90 px-3.5 transition-all focus-within:border-emerald-400/60 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.2)]">
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

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-[#0c2132] accent-emerald-500"
            />
            <label htmlFor="rememberMe" className="text-xs text-[#8aa299] cursor-pointer">
              Remember me on this mobile device
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-bold text-[#003824] shadow-lg transition-all hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#003824] border-t-transparent" />
                Signing In...
              </span>
            ) : (
              <>
                <span>Sign In as Explorer</span>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  arrow_forward
                </span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-1 flex items-center justify-center gap-3 text-[11px] text-[#4a6380]">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span>OR QUICK START</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          {/* Demo Sign In CTA */}
          <button
            type="button"
            onClick={handleDemoLogin}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-[#d0e5fb] transition-colors hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: "18px" }}>
              bolt
            </span>
            <span>Instant Demo Explorer Login</span>
          </button>
        </form>

        {/* Footer Link to Register */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-[#8aa299]">
          New to Terra-Pulse?{" "}
          <Link href="/register" className="font-semibold text-emerald-400 hover:underline">
            Create an Explorer Account
          </Link>
        </div>
      </div>
    </div>
  )
}

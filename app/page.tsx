"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const { user, profile } = useAuth();

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-12 font-sans"
      style={{ backgroundColor: "#000F1D", color: "#F8FAFC" }}
    >
      {/* Background Radial Glow */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 50% 30%, rgba(16,185,129,0.18) 0%, rgba(0,15,29,0.98) 75%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-3xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Badge Header */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>STOP ! • SPATIAL DPI PLATFORM</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
            STOP ! <span className="text-emerald-400">Spatial Portal</span>
          </h1>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
            Zero-GPS spatial safety system, live carrying capacity control, and administrative hazard red-zone management for Kerala ecotourism.
          </p>
        </div>

        {/* Portal Entry Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
          {/* Tourist Map Portal Button */}
          <Link
            href="/map"
            className="flex flex-col items-center justify-center p-6 rounded-2xl border border-emerald-500/30 bg-slate-900/90 text-left hover:bg-slate-800/90 hover:border-emerald-400 transition-all shadow-xl group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">map</span>
            </div>
            <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
              Tourist Map Explorer
            </h2>
            <p className="text-xs text-slate-400 mt-1 text-center">
              Explore destinations, view live green markers, slot availability &amp; spatial hazard alerts.
            </p>
          </Link>

          {/* Panchayat Admin Portal Button */}
          <Link
            href="/admin/dashboard"
            className="flex flex-col items-center justify-center p-6 rounded-2xl border border-amber-500/30 bg-slate-900/90 text-left hover:bg-slate-800/90 hover:border-amber-400 transition-all shadow-xl group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">shield_person</span>
            </div>
            <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
              Panchayat Admin Portal
            </h2>
            <p className="text-xs text-slate-400 mt-1 text-center">
              B2G Control Center, Red Zone polygon drawer, carrying capacity telemetry &amp; hazard triage.
            </p>
          </Link>
        </div>

        {/* Footer Auth Links */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-center gap-6 text-xs text-slate-400 font-mono">
          <Link href="/login" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">login</span>
            <span>Sign In / Demo Login</span>
          </Link>
          <span>•</span>
          <Link href="/register" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>Register Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

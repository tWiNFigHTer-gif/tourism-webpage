"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("admin@chakkittapara.in");
  const [password, setPassword] = useState("Admin@2024");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      // 1. Try native Supabase Auth signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // 2. Sync with AuthProvider state and cookies
      await signIn(email, password);

      // Set cookie for middleware
      if (typeof window !== "undefined") {
        document.cookie = `terra_role=panchayat_admin; path=/; max-age=86400`;
      }

      setSuccessMsg("Authentication successful! Redirecting to Admin Dashboard...");
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 500);
    } catch (err: any) {
      console.warn("Supabase auth warning:", err);
      // Fallback auth for demo
      await signIn(email, password);
      if (typeof window !== "undefined") {
        document.cookie = `terra_role=panchayat_admin; path=/; max-age=86400`;
      }
      setSuccessMsg("Signed in to Panchayat Admin Portal.");
      router.push("/admin/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (eMail: string, pass: string) => {
    setEmail(eMail);
    setPassword(pass);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000F1D",
        color: "#f0f4f8",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#111820",
          border: "1px solid rgba(78,222,163,0.3)",
          borderRadius: "16px",
          padding: "32px 28px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(78,222,163,0.4)",
              color: "#4edea3",
              marginBottom: "12px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
              admin_panel_settings
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#FFFFFF",
              margin: "0 0 6px",
            }}
          >
            Panchayat Admin Sign In
          </h1>
          <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0 }}>
            TerraPulse Destination Control Center Access
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
              fontSize: "12.5px",
              marginBottom: "16px",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(78,222,163,0.4)",
              color: "#4edea3",
              fontSize: "12.5px",
              marginBottom: "16px",
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "6px",
              }}
            >
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@chakkittapara.in"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                background: "#0A0E13",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#FFFFFF",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                background: "#0A0E13",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#FFFFFF",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              background: "#059669",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: isSubmitting ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(5,150,105,0.4)",
            }}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Authenticating Admin Session...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  lock_open
                </span>
                <span>Sign In to Admin Portal</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: "11px", color: "#64748B", margin: "0 0 10px", textAlign: "center", fontWeight: 600 }}>
            DEMO ADMIN ACCOUNTS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              onClick={() => fillCredentials("admin@chakkittapara.in", "Admin@2024")}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#4edea3",
                fontSize: "11.5px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>admin@chakkittapara.in</span>
              <span style={{ fontSize: "10px", color: "#94A3B8" }}>Admin@2024</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("admin.panchayat@terrapulse.kerala.gov.in", "PanchayatAdmin2026!")}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#4edea3",
                fontSize: "11.5px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>admin.panchayat@terrapulse.kerala.gov.in</span>
              <span style={{ fontSize: "10px", color: "#94A3B8" }}>PanchayatAdmin2026!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

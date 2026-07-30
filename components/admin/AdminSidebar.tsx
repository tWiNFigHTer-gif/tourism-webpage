"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  {
    label: "Panchayat Telemetry",
    href: "/admin/dashboard",
    icon: "grid_view",
    badge: null,
  },
  {
    label: "Places Manager",
    href: "/admin/places",
    icon: "place",
    badge: "CRUD",
  },
  {
    label: "Civic Incident Triage",
    href: "/admin/reports",
    icon: "warning",
    badge: "Live",
  },
  {
    label: "Red Zone Manager",
    href: "/admin/red-zones",
    icon: "polyline",
    badge: "Spatial",
  },
  {
    label: "Pass Verification",
    href: "/admin/passes",
    icon: "qr_code_scanner",
    badge: "QR",
  },
  {
    label: "Tourist Map Explorer",
    href: "/map",
    icon: "map",
    badge: "Live",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside
      style={{
        width: "260px",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        background: "#000F1D",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(78,222,163,0.3)",
            }}
          >
            <span className="material-symbols-outlined" style={{ color: "#000F1D", fontSize: "22px", fontWeight: 700 }}>
              shield_person
            </span>
          </div>
          <div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "17px",
                fontWeight: 700,
                color: "#4EDEA3",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              STOP !
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                color: "#64748B",
                margin: 0,
                fontWeight: 500,
              }}
            >
              Panchayat Civic Admin
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  background: isActive ? "rgba(78,222,163,0.12)" : "transparent",
                  color: isActive ? "#4EDEA3" : "#94A3B8",
                  border: isActive ? "1px solid rgba(78,222,163,0.25)" : "1px solid transparent",
                  transition: "all 0.2s ease",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13.5px",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      fontWeight: 600,
                      background: item.badge === "Live" ? "rgba(239,68,68,0.2)" : "rgba(78,222,163,0.2)",
                      color: item.badge === "Live" ? "#EF4444" : "#4EDEA3",
                      border: item.badge === "Live" ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(78,222,163,0.4)",
                      padding: "2px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Admin User Profile & Prominent Logout Footer */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(17,24,32,0.8)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#1E293B",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4EDEA3",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              {user?.email?.[0].toUpperCase() || "A"}
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#F1F5F9",
                  margin: 0,
                }}
              >
                {profile?.panchayat_name || "CKP Panchayat"}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "10.5px",
                  color: "#64748B",
                  margin: 0,
                }}
              >
                Official Admin
              </p>
            </div>
          </div>
        </div>

        {/* Dedicated Prominent Logout Button */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-semibold text-xs hover:bg-red-500/25 transition-all cursor-pointer shadow-md"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Sign Out / Logout</span>
        </button>
      </div>
    </aside>
  );
}

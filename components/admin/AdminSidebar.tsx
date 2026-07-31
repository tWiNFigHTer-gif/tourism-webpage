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
    label: "Events Manager",
    href: "/admin/events",
    icon: "event",
    badge: "CRUD",
  },
  {
    label: "Businesses & Guides",
    href: "/admin/businesses",
    icon: "store",
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
        background: "#FFFFFF",
        borderRight: "1px solid #E2E8F0",
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
            borderBottom: "1px solid #E2E8F0",
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
              background: "#ECFDF5",
              border: "1px solid rgba(5,150,105,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ color: "#059669", fontSize: "22px", fontWeight: 700 }}>
              shield_person
            </span>
          </div>
          <div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "17px",
                fontWeight: 700,
                color: "#059669",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              TerraPulse
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
                  background: isActive ? "rgba(5,150,105,0.08)" : "transparent",
                  color: isActive ? "#059669" : "#475569",
                  border: isActive ? "1px solid rgba(5,150,105,0.25)" : "1px solid transparent",
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
                      background: item.badge === "Live" ? "rgba(220,38,38,0.1)" : "rgba(5,150,105,0.1)",
                      color: item.badge === "Live" ? "#DC2626" : "#059669",
                      border: item.badge === "Live" ? "1px solid rgba(220,38,38,0.25)" : "1px solid rgba(5,150,105,0.25)",
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
          borderTop: "1px solid #E2E8F0",
          background: "#F8FAFC",
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
                background: "#ECFDF5",
                border: "1px solid rgba(5,150,105,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#059669",
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
                  color: "#0F172A",
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
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold text-xs hover:bg-red-100 transition-all cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Sign Out / Logout</span>
        </button>
      </div>
    </aside>
  );
}

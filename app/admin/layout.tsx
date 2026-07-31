"use client";

import React from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { ProtectedRoute } from "@/components/AuthProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
        <AdminSidebar />
        <main
          style={{
            flex: 1,
            marginLeft: "260px",
            minHeight: "100vh",
            background: "#F8FAFC",
            color: "#0F172A",
            padding: "28px 36px",
          }}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

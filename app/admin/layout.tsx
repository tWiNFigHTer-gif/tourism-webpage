"use client";

import React from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { ProtectedRoute } from "@/components/AuthProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div style={{ display: "flex", minHeight: "100vh", background: "#000F1D" }}>
        <AdminSidebar />
        <main
          style={{
            flex: 1,
            marginLeft: "260px",
            minHeight: "100vh",
            background: "#000F1D",
            color: "#F8FAFC",
            padding: "28px 36px",
          }}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

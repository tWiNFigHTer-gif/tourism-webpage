"use client";

import React from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { ProtectedRoute } from "@/components/AuthProvider";

export default function AdminGroupRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="flex min-h-screen bg-[#000F1D] text-slate-100 font-sans">
        {/* Traditional Admin Sidebar */}
        <AdminSidebar />
        <main className="flex-1 ml-[260px] min-h-screen bg-[#000F1D] text-slate-100 p-7">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

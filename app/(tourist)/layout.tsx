"use client";

import React from "react";

export default function TouristGroupRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full bg-slate-950 text-white overflow-hidden relative">
      {children}
    </div>
  );
}

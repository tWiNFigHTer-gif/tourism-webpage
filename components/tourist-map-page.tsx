"use client"

import { useRef, useState } from "react"
import { MapHeader } from "@/components/map-header"
import { MapSidebar } from "@/components/map-sidebar"
import { MapCanvas, type MapCanvasRef } from "@/components/map/MapCanvas"

type Role = "tourist" | "warden"

export default function TouristMapPage() {
  const [role, setRole] = useState<Role>("tourist")
  const mapRef = useRef<MapCanvasRef>(null)

  return (
    <>
      {/* Material Symbols icon font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <div className="flex h-dvh flex-col bg-bg-deep text-text-primary">
        <MapHeader role={role} onRoleChange={setRole} />
        <div className="flex flex-1 overflow-hidden pt-[56px]">
          <MapSidebar />
          <MapCanvas ref={mapRef} />
        </div>
      </div>
    </>
  )
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MapLocation } from "@/components/map/LeafletMobileMap";

interface RichLocationDetailSheetProps {
  location: MapLocation;
  capacityPct: number;
  capacityColor: string;
  isFull: boolean;
  slotsRemaining: number;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onPlanTripFromHere: () => void;
  onNavigate: () => void;
}

// Kerala Responsible Tourism enterprise dataset mapped per location type
const KERALA_RT_DATA = {
  enterprises: [
    {
      id: "ent-1",
      name: "Wild Wayanad Honey Apiary",
      type: "Honey Farm",
      icon: "hive",
      description: "Organic stingless bee honey harvesting & fresh honeycomb tasting tour.",
      contact: "+91 94470 12345",
      badge: "RT Certified",
    },
    {
      id: "ent-2",
      name: "Malabar Cardamom & Organic Spice Estate",
      type: "Spice Farm",
      icon: "eco",
      description: "Walk through shaded pepper vines, vanilla orchids & green cardamom trails.",
      contact: "+91 98460 56789",
      badge: "Organic Certified",
    },
    {
      id: "ent-3",
      name: "Kadalundi Bamboo & Coir Handloom Weavers",
      type: "Handicrafts",
      icon: "back_hand",
      description: "Artisanal mats, coconut shell utensils & traditional eco-products.",
      contact: "+91 94001 88990",
      badge: "GI Tagged",
    },
    {
      id: "ent-4",
      name: "Authentic Toddy Shop & Marine Delicacies",
      type: "Local Eatery",
      icon: "restaurant",
      description: "Karimeen Pollichathu, Kappa with spicy Fish Curry & Fresh Tender Coconut Water.",
      contact: "+91 94465 11223",
      badge: "Culinary Heritage",
    },
  ],
  guides: [
    {
      name: "Sujith Kumar",
      role: "Forest Naturalist & Bird Tracker",
      experience: "12 yrs exp",
      rating: "4.9 ★",
      phone: "+91 97451 22334",
    },
    {
      name: "Lakshmi Amma",
      role: "Tribal Herbalist & Plant Storyteller",
      experience: "20 yrs exp",
      rating: "5.0 ★",
      phone: "+91 94952 33445",
    },
  ],
  ecoActivities: [
    { title: "Backwater Bamboo Rafting", duration: "2 Hours", ecoTag: "Zero Emission" },
    { title: "Mangrove Kayaking Trail", duration: "1.5 Hours", ecoTag: "Guided" },
    { title: "Native Tree Plantation Drive", duration: "45 Mins", ecoTag: "Community" },
  ],
  souvenirs: [
    "Raw Wild Forest Honey (500g Jar)",
    "GI-Tagged Nilambur Teak Craft",
    "Hand-pounded Pepper & Vanilla Pods",
    "Coconut Shell Carved Tea Cups",
  ],
  travelTips: [
    "Strict Zero Single-Use Plastic Zone - carry reusable water flasks.",
    "Maintain silence near bird nesting grounds in mangrove estuaries.",
    "Best wildlife sighting window: 06:30 AM to 09:00 AM.",
  ],
  emergencyContacts: {
    forestRange: "+91 495 2420100 (Forest Department)",
    policeClinic: "112 / +91 495 2365000 (Local Eco-Clinic)",
  },
};

export default function RichLocationDetailSheet({
  location,
  capacityPct,
  capacityColor,
  isFull,
  slotsRemaining,
  isSaved,
  onToggleSave,
  onClose,
  onPlanTripFromHere,
  onNavigate,
}: RichLocationDetailSheetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "rt_businesses" | "guides" | "experiences" | "souvenirs" | "tips">("overview");

  return (
    <div
      style={{
        position: "fixed",
        bottom: "60px",
        left: 0,
        width: "100%",
        maxHeight: "82vh",
        zIndex: 45,
        padding: "0 10px",
        paddingBottom: "8px",
        animation: "slideUp 0.25s ease-out",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "rgba(11,18,26,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(78,222,163,0.25)",
          borderRadius: "20px 20px 0 0",
          padding: "14px 16px 18px",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.8)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Sheet Grab Handle & Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ width: "24px" }} />
          <div
            style={{
              width: "44px",
              height: "4px",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.25)",
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              color: "#bbcabf",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              close
            </span>
          </button>
        </div>

        {/* Hero Photo Header */}
        <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-white/10 flex-shrink-0">
          <img
            src={location.image}
            alt={location.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b121a] via-transparent to-transparent opacity-90" />
          
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-emerald-400 font-semibold">
            <span className="material-symbols-outlined text-[13px]">verified</span>
            <span>Kerala Responsible Tourism Zone</span>
          </div>

          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              fontWeight: 600,
              color: capacityColor,
              background: "rgba(10,14,19,0.9)",
              padding: "2px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            className="absolute bottom-2.5 right-2.5"
          >
            {capacityPct}% CAPACITY {isFull ? "(FULL)" : `(${slotsRemaining} slots left)`}
          </span>
        </div>

        {/* Title & Distance */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "19px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#f0f4f8",
                  margin: 0,
                }}
              >
                {location.name}
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#4edea3", fontWeight: 600, margin: "2px 0 0" }}>
                📍 {location.distance} • {location.region}
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleSave}
              style={{
                background: isSaved ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)",
                border: isSaved ? "1px solid #4edea3" : "1px solid rgba(255,255,255,0.12)",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                color: isSaved ? "#4edea3" : "#bbcabf",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                {isSaved ? "bookmark" : "bookmark_border"}
              </span>
            </button>
          </div>
        </div>

        {/* Multi-Tab Navigation Bar */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "8px",
            marginBottom: "12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
          className="no-scrollbar"
        >
          {[
            { id: "overview", label: "Overview", icon: "info" },
            { id: "rt_businesses", label: "Local Farms & Eateries", icon: "store" },
            { id: "guides", label: "Local Guides", icon: "person_pin" },
            { id: "experiences", label: "Eco Activities", icon: "rowing" },
            { id: "souvenirs", label: "Handicrafts & Gifts", icon: "shopping_bag" },
            { id: "tips", label: "Tips & Emergency", icon: "shield_with_heart" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                fontWeight: activeTab === tab.id ? 700 : 500,
                background: activeTab === tab.id ? "rgba(78,222,163,0.18)" : "rgba(255,255,255,0.04)",
                color: activeTab === tab.id ? "#4edea3" : "#94a3b8",
                border: activeTab === tab.id ? "1px solid rgba(78,222,163,0.4)" : "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Tab Contents */}
        <div style={{ flex: 1, minHeight: "140px" }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5, margin: 0 }}>
                {location.description}
              </p>

              {/* Carrying Capacity Indicator */}
              <div style={{ background: "rgba(15,23,42,0.6)", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                  <span>Live Carrying Capacity</span>
                  <span style={{ color: capacityColor, fontWeight: 700 }}>{capacityPct}% FULL</span>
                </div>
                <div style={{ height: "5px", background: "#0c2132", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${capacityPct}%`, background: capacityColor, borderRadius: "999px" }} />
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/mobile/book?location_id=${location.id}&location_name=${encodeURIComponent(location.name)}`
                    )
                  }
                  style={{
                    flex: 1,
                    background: "#10b981",
                    color: "#003824",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "10px 14px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  Book Entry Slot
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    arrow_forward
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onPlanTripFromHere}
                  style={{
                    background: "rgba(78,222,163,0.15)",
                    border: "1px solid rgba(78,222,163,0.4)",
                    color: "#4edea3",
                    borderRadius: "9999px",
                    padding: "10px 12px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>route</span>
                  Plan Trip
                </button>

                <button
                  type="button"
                  onClick={onNavigate}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#f1f5f9",
                    borderRadius: "9999px",
                    padding: "10px 12px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>near_me</span>
                  Directions
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: KERALA RT BUSINESSES */}
          {activeTab === "rt_businesses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "11px", color: "#4edea3", fontWeight: 600 }}>
                🌿 KERALA RESPONSIBLE TOURISM ENTERPRISES & PRODUCERS
              </div>
              {KERALA_RT_DATA.enterprises.map((ent) => (
                <div
                  key={ent.id}
                  style={{
                    background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(78,222,163,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4edea3",
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      {ent.icon}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", fontWeight: 700, color: "#f8fafc" }}>
                        {ent.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "9px",
                          background: "rgba(78,222,163,0.2)",
                          color: "#4edea3",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {ent.badge}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#94a3b8", margin: "2px 0 6px" }}>
                      {ent.description}
                    </p>
                    <a
                      href={`tel:${ent.contact}`}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "11px",
                        color: "#10b981",
                        textDecoration: "none",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>call</span>
                      {ent.contact}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: LOCAL GUIDES */}
          {activeTab === "guides" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "11px", color: "#4edea3", fontWeight: 600 }}>
                🧭 VERIFIED LOCAL NATURALISTS & COMMUNITY GUIDES
              </div>
              {KERALA_RT_DATA.guides.map((gd, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                      {gd.name} <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>{gd.rating}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{gd.role} • {gd.experience}</div>
                  </div>
                  <a
                    href={`tel:${gd.phone}`}
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.4)",
                      color: "#10b981",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>call</span>
                    Book Guide
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: ECO ACTIVITIES */}
          {activeTab === "experiences" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", color: "#4edea3", fontWeight: 600 }}>
                🚣 COMMUNITY ECO-TOURISM EXPERIENCES
              </div>
              {KERALA_RT_DATA.ecoActivities.map((act, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#f1f5f9", fontWeight: 600 }}>{act.title}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>{act.duration}</span>
                    <span style={{ fontSize: "10px", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "1px 6px", borderRadius: "4px" }}>
                      {act.ecoTag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: SOUVENIRS */}
          {activeTab === "souvenirs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", color: "#4edea3", fontWeight: 600 }}>
                🎁 GI-TAGGED HANDICRAFTS & ORGANIC SOUVENIRS
              </div>
              {KERALA_RT_DATA.souvenirs.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#4edea3" }}>
                    card_giftcard
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: TIPS & EMERGENCY */}
          {activeTab === "tips" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", padding: "10px", borderRadius: "10px" }}>
                <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: 700, marginBottom: "4px" }}>
                  🚨 EMERGENCY & RANGER CONTACTS
                </div>
                <div style={{ fontSize: "11px", color: "#f8fafc", lineHeight: 1.6 }}>
                  <div><strong>Forest Helpline:</strong> {KERALA_RT_DATA.emergencyContacts.forestRange}</div>
                  <div><strong>Clinic / Police:</strong> {KERALA_RT_DATA.emergencyContacts.policeClinic}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#4edea3", fontWeight: 600, marginBottom: "4px" }}>
                  🌱 CULTURAL & ECO-ETIQUETTE TIPS
                </div>
                {KERALA_RT_DATA.travelTips.map((tip, idx) => (
                  <div key={idx} style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                    • {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

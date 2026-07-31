"use client";

import { useEffect, useState, useCallback } from "react";
import { getLocations } from "@/lib/db";
import { getBusinesses, insertBusiness, updateBusiness, deleteBusiness } from "@/lib/db";
import type { LocalBusiness } from "@/lib/types";

const CATEGORIES = [
  { id: "business", label: "Local Enterprise", icon: "store" },
  { id: "guide", label: "Community Guide", icon: "person_pin" },
  { id: "homestay", label: "Eco Homestay", icon: "home" },
  { id: "eatery", label: "Local Eatery", icon: "restaurant" },
  { id: "handicraft", label: "Artisanal Craft", icon: "back_hand" },
  { id: "service", label: "Service Provider", icon: "handshake" },
];

const STATUS_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  verified: { bg: "rgba(78,222,163,0.15)", color: "#4edea3", label: "VERIFIED" },
  pending:  { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", label: "PENDING" },
  hidden:   { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "HIDDEN" },
};

const EMPTY_FORM = {
  name: "",
  category: "business" as LocalBusiness["category"],
  title: "",
  description: "",
  contact: "",
  location_id: "",
  location_name: "",
  status: "verified" as LocalBusiness["status"],
  badge: "",
};

export default function BusinessesManagerPage() {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBusinesses(undefined, true);
      setBusinesses(data);
    } catch (e: any) {
      setError(e.message || "Failed to load businesses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    getLocations()
      .then((locs: any[]) => setPlaces(locs.map((l: any) => ({ id: l.id, name: l.name }))))
      .catch(() => setPlaces([]));
  }, [fetchItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setError(null);
  };

  const openEdit = (item: LocalBusiness) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      title: item.title ?? "",
      description: item.description ?? "",
      contact: item.contact ?? "",
      location_id: item.location_id ?? "",
      location_name: item.location_name ?? "",
      status: item.status,
      badge: item.badge ?? "",
    });
    setShowForm(true);
    setError(null);
  };

  const handleLocationChange = (id: string) => {
    const match = places.find((p) => p.id === id);
    setForm((f) => ({ ...f, location_id: id, location_name: match?.name ?? "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const matchCat = CATEGORIES.find((c) => c.id === form.category);
      const payload = {
        name: form.name.trim(),
        category: form.category,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        contact: form.contact.trim() || null,
        location_id: form.location_id || null,
        location_name: form.location_name || null,
        status: form.status,
        badge: form.badge.trim() || null,
        icon: matchCat?.icon || "store",
      };
      if (editingId) {
        await updateBusiness(editingId, payload);
      } else {
        await insertBusiness(payload);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "businesses" } }));
      }
      setShowForm(false);
      setEditingId(null);
      await fetchItems();
    } catch (e: any) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: LocalBusiness) => {
    const nextStatus = item.status === "verified" ? "hidden" : "verified";
    try {
      await updateBusiness(item.id, { status: nextStatus });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "businesses" } }));
      }
      await fetchItems();
    } catch (e: any) {
      setError(e.message || "Status toggle failed.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteBusiness(id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "businesses" } }));
      }
      await fetchItems();
    } catch (e: any) {
      setError(e.message || "Delete failed.");
    }
  };

  const filtered = filterCat === "all"
    ? businesses
    : businesses.filter((b) => b.category === filterCat);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "960px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
            Local Businesses, Guides &amp; Services
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            Manage verified local enterprises, naturalists, eateries &amp; homestays attached to destinations.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ background: "rgba(78,222,163,0.12)", border: "1px solid rgba(78,222,163,0.3)", borderRadius: "8px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#4EDEA3", fontFamily: "'JetBrains Mono', monospace" }}>
            {businesses.length} Total
          </span>
          <button
            type="button"
            onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "#10b981", border: "none", borderRadius: "10px", padding: "10px 18px", color: "#003824", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
            New Listing
          </button>
        </div>
      </div>

      {/* Global Error */}
      {error && (
        <div style={{ marginBottom: "16px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "12px 16px", color: "#fca5a5", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Category Filter Pills */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", overflowX: "auto", paddingBottom: "4px" }}>
        <button
          type="button"
          onClick={() => setFilterCat("all")}
          style={{ background: filterCat === "all" ? "rgba(78,222,163,0.2)" : "rgba(255,255,255,0.04)", border: filterCat === "all" ? "1px solid #4edea3" : "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "6px 12px", color: filterCat === "all" ? "#4edea3" : "#94a3b8", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        >
          All Categories ({businesses.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = businesses.filter((b) => b.category === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCat(c.id)}
              style={{ background: filterCat === c.id ? "rgba(78,222,163,0.2)" : "rgba(255,255,255,0.04)", border: filterCat === c.id ? "1px solid #4edea3" : "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "6px 12px", color: filterCat === c.id ? "#4edea3" : "#94a3b8", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "24px", marginBottom: "28px" }}
        >
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#4EDEA3", margin: "0 0 20px" }}>
            {editingId ? "Edit Listing" : "Add New Local Business / Guide"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                type="text"
                placeholder="e.g. Wild Wayanad Apiary"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
                style={inputStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: "#FFFFFF", color: "#0F172A" }}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Associated Destination</label>
              <select
                value={form.location_id}
                onChange={(e) => handleLocationChange(e.target.value)}
                style={inputStyle}
              >
                <option value="" style={{ background: "#FFFFFF", color: "#0F172A" }}>— Select place —</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "#FFFFFF", color: "#0F172A" }}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Subtitle / Specialty</label>
              <input
                type="text"
                placeholder="e.g. Honey Harvesting & Tasting Tour"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Phone / Contact</label>
              <input
                type="text"
                placeholder="e.g. +91 94470 12345"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Badge Tag</label>
              <input
                type="text"
                placeholder="e.g. RT Certified, GI Tagged, 12 yrs exp"
                value={form.badge}
                onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Verification Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                style={inputStyle}
              >
                <option value="verified" style={{ background: "#FFFFFF", color: "#0F172A" }}>VERIFIED</option>
                <option value="pending" style={{ background: "#FFFFFF", color: "#0F172A" }}>PENDING</option>
                <option value="hidden" style={{ background: "#FFFFFF", color: "#0F172A" }}>HIDDEN</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                rows={2}
                placeholder="Brief description of products, services, or guide credentials..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={saving}
                style={{ background: "#059669", color: "#FFFFFF", border: "none", borderRadius: "9px", padding: "10px 22px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
              >
                {saving ? "Saving…" : editingId ? "Update Listing" : "Save Listing"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                style={{ background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1", borderRadius: "9px", padding: "10px 18px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div style={{ color: "#64748B", fontSize: "13px", padding: "32px 0" }}>Loading listings…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", background: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#0F172A", display: "block", marginBottom: "8px" }}>store</span>
          <p style={{ color: "#475569", fontSize: "14px", margin: 0 }}>No business or guide listings match this filter.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {filtered.map((item) => {
            const badge = STATUS_BADGES[item.status] || STATUS_BADGES.verified;
            return (
              <div
                key={item.id}
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ background: badge.bg, color: badge.color, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
                      {badge.label}
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748B", textTransform: "capitalize" }}>{item.category}</span>
                  </div>

                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 700, color: "#0F172A", margin: "0 0 4px" }}>
                    {item.name}
                  </h3>

                  {item.title && (
                    <p style={{ fontSize: "12px", color: "#059669", fontWeight: 600, margin: "0 0 6px" }}>{item.title}</p>
                  )}

                  {item.description && (
                    <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 8px", lineHeight: 1.4 }}>{item.description}</p>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #F1F5F9", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    style={{ background: item.status === "verified" ? "#FEF2F2" : "#ECFDF5", border: "none", color: item.status === "verified" ? "#DC2626" : "#059669", fontSize: "11px", fontWeight: 700, borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}
                  >
                    {item.status === "verified" ? "Hide" : "Verify"}
                  </button>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      style={{ background: "#F1F5F9", color: "#0F172A", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#475569",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#F8FAFC",
  border: "1px solid #CBD5E1",
  borderRadius: "9px",
  padding: "10px 12px",
  color: "#0F172A",
  caretColor: "#059669",
  fontSize: "13.5px",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
};

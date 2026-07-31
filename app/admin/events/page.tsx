"use client";

import { useEffect, useState, useCallback } from "react";
import { getLocations } from "@/lib/db";
import { getEvents, insertEvent, updateEvent, deleteEvent } from "@/lib/db";
import type { TourismEvent } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDatetimeLocal(iso: string) {
  return iso ? new Date(iso).toISOString().slice(0, 16) : "";
}

function eventStatus(ev: TourismEvent): "upcoming" | "live" | "past" {
  const now = Date.now();
  const start = new Date(ev.start_time).getTime();
  const end = ev.end_time ? new Date(ev.end_time).getTime() : null;
  if (start > now) return "upcoming";
  if (end && end < now) return "past";
  return "live";
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  upcoming: { bg: "rgba(78,222,163,0.15)", color: "#4edea3", label: "UPCOMING" },
  live:     { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", label: "LIVE NOW" },
  past:     { bg: "rgba(100,116,139,0.15)", color: "#64748b", label: "PAST" },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  location_id: "",
  location_name: "",
  start_time: "",
  end_time: "",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function EventsManagerPage() {
  const [events, setEvents] = useState<TourismEvent[]>([]);
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (e: any) {
      setError(e.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    getLocations()
      .then((locs: any[]) => setPlaces(locs.map((l: any) => ({ id: l.id, name: l.name }))))
      .catch(() => setPlaces([]));
  }, [fetchEvents]);

  // ── Form helpers ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setError(null);
  };

  const openEdit = (ev: TourismEvent) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      location_id: ev.location_id ?? "",
      location_name: ev.location_name ?? "",
      start_time: formatDatetimeLocal(ev.start_time),
      end_time: ev.end_time ? formatDatetimeLocal(ev.end_time) : "",
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
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.start_time)   { setError("Start date/time is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location_id: form.location_id || null,
        location_name: form.location_name || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        image_url: null,
        is_active: true,
      };
      if (editingId) {
        await updateEvent(editingId, payload);
      } else {
        await insertEvent(payload);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "events" } }));
      }
      setShowForm(false);
      setEditingId(null);
      await fetchEvents();
    } catch (e: any) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete event "${title}"? This cannot be undone.`)) return;
    try {
      await deleteEvent(id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "events" } }));
      }
      await fetchEvents();
    } catch (e: any) {
      setError(e.message || "Delete failed.");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "900px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Tourism Events Manager
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            Create and manage destination events visible to tourists on place detail pages.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ background: "#ECFDF5", border: "1px solid rgba(5,150,105,0.3)", borderRadius: "8px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>
            {events.length} events
          </span>
          <button
            id="events-create-btn"
            type="button"
            onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "#059669", border: "none", borderRadius: "10px", padding: "10px 18px", color: "#FFFFFF", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
            New Event
          </button>
        </div>
      </div>

      {/* Global error */}
      {error && (
        <div style={{ marginBottom: "16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "10px", padding: "12px 16px", color: "#DC2626", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Create / Edit Form Panel */}
      {showForm && (
        <form
          id="events-form"
          onSubmit={handleSubmit}
          style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "14px", padding: "24px", marginBottom: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#059669", margin: "0 0 20px" }}>
            {editingId ? "Edit Event" : "Create New Event"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Title */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Event Title *</label>
              <input
                id="events-title"
                type="text"
                placeholder="e.g. Kadalundi Migratory Bird Festival"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>

            {/* Place */}
            <div>
              <label style={labelStyle}>Associated Place</label>
              <select
                id="events-location"
                value={form.location_id}
                onChange={(e) => handleLocationChange(e.target.value)}
                style={inputStyle}
              >
                <option value="" style={{ background: "#FFFFFF", color: "#0F172A" }}>— Select a destination —</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "#FFFFFF", color: "#0F172A" }}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <input
                id="events-description"
                type="text"
                placeholder="Short description of the event"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Start date */}
            <div>
              <label style={labelStyle}>Start Date & Time *</label>
              <input
                id="events-start-time"
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>

            {/* End date */}
            <div>
              <label style={labelStyle}>End Date & Time (optional)</label>
              <input
                id="events-end-time"
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Actions */}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                id="events-submit-btn"
                type="submit"
                disabled={saving}
                style={{ background: "#059669", color: "#FFFFFF", border: "none", borderRadius: "9px", padding: "10px 22px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
              >
                {saving ? "Saving…" : editingId ? "Update Event" : "Create Event"}
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

      {/* Events List */}
      {loading ? (
        <div style={{ color: "#64748B", fontSize: "13px", padding: "32px 0" }}>Loading events list…</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", background: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#0F172A", display: "block", marginBottom: "8px" }}>
            event_available
          </span>
          <p style={{ color: "#475569", fontSize: "14px", margin: 0 }}>
            No events yet. Click <strong style={{ color: "#059669" }}>New Event</strong> to create one.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {events.map((ev) => {
            const st = eventStatus(ev);
            const badge = STATUS_STYLE[st];
            return (
              <div
                key={ev.id}
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", opacity: st === "past" ? 0.75 : 1 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ background: badge.bg, color: badge.color, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
                      {badge.label}
                    </span>
                    {ev.location_name && (
                      <span style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "3px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>location_on</span>
                        {ev.location_name}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 700, color: "#0F172A", margin: "0 0 4px" }}>
                    {ev.title}
                  </h3>

                  {ev.description && (
                    <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.description}
                    </p>
                  )}

                  <div style={{ fontSize: "11px", color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date(ev.start_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    {ev.end_time && ` → ${new Date(ev.end_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => openEdit(ev)}
                    style={{ background: "#F1F5F9", color: "#0F172A", border: "1px solid #CBD5E1", borderRadius: "7px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>edit</span>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ev.id, ev.title)}
                    style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: "7px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>delete</span>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shared style tokens ───────────────────────────────────────────────────────
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

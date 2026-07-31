"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Location } from "@/lib/types";
import { createPlace, deletePlace, getPlaces, type PlaceInput, updatePlace } from "@/lib/places";
import { DEFAULT_LOCATIONS } from "@/lib/db";

const empty: PlaceInput = { name: "", description: "", category: "Ecotourism", lat: 11.25, lng: 75.78, region: "Kerala", capacity_max: 50, status: "active" };

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Location[]>([]); const [form, setForm] = useState<PlaceInput>(empty); const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const load = async () => { try { const res = await getPlaces(true); setPlaces(res && res.length > 0 ? res : (DEFAULT_LOCATIONS as any)); } catch (e) { setPlaces(DEFAULT_LOCATIONS as any); } };
  useEffect(() => { load(); }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { if (editing) await updatePlace(editing, form); else await createPlace(form); setForm(empty); setEditing(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save place."); } finally { setSaving(false); } };
  const edit = (place: Location) => { setEditing(place.id); setForm({ name: place.name, description: place.description || "", category: place.category || "Ecotourism", lat: place.lat, lng: place.lng, region: place.region || "Kerala", capacity_max: place.capacity_max || 50, status: place.status || (place.is_active === false ? "hidden" : "active") }); };
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", color: "#0F172A", fontFamily: "'Inter', sans-serif" }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ color: "#059669", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>DESTINATION DIRECTORY</p>
        <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700 }}>Places Manager</h1>
        <p style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>Create, update, hide, or delete destinations used by every tourist discovery surface.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(310px, .8fr) 1.4fr", gap: 24 }}>
        <form onSubmit={submit} style={{ background: "#FFFFFF", padding: 20, borderRadius: 14, border: "1px solid #E2E8F0", display: "grid", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#059669" }}>{editing ? "Edit place" : "New place"}</h2>
          
          <label style={adminLabelStyle}>Name
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={adminInputStyle} required />
          </label>
          
          <label style={adminLabelStyle}>Category
            <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={adminInputStyle} />
          </label>
          
          <label style={adminLabelStyle}>Latitude
            <input type="number" step="any" value={form.lat} onChange={e=>setForm({...form,lat:Number(e.target.value)})} style={adminInputStyle} required />
          </label>
          
          <label style={adminLabelStyle}>Longitude
            <input type="number" step="any" value={form.lng} onChange={e=>setForm({...form,lng:Number(e.target.value)})} style={adminInputStyle} required />
          </label>
          
          <label style={adminLabelStyle}>Status
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value as "active"|"hidden"})} style={adminInputStyle}>
              <option value="active" style={{ background: "#FFFFFF", color: "#0F172A" }}>Active</option>
              <option value="hidden" style={{ background: "#FFFFFF", color: "#0F172A" }}>Hidden</option>
            </select>
          </label>
          
          <label style={adminLabelStyle}>Description
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{ ...adminInputStyle, minHeight: 70, resize: "none" }} />
          </label>
          
          {error && <p style={{ color: "#DC2626", fontSize: 12, margin: 0 }}>{error}</p>}
          
          <button disabled={saving} style={{ background: "#059669", color: "#FFFFFF", border: "none", padding: "10px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create place"}
          </button>
          
          {editing && (
            <button type="button" onClick={()=>{setEditing(null);setForm(empty)}} style={{ background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          )}
        </form>

        <section style={{ background: "#FFFFFF", padding: 20, borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>All places ({places.length})</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ color: "#64748B", borderBottom: "1px solid #E2E8F0", fontSize: 12 }}>
                <th style={{ padding: "8px 4px" }}>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Coordinates</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {places.map(place=>(
                <tr key={place.id} style={{ borderBottom: "1px solid #F1F5F9", fontSize: 13 }}>
                  <td style={{ padding: "12px 4px" }}>
                    <strong style={{ color: "#0F172A" }}>{place.name}</strong><br/>
                    <small style={{ color: "#64748B" }}>{place.region}</small>
                  </td>
                  <td style={{ color: "#475569" }}>{place.category}</td>
                  <td>
                    <span style={{ background: place.status === "hidden" ? "#FEF2F2" : "#ECFDF5", color: place.status === "hidden" ? "#DC2626" : "#059669", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      {place.status || (place.is_active === false ? "hidden" : "active")}
                    </span>
                  </td>
                  <td style={{ color: "#64748B", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {Number(place.lat).toFixed(3)}, {Number(place.lng).toFixed(3)}
                  </td>
                  <td style={{ display: "flex", gap: 8, padding: "12px 0", justifyContent: "flex-end" }}>
                    <button onClick={()=>edit(place)} style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#0F172A", cursor: "pointer" }}>
                      Edit
                    </button>
                    <button onClick={async()=>{if(confirm(`Delete ${place.name}?`)){try{await deletePlace(place.id);await load()}catch(e){setError(e instanceof Error?e.message:"Unable to delete place.")}}}} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

const adminLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
};

const adminInputStyle: React.CSSProperties = {
  width: "100%",
  background: "#F8FAFC",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#0F172A",
  caretColor: "#059669",
  fontSize: 13.5,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
};

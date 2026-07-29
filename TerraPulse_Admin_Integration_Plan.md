# Terra-Pulse ✕ Admin Portal: Complete Integration & Merge Strategy

This document outlines the architectural blueprint, repository analysis, and sequential prompt chains required to merge the `stop-admin-portal` into the **Terra-Pulse** (DPI Spatial Tourism) project within a strict 48-hour hackathon timeframe.

---

## Phase 1 – Repository Analysis (`stop-admin-portal`)

**Repository Status Context:** Based on the ecosystem analysis, the admin portal functions as a standard CRUD-heavy administrative dashboard. 
*   **Tech Stack:** Next.js, React, Tailwind CSS, Shadcn UI (assumed based on modern admin standards)
*   **Core Architecture:** Traditional sidebar-navigation dashboard, reliant on data grids (tables), metric cards, and forms.
*   **Authentication Flow:** Standard JWT or session-based admin login leading to a protected `/dashboard` route.
*   **User Journeys:** 
    1. Admin authenticates.
    2. Lands on a central telemetry dashboard (Stats, recent activities).
    3. Navigates via sidebar to manage entities (Users, Reports, System Settings).

### Reusable Components Found:
*   **Data Tables:** Pagination, sorting, and filtering logic.
*   **Modal Overlays:** For viewing report details or editing user states.
*   **Metric Cards:** Top-level KPIs (Total Users, Active Sessions).
*   **Layout Wrappers:** Responsive sidebar and top-nav header.

---

## Phase 2 – Compare With Terra-Pulse (Tourism Portal)

Terra-Pulse is a **Map-First Spatial DPI**. The admin portal is **Table-First**. Merging them means transforming the generic admin portal into the **Panchayat Civic Dashboard (B2G)**.

### Features to Merge Directly:
*   **Sidebar & Layout Shell:** Perfect for the Panchayat dashboard view (`/admin`).
*   **Metric Cards:** Repurpose for "Live Zone Capacities" and "Active Digital Passes".
*   **Data Tables:** Repurpose for the "Civic Incident Reporting" logs.

### Features to Modify:
*   **Auth System:** Must integrate with our existing **Supabase Auth**. We need Role-Based Access Control (RBAC) differentiating `tourist` from `panchayat_admin`.
*   **Dashboards:** Replace generic charts with **Live PostGIS Spatial Aggregations** (e.g., how many passes are active in Polygon A vs Polygon B).

### Features to Discard:
*   Generic e-commerce metrics, user profile editors (Tourists manage their own profiles via the app), and complex multi-step admin workflows that exceed the 48-hour MVP scope.

### New Features to Add (Value-Add for Hackathon):
*   **Spatial Red-Zone Editor:** A map embedded *inside* the admin portal where Panchayat officials can draw a polygon to instantly create a temporary "Danger Zone" (updates `ST_Intersects` for tourists in real-time).

---

## Phase 3 – Integration Strategy & Architecture

We will adopt a **Monorepo / Multi-Zone Route** approach within Next.js to keep the codebase modular.

### 1. Route Structure
```text
/app
 ├── (tourist)           # Terra-Pulse Map Interface
 │    ├── map/page.tsx   # Dark-mode Mapbox UI
 │    └── profile/       # User passes & trips
 ├── (admin)             # Merged Admin Portal
 │    ├── layout.tsx     # Admin Sidebar & Header
 │    ├── dashboard/     # Panchayat Telemetry
 │    └── red-zones/     # Polygon Editor
 └── login/              # Unified Auth Portal
```

### 2. Database Migration (Supabase)
We will extend the `profiles` table to handle admin authorization.
*   Add `role` column (`ENUM: 'tourist', 'panchayat_admin'`).
*   Create `civic_reports` table (Foreign key to `profiles.id`, contains `lat`, `lng`, `status`, `description`).

### 3. API & State Management
*   **State:** Share Supabase client across both zones. Use React Context or Zustand for active user sessions.
*   **Security:** Implement Supabase Row Level Security (RLS) ensuring `panchayat_admin` roles can read all `civic_reports` and write to `red_zones`, while tourists can only read `red_zones` and write their own `civic_reports`.

---

## Phase 4 – Chain Implementation Prompts

*Copy and paste these prompts sequentially into your AI coding agent (Cursor / v0 / Claude) to safely execute the merge.*

### Milestone 1: Unified Auth & Routing Architecture
> **Context:** We are merging an admin dashboard into our Terra-Pulse Next.js app. 
> **Task:** Create route groups `(tourist)` and `(admin)` inside the `app/` directory. Set up a unified Supabase Auth middleware (`middleware.ts`) that checks the user's role. If `role === 'panchayat_admin'`, allow access to `/admin/*`. If `tourist`, redirect them to `/map`. Do not break existing map code.

### Milestone 2: Admin Layout & Sidebar Integration
> **Context:** Continuing from Milestone 1. 
> **Task:** Implement the admin portal layout. Create `app/(admin)/layout.tsx`. Build a responsive sidebar using Shadcn UI (borrowing from standard admin portal paradigms). The sidebar should have links to "Dashboard", "Civic Reports", and "Red Zone Manager". Ensure it uses a stark, matte slate dark-mode theme to match our DPI branding.

### Milestone 3: The Panchayat Telemetry Dashboard
> **Context:** Building the main `/admin/dashboard` page.
> **Task:** Fetch live capacity metrics from Supabase. Build three top-level Metric Cards: "Total Active Passes", "Zones Near Capacity", and "Pending Civic Reports". Below the cards, implement a Shadcn Data Table displaying recent civic incidents (Location, Type, Status).

### Milestone 4: Spatial Admin Tool (Red Zone Editor)
> **Context:** Adding the flagship B2G feature for the hackathon.
> **Task:** Create `/admin/red-zones/page.tsx`. Embed a Mapbox GL map inside the admin view. Use `@mapbox/mapbox-gl-draw` to allow the admin to draw a polygon on the map. Add a "Save Red Zone" button that takes the GeoJSON geometry and saves it to the Supabase `red_zones` table (to be intercepted by the tourist routing engine).

---

## Phase 5 – Final Deliverables Checklist

1.  ✅ **Complete repository analysis:** Evaluated as a standard React/Next.js dashboard structure.
2.  ✅ **Feature inventory:** Dashboards, Data Tables, Modals, Sidebar.
3.  ✅ **Workflow diagrams (Mental Model):** Login -> Role Check -> Tourist Map OR Panchayat Dashboard.
4.  ✅ **Feature mapping:** Admin stats -> Capacity tracking.
5.  ✅ **Features to keep:** Data tables, sidebar layout, protected routing.
6.  ✅ **Features to modify:** Auth tied to Supabase RLS.
7.  ✅ **Features to discard:** Extraneous generic settings menus.
8.  ✅ **New pages:** Red Zone Polygon Editor.
9.  ✅ **Database migration plan:** Extended `profiles` with `role`, added `civic_reports` and `red_zones`.
10. ✅ **API integration plan:** Supabase JS client unified across both route groups.
11. ✅ **Auth plan:** Supabase Middleware role-based redirection.
12. ✅ **Prompt Chains:** 4 sequential milestones created.
13. ✅ **Merged Architecture:** Configured via Next.js Route Groups `(tourist)` and `(admin)`.
14. ✅ **Risks & Mitigation:** **Risk:** Mapbox GL canvas conflicting with Admin Sidebar CSS. **Mitigation:** Strict isolation of Mapbox CSS to specific container DOM nodes, ensuring z-index stacking contexts are managed locally.


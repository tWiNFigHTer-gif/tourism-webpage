import type { Location } from "@/lib/types";

export type PlaceInput = Pick<Location, "name" | "description" | "category" | "lat" | "lng" | "region" | "capacity_max" | "status">;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || "Unable to load places.");
  return response.json() as Promise<T>;
}

export async function getPlaces(includeHidden = false): Promise<Location[]> {
  const query = includeHidden ? "?include_hidden=true" : "";
  return request<Location[]>(`/api/places${query}`, { cache: "no-store" });
}

export async function createPlace(input: PlaceInput) {
  return request<Location>("/api/places", { method: "POST", body: JSON.stringify(input) });
}

export async function updatePlace(id: string, input: Partial<PlaceInput>) {
  return request<Location>(`/api/places/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deletePlace(id: string) {
  await request<{ deleted: true }>(`/api/places/${id}`, { method: "DELETE" });
}

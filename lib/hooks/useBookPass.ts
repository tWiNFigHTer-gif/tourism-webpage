import { useCallback, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PassResult {
  pass_id: string;
  pass_token: string;
  location_id: string;
  time_slot: string;
  issued_at: string;
  slots_remaining: number;
}

/** Discriminated error type so the UI can branch on specific failure modes. */
export type BookPassError =
  | { kind: "zone_full"; message: string }
  | { kind: "network"; message: string }
  | { kind: "server"; message: string };

interface UseBookPassReturn {
  bookPass: (
    locationId: string,
    timeSlot: string,
    panchayatId: string
  ) => Promise<PassResult | null>;
  isBooking: boolean;
  error: BookPassError | null;
  result: PassResult | null;
  reset: () => void;
}

// ── Local-storage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = "terra_pulse_passes";

function loadStoredPasses(): PassResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PassResult[]) : [];
  } catch {
    return [];
  }
}

function appendPassToStorage(pass: PassResult): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadStoredPasses();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, pass]));
  } catch {
    // localStorage full or unavailable — silently ignore.
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useBookPass
 *
 * Exposes a `bookPass()` async function that POSTs to /api/passes.
 *
 * - On success  → persists the pass token to localStorage and sets `result`.
 * - On 409      → sets `error.kind = 'zone_full'` so the UI can render a
 *                 specific "slot full" message without a generic alert.
 * - On other    → sets `error.kind = 'network' | 'server'` accordingly.
 */
export function useBookPass(): UseBookPassReturn {
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<BookPassError | null>(null);
  const [result, setResult] = useState<PassResult | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  const bookPass = useCallback(
    async (
      locationId: string,
      timeSlot: string,
      panchayatId: string
    ): Promise<PassResult | null> => {
      setIsBooking(true);
      setError(null);
      setResult(null);

      let response: Response;

      try {
        response = await fetch("/api/passes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location_id: locationId,
            time_slot: timeSlot,
            panchayat_id: panchayatId,
          }),
        });
      } catch (networkErr) {
        const message =
          networkErr instanceof Error
            ? networkErr.message
            : "Network request failed. Please check your connection.";
        setError({ kind: "network", message });
        setIsBooking(false);
        return null;
      }

      // ── 409 Zone Full ─────────────────────────────────────────────────────
      if (response.status === 409) {
        const body = await response.json().catch(() => ({})) as {
          message?: string;
        };
        setError({
          kind: "zone_full",
          message:
            body.message ??
            "This time slot has reached its carrying capacity. Please select a different time.",
        });
        setIsBooking(false);
        return null;
      }

      // ── Other non-2xx ─────────────────────────────────────────────────────
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as {
          message?: string;
        };
        setError({
          kind: "server",
          message:
            body.message ?? `Booking failed (HTTP ${response.status}).`,
        });
        setIsBooking(false);
        return null;
      }

      // ── Success (201) ─────────────────────────────────────────────────────
      const passResult = (await response.json()) as PassResult;
      appendPassToStorage(passResult);
      setResult(passResult);
      setIsBooking(false);
      return passResult;
    },
    []
  );

  return { bookPass, isBooking, error, result, reset };
}

// Re-export the storage reader so other components can list stored passes
export { loadStoredPasses };

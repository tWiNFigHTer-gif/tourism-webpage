import { useCallback, useEffect, useRef, useState } from "react";
import type { CapacityStatus } from "@/lib/types";

interface UseCapacityReturn {
  data: CapacityStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * useCapacity
 *
 * Fetches live capacity data from GET /api/passes for a given location + time
 * slot. Automatically polls every 30 seconds and cleans up on unmount.
 *
 * Returns null data (with isLoading=true) on the initial fetch, then keeps
 * the last successful value while re-fetching in the background.
 */
export function useCapacity(
  locationId: string,
  timeSlot: string
): UseCapacityReturn {
  const [data, setData] = useState<CapacityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the AbortController so in-flight requests are cancelled on
  // unmount or when locationId / timeSlot changes.
  const abortRef = useRef<AbortController | null>(null);

  const fetchCapacity = useCallback(
    async (signal?: AbortSignal) => {
      if (!locationId || !timeSlot) {
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          location_id: locationId,
          time_slot: timeSlot,
        });

        const response = await fetch(`/api/passes?${params.toString()}`, {
          signal,
          // Opt out of Next.js data cache so every poll hits the DB.
          cache: "no-store",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as { message?: string }).message ??
              `Capacity fetch failed (${response.status})`
          );
        }

        const json = (await response.json()) as {
          issued_count: number;
          capacity_per_slot: number;
          is_full: boolean;
          slots_remaining: number;
        };

        // Map API response → CapacityStatus shape from lib/types
        setData({
          location_id: locationId,
          time_slot: timeSlot,
          issued_count: json.issued_count,
          capacity: json.capacity_per_slot,
          is_full: json.is_full,
        });
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // Ignore cancellations
        setError(
          err instanceof Error ? err.message : "Failed to fetch capacity."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [locationId, timeSlot]
  );

  // Manual refetch (e.g. after a booking succeeds)
  const refetch = useCallback(() => {
    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    fetchCapacity(controller.signal);
  }, [fetchCapacity]);

  useEffect(() => {
    // Abort any previous request and start fresh when params change.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    fetchCapacity(controller.signal);

    // Poll every 30 seconds.
    const intervalId = setInterval(() => {
      const pollController = new AbortController();
      abortRef.current = pollController;
      fetchCapacity(pollController.signal);
    }, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [fetchCapacity]);

  return { data, isLoading, error, refetch };
}

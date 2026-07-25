import { useCallback, useState } from "react";

interface UseSubmitHazardReturn {
  submitHazard: (
    locationId: string,
    category: string,
    description: string,
    panchayatId?: string
  ) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  isSuccess: boolean;
  reset: () => void;
}

/**
 * useSubmitHazard
 *
 * Custom hook to submit a field hazard report to POST /api/hazards.
 * Manages loading, success, and user-friendly error states.
 */
export function useSubmitHazard(): UseSubmitHazardReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setIsSuccess(false);
  }, []);

  const submitHazard = useCallback(
    async (
      locationId: string,
      category: string,
      description: string,
      panchayatId?: string
    ): Promise<void> => {
      setIsSubmitting(true);
      setError(null);
      setIsSuccess(false);

      try {
        const response = await fetch("/api/hazards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location_id: locationId,
            category,
            description,
            panchayat_id: panchayatId,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            message?: string;
            error?: string;
          };
          const userMessage =
            body.message ??
            (response.status === 400
              ? "Invalid report details. Please check your submission."
              : "Unable to send report to Panchayat right now. Please try again.");
          throw new Error(userMessage);
        }

        setIsSuccess(true);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to submit hazard report. Network error.";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { submitHazard, isSubmitting, error, isSuccess, reset };
}

import type { AIClinicalAnalysisInput, AIClinicalAnalysisResult } from "./types";

export async function analyzeClinicalDataWithAI(
  input: AIClinicalAnalysisInput,
): Promise<AIClinicalAnalysisResult> {
  const url = import.meta.env["VITE_SUPABASE_URL"]?.trim().replace(/\/$/, "");

  const key = (
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_ANON_KEY"]
  )?.trim();

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const response = await fetch(`${url}/functions/v1/clinical-reasoning`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },

    body: JSON.stringify({
      input,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || `Clinical reasoning failed with status ${response.status}.`);
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  if (!payload.analysis) {
    throw new Error("Clinical reasoning returned no analysis.");
  }

  return payload.analysis as AIClinicalAnalysisResult;
}

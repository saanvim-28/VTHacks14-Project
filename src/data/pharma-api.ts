import type { OpenEMRPatient } from "@/types/openemr";

export interface PharmaMatch {
  id?: string | number;
  product_name?: string;
  therapeutic_area?: string;
  indication?: string;
  title?: string;
  content?: string;
  similarity?: number;
  why_surfaced?: string;
}

export interface PatientPharmaAnalysis {
  success: boolean;
  patient_id: string | number;
  patient_name?: string | null;
  results: PharmaMatch[];
  briefing?: string;
  error?: string;
}

export interface PharmaBatchResponse {
  success: boolean;
  patient_count: number;
  successful: number;
  failed: number;
  patients: PatientPharmaAnalysis[];
  top_content?: PharmaTopContentItem[];
  top_content_briefing?: string;
  error?: string;
}

export interface PharmaTopContentItem {
  id?: string | number;
  product_name?: string;
  therapeutic_area?: string;
  indication?: string;
  title?: string;
  source?: string;
  content?: string;
  top_5_category?: "POPULATION" | "PRECISION";
  top_5_reason?: string;
  matched_patient_count?: number;
  total_patient_count?: number;
  population_match?: number;
  average_similarity?: number;
  max_similarity?: number;
}

function getConfig() {
  const url = import.meta.env["VITE_SUPABASE_URL"]?.trim().replace(/\/$/, "");

  const key = (
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_ANON_KEY"]
  )?.trim();

  return url && key ? { url, key } : null;
}

export function isPharmaSearchConfigured(): boolean {
  return Boolean(getConfig());
}

function toBackendPatient(patient: OpenEMRPatient) {
  return {
    id: patient.patient_id,
    name: patient.name,
    dob: patient.dob ?? undefined,
    sex: patient.sex ?? undefined,
    conditions: patient.conditions ?? [],
    medications: patient.medications ?? [],
    visit_history: patient.visit_history ?? [],
  };
}

export async function searchPharmaForPatients(
  patients: OpenEMRPatient[],
): Promise<PharmaBatchResponse> {
  const config = getConfig();

  if (!config) {
    throw new Error(
      "Pharma search is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const backendPatients = patients.map(toBackendPatient);

  console.log("Sending patients to pharma-search:", backendPatients);

  const response = await fetch(`${config.url}/functions/v1/pharma-search`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },

    body: JSON.stringify(backendPatients),
  });

  const payload = (await response.json()) as PharmaBatchResponse;

  console.log("pharma-search response:", payload);

  if (!response.ok) {
    throw new Error(payload.error || `Pharma search failed with status ${response.status}.`);
  }

  if (!payload.success) {
    const failedPatient = payload.patients?.find((patient) => !patient.success);

    throw new Error(
      failedPatient?.error ||
        payload.error ||
        "The pharma search service could not complete the request.",
    );
  }

  return payload;
}

export async function searchPharmaForPatient(
  patient: OpenEMRPatient,
): Promise<PatientPharmaAnalysis> {
  const response = await searchPharmaForPatients([patient]);

  const analysis = response.patients[0];

  if (!analysis) {
    throw new Error("The pharma search service returned no patient analysis.");
  }

  if (!analysis.success) {
    throw new Error(analysis.error || "Pharma analysis failed for this patient.");
  }

  return analysis;
}

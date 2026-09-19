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
  error?: string;
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
    conditions: patient.conditions,
    medications: patient.medications,
    visit_history: patient.visit_history,
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

  const response = await fetch(`${config.url}/functions/v1/pharma-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },
    body: JSON.stringify(patients.map(toBackendPatient)),
  });

  const payload = (await response.json()) as PharmaBatchResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "The pharma search service could not complete the request.");
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

  return analysis;
}

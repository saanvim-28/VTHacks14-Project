export interface VisitHistory {
  date: string;
  reason: string;
  notes: string;
}

export interface Observation {
  type: string;
  value: number;
  unit: string;
  date: string;
}

/**
 * Canonical patient model used throughout the application.
 *
 * patient_id is the normalized string ID used by the frontend/routes.
 * OpenEMR may originally provide the ID as a number or string,
 * but patient-api.ts converts it to this format.
 */
export interface OpenEMRPatient {
  patient_id: string;

  name: string;
  dob: string | null;
  sex: string | null;

  conditions: string[];
  medications: string[];

  observations: Observation[];
  visit_history: VisitHistory[];
}

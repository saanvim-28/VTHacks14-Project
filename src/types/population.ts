export type RelevanceLevel = "HIGH" | "MEDIUM" | "LOW";

export type ClinicalContextSource =
  "CONDITION" | "MEDICATION" | "VISIT_HISTORY" | "OBSERVATION_CHANGE";

export type ChangeDirection = "INCREASE" | "DECREASE" | "STABLE";

export interface ClinicalChange {
  patientId: string;

  observationType: string;

  previousValue: number;
  currentValue: number;

  previousDate: string;
  currentDate: string;

  difference: number;
  percentChange: number;

  direction: ChangeDirection;

  unit: string;
}

export interface PatientClinicalContext {
  patientId: string;

  contextId: string;

  clinicalContext: string;

  source: ClinicalContextSource;

  reason: string;

  detectedAt?: string;
}

export interface ClinicalEvidence {
  patientId: string;

  source: ClinicalContextSource;

  reason: string;

  detectedAt?: string;
}

export interface PopulationContext {
  id: string;

  clinicalContext: string;

  matchedPatientCount: number;

  totalPatientCount: number;

  populationMatch: number;

  relevanceScore: number;

  relevance: RelevanceLevel;

  matchedPatients: string[];

  sources: ClinicalContextSource[];

  reasons: string[];

  evidence: ClinicalEvidence[];

  mostRecentDate?: string | undefined;
}

export interface PopulationAnalysisResult {
  totalPatients: number;

  generatedAt: string;

  contexts: PopulationContext[];
}

export interface ClinicalEvidence {
  patientId: string;
  source: ClinicalContextSource;
  reason: string;
  date?: string;
}

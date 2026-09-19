import type { ClinicalContextSource, ClinicalEvidence, RelevanceLevel } from "@/types/population";
export interface AIClinicalContextInput {
  id: string;
  clinicalContext: string;

  matchedPatientCount: number;
  totalPatientCount: number;
  populationMatch: number;

  ruleBasedRelevanceScore: number;
  ruleBasedRelevance: RelevanceLevel;

  matchedPatients: string[];
  sources: ClinicalContextSource[];
  reasons: string[];

  evidence: ClinicalEvidence[];

  mostRecentDate?: string;
}

export interface AIClinicalAnalysisInput {
  generatedAt: string;
  totalPatients: number;
  contexts: AIClinicalContextInput[];
}

export interface AIClinicalInsight {
  contextId: string;
  clinicalContext: string;

  priority: "HIGH" | "MEDIUM" | "LOW";

  explanation: string;
  supportingEvidence: string[];
  affectedPatients: string[];

  confidence: number;
}

export interface AIClinicalAnalysisResult {
  summary: string;
  insights: AIClinicalInsight[];
}

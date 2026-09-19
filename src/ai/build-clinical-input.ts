import type { PopulationAnalysisResult } from "@/types/population";

import type { AIClinicalAnalysisInput, AIClinicalContextInput } from "./types";

export function buildClinicalAIInput(analysis: PopulationAnalysisResult): AIClinicalAnalysisInput {
  const contexts: AIClinicalContextInput[] = analysis.contexts.map((context) => ({
    id: context.id,

    clinicalContext: context.clinicalContext,

    matchedPatientCount: context.matchedPatientCount,
    totalPatientCount: context.totalPatientCount,

    populationMatch: context.populationMatch,

    ruleBasedRelevanceScore: context.relevanceScore,
    ruleBasedRelevance: context.relevance,

    matchedPatients: context.matchedPatients,

    sources: context.sources,

    reasons: context.reasons,

    evidence: context.evidence,

    ...(context.mostRecentDate ? { mostRecentDate: context.mostRecentDate } : {}),
  }));

  return {
    generatedAt: analysis.generatedAt,
    totalPatients: analysis.totalPatients,
    contexts,
  };
}

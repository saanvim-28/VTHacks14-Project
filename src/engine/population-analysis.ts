// takes contexts from all patients and finds how many pateitns have each context

import type { OpenEMRPatient } from "@/types/openemr";

import type {
  ClinicalContextSource,
  PatientClinicalContext,
  PopulationAnalysisResult,
  PopulationContext,
} from "@/types/population";

import { extractPatientContexts } from "./extract-contexts";

import {
  calculatePopulationMatch,
  calculateRelevanceScore,
  getRelevanceLevel,
} from "./relevance-score";

interface ContextAccumulator {
  id: string;
  clinicalContext: string;
  patients: Set<string>;
  sources: Set<ClinicalContextSource>;
  reasons: Set<string>;
  dates: string[];
}

function addContext(map: Map<string, ContextAccumulator>, context: PatientClinicalContext): void {
  let existing = map.get(context.contextId);

  if (!existing) {
    existing = {
      id: context.contextId,
      clinicalContext: context.clinicalContext,
      patients: new Set<string>(),
      sources: new Set<ClinicalContextSource>(),
      reasons: new Set<string>(),
      dates: [],
    };
    map.set(context.contextId, existing);
  }

  existing.patients.add(context.patientId);

  existing.sources.add(context.source);

  existing.reasons.add(context.reason);
}

export function analyzePopulation(patients: OpenEMRPatient[]): PopulationAnalysisResult {
  const contextMap = new Map<string, ContextAccumulator>();

  // Analyze every patient
  for (const patient of patients) {
    const patientContexts = extractPatientContexts(patient);

    for (const context of patientContexts) {
      addContext(contextMap, context);
    }
  }

  const totalPatientCount = patients.length;

  const contexts: PopulationContext[] = Array.from(contextMap.values()).map((context) => {
    const matchedPatientCount = context.patients.size;

    const populationMatch = calculatePopulationMatch(matchedPatientCount, totalPatientCount);

    const relevanceScore = calculateRelevanceScore(populationMatch);

    return {
      id: context.id,

      clinicalContext: context.clinicalContext,

      matchedPatientCount,

      totalPatientCount,

      populationMatch,

      relevanceScore,

      relevance: getRelevanceLevel(relevanceScore),

      matchedPatients: Array.from(context.patients),

      sources: Array.from(context.sources),

      reasons: Array.from(context.reasons),
    };
  });

  // Most broadly relevant context first
  contexts.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    totalPatients: totalPatientCount,

    generatedAt: new Date().toISOString(),

    contexts,
  };
}

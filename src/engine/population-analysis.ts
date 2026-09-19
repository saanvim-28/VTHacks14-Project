// Takes contexts from all patients and finds how many patients
// have each context, then ranks the contexts by relevance.

import type { OpenEMRPatient } from "@/types/openemr";

import type {
  ClinicalContextSource,
  PatientClinicalContext,
  PopulationAnalysisResult,
  PopulationContext,
  ClinicalEvidence,
} from "@/types/population";

import { extractPatientContexts } from "./extract-contexts";

import {
  calculatePopulationMatch,
  calculateRecencyScore,
  calculateRelevanceScore,
  getRelevanceLevel,
} from "./relevance-score";

interface ContextAccumulator {
  id: string;
  clinicalContext: string;

  patients: Set<string>;

  sources: Set<ClinicalContextSource>;

  reasons: Set<string>;

  evidence: ClinicalEvidence[];

  dates: string[];
}

/**
 * Adds one patient's clinical context to the
 * population-wide collection.
 */
function addContext(map: Map<string, ContextAccumulator>, context: PatientClinicalContext): void {
  let existing = map.get(context.contextId);

  // If we haven't seen this context before,
  // create a new entry for it.
  if (!existing) {
    existing = {
      id: context.contextId,
      clinicalContext: context.clinicalContext,
      patients: new Set<string>(),
      sources: new Set<ClinicalContextSource>(),
      reasons: new Set<string>(),
      evidence: [],
      dates: [],
    };

    map.set(context.contextId, existing);
  }

  // Record that this patient has this context.
  existing.patients.add(context.patientId);

  // Record where the context came from:
  // condition, medication, visit history, etc.
  existing.sources.add(context.source);

  // Save the explanation.
  existing.reasons.add(context.reason);
  // Preserve which patient each piece of evidence belongs to.
  existing.evidence.push({
    patientId: context.patientId,
    source: context.source,
    reason: context.reason,
    ...(context.detectedAt ? { detectedAt: context.detectedAt } : {}),
  });

  // If the context came from something dated,
  // such as a visit, save the date.
  if (context.detectedAt) {
    existing.dates.push(context.detectedAt);
  }
}

/**
 * Main Person 2 population analysis function.
 */
export function analyzePopulation(patients: OpenEMRPatient[]): PopulationAnalysisResult {
  const contextMap = new Map<string, ContextAccumulator>();

  // -----------------------------------
  // STEP 1:
  // Extract contexts from every patient
  // -----------------------------------

  for (const patient of patients) {
    const patientContexts = extractPatientContexts(patient);

    for (const context of patientContexts) {
      addContext(contextMap, context);
    }
  }

  const totalPatientCount = patients.length;

  // -----------------------------------
  // STEP 2:
  // Calculate population relevance
  // -----------------------------------

  const contexts: PopulationContext[] = Array.from(contextMap.values()).map((context) => {
    // How many UNIQUE patients have this context?
    const matchedPatientCount = context.patients.size;

    // Example:
    // 4 matching patients / 10 total = 0.40
    const populationMatch = calculatePopulationMatch(matchedPatientCount, totalPatientCount);

    // -----------------------------------
    // Find most recent date
    // -----------------------------------

    let mostRecentDate: string | undefined;

    if (context.dates.length > 0) {
      mostRecentDate = [...context.dates].sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      )[0];
    }

    // -----------------------------------
    // Calculate recency
    // -----------------------------------

    const recencyScore = calculateRecencyScore(mostRecentDate);

    // -----------------------------------
    // Final relevance score
    //
    // Currently:
    // 80% population coverage
    // 20% recency
    // -----------------------------------

    const relevanceScore = calculateRelevanceScore(populationMatch, recencyScore);

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

      evidence: context.evidence,

      mostRecentDate,
    };
  });

  // -----------------------------------
  // STEP 3:
  // Rank highest relevance first
  // -----------------------------------

  contexts.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // -----------------------------------
  // STEP 4:
  // Return complete population analysis
  // -----------------------------------

  return {
    totalPatients: totalPatientCount,

    generatedAt: new Date().toISOString(),

    contexts,
  };
}

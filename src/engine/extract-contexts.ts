import type { OpenEMRPatient, VisitHistory } from "@/types/openemr";

import type { PatientClinicalContext } from "@/types/population";

function createContextId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractConditionContexts(patient: OpenEMRPatient): PatientClinicalContext[] {
  return patient.conditions.map((condition) => ({
    patientId: String(patient.id),

    contextId: createContextId(condition),

    clinicalContext: condition,

    source: "CONDITION",

    reason: `${condition} is documented as an active condition.`,
  }));
}

function extractMedicationContexts(patient: OpenEMRPatient): PatientClinicalContext[] {
  return patient.medications.map((medication) => {
    const contextName = `${medication} use`;

    return {
      patientId: String(patient.id),

      contextId: createContextId(contextName),

      clinicalContext: contextName,

      source: "MEDICATION",

      reason: `${medication} appears on the patient's medication list.`,
    };
  });
}

/**
 * Looks at the text of an individual visit and identifies
 * useful clinical contexts.
 *
 * For the MVP this is deliberately rule-based.
 */
function extractContextsFromVisit(
  patient: OpenEMRPatient,
  visit: VisitHistory,
): PatientClinicalContext[] {
  const text = `${visit.reason} ${visit.notes}`.toLowerCase();

  const contexts: PatientClinicalContext[] = [];

  // Blood pressure / hypertension context
  if (text.includes("blood pressure") || text.includes("hypertension")) {
    contexts.push({
      patientId: String(patient.id),

      contextId: "blood-pressure-management",

      clinicalContext: "Blood Pressure Management",

      source: "VISIT_HISTORY",

      reason: `Blood pressure was discussed during the visit on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  // Diabetes / glycemic context
  if (text.includes("hba1c") || text.includes("blood glucose") || text.includes("diabetes")) {
    contexts.push({
      patientId: String(patient.id),

      contextId: "glycemic-management",

      clinicalContext: "Glycemic Management",

      source: "VISIT_HISTORY",

      reason: `Glycemic control was discussed during the visit on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  // Asthma / respiratory context
  if (
    text.includes("asthma") ||
    text.includes("wheezing") ||
    text.includes("shortness of breath")
  ) {
    contexts.push({
      patientId: String(patient.id),

      contextId: "asthma-management",

      clinicalContext: "Asthma Management",

      source: "VISIT_HISTORY",

      reason: `Respiratory symptoms or asthma were discussed on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  // Lipid management
  if (text.includes("ldl") || text.includes("cholesterol") || text.includes("lipid")) {
    contexts.push({
      patientId: String(patient.id),

      contextId: "lipid-management",

      clinicalContext: "Lipid Management",

      source: "VISIT_HISTORY",

      reason: `Lipid management was discussed during the visit on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  // Thyroid context
  if (text.includes("tsh") || text.includes("thyroid") || text.includes("hypothyroid")) {
    contexts.push({
      patientId: String(patient.id),

      contextId: "thyroid-management",

      clinicalContext: "Thyroid Management",

      source: "VISIT_HISTORY",

      reason: `Thyroid function was discussed during the visit on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  return contexts;
}

function extractVisitContexts(patient: OpenEMRPatient): PatientClinicalContext[] {
  return patient.visit_history.flatMap((visit) => extractContextsFromVisit(patient, visit));
}

export function extractPatientContexts(patient: OpenEMRPatient): PatientClinicalContext[] {
  return [
    ...extractConditionContexts(patient),
    ...extractMedicationContexts(patient),
    ...extractVisitContexts(patient),
  ];
}

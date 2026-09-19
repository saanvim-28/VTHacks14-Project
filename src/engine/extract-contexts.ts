import type { OpenEMRPatient, VisitHistory } from "@/types/openemr";

import type { PatientClinicalContext } from "@/types/population";

import { detectSignificantChanges } from "./detect-changes";

import { normalizeConditionContext, normalizeMedicationContext } from "./context-mapping";

/**
 * Converts an observation name into the broader clinical
 * context used by the population-analysis engine.
 */
function normalizeObservationContext(observationName: string): string {
  const name = observationName.toLowerCase();

  if (
    name.includes("a1c") ||
    name.includes("hba1c") ||
    name.includes("glucose") ||
    name.includes("blood sugar")
  ) {
    return "Glycemic Management";
  }

  if (name.includes("blood pressure") || name.includes("systolic") || name.includes("diastolic")) {
    return "Blood Pressure Management";
  }

  if (
    name.includes("ldl") ||
    name.includes("hdl") ||
    name.includes("cholesterol") ||
    name.includes("triglyceride")
  ) {
    return "Lipid Management";
  }

  if (name.includes("creatinine") || name.includes("egfr")) {
    return "Renal Function";
  }

  if (name.includes("tsh") || name.includes("thyroid")) {
    return "Thyroid Management";
  }

  // If we don't recognize the measurement yet,
  // preserve its original name.
  return observationName;
}

/**
 * Creates a stable machine-readable ID for a clinical context.
 *
 * Example:
 * "Blood Pressure Management"
 * becomes
 * "blood-pressure-management"
 */
function createContextId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Converts significant changes in observations into
 * clinical contexts.
 */
export function extractObservationChangeContexts(
  patient: OpenEMRPatient,
): PatientClinicalContext[] {
  const changes = detectSignificantChanges(patient);

  return changes.map((change) => {
    const clinicalContext = normalizeObservationContext(change.observationType);

    const unitText = change.unit ? ` ${change.unit}` : "";

    return {
      patientId: patient.patient_id,

      contextId: createContextId(clinicalContext),

      clinicalContext,

      source: "OBSERVATION_CHANGE",

      reason:
        `${change.observationType} changed ` +
        `from ${change.previousValue}${unitText} ` +
        `to ${change.currentValue}${unitText} ` +
        `(${Math.abs(change.percentChange).toFixed(1)}% ` +
        `${change.direction.toLowerCase()}).`,

      detectedAt: change.currentDate,
    };
  });
}

/**
 * Converts the patient's documented conditions into
 * normalized clinical contexts.
 */
function extractConditionContexts(patient: OpenEMRPatient): PatientClinicalContext[] {
  return patient.conditions.map((condition) => {
    const clinicalContext = normalizeConditionContext(condition);

    return {
      patientId: patient.patient_id,

      contextId: createContextId(clinicalContext),

      clinicalContext,

      source: "CONDITION",

      reason: `${condition} is documented as an active condition.`,
    };
  });
}

/**
 * Converts the patient's medications into normalized
 * clinical contexts.
 */
function extractMedicationContexts(patient: OpenEMRPatient): PatientClinicalContext[] {
  return patient.medications.map((medication) => {
    const clinicalContext = normalizeMedicationContext(medication);

    return {
      patientId: patient.patient_id,

      contextId: createContextId(clinicalContext),

      clinicalContext,

      source: "MEDICATION",

      reason: `${medication} appears on the patient's medication list.`,
    };
  });
}

/**
 * Looks at an individual visit and identifies useful
 * clinical contexts from the visit reason and notes.
 *
 * For the MVP this remains deliberately rule-based.
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
      patientId: patient.patient_id,

      contextId: "blood-pressure-management",

      clinicalContext: "Blood Pressure Management",

      source: "VISIT_HISTORY",

      reason: `Blood pressure was discussed during the visit on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  // Diabetes / glycemic context
  if (
    text.includes("hba1c") ||
    text.includes("a1c") ||
    text.includes("blood glucose") ||
    text.includes("blood sugar") ||
    text.includes("diabetes")
  ) {
    contexts.push({
      patientId: patient.patient_id,

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
      patientId: patient.patient_id,

      contextId: "asthma-management",

      clinicalContext: "Asthma Management",

      source: "VISIT_HISTORY",

      reason: `Respiratory symptoms or asthma were discussed on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  // Lipid management
  if (
    text.includes("ldl") ||
    text.includes("hdl") ||
    text.includes("cholesterol") ||
    text.includes("triglyceride") ||
    text.includes("lipid")
  ) {
    contexts.push({
      patientId: patient.patient_id,

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
      patientId: patient.patient_id,

      contextId: "thyroid-management",

      clinicalContext: "Thyroid Management",

      source: "VISIT_HISTORY",

      reason: `Thyroid function was discussed during the visit on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  // Renal / kidney context
  if (
    text.includes("creatinine") ||
    text.includes("egfr") ||
    text.includes("kidney") ||
    text.includes("renal")
  ) {
    contexts.push({
      patientId: patient.patient_id,

      contextId: "renal-function",

      clinicalContext: "Renal Function",

      source: "VISIT_HISTORY",

      reason: `Renal function was discussed during the visit on ${visit.date}.`,

      detectedAt: visit.date,
    });
  }

  return contexts;
}

/**
 * Extracts clinical contexts from every visit belonging
 * to the patient.
 */
function extractVisitContexts(patient: OpenEMRPatient): PatientClinicalContext[] {
  return patient.visit_history.flatMap((visit) => extractContextsFromVisit(patient, visit));
}

/**
 * Main entry point for context extraction.
 *
 * Combines evidence from:
 * - active conditions
 * - medications
 * - visit history
 * - significant observation changes
 */
export function extractPatientContexts(patient: OpenEMRPatient): PatientClinicalContext[] {
  return [
    ...extractConditionContexts(patient),

    ...extractMedicationContexts(patient),

    ...extractVisitContexts(patient),

    ...extractObservationChangeContexts(patient),
  ];
}

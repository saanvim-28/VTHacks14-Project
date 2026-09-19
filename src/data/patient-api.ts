import { z } from "zod";
import patientExport from "../../vthacks-openemr/patients.json" with { type: "json" };

import type { OpenEMRPatient } from "@/types/openemr";

const visitHistorySchema = z.object({
  date: z.string(),
  reason: z.string(),
  notes: z.string(),
});

const observationSchema = z.object({
  type: z.string(),
  value: z.number(),
  unit: z.string(),
  date: z.string(),
});

const exportedPatientSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().trim().min(1)]),

  name: z.string().trim().min(1),

  dob: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().date().nullable(),
  ),

  sex: z.string().trim().nullish(),

  conditions: z.array(z.string().trim().min(1)).nullish(),

  medications: z.array(z.string().trim().min(1)).nullish(),

  visit_history: z.array(visitHistorySchema).nullish(),

  observations: z.array(observationSchema).nullish(),
});

const patientExportSchema = z.array(exportedPatientSchema).superRefine((records, context) => {
  const ids = new Set<string>();

  records.forEach((record, index) => {
    const id = String(record.id);

    if (ids.has(id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "id"],
        message: "Patient IDs must be unique",
      });
    }

    ids.add(id);
  });
});

export function parsePatientExport(input: unknown): OpenEMRPatient[] {
  const result = patientExportSchema.safeParse(input);

  if (!result.success) {
    console.error(result.error);

    throw new Error("The OpenEMR patient export is invalid. Check patient fields and unique IDs.");
  }

  return result.data.map((record) => ({
    patient_id: String(record.id),

    name: record.name,

    dob: record.dob,

    sex: record.sex || null,

    conditions: record.conditions ?? [],

    medications: record.medications ?? [],

    observations: record.observations ?? [],

    visit_history: record.visit_history ?? [],
  }));
}

export async function getPatients(): Promise<OpenEMRPatient[]> {
  return parsePatientExport(patientExport);
}

export async function getPatientById(id: string): Promise<OpenEMRPatient | null> {
  const patients = await getPatients();

  return patients.find((patient) => patient.patient_id === id) ?? null;
}

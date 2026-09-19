import { z } from "zod";
import patientExport from "../../vthacks-openemr/patients.json" with { type: "json" };

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

export interface Patient {
  patient_id: string;
  name: string;
  dob: string | null;
  sex: string | null;
  conditions: string[];
  medications: string[];
}

// This export is a snapshot, not a live connection to the OpenEMR database.
// Keep its order and only map fields actually present in the source.
export function parsePatientExport(input: unknown): Patient[] {
  const result = patientExportSchema.safeParse(input);
  if (!result.success) {
    throw new Error("The OpenEMR patient export is invalid. Check patient fields and unique IDs.");
  }
  return result.data.map((record) => ({
    patient_id: String(record.id),
    name: record.name,
    dob: record.dob,
    sex: record.sex || null,
    conditions: record.conditions ?? [],
    medications: record.medications ?? [],
  }));
}

export async function getPatients(): Promise<Patient[]> {
  return parsePatientExport(patientExport);
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const patients = await getPatients();
  return patients.find((patient) => patient.patient_id === id) ?? null;
}

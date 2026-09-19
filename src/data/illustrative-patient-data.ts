// Fictional presentation fixtures only. Never merge these into OpenEMR records.
export interface IllustrativeObservation {
  label: string;
  unit: string;
  values: number[];
}

export interface IllustrativeProfile {
  focus: string;
  observations: IllustrativeObservation[];
  visitNote: string;
}

export const illustrativeDates = [
  "2026-04-17",
  "2026-05-15",
  "2026-06-19",
  "2026-07-17",
  "2026-08-14",
  "2026-09-18",
];

const profiles: Record<string, IllustrativeProfile> = {
  "1": {
    focus: "Blood pressure follow-up",
    observations: [
      { label: "Systolic pressure", unit: "mmHg", values: [142, 138, 140, 134, 132, 130] },
      { label: "Diastolic pressure", unit: "mmHg", values: [90, 88, 86, 85, 84, 82] },
      { label: "Heart rate", unit: "bpm", values: [78, 76, 77, 74, 73, 72] },
      { label: "Weight", unit: "kg", values: [82.4, 82, 81.5, 81.2, 80.7, 80.5] },
    ],
    visitNote:
      "Fictional follow-up encounter documenting a sample home blood-pressure log, a medication-list review, and routine measurements. This note illustrates the visit layout only.",
  },
  "2": {
    focus: "Metabolic follow-up",
    observations: [
      { label: "HbA1c", unit: "%", values: [7.8, 7.7, 7.5, 7.4, 7.2, 7.1] },
      { label: "Fasting glucose", unit: "mg/dL", values: [154, 148, 145, 139, 136, 132] },
      { label: "Heart rate", unit: "bpm", values: [80, 79, 76, 78, 75, 74] },
      { label: "Weight", unit: "kg", values: [76.2, 76, 75.7, 75.2, 74.8, 74.5] },
    ],
    visitNote:
      "Fictional follow-up encounter showing a sample glucose log, a medication-list review, and a discussion of daily routines. No treatment recommendation is implied by these example values.",
  },
  "3": {
    focus: "Respiratory follow-up",
    observations: [
      { label: "Peak flow", unit: "L/min", values: [380, 395, 400, 410, 415, 420] },
      { label: "Oxygen saturation", unit: "%", values: [97, 98, 97, 98, 98, 98] },
      { label: "Respiratory rate", unit: "/min", values: [18, 17, 18, 16, 17, 16] },
      { label: "Heart rate", unit: "bpm", values: [82, 80, 78, 79, 77, 76] },
    ],
    visitNote:
      "Fictional follow-up encounter showing a sample symptom diary, an inhaler-technique discussion, and routine respiratory measurements. The history is illustrative and is not an assessment of this patient.",
  },
  "4": {
    focus: "Lipid follow-up",
    observations: [
      { label: "LDL cholesterol", unit: "mg/dL", values: [156, 148, 141, 136, 129, 124] },
      { label: "HDL cholesterol", unit: "mg/dL", values: [44, 45, 46, 46, 47, 48] },
      { label: "Triglycerides", unit: "mg/dL", values: [186, 178, 172, 165, 158, 152] },
      { label: "Total cholesterol", unit: "mg/dL", values: [237, 229, 221, 215, 207, 202] },
    ],
    visitNote:
      "Fictional follow-up encounter showing a sample lipid panel, a medication-list review, and a routine history update. Values are included to demonstrate the longitudinal display, not to establish treatment goals.",
  },
  "5": {
    focus: "Thyroid follow-up",
    observations: [
      { label: "TSH", unit: "mIU/L", values: [4.8, 4.2, 3.9, 3.5, 3.1, 2.8] },
      { label: "Free T4", unit: "ng/dL", values: [0.9, 1, 1.1, 1.1, 1.2, 1.2] },
      { label: "Heart rate", unit: "bpm", values: [66, 67, 68, 68, 70, 70] },
      { label: "Weight", unit: "kg", values: [68.4, 68.2, 68, 67.8, 67.7, 67.5] },
    ],
    visitNote:
      "Fictional follow-up encounter showing a sample thyroid panel, a medication-list review, and a symptom-history update. The dates, measurements, and encounter narrative are demonstration content.",
  },
};

export function getIllustrativeProfile(patientId: string): IllustrativeProfile {
  return structuredClone(
    profiles[patientId] ?? {
      focus: "General follow-up",
      observations: [
        { label: "Heart rate", unit: "bpm", values: [76, 75, 77, 74, 73, 72] },
        { label: "Respiratory rate", unit: "/min", values: [17, 16, 18, 17, 16, 16] },
        { label: "Oxygen saturation", unit: "%", values: [98, 98, 97, 98, 99, 98] },
        { label: "Temperature", unit: "°C", values: [36.7, 36.8, 36.6, 36.7, 36.8, 36.7] },
      ],
      visitNote:
        "Fictional general follow-up encounter with sample measurements and a record review. This content is included only to illustrate the interface.",
    },
  );
}

import type { Observation, OpenEMRPatient } from "@/types/openemr";

export type ChangeDirection = "INCREASE" | "DECREASE" | "UNCHANGED";

export interface ObservationChange {
  patientId: string;

  observationType: string;

  previousValue: number;
  currentValue: number;

  absoluteChange: number;
  percentChange: number;

  direction: ChangeDirection;

  unit: string;

  previousDate: string;
  currentDate: string;
}

export type ChangeSignificance = "LOW" | "MODERATE" | "HIGH";

export interface SignificantObservationChange extends ObservationChange {
  significance: ChangeSignificance;
  significanceScore: number;
}

function getObservationKey(observation: Observation): string {
  return observation.type.trim().toLowerCase();
}

export function detectObservationChanges(patient: OpenEMRPatient): ObservationChange[] {
  const grouped = new Map<string, Observation[]>();

  // Group observations by measurement type
  for (const observation of patient.observations ?? []) {
    const key = getObservationKey(observation);

    const existing = grouped.get(key) ?? [];

    existing.push(observation);

    grouped.set(key, existing);
  }

  const changes: ObservationChange[] = [];

  for (const observations of grouped.values()) {
    // Can't detect change without two measurements
    if (observations.length < 2) {
      continue;
    }

    // Sort oldest -> newest
    const sorted = [...observations].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const previous = sorted[sorted.length - 2];

    const current = sorted[sorted.length - 1];

    if (!previous || !current) {
      continue;
    }

    const absoluteChange = current.value - previous.value;

    let percentChange = 0;

    if (previous.value !== 0) {
      percentChange = (absoluteChange / Math.abs(previous.value)) * 100;
    }

    let direction: ChangeDirection = "UNCHANGED";

    if (absoluteChange > 0) {
      direction = "INCREASE";
    } else if (absoluteChange < 0) {
      direction = "DECREASE";
    }

    changes.push({
      patientId: String(patient.id),

      observationType: current.type,

      previousValue: previous.value,
      currentValue: current.value,

      absoluteChange,
      percentChange,

      direction,

      unit: current.unit,

      previousDate: previous.date,
      currentDate: current.date,
    });
  }

  return changes;
}

function calculateChangeSignificance(change: ObservationChange): {
  significance: ChangeSignificance;
  score: number;
} {
  const percent = Math.abs(change.percentChange);

  let score: number;

  if (percent >= 25) {
    score = 1;
  } else if (percent >= 15) {
    score = 0.75;
  } else if (percent >= 5) {
    score = 0.5;
  } else {
    score = 0.2;
  }

  let significance: ChangeSignificance = "LOW";

  if (score >= 0.75) {
    significance = "HIGH";
  } else if (score >= 0.5) {
    significance = "MODERATE";
  }

  return {
    significance,
    score,
  };
}

export function detectSignificantChanges(patient: OpenEMRPatient): SignificantObservationChange[] {
  return detectObservationChanges(patient)
    .map((change) => {
      const { significance, score } = calculateChangeSignificance(change);

      return {
        ...change,
        significance,
        significanceScore: score,
      };
    })
    .filter((change) => change.significance !== "LOW");
}

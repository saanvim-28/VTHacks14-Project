import type { RelevanceLevel } from "@/types/population";

export function calculatePopulationMatch(
  matchedPatientCount: number,
  totalPatientCount: number,
): number {
  if (totalPatientCount === 0) {
    return 0;
  }

  return matchedPatientCount / totalPatientCount;
}

export function calculateRecencyScore(mostRecentDate?: string): number {
  if (!mostRecentDate) {
    return 0.5;
  }

  const visitDate = new Date(mostRecentDate);

  const today = new Date();

  const differenceMs = today.getTime() - visitDate.getTime();

  const daysAgo = differenceMs / (1000 * 60 * 60 * 24);

  if (daysAgo <= 30) {
    return 1;
  }

  if (daysAgo <= 90) {
    return 0.75;
  }

  if (daysAgo <= 180) {
    return 0.5;
  }

  return 0.25;
}

export function calculateRelevanceScore(populationMatch: number, recencyScore: number): number {
  return populationMatch * 0.8 + recencyScore * 0.2;
}

export function getRelevanceLevel(score: number): RelevanceLevel {
  if (score >= 0.5) {
    return "HIGH";
  }

  if (score >= 0.25) {
    return "MEDIUM";
  }

  return "LOW";
}

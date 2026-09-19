export function normalizeConditionContext(condition: string): string {
  const value = condition.toLowerCase();

  if (value.includes("diabetes") || value.includes("hyperglycemia")) {
    return "Glycemic Management";
  }

  if (value.includes("hypertension") || value.includes("high blood pressure")) {
    return "Blood Pressure Management";
  }

  if (value.includes("hyperlipidemia") || value.includes("high cholesterol")) {
    return "Lipid Management";
  }

  if (value.includes("asthma")) {
    return "Asthma Management";
  }

  if (value.includes("hypothyroid") || value.includes("thyroid")) {
    return "Thyroid Management";
  }

  return condition;
}

export function normalizeMedicationContext(medication: string): string {
  const value = medication.toLowerCase();

  if (value.includes("metformin") || value.includes("insulin")) {
    return "Glycemic Management";
  }

  if (value.includes("lisinopril") || value.includes("losartan") || value.includes("amlodipine")) {
    return "Blood Pressure Management";
  }

  if (
    value.includes("atorvastatin") ||
    value.includes("rosuvastatin") ||
    value.includes("simvastatin")
  ) {
    return "Lipid Management";
  }

  if (value.includes("levothyroxine")) {
    return "Thyroid Management";
  }

  if (value.includes("albuterol")) {
    return "Asthma Management";
  }

  return `${medication} use`;
}

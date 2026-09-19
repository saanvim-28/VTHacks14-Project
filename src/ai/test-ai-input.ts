import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

console.log("Gemini key loaded:", process.env["GEMINI_API_KEY"] ? "YES" : "NO");

import type { OpenEMRPatient } from "@/types/openemr";

import { analyzePopulation } from "@/engine/population-analysis";
import { buildClinicalAIInput } from "./build-clinical-input";
import { analyzeClinicalDataWithAI } from "./clinical-reasoning";

const testPatients: OpenEMRPatient[] = [
  {
    patient_id: "1048",

    name: "Elena Vasquez",

    dob: "1968-01-01",

    sex: "female",

    conditions: ["Type 2 Diabetes Mellitus", "Hypertension"],

    medications: ["Metformin 1000mg BID", "Lisinopril 10mg daily"],

    observations: [
      {
        type: "HbA1c",
        value: 7.4,
        unit: "%",
        date: "2026-06-01",
      },
      {
        type: "HbA1c",
        value: 9.2,
        unit: "%",
        date: "2026-09-01",
      },
    ],

    visit_history: [
      {
        date: "2026-09-18",
        reason: "Diabetes follow-up",
        notes: "Patient reports increased fatigue and polyuria over the past 6 weeks.",
      },
    ],
  },

  {
    patient_id: "2183",

    name: "Marcus Chen",

    dob: "1959-01-01",

    sex: "male",

    conditions: ["Chronic Kidney Disease Stage 3a", "Atrial Fibrillation", "Hyperlipidemia"],

    medications: ["Apixaban 5mg BID", "Atorvastatin 40mg nightly", "Losartan 50mg daily"],

    observations: [
      {
        type: "eGFR",
        value: 56,
        unit: "mL/min",
        date: "2026-06-12",
      },
      {
        type: "eGFR",
        value: 48,
        unit: "mL/min",
        date: "2026-09-16",
      },
    ],

    visit_history: [
      {
        date: "2026-09-16",
        reason: "Routine metabolic panel",
        notes: "Patient denies edema or reduced urine output.",
      },
    ],
  },

  {
    patient_id: "3371",

    name: "Ruth Okafor",

    dob: "1981-01-01",

    sex: "female",

    conditions: ["Primary Hypothyroidism", "Vitamin D Deficiency"],

    medications: ["Levothyroxine 75mcg daily", "Cholecalciferol 2000 IU daily"],

    observations: [
      {
        type: "TSH",
        value: 2.8,
        unit: "mIU/L",
        date: "2026-06-15",
      },
      {
        type: "TSH",
        value: 2.6,
        unit: "mIU/L",
        date: "2026-09-15",
      },
    ],

    visit_history: [
      {
        date: "2026-09-15",
        reason: "Routine thyroid monitoring",
        notes: "No new symptoms reported.",
      },
    ],
  },
];

const populationAnalysis = analyzePopulation(testPatients);

console.log("\n========== POPULATION ANALYSIS ==========\n");

console.log(JSON.stringify(populationAnalysis, null, 2));

const aiInput = buildClinicalAIInput(populationAnalysis);

console.log("\n========== AI INPUT ==========\n");

console.log(JSON.stringify(aiInput, null, 2));

async function testAI(): Promise<void> {
  console.log("\n========== GEMINI CLINICAL ANALYSIS ==========\n");

  const result = await analyzeClinicalDataWithAI(aiInput);

  console.log(JSON.stringify(result, null, 2));
}

testAI().catch((error: unknown) => {
  console.error("AI analysis failed:");
  console.error(error);
});

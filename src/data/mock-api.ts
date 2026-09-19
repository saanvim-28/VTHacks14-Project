export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface Observation {
  type: string;
  value: number;
  unit: string;
  date: string;
  prior_value: number;
  prior_date: string;
}

export interface Encounter { date: string; note: string }
export interface ChangeDetected { description: string; detected_at: string }

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  sex: string;
  priority: Priority;
  priority_reason: string;
  updated_at: string;
  conditions: string[];
  medications: string[];
  observations: Observation[];
  encounters: Encounter[];
  change_detected: ChangeDetected;
}

export interface PharmaMatch {
  product: string;
  relevance: number;
  relevance_label: string;
  reasons: string[];
  source: string;
  briefing_text: string;
  briefing_audio_url: string | null;
}

const patients: Patient[] = [
  {
    patient_id: "1048", name: "Elena Vasquez", age: 58, sex: "female", priority: "HIGH",
    priority_reason: "New patient information differs from recent baseline.", updated_at: "2026-09-18T10:16:00Z",
    conditions: ["Type 2 Diabetes Mellitus", "Hypertension"],
    medications: ["Metformin 1000mg BID", "Lisinopril 10mg daily"],
    observations: [{ type: "HbA1c", value: 9.2, unit: "%", date: "2026-09-01", prior_value: 7.4, prior_date: "2026-06-01" }],
    encounters: [{ date: "2026-09-18", note: "Pt reports increased fatigue and polyuria over past 6 weeks." }],
    change_detected: { description: "HbA1c rose from 7.4% to 9.2% over 3 months.", detected_at: "2026-09-18T10:15:00Z" },
  },
  {
    patient_id: "2183", name: "Marcus Chen", age: 67, sex: "male", priority: "MEDIUM",
    priority_reason: "Gradual renal function trend detected across three results.", updated_at: "2026-09-18T09:42:00Z",
    conditions: ["Chronic Kidney Disease Stage 3a", "Atrial Fibrillation", "Hyperlipidemia"],
    medications: ["Apixaban 5mg BID", "Atorvastatin 40mg nightly", "Losartan 50mg daily"],
    observations: [{ type: "eGFR", value: 48, unit: "mL/min", date: "2026-09-16", prior_value: 56, prior_date: "2026-06-12" }],
    encounters: [{ date: "2026-09-16", note: "Routine metabolic panel. Patient denies edema or reduced urine output." }],
    change_detected: { description: "eGFR declined from 56 to 48 mL/min over 3 months, continuing a downward trend.", detected_at: "2026-09-18T09:41:00Z" },
  },
  {
    patient_id: "3371", name: "Ruth Okafor", age: 45, sex: "female", priority: "LOW",
    priority_reason: "Recent values remain stable within the established baseline.", updated_at: "2026-09-18T08:05:00Z",
    conditions: ["Primary Hypothyroidism", "Vitamin D Deficiency"],
    medications: ["Levothyroxine 75mcg daily", "Cholecalciferol 2000 IU daily"],
    observations: [{ type: "TSH", value: 2.6, unit: "mIU/L", date: "2026-09-15", prior_value: 2.8, prior_date: "2026-06-15" }],
    encounters: [{ date: "2026-09-15", note: "Routine thyroid monitoring. No new symptoms reported." }],
    change_detected: { description: "TSH remains stable at 2.6 mIU/L compared with 2.8 mIU/L three months ago.", detected_at: "2026-09-18T08:04:00Z" },
  },
];

const sharedReasons = ["Relevant to documented condition", "Relevant clinical topic detected", "Matching information found in the knowledge base"];
const matches: Record<string, PharmaMatch[]> = {
  "1048": [
    { product: "Semaglutide", relevance: 0.96, relevance_label: "HIGH RELEVANCE", reasons: sharedReasons, source: "ADA Standards of Care 2026 — Glycemic Management", briefing_text: "Elena’s HbA1c has risen significantly despite a therapeutic dose of metformin. Current guidance supports considering a GLP-1 receptor agonist when additional glycemic control is needed, with selection informed by cardiovascular risk, kidney function, tolerability, and patient preference.", briefing_audio_url: null },
    { product: "Empagliflozin", relevance: 0.92, relevance_label: "HIGH RELEVANCE", reasons: ["Relevant to type 2 diabetes", "Cardiorenal benefit discussed in current guidance", "Potential add-on therapy after metformin"], source: "ADA/EASD Consensus Report", briefing_text: "Empagliflozin is relevant as an additional glucose-lowering option with established cardiorenal benefits in appropriate patients. Before consideration, confirm kidney function, volume status, and risk factors for genitourinary adverse effects.", briefing_audio_url: null },
    { product: "Continuous Glucose Monitoring", relevance: 0.84, relevance_label: "MEDIUM RELEVANCE", reasons: ["Rapid HbA1c change detected", "May clarify glycemic patterns", "Supports shared treatment decisions"], source: "ADA Diabetes Technology Standards 2026", briefing_text: "Short-term continuous glucose monitoring may help identify fasting and post-meal patterns contributing to Elena’s elevated HbA1c. The resulting profile can support a targeted medication and lifestyle discussion.", briefing_audio_url: null },
    { product: "Sitagliptin", relevance: 0.75, relevance_label: "MEDIUM RELEVANCE", reasons: ["Oral add-on option", "Low hypoglycemia risk", "Dose depends on renal function"], source: "Clinical Pharmacology Review", briefing_text: "Sitagliptin is an oral option that can provide modest additional glycemic lowering with a low intrinsic hypoglycemia risk. Kidney function should be reviewed because renal dose adjustment may be required.", briefing_audio_url: null },
    { product: "Diabetes Self-Management Education", relevance: 0.71, relevance_label: "MEDIUM RELEVANCE", reasons: ["Symptoms suggest worsening glycemia", "Supports medication adherence", "Recommended at treatment transitions"], source: "National DSMES Standards", briefing_text: "A focused diabetes education referral may help identify barriers involving adherence, nutrition, monitoring, or access. Education is especially useful when glycemic targets are missed or treatment changes are being considered.", briefing_audio_url: null },
  ],
  "2183": [
    { product: "Finerenone", relevance: 0.91, relevance_label: "HIGH RELEVANCE", reasons: sharedReasons, source: "KDIGO CKD Guideline 2026", briefing_text: "Marcus has a sustained decline in estimated kidney function. Finerenone may be relevant when chronic kidney disease is associated with type 2 diabetes and persistent albuminuria, after potassium and current renin-angiotensin system therapy are reviewed.", briefing_audio_url: null },
    { product: "Losartan renal monitoring", relevance: 0.88, relevance_label: "HIGH RELEVANCE", reasons: ["Active medication identified", "Renal trend detected", "Potassium and creatinine monitoring relevant"], source: "Renal Medicines Optimization Guide", briefing_text: "Losartan remains kidney protective in many patients, but the declining eGFR makes recent creatinine, potassium, blood pressure, and volume status important to review. Avoid changing therapy based on a single value without confirming the trend and clinical context.", briefing_audio_url: null },
    { product: "Apixaban dosing review", relevance: 0.79, relevance_label: "MEDIUM RELEVANCE", reasons: ["Anticoagulant on medication list", "Renal function affects exposure", "Dose criteria should be reassessed"], source: "Apixaban Prescribing Information", briefing_text: "Marcus’s renal trend makes periodic reassessment of apixaban dosing appropriate. Confirm serum creatinine, age, body weight, bleeding history, and interacting medicines against the current prescribing criteria.", briefing_audio_url: null },
    { product: "Nephrology referral criteria", relevance: 0.68, relevance_label: "MEDIUM RELEVANCE", reasons: ["Progressive eGFR decline", "Referral thresholds available", "Supports longitudinal planning"], source: "KDIGO Referral Practice Point", briefing_text: "The current eGFR alone may not require urgent referral, but the rate and persistence of decline matter. Review albuminuria, electrolyte abnormalities, resistant hypertension, and the projected kidney failure risk.", briefing_audio_url: null },
  ],
  "3371": [
    { product: "Levothyroxine maintenance", relevance: 0.87, relevance_label: "HIGH RELEVANCE", reasons: sharedReasons, source: "American Thyroid Association Guidance", briefing_text: "Ruth’s TSH remains within target and closely matches her prior result. Current information supports maintaining the existing levothyroxine dose if adherence and administration timing are consistent and no new symptoms are present.", briefing_audio_url: null },
    { product: "TSH monitoring interval", relevance: 0.82, relevance_label: "MEDIUM RELEVANCE", reasons: ["Stable thyroid test", "Maintenance monitoring relevant", "No symptoms documented"], source: "Primary Care Thyroid Monitoring Guide", briefing_text: "With stable thyroid function and no new symptoms, routine interval monitoring is appropriate. Earlier testing may be needed if medications, pregnancy status, adherence, or clinical symptoms change.", briefing_audio_url: null },
    { product: "Vitamin D maintenance", relevance: 0.69, relevance_label: "MEDIUM RELEVANCE", reasons: ["Active supplementation", "Documented deficiency", "Maintenance regimen review"], source: "Endocrine Society Clinical Practice Guideline", briefing_text: "Ruth’s current vitamin D supplementation is a common maintenance regimen. Confirm the most recent vitamin D level, dietary intake, and any factors that alter absorption before adjusting therapy.", briefing_audio_url: null },
  ],
};

const wait = (ms = 420) => new Promise((resolve) => setTimeout(resolve, ms));
export async function getPatients(): Promise<Patient[]> { await wait(); return structuredClone(patients); }
export async function getPatientById(id: string): Promise<Patient | null> { await wait(300); return structuredClone(patients.find((p) => p.patient_id === id) ?? null); }
export async function getMatchesForPatient(id: string): Promise<PharmaMatch[]> { await wait(); return structuredClone(matches[id] ?? []); }
export async function getBriefingForPatient(id: string, product: string): Promise<PharmaMatch | null> { await wait(260); return structuredClone(matches[id]?.find((match) => match.product === product) ?? null); }

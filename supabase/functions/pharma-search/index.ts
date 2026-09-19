import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

// ======================================================
// TYPES
// ======================================================

interface Visit {
  date: string;
  reason: string;
  notes: string;
}

interface Patient {
  id: number;
  name?: string;
  dob?: string;
  sex?: string;
  conditions: string[];
  medications: string[];
  visit_history: Visit[];
}

// ======================================================
// CONFIG
// ======================================================

const OPENROUTER_EMBEDDING_MODEL = "liquid/lfm-2.5-embedding-350m:free";

// ======================================================
// BUILD PATIENT SEARCH CONTEXT
// ======================================================

function buildPatientSearchContext(patient: Patient): string {
  const visits =
    patient.visit_history
      ?.map((visit) => {
        return `
Visit date: ${visit.date}
Reason: ${visit.reason}
Notes: ${visit.notes}
        `.trim();
      })
      .join("\n\n") || "None";

  return `
Conditions:
${patient.conditions?.join(", ") || "None"}

Medications:
${patient.medications?.join(", ") || "None"}

Visit history:
${visits}
  `.trim();
}

// ======================================================
// CREATE OPENROUTER EMBEDDING
// ======================================================

async function createEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",

    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: OPENROUTER_EMBEDDING_MODEL,
      input: text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter embedding error:", response.status, data);

    throw new Error(`OpenRouter embedding failed: ${response.status}`);
  }

  const embedding = data.data?.[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error("OpenRouter did not return a valid embedding.");
  }

  return embedding;
}

// ======================================================
// GENERATE "WHY SURFACED?" LOCALLY
//
// Does NOT call an AI model.
// ======================================================

function generateWhySurfaced(patient: Patient, result: any): string {
  const conditions = patient.conditions || [];
  const medications = patient.medications || [];

  const conditionText = conditions.length > 0 ? conditions.join(", ") : "the documented conditions";

  const medicationText =
    medications.length > 0 ? medications.join(", ") : "the documented medications";

  const therapeuticArea = result.therapeutic_area || "the relevant therapeutic area";

  const indication = result.indication || "the retrieved indication";

  return (
    `This item was surfaced because its therapeutic area ` +
    `(${therapeuticArea}) and indication (${indication}) overlap ` +
    `with the patient's documented context, including ` +
    `${conditionText} and ${medicationText}.`
  );
}

// ======================================================
// GENERATE BRIEFING LOCALLY
//
// Does NOT call an AI model.
// ======================================================

function generateBriefing(patient: Patient, results: any[]): string {
  if (results.length === 0) {
    return (
      "No sufficiently relevant knowledge-base information " +
      "was retrieved for this patient context."
    );
  }

  const conditions =
    patient.conditions?.length > 0 ? patient.conditions.join(", ") : "no documented conditions";

  const medications =
    patient.medications?.length > 0 ? patient.medications.join(", ") : "no documented medications";

  // Only use strongest three results
  // so the briefing stays short.
  const topResults = results.slice(0, 3);

  const retrievedSummary = topResults
    .map((result) => {
      const product = result.product_name || "A retrieved knowledge-base item";

      const area = result.therapeutic_area || "an unspecified therapeutic area";

      const indication = result.indication || "an unspecified indication";

      return (
        `${product} was retrieved in the ${area} ` +
        `therapeutic area with information related to ` +
        `${indication}.`
      );
    })
    .join(" ");

  return (
    `The patient context includes ${conditions}, with documented ` +
    `medications including ${medications}. ` +
    `${retrievedSummary} ` +
    `These items were retrieved because of informational overlap ` +
    `with the documented patient context. This summary reflects ` +
    `retrieved knowledge-base information only and does not provide ` +
    `a treatment recommendation.`
  );
}

// ======================================================
// PROCESS ONE PATIENT
// ======================================================

async function processPatient(patient: Patient, openRouterKey: string, supabaseAdmin: any) {
  // ==================================================
  // 1. VALIDATE PATIENT
  // ==================================================

  if (!patient.id) {
    return {
      success: false,
      patient_id: null,
      patient_name: patient.name || null,
      error: "Patient id is required",
    };
  }

  try {
    // ==================================================
    // 2. BUILD SEARCH CONTEXT
    // ==================================================

    const searchContext = buildPatientSearchContext(patient);

    // ==================================================
    // 3. CREATE PATIENT EMBEDDING WITH OPENROUTER
    // ==================================================

    const queryEmbedding = await createEmbedding(searchContext, openRouterKey);

    console.log(`Patient ${patient.id} embedding generated:`, queryEmbedding.length, "dimensions");

    // ==================================================
    // 4. VECTOR SEARCH IN SUPABASE
    // ==================================================

    const { data, error } = await supabaseAdmin.rpc("match_pharma_content", {
      query_embedding: queryEmbedding,
      match_count: 5,
    });

    if (error) {
      throw error;
    }

    // ==================================================
    // 5. FILTER WEAK RESULTS
    // ==================================================

    const filteredResults = (data || []).filter((item: any) => item.similarity >= 0.72);

    // ==================================================
    // 6. ADD LOCAL "WHY SURFACED?"
    // ==================================================

    const resultsWithWhy = filteredResults.map((result: any) => {
      return {
        ...result,

        why_surfaced: generateWhySurfaced(patient, result),
      };
    });

    // ==================================================
    // 7. GENERATE LOCAL BRIEFING
    // ==================================================

    const briefing = generateBriefing(patient, resultsWithWhy);

    // ==================================================
    // 8. RETURN THIS PATIENT'S ANALYSIS
    // ==================================================

    return {
      success: true,

      patient_id: patient.id,

      patient_name: patient.name || null,

      search_context: searchContext,

      results: resultsWithWhy,

      briefing,
    };
  } catch (error) {
    console.error(`Error processing patient ${patient.id}:`, error);

    return {
      success: false,

      patient_id: patient.id,

      patient_name: patient.name || null,

      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ======================================================
// EDGE FUNCTION HELPERS
// ======================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",

  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,

    headers: {
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

// ======================================================
// EDGE FUNCTION
// ======================================================

export default {
  fetch: withSupabase(
    {
      auth: ["publishable", "secret"],
    },

    async (req, ctx) => {
      // ==================================================
      // CORS PREFLIGHT
      // ==================================================

      if (req.method === "OPTIONS") {
        return new Response("ok", {
          headers: corsHeaders,
        });
      }

      try {
        // ==================================================
        // 1. GET OPENROUTER API KEY
        // ==================================================

        const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");

        if (!openRouterKey) {
          throw new Error("OPENROUTER_API_KEY is missing");
        }

        // ==================================================
        // 2. READ REQUEST BODY
        // ==================================================

        const body = await req.json();

        // ==================================================
        // 3. SUPPORT ONE OR MULTIPLE PATIENTS
        // ==================================================

        const patients: Patient[] = Array.isArray(body) ? body : [body];

        // ==================================================
        // 4. VALIDATE REQUEST
        // ==================================================

        if (patients.length === 0) {
          return json(
            {
              success: false,

              error: "At least one patient is required",
            },

            {
              status: 400,
            },
          );
        }

        // ==================================================
        // 5. PROCESS PATIENTS SEQUENTIALLY
        //
        // Avoid sending a large number of embedding requests
        // simultaneously.
        // ==================================================

        const patientResults = [];

        for (const patient of patients) {
          const result = await processPatient(patient, openRouterKey, ctx.supabaseAdmin);

          patientResults.push(result);
        }

        // ==================================================
        // 6. CALCULATE SUMMARY
        // ==================================================

        const successful = patientResults.filter((result) => result.success).length;

        const failed = patientResults.length - successful;

        // ==================================================
        // 7. RETURN ANALYSIS
        // ==================================================

        return json({
          success: failed === 0,

          patient_count: patients.length,

          successful,

          failed,

          patients: patientResults,
        });
      } catch (error) {
        // ==================================================
        // GLOBAL ERROR HANDLING
        // ==================================================

        console.error(error);

        return json(
          {
            success: false,

            error: error instanceof Error ? error.message : String(error),
          },

          {
            status: 500,
          },
        );
      }
    },
  ),
};

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
// GEMINI RETRY HELPER
//
// Only retries temporary server errors.
//
// IMPORTANT:
// 429 is NOT retried because retrying immediately will
// not fix an exhausted quota.
// ======================================================

async function callGeminiWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {

  let lastResponse: Response | null = null;


  for (
    let attempt = 0;
    attempt <= maxRetries;
    attempt++
  ) {

    const response =
      await fetch(url, options);

    lastResponse = response;


    // Success
    if (response.ok) {
      return response;
    }


    // Only retry temporary server errors.
    const retryableStatuses = [
      500,
      502,
      503,
      504
    ];


    if (
      retryableStatuses.includes(response.status) &&
      attempt < maxRetries
    ) {

      const waitTime =
        1000 * Math.pow(2, attempt);


      console.log(
        `Gemini returned ${response.status}. ` +
        `Retrying in ${waitTime}ms...`
      );


      await new Promise(
        (resolve) =>
          setTimeout(resolve, waitTime)
      );


      continue;
    }


    // Non-retryable error
    return response;
  }


  if (lastResponse) {
    return lastResponse;
  }


  throw new Error(
    "Gemini request failed before receiving a response."
  );
}


// ======================================================
// GENERATE "WHY SURFACED?" LOCALLY
//
// Does NOT call Gemini.
// ======================================================

function generateWhySurfaced(
  patient: Patient,
  result: any
): string {

  const conditions =
    patient.conditions || [];


  const medications =
    patient.medications || [];


  const conditionText =
    conditions.length > 0
      ? conditions.join(", ")
      : "the documented conditions";


  const medicationText =
    medications.length > 0
      ? medications.join(", ")
      : "the documented medications";


  const therapeuticArea =
    result.therapeutic_area ||
    "the relevant therapeutic area";


  const indication =
    result.indication ||
    "the retrieved indication";


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
// Does NOT call Gemini.
// ======================================================

function generateBriefing(
  patient: Patient,
  results: any[]
): string {

  if (results.length === 0) {

    return (
      "No sufficiently relevant knowledge-base information " +
      "was retrieved for this patient context."
    );
  }


  const conditions =
    patient.conditions?.length > 0
      ? patient.conditions.join(", ")
      : "no documented conditions";


  const medications =
    patient.medications?.length > 0
      ? patient.medications.join(", ")
      : "no documented medications";


  // Only use strongest three results
  // so the briefing stays short.
  const topResults =
    results.slice(0, 3);


  const retrievedSummary =
    topResults
      .map((result) => {

        const product =
          result.product_name ||
          "A retrieved knowledge-base item";


        const area =
          result.therapeutic_area ||
          "an unspecified therapeutic area";


        const indication =
          result.indication ||
          "an unspecified indication";


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

async function processPatient(
  patient: Patient,
  geminiKey: string,
  supabaseAdmin: any
) {

  // ==================================================
  // 1. VALIDATE PATIENT
  // ==================================================

  if (!patient.id) {

    return {
      success: false,
      patient_id: null,
      patient_name:
        patient.name || null,
      error:
        "Patient id is required"
    };
  }


  try {

    // ==================================================
    // 2. BUILD SEARCH CONTEXT
    // ==================================================

    const searchContext =
      buildPatientSearchContext(
        patient
      );


    // ==================================================
    // 3. CREATE PATIENT EMBEDDING
    //
    // This is the ONLY Gemini call for this patient.
    // ==================================================

    const embeddingResponse =
      await callGeminiWithRetry(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent",
        {
          method: "POST",

          headers: {
            "x-goog-api-key":
              geminiKey,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            content: {
              parts: [
                {
                  text:
                    searchContext
                }
              ]
            },

            output_dimensionality:
              1536
          })
        }
      );


    const embeddingData =
      await embeddingResponse.json();


    // ==================================================
    // 4. HANDLE GEMINI ERRORS
    // ==================================================

    if (!embeddingResponse.ok) {

      console.error(
        `Gemini error for patient ${patient.id}:`,
        embeddingData
      );


      return {
        success: false,

        patient_id:
          patient.id,

        patient_name:
          patient.name || null,

        error:
          embeddingResponse.status === 429
            ? "Gemini API quota exceeded."
            : `Gemini embedding error: ${JSON.stringify(
                embeddingData
              )}`
      };
    }


    // ==================================================
    // 5. GET EMBEDDING
    // ==================================================

    const queryEmbedding =
      embeddingData.embedding?.values;


    if (
      !queryEmbedding ||
      !Array.isArray(queryEmbedding)
    ) {

      return {
        success: false,

        patient_id:
          patient.id,

        patient_name:
          patient.name || null,

        error:
          "Gemini did not return a valid embedding."
      };
    }


    // ==================================================
    // 6. VECTOR SEARCH IN SUPABASE
    // ==================================================

    const {
      data,
      error
    } =
      await supabaseAdmin.rpc(
        "match_pharma_content",
        {
          query_embedding:
            queryEmbedding,

          match_count:
            5
        }
      );


    if (error) {
      throw error;
    }


    // ==================================================
    // 7. FILTER WEAK RESULTS
    // ==================================================

    const filteredResults =
      (data || []).filter(
        (item: any) =>
          item.similarity >= 0.72
      );


    // ==================================================
    // 8. ADD LOCAL "WHY SURFACED?"
    // ==================================================

    const resultsWithWhy =
      filteredResults.map(
        (result: any) => {

          return {
            ...result,

            why_surfaced:
              generateWhySurfaced(
                patient,
                result
              )
          };
        }
      );


    // ==================================================
    // 9. GENERATE LOCAL BRIEFING
    // ==================================================

    const briefing =
      generateBriefing(
        patient,
        resultsWithWhy
      );


    // ==================================================
    // 10. RETURN THIS PATIENT'S ANALYSIS
    // ==================================================

    return {

      success:
        true,

      patient_id:
        patient.id,

      patient_name:
        patient.name || null,

      search_context:
        searchContext,

      results:
        resultsWithWhy,

      briefing:
        briefing
    };


  } catch (error) {

    console.error(
      `Error processing patient ${patient.id}:`,
      error
    );


    return {

      success:
        false,

      patient_id:
        patient.id,

      patient_name:
        patient.name || null,

      error:
        error instanceof Error
          ? error.message
          : String(error)
    };
  }
}


// ======================================================
// EDGE FUNCTION
// ======================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { ...corsHeaders, ...(init.headers ?? {}) },
  });
}

export default {

  fetch: withSupabase(
    {
      auth: [
        "publishable",
        "secret"
      ]
    },


    async (req, ctx) => {
      if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
      }

      try {

        // ==================================================
        // 1. GET GEMINI API KEY
        // ==================================================

        const geminiKey =
          Deno.env.get(
            "gem_stacked_up_KEY"
          );


        if (!geminiKey) {

          throw new Error(
            "gem_stacked_up_KEY is missing"
          );
        }


        // ==================================================
        // 2. READ REQUEST BODY
        // ==================================================

        const body =
          await req.json();


        // ==================================================
        // 3. SUPPORT BOTH:
        //
        // One patient:
        // { "id": 1, ... }
        //
        // OR multiple patients:
        // [
        //   { "id": 1, ... },
        //   { "id": 2, ... }
        // ]
        // ==================================================

        const patients: Patient[] =
          Array.isArray(body)
            ? body
            : [body];


        // ==================================================
        // 4. VALIDATE REQUEST
        // ==================================================

        if (patients.length === 0) {

          return json(
            {
              success: false,
              error:
                "At least one patient is required"
            },
            {
              status: 400
            }
          );
        }


        // ==================================================
        // 5. PROCESS ALL PATIENTS
        //
        // IMPORTANT:
        // Process sequentially instead of Promise.all().
        //
        // This avoids firing 10 Gemini requests at exactly
        // the same time and makes rate limiting less likely.
        // ==================================================

        const patientResults = [];


        for (const patient of patients) {

          const result =
            await processPatient(
              patient,
              geminiKey,
              ctx.supabaseAdmin
            );


          patientResults.push(
            result
          );
        }


        // ==================================================
        // 6. CALCULATE SUMMARY
        // ==================================================

        const successful =
          patientResults.filter(
            (result) =>
              result.success
          ).length;


        const failed =
          patientResults.length -
          successful;


        // ==================================================
        // 7. RETURN ANALYSIS FOR ALL PATIENTS
        // ==================================================

        return json({

          success:
            failed === 0,

          patient_count:
            patients.length,

          successful:
            successful,

          failed:
            failed,

          patients:
            patientResults
        });


      } catch (error) {

        // ==================================================
        // GLOBAL ERROR HANDLING
        // ==================================================

        console.error(error);


        return json(
          {
            success:
              false,

            error:
              error instanceof Error
                ? error.message
                : String(error)
          },
          {
            status: 500
          }
        );
      }
    }
  )
};

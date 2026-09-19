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

function buildPatientSearchContext(patient: Patient) {

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
// Retries temporary errors such as 503 high demand.
// ======================================================

async function callGeminiWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
) {

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


    // Retry temporary Gemini errors.
    //
    // 429 = rate limited
    // 500 = temporary server issue
    // 502 = gateway issue
    // 503 = model overloaded
    // 504 = timeout

    const retryableStatuses = [
      429,
      500,
      502,
      503,
      504
    ];


    if (
      retryableStatuses.includes(response.status)
      && attempt < maxRetries
    ) {

      // Exponential-ish delay:
      // attempt 0 -> 1 second
      // attempt 1 -> 2 seconds

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


    // Non-retryable error OR
    // we used all retries.
    return response;
  }


  // Should almost never reach this,
  // but TypeScript needs a fallback.

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error(
    "Gemini request failed before receiving a response."
  );
}


// ======================================================
// GENERATE "WHY SURFACED?"
// ======================================================

async function generateWhySurfaced(
  geminiKey: string,
  patientContext: string,
  result: any
) {

  const prompt = `
You are generating a short explanation for a physician-facing
information retrieval interface.

Explain why the supplied knowledge-base item was retrieved for the
supplied patient context.

RULES:
- Use ONLY information contained in the patient context and knowledge-base item.
- Do NOT diagnose the patient.
- Do NOT recommend a treatment.
- Do NOT say that this product is appropriate for the patient.
- Do NOT determine patient priority or urgency.
- Do NOT invent medical facts.
- Do NOT provide medical advice.
- Explain only the informational overlap between the patient context and the retrieved content.
- Keep the explanation to 1-2 concise sentences.

PATIENT CONTEXT:
${patientContext}

KNOWLEDGE-BASE ITEM:

Product:
${result.product_name}

Therapeutic area:
${result.therapeutic_area}

Indication:
${result.indication}

Clinical topics:
${
  Array.isArray(result.clinical_topics)
    ? result.clinical_topics.join(", ")
    : result.clinical_topics
}

Title:
${result.title}

Content:
${result.content}

Source:
${result.source}

TASK:
Write a concise explanation of why this knowledge-base item was surfaced.
  `.trim();


  const response =
    await callGeminiWithRetry(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",

        headers: {
          "x-goog-api-key": geminiKey,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );


  const data =
    await response.json();


  if (!response.ok) {
    throw new Error(
      `Gemini generation error: ${JSON.stringify(data)}`
    );
  }


  return (
    data.candidates?.[0]
      ?.content?.parts?.[0]
      ?.text?.trim()
    ||
    "Relevant clinical topics overlap with this patient context."
  );
}


// ======================================================
// GENERATE 60-SECOND BRIEFING
// ======================================================

async function generateBriefing(
  geminiKey: string,
  patientContext: string,
  results: any[]
) {

  // Don't ask Gemini to invent a briefing
  // when nothing passed our retrieval threshold.

  if (results.length === 0) {

    return (
      "No sufficiently relevant knowledge-base " +
      "information was retrieved for this patient context."
    );
  }


  // Combine all retrieved knowledge-base
  // items into one grounded context.

  const retrievedContent =
    results
      .map((result, index) => {

        return `
ITEM ${index + 1}

Product:
${result.product_name}

Therapeutic area:
${result.therapeutic_area}

Indication:
${result.indication}

Clinical topics:
${
  Array.isArray(result.clinical_topics)
    ? result.clinical_topics.join(", ")
    : result.clinical_topics
}

Content:
${result.content}

Source:
${result.source}
        `.trim();

      })
      .join("\n\n");


  const prompt = `
You are creating a short physician-facing audio briefing based on
retrieved knowledge-base information.

Create a concise briefing that would take approximately 45-60 seconds
to read aloud.

RULES:
- Use ONLY the supplied patient context and retrieved knowledge-base items.
- Summarize the retrieved information and explain why it is relevant to the supplied context.
- Focus on the strongest and most directly relevant information first.
- Do NOT diagnose the patient.
- Do NOT recommend a treatment.
- Do NOT recommend prescribing, stopping, or changing a medication.
- Do NOT state that a product is appropriate for the patient.
- Do NOT determine patient priority or urgency.
- Do NOT invent facts.
- Do NOT provide medical advice.
- Do NOT mention similarity scores.
- Do NOT identify the patient by name.
- Keep the briefing factual and concise.
- Write approximately 100-130 words.
- Write natural spoken prose, not bullet points.
- Do not add information that is not present below.

PATIENT CONTEXT:
${patientContext}

RETRIEVED KNOWLEDGE-BASE ITEMS:
${retrievedContent}

TASK:
Write the briefing only.
Do not include a heading or any additional commentary.
  `.trim();


  const response =
    await callGeminiWithRetry(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",

        headers: {
          "x-goog-api-key": geminiKey,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      `Gemini briefing error: ${JSON.stringify(data)}`
    );
  }


  return (
    data.candidates?.[0]
      ?.content?.parts?.[0]
      ?.text?.trim()
    ||
    "Briefing could not be generated."
  );
}


// ======================================================
// EDGE FUNCTION
// ======================================================

export default {

  fetch: withSupabase(
    {
      auth: [
        "publishable",
        "secret"
      ]
    },

    async (req, ctx) => {

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
        // 2. READ PATIENT JSON
        // ==================================================

        const patient: Patient =
          await req.json();


        if (!patient.id) {

          return Response.json(
            {
              success: false,
              error:
                "patient id is required"
            },
            {
              status: 400
            }
          );
        }


        // ==================================================
        // 3. BUILD PATIENT SEARCH CONTEXT
        // ==================================================

        const searchContext =
          buildPatientSearchContext(
            patient
          );


        // ==================================================
        // 4. CREATE PATIENT EMBEDDING
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


        if (!embeddingResponse.ok) {

          throw new Error(
            `Gemini embedding error: ${JSON.stringify(embeddingData)}`
          );
        }


        const queryEmbedding =
          embeddingData.embedding.values;


        // ==================================================
        // 5. VECTOR SEARCH IN SUPABASE
        // ==================================================

        const {
          data,
          error
        } =
          await ctx.supabaseAdmin.rpc(
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
        // 6. REMOVE WEAK RETRIEVAL MATCHES
        // ==================================================

        const filteredResults =
          (data || []).filter(
            (item) =>
              item.similarity >= 0.72
          );


        // ==================================================
        // 7. GENERATE "WHY SURFACED?"
        // ==================================================

        const resultsWithWhy = [];


        for (
          const result
          of filteredResults
        ) {

          const whySurfaced =
            await generateWhySurfaced(
              geminiKey,
              searchContext,
              result
            );


          resultsWithWhy.push({

            ...result,

            why_surfaced:
              whySurfaced
          });
        }


        // ==================================================
        // 8. GENERATE ONE 60-SECOND BRIEFING
        // ==================================================

        const briefing =
          await generateBriefing(
            geminiKey,
            searchContext,
            resultsWithWhy
          );


        // ==================================================
        // 9. CREATE CLEAN ELEVENLABS INPUT JSON
        // ==================================================

        /*
          We are NOT calling ElevenLabs yet.

          This object contains exactly what our
          future ElevenLabs function needs.

          Later we can simply send:

              elevenlabs_input.text

          to ElevenLabs.
        */

        const elevenlabsInput = {

          patient_id:
            patient.id,

          text:
            briefing,

          content_type:
            "physician_briefing",

          approximate_duration_seconds:
            60
        };


        // ==================================================
        // 10. RETURN EVERYTHING
        // ==================================================

        return Response.json({

          success:
            true,

          patient_id:
            patient.id,

          search_context:
            searchContext,

          results:
            resultsWithWhy,

          briefing:
            briefing,

          elevenlabs_input:
            elevenlabsInput
        });


      } catch (error) {

        // ==================================================
        // ERROR HANDLING
        // ==================================================

        console.error(error);


        return Response.json(
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
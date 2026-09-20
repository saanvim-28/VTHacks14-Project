import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ======================================================
// TYPES
// ======================================================

interface Visit {
  date: string;
  reason: string;
  notes: string;
}

interface Patient {
  // Supports both our original test-data format
  // and the canonical patient_id format used by the team.
  id?: string | number;
  patient_id?: string | number;

  name?: string;
  dob?: string | null;
  sex?: string | null;

  conditions: string[];
  medications: string[];
  visit_history: Visit[];
}

interface PharmaPopulationItem {
  id: number;

  product_name: string;
  therapeutic_area: string;
  indication: string;
  clinical_topics: string[];
  title: string;
  content: string;
  source: string;

  matched_patient_ids: Array<string | number>;

  matched_patient_count: number;
  total_patient_count: number;

  population_match: number;

  average_similarity: number;
  max_similarity: number;

  top_5_category: "POPULATION" | "PRECISION";
  top_5_reason: string;
}

// ======================================================
// CONFIG
// ======================================================

const OPENROUTER_EMBEDDING_MODEL =
  "liquid/lfm-2.5-embedding-350m:free";

// Absolute minimum similarity.
//
// Keep this at 0.45 for now.
// We are still tuning against our synthetic KB.
const SIMILARITY_THRESHOLD = 0.45;

// A result must also be reasonably close to the
// strongest result for that patient.
//
// Example:
// best = 0.61
// cutoff = 0.61 - 0.10 = 0.51
//
// This helps remove weak semantic false positives.
const RELATIVE_SIMILARITY_GAP = 0.10;

// OpenRouter retry settings.
const MAX_EMBEDDING_ATTEMPTS = 4;

// Delay between patients to reduce request bursts.
const PATIENT_REQUEST_DELAY_MS = 500;

// General Top 5 configuration.
//
// IMPORTANT:
// Similarity is a semantic retrieval score, not clinical accuracy
// or a treatment-confidence percentage.
const TOP_3_MIN_AVERAGE_SIMILARITY = 0.70;
const TOP_2_MIN_MAX_SIMILARITY = 0.70;
const TOP_POPULATION_COUNT = 3;
const TOP_PRECISION_COUNT = 2;

// ======================================================
// HELPERS
// ======================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ======================================================
// NORMALIZE PATIENT ID
// ======================================================

function getPatientId(
  patient: Patient,
): string | number | null {
  return (
    patient.patient_id ??
    patient.id ??
    null
  );
}

// ======================================================
// BUILD PATIENT SEARCH CONTEXT
// ======================================================

function buildPatientSearchContext(
  patient: Patient,
): string {
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
//
// Includes retry/backoff for:
// 429
// 500
// 502
// 503
// 504
// ======================================================

async function createEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  for (
    let attempt = 1;
    attempt <= MAX_EMBEDDING_ATTEMPTS;
    attempt++
  ) {
    let response: Response;

    try {
      response = await fetch(
        "https://openrouter.ai/api/v1/embeddings",
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            model: OPENROUTER_EMBEDDING_MODEL,
            input: text,
          }),
        },
      );
    } catch (error) {
      console.error(
        `OpenRouter network error on attempt ${attempt}:`,
        error,
      );

      if (attempt < MAX_EMBEDDING_ATTEMPTS) {
        const waitMs =
          1000 *
          Math.pow(
            2,
            attempt - 1,
          );

        console.warn(
          `Retrying OpenRouter request in ${waitMs}ms...`,
        );

        await sleep(waitMs);

        continue;
      }

      throw error;
    }

    // Read response body once.
    let data: any;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    // ==================================================
    // SUCCESS
    // ==================================================

    if (response.ok) {
      const embedding =
        data?.data?.[0]?.embedding;

      if (!Array.isArray(embedding)) {
        throw new Error(
          "OpenRouter did not return a valid embedding.",
        );
      }

      if (embedding.length !== 1024) {
        throw new Error(
          `Expected a 1024-dimensional embedding, ` +
          `but received ${embedding.length}.`,
        );
      }

      return embedding;
    }

    // ==================================================
    // DETERMINE WHETHER ERROR IS RETRYABLE
    // ==================================================

    const retryable =
      response.status === 429 ||
      response.status === 500 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504;

    // ==================================================
    // RETRY
    // ==================================================

    if (
      retryable &&
      attempt < MAX_EMBEDDING_ATTEMPTS
    ) {
      // Exponential backoff:
      //
      // attempt 1 → 1 sec
      // attempt 2 → 2 sec
      // attempt 3 → 4 sec

      const waitMs =
        1000 *
        Math.pow(
          2,
          attempt - 1,
        );

      console.warn(
        `OpenRouter returned ${response.status}. ` +
        `Retrying in ${waitMs}ms ` +
        `(attempt ${attempt}/${MAX_EMBEDDING_ATTEMPTS})...`,
      );

      await sleep(waitMs);

      continue;
    }

    // ==================================================
    // FINAL FAILURE
    // ==================================================

    console.error(
      "OpenRouter embedding error:",
      response.status,
      data,
    );

    throw new Error(
      `OpenRouter embedding failed: ${response.status}`,
    );
  }

  throw new Error(
    "OpenRouter embedding failed after all retry attempts.",
  );
}

// ======================================================
// GENERATE "WHY SURFACED?" LOCALLY
//
// Does NOT call an AI model.
// ======================================================

function generateWhySurfaced(
  patient: Patient,
  result: any,
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
    String(
      result.therapeutic_area ||
        "the relevant therapeutic area",
    ).trim();

  const indication =
    String(
      result.indication ||
        "the retrieved indication",
    ).trim();

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

function generateBriefing(
  patient: Patient,
  results: any[],
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

  // Only use the strongest three results
  // so the briefing stays concise.
  const topResults =
    results.slice(0, 3);

  const retrievedSummary =
    topResults
      .map((result) => {
        const product =
          String(
            result.product_name ||
              "A retrieved knowledge-base item",
          ).trim();

        const area =
          String(
            result.therapeutic_area ||
              "an unspecified therapeutic area",
          ).trim();

        const indication =
          String(
            result.indication ||
              "an unspecified indication",
          ).trim();

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
  openRouterKey: string,
  supabaseAdmin: any,
) {
  const patientId =
    getPatientId(patient);

  // ==================================================
  // 1. VALIDATE PATIENT
  // ==================================================

  if (
    patientId === null ||
    patientId === ""
  ) {
    return {
      success: false,

      patient_id: null,

      patient_name:
        patient.name || null,

      error:
        "Patient id is required",

      results: [],

      briefing: null,
    };
  }

  try {
    // ==================================================
    // 2. BUILD SEARCH CONTEXT
    // ==================================================

    const searchContext =
      buildPatientSearchContext(
        patient,
      );

    // ==================================================
    // 3. CREATE PATIENT EMBEDDING
    // ==================================================

    const queryEmbedding =
      await createEmbedding(
        searchContext,
        openRouterKey,
      );

    console.log(
      `Patient ${patientId} embedding generated:`,
      queryEmbedding.length,
      "dimensions",
    );

    // ==================================================
    // 4. VECTOR SEARCH
    // ==================================================

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "match_pharma_content",
        {
          query_embedding:
            queryEmbedding,

          match_count:
            5,
        },
      );

    if (error) {
      throw error;
    }

    const matches =
      data || [];

    // ==================================================
    // 5. STORE RAW MATCHES FOR DEBUGGING
    // ==================================================

    const rawMatches =
      matches.map(
        (item: any) => ({
          id:
            item.id,

          product_name:
            item.product_name,

          therapeutic_area:
            item.therapeutic_area,

          indication:
            item.indication,

          similarity:
            item.similarity,
        }),
      );

    console.log(
      `Raw pharma matches for patient ${patientId}:`,
      rawMatches,
    );

    // ==================================================
    // 6. FIND STRONGEST MATCH
    // ==================================================

    const bestSimilarity =
      matches.length > 0
        ? Math.max(
            ...matches.map(
              (item: any) =>
                Number(item.similarity),
            ),
          )
        : 0;

    // Dynamic cutoff:
    //
    // Must pass BOTH:
    //
    // 1. absolute threshold >= 0.45
    //
    // AND
    //
    // 2. be no more than 0.10 below
    //    the patient's strongest result.

    const relativeThreshold =
      bestSimilarity -
      RELATIVE_SIMILARITY_GAP;

    // ==================================================
    // 7. FILTER RESULTS
    // ==================================================

    const filteredResults =
      matches.filter(
        (item: any) => {
          const similarity =
            Number(
              item.similarity,
            );

          return (
            similarity >=
              SIMILARITY_THRESHOLD &&
            similarity >=
              relativeThreshold
          );
        },
      );

    console.log(
      `Patient ${patientId}: ` +
      `${filteredResults.length} of ${rawMatches.length} matches passed. ` +
      `Best=${bestSimilarity.toFixed(3)}, ` +
      `absolute threshold=${SIMILARITY_THRESHOLD}, ` +
      `relative threshold=${relativeThreshold.toFixed(3)}`,
    );

    // ==================================================
    // 8. ADD LOCAL "WHY SURFACED?"
    // ==================================================

    const resultsWithWhy =
      filteredResults.map(
        (result: any) => ({
          ...result,

          why_surfaced:
            generateWhySurfaced(
              patient,
              result,
            ),
        }),
      );

    // ==================================================
    // 9. GENERATE LOCAL BRIEFING
    // ==================================================

    const briefing =
      generateBriefing(
        patient,
        resultsWithWhy,
      );

    // ==================================================
    // 10. RETURN PATIENT RESULT
    // ==================================================

    return {
      success:
        true,

      patient_id:
        patientId,

      patient_name:
        patient.name || null,

      search_context:
        searchContext,

      // TEMPORARY DEBUG DATA.
      //
      // Remove this once threshold tuning
      // is finished.
      raw_matches:
        rawMatches,

      best_similarity:
        bestSimilarity,

      effective_similarity_threshold:
        Math.max(
          SIMILARITY_THRESHOLD,
          relativeThreshold,
        ),

      results:
        resultsWithWhy,

      briefing:
        briefing,
    };
  } catch (error) {
    console.error(
      `Error processing patient ${patientId}:`,
      error,
    );

    return {
      success:
        false,

      patient_id:
        patientId,

      patient_name:
        patient.name || null,

      error:
        error instanceof Error
          ? error.message
          : String(error),

      results:
        [],

      briefing:
        null,
    };
  }
}

// ======================================================
// BUILD GENERAL TOP 5
//
// TOP 3:
// Broadest population relevance.
//
// TOP 2:
// Strongest remaining individual semantic matches.
//
// This ranks INFORMATION relevance only.
//
// It does NOT:
// - prioritize patients
// - determine clinical urgency
// - recommend treatment
// - recommend medication
// ======================================================

function buildGeneralTop5(
  patientResults: any[],
): PharmaPopulationItem[] {
  const successfulResults =
    patientResults.filter(
      (patientResult) =>
        patientResult.success === true,
    );

  const totalPatientCount =
    successfulResults.length;

  if (totalPatientCount === 0) {
    return [];
  }

  const contentMap =
    new Map<
      number,
      {
        id: number;
        product_name: string;
        therapeutic_area: string;
        indication: string;
        clinical_topics: string[];
        title: string;
        content: string;
        source: string;
        matched_patient_ids:
          Array<string | number>;
        similarities: number[];
      }
    >();

  for (const patientResult of successfulResults) {
    const results =
      Array.isArray(patientResult.results)
        ? patientResult.results
        : [];

    for (const item of results) {
      const similarity =
        Number(item.similarity);

      if (!Number.isFinite(similarity)) {
        continue;
      }

      const existing =
        contentMap.get(item.id);

      if (existing) {
        // A patient should contribute at most one similarity
        // to a given pharma-content item.
        if (
          !existing.matched_patient_ids.includes(
            patientResult.patient_id,
          )
        ) {
          existing.matched_patient_ids.push(
            patientResult.patient_id,
          );

          existing.similarities.push(
            similarity,
          );
        }
      } else {
        contentMap.set(
          item.id,
          {
            id: item.id,

            product_name:
              String(
                item.product_name || "",
              ).trim(),

            therapeutic_area:
              String(
                item.therapeutic_area || "",
              ).trim(),

            indication:
              String(
                item.indication || "",
              ).trim(),

            clinical_topics:
              Array.isArray(
                item.clinical_topics,
              )
                ? item.clinical_topics
                : [],

            title:
              String(
                item.title || "",
              ).trim(),

            content:
              String(
                item.content || "",
              ).trim(),

            source:
              String(
                item.source || "",
              ).trim(),

            matched_patient_ids: [
              patientResult.patient_id,
            ],

            similarities: [
              similarity,
            ],
          },
        );
      }
    }
  }

  const populationItems =
    Array
      .from(
        contentMap.values(),
      )
      .map(
        (item) => {
          const matchedPatientCount =
            item.matched_patient_ids.length;

          const populationMatch =
            matchedPatientCount /
            totalPatientCount;

          const averageSimilarity =
            item.similarities.reduce(
              (
                sum: number,
                similarity: number,
              ) =>
                sum + similarity,
              0,
            ) /
            item.similarities.length;

          const maxSimilarity =
            Math.max(
              ...item.similarities,
            );

          return {
            id:
              item.id,

            product_name:
              item.product_name,

            therapeutic_area:
              item.therapeutic_area,

            indication:
              item.indication,

            clinical_topics:
              item.clinical_topics,

            title:
              item.title,

            content:
              item.content,

            source:
              item.source,

            matched_patient_ids:
              item.matched_patient_ids,

            matched_patient_count:
              matchedPatientCount,

            total_patient_count:
              totalPatientCount,

            population_match:
              populationMatch,

            average_similarity:
              averageSimilarity,

            max_similarity:
              maxSimilarity,
          };
        },
      );

  // ==================================================
  // TOP 3 — POPULATION RELEVANCE
  //
  // Prefer items connected to the most patients,
  // while requiring ~70% average semantic similarity.
  //
  // If the synthetic data does not produce three items
  // at 0.70+, we fall back to the strongest remaining
  // population items so the UI can still show a Top 5.
  // The returned object tells the frontend whether the
  // preferred threshold was met.
  // ==================================================

  const populationStrong =
    populationItems
      .filter(
        (item) =>
          item.average_similarity >=
          TOP_3_MIN_AVERAGE_SIMILARITY,
      )
      .sort(
        (a, b) => {
          if (
            b.matched_patient_count !==
            a.matched_patient_count
          ) {
            return (
              b.matched_patient_count -
              a.matched_patient_count
            );
          }

          if (
            b.average_similarity !==
            a.average_similarity
          ) {
            return (
              b.average_similarity -
              a.average_similarity
            );
          }

          return (
            b.max_similarity -
            a.max_similarity
          );
        },
      );

  const populationFallback =
    populationItems
      .filter(
        (item) =>
          item.average_similarity <
          TOP_3_MIN_AVERAGE_SIMILARITY,
      )
      .sort(
        (a, b) => {
          if (
            b.matched_patient_count !==
            a.matched_patient_count
          ) {
            return (
              b.matched_patient_count -
              a.matched_patient_count
            );
          }

          if (
            b.average_similarity !==
            a.average_similarity
          ) {
            return (
              b.average_similarity -
              a.average_similarity
            );
          }

          return (
            b.max_similarity -
            a.max_similarity
          );
        },
      );

  const top3Base =
    [
      ...populationStrong,
      ...populationFallback,
    ].slice(
      0,
      TOP_POPULATION_COUNT,
    );

  const top3 =
    top3Base.map(
      (item) => {
        const thresholdMet =
          item.average_similarity >=
          TOP_3_MIN_AVERAGE_SIMILARITY;

        return {
          ...item,

          top_5_category:
            "POPULATION" as const,

          top_5_reason:
            `Selected for broad population relevance. ` +
            `${item.product_name} matched ` +
            `${item.matched_patient_count} of ` +
            `${item.total_patient_count} analyzed patients ` +
            `(${(
              item.population_match *
              100
            ).toFixed(1)}% of patients) ` +
            `with an average semantic similarity of ` +
            `${(
              item.average_similarity *
              100
            ).toFixed(1)}%.` +
            (
              thresholdMet
                ? ""
                : ` This was the strongest available population candidate ` +
                  `even though its average similarity was below the preferred ` +
                  `${(
                    TOP_3_MIN_AVERAGE_SIMILARITY *
                    100
                  ).toFixed(0)}% threshold.`
            ),
        };
      },
    );

  const top3Ids =
    new Set(
      top3.map(
        (item) =>
          item.id,
      ),
    );

  // ==================================================
  // BOTTOM 2 — PRECISION
  //
  // These may apply to fewer patients.
  // Rank primarily by the strongest patient-level
  // similarity, then average similarity, then coverage.
  // ==================================================

  const remainingItems =
    populationItems.filter(
      (item) =>
        !top3Ids.has(
          item.id,
        ),
    );

  const precisionStrong =
    remainingItems
      .filter(
        (item) =>
          item.max_similarity >=
          TOP_2_MIN_MAX_SIMILARITY,
      )
      .sort(
        (a, b) => {
          if (
            b.max_similarity !==
            a.max_similarity
          ) {
            return (
              b.max_similarity -
              a.max_similarity
            );
          }

          if (
            b.average_similarity !==
            a.average_similarity
          ) {
            return (
              b.average_similarity -
              a.average_similarity
            );
          }

          return (
            b.matched_patient_count -
            a.matched_patient_count
          );
        },
      );

  const precisionFallback =
    remainingItems
      .filter(
        (item) =>
          item.max_similarity <
          TOP_2_MIN_MAX_SIMILARITY,
      )
      .sort(
        (a, b) => {
          if (
            b.max_similarity !==
            a.max_similarity
          ) {
            return (
              b.max_similarity -
              a.max_similarity
            );
          }

          if (
            b.average_similarity !==
            a.average_similarity
          ) {
            return (
              b.average_similarity -
              a.average_similarity
            );
          }

          return (
            b.matched_patient_count -
            a.matched_patient_count
          );
        },
      );

  const bottom2Base =
    [
      ...precisionStrong,
      ...precisionFallback,
    ].slice(
      0,
      TOP_PRECISION_COUNT,
    );

  const bottom2 =
    bottom2Base.map(
      (item) => {
        const thresholdMet =
          item.max_similarity >=
          TOP_2_MIN_MAX_SIMILARITY;

        return {
          ...item,

          top_5_category:
            "PRECISION" as const,

          top_5_reason:
            `Selected for high precision. ` +
            `${item.product_name} reached a strongest patient-level ` +
            `semantic similarity of ` +
            `${(
              item.max_similarity *
              100
            ).toFixed(1)}% and matched ` +
            `${item.matched_patient_count} of ` +
            `${item.total_patient_count} analyzed patients.` +
            (
              thresholdMet
                ? ""
                : ` This was one of the strongest remaining precision ` +
                  `candidates even though it was below the preferred ` +
                  `${(
                    TOP_2_MIN_MAX_SIMILARITY *
                    100
                  ).toFixed(0)}% threshold.`
            ),
        };
      },
    );

  return [
    ...top3,
    ...bottom2,
  ];
}

// ======================================================
// GENERATE ~60-SECOND GENERAL TOP 5 SUMMARY
//
// This is intentionally deterministic/local:
// - no extra AI/API call
// - no extra credits
// - grounded only in the actual retrieval statistics
// - no diagnosis or treatment recommendation
// ======================================================

function generateTop5Briefing(
  topContent: PharmaPopulationItem[],
  totalPatientCount: number,
): string {
  if (topContent.length === 0) {
    return (
      "No sufficiently relevant pharma knowledge-base content " +
      "was available to build the general Top 5 summary."
    );
  }

  const populationItems =
    topContent.filter(
      (item) =>
        item.top_5_category ===
        "POPULATION",
    );

  const precisionItems =
    topContent.filter(
      (item) =>
        item.top_5_category ===
        "PRECISION",
    );

  const populationText =
    populationItems.length > 0
      ? populationItems
          .map(
            (item) =>
              `${item.product_name} connected with ` +
              `${item.matched_patient_count} patients at ` +
              `${(
                item.average_similarity *
                100
              ).toFixed(1)}% average semantic similarity`,
          )
          .join("; ")
      : "no broad population items were available";

  const precisionText =
    precisionItems.length > 0
      ? precisionItems
          .map(
            (item) =>
              `${item.product_name} reached ` +
              `${(
                item.max_similarity *
                100
              ).toFixed(1)}% for its strongest patient match`,
          )
          .join("; ")
      : "no additional precision items were available";

  return (
    `This Top 5 summarizes pharma knowledge-base content surfaced across ` +
    `${totalPatientCount} successfully analyzed patients. ` +
    `The first ${populationItems.length} items emphasize broad relevance: ` +
    `${populationText}. ` +
    `The remaining ${precisionItems.length} emphasize precision, so they may ` +
    `apply to fewer patients but have especially strong individual matches: ` +
    `${precisionText}. ` +
    `Together, the list balances population coverage with high-specificity ` +
    `retrieval rather than relying on only one ranking signal. ` +
    `The percentages shown are semantic similarity scores from information ` +
    `retrieval, not measures of clinical accuracy, urgency, or treatment ` +
    `effectiveness. The results are intended to help users discover relevant ` +
    `knowledge-base information and do not recommend a medication or treatment.`
  );
}

// ======================================================
// CORS / RESPONSE HELPERS
// ======================================================

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",

  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

function json(
  body: unknown,
  init: ResponseInit = {},
) {
  return Response.json(
    body,
    {
      ...init,

      headers: {
        ...corsHeaders,
        ...(init.headers ?? {}),
      },
    },
  );
}

// ======================================================
// EDGE FUNCTION
// ======================================================

Deno.serve(
  async (
    req: Request,
  ) => {
    // ==================================================
    // CORS PREFLIGHT
    // ==================================================

    if (
      req.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        },
      );
    }

    try {
      // ==================================================
      // 1. ENVIRONMENT VARIABLES
      // ==================================================

      const openRouterKey =
        Deno.env.get(
          "OPENROUTER_API_KEY",
        );

      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL",
        );

      const serviceRoleKey =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        );

      if (
        !openRouterKey
      ) {
        throw new Error(
          "OPENROUTER_API_KEY is missing",
        );
      }

      if (
        !supabaseUrl
      ) {
        throw new Error(
          "SUPABASE_URL is missing",
        );
      }

      if (
        !serviceRoleKey
      ) {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY is missing",
        );
      }

      // ==================================================
      // 2. CREATE SUPABASE ADMIN CLIENT
      // ==================================================

      const supabaseAdmin =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              persistSession:
                false,

              autoRefreshToken:
                false,
            },
          },
        );

      // ==================================================
      // 3. READ REQUEST BODY
      // ==================================================

      const body =
        await req.json();

      // ==================================================
      // 4. SUPPORT ONE OR MULTIPLE PATIENTS
      // ==================================================

      const patients:
        Patient[] =
        Array.isArray(body)
          ? body
          : [body];

      if (
        patients.length === 0
      ) {
        return json(
          {
            success:
              false,

            error:
              "At least one patient is required",
          },
          {
            status:
              400,
          },
        );
      }

      // ==================================================
      // 5. PROCESS PATIENTS SEQUENTIALLY
      //
      // Sequential requests + 500ms spacing reduces
      // the chance of hitting OpenRouter rate limits.
      // ==================================================

      const patientResults:
        any[] =
        [];

      for (
        let i = 0;
        i < patients.length;
        i++
      ) {
        const patient =
          patients[i];

        const result =
          await processPatient(
            patient,
            openRouterKey,
            supabaseAdmin,
          );

        patientResults.push(
          result,
        );

        // Don't wait after the final patient.
        if (
          i <
          patients.length - 1
        ) {
          await sleep(
            PATIENT_REQUEST_DELAY_MS,
          );
        }
      }

      // ==================================================
      // 6. BATCH SUMMARY
      // ==================================================

      const successful =
        patientResults.filter(
          (result) =>
            result.success,
        ).length;

      const failed =
        patientResults.length -
        successful;

      // ==================================================
      // 7. BUILD GENERAL TOP 5
      // ==================================================

      const topContent =
        buildGeneralTop5(
          patientResults,
        );

      const topContentBriefing =
        generateTop5Briefing(
          topContent,
          successful,
        );

      // ==================================================
      // 8. DEBUG TOP 5
      // ==================================================

      console.log(
        "General Top 5:",
        topContent.map(
          (
            item,
            index,
          ) => ({
            rank:
              index + 1,

            product_name:
              item.product_name,

            category:
              item.top_5_category,

            matched_patient_count:
              item.matched_patient_count,

            population_match:
              item.population_match,

            average_similarity:
              item.average_similarity,

            max_similarity:
              item.max_similarity,
          }),
        ),
      );

      // ==================================================
      // 9. RETURN FINAL RESPONSE
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

        top_content:
          topContent,

        top_content_briefing:
          topContentBriefing,

        top_content_methodology: {
          population_slots:
            TOP_POPULATION_COUNT,

          precision_slots:
            TOP_PRECISION_COUNT,

          preferred_population_average_similarity:
            TOP_3_MIN_AVERAGE_SIMILARITY,

          preferred_precision_max_similarity:
            TOP_2_MIN_MAX_SIMILARITY,

          similarity_note:
            "Similarity scores measure semantic retrieval similarity, not clinical accuracy or treatment confidence.",
        },

        patients:
          patientResults,
      });
    } catch (error) {
      console.error(
        "pharma-search error:",
        error,
      );

      return json(
        {
          success:
            false,

          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
        {
          status:
            500,
        },
      );
    }
  },
);


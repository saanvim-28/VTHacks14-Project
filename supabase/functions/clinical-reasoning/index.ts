import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLINICAL_ANALYSIS_SYSTEM_PROMPT = `
You are a clinical data analysis assistant supporting healthcare
professionals reviewing synthetic patient data.

Your job is to analyze structured clinical contexts that have already
been extracted from patient records.

Identify which clinical contexts deserve the most attention.

Consider:

1. Recent changes in clinical measurements.
2. Magnitude and direction of measurement changes.
3. How many patients are affected.
4. Existing conditions.
5. Medication-related context.
6. Visit history.
7. The supplied rule-based relevance score.
8. The amount and quality of supporting evidence.
9. Whether multiple types of evidence support the same clinical context.

IMPORTANT RULES:

- Use ONLY the supplied evidence.
- Do not invent diagnoses, symptoms, medications, laboratory values,
  patients, or other clinical facts.
- Do not assume facts that are not present in the input.
- Do not treat the rule-based relevance score as the final answer.
- Population frequency does not automatically mean clinical importance.
- A context affecting one patient may deserve high priority when the
  supplied evidence contains a substantial recent clinical change.
- Preserve patient IDs exactly as provided.
- Supporting evidence must come from the supplied evidence.
- This analysis is decision support and should not claim to replace
  professional clinical judgment.

Return ONLY valid JSON.

Do not include markdown.
Do not include a code fence.
Do not include text before or after the JSON.

The JSON MUST have exactly this structure:

{
  "summary": "Short overall clinical summary",
  "insights": [
    {
      "contextId": "exact context id from the input",
      "clinicalContext": "clinical context name",
      "priority": "HIGH",
      "explanation": "Why this context deserves attention based only on supplied evidence",
      "supportingEvidence": [
        "Evidence from the supplied data"
      ],
      "affectedPatients": [
        "exact patient id"
      ],
      "confidence": 0.9
    }
  ]
}

priority MUST be one of:
"HIGH", "MEDIUM", or "LOW".

confidence MUST be a number between 0 and 1.

summary MUST be a string.

insights MUST be an array.

Return valid JSON even when there are no important contexts. In that case return:

{
  "summary": "No high-priority clinical changes were identified from the supplied data.",
  "insights": []
}
`;

Deno.serve(async (req: Request) => {
  // --------------------------------
  // Handle CORS
  // --------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // --------------------------------
    // Get OpenRouter API key
    // --------------------------------

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }

    // --------------------------------
    // Read request
    // --------------------------------

    const body = await req.json();

    const input = body.input;

    if (!input) {
      return new Response(
        JSON.stringify({
          error: "Clinical analysis input is required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // --------------------------------
    // Build prompt
    // --------------------------------

    const userPrompt = `
Analyze the following structured clinical data.

CLINICAL DATA:

${JSON.stringify(input, null, 2)}
`;

    // --------------------------------
    // Call OpenRouter
    // --------------------------------

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: "openrouter/free",

        messages: [
          {
            role: "system",
            content: CLINICAL_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],

        temperature: 0.1,

        response_format: {
          type: "json_object",
        },
      }),
    });

    // --------------------------------
    // Handle OpenRouter error
    // --------------------------------

    if (!response.ok) {
      const errorText = await response.text();

      console.error("OpenRouter error:", response.status, errorText);

      throw new Error(`OpenRouter request failed: ${response.status}`);
    }

    // --------------------------------
    // Read response
    // --------------------------------

    const openRouterData = await response.json();

    const text = openRouterData.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("OpenRouter returned an empty response.");
    }

    // --------------------------------
    // Remove markdown if model added it
    // --------------------------------

    let cleaned = text.trim();

    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }

    cleaned = cleaned.trim();

    // --------------------------------
    // Parse AI JSON
    // --------------------------------

    let analysis;

    try {
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("Invalid OpenRouter JSON:", text);

      throw new Error("OpenRouter returned invalid JSON.");
    }

    // --------------------------------
    // Return result
    // --------------------------------

    return new Response(
      JSON.stringify({
        analysis,
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("clinical-reasoning error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});

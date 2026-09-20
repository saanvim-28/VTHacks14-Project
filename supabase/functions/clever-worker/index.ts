import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

console.info("clever-worker started");

// ======================================================
// CONFIG
// ======================================================

const OPENROUTER_EMBEDDING_MODEL = "baai/bge-m3";

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

  if (embedding.length !== 1024) {
    throw new Error(`Expected a 1024-dimensional embedding, but received ${embedding.length}.`);
  }

  return embedding;
}

// ======================================================
// EDGE FUNCTION
// ======================================================

export default {
  fetch: withSupabase(
    {
      auth: ["publishable", "secret"],
    },

    async (_req, ctx) => {
      try {
        // ==================================================
        // 1. GET OPENROUTER API KEY
        // ==================================================

        const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");

        if (!openRouterKey) {
          return Response.json(
            {
              success: false,
              error: "OPENROUTER_API_KEY is missing",
            },
            {
              status: 500,
            },
          );
        }

        // ==================================================
        // 2. GET RECORDS THAT NEED EMBEDDINGS
        // ==================================================

        const { data: records, error: selectError } = await ctx.supabaseAdmin
          .from("pharma_content")
          .select("*")
          .is("embedding", null);

        if (selectError) {
          throw selectError;
        }

        if (!records || records.length === 0) {
          return Response.json({
            success: true,

            message: "All pharma records already have embeddings.",

            embedded_count: 0,
          });
        }

        console.log(`Found ${records.length} pharma records requiring embeddings.`);

        let embeddedCount = 0;

        // ==================================================
        // 3. PROCESS EACH RECORD
        //
        // Sequential processing prevents a large burst of
        // OpenRouter requests.
        // ==================================================

        for (const record of records) {
          const embeddingText = `
Product: ${record.product_name ?? ""}
Therapeutic area: ${record.therapeutic_area ?? ""}
Indication: ${record.indication ?? ""}
Clinical topics: ${
            Array.isArray(record.clinical_topics)
              ? record.clinical_topics.join(", ")
              : (record.clinical_topics ?? "")
          }
Title: ${record.title ?? ""}
Content: ${record.content ?? ""}
          `.trim();

          console.log(`Generating embedding for pharma record ${record.id}...`);

          // ==================================================
          // 4. GENERATE OPENROUTER EMBEDDING
          // ==================================================

          const embedding = await createEmbedding(embeddingText, openRouterKey);

          console.log(
            `Generated ${embedding.length}-dimensional embedding for record ${record.id}.`,
          );

          // ==================================================
          // 5. SAVE EMBEDDING
          // ==================================================

          const { error: updateError } = await ctx.supabaseAdmin
            .from("pharma_content")
            .update({
              embedding,
            })
            .eq("id", record.id);

          if (updateError) {
            throw updateError;
          }

          embeddedCount++;

          console.log(`Saved embedding for pharma record ${record.id}.`);
        }

        // ==================================================
        // 6. FINISHED
        // ==================================================

        return Response.json({
          success: true,

          message: "Pharma embeddings generated successfully.",

          embedded_count: embeddedCount,

          total_records: records.length,

          model: OPENROUTER_EMBEDDING_MODEL,

          dimensions: 1024,
        });
      } catch (error) {
        console.error("clever-worker error:", error);

        return Response.json(
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

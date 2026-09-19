import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

console.info("embed-pharma-content started");

export default {
  fetch: withSupabase(
    { auth: ["publishable", "secret"] },

    async (_req, ctx) => {
      try {
        // -----------------------------
        // 1. Get Gemini API key
        // -----------------------------
        const geminiKey = Deno.env.get("gem_stacked_up_KEY");

        if (!geminiKey) {
          return Response.json(
            { success: false, error: "gem_stacked_up_KEY is missing" },
            { status: 500 }
          );
        }

        // -----------------------------
        // 2. Get pharma records
        // that don't have embeddings
        // -----------------------------
        const { data: records, error: selectError } =
          await ctx.supabaseAdmin
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
            embedded_count: 0
          });
        }

        let embeddedCount = 0;

        // -----------------------------
        // 3. Process each pharma record
        // -----------------------------
        for (const record of records) {

          // Turn the database row into useful searchable text
          const embeddingText = `
Product: ${record.product_name}
Therapeutic area: ${record.therapeutic_area}
Indication: ${record.indication}
Clinical topics: ${
  Array.isArray(record.clinical_topics)
    ? record.clinical_topics.join(", ")
    : record.clinical_topics ?? ""
}
Title: ${record.title}
Content: ${record.content}
          `.trim();

          // -----------------------------
          // 4. Ask Gemini for embedding
          // -----------------------------
          const geminiResponse = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent",
            {
              method: "POST",

              headers: {
                "x-goog-api-key": geminiKey,
                "Content-Type": "application/json"
              },

              body: JSON.stringify({
                content: {
                  parts: [
                    {
                      text: embeddingText
                    }
                  ]
                },

                output_dimensionality: 1536
              })
            }
          );

          const geminiData = await geminiResponse.json();

          if (!geminiResponse.ok) {
            throw new Error(
              `Gemini error for ${record.product_name}: ${
                JSON.stringify(geminiData)
              }`
            );
          }

          const embedding = geminiData.embedding.values;

          // -----------------------------
          // 5. Save embedding in Supabase
          // -----------------------------
          const { error: updateError } =
            await ctx.supabaseAdmin
              .from("pharma_content")
              .update({
                embedding: embedding
              })
              .eq("id", record.id);

          if (updateError) {
            throw updateError;
          }

          embeddedCount++;
        }

        // -----------------------------
        // 6. Finished
        // -----------------------------
        return Response.json({
          success: true,
          message: "Pharma embeddings generated successfully.",
          embedded_count: embeddedCount
        });

      } catch (error) {

        console.error(error);

        return Response.json(
          {
            success: false,
            error: error instanceof Error
              ? error.message
              : String(error)
          },
          { status: 500 }
        );
      }
    }
  )
};
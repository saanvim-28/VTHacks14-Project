import { GoogleGenAI } from "@google/genai";

import type { AIClinicalAnalysisInput, AIClinicalAnalysisResult } from "./types";

import { CLINICAL_ANALYSIS_SYSTEM_PROMPT } from "./prompts";

export async function analyzeClinicalDataWithAI(
  input: AIClinicalAnalysisInput,
): Promise<AIClinicalAnalysisResult> {
  const apiKey = process.env["GEMINI_API_KEY"];

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to your environment variables.");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const responseSchema = {
    type: "object",

    properties: {
      summary: {
        type: "string",
      },

      insights: {
        type: "array",

        items: {
          type: "object",

          properties: {
            contextId: {
              type: "string",
            },

            clinicalContext: {
              type: "string",
            },

            priority: {
              type: "string",
              enum: ["HIGH", "MEDIUM", "LOW"],
            },

            explanation: {
              type: "string",
            },

            supportingEvidence: {
              type: "array",
              items: {
                type: "string",
              },
            },

            affectedPatients: {
              type: "array",
              items: {
                type: "string",
              },
            },

            confidence: {
              type: "number",
            },
          },

          required: [
            "contextId",
            "clinicalContext",
            "priority",
            "explanation",
            "supportingEvidence",
            "affectedPatients",
            "confidence",
          ],
        },
      },
    },

    required: ["summary", "insights"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",

    contents: `
Analyze the following structured clinical data.

CLINICAL DATA:

${JSON.stringify(input, null, 2)}
`,

    config: {
      systemInstruction: CLINICAL_ANALYSIS_SYSTEM_PROMPT,

      responseMimeType: "application/json",

      responseSchema,
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const result = JSON.parse(text) as AIClinicalAnalysisResult;

  return result;
}

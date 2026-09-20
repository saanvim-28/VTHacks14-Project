import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { patientQuery } from "@/data/queries";

import { isPharmaSearchConfigured, searchPharmaForPatient } from "@/data/pharma-api";

import { analyzePopulation } from "@/engine/population-analysis";
import { buildClinicalAIInput } from "@/ai/build-clinical-input";
import { analyzeClinicalDataWithAI } from "@/ai/clinical-reasoning";

import {
  DataUnavailable,
  PageSkeleton,
  PatientContext,
  RouteError,
} from "@/components/chatone/shared";

export const Route = createFileRoute("/patients/$patientId/briefing")({
  head: () => ({
    meta: [
      {
        title: "Clinical Briefing — medMatch",
      },
    ],
  }),

  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(patientQuery(params.patientId)),

  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: BriefingPage,
});

function BriefingPage() {
  const { patientId } = Route.useParams();

  const { data: patient } = useSuspenseQuery(patientQuery(patientId));

  // =====================================================
  // PHARMA SEARCH
  //
  // Makes ONE OpenRouter embedding request.
  // =====================================================

  const pharmaQuery = useQuery({
    queryKey: ["pharma-search", "patient", patient?.patient_id],

    queryFn: () => {
      if (!patient) {
        throw new Error("Patient record is unavailable.");
      }

      return searchPharmaForPatient(patient);
    },

    enabled: isPharmaSearchConfigured() && Boolean(patient),

    staleTime: 5 * 60 * 1000,
  });

  // =====================================================
  // CLINICAL REASONING
  //
  // Builds the existing rule-based clinical analysis,
  // then sends it to the clinical-reasoning Edge Function.
  //
  // Makes ONE OpenRouter chat request.
  // =====================================================

  const clinicalQuery = useQuery({
    queryKey: ["clinical-reasoning", "briefing", patient?.patient_id],

    queryFn: async () => {
      if (!patient) {
        throw new Error("Patient record is unavailable.");
      }

      const populationAnalysis = analyzePopulation([patient]);

      const aiInput = buildClinicalAIInput(populationAnalysis);

      return analyzeClinicalDataWithAI(aiInput);
    },

    enabled: Boolean(patient),

    staleTime: 5 * 60 * 1000,
  });

  // =====================================================
  // NO PATIENT
  // =====================================================

  if (!patient) {
    return (
      <main className="page-shell">
        <DataUnavailable />
      </main>
    );
  }

  const pharmaResults = pharmaQuery.data?.results ?? [];

  const clinicalInsights = clinicalQuery.data?.insights ?? [];

  const isLoading = pharmaQuery.isLoading || clinicalQuery.isLoading;

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="page-shell briefing-page">
      <Link to="/patients/$patientId" params={{ patientId }} className="back-link">
        ← Back to patient
      </Link>

      <header className="info-header">
        <div>
          <span className="eyebrow">AI clinical analysis</span>

          <h1>60-second clinical briefing</h1>

          <p>
            A concise review prepared from the imported OpenEMR record and relevant clinical
            knowledge.
          </p>
        </div>

        <PatientContext name={patient.name} id={patient.patient_id} />
      </header>

      {/* ============================================= */}
      {/* LOADING */}
      {/* ============================================= */}

      {isLoading && (
        <div className="integration-notice" role="status">
          <strong>Generating clinical briefing…</strong>

          <span>Reviewing clinical context and relevant pharma information.</span>
        </div>
      )}

      {/* ============================================= */}
      {/* CLINICAL REASONING ERROR */}
      {/* ============================================= */}

      {clinicalQuery.isError && (
        <div className="integration-notice integration-error" role="alert">
          <strong>Clinical analysis could not be generated.</strong>

          <span>{clinicalQuery.error.message}</span>
        </div>
      )}

      {/* ============================================= */}
      {/* PHARMA ERROR */}
      {/* ============================================= */}

      {pharmaQuery.isError && (
        <div className="integration-notice integration-error" role="alert">
          <strong>Pharma information could not be retrieved.</strong>

          <span>{pharmaQuery.error.message}</span>
        </div>
      )}

      {/* ============================================= */}
      {/* AI SUMMARY */}
      {/* ============================================= */}

      {clinicalQuery.data && (
        <section className="briefing-card" aria-label="AI clinical summary">
          <span className="eyebrow">Clinical summary</span>

          <h2>{patient.name}'s review snapshot</h2>

          <p>{clinicalQuery.data.summary}</p>
        </section>
      )}

      {/* ============================================= */}
      {/* AI CLINICAL INSIGHTS */}
      {/* ============================================= */}

      {clinicalInsights.length > 0 && (
        <section className="information-list" aria-label="Clinical insights">
          {clinicalInsights.map((insight, index) => (
            <article className="information-card" key={insight.contextId || index}>
              <div className="information-index">{String(index + 1).padStart(2, "0")}</div>

              <div className="information-body">
                <div className="information-card-topline">
                  <div>
                    <span className="eyebrow">{insight.priority} priority</span>

                    <h2>{insight.clinicalContext}</h2>
                  </div>

                  <span className="information-score">
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                </div>

                <p>{insight.explanation}</p>

                {insight.supportingEvidence.length > 0 && (
                  <details open={index === 0} className="information-reasons">
                    <summary>Supporting evidence</summary>

                    <ul>
                      {insight.supportingEvidence.map((evidence, evidenceIndex) => (
                        <li key={evidenceIndex}>{evidence}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* ============================================= */}
      {/* PHARMA BRIEFING */}
      {/* ============================================= */}

      {pharmaQuery.data && (
        <section className="briefing-card" aria-label="Relevant pharma briefing">
          <span className="eyebrow">Relevant pharma information</span>

          <h2>Knowledge-base briefing</h2>

          <p>{pharmaQuery.data.briefing || "No relevant pharma briefing was returned."}</p>
        </section>
      )}

      {/* ============================================= */}
      {/* PHARMA MATCHES */}
      {/* ============================================= */}

      {pharmaResults.length > 0 && (
        <section className="information-list" aria-label="Relevant pharma matches">
          {pharmaResults.map((item, index) => {
            const score =
              typeof item.similarity === "number" ? Math.round(item.similarity * 100) : null;

            return (
              <article className="information-card" key={String(item.id ?? item.title ?? index)}>
                <div className="information-index">{String(index + 1).padStart(2, "0")}</div>

                <div className="information-body">
                  <div className="information-card-topline">
                    <div>
                      <h2>{item.product_name || item.title || "Relevant clinical information"}</h2>

                      <p className="information-source">
                        {item.title || item.indication || "Pharma knowledge-base result"}
                      </p>
                    </div>

                    {score !== null && <span className="information-score">{score}% match</span>}
                  </div>

                  <details open={index === 0} className="information-reasons">
                    <summary>Why surfaced?</summary>

                    <ul>
                      <li>
                        {item.why_surfaced ||
                          `Related to ${
                            item.therapeutic_area || "the patient's clinical context"
                          }.`}
                      </li>
                    </ul>
                  </details>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ============================================= */}
      {/* NAVIGATION */}
      {/* ============================================= */}

      <div className="briefing-actions">
        <Link className="save-action" to="/patients/$patientId/information" params={{ patientId }}>
          Back to relevant information
        </Link>
      </div>
    </main>
  );
}

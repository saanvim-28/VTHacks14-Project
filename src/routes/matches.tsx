import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { patientsQuery } from "@/data/queries";
import { isPharmaSearchConfigured, searchPharmaForPatients } from "@/data/pharma-api";
import { analyzePopulation } from "@/engine/population-analysis";
import { PageSkeleton, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [{ title: "Clinical Matches — Vytra" }],
  }),

  loader: ({ context }) => context.queryClient.ensureQueryData(patientsQuery()),

  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: MatchesPage,
});

function MatchesPage() {
  // -------------------------------------------------------
  // Patient data
  // -------------------------------------------------------

  const { data: patients } = useSuspenseQuery(patientsQuery());

  // -------------------------------------------------------
  // Population analysis
  // -------------------------------------------------------

  const populationAnalysis = useMemo(() => analyzePopulation(patients), [patients]);

  // -------------------------------------------------------
  // Pharma search
  // -------------------------------------------------------

  const pharmaConfigured = isPharmaSearchConfigured();

  const matchesQuery = useQuery({
    queryKey: ["pharma-search", "all-patients", patients.map((patient) => patient.patient_id)],

    queryFn: () => searchPharmaForPatients(patients),

    enabled: pharmaConfigured && patients.length > 0,

    staleTime: 5 * 60 * 1000,
  });

  // -------------------------------------------------------
  // Top five
  // -------------------------------------------------------

  const topFive = matchesQuery.data?.top_content ?? [];

  const broadMatches = topFive.filter((match) => match.top_5_category === "POPULATION");

  const precisionMatches = topFive.filter((match) => match.top_5_category === "PRECISION");

  // -------------------------------------------------------
  // Successful patient analyses
  // -------------------------------------------------------

  const analyses = matchesQuery.data?.patients?.filter((analysis) => analysis.success) ?? [];

  const totalKnowledgeMatches = analyses.reduce(
    (total, analysis) => total + (analysis.results?.length ?? 0),
    0,
  );

  const highRelevanceContexts = populationAnalysis.contexts.filter(
    (context) => context.relevance === "HIGH",
  ).length;

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <main className="page-shell workspace-feature-page">
      {/* PAGE HEADER */}

      <header className="feature-header">
        <span className="eyebrow">Clinical knowledge workspace</span>

        <h1>Clinical matches</h1>

        <p>
          Live vector matches connecting patient context with relevant healthcare and pharmaceutical
          information.
        </p>
      </header>

      {/* --------------------------------------------------
          TOP FIVE PHARMACEUTICAL MATCHES
      -------------------------------------------------- */}

      {topFive.length > 0 && (
        <section className="top-five-section">
          <div className="top-five-header">
            <span className="eyebrow">Population intelligence</span>

            <h2>Top 5 pharma opportunities</h2>

            <p>
              Broad population matches prioritize medicines relevant across more patients.
              High-confidence matches surface especially strong individual patient matches.
            </p>
          </div>

          {/* ----------------------------------------------
              BROAD POPULATION MATCHES
          ---------------------------------------------- */}

          {broadMatches.length > 0 && (
            <div className="top-five-group">
              <div className="top-five-group-heading">
                <div>
                  <span className="top-five-label">BROAD POPULATION MATCHES</span>

                  <h3>Relevant across the most patients</h3>
                </div>

                <span className="top-five-count">
                  {broadMatches.length} {broadMatches.length === 1 ? "match" : "matches"}
                </span>
              </div>

              <div className="top-five-grid">
                {broadMatches.map((match, index) => {
                  const averageSimilarity =
                    typeof match.average_similarity === "number"
                      ? Math.round(match.average_similarity * 100)
                      : null;

                  const populationMatch =
                    typeof match.population_match === "number"
                      ? Math.round(match.population_match * 100)
                      : null;

                  return (
                    <article className="top-five-card" key={`population-${match.id ?? index}`}>
                      <div className="top-five-rank">{index + 1}</div>

                      <div className="top-five-card-content">
                        <span className="top-five-category">Broad population</span>

                        <h3>{match.product_name || match.title || "Pharma information"}</h3>

                        <p className="top-five-indication">
                          {match.indication ||
                            match.therapeutic_area ||
                            "Relevant pharmaceutical information"}
                        </p>

                        <div className="top-five-metrics">
                          <div>
                            <strong>{match.matched_patient_count ?? 0}</strong>

                            <span>matched patients</span>
                          </div>

                          {averageSimilarity !== null && (
                            <div>
                              <strong>{averageSimilarity}%</strong>

                              <span>avg. match score</span>
                            </div>
                          )}

                          {populationMatch !== null && (
                            <div>
                              <strong>{populationMatch}%</strong>

                              <span>patient coverage</span>
                            </div>
                          )}
                        </div>

                        {match.top_5_reason && (
                          <p className="top-five-reason">{match.top_5_reason}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----------------------------------------------
              PRECISION / HIGH-CONFIDENCE MATCHES
          ---------------------------------------------- */}

          {precisionMatches.length > 0 && (
            <div className="top-five-group precision-group">
              <div className="top-five-group-heading">
                <div>
                  <span className="top-five-label">HIGH-CONFIDENCE MATCHES</span>

                  <h3>Smaller population, stronger match</h3>
                </div>

                <span className="top-five-count">
                  {precisionMatches.length} {precisionMatches.length === 1 ? "match" : "matches"}
                </span>
              </div>

              <div className="top-five-grid precision-grid">
                {precisionMatches.map((match, index) => {
                  const strongestMatch =
                    typeof match.max_similarity === "number"
                      ? Math.round(match.max_similarity * 100)
                      : null;

                  return (
                    <article
                      className="top-five-card precision-card"
                      key={`precision-${match.id ?? index}`}
                    >
                      <div className="top-five-rank">{broadMatches.length + index + 1}</div>

                      <div className="top-five-card-content">
                        <span className="top-five-category">High confidence</span>

                        <h3>{match.product_name || match.title || "Pharma information"}</h3>

                        <p className="top-five-indication">
                          {match.indication ||
                            match.therapeutic_area ||
                            "Relevant pharmaceutical information"}
                        </p>

                        <div className="top-five-metrics">
                          {strongestMatch !== null && (
                            <div>
                              <strong>{strongestMatch}%</strong>

                              <span>strongest match</span>
                            </div>
                          )}

                          <div>
                            <strong>{match.matched_patient_count ?? 0}</strong>

                            <span>matched patients</span>
                          </div>
                        </div>

                        {match.top_5_reason && (
                          <p className="top-five-reason">{match.top_5_reason}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* --------------------------------------------------
          KNOWLEDGE BASE SUMMARY
      -------------------------------------------------- */}

      <section className="feature-summary">
        <strong>{totalKnowledgeMatches}</strong>

        <span>knowledge-base matches ready for review</span>

        <small>
          {pharmaConfigured
            ? "Ranked by the connected pharma search service."
            : "Configure Supabase to enable live ranking."}
        </small>
      </section>

      {/* --------------------------------------------------
          POPULATION CONTEXT
      -------------------------------------------------- */}

      <section className="context-strip" aria-label="Rule-based population context analysis">
        <div>
          <strong>{populationAnalysis.contexts.length}</strong>

          <span>clinical contexts detected across the export</span>
        </div>

        <div>
          <strong>{highRelevanceContexts}</strong>

          <span>high-relevance contexts for review</span>
        </div>

        <small>
          Population coverage and recency provide the rule-based baseline; pharma matches add
          semantic ranking.
        </small>
      </section>

      {/* --------------------------------------------------
          SUPABASE NOT CONFIGURED
      -------------------------------------------------- */}

      {!pharmaConfigured && (
        <div className="integration-notice" role="status">
          <strong>Clinical matching is ready to connect.</strong>

          <span>
            Configure the Supabase URL and publishable key to retrieve live pharma matches.
          </span>
        </div>
      )}

      {/* --------------------------------------------------
          LOADING
      -------------------------------------------------- */}

      {matchesQuery.isLoading && (
        <div className="integration-notice" role="status">
          <strong>Ranking patient matches…</strong>

          <span>Searching the connected pharma knowledge base.</span>
        </div>
      )}

      {/* --------------------------------------------------
          ERROR
      -------------------------------------------------- */}

      {matchesQuery.isError && (
        <div className="integration-notice integration-error" role="alert">
          <strong>Clinical matching could not be loaded.</strong>

          <span>
            {matchesQuery.error instanceof Error
              ? matchesQuery.error.message
              : "An unexpected error occurred while retrieving matches."}
          </span>
        </div>
      )}

      {/* --------------------------------------------------
          PATIENT-SPECIFIC MATCHES
      -------------------------------------------------- */}

      <section className="feature-list" aria-label="Patient clinical matches">
        {analyses.slice(0, 10).map((analysis, index) => {
          const patient = patients.find(
            (item) => String(item.patient_id) === String(analysis.patient_id),
          );

          const topResult = analysis.results?.[0];

          if (!patient || !topResult) {
            return null;
          }

          const score =
            typeof topResult.similarity === "number"
              ? Math.round(topResult.similarity * 100)
              : null;

          return (
            <article className="feature-row" key={patient.patient_id}>
              <span className="feature-index">{String(index + 1).padStart(2, "0")}</span>

              <div>
                <h2>{patient.name}</h2>

                <p>
                  {topResult.product_name ||
                    topResult.title ||
                    patient.conditions?.[0] ||
                    "Clinical match"}
                </p>
              </div>

              {score !== null && <span className="feature-score">{score}% match</span>}

              <Link
                className="feature-link"
                to="/patients/$patientId/information"
                params={{
                  patientId: patient.patient_id,
                }}
              >
                Review matches →
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}

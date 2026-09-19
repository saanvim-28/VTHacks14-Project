import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { patientsQuery } from "@/data/queries";
import { isPharmaSearchConfigured, searchPharmaForPatients } from "@/data/pharma-api";
import { analyzePopulation } from "@/engine/population-analysis";
import { PageSkeleton, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [{ title: "Clinical Matches — Vytra" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(patientsQuery()),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: MatchesPage,
});

function MatchesPage() {
  const { data: patients } = useSuspenseQuery(patientsQuery());
  const populationAnalysis = useMemo(() => analyzePopulation(patients), [patients]);
  const matchesQuery = useQuery({
    queryKey: ["pharma-search", "all-patients"],
    queryFn: () => searchPharmaForPatients(patients),
    enabled: isPharmaSearchConfigured(),
    staleTime: 5 * 60 * 1000,
  });
  const analyses = (matchesQuery.data?.patients ?? []).filter((analysis) => analysis.success);
  return (
    <main className="page-shell workspace-feature-page">
      <header className="feature-header">
        <span className="eyebrow">Clinical knowledge workspace</span>
        <h1>Clinical matches</h1>
        <p>
          Live vector matches connecting patient context with relevant healthcare and pharmaceutical
          information.
        </p>
      </header>
      <section className="feature-summary">
        <strong>{analyses.reduce((total, analysis) => total + analysis.results.length, 0)}</strong>
        <span>knowledge-base matches ready for review</span>
        <small>
          {isPharmaSearchConfigured()
            ? "Ranked by the connected pharma search service."
            : "Configure Supabase to enable live ranking."}
        </small>
      </section>
      <section className="context-strip" aria-label="Rule-based population context analysis">
        <div>
          <strong>{populationAnalysis.contexts.length}</strong>
          <span>clinical contexts detected across the export</span>
        </div>
        <div>
          <strong>
            {populationAnalysis.contexts.filter((context) => context.relevance === "HIGH").length}
          </strong>
          <span>high-relevance contexts for review</span>
        </div>
        <small>
          Population coverage and recency provide the rule-based baseline; pharma matches add
          semantic ranking.
        </small>
      </section>
      {!isPharmaSearchConfigured() && (
        <div className="integration-notice" role="status">
          <strong>Clinical matching is ready to connect.</strong>
          <span>
            Configure the Supabase URL and publishable key to retrieve live pharma matches.
          </span>
        </div>
      )}
      {matchesQuery.isLoading && (
        <div className="integration-notice" role="status">
          <strong>Ranking patient matches…</strong>
          <span>Searching the connected pharma knowledge base.</span>
        </div>
      )}
      {matchesQuery.isError && (
        <div className="integration-notice integration-error" role="alert">
          <strong>Clinical matching could not be loaded.</strong>
          <span>{matchesQuery.error.message}</span>
        </div>
      )}
      <section className="feature-list" aria-label="Patient clinical matches">
        {analyses.slice(0, 10).map((analysis, index) => {
          const patient = patients.find(
            (item) => String(item.patient_id) === String(analysis.patient_id),
          );
          const topResult = analysis.results[0];
          if (!patient || !topResult) return null;
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
                    patient.conditions[0] ||
                    "Clinical match"}
                </p>
              </div>
              {score !== null && <span className="feature-score">{score}% match</span>}
              <Link
                className="feature-link"
                to="/patients/$patientId/information"
                params={{ patientId: patient.patient_id }}
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

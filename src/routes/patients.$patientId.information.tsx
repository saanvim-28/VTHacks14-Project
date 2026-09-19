import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { isPharmaSearchConfigured, searchPharmaForPatient } from "@/data/pharma-api";
import { patientQuery } from "@/data/queries";
import {
  DataUnavailable,
  PageSkeleton,
  PatientContext,
  RouteError,
} from "@/components/chatone/shared";

export const Route = createFileRoute("/patients/$patientId/information")({
  head: ({ params }) => ({
    meta: [{ title: `Clinical Information for Patient ${params.patientId} — Vytra` }],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(patientQuery(params.patientId)),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: InformationPage,
});

function InformationPage() {
  const { patientId } = Route.useParams();
  const { data: patient } = useSuspenseQuery(patientQuery(patientId));
  const [saved, setSaved] = useState<number[]>([]);
  const matchesQuery = useQuery({
    queryKey: ["pharma-search", "patient", patient?.patient_id],
    queryFn: () => {
      if (!patient) throw new Error("Patient record is unavailable.");
      return searchPharmaForPatient(patient);
    },
    enabled: isPharmaSearchConfigured() && Boolean(patient),
    staleTime: 5 * 60 * 1000,
  });
  if (!patient)
    return (
      <main className="page-shell">
        <DataUnavailable />
      </main>
    );
  const results = matchesQuery.data?.results ?? [];
  return (
    <main className="page-shell info-page">
      <Link to="/patients/$patientId" params={{ patientId }} className="back-link">
        ← Back to patient
      </Link>
      <header className="info-header">
        <div>
          <span className="eyebrow">Clinical knowledge match</span>
          <h1>Top 5 relevant information</h1>
          <p>
            Ranked against {patient.name}'s conditions, medications, and available clinical context.
          </p>
        </div>
        <PatientContext name={patient.name} id={patient.patient_id} />
      </header>
      {!isPharmaSearchConfigured() && (
        <div className="integration-notice" role="status">
          <strong>Clinical matching is ready to connect.</strong>
          <span>
            Configure the Supabase URL and publishable key to retrieve live pharma matches.
          </span>
        </div>
      )}
      {matchesQuery.isError && (
        <div className="integration-notice integration-error" role="alert">
          <strong>Clinical matching could not be loaded.</strong>
          <span>{matchesQuery.error.message}</span>
        </div>
      )}
      {matchesQuery.isLoading && (
        <div className="integration-notice" role="status">
          <strong>Finding relevant information…</strong>
          <span>Searching the connected pharma knowledge base.</span>
        </div>
      )}
      <section className="information-list" aria-label="Relevant clinical information">
        {results.map((item, index) => {
          const isSaved = saved.includes(index);
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
                      {item.title || item.indication || "Pharma knowledge base result"}
                    </p>
                  </div>
                  {score !== null && <span className="information-score">{score}% match</span>}
                </div>
                <details open={index === 0} className="information-reasons">
                  <summary>Why surfaced?</summary>
                  <ul>
                    <li>
                      {item.why_surfaced ||
                        `Related to ${item.therapeutic_area || "the patient's clinical context"}.`}
                    </li>
                  </ul>
                </details>
                <div className="information-actions">
                  <Link
                    className="briefing-action"
                    to="/patients/$patientId/briefing"
                    params={{ patientId }}
                  >
                    60-second briefing <span aria-hidden="true">→</span>
                  </Link>
                  <button
                    className="save-action"
                    type="button"
                    aria-pressed={isSaved}
                    onClick={() =>
                      setSaved((current) =>
                        isSaved ? current.filter((value) => value !== index) : [...current, index],
                      )
                    }
                  >
                    {isSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      {matchesQuery.data && results.length === 0 && (
        <div className="integration-notice" role="status">
          <strong>No high-confidence matches were returned.</strong>
          <span>Try again after the pharma knowledge base has been indexed.</span>
        </div>
      )}

      <div className="briefing-actions"></div>
    </main>
  );
}

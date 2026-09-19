import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { patientQuery } from "@/data/queries";
import { isPharmaSearchConfigured, searchPharmaForPatient } from "@/data/pharma-api";
import {
  DataUnavailable,
  PageSkeleton,
  PatientContext,
  RouteError,
} from "@/components/chatone/shared";

export const Route = createFileRoute("/patients/$patientId/briefing")({
  head: () => ({ meta: [{ title: "Clinical Briefing — Vytra" }] }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(patientQuery(params.patientId)),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: BriefingPage,
});

function BriefingPage() {
  const { patientId } = Route.useParams();
  const { data: patient } = useSuspenseQuery(patientQuery(patientId));
  const [playing, setPlaying] = useState(false);
  const analysisQuery = useQuery({
    queryKey: ["pharma-search", "briefing", patient?.patient_id],
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
  return (
    <main className="page-shell briefing-page">
      <Link to="/patients/$patientId" params={{ patientId }} className="back-link">
        ← Back to patient
      </Link>
      <header className="info-header">
        <div>
          <span className="eyebrow">Clinical knowledge match</span>
          <h1>60-second clinical briefing</h1>
          <p>A concise review prepared from the imported OpenEMR record.</p>
        </div>
        <PatientContext name={patient.name} id={patient.patient_id} />
      </header>
      <section className="briefing-card" aria-label="60-second clinical briefing">
        <span className="eyebrow">
          {isPharmaSearchConfigured() ? "Connected pharma search" : "Connection required"}
        </span>
        <h2>{patient.name}'s review snapshot</h2>
        <p>
          {analysisQuery.data?.briefing ||
            (isPharmaSearchConfigured()
              ? analysisQuery.error?.message ||
                "Preparing a briefing from the connected pharma knowledge base…"
              : "Configure the Supabase connection to generate a briefing from live pharma knowledge-base matches.")}
        </p>
        <div className="briefing-progress" aria-hidden="true">
          <span />
        </div>
        <div className="briefing-actions">
          <button
            className="briefing-action"
            type="button"
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? "Pause briefing" : "Play 60-second briefing"}{" "}
            <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
          </button>
          <Link
            className="save-action"
            to="/patients/$patientId/information"
            params={{ patientId }}
          >
            Back to relevant information
          </Link>
        </div>
      </section>
    </main>
  );
}

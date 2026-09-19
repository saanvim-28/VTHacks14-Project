import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { patientQuery } from "@/data/queries";
import {
  DataUnavailable,
  PageSkeleton,
  PatientContext,
  RouteError,
} from "@/components/chatone/shared";

export const Route = createFileRoute("/patients/$patientId/briefing")({
  head: () => ({ meta: [{ title: "Clinical Briefing — ChatOne" }] }),
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
        <span className="eyebrow">Illustrative demo</span>
        <h2>{patient.name}'s review snapshot</h2>
        <p>
          The imported record includes {patient.conditions.join(", ") || "no recorded conditions"}{" "}
          and {patient.medications.join(", ") || "no recorded medications"}. Review the latest
          observations, confirm the medication list, and document any change before the next
          care-team handoff.
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

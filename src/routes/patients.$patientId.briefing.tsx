import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Headphones } from "lucide-react";
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
        <h1>Clinical briefing</h1>
        <PatientContext name={patient.name} id={patient.patient_id} />
      </header>
      <div className="empty-state">
        <Headphones className="size-9 text-muted-foreground" />
        <h2>No briefing available</h2>
        <p>This OpenEMR export does not include briefing transcripts or audio recordings.</p>
      </div>
    </main>
  );
}

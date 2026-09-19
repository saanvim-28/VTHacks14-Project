import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FileSearch } from "lucide-react";
import { patientQuery } from "@/data/queries";
import {
  DataUnavailable,
  PageSkeleton,
  PatientContext,
  RouteError,
} from "@/components/chatone/shared";

export const Route = createFileRoute("/patients/$patientId/information")({
  head: ({ params }) => ({
    meta: [{ title: `Clinical Information for Patient ${params.patientId} — ChatOne` }],
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
  if (!patient)
    return (
      <main className="page-shell">
        <DataUnavailable />
      </main>
    );
  return (
    <main className="page-shell info-page">
      <Link to="/patients/$patientId" params={{ patientId }} className="back-link">
        ← Back to patient
      </Link>
      <header className="info-header">
        <h1>Clinical information</h1>
        <PatientContext name={patient.name} id={patient.patient_id} />
      </header>
      <div className="empty-state">
        <FileSearch className="size-9 text-muted-foreground" />
        <h2>Clinical matches unavailable</h2>
        <p>
          The OpenEMR export contains patient records, but does not include clinical matches,
          relevance scores, or recommendations.
        </p>
      </div>
    </main>
  );
}

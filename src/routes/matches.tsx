import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { patientsQuery } from "@/data/queries";
import { PageSkeleton, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [{ title: "Clinical Matches — ChatOne" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(patientsQuery()),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: MatchesPage,
});

function MatchesPage() {
  const { data: patients } = useSuspenseQuery(patientsQuery());
  return (
    <main className="page-shell workspace-feature-page">
      <header className="feature-header">
        <span className="eyebrow">Clinical knowledge workspace</span>
        <h1>Clinical matches</h1>
        <p>
          Demo matching signals that connect patient context with relevant healthcare and
          pharmaceutical information.
        </p>
      </header>
      <section className="feature-summary">
        <strong>{patients.length * 5}</strong>
        <span>illustrative matches ready for review</span>
        <small>AI ranking will be connected here later.</small>
      </section>
      <section className="feature-list" aria-label="Patient clinical matches">
        {patients.slice(0, 6).map((patient, index) => (
          <article className="feature-row" key={patient.patient_id}>
            <span className="feature-index">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{patient.name}</h2>
              <p>
                {patient.conditions[0] ?? "Clinical context review"} ·{" "}
                {patient.medications[0] ?? "Medication review"}
              </p>
            </div>
            <span className="feature-score">{96 - index * 3}% match</span>
            <Link
              className="feature-link"
              to="/patients/$patientId/information"
              params={{ patientId: patient.patient_id }}
            >
              Review matches →
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

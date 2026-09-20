import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { patientsQuery } from "@/data/queries";
import { PageSkeleton, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/briefings")({
  head: () => ({ meta: [{ title: "Briefings — medMatch" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(patientsQuery()),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: BriefingsPage,
});

function BriefingsPage() {
  const { data: patients } = useSuspenseQuery(patientsQuery());
  return (
    <main className="page-shell workspace-feature-page">
      <header className="feature-header">
        <span className="eyebrow">Care-team preparation</span>
        <h1>Briefings</h1>
        <p>Short, structured patient summaries for handoffs, rounds, and medication review.</p>
      </header>
      <section className="feature-list" aria-label="Patient briefings">
        {patients.map((patient, index) => (
          <article className="feature-row" key={patient.patient_id}>
            <span className="feature-index">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{patient.name}</h2>
              <p>{patient.conditions[0] ?? "No condition recorded"}</p>
            </div>
            <Link
              className="feature-link"
              to="/patients/$patientId/briefing"
              params={{ patientId: patient.patient_id }}
            >
              Open briefing →
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

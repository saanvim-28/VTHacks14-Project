import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, X } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const visiblePatients = patients.filter((patient) =>
    [patient.name, patient.patient_id, patient.dob, ...patient.conditions, ...patient.medications]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch),
  );
  return (
    <main className="page-shell workspace-feature-page briefings-page">
      <header className="feature-header">
        <span className="eyebrow">Care-team preparation</span>
        <h1>Briefings</h1>
        <p>Short, structured patient summaries for handoffs, rounds, and medication review.</p>
        <div className="briefings-search queue-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search briefings"
            placeholder="Search name, DOB, condition, medication…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button type="button" aria-label="Clear briefing search" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>
      </header>
      <section className="feature-list" aria-label="Patient briefings">
        {visiblePatients.map((patient, index) => (
          <article className="feature-row" key={patient.patient_id}>
            <span className="feature-index">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{patient.name}</h2>
              <p className="briefing-patient-dob">
                {patient.dob ? `DOB ${patient.dob}` : "Birth date not recorded"}
              </p>
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
        {visiblePatients.length === 0 && (
          <div className="queue-no-results">
            <Search size={24} />
            <h2>No matching briefings</h2>
            <p>Try another name, condition, or medication.</p>
          </div>
        )}
      </section>
    </main>
  );
}

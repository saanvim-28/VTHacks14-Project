import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, RefreshCw } from "lucide-react";
import { ClinicalSignalArtwork } from "@/components/chatone/clinical-artwork";
import { Button } from "@/components/ui/button";
import { patientsQuery } from "@/data/queries";
import type { Patient, Priority } from "@/data/mock-api";
import { useChatOne } from "@/components/chatone/app-context";
import { EmptyState, PageSkeleton, RelativeTime, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Priority Queue — ChatOne" },
      {
        name: "description",
        content: "Review meaningful patient changes prioritized by clinical intelligence.",
      },
      { property: "og:title", content: "AI Priority Queue — ChatOne" },
      {
        property: "og:description",
        content: "Review meaningful patient changes prioritized by clinical intelligence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(patientsQuery()),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(patientsQuery());
  const { simulatedPatientId, simulateNewData } = useChatOne();
  const score: Record<Priority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const queue = data
    .map((patient) =>
      simulatedPatientId === patient.patient_id
        ? {
            ...patient,
            priority: "HIGH" as const,
            priority_reason: "New critical potassium result differs from baseline.",
          }
        : patient,
    )
    .sort((a, b) => score[b.priority] - score[a.priority]);
  if (queue.length === 0)
    return (
      <main className="page-shell">
        <EmptyState
          title="No patients need review right now"
          body="ChatOne will surface patients here when meaningful changes are detected."
        />
      </main>
    );
  return (
    <main className="page-shell dashboard-page">
      <div className="dashboard-topline">
        <span>Workspace / Clinical overview</span>
        <span className="care-team">
          Care team <span>CT</span>
        </span>
      </div>
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">
            <Activity />
            Clinical overview
          </div>
          <h1>AI Priority Queue</h1>
          <p aria-live="polite">
            {simulatedPatientId
              ? "New data received — queue reprioritized just now."
              : `${queue.length} patients changed since your last review.`}
          </p>
        </div>
        <Button variant="outline" onClick={simulateNewData} className="simulate-button">
          <RefreshCw className={simulatedPatientId ? "animate-spin-once" : ""} />
          {simulatedPatientId ? "Reset demo" : "Simulate new data"}
        </Button>
      </div>
      <section className="instrument-overview" aria-label="Patient review summary">
        <ClinicalSignalArtwork />
        <div className="instrument-summary">
          <span className="eyebrow">Review overview</span>
          <div className="stats">
            <div>
              <strong>{String(queue.length).padStart(2, "0")}</strong>
              <small>Patients to review</small>
            </div>
            <div>
              <strong>
                {String(queue.filter((patient) => patient.priority === "HIGH").length).padStart(
                  2,
                  "0",
                )}
              </strong>
              <small>High priority</small>
            </div>
          </div>
          <a className="hero-link" href="#patient-queue">
            View patient queue
            <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
      <section className="clinical-queue" id="patient-queue" aria-labelledby="queue-title">
        <header className="queue-header">
          <div>
            <div className="queue-eyebrow">
              <Activity size={18} aria-hidden="true" />
              CLINICAL INTELLIGENCE <span className="queue-version">/ 01</span>
            </div>
            <h2 id="queue-title">
              Patient priority queue
              <span className="queue-total">{String(queue.length).padStart(2, "0")}</span>
            </h2>
          </div>
          <div className="queue-header-right">
            <span className="sync-label">
              <span aria-hidden="true" />
              Monitoring active
            </span>
            <span className="sort-label">Highest priority first ↓</span>
          </div>
        </header>
        <div className="queue-columns" aria-hidden="true">
          <span>PATIENT / IDENTIFIER</span>
          <span>CLINICAL SIGNAL</span>
          <span>REVIEW STATUS</span>
        </div>
        <div className="clinical-rows">
          {queue.map((patient, index) => (
            <PatientCard
              key={patient.patient_id}
              patient={patient}
              index={index}
              moved={simulatedPatientId === patient.patient_id}
            />
          ))}
        </div>
        <footer className="queue-footer">
          <span>
            <Activity size={15} aria-hidden="true" />
            {queue.length} patient records in view
          </span>
          <span>
            Last sync: just now <span className="footer-divider">/</span> Demo data
          </span>
        </footer>
      </section>
    </main>
  );
}

function PatientCard({
  patient,
  index,
  moved,
}: {
  patient: Patient;
  index: number;
  moved: boolean;
}) {
  const initials = patient.name
    .split(" ")
    .map((part) => part[0])
    .join("");
  const priority = patient.priority.slice(0, 1) + patient.priority.slice(1).toLowerCase();
  return (
    <article className={`clinical-row ${moved ? "queue-moved" : ""}`}>
      <div className="patient-identity">
        <span className="queue-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="patient-monogram" aria-hidden="true">
          {initials}
        </span>
        <div>
          <h3>{patient.name}</h3>
          <div className="clinical-meta">
            <span className="patient-code">PT-{patient.patient_id}</span>
            <span>
              {patient.age} yrs · {patient.sex}
            </span>
          </div>
        </div>
      </div>
      <div className="clinical-change">
        <span className="change-kicker">DETECTED CHANGE</span>
        <h4>{moved ? "New critical data" : "Recent observations"}</h4>
        <p>{patient.priority_reason}</p>
      </div>
      <div className="clinical-action">
        <span className="neutral-priority">{priority} priority</span>
        <Link
          className="review-sample"
          to="/patients/$patientId"
          params={{ patientId: patient.patient_id }}
          aria-label={`Review patient ${patient.name}`}
        >
          Review patient
          <ArrowUpRight size={16} />
        </Link>
        {moved ? (
          <span className="relative-time">Just now</span>
        ) : (
          <RelativeTime kind={index === 0 ? "recent" : index === 1 ? "medium" : "older"} />
        )}
      </div>
    </article>
  );
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  LayoutGrid,
  ArrowUpRight,
  Database,
  Search,
  Users,
  Stethoscope,
  Pill,
  X,
} from "lucide-react";
import { patientsQuery } from "@/data/queries";
import { isPharmaSearchConfigured, searchPharmaForPatients } from "@/data/pharma-api";
import type { OpenEMRPatient } from "@/types/openemr";
import { EmptyState, PageSkeleton, RouteError } from "@/components/chatone/shared";
import { KokoroTest } from "@/components/KokoroTest";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Patient Records — Vytra" },
      {
        name: "description",
        content: "Review patient records from the OpenEMR export.",
      },
      { property: "og:title", content: "Patient Records — Vytra" },
      {
        property: "og:description",
        content: "Review patient records from the OpenEMR export.",
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
  const { data: queue } = useSuspenseQuery(patientsQuery());
  const [search, setSearch] = useState("");
  const [rankByMatch, setRankByMatch] = useState(false);
  const [rankRequested, setRankRequested] = useState(false);
  const matchQuery = useQuery({
    queryKey: ["pharma-search", "queue"],
    queryFn: () => searchPharmaForPatients(queue),
    enabled: rankRequested && isPharmaSearchConfigured(),
    staleTime: 5 * 60 * 1000,
  });
  const normalizedSearch = search.trim().toLowerCase();
  const filteredPatients = queue.filter((patient) =>
    [patient.name, patient.patient_id, patient.dob, ...patient.conditions, ...patient.medications]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch),
  );
  const scores = new Map(
    (matchQuery.data?.patients ?? []).map((analysis) => [
      String(analysis.patient_id),
      analysis.results[0]?.similarity ?? 0,
    ]),
  );
  const visiblePatients = rankByMatch
    ? [...filteredPatients].sort(
        (a, b) => (scores.get(String(b.patient_id)) ?? 0) - (scores.get(String(a.patient_id)) ?? 0),
      )
    : filteredPatients;
  if (queue.length === 0)
    return (
      <main className="page-shell">
        <EmptyState
          title="No patient records available"
          body="The OpenEMR export does not contain any patient records."
        />
      </main>
    );
  return (
    <main className="page-shell dashboard-page">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">
            <LayoutGrid />
            Clinical overview
          </div>
          <h1>Patient records</h1>
          <p>{queue.length} patient records from OpenEMR.</p>
        </div>
        <span className="export-source">
          <Database size={16} aria-hidden="true" /> OpenEMR export
        </span>
      </div>
      <section className="queue-summary" aria-label="Patient record overview">
        {[
          {
            label: "Patient records",
            value: queue.length,
            icon: Users,
            note: "Unique patients available for review",
          },
          {
            label: "Recorded conditions",
            value: queue.reduce((total, patient) => total + patient.conditions.length, 0),
            icon: Stethoscope,
            note: "Condition entries across the OpenEMR export",
          },
          {
            label: "Listed medications",
            value: queue.reduce((total, patient) => total + patient.medications.length, 0),
            icon: Pill,
            note: "Medication entries across the OpenEMR export",
          },
        ].map((item) => (
          <article className="summary-card" key={item.label}>
            <div>
              <span>{item.label}</span>
              <strong>{String(item.value).padStart(2, "0")}</strong>
              <small>{item.note}</small>
            </div>
            <span className="summary-icon">
              <item.icon size={20} />
            </span>
          </article>
        ))}
      </section>
      <section className="clinical-queue" id="patient-queue" aria-labelledby="queue-title">
        <header className="queue-header">
          <div>
            <h2 id="queue-title">
              Patient queue
              <span className="queue-total">{String(queue.length).padStart(2, "0")}</span>
            </h2>
          </div>
          <div className="queue-search">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search patients"
              placeholder="Search name, DOB, condition, medication…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>
          {isPharmaSearchConfigured() && (
            <button
              type="button"
              className="ai-rank-button"
              aria-pressed={rankByMatch}
              onClick={() => {
                setRankRequested(true);
                setRankByMatch((value) => !value);
              }}
            >
              {matchQuery.isFetching
                ? "Ranking…"
                : rankByMatch
                  ? "AI ranked"
                  : "Rank by clinical match"}
            </button>
          )}
        </header>
        <div className="queue-columns" aria-hidden="true">
          <span>PATIENT / IDENTIFIER</span>
          <span>CONDITIONS / MEDICATIONS</span>
          <span>PATIENT RECORD</span>
        </div>
        <div className="clinical-rows">
          {visiblePatients.map((patient, index) => (
            <PatientCard key={patient.patient_id} patient={patient} index={index} />
          ))}
          {visiblePatients.length === 0 && (
            <div className="queue-no-results">
              <Search size={24} />
              <h3>No matching patients</h3>
              <p>Try another name, condition, or medication.</p>
              <button onClick={() => setSearch("")}>Clear search</button>
            </div>
          )}
        </div>
        <footer className="queue-footer">
          <span>
            <LayoutGrid size={15} aria-hidden="true" />
            {visiblePatients.length} of {queue.length} records
          </span>
          <span>Source order · priority not supplied</span>
        </footer>
      </section>
    </main>
  );
}

function PatientCard({ patient, index }: { patient: OpenEMRPatient; index: number }) {
  const initials = patient.name
    .split(" ")
    .map((part) => part[0])
    .join("");
  return (
    <article className="clinical-row">
      <div className="patient-identity">
        <span className="queue-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="patient-monogram" aria-hidden="true">
          {initials}
        </span>
        <div>
          <h3>{patient.name}</h3>
          <div className="clinical-meta">
            <span className="patient-code">PT-{patient.patient_id}</span>
            <span>{patient.sex ?? "Sex not recorded"}</span>
          </div>
          <p className="patient-dob">
            {patient.dob ? `DOB ${patient.dob}` : "Birth date not recorded"}
          </p>
        </div>
      </div>
      <div className="clinical-change">
        <span className="change-kicker">CONDITIONS / MEDICATIONS</span>
        <h4>{patient.conditions.join(" · ") || "No conditions recorded"}</h4>
        <p>{patient.medications.join(" · ") || "No medications recorded"}</p>
      </div>
      <div className="clinical-action">
        <span className="record-status">Exported record</span>
        <Link
          className="review-sample"
          to="/patients/$patientId"
          params={{ patientId: patient.patient_id }}
          aria-label={`Review patient ${patient.name}`}
        >
          Review patient
          <ArrowUpRight size={16} />
        </Link>
        <KokoroTest />
      </div>
    </article>
  );
}

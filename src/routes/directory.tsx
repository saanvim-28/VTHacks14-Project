import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { patientsQuery } from "@/data/queries";
import { PageSkeleton, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/directory")({
  head: () => ({ meta: [{ title: "Patient Directory — medMatch" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(patientsQuery()),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: DirectoryPage,
});

function DirectoryPage() {
  const { data: patients } = useSuspenseQuery(patientsQuery());
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const visible = patients.filter((patient) =>
    [patient.name, patient.patient_id, patient.dob, ...patient.conditions, ...patient.medications]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
  return (
    <main className="page-shell directory-page">
      <header className="directory-header">
        <div>
          <span className="mono-eyebrow">Patient records</span>
          <h1>Patient directory</h1>
          <p>
            Search the imported OpenEMR records by name, identifier, DOB, condition, or medication.
          </p>
        </div>
        <label className="directory-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search patient directory"
            placeholder="Search name, DOB, condition, medication…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </header>
      <div className="directory-list">
        {visible.map((patient, index) => (
          <article className="directory-row" key={patient.patient_id}>
            <span className="directory-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="priority-avatar">
              {patient.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <div className="directory-patient-info">
              <h2>{patient.name}</h2>
              <p className="directory-dob">Date of birth · {patient.dob ?? "Not recorded"}</p>
              <div className="directory-detail-line">
                <span className="directory-detail-label">Conditions</span>
                <span>{patient.conditions.join(" · ") || "No conditions recorded"}</span>
              </div>
              <div className="directory-detail-line">
                <span className="directory-detail-label">Medications</span>
                <span>{patient.medications.join(" · ") || "No medications recorded"}</span>
              </div>
            </div>
            <Link
              className="directory-review"
              to="/patients/$patientId"
              params={{ patientId: patient.patient_id }}
            >
              Review patient →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}

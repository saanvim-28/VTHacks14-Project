import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  Database,
  Hash,
  Pill,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { PatientWorkspace } from "@/components/chatone/patient-workspace";
import { patientQuery } from "@/data/queries";
import { DataUnavailable, PageSkeleton, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/patients/$patientId/")({
  head: ({ params }) => ({
    meta: [
      { title: `Patient ${params.patientId} — Vytra` },
      { name: "description", content: "Demographics, conditions, and medications from OpenEMR." },
    ],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(patientQuery(params.patientId)),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = Route.useParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const { data: patient } = useSuspenseQuery(patientQuery(patientId));
  if (!patient)
    return (
      <main className="page-shell">
        <DataUnavailable />
      </main>
    );
  return (
    <main className="page-shell detail-page complete-patient-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Patient queue
      </Link>
      <header className="patient-header record-hero">
        <div className="patient-hero-main">
          <div className="patient-hero-avatar" aria-hidden="true">
            {patient.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <div className="patient-heading-label">
              <span>PATIENT OVERVIEW</span>
              <span className="record-status">
                <Database size={11} />
                OpenEMR record
              </span>
            </div>
            <h1>{patient.name}</h1>
            <div className="patient-metadata">
              <span>
                <Hash size={13} />
                {patient.patient_id}
              </span>
              <span>
                <CalendarDays size={13} />
                DOB {patient.dob ?? "Not recorded"}
              </span>
              <span>
                <UserRound size={13} />
                {patient.sex ?? "Not recorded"}
              </span>
            </div>
          </div>
        </div>
        <div className="patient-hero-actions">
          <Link
            className="secondary-action"
            to="/patients/$patientId/information"
            params={{ patientId }}
          >
            Find relevant information
          </Link>
          <a className="primary-action" href="#clinical-observations">
            Review observations
            <ArrowDown size={14} />
          </a>
          <button
            className="secondary-action"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(patient.patient_id);
                setCopiedId(patient.patient_id);
                setCopyError(false);
              } catch {
                setCopyError(true);
              }
            }}
          >
            {copiedId === patient.patient_id ? <Check size={14} /> : <Copy size={14} />}
            {copiedId === patient.patient_id ? "ID copied" : "Copy patient ID"}
          </button>
          <span className="copy-status" role="status">
            {copyError ? "Could not copy. Patient ID: " + patient.patient_id : ""}
          </span>
        </div>
      </header>
      <div className="detail-grid source-record-grid">
        <section className="clinical-section">
          <div className="section-title">
            <Stethoscope />
            <h2>Conditions</h2>
            <span className="source-tag">OpenEMR · {patient.conditions.length}</span>
          </div>
          {patient.conditions.length ? (
            <div className="source-record-list">
              {patient.conditions.map((condition, index) => (
                <div key={`${index}-${condition}`}>
                  <span className="source-record-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{condition}</strong>
                    <small>Recorded condition · source export</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="record-unavailable">No conditions recorded in this export.</p>
          )}
        </section>
        <section className="clinical-section">
          <div className="section-title">
            <Pill />
            <h2>Medications</h2>
            <span className="source-tag">OpenEMR · {patient.medications.length}</span>
          </div>
          {patient.medications.length ? (
            <div className="source-record-list">
              {patient.medications.map((medication, index) => (
                <div key={`${index}-${medication}`}>
                  <span className="source-record-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{medication}</strong>
                    <small>Recorded medication · source export</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="record-unavailable">No medications recorded in this export.</p>
          )}
        </section>
      </div>
      <PatientWorkspace key={patient.patient_id} patientId={patient.patient_id} />
    </main>
  );
}

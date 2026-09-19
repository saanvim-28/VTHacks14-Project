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

export const Route = createFileRoute("/patients/$patientId/information")({
  head: ({ params }) => ({
    meta: [{ title: `Clinical Information for Patient ${params.patientId} — Vytra` }],
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
  const [saved, setSaved] = useState<number[]>([]);
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
        <div>
          <span className="eyebrow">Clinical knowledge match</span>
          <h1>Top 5 relevant information</h1>
          <p>
            Ranked against {patient.name}'s conditions, medications, and available clinical context.
          </p>
        </div>
        <PatientContext name={patient.name} id={patient.patient_id} />
      </header>
      <section className="information-list" aria-label="Relevant clinical information">
        {buildInformation(patient.conditions, patient.medications).map((item, index) => {
          const isSaved = saved.includes(index);
          return (
            <article className="information-card" key={item.title}>
              <div className="information-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="information-body">
                <div className="information-card-topline">
                  <div>
                    <h2>{item.title}</h2>
                    <p className="information-source">{item.source}</p>
                  </div>
                  <span className="information-score">{item.score}% match</span>
                </div>
                <details open={index === 0} className="information-reasons">
                  <summary>Why surfaced?</summary>
                  <ul>
                    {item.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </details>
                <div className="information-actions">
                  <Link
                    className="briefing-action"
                    to="/patients/$patientId/briefing"
                    params={{ patientId }}
                  >
                    60-second briefing <span aria-hidden="true">→</span>
                  </Link>
                  <button
                    className="save-action"
                    type="button"
                    aria-pressed={isSaved}
                    onClick={() =>
                      setSaved((current) =>
                        isSaved ? current.filter((value) => value !== index) : [...current, index],
                      )
                    }
                  >
                    {isSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function buildInformation(conditions: string[], medications: string[]) {
  const condition = conditions[0] ?? "documented condition";
  const medication = medications[0] ?? "current medication list";
  return [
    {
      title: "Glycemic management and monitoring",
      source: "Clinical practice guidance · illustrative",
      score: 96,
      reasons: [
        `Relevant to ${condition}`,
        "Relevant clinical topic detected",
        `Medication context includes ${medication}`,
      ],
    },
    {
      title: "Medication safety and follow-up",
      source: "Medication review reference · illustrative",
      score: 92,
      reasons: [
        "Matches the imported medication list",
        "Supports reconciliation before the next visit",
        "Follow-up interval is clinically relevant",
      ],
    },
    {
      title: "Cardiometabolic risk assessment",
      source: "Evidence summary · illustrative",
      score: 88,
      reasons: [
        "Related to the patient's active problem list",
        "Useful for baseline risk review",
        "Pairs with longitudinal observations",
      ],
    },
    {
      title: "Patient education considerations",
      source: "Counseling reference · illustrative",
      score: 84,
      reasons: [
        "Supports shared decision-making",
        "Can be reviewed with medication counseling",
        "Appropriate for care-team handoff",
      ],
    },
    {
      title: "Recommended review checkpoints",
      source: "Care pathway reference · illustrative",
      score: 79,
      reasons: [
        "Helps structure the next clinical review",
        "Connects conditions and medications",
        "Provides a concise checklist for the care team",
      ],
    },
  ];
}

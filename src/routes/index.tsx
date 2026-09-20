import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Pill, Stethoscope, Users } from "lucide-react";
import { patientsQuery } from "@/data/queries";
import { EmptyState, PageSkeleton, RouteError } from "@/components/chatone/shared";
import { generateSpeech } from "@/lib/tts";
import { playAudioBlob } from "@/lib/tts-player";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Overview — medMatch" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(patientsQuery()),
  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: Overview,
});

function Overview() {
  const { data: patients } = useSuspenseQuery(patientsQuery());
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  if (!patients.length)
    return (
      <main className="page-shell">
        <EmptyState
          title="No patient records available"
          body="The OpenEMR export does not contain any patient records."
        />
      </main>
    );
  const conditionCount = patients.reduce((total, patient) => total + patient.conditions.length, 0);
  const medicationCount = patients.reduce(
    (total, patient) => total + patient.medications.length,
    0,
  );
  const interactionCount = patients.reduce(
    (total, patient) => total + patient.visit_history.length,
    0,
  );
  const summary = `Overall patient panel synchronization complete. ${patients.length} patient files imported from OpenEMR with ${interactionCount} recent clinical interactions. Key findings indicate active management across the documented conditions and medications, with recent updates ready for provider review.`;
  async function playBriefing() {
    if (audioLoading) return;
    setAudioLoading(true);
    try {
      const audio = await generateSpeech(summary);
      playAudioBlob(audio.toBlob());
      setAudioReady(true);
    } catch (error) {
      console.error("AI briefing audio failed", error);
    } finally {
      setAudioLoading(false);
    }
  }
  const cards = [
    {
      label: "Patient records",
      value: patients.length,
      note: "Unique patients available for review",
      icon: Users,
      featured: true,
    },
    {
      label: "Recorded conditions",
      value: conditionCount,
      note: "Condition entries across the OpenEMR export",
      icon: Stethoscope,
    },
    {
      label: "Listed medications",
      value: medicationCount,
      note: "Medication entries across the OpenEMR export",
      icon: Pill,
    },
  ];
  return (
    <main className="page-shell dashboard-page overview-page">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">Clinical overview</div>
          <h1>Patient records</h1>
          <p>{patients.length} patient records from OpenEMR.</p>
        </div>
      </div>
      <section className="queue-summary" aria-label="Patient record overview">
        {cards.map((item) => (
          <article
            className={`summary-card ${item.featured ? "summary-card-featured" : ""}`}
            key={item.label}
          >
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </div>
            <span className="summary-icon">
              <item.icon size={20} />
            </span>
          </article>
        ))}
      </section>
      <section className="overview-briefing" aria-labelledby="overview-briefing-title">
        <div className="overview-briefing-heading">
          <span className="eyebrow">AI clinical briefing</span>
          <h2 id="overview-briefing-title">60-Second AI Clinical Briefing</h2>
        </div>
        <div className="overview-audio-row">
          <button
            className="overview-play"
            type="button"
            onClick={playBriefing}
            disabled={audioLoading}
            aria-label="Play AI clinical briefing"
          >
            {audioLoading ? "…" : "▶"}
          </button>
          <div className="overview-audio-track">
            <span />
          </div>
          <span className="overview-audio-time">{audioReady ? "0:60 / 0:60" : "0:00 / 0:60"}</span>
          <button
            className="overview-audio-secondary"
            type="button"
            onClick={playBriefing}
            disabled={audioLoading}
          >
            Play AI Briefing
          </button>
        </div>
        <p>{summary}</p>
        <Link className="overview-directory-link" to="/patients">
          Open patient queue <ArrowUpRight size={15} />
        </Link>
      </section>
    </main>
  );
}

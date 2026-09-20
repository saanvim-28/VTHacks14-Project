import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Pill, Stethoscope, Users } from "lucide-react";
import { patientsQuery } from "@/data/queries";
import { isPharmaSearchConfigured, searchPharmaForPatients } from "@/data/pharma-api";
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
  const pharmaQuery = useQuery({
    queryKey: ["pharma-search", "overview-top-five", patients.map((patient) => patient.patient_id)],
    queryFn: () => searchPharmaForPatients(patients),
    enabled: isPharmaSearchConfigured() && patients.length > 0,
    staleTime: 5 * 60 * 1000,
  });
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
  const topMatches = pharmaQuery.data?.top_content?.slice(0, 5) ?? [];
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
      <section className="overview-matches" aria-labelledby="overview-matches-title">
        <header>
          <div>
            <span className="eyebrow">AI pharmaceutical matching</span>
            <h2 id="overview-matches-title">Top 5 pharmaceutical matches across your patients</h2>
            <p>
              {pharmaQuery.data?.top_content_briefing ??
                "Products and clinical resources are matched to the conditions, medications, and encounter context in the current patient panel."}
            </p>
          </div>
        </header>
        {pharmaQuery.isLoading && (
          <p className="overview-matches-status">
            Searching the connected pharmaceutical knowledge base…
          </p>
        )}
        {pharmaQuery.isError && (
          <p className="overview-matches-status">
            Pharmaceutical matching is temporarily unavailable. Refresh this page to retry.
          </p>
        )}
        {!pharmaQuery.isLoading && !pharmaQuery.isError && topMatches.length > 0 && (
          <div className="overview-match-list">
            {topMatches.map((match, index) => (
              <article
                className="overview-match-item"
                key={`${match.id ?? match.product_name ?? match.title ?? "match"}-${index}`}
              >
                <span className="overview-match-rank">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{match.product_name ?? match.title ?? "Clinical resource"}</h3>
                  <p>{match.therapeutic_area ?? match.indication ?? "Matched clinical context"}</p>
                </div>
                <span className="overview-match-patients">
                  {match.matched_patient_count ?? 0} patients
                </span>
              </article>
            ))}
          </div>
        )}
        {!pharmaQuery.isLoading && !pharmaQuery.isError && topMatches.length === 0 && (
          <p className="overview-matches-status">
            No top matches have been returned for this patient panel yet.
          </p>
        )}
      </section>
      <section className="overview-briefing" aria-labelledby="overview-briefing-title">
        <div className="overview-briefing-heading">
          <span className="eyebrow">AI clinical briefing</span>
          <h2 id="overview-briefing-title">Clinical Briefing</h2>
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

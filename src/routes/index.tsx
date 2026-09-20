import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Pill, Stethoscope, Users } from "lucide-react";

import { patientsQuery } from "@/data/queries";
import { isPharmaSearchConfigured, searchPharmaForPatients } from "@/data/pharma-api";

import { EmptyState, PageSkeleton, RouteError } from "@/components/chatone/shared";

import { playSpeech, pauseSpeech, resumeSpeech, stopSpeech } from "@/lib/tts-player";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Overview — medMatch" }],
  }),

  loader: ({ context }) => context.queryClient.ensureQueryData(patientsQuery()),

  pendingComponent: PageSkeleton,
  errorComponent: RouteError,
  component: Overview,
});

function Overview() {
  // -------------------------------------------------------
  // Patient data
  // -------------------------------------------------------

  const { data: patients } = useSuspenseQuery(patientsQuery());

  // -------------------------------------------------------
  // Pharma search
  // -------------------------------------------------------

  const pharmaQuery = useQuery({
    queryKey: ["pharma-search", "overview-top-five", patients.map((patient) => patient.patient_id)],

    queryFn: () => searchPharmaForPatients(patients),

    enabled: isPharmaSearchConfigured() && patients.length > 0,

    staleTime: 5 * 60 * 1000,
  });

  // -------------------------------------------------------
  // Audio state
  //
  // IMPORTANT:
  // Hooks must be above any early return.
  // -------------------------------------------------------

  const [audioState, setAudioState] = useState<"stopped" | "playing" | "paused">("stopped");

  // -------------------------------------------------------
  // Stop speech when leaving the page
  // -------------------------------------------------------

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // -------------------------------------------------------
  // Patient statistics
  // -------------------------------------------------------

  const conditionCount = patients.reduce((total, patient) => total + patient.conditions.length, 0);

  const interactionCount = patients.reduce(
    (total, patient) => total + patient.visit_history.length,
    0,
  );

  // -------------------------------------------------------
  // Pharmaceutical matches
  // -------------------------------------------------------

  const topMatches = pharmaQuery.data?.top_content?.slice(0, 5) ?? [];

  // Fallback summary.
  //
  // Normally the audio will NOT use this.
  // The actual audio uses top_content_briefing returned
  // from the Supabase pharma-search Edge Function.

  // -------------------------------------------------------
  // AI GENERATED BRIEFING FROM SUPABASE
  // -------------------------------------------------------

  const briefingText = pharmaQuery.data?.top_content_briefing?.trim() ?? "";
  // Don't allow audio until the AI briefing has actually
  // been returned by pharma-search.
  const audioDisabled = pharmaQuery.isLoading || !briefingText;
  // -------------------------------------------------------
  // Start AI briefing
  // -------------------------------------------------------

  function startBriefing() {
    if (!briefingText) {
      console.error("No AI briefing returned from pharma-search.", pharmaQuery.data);
      return;
    }

    console.log("PLAYING AI BRIEFING:", briefingText);

    playSpeech(briefingText, {
      onStart: () => {
        setAudioState("playing");
      },

      onEnd: () => {
        setAudioState("stopped");
      },

      onError: () => {
        setAudioState("stopped");
      },
    });
  }

  // -------------------------------------------------------
  // Play / Pause / Resume
  // -------------------------------------------------------

  function toggleBriefing() {
    if (audioState === "playing") {
      pauseSpeech();
      setAudioState("paused");
      return;
    }

    if (audioState === "paused") {
      resumeSpeech();
      setAudioState("playing");
      return;
    }

    startBriefing();
  }

  // -------------------------------------------------------
  // Rewind
  //
  // For browser speech synthesis, this restarts the
  // briefing from the beginning.
  // -------------------------------------------------------

  function rewindBriefing() {
    stopSpeech();
    setAudioState("stopped");

    if (!audioDisabled) {
      startBriefing();
    }
  }

  // -------------------------------------------------------
  // Summary cards
  // -------------------------------------------------------

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
      value: interactionCount,
      note: "Medication entries across the OpenEMR export",
      icon: Pill,
    },
  ];

  // -------------------------------------------------------
  // Empty patient state
  //
  // This MUST come after the hooks above.
  // -------------------------------------------------------

  if (!patients.length) {
    return (
      <main className="page-shell">
        <EmptyState
          title="No patient records available"
          body="The OpenEMR export does not contain any patient records."
        />
      </main>
    );
  }

  // -------------------------------------------------------
  // Main UI
  // -------------------------------------------------------

  return (
    <main className="page-shell dashboard-page overview-page">
      {/* PAGE HEADER */}

      <div className="page-heading-row">
        <div>
          <div className="eyebrow">Clinical overview</div>

          <h1>Patient records</h1>

          <p>{patients.length} patient records from OpenEMR.</p>
        </div>
      </div>

      {/* PATIENT STATISTICS */}

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

      {/* AI PHARMA MATCHING */}

      <section className="overview-matches" aria-labelledby="overview-matches-title">
        <header>
          <div>
            <span className="eyebrow">AI pharmaceutical matching</span>

            <h2 id="overview-matches-title">Top 5 pharmaceutical matches across your patients</h2>
          </div>

          {/* ---------------------------------------------
              AUDIO CONTROLS
          --------------------------------------------- */}

          <div className="overview-audio-row overview-matches-audio">
            {/* PLAY / PAUSE */}

            <button
              className="overview-play"
              type="button"
              onClick={toggleBriefing}
              disabled={audioDisabled}
              aria-label={
                audioState === "playing"
                  ? "Pause AI pharmaceutical matching briefing"
                  : "Play AI pharmaceutical matching briefing"
              }
              title={audioState === "playing" ? "Pause briefing" : "Play briefing"}
            >
              {pharmaQuery.isLoading ? "…" : audioState === "playing" ? "Ⅱ" : "▶"}
            </button>

            {/* REWIND */}

            <button
              className="overview-audio-secondary"
              type="button"
              onClick={rewindBriefing}
              disabled={audioDisabled}
              aria-label="Restart AI briefing"
              title="Restart briefing"
            >
              ↶
            </button>

            {/* STATUS */}

            <span className="overview-audio-time">
              {pharmaQuery.isLoading
                ? "Generating AI briefing…"
                : audioState === "playing"
                  ? "Playing"
                  : audioState === "paused"
                    ? "Paused"
                    : "Ready"}
            </span>

            {/* LARGE PLAY / PAUSE BUTTON */}

            <button
              className="overview-audio-secondary"
              type="button"
              onClick={toggleBriefing}
              disabled={audioDisabled}
            >
              {pharmaQuery.isLoading
                ? "Preparing briefing…"
                : audioState === "playing"
                  ? "Pause Briefing"
                  : audioState === "paused"
                    ? "Resume Briefing"
                    : "Play AI Briefing"}
            </button>
          </div>
        </header>

        {/* ---------------------------------------------
            AI-GENERATED SUMMARY

            This displays the SAME text that the audio
            reads aloud.
        --------------------------------------------- */}

        <p className="overview-matches-description">
          {pharmaQuery.isLoading
            ? "Generating AI briefing…"
            : briefingText || "AI briefing unavailable."}
        </p>

        {/* LOADING */}

        {pharmaQuery.isLoading && (
          <p className="overview-matches-status">
            Searching the connected pharmaceutical knowledge base…
          </p>
        )}

        {/* ERROR */}

        {pharmaQuery.isError && (
          <p className="overview-matches-status">
            Pharmaceutical matching is temporarily unavailable. Refresh this page to retry.
          </p>
        )}

        {/* TOP FIVE MATCHES */}

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

        {/* NO MATCHES */}

        {!pharmaQuery.isLoading && !pharmaQuery.isError && topMatches.length === 0 && (
          <p className="overview-matches-status">
            No top matches have been returned for this patient panel yet.
          </p>
        )}

        {/* PATIENT QUEUE LINK */}

        <Link className="overview-directory-link" to="/patients">
          Open patient queue
          <ArrowUpRight size={15} />
        </Link>
      </section>
    </main>
  );
}

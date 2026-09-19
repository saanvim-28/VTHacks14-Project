import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bookmark, ExternalLink, Headphones, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { z } from "zod";
import { briefingQuery, patientQuery } from "@/data/queries";
import { Button } from "@/components/ui/button";
import { useChatOne } from "@/components/chatone/app-context";
import { DataUnavailable, PageSkeleton, PatientContext, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/patients/$patientId/briefing")({
  validateSearch: (search) => z.object({ product: z.string().catch("") }).parse(search),
  loaderDeps: ({ search }) => ({ product: search.product }),
  head: () => ({ meta: [
    { title: "60-Second Clinical Briefing — ChatOne" },
    { name: "description", content: "An accessible clinical audio briefing and transcript." },
    { property: "og:title", content: "60-Second Clinical Briefing — ChatOne" },
    { property: "og:description", content: "An accessible clinical audio briefing and transcript." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: async ({ context, params, deps }) => { await Promise.all([context.queryClient.ensureQueryData(patientQuery(params.patientId)), context.queryClient.ensureQueryData(briefingQuery(params.patientId, deps.product))]); },
  pendingComponent: PageSkeleton, errorComponent: RouteError, component: BriefingPage,
});

function BriefingPage() {
  const { patientId } = Route.useParams(); const { product } = Route.useSearch();
  const { data: patient } = useSuspenseQuery(patientQuery(patientId));
  const { data: briefing } = useSuspenseQuery(briefingQuery(patientId, product));
  const [isPlaying, setIsPlaying] = useState(false);
  const { saved, toggleSaved } = useChatOne();
  if (!patient || !briefing) return <main className="page-shell"><DataUnavailable /></main>;
  const key = `${patientId}:${briefing.product}`; const isSaved = saved.has(key);
  return <main className="page-shell briefing-page">
    <Link to="/patients/$patientId/information" params={{ patientId }} className="back-link">← Back to relevant information</Link>
    <div className="briefing-layout"><section className="briefing-main"><div className="briefing-label"><Headphones />60-second briefing</div><h1>{briefing.product}</h1><PatientContext name={patient.name} id={patient.patient_id} />
      <div className="audio-player"><button className="play-control" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? "Pause demo briefing" : "Play demo briefing"}>{isPlaying ? <Pause /> : <Play />}</button><div className="audio-track"><div className="audio-meta"><span>{isPlaying ? "Playing demo briefing" : "Ready to play"}</span><span>00:00 / 01:00</span></div><div className="progress-track"><div className={isPlaying ? "progress-demo progress-playing" : "progress-demo"} /></div><div className="audio-note">{briefing.briefing_audio_url ? "Audio connected" : "Demo playback · narrated audio connection pending"}</div></div><button className="audio-icon" aria-label="Restart"><RotateCcw /></button><button className="audio-icon" aria-label="Volume"><Volume2 /></button></div>
      <div className="transcript"><span>Briefing transcript</span><p>{briefing.briefing_text}</p></div>
      <div className="briefing-actions"><Button onClick={() => toggleSaved(key)} variant={isSaved ? "secondary" : "default"}><Bookmark className={isSaved ? "fill-current" : ""} />{isSaved ? "Saved" : "Save briefing"}</Button><Button asChild variant="outline"><a href={`https://www.google.com/search?q=${encodeURIComponent(briefing.source)}`} target="_blank" rel="noreferrer">View source<ExternalLink /></a></Button></div>
    </section><aside className="briefing-aside"><span>Source reviewed</span><h2>{briefing.source}</h2><p>Matched to the latest patient context by ChatOne’s clinical knowledge layer.</p><div className="relevance-score"><strong>{Math.round(briefing.relevance*100)}%</strong><span>match relevance</span></div><p className="clinical-note">Decision support only. Confirm recommendations against the complete clinical record.</p></aside></div>
  </main>;
}

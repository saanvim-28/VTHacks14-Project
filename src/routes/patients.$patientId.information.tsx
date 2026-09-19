import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bookmark, Check, ChevronDown, Play, Sparkles } from "lucide-react";
import { matchesQuery, patientQuery } from "@/data/queries";
import { Button } from "@/components/ui/button";
import { useChatOne } from "@/components/chatone/app-context";
import { DataUnavailable, EmptyState, PageSkeleton, PatientContext, RouteError } from "@/components/chatone/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patients/$patientId/information")({
  head: ({ params }) => ({ meta: [
    { title: `Relevant Information for Patient ${params.patientId} — ChatOne` },
    { name: "description", content: "Clinically relevant pharmaceutical and care information matched to this patient." },
    { property: "og:title", content: "Top Relevant Information — ChatOne" },
    { property: "og:description", content: "Clinically relevant pharmaceutical and care information matched to this patient." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: async ({ context, params }) => { await Promise.all([context.queryClient.ensureQueryData(patientQuery(params.patientId)), context.queryClient.ensureQueryData(matchesQuery(params.patientId))]); },
  pendingComponent: PageSkeleton, errorComponent: RouteError, component: InformationPage,
});

function InformationPage() {
  const { patientId } = Route.useParams();
  const { data: patient } = useSuspenseQuery(patientQuery(patientId));
  const { data: matches } = useSuspenseQuery(matchesQuery(patientId));
  const { saved, toggleSaved } = useChatOne();
  const [expanded, setExpanded] = useState<string | null>(matches[0]?.product ?? null);
  if (!patient) return <main className="page-shell"><DataUnavailable /></main>;
  if (!matches.length) return <main className="page-shell"><EmptyState title="No relevant information found" body="No current knowledge-base matches met the clinical relevance threshold." /></main>;
  return <main className="page-shell info-page">
    <Link to="/patients/$patientId" params={{ patientId }} className="back-link">← Back to patient</Link>
    <header className="info-header"><div className="eyebrow"><Sparkles />Clinical knowledge match</div><h1>Top {matches.length} Relevant Information</h1><PatientContext name={patient.name} id={patient.patient_id} /><p>Ranked against the patient’s active conditions, medications, and latest detected change.</p></header>
    <section className="match-list">{matches.map((match, index) => {
      const key = `${patientId}:${match.product}`; const isSaved = saved.has(key); const isExpanded = expanded === match.product;
      return <article className="match-card" key={match.product}><div className="match-rank">{String(index + 1).padStart(2,"0")}</div><div className="match-content"><div className="match-title-row"><div><h2>{match.product}</h2><span className="source-label">{match.source}</span></div><span className={cn("relevance-badge", match.relevance >= .9 && "relevance-strong")}>{match.relevance_label} · {Math.round(match.relevance*100)}%</span></div>
      <button className="why-trigger" onClick={() => setExpanded(isExpanded ? null : match.product)} aria-expanded={isExpanded}><span>Why surfaced?</span><ChevronDown className={isExpanded ? "rotated" : ""} /></button>
      {isExpanded && <ul className="reason-list">{match.reasons.map((reason) => <li key={reason}><Check />{reason}</li>)}</ul>}
      <div className="match-actions"><Button asChild><Link to="/patients/$patientId/briefing" params={{ patientId }} search={{ product: match.product }}><Play />60-sec briefing</Link></Button><Button variant="outline" onClick={() => toggleSaved(key)} className={isSaved ? "saved-button" : ""}><Bookmark className={isSaved ? "fill-current" : ""} />{isSaved ? "Saved" : "Save"}</Button></div></div></article>;
    })}</section>
  </main>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Check, CircleAlert, Pill, Stethoscope, TestTube2 } from "lucide-react";
import { patientQuery } from "@/data/queries";
import { Button } from "@/components/ui/button";
import { DataUnavailable, PageSkeleton, PatientContext, PriorityBadge, RouteError } from "@/components/chatone/shared";

export const Route = createFileRoute("/patients/$patientId/")({
  head: ({ params }) => ({ meta: [
    { title: `Patient ${params.patientId} — ChatOne` },
    { name: "description", content: "Patient changes, observations, and clinical timeline." },
    { property: "og:title", content: `Patient ${params.patientId} — ChatOne` },
    { property: "og:description", content: "Patient changes, observations, and clinical timeline." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(patientQuery(params.patientId)),
  pendingComponent: PageSkeleton, errorComponent: RouteError, component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = Route.useParams();
  const { data: patient } = useSuspenseQuery(patientQuery(patientId));
  if (!patient) return <main className="page-shell"><DataUnavailable /></main>;
  const timeline = [
    { time: "9:00 AM", label: "Status stable", detail: "Patient record remained within the established baseline.", tone: "stable" },
    { time: "10:15 AM", label: "New data received", detail: patient.encounters[0]?.note ?? "New clinical information added.", tone: "neutral" },
    { time: "10:16 AM", label: "AI detected change", detail: patient.change_detected.description, tone: "brand" },
    { time: "10:16 AM", label: `Priority set to ${patient.priority.toLowerCase()}`, detail: patient.priority_reason, tone: patient.priority.toLowerCase() },
  ];
  return <main className="page-shell detail-page">
    <Link to="/" className="back-link">← Back to priority queue</Link>
    <header className="patient-header"><div><PatientContext name={patient.name} id={patient.patient_id} /><h1>{patient.name}</h1><p>{patient.age}-year-old {patient.sex} · Updated 12 minutes ago</p></div><PriorityBadge priority={patient.priority} /></header>
    <div className="detail-grid">
      <section className="clinical-section"><div className="section-title"><Stethoscope /><h2>Conditions</h2></div><div className="tag-list">{patient.conditions.map((condition) => <span key={condition}>{condition}</span>)}</div></section>
      <section className="clinical-section"><div className="section-title"><Pill /><h2>Medications</h2></div><div className="tag-list">{patient.medications.map((medication) => <span key={medication}>{medication}</span>)}</div></section>
    </div>
    <section className="clinical-section observations"><div className="section-title"><TestTube2 /><h2>Recent observations</h2><span>Compared with prior result</span></div><div className="observation-table"><div className="observation-head"><span>Test</span><span>Current value</span><span>Prior value</span><span>Collected</span></div>{patient.observations.map((observation) => <div className="observation-row" key={observation.type}><strong>{observation.type}</strong><span className="changed-value">{observation.value} {observation.unit}<CircleAlert /></span><span>{observation.prior_value} {observation.unit}</span><span><CalendarDays />{observation.date}</span></div>)}</div></section>
    <section className="clinical-section timeline-section"><div className="section-title"><CalendarDays /><h2>Clinical timeline</h2></div><div className="timeline">{timeline.map((event, index) => <div className="timeline-event" key={`${event.time}-${event.label}`}><time>{event.time}</time><div className={`timeline-marker timeline-${event.tone}`}>{index === 0 ? <Check /> : null}</div><div><strong>{event.label}</strong><p>{event.detail}</p></div></div>)}</div></section>
    <section className="change-callout"><div><span className="callout-label">What changed?</span><h2>{patient.change_detected.description}</h2><p>ChatOne compared the latest clinical data against this patient’s recent baseline.</p></div><Button asChild size="lg"><Link to="/patients/$patientId/information" params={{ patientId }}>Find relevant information<ArrowRight /></Link></Button></section>
  </main>;
}

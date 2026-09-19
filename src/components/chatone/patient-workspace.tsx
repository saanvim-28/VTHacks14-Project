import { useState } from "react";
import {
  ChartNoAxesCombined,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardList,
  FlaskConical,
  Layers,
  Minus,
} from "lucide-react";
import { getIllustrativeProfile, illustrativeDates } from "@/data/illustrative-patient-data";

import { MetricSparkline, ObservationChart } from "./observation-chart";

function DemoLabel() {
  return <span className="demo-label">Illustrative demo</span>;
}

export function PatientWorkspace({ patientId }: { patientId: string }) {
  const [showDemo, setShowDemo] = useState(true);
  const [selected, setSelected] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const profile = getIllustrativeProfile(patientId);
  const observation = profile.observations[selected] ?? profile.observations[0]!;
  const tasks = [
    "Confirm imported demographics",
    "Review the condition list",
    "Reconcile recorded medications",
    "Document allergies and encounter history",
  ];
  return (
    <>
      <div className="demo-disclosure" id="clinical-observations">
        <div className="demo-disclosure-icon">
          <Layers size={19} />
        </div>
        <div>
          <strong>Illustrative clinical workspace</strong>
          <p>
            The measurements, visits, and notes below are fictional UI examples, not OpenEMR data or
            clinical guidance.
          </p>
        </div>
        <button
          type="button"
          className="demo-toggle"
          aria-pressed={showDemo}
          onClick={() => setShowDemo((value) => !value)}
        >
          {showDemo ? "Hide demo data" : "Show demo data"}
        </button>
      </div>
      {showDemo && (
        <>
          <div className="workspace-section-heading">
            <div>
              <span className="workspace-kicker">OBSERVATIONS / 06 MONTHS</span>
              <h2>{profile.focus}</h2>
            </div>
            <DemoLabel />
          </div>
          <div className="observation-metrics">
            {profile.observations.map((item, index) => {
              const latest = item.values.at(-1)!;
              const prior = item.values.at(-2)!;
              const delta = Number((latest - prior).toFixed(1));
              const Icon = delta < 0 ? ArrowDownRight : delta > 0 ? ArrowUpRight : Minus;
              return (
                <button
                  type="button"
                  className={`observation-metric ${selected === index ? "metric-selected" : ""}`}
                  key={item.label}
                  onClick={() => setSelected(index)}
                  aria-pressed={selected === index}
                >
                  <span className="metric-top">
                    <ChartNoAxesCombined size={14} />
                    <MetricSparkline values={item.values} />
                  </span>
                  <span className="metric-name">{item.label}</span>
                  <span className="metric-value">
                    {latest}
                    <small>{item.unit}</small>
                  </span>
                  <span
                    className="metric-delta"
                    title="Direction of change only; not a clinical assessment"
                  >
                    <Icon size={13} />
                    {delta > 0 ? "+" : ""}
                    {delta} {item.unit} <span>vs prior</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="patient-analysis-grid">
            <section className="record-panel trend-panel">
              <header className="record-panel-heading">
                <div>
                  <ChartNoAxesCombined size={17} />
                  <h2>Longitudinal observations</h2>
                </div>
                <DemoLabel />
              </header>
              <div className="trend-heading">
                <div>
                  <span className="workspace-kicker">{observation.label}</span>
                  <strong>
                    {observation.values.at(-1)} <small>{observation.unit}</small>
                  </strong>
                </div>
                <span>Apr–Sep 2026 · 6 example readings</span>
              </div>
              <ObservationChart key={observation.label} observation={observation} />
              <details className="history-details">
                <summary>View all example measurements</summary>
                <div className="record-table-scroll">
                  <table className="record-table">
                    <caption>Illustrative {observation.label} history — fictional data</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Measurement</th>
                        <th scope="col">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {observation.values.map((value, index) => (
                        <tr key={index}>
                          <td>{illustrativeDates[index]}</td>
                          <td>
                            {value} {observation.unit}
                          </td>
                          <td>Illustrative demo</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <section className="record-panel visit-panel">
              <header className="record-panel-heading">
                <div>
                  <ClipboardList size={17} />
                  <h2>Encounter summary</h2>
                </div>
                <DemoLabel />
              </header>
              <div className="visit-meta">
                <span>OUTPATIENT / FOLLOW-UP</span>
                <strong>18 September 2026</strong>
              </div>
              <h3>{profile.focus}</h3>
              <p>{profile.visitNote}</p>
              <dl className="visit-fields">
                <div>
                  <dt>Encounter type</dt>
                  <dd>Routine follow-up · demo</dd>
                </div>
                <div>
                  <dt>Department</dt>
                  <dd>Primary care · demo</dd>
                </div>
                <div>
                  <dt>Documentation</dt>
                  <dd>Illustrative visit note</dd>
                </div>
              </dl>
            </section>
          </div>
          <section className="record-panel results-panel">
            <header className="record-panel-heading">
              <div>
                <FlaskConical size={17} />
                <h2>Observation comparison</h2>
              </div>
              <DemoLabel />
            </header>
            <div className="record-table-scroll">
              <table className="record-table">
                <caption>
                  Fictional measurements for interface demonstration. No diagnostic interpretation
                  is provided.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Observation</th>
                    <th scope="col">18 Sep 2026</th>
                    <th scope="col">14 Aug 2026</th>
                    <th scope="col">Change</th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.observations.map((item) => {
                    const delta = Number((item.values.at(-1)! - item.values.at(-2)!).toFixed(1));
                    return (
                      <tr key={item.label}>
                        <th scope="row">{item.label}</th>
                        <td className="result-current">
                          {item.values.at(-1)} <small>{item.unit}</small>
                        </td>
                        <td>
                          {item.values.at(-2)} <small>{item.unit}</small>
                        </td>
                        <td>
                          {delta > 0 ? "+" : ""}
                          {delta} {item.unit}
                        </td>
                        <td>
                          <DemoLabel />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <div className="patient-analysis-grid lower-workspace">
            <section className="record-panel">
              <header className="record-panel-heading">
                <div>
                  <CalendarDays size={17} />
                  <h2>Clinical timeline</h2>
                </div>
                <DemoLabel />
              </header>
              <ol className="encounter-list">
                {[
                  {
                    date: "18 SEP",
                    title: "Follow-up encounter",
                    body: "Example visit note and latest illustrative measurements recorded.",
                  },
                  {
                    date: "14 AUG",
                    title: "Interval review",
                    body: "Example medication-list review and comparison measurements.",
                  },
                  {
                    date: "17 JUL",
                    title: "Routine assessment",
                    body: "Example encounter documenting a fictional history update.",
                  },
                ].map((event) => (
                  <li key={event.date}>
                    <time>
                      {event.date}
                      <small>2026 · demo</small>
                    </time>
                    <span className="encounter-node" aria-hidden="true" />
                    <div>
                      <strong>{event.title}</strong>
                      <p>{event.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="record-panel checklist-panel">
              <header className="record-panel-heading">
                <div>
                  <ClipboardList size={17} />
                  <h2>Review checklist</h2>
                </div>
                <span
                  className={`review-progress ${completed.length === tasks.length ? "review-complete" : ""}`}
                >
                  {completed.length}/{tasks.length}
                </span>
              </header>
              <p className="checklist-note">
                Track this review locally. Changes are not written to OpenEMR.
              </p>
              <div className="review-checklist">
                {tasks.map((task) => (
                  <label key={task}>
                    <input
                      type="checkbox"
                      checked={completed.includes(task)}
                      onChange={(event) =>
                        setCompleted((current) =>
                          event.target.checked
                            ? [...current, task]
                            : current.filter((value) => value !== task),
                        )
                      }
                    />
                    <span className="review-check-icon" aria-hidden="true">
                      {completed.includes(task) && <Check size={12} />}
                    </span>
                    <span>{task}</span>
                  </label>
                ))}
              </div>
              <div
                className="review-progress-track"
                role="progressbar"
                aria-label="Local review checklist"
                aria-valuenow={completed.length}
                aria-valuemin={0}
                aria-valuemax={tasks.length}
              >
                <span style={{ width: `${(completed.length / tasks.length) * 100}%` }} />
              </div>
            </section>
          </div>
        </>
      )}
      {!showDemo && (
        <section className="record-panel demo-hidden">
          <h2>OpenEMR-only view</h2>
          <p>
            The exported demographics, conditions, and medications are shown above. The export does
            not include observations or encounter history.
          </p>
        </section>
      )}
    </>
  );
}

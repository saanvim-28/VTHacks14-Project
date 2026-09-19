import { useMemo, useState } from "react";
import { CalendarDays, ClipboardList } from "lucide-react";
import type { OpenEMRPatient, Observation } from "@/types/openemr";
import { MetricSparkline, ObservationChart } from "./observation-chart";

interface PatientWorkspaceProps {
  patient: OpenEMRPatient;
}

function groupObservations(observations: Observation[]) {
  const groups = new Map<
    string,
    { label: string; unit: string; values: number[]; dates: string[] }
  >();
  for (const observation of observations) {
    const key = observation.type.trim().toLowerCase();
    const existing = groups.get(key) ?? {
      label: observation.type,
      unit: observation.unit,
      values: [],
      dates: [],
    };
    existing.values.push(observation.value);
    existing.dates.push(observation.date);
    groups.set(key, existing);
  }
  return Array.from(groups.values()).map((item) => ({
    ...item,
    values: item.values.slice(-6),
    dates: item.dates.slice(-6),
  }));
}

export function PatientWorkspace({ patient }: PatientWorkspaceProps) {
  const [selected, setSelected] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const observations = useMemo(
    () => groupObservations(patient.observations),
    [patient.observations],
  );
  const selectedObservation = observations[selected] ?? observations[0];
  const tasks = [
    "Confirm imported demographics",
    "Review the condition list",
    "Reconcile recorded medications",
    "Document allergies and encounter history",
  ];

  return (
    <>
      <section className="record-panel data-source-panel" id="clinical-observations">
        <header className="record-panel-heading">
          <div>
            <ClipboardList size={17} />
            <h2>Imported clinical data</h2>
          </div>
          <span className="source-tag">OpenEMR record</span>
        </header>
        {observations.length ? (
          <>
            <div className="observation-metrics">
              {observations.map((item, index) => {
                const latest = item.values.at(-1)!;
                const prior = item.values.at(-2);
                return (
                  <button
                    type="button"
                    className={`observation-metric ${selected === index ? "metric-selected" : ""}`}
                    key={`${item.label}-${item.unit}`}
                    onClick={() => setSelected(index)}
                    aria-pressed={selected === index}
                  >
                    <span className="metric-top">
                      <MetricSparkline values={item.values} />
                    </span>
                    <span className="metric-name">{item.label}</span>
                    <span className="metric-value">
                      {latest}
                      <small>{item.unit}</small>
                    </span>
                    {prior !== undefined && (
                      <span className="metric-delta">
                        {(latest - prior).toFixed(1)} {item.unit} vs prior
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedObservation && (
              <section className="record-panel trend-panel">
                <header className="record-panel-heading">
                  <div>
                    <h2>{selectedObservation.label}</h2>
                  </div>
                  <span className="source-tag">Imported observation</span>
                </header>
                <ObservationChart observation={selectedObservation} />
              </section>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3>No observations in this OpenEMR export</h3>
            <p>This record includes no longitudinal measurements to display.</p>
          </div>
        )}
      </section>
      <section className="record-panel visit-panel">
        <header className="record-panel-heading">
          <div>
            <CalendarDays size={17} />
            <h2>Clinical timeline</h2>
          </div>
          <span className="source-tag">OpenEMR record</span>
        </header>
        {patient.visit_history.length ? (
          <ol className="encounter-list">
            {patient.visit_history.map((visit) => (
              <li key={`${visit.date}-${visit.reason}`}>
                <time>{visit.date}</time>
                <span className="encounter-node" aria-hidden="true" />
                <div>
                  <strong>{visit.reason}</strong>
                  <p>{visit.notes}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state">
            <h3>No visit history in this export</h3>
            <p>OpenEMR did not provide encounter notes for this patient.</p>
          </div>
        )}
      </section>
      <section className="record-panel checklist-panel">
        <header className="record-panel-heading">
          <div>
            <ClipboardList size={17} />
            <h2>Review checklist</h2>
          </div>
          <span className="review-progress">
            {completed.length}/{tasks.length}
          </span>
        </header>
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
                      : current.filter((item) => item !== task),
                  )
                }
              />
              <span className="review-check-icon" aria-hidden="true" />
              {task}
            </label>
          ))}
        </div>
      </section>
    </>
  );
}

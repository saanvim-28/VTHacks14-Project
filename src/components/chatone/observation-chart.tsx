import { useState } from "react";
import { illustrativeDates, type IllustrativeObservation } from "@/data/illustrative-patient-data";

type Point = { x: number; y: number };
// Horizontal control points keep each segment within the values at its endpoints.
function smoothPath(points: Point[]) {
  const first = points[0];
  if (!first) return "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index]!;
    const mid = (previous.x + point.x) / 2;
    return `${path} C ${mid} ${previous.y}, ${mid} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${first.x} ${first.y}`);
}

export function MetricSparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((value, index) => ({
    x: 3 + (index / Math.max(values.length - 1, 1)) * 66,
    y: 24 - ((value - min) / range) * 18,
  }));
  return (
    <svg viewBox="0 0 72 30" className="metric-sparkline" aria-hidden="true">
      <path
        d={smoothPath(points)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ObservationChart({ observation }: { observation: IllustrativeObservation }) {
  const [active, setActive] = useState<number | null>(null);
  const min = Math.min(...observation.values);
  const max = Math.max(...observation.values);
  const padding = (max - min || 1) * 0.3;
  const low = min - padding;
  const high = max + padding;
  const points = observation.values.map((value, index) => ({
    x: 52 + (index / Math.max(observation.values.length - 1, 1)) * 488,
    y: 182 - ((value - low) / (high - low)) * 135,
    value,
  }));
  const line = smoothPath(points);
  const point = active === null ? undefined : points[active];
  const tooltipX = point ? Math.max(56, Math.min(point.x - 76, 386)) : 0;
  return (
    <div className="chart-shell">
      <svg
        className="patient-trend"
        viewBox="0 0 568 230"
        role="group"
        aria-label={`Illustrative ${observation.label} chart. Focus a measurement for its date and value.`}
      >
        {[0, 1, 2, 3].map((index) => (
          <g key={index}>
            <line
              x1="52"
              x2="540"
              y1={47 + index * 45}
              y2={47 + index * 45}
              className="chart-grid"
            />
            <text x="39" y={51 + index * 45} textAnchor="end" className="chart-axis">
              {(high - ((high - low) * index) / 3).toFixed(1)}
            </text>
          </g>
        ))}
        <path d={`${line} L 540 182 L 52 182 Z`} className="chart-area" />
        <path d={line} className="chart-line" />
        {points.map((item, index) => (
          <g key={index}>
            <text x={item.x} y="212" textAnchor="middle" className="chart-axis">
              {["Apr", "May", "Jun", "Jul", "Aug", "Sep"][index]}
            </text>
            <g
              className="chart-hit-target"
              tabIndex={0}
              role="button"
              aria-label={`${illustrativeDates[index]}: ${item.value} ${observation.unit}, illustrative data`}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setActive(null);
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActive(index);
                }
              }}
            >
              <circle cx={item.x} cy={item.y} r="15" fill="transparent" />
              <circle
                cx={item.x}
                cy={item.y}
                r={active === index ? 5 : 3.5}
                className="chart-point"
              />
            </g>
          </g>
        ))}
        {point && (
          <g className="chart-tooltip" pointerEvents="none">
            <line x1={point.x} x2={point.x} y1="47" y2="182" className="chart-crossline" />
            <rect x={tooltipX} y="2" width="154" height="43" rx="8" />
            <text x={tooltipX + 12} y="18" className="chart-tooltip-date">
              {illustrativeDates[active!]} · Demo
            </text>
            <text x={tooltipX + 12} y="34" className="chart-tooltip-value">
              {point.value} {observation.unit}
            </text>
          </g>
        )}
      </svg>
      <div className="chart-legend">
        <span />
        <span>Illustrative measurements</span>
        <span className="chart-hint">Hover or focus a point to inspect</span>
      </div>
    </div>
  );
}

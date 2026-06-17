// Estimate-style preview surface that renders the scope tree where the
// production EstimateView's per-spec breakdown currently sits. Lets the
// user evaluate "what would EstimateView look like if we swapped to scope
// tree?" without modifying any production component.
//
// Activate with ?lab=estimate-preview.

import { useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { useEstimateScenario } from '../../hooks/useEstimateScenario';
import ScopeTreeBody from './ScopeTreeBody.jsx';

const PHASE_ORDER = ['setup', 'protection', 'prep', 'prime', 'apply', 'interstage', 'finish', 'cleanup'];

// Solid colors for the stacked phase bar — match EstimateView.jsx so the
// preview reads as the same product, not a parallel render.
const PHASE_BAR_COLORS = {
  setup:      '#3a5a8a',
  protection: '#3a8a8a',
  prep:       '#4a6a3a',
  prime:      '#6a5a8a',
  apply:      '#5a4a6a',
  interstage: '#6a5a3a',
  finish:     '#3a6a5a',
  cleanup:    '#5a3a4a',
};

export default function LabEstimatePreview() {
  const { state } = useProject();
  const estimate = useEstimateScenario();
  const [warningsOpen, setWarningsOpen] = useState(false);

  const projectName = state.project?.name || 'Untitled Project';
  const roomCount = (state.rooms || []).length;
  const totalHours = estimate?.totalHours || 0;
  const totalCrewDays = estimate?.totalCrewDays || 0;
  const subtotal = estimate?.pricing?.subtotal || 0;
  const phaseHours = estimate?.phaseHours || {};
  const warnings = estimate?.warnings || [];

  return (
    <div className="lab-shell lab-estimate-preview">
      <header className="lab-header">
        <div className="lab-header-title">
          <span className="lab-header-eyebrow">PaintScope · Lab</span>
          <h1>Estimate (scope-tree preview)</h1>
        </div>
        <div className="lab-header-meta">
          <span className="lab-pill">preview</span>
          <a className="lab-back" href={window.location.pathname}>← Back to PaintScope</a>
        </div>
      </header>

      <div className="lab-content">
        <section className="lep-summary">
          <div className="lep-summary-row">
            <div className="lep-project">
              <span className="lep-project-eyebrow">Project</span>
              <h2>{projectName}</h2>
              <span className="lep-project-meta">{roomCount} room{roomCount === 1 ? '' : 's'}</span>
            </div>

            <div className="lep-stats">
              <Stat label="Total hours" value={totalHours.toFixed(2)} unit="hrs" big />
              <Stat label="Crew days" value={totalCrewDays.toFixed(1)} unit="cd" />
              {subtotal > 0 && <Stat label="Subtotal" value={`$${subtotal.toFixed(2)}`} accent />}
            </div>
          </div>

          {totalHours > 0 && (
            <PhaseBar phaseHours={phaseHours} total={totalHours} />
          )}

          {warnings.length > 0 && (
            <details
              className="lep-warnings"
              open={warningsOpen}
              onToggle={(e) => setWarningsOpen(e.currentTarget.open)}
            >
              <summary>{warnings.length} warning{warnings.length === 1 ? '' : 's'}</summary>
              <ul>
                {warnings.slice(0, 50).map((w, i) => <li key={i}>{w}</li>)}
                {warnings.length > 50 && <li>…and {warnings.length - 50} more</li>}
              </ul>
            </details>
          )}
        </section>

        <ScopeTreeBody estimate={estimate} project={state.project || {}} showTotals={false} />
      </div>
    </div>
  );
}

function Stat({ label, value, unit, big, accent }) {
  return (
    <div className={`lep-stat ${big ? 'lep-stat-big' : ''} ${accent ? 'lep-stat-accent' : ''}`}>
      <span className="lep-stat-label">{label}</span>
      <span className="lep-stat-value">
        {value}
        {unit && <span className="lep-stat-unit">{unit}</span>}
      </span>
    </div>
  );
}

function PhaseBar({ phaseHours, total }) {
  const phases = PHASE_ORDER.filter(p => (phaseHours[p] || 0) > 0);
  if (phases.length === 0) return null;
  return (
    <div className="lep-phasebar-wrap">
      <span className="lep-phasebar-label">Phase distribution</span>
      <div className="lep-phasebar">
        {phases.map(p => {
          const pct = ((phaseHours[p] || 0) / total) * 100;
          const showLabel = pct > 8;
          return (
            <div
              key={p}
              className="lep-phasebar-segment"
              style={{ width: `${pct}%`, background: PHASE_BAR_COLORS[p] || 'var(--bg-tertiary)' }}
              title={`${p}: ${phaseHours[p].toFixed(2)}h (${pct.toFixed(1)}%)`}
            >
              {showLabel ? `${p} ${phaseHours[p].toFixed(1)}h` : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

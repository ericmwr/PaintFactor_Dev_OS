import { useMemo } from 'react';
import { ELEMENT_PARENT_LABELS } from '../../tracker/element-parents.js';
import {
  buildWorkerSummary,
  buildRoomSummary,
  buildPhaseComparison,
  sumLoggedHours,
} from '../../tracker/rollup.js';

const PHASE_ORDER = ['setup', 'prep', 'prime', 'apply', 'interstage', 'finish', 'cleanup'];
const PHASE_LABELS = {
  setup: 'Setup', prep: 'Prep', prime: 'Prime', apply: 'Apply',
  interstage: 'Interstage', finish: 'Finish', cleanup: 'Cleanup',
};

function varianceColor(variancePct) {
  if (variancePct > 10) return '#e74c3c';   // overbudget
  if (variancePct < -10) return '#5d5';     // under est by big margin
  return 'var(--text-muted)';
}

function pctColor(pct) {
  if (pct >= 100) return '#5d5';
  if (pct >= 50)  return '#82aaff';
  if (pct > 0)    return '#f1c40f';
  return 'var(--text-muted)';
}

export default function SummaryView({ snapshot, entries }) {
  const activeEntries = useMemo(() => (entries || []).filter(e => !e._legacy), [entries]);

  // Activity ID → activity record (for naming in worker breakdown)
  const activityById = useMemo(() => {
    const m = {};
    for (const a of snapshot?.activities || []) m[a.activity_id] = a;
    return m;
  }, [snapshot]);

  const totalLogged = useMemo(() => sumLoggedHours(activeEntries), [activeEntries]);
  const totalEst = snapshot?.total_estimated_hours || 0;
  const overallPct = totalEst > 0 ? Math.round((totalLogged / totalEst) * 100) : 0;
  const overallVariance = totalLogged - totalEst;

  const phaseRows = useMemo(() => buildPhaseComparison(snapshot, activeEntries), [snapshot, activeEntries]);
  const sortedPhaseRows = useMemo(() => {
    const order = Object.fromEntries(PHASE_ORDER.map((p, i) => [p, i]));
    return [...phaseRows].sort((a, b) => (order[a.phase] ?? 99) - (order[b.phase] ?? 99));
  }, [phaseRows]);

  const workers = useMemo(() => buildWorkerSummary(activeEntries), [activeEntries]);
  const roomSummary = useMemo(() => buildRoomSummary(snapshot, activeEntries), [snapshot, activeEntries]);
  const roomRows = useMemo(() =>
    Object.values(roomSummary).sort((a, b) => b.estimated_hours - a.estimated_hours),
    [roomSummary]
  );

  if (!snapshot) {
    return (
      <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
        No snapshot yet — set the project to In-Progress on the Setup tab to capture estimate baselines.
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {/* ── PROJECT HOURS ── */}
      <Section title="Project Hours">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16,
        }}>
          <Stat label="Logged" value={`${totalLogged.toFixed(1)}h`} color="var(--accent)" />
          <Stat label="Estimated" value={`${totalEst.toFixed(1)}h`} />
          <Stat label="Variance" value={`${overallVariance >= 0 ? '+' : ''}${overallVariance.toFixed(1)}h`} color={varianceColor(overallVariance > 0 && totalEst > 0 ? (overallVariance / totalEst) * 100 : 0)} />
          <Stat label="Progress" value={`${overallPct}%`} color={pctColor(overallPct)} />
        </div>

        <Table>
          <thead>
            <tr style={hdrRow()}>
              <th style={hdrCell('left')}>Phase</th>
              <th style={hdrCell('right')}>Estimated</th>
              <th style={hdrCell('right')}>Logged</th>
              <th style={hdrCell('right')}>Variance</th>
              <th style={hdrCell('right')}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {sortedPhaseRows.length === 0 ? (
              <tr><td colSpan={5} style={emptyCell()}>No phases with hours yet.</td></tr>
            ) : sortedPhaseRows.map(r => (
              <tr key={r.phase} style={bodyRow()}>
                <td style={cell('left')}>{PHASE_LABELS[r.phase] || r.phase}</td>
                <td style={cell('right', 'mono')}>{r.estimated.toFixed(1)}h</td>
                <td style={cell('right', 'mono')}>{r.logged.toFixed(1)}h</td>
                <td style={{ ...cell('right', 'mono'), color: varianceColor(r.variancePct) }}>
                  {r.variance >= 0 ? '+' : ''}{r.variance.toFixed(1)}h
                  {r.estimated > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 10 }}>({r.variancePct >= 0 ? '+' : ''}{r.variancePct}%)</span>
                  )}
                </td>
                <td style={{ ...cell('right', 'mono'), color: pctColor(r.pct), fontWeight: 600 }}>{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </Table>

        {roomRows.length > 0 && (
          <>
            <div style={{ marginTop: 16, fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5 }}>BY ROOM</div>
            <Table>
              <thead>
                <tr style={hdrRow()}>
                  <th style={hdrCell('left')}>Room</th>
                  <th style={hdrCell('right')}>Estimated</th>
                  <th style={hdrCell('right')}>Logged</th>
                  <th style={hdrCell('right')}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {roomRows.map(r => (
                  <tr key={r.room_id} style={bodyRow()}>
                    <td style={cell('left')}>{r.room_label}</td>
                    <td style={cell('right', 'mono')}>{r.estimated_hours.toFixed(1)}h</td>
                    <td style={cell('right', 'mono')}>{r.logged_hours.toFixed(1)}h</td>
                    <td style={{ ...cell('right', 'mono'), color: pctColor(r.pct), fontWeight: 600 }}>{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
              Per-room logged hours are split evenly across the rooms each entry touched.
            </div>
          </>
        )}
      </Section>

      {/* ── BY WORKER ── */}
      <Section title="By Worker">
        {workers.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No time entries yet.</div>
        ) : (
          <Table>
            <thead>
              <tr style={hdrRow()}>
                <th style={hdrCell('left')}>Worker</th>
                <th style={hdrCell('right')}>Hours</th>
                <th style={hdrCell('right')}>Entries</th>
                <th style={hdrCell('right')}>Days</th>
                <th style={hdrCell('left')}>Date Range</th>
                <th style={hdrCell('left')}>Activities Touched</th>
                <th style={hdrCell('left')}>Rooms</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => {
                const activityNames = w.activityIds
                  .map(id => activityById[id])
                  .filter(Boolean)
                  .map(a => {
                    const parent = ELEMENT_PARENT_LABELS[a.element_parent] || a.element_parent;
                    return `${parent} — ${a.activity_name}`;
                  });
                const roomLabels = w.roomIds
                  .map(rid => roomSummary[rid]?.room_label || rid);
                return (
                  <tr key={w.worker} style={bodyRow()}>
                    <td style={{ ...cell('left'), fontWeight: 600 }}>{w.worker}</td>
                    <td style={{ ...cell('right', 'mono'), color: 'var(--accent)' }}>{w.totalHours.toFixed(1)}h</td>
                    <td style={cell('right', 'mono')}>{w.entryCount}</td>
                    <td style={cell('right', 'mono')}>{w.dateCount}</td>
                    <td style={cell('left', 'mono')}>
                      {w.firstDate === w.lastDate ? w.firstDate : `${w.firstDate} → ${w.lastDate}`}
                    </td>
                    <td style={{ ...cell('left'), fontSize: 10, maxWidth: 280 }}>
                      {activityNames.length === 0 ? '—' : activityNames.join(', ')}
                    </td>
                    <td style={{ ...cell('left'), fontSize: 10, maxWidth: 160 }}>
                      {roomLabels.length === 0 ? '—' : roomLabels.join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Section>

      {/* ── COMPARISON ── */}
      <Section title="Estimate vs Actual">
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          Green bar = logged hours. Gray track = estimate. Red overhang = over budget.
        </div>
        {sortedPhaseRows.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No phases with hours yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedPhaseRows.map(r => (
              <PhaseBar key={r.phase} row={r} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>═══ {title.toUpperCase()} ═══</div>
      {children}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: 8, background: 'var(--bg-card)', borderRadius: 3, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 2 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: color || 'var(--text)' }}>{value}</div>
    </div>
  );
}

function PhaseBar({ row }) {
  const ratio = row.estimated > 0 ? Math.min(row.logged / row.estimated, 2) : 0;
  const filledWidth = Math.min(ratio, 1) * 100;
  const overWidth = ratio > 1 ? Math.min((ratio - 1), 1) * 100 : 0;
  const overBudget = row.variance > 0 && row.estimated > 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 11 }}>
        <span style={{ fontWeight: 600 }}>{PHASE_LABELS[row.phase] || row.phase}</span>
        <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          {row.logged.toFixed(1)}h / {row.estimated.toFixed(1)}h
          <span style={{ marginLeft: 8, color: varianceColor(row.variancePct), fontWeight: 600 }}>
            {row.variance >= 0 ? '+' : ''}{row.variance.toFixed(1)}h
          </span>
        </span>
      </div>
      <div style={{ height: 10, background: 'var(--bg-input, #161616)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%', width: `${filledWidth}%`,
          background: overBudget ? '#f1c40f' : '#5d5',
        }} />
        {overBudget && (
          <div style={{
            position: 'absolute', top: 0, left: '100%', height: '100%', width: `${overWidth}%`,
            background: '#e74c3c', transform: 'translateX(-100%)',
          }} />
        )}
      </div>
    </div>
  );
}

function Table({ children }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>{children}</table>
  );
}

function hdrRow() {
  return { borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 10, letterSpacing: 0.5 };
}
function hdrCell(align) {
  return { padding: '6px 8px', textAlign: align, fontWeight: 600 };
}
function bodyRow() {
  return { borderBottom: '1px solid var(--bg-hover, rgba(255,255,255,0.03))' };
}
function cell(align, variant) {
  return {
    padding: '6px 8px', textAlign: align,
    fontFamily: variant === 'mono' ? 'monospace' : 'inherit',
  };
}
function emptyCell() {
  return { padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' };
}

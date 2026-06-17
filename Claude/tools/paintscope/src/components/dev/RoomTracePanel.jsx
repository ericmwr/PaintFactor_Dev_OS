// Renders one card per active (room × spec) input for the selected room.
// Consumes the scenario hook's output (perInputResults + gaps) and the
// scenario bundle (to look up matched scenario details).

import { useState } from 'react';
import CtxSnapshot from './CtxSnapshot.jsx';
import MatchDetails from './MatchDetails.jsx';
import canonicalBundle from '../../data/scenario-bundle.gen.js';

export default function RoomTracePanel({ roomIndex, perInputResults = [], gaps = [] }) {
  const matchedForRoom = perInputResults.filter(r => r.roomIndex === roomIndex);
  const gapsForRoom = gaps.filter(g => matchesRoom(g, roomIndex));

  // Order: matched first (alpha by specId), then gaps (alpha by specId)
  const rows = [
    ...matchedForRoom.map(r => ({ kind: 'matched', specId: r.specId, result: r })),
    ...gapsForRoom.map(g => ({ kind: 'gap', specId: g.specId, gap: g })),
  ].sort((a, b) => a.specId.localeCompare(b.specId));

  if (rows.length === 0) {
    return (
      <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
        No active (room × spec) inputs. Toggle a substrate on in the room editor to see trace cards here.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, i) => (
        <TraceCard key={i} row={row} />
      ))}
    </div>
  );
}

function matchesRoom(gap, roomIndex) {
  // gap has roomLabel but not always roomIndex — fall back to label compare
  // if roomIndex isn't present. Safer: include both fields when building gaps.
  if (gap.roomIndex != null) return gap.roomIndex === roomIndex;
  return false; // If no index on the gap, caller should adjust; defensive default.
}

function TraceCard({ row }) {
  const [expanded, setExpanded] = useState(false);
  const { kind, specId } = row;

  let status, statusColor, scenarioLabel, hours;
  let scenario = null;

  if (kind === 'matched') {
    scenario = canonicalBundle.scenarios.find(s => s.scenario_id === row.result.scenarioId) || null;
    status = 'MATCH';
    statusColor = '#5aa85a';
    scenarioLabel = row.result.scenarioId;
    hours = row.result.totalHours;
  } else {
    status = 'NO MATCH';
    statusColor = '#c87';
    scenarioLabel = 'gap';
    hours = null;
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 4,
      background: 'rgba(0,0,0,0.1)',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          background: expanded ? 'rgba(130,170,255,0.05)' : 'transparent',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {expanded ? '▾' : '▸'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{specId}</span>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 2,
          background: statusColor,
          color: '#000',
        }}>
          {status}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>
          {scenarioLabel}
        </span>
        {hours != null && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {hours.toFixed(2)} h
          </span>
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <h5 style={sectionHeader}>CTX SNAPSHOT</h5>
            <CtxSnapshot
              ctx={kind === 'matched' ? (row.result.ctx || {}) : (row.gap?.ctx || {})}
              highlightKeys={scenario ? Object.keys(scenario.matches || {}) : []}
            />
          </div>
          <div>
            <h5 style={sectionHeader}>MATCH</h5>
            <MatchDetails
              matched={kind === 'matched' ? row.result : null}
              scenario={scenario}
              gap={kind === 'gap' ? row.gap : null}
            />
            {kind === 'matched' && (
              <ModuleSequence result={row.result} scenario={scenario} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleSequence({ result, scenario }) {
  if (!scenario) return null;
  const phaseHours = result.phaseHours || {};
  return (
    <div style={{ marginTop: 10 }}>
      <h5 style={sectionHeader}>MODULES FIRED ({(scenario.modules || []).length})</h5>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
        In order (repeats = multi-coat):
      </div>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 10 }}>
        {(scenario.modules || []).map((m, i) => (
          <li key={i} style={{ fontFamily: 'var(--font-mono)' }}>{m}</li>
        ))}
      </ol>
      <h5 style={{ ...sectionHeader, marginTop: 10 }}>PHASE HOURS</h5>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <tbody>
          {Object.entries(phaseHours).map(([phase, h]) => (
            <tr key={phase} style={{ borderTop: '1px dotted var(--border)' }}>
              <td style={{ padding: '2px 4px', color: 'var(--text-muted)' }}>{phase}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{h.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sectionHeader = { margin: '0 0 4px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' };

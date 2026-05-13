import { useState, useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { useEstimateScenario } from '../../hooks/useEstimateScenario';
import { SUBSTRATE_MAP, SUBSTRATE_CATALOG } from '../../data/substrate-catalog';
import { PHASE_ORDER } from '../../data/constants';
import { SPEC_SUBSTRATE_MAP } from '../../data/spec-maps';
import { deriveRoom } from '../../engine/derive-room';

/** Format decimal hours as Xh Ym */
function fmtHrs(h) {
  if (!h || h <= 0) return '0m';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function substrateLabel(id) {
  return SUBSTRATE_MAP[id]?.label || id;
}

/** Check whether a substrate is "active" in this room (not a painting=false always-present stub). */
function isActiveSubstrate(cfg) {
  if (!cfg) return false;
  if (cfg.painting !== undefined) return cfg.painting === true;
  return true;
}

/** Build per-room active-finish-group map: group_id → substrateId[] */
function buildActiveGroups(room) {
  const groups = new Map();
  for (const [id, cfg] of Object.entries(room.substrates || {})) {
    if (id === 'walls' || id === 'ceiling') continue;
    if (!isActiveSubstrate(cfg)) continue;
    const fg = cfg.finish_group;
    if (!fg) continue;
    if (!groups.has(fg)) groups.set(fg, []);
    groups.get(fg).push(id);
  }
  // Keep only active (≥2 members); singletons are excluded from grouping.
  for (const [fg, subs] of [...groups.entries()]) {
    if (subs.length < 2) groups.delete(fg);
  }
  return groups;
}

/**
 * Classify a perInputResult so we can bucket it into the correct finish group
 * (or "ungrouped"). Returns { kind, group?, primarySub? }.
 */
function classifyInput(input, room, activeGroups) {
  // Group-level shared scenario (from SCN_COMBINED_FINISH_GROUP_V1A)
  if (input.specId === 'finish_group_assignment') {
    return { kind: 'group-shared', group: input.ctx?.finish_group || null };
  }
  // Per-substrate scenario: find its primary substrate and its finish group
  const primarySub = SPEC_SUBSTRATE_MAP[input.specId] || null;
  if (!primarySub) return { kind: 'unknown', primarySub: null };
  const cfg = room.substrates?.[primarySub];
  const fg = cfg?.finish_group || null;
  if (fg && activeGroups.has(fg)) {
    return { kind: 'group-member', group: fg, primarySub };
  }
  return { kind: 'ungrouped', primarySub };
}

/** Sort tasks by canonical phase order then by taskId. */
function sortTasks(tasks) {
  const phaseIdx = new Map(PHASE_ORDER.map((p, i) => [p, i]));
  return [...tasks].sort((a, b) => {
    const pa = phaseIdx.get(a.phase) ?? 99;
    const pb = phaseIdx.get(b.phase) ?? 99;
    if (pa !== pb) return pa - pb;
    const ai = a.taskId || a.taskName || '';
    const bi = b.taskId || b.taskName || '';
    return ai.localeCompare(bi);
  });
}

/** Format a task's rate for display. Engine outputs baseRate as either a
 *  numeric per-hour rate OR a string like "15m" for fixed-minute tasks. */
function fmtRate(t) {
  const r = t.baseRate;
  if (r == null || r === '') return '-';
  if (typeof r === 'string') return r; // e.g. "15m" fixed-minutes
  const uom = t.uom || '';
  return uom ? `${r} ${uom}/hr` : `${r}/hr`;
}

/** Compute the effective rate after modifiers: quantity / hours (units/hr).
 *  Useful to see how QT / height / complexity modifiers shifted the canonical
 *  baseRate. Returns null for fixed-minute tasks or zero-hour tasks. */
function fmtEffectiveRate(t) {
  if (t.isFixed) return '—';
  if (!t.hours || t.hours <= 0) return '—';
  const qty = t.quantity ?? 0;
  if (!qty) return '—';
  const eff = qty / t.hours;
  const uom = t.uom || '';
  return uom ? `${eff.toFixed(1)} ${uom}/hr` : `${eff.toFixed(1)}/hr`;
}

function TaskTable({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 8px' }}>No tasks contributed.</div>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
      <thead>
        <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          <th style={{ textAlign: 'left', padding: '4px 6px', width: 80 }}>phase</th>
          <th style={{ textAlign: 'left', padding: '4px 6px' }}>task_id</th>
          <th style={{ textAlign: 'left', padding: '4px 6px' }}>ps_key</th>
          <th style={{ textAlign: 'right', padding: '4px 6px', width: 70 }}>qty</th>
          <th style={{ textAlign: 'right', padding: '4px 6px', width: 100 }} title="Canonical production rate from the task library (before modifiers)">base rate</th>
          <th style={{ textAlign: 'right', padding: '4px 6px', width: 100 }} title="Effective rate after QT / height / complexity modifiers (quantity ÷ hours)">eff. rate</th>
          <th style={{ textAlign: 'right', padding: '4px 6px', width: 70 }}>hours</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t, i) => {
          const qty = t.quantity ?? 0;
          const uom = t.uom || '';
          return (
            <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '3px 6px', color: 'var(--text-secondary)' }}>{t.phase || '-'}</td>
              <td style={{ padding: '3px 6px' }} title={t.rateSource ? `source: ${t.rateSource}` : ''}>
                {t.taskId || t.taskName || '?'}
                {t.coatNumber > 1 ? <span style={{ color: 'var(--text-muted)' }}> · coat {t.coatNumber}</span> : null}
              </td>
              <td style={{ padding: '3px 6px', color: 'var(--text-muted)' }}>{t.psKey || '-'}</td>
              <td style={{ textAlign: 'right', padding: '3px 6px' }}>{qty} {uom}</td>
              <td style={{ textAlign: 'right', padding: '3px 6px', color: 'var(--text-secondary)' }}>{fmtRate(t)}</td>
              <td style={{ textAlign: 'right', padding: '3px 6px', color: 'var(--text-secondary)' }}>{fmtEffectiveRate(t)}</td>
              <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 600, color: 'var(--accent)' }}>{fmtHrs(t.hours || 0)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Map substrate ID → key on derivedRoom. Covers trim-family + walls/ceiling.
// For substrates not in this map, we skip the breakdown row.
const SUBSTRATE_DERIVED_KEY = {
  walls:         { key: 'wall_field_sf',    uom: 'SF' },
  ceiling:       { key: 'ceiling_field_sf', uom: 'SF' },
  baseboard:     { key: 'baseboard_lf',     uom: 'LF' },
  crown:         { key: 'crown_lf',         uom: 'LF' },
  door_casing:   { key: 'door_casing_lf',   uom: 'LF' },
  window_casing: { key: 'window_casing_lf', uom: 'LF' },
  chair_rail:    { key: 'chair_rail_lf',    uom: 'LF' },
  shoe_mold:     { key: 'shoe_mold_lf',     uom: 'LF' },
  picture_rail:  { key: 'picture_rail_lf',  uom: 'LF' },
  window_stool:  { key: 'window_stool_lf',  uom: 'LF' },
  window_apron:  { key: 'window_apron_lf',  uom: 'LF' },
  shadow_box:    { key: 'shadow_box_lf',    uom: 'LF' },
  panel_mold:    { key: 'panel_mold_lf',    uom: 'LF' },
  door_frames:   { key: 'door_frame_lf',    uom: 'LF' },
  window_jamb:   { key: 'window_jamb_lf',   uom: 'LF' },
};

function QuantityBreakdown({ room, derived }) {
  const rows = [];
  // Preserve the catalog's natural order (Surfaces → Trim → Doors & Windows)
  for (const cat of SUBSTRATE_CATALOG) {
    const cfg = room.substrates?.[cat.id];
    if (!cfg) continue;
    if (!isActiveSubstrate(cfg)) continue;
    const map = SUBSTRATE_DERIVED_KEY[cat.id];
    if (!map) continue; // skip EA-based / specialty items not in the trim LF story
    const qty = derived?.[map.key] || 0;
    const overridden =
      (map.uom === 'LF' && cfg.lf_override) ||
      (map.uom === 'SF' && cfg.sf_override);
    rows.push({ id: cat.id, label: cat.label, qty, uom: map.uom, overridden });
  }
  if (rows.length === 0) {
    return <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 8px' }}>No LF/SF substrates active in this room.</div>;
  }
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 4, marginBottom: 12, background: 'var(--bg-secondary, transparent)' }}>
      <div style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', borderRadius: '4px 4px 0 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Substrate Quantities (derived)
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}>
              <td style={{ padding: '4px 12px' }}>{r.label}</td>
              <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>
                {r.qty} {r.uom}
                {r.overridden && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 500, color: 'var(--warning)' }}>override</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupSection({ title, subtitle, totalHours, tasks }) {
  const [expanded, setExpanded] = useState(false);
  const modules = useMemo(
    () => [...new Set(tasks.map(t => t.module || t.moduleId).filter(Boolean))].sort(),
    [tasks]
  );
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 4, marginBottom: 8, background: 'var(--bg-secondary, transparent)' }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-tertiary)', borderRadius: '4px 4px 0 0' }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        {subtitle && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Total: {fmtHrs(totalHours)}</span>
      </div>
      {expanded && (
        <div style={{ padding: '8px 12px' }}>
          {modules.length > 0 && (
            <div style={{ marginBottom: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>modules ({modules.length}):</span>
              {modules.map(m => (
                <span key={m} style={{ padding: '1px 6px', background: 'var(--bg-tertiary)', borderRadius: 3 }}>{m}</span>
              ))}
            </div>
          )}
          <TaskTable tasks={tasks} />
        </div>
      )}
    </div>
  );
}

export default function EstimateDiagnostic() {
  const { state } = useProject();
  const scenarioEstimate = useEstimateScenario();
  const [expandedRooms, setExpandedRooms] = useState({});

  // Engine check — diagnostic only works with scenario engine
  const engine = localStorage.getItem('paintscope.engine') || 'legacy';
  if (engine !== 'scenario') {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: 'var(--warning, #fcd34d)', color: '#000', padding: 12, borderRadius: 4, fontSize: 13 }}>
          <strong>Diagnostic requires the scenario engine.</strong>
          <div style={{ marginTop: 6 }}>
            Switch to the scenario engine in the top-right toggle of the Estimate tab (currently: legacy). The diagnostic view uses per-input task results that the legacy engine does not expose.
          </div>
        </div>
      </div>
    );
  }

  if (!scenarioEstimate) {
    return <div style={{ padding: 24, fontSize: 13, color: 'var(--text-muted)' }}>Loading scenario estimate…</div>;
  }
  if (scenarioEstimate.error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: 'var(--danger, #fca5a5)', color: '#000', padding: 12, borderRadius: 4, fontSize: 13 }}>
          <strong>Scenario estimate error:</strong> {scenarioEstimate.error}
        </div>
      </div>
    );
  }
  const perInputResults = scenarioEstimate.perInputResults || [];

  const toggleRoom = (ri) => setExpandedRooms(p => ({ ...p, [ri]: p[ri] === undefined ? true : !p[ri] }));

  // Group perInputResults by room
  const byRoom = useMemo(() => {
    const map = new Map();
    for (const pr of perInputResults) {
      const ri = pr.roomIndex;
      if (!map.has(ri)) map.set(ri, { roomIndex: ri, roomLabel: pr.roomLabel, inputs: [] });
      map.get(ri).inputs.push(pr);
    }
    return [...map.values()].sort((a, b) => a.roomIndex - b.roomIndex);
  }, [perInputResults]);

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, padding: 10, marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Reading this view:</strong> Line items are grouped by your finish_group assignments (≥2 active members). Each group section merges tasks from the shared finish-group scenario AND each per-substrate scenario whose primary substrate belongs to the group.
      </div>

      {byRoom.length === 0 && (
        <div style={{ padding: 12, fontSize: 13, color: 'var(--text-muted)' }}>No rooms in the estimate yet.</div>
      )}

      {byRoom.map(({ roomIndex, roomLabel, inputs }) => {
        const room = state.rooms[roomIndex];
        if (!room) return null;
        const derivedRoom = deriveRoom(room);
        const activeGroups = buildActiveGroups(room);

        // Classify and bucket each input
        const groupBuckets = new Map(); // group_id → { members:Set, tasks:[], totalHours }
        const ungroupedInputs = [];
        for (const pr of inputs) {
          const c = classifyInput(pr, room, activeGroups);
          if (c.kind === 'group-shared' || c.kind === 'group-member') {
            if (!c.group) { ungroupedInputs.push(pr); continue; }
            if (!groupBuckets.has(c.group)) {
              groupBuckets.set(c.group, { group: c.group, tasks: [], totalHours: 0, contributingSpecs: new Set() });
            }
            const b = groupBuckets.get(c.group);
            b.tasks.push(...(pr.tasks || []));
            b.totalHours += pr.totalHours || 0;
            b.contributingSpecs.add(pr.specId);
          } else {
            ungroupedInputs.push(pr);
          }
        }

        const roomExpanded = expandedRooms[roomIndex] === true;
        const roomTotal = inputs.reduce((s, pr) => s + (pr.totalHours || 0), 0);

        return (
          <div key={roomIndex} style={{ marginBottom: 20, border: '1px solid var(--border)', borderRadius: 4 }}>
            <div
              onClick={() => toggleRoom(roomIndex)}
              style={{ padding: '10px 14px', cursor: 'pointer', background: 'var(--bg-secondary, var(--bg-tertiary))', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{roomExpanded ? '▼' : '▶'}</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{roomLabel || `Room ${roomIndex + 1}`}</span>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Total: {fmtHrs(roomTotal)}</span>
            </div>

            {roomExpanded && (
              <div style={{ padding: 12 }}>
                {/* Per-substrate quantity breakdown — verify what's being measured */}
                <QuantityBreakdown room={room} derived={derivedRoom} />

                {/* Grouped line items */}
                {[...groupBuckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, bucket]) => {
                  const members = activeGroups.get(group) || [];
                  const memberLabels = members.map(substrateLabel).join(', ');
                  const contributing = [...bucket.contributingSpecs].sort().join(', ');
                  return (
                    <GroupSection
                      key={group}
                      title={`${memberLabels} (finish group=${group})`}
                      subtitle={`from: ${contributing}`}
                      totalHours={bucket.totalHours}
                      tasks={sortTasks(bucket.tasks)}
                    />
                  );
                })}

                {/* Ungrouped / orphan inputs */}
                {ungroupedInputs.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ungrouped / per-substrate</div>
                    {ungroupedInputs.map((pr, idx) => {
                      const primarySub = SPEC_SUBSTRATE_MAP[pr.specId];
                      const title = primarySub
                        ? `${substrateLabel(primarySub)}`
                        : pr.scenarioName || pr.scenarioId || pr.specId;
                      return (
                        <GroupSection
                          key={`${pr.specId}-${idx}`}
                          title={title}
                          subtitle={`${pr.specId} → ${pr.scenarioId}`}
                          totalHours={pr.totalHours || 0}
                          tasks={sortTasks(pr.tasks || [])}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

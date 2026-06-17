// Bulk transform editor — Phase 3 of cascade tooling.
//
// Three-pane modal:
//   [Selection]   →   [Transform]   →   [Preview / Commit]
//
// Selection composes filters with AND across categories (phase ∩ activity ∩
// regex). Transform applies a single mutation to every selected task. Preview
// shows old → new for each row before any draft is written. Commit writes
// one task draft per modified task; the user reviews in DraftsView and
// publishes through the Phase 1 smoke gate.
//
// Out of scope (v1): module overrides, scenario changes, project-impact
// estimate, name templating with ${activity} substitution.

import { useMemo, useState } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { ACTIVITY_NAMES, matchActivityRule } from '../../data/activity-rules.js';
import { useTaskDrafts } from '../../hooks/useTaskDrafts.js';

const PHASES = ['setup', 'prep', 'prime', 'apply', 'finish', 'interstage', 'cleanup'];
const SKILL_LEVELS = ['general', 'experienced', 'qualified_painter', 'specialist'];
const UNMATCHED_BUCKET = '__unmatched__';

const TRANSFORM_OPS = [
  { id: 'set_rate',       label: 'Set rate to',       field: 'rate_per_hour', kind: 'number' },
  { id: 'multiply_rate',  label: 'Multiply rate by',  field: 'rate_per_hour', kind: 'number' },
  { id: 'add_rate',       label: 'Add to rate',       field: 'rate_per_hour', kind: 'number' },
  { id: 'set_fixed_min',  label: 'Set fixed minutes', field: 'fixed_minutes', kind: 'number' },
  { id: 'set_name',       label: 'Set display name',  field: 'name',          kind: 'text' },
  { id: 'set_skill',      label: 'Set skill level',   field: 'skill_level',   kind: 'enum', options: SKILL_LEVELS },
];

export default function BulkRateEditor({ onClose, onComplete }) {
  // ── Selection state ──
  const [activePhases, setActivePhases] = useState(() => new Set());
  const [activeActivities, setActiveActivities] = useState(() => new Set());
  const [regex, setRegex] = useState('');
  const [manualSelection, setManualSelection] = useState(() => new Set());

  // ── Transform state ──
  const [opId, setOpId] = useState('set_rate');
  const [opValue, setOpValue] = useState('');
  const op = TRANSFORM_OPS.find(o => o.id === opId);

  // ── Commit state ──
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const taskDrafts = useTaskDrafts();

  // Materialize the canonical task list with derived classifications.
  // Tasks don't carry phase directly — phase lives on the modules that
  // reference them. A single task can land in multiple phases (e.g.
  // a vacuum task in both prep and interstage modules), so _phases is
  // a Set per task. Phase filtering passes a task if any of its phases
  // match an active filter.
  const allTasks = useMemo(() => {
    const tasks = Object.values(canonicalBundle.tasks || {});
    const modules = Object.values(canonicalBundle.modules || {});
    const phasesByTaskRef = new Map();
    for (const mod of modules) {
      const phase = mod.phase;
      if (!phase) continue;
      for (const entry of mod.tasks || []) {
        if (!entry?.task_ref) continue;
        if (!phasesByTaskRef.has(entry.task_ref)) phasesByTaskRef.set(entry.task_ref, new Set());
        phasesByTaskRef.get(entry.task_ref).add(phase);
      }
    }
    return tasks.map(t => ({
      ...t,
      _activity: matchActivityRule(t.task_id) || UNMATCHED_BUCKET,
      _phases: phasesByTaskRef.get(t.task_id) || new Set(),
    }));
  }, []);

  const phaseCounts = useMemo(() => {
    const c = {};
    for (const t of allTasks) {
      for (const p of t._phases) {
        c[p] = (c[p] || 0) + 1;
      }
    }
    return c;
  }, [allTasks]);

  const activityCounts = useMemo(() => {
    const c = {};
    for (const t of allTasks) {
      c[t._activity] = (c[t._activity] || 0) + 1;
    }
    return c;
  }, [allTasks]);

  // Compile regex (live), null on empty/invalid
  const regexObj = useMemo(() => {
    if (!regex) return null;
    try { return new RegExp(regex, 'i'); }
    catch { return null; }
  }, [regex]);
  const regexInvalid = regex && !regexObj;

  // The selected set: filter intersection across all active categories.
  // Phase filter passes a task if ANY of the task's derived phases match
  // any active phase chip (a task can be in multiple modules across phases).
  const selected = useMemo(() => {
    const filtered = allTasks.filter(t => {
      if (activePhases.size > 0) {
        let hit = false;
        for (const p of t._phases) { if (activePhases.has(p)) { hit = true; break; } }
        if (!hit) return false;
      }
      if (activeActivities.size > 0 && !activeActivities.has(t._activity)) return false;
      if (regexObj && !regexObj.test(t.task_id)) return false;
      return true;
    });
    // Manual additions are always included regardless of filters
    const filteredIds = new Set(filtered.map(t => t.task_id));
    for (const id of manualSelection) filteredIds.add(id);
    return [...filteredIds].map(id => allTasks.find(t => t.task_id === id)).filter(Boolean);
  }, [allTasks, activePhases, activeActivities, regexObj, manualSelection]);

  const noFiltersActive = activePhases.size === 0 && activeActivities.size === 0 && !regex && manualSelection.size === 0;

  // Compute the transform — apply to one task and return the new payload, or
  // null if the transform doesn't apply (e.g. multiply rate on a fixed-min task).
  const applyTransform = (task) => {
    if (!op || opValue === '' || opValue == null) return null;
    const next = { ...task };
    if (op.kind === 'number') {
      const n = parseFloat(opValue);
      if (!Number.isFinite(n)) return null;
      const current = task[op.field] ?? 0;
      let updated;
      if (op.id === 'set_rate' || op.id === 'set_fixed_min') updated = n;
      else if (op.id === 'multiply_rate') updated = (current || 0) * n;
      else if (op.id === 'add_rate') updated = (current || 0) + n;
      next[op.field] = updated;
    } else if (op.kind === 'enum' || op.kind === 'text') {
      next[op.field] = opValue;
    }
    return next;
  };

  // Preview rows: only those whose transform produces a change
  const previewRows = useMemo(() => {
    if (!opValue) return [];
    return selected
      .map(t => {
        const after = applyTransform(t);
        if (!after) return null;
        return {
          task: t,
          oldValue: t[op.field],
          newValue: after[op.field],
          fullPayload: after,
          changed: t[op.field] !== after[op.field],
        };
      })
      .filter(Boolean);
  }, [selected, op, opValue]);

  const changeCount = previewRows.filter(r => r.changed).length;
  const canCommit = changeCount > 0 && !submitting;

  // ── Handlers ──
  const togglePhase = (p) => setActivePhases(prev => {
    const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s;
  });
  const toggleActivity = (a) => setActiveActivities(prev => {
    const s = new Set(prev); s.has(a) ? s.delete(a) : s.add(a); return s;
  });
  const clearAll = () => {
    setActivePhases(new Set());
    setActiveActivities(new Set());
    setRegex('');
    setManualSelection(new Set());
  };

  async function handleCommit() {
    if (!canCommit) return;
    setSubmitting(true);
    setError(null);
    try {
      let written = 0;
      for (const row of previewRows) {
        if (!row.changed) continue;
        await taskDrafts.save({
          id: row.task.task_id,
          payload: row.fullPayload,
          status: 'local_override',
        });
        written++;
      }
      onComplete?.({ taskDraftsCreated: written, opLabel: op.label, opValue });
      onClose?.();
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-panel, #1a1a1a)', border: '1px solid var(--border)',
          borderRadius: 6, padding: 16, width: 1100, maxWidth: '95vw',
          height: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Bulk Edit Tasks</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>×</button>
        </div>

        {/* Three-pane body */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 280px 1fr', gap: 12, flex: 1, overflow: 'hidden' }}>

          {/* ── Pane 1: Selection ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', paddingRight: 8, borderRight: '1px solid var(--border)' }}>
            <PaneHeader>Selection</PaneHeader>

            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Filters compose with <strong>AND</strong>. Empty = match all.
            </div>

            {/* Phase chips */}
            <FilterRow label="Phase">
              {PHASES.map(p => {
                const count = phaseCounts[p] || 0;
                if (count === 0) return null;
                return (
                  <Chip key={p} active={activePhases.has(p)} onClick={() => togglePhase(p)}>
                    {p} <span style={{ opacity: 0.6 }}>{count}</span>
                  </Chip>
                );
              })}
            </FilterRow>

            {/* Activity chips */}
            <FilterRow label="Activity">
              {Object.entries(activityCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([activity, count]) => {
                  const label = activity === UNMATCHED_BUCKET ? '(unmatched)' : activity;
                  return (
                    <Chip key={activity} active={activeActivities.has(activity)} onClick={() => toggleActivity(activity)}>
                      {label} <span style={{ opacity: 0.6 }}>{count}</span>
                    </Chip>
                  );
                })}
            </FilterRow>

            {/* Regex */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Regex on task ID</div>
              <input
                placeholder="VACUUM|HEPA"
                value={regex}
                onChange={e => setRegex(e.target.value)}
                style={{
                  width: '100%', padding: '4px 6px', fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-input, #222)', color: 'var(--text)',
                  border: `1px solid ${regexInvalid ? '#e74c3c' : 'var(--border)'}`,
                  borderRadius: 3, boxSizing: 'border-box',
                }}
              />
              {regexInvalid && <div style={{ color: '#e74c3c', fontSize: 10, marginTop: 2 }}>Invalid regex</div>}
            </div>

            {!noFiltersActive && (
              <button
                onClick={clearAll}
                style={{ fontSize: 10, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, alignSelf: 'flex-start', textDecoration: 'underline' }}
              >Clear all filters</button>
            )}

            <div style={{ marginTop: 'auto', padding: 8, fontSize: 11, background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
              <strong>{selected.length}</strong> task{selected.length === 1 ? '' : 's'} selected
              {noFiltersActive && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  ⚠ All {selected.length} canonical tasks selected. Add a filter before transforming.
                </div>
              )}
            </div>
          </div>

          {/* ── Pane 2: Transform ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', paddingRight: 8, borderRight: '1px solid var(--border)' }}>
            <PaneHeader>Transform</PaneHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {TRANSFORM_OPS.map(o => (
                <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', padding: '3px 6px', borderRadius: 3, background: opId === o.id ? 'rgba(130,170,255,0.12)' : 'transparent' }}>
                  <input
                    type="radio"
                    checked={opId === o.id}
                    onChange={() => { setOpId(o.id); setOpValue(''); }}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Value</div>
              {op?.kind === 'enum' ? (
                <select
                  value={opValue}
                  onChange={e => setOpValue(e.target.value)}
                  style={{ width: '100%', padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
                >
                  <option value="">— select —</option>
                  {op.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={op?.kind === 'number' ? 'number' : 'text'}
                  step={op?.kind === 'number' ? 'any' : undefined}
                  placeholder={op?.kind === 'number' ? '1500' : 'value'}
                  value={opValue}
                  onChange={e => setOpValue(e.target.value)}
                  style={{ width: '100%', padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3, boxSizing: 'border-box' }}
                />
              )}
            </div>

            <div style={{ marginTop: 'auto', padding: 8, fontSize: 11, background: 'rgba(0,0,0,0.2)', borderRadius: 3, color: 'var(--text-muted)' }}>
              {opValue
                ? <>Applies <code>{op.label}: {String(opValue)}</code> to <strong style={{ color: 'var(--text)' }}>{changeCount}</strong> of {selected.length} selected task{selected.length === 1 ? '' : 's'}.</>
                : <>Pick a transform and value to preview.</>
              }
            </div>
          </div>

          {/* ── Pane 3: Preview ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
            <PaneHeader>Preview · {changeCount} change{changeCount === 1 ? '' : 's'}</PaneHeader>

            {previewRows.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, background: 'rgba(0,0,0,0.1)', borderRadius: 3 }}>
                {selected.length === 0
                  ? 'No tasks selected — narrow with filters at left.'
                  : opValue ? 'Transform produces no changes.' : 'Pick a transform value at center.'}
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-panel, #1a1a1a)' }}>
                    <tr style={{ background: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>Task ID</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px' }}>Old</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px' }}>→ New</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px' }}>Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map(r => (
                      <tr key={r.task.task_id} style={{ borderTop: '1px solid var(--border)', opacity: r.changed ? 1 : 0.4 }}>
                        <td style={{ padding: '3px 8px', fontFamily: 'var(--font-mono)' }}>{r.task.task_id}</td>
                        <td style={{ padding: '3px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatVal(r.oldValue)}</td>
                        <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatVal(r.newValue)}</td>
                        <td style={{ padding: '3px 8px', textAlign: 'right', color: r.changed ? '#5aa85a' : 'var(--text-muted)' }}>{formatDelta(r.oldValue, r.newValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && (
              <div style={{ padding: 8, fontSize: 11, color: '#e74c3c', background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c', borderRadius: 3 }}>
                Failed: {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} disabled={submitting} className="btn">Cancel</button>
              <button
                onClick={handleCommit}
                disabled={!canCommit}
                className="btn btn-accent"
                style={{ opacity: canCommit ? 1 : 0.5 }}
              >
                {submitting ? 'Writing drafts…' : `Apply as ${changeCount} draft${changeCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function PaneHeader({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 4 }}>{children}</div>;
}

function FilterRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10, padding: '1px 6px', borderRadius: 10,
        border: `1px solid ${active ? 'var(--accent, #82aaff)' : 'var(--border)'}`,
        background: active ? 'rgba(130, 170, 255, 0.2)' : 'var(--bg-input, #222)',
        color: active ? 'var(--accent, #82aaff)' : 'var(--text)',
        cursor: 'pointer', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
      }}
    >{children}</button>
  );
}

function formatVal(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

function formatDelta(oldV, newV) {
  if (typeof oldV !== 'number' || typeof newV !== 'number') {
    return oldV !== newV ? '✓' : '—';
  }
  const d = newV - oldV;
  if (d === 0) return '—';
  const pct = oldV ? ` (${d > 0 ? '+' : ''}${((d / oldV) * 100).toFixed(0)}%)` : '';
  return `${d > 0 ? '+' : ''}${Number.isInteger(d) ? d : d.toFixed(2)}${pct}`;
}

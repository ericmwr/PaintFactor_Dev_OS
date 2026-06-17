// QT Builder — grid view for authoring per-tier rate multipliers on
// canonical tasks. Rows are tasks (filtered by substrate + phase); columns
// are the tiers declared in FAC_QT (QT1..QT5). Each cell shows the
// effective rate (canonical × global-or-override) and an inline input to
// set a per-task tier override (fac_qt_override[tier]).
//
// Autosave: edits blur → save a task draft with the override merged in.
// Clearing the input deletes the override for that tier (falls back to
// global FAC_QT).

import { useMemo, useState } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { useTaskDrafts } from '../../hooks/useTaskDrafts.js';

function familyFromPsKey(ps_key) {
  if (!ps_key) return 'OTHER';
  const m = ps_key.match(/^PS_[A-Z_]+\.([A-Z]+)/);
  if (!m) return 'OTHER';
  const head = m[1];
  if (head.startsWith('WALL')) return 'WALL';
  if (head.startsWith('CEILING')) return 'CEILING';
  if (head.startsWith('TRIM')) return 'TRIM';
  if (head.startsWith('DOOR')) return 'DOOR';
  if (head.startsWith('WINDOW')) return 'WINDOW';
  if (head.startsWith('CABINET')) return 'CABINET';
  if (head.startsWith('CLOSET') || head.startsWith('SHELF')) return 'CLOSET';
  if (head.startsWith('STAIR')) return 'STAIR';
  if (head.startsWith('TO_')) return 'EDGE';
  return head;
}

/**
 * Derive the phase for a canonical task by scanning bundle modules that
 * reference it via task_ref. If multiple phases appear, pick the most
 * common one; if none, return null. Tasks with a direct `phase` field
 * on the canonical record take precedence.
 */
function derivePhaseForTask(taskId, canonicalTask, modules) {
  if (canonicalTask.phase) return canonicalTask.phase;
  const counts = {};
  for (const mod of Object.values(modules)) {
    if (!Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      if (entry && entry.task_ref === taskId) {
        counts[mod.phase] = (counts[mod.phase] || 0) + 1;
      }
    }
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 ? entries[0][0] : null;
}

function isQtScaled(task) {
  // Tasks are considered qt-scaled when they have qt in their eligibility
  // map OR when they don't opt out. FAC_QT applies by default to any task
  // whose module has qt eligibility; the canonical task doesn't usually
  // override. For the grid UX, we treat 'qt_scaled' classification OR no
  // explicit 'binary' classification OR no explicit qt: false as scaled.
  if (task.task_classification === 'qt_scaled') return true;
  if (task.task_classification === 'binary') return false;
  // Default heuristic: if the task declares fixed_minutes, treat as binary
  // (fixed-time work doesn't scale with tier). Otherwise scaled.
  if (task.fixed_minutes != null) return false;
  return true;
}

export default function QTBuilder() {
  const { drafts, save } = useTaskDrafts();
  const [familyFilter, setFamilyFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Merge canonical tasks with draft overlays (drafts win)
  const mergedTasks = useMemo(() => {
    const out = { ...(canonicalBundle.tasks || {}) };
    for (const d of drafts) {
      if (d.payload) out[d.id] = { ...out[d.id], ...d.payload };
    }
    return out;
  }, [drafts]);

  // Enrich tasks with derived metadata (phase + family)
  const enriched = useMemo(() => {
    const modules = canonicalBundle.modules || {};
    return Object.values(mergedTasks).map(t => ({
      ...t,
      derivedPhase: derivePhaseForTask(t.task_id, t, modules),
      family: familyFromPsKey(t.ps_key),
    }));
  }, [mergedTasks]);

  const families = useMemo(() => {
    const set = new Set(enriched.map(t => t.family));
    return ['all', ...Array.from(set).sort()];
  }, [enriched]);

  const phases = useMemo(() => {
    const set = new Set(enriched.map(t => t.derivedPhase).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [enriched]);

  // FAC_QT definition — drives columns
  const facQt = canonicalBundle.modifiers?.FAC_QT;
  const tierKeys = useMemo(() => {
    if (!facQt || !facQt.factors) return ['QT2', 'QT3', 'QT4', 'QT5'];
    // Order: numeric-ascending based on QT prefix
    return Object.keys(facQt.factors).sort();
  }, [facQt]);

  const filteredRows = useMemo(() => {
    return enriched
      .filter(t => familyFilter === 'all' || t.family === familyFilter)
      .filter(t => phaseFilter === 'all' || t.derivedPhase === phaseFilter)
      .filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          t.task_id.toLowerCase().includes(s) ||
          (t.name || '').toLowerCase().includes(s) ||
          (t.ps_key || '').toLowerCase().includes(s)
        );
      })
      .sort((a, b) => a.task_id.localeCompare(b.task_id));
  }, [enriched, familyFilter, phaseFilter, search]);

  const handleOverrideBlur = async (task, tier, rawValue) => {
    const trimmed = (rawValue ?? '').trim();
    const existing = task.fac_qt_override || {};
    const current = existing[tier];
    let next;
    if (trimmed === '') {
      if (current === undefined) return; // no-op
      next = { ...existing };
      delete next[tier];
    } else {
      const n = parseFloat(trimmed);
      if (isNaN(n) || n <= 0) return; // reject invalid input silently
      if (n === current) return; // no-op
      next = { ...existing, [tier]: n };
    }
    const payload = { ...task };
    if (Object.keys(next).length === 0) delete payload.fac_qt_override;
    else payload.fac_qt_override = next;
    // Strip derived fields before saving
    delete payload.derivedPhase;
    delete payload.family;
    await save({
      id: payload.task_id,
      payload,
      status: 'draft',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={labelStyle}>
          Substrate
          <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} style={{ ...inputStyle, width: 140 }}>
            {families.map(f => <option key={f} value={f}>{f === 'all' ? 'All substrates' : f}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Phase
          <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)} style={{ ...inputStyle, width: 130 }}>
            {phases.map(p => <option key={p} value={p}>{p === 'all' ? 'All phases' : p}</option>)}
          </select>
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          Search
          <input
            placeholder="task_id / name / ps_key..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
        </label>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 0' }}>
          {filteredRows.length} task{filteredRows.length === 1 ? '' : 's'}
        </div>
      </div>

      <div style={{
        padding: '8px 12px',
        marginBottom: 12,
        background: 'rgba(130, 170, 255, 0.08)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        fontSize: 11,
        color: 'var(--text)',
      }}>
        Each cell shows <strong>effective rate</strong> = canonical rate × (per-task override if set, else global FAC_QT multiplier).
        Edit the multiplier input under each cell to override for this task only. Blank = use global.
        Changes autosave as task drafts — publish from Drafts tab.
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
        {filteredRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No tasks match. Try clearing filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ ...thStyle, width: 280, textAlign: 'left' }}>Task</th>
                {tierKeys.map(tier => (
                  <th key={tier} style={thStyle}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{tier}</div>
                    <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)' }}>
                      ×{facQt?.factors?.[tier] ?? 1.0}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(t => {
                const scaled = isQtScaled(t);
                const canonRate = t.rate_per_hour;
                const fixedMins = t.fixed_minutes;
                const overrides = t.fac_qt_override || {};
                return (
                  <tr key={t.task_id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{t.task_id}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                        {t.family} · {t.derivedPhase || '—'} · canonical:{' '}
                        {fixedMins ? `${fixedMins}m fixed` : (canonRate ? `${canonRate} ${t.uom}/hr` : '—')}
                      </div>
                    </td>
                    {!scaled ? (
                      <td colSpan={tierKeys.length} style={{ padding: '12px 10px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 11 }}>
                        Not tier-scaled — fires the same across all tiers
                      </td>
                    ) : (
                      tierKeys.map(tier => {
                        const override = overrides[tier];
                        const globalMul = facQt?.factors?.[tier] ?? 1.0;
                        const mul = typeof override === 'number' ? override : globalMul;
                        const effectiveRate = canonRate ? Math.round(canonRate * mul) : null;
                        const hasOverride = typeof override === 'number';
                        return (
                          <td key={tier} style={{ padding: 8, textAlign: 'center', verticalAlign: 'top', background: hasOverride ? 'rgba(130, 170, 255, 0.06)' : 'transparent' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: hasOverride ? 'var(--accent, #82aaff)' : 'var(--text)' }}>
                              {effectiveRate ?? '—'}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>
                              {t.uom}/hr
                            </div>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder={String(globalMul)}
                              defaultValue={hasOverride ? String(override) : ''}
                              onBlur={e => handleOverrideBlur(t, tier, e.target.value)}
                              style={{
                                width: 60,
                                padding: '2px 4px',
                                fontSize: 10,
                                textAlign: 'center',
                                background: 'var(--bg-input, #222)',
                                color: hasOverride ? 'var(--accent, #82aaff)' : 'var(--text)',
                                border: `1px solid ${hasOverride ? 'var(--accent, #82aaff)' : 'var(--border)'}`,
                                borderRadius: 2,
                                fontFamily: 'var(--font-mono)',
                              }}
                              title={hasOverride ? `Override: ×${override}. Clear to use global ×${globalMul}` : `Global FAC_QT ×${globalMul}`}
                            />
                            {hasOverride && (
                              <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>
                                (global: ×{globalMul})
                              </div>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 10,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
};
const inputStyle = {
  padding: '4px 6px',
  fontSize: 11,
  background: 'var(--bg-input, #222)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 3,
};
const thStyle = {
  padding: '8px 10px',
  fontSize: 10,
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
};

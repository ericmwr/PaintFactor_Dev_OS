// QT Builder — vantage grid (file-naming tier model). Pick Substrate / Method /
// From-state / Coating; the grid lays out Phase → Module → Task with the
// quality tiers as columns. Editing a tier still served by the baseline
// implicitly forks that tier's scenario (and a module, for task edits), then
// applies the change — so a genuinely shared file is never mutated in place.
// All edits autosave as scenario/module drafts and go live via the overlay;
// publish from the Drafts tab. View-model in ./qt-builder/derive-vantage.js;
// edit orchestration in ./qt-builder/vantage-edits.js (both pure, tested).

import { Fragment, useMemo, useState, useRef } from 'react';
import bundle from '../../data/scenario-bundle.gen.js';
import { listSubstrates, listDimensions } from './qt-builder/derive-tier-ladder.js';
import { deriveVantage } from './qt-builder/derive-vantage.js';
import {
  planAddTask, planRemoveTask, planAddModule,
  planRemoveModule, planSetCoats, planRevertTier,
  planSetQtFactor, planClearQtFactor,
  planSetMaterial, planClearMaterial,
} from './qt-builder/vantage-edits.js';
import { deriveMaterials } from './qt-builder/derive-materials.js';
import { mergeModuleDrafts, mergeScenarioDrafts } from './qt-builder/merge-drafts.js';
import TaskPicker from './TaskPicker.jsx';
import ModulePicker from './ModulePicker.jsx';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';
import { useScenarioDrafts } from '../../hooks/useScenarioDrafts.js';

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/^SS_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const isActive = (d) => d.status === 'draft' || d.status === 'local_override';
const COAT_PHASES = new Set(['apply', 'finish']);

export default function QTBuilder() {
  const { drafts: moduleDrafts, save: saveModule, remove: removeModule } = useModuleDrafts();
  const { drafts: scenarioDrafts, save: saveScenario, remove: removeScenario } = useScenarioDrafts();

  const substrates = useMemo(() => listSubstrates(bundle), []);
  const [substrate, setSubstrate] = useState(substrates[0] || '');
  const dims = useMemo(() => listDimensions(bundle, substrate), [substrate]);
  const [method, setMethod] = useState('');
  const [fromState, setFromState] = useState('');
  const [coating, setCoating] = useState('');

  const effMethod = dims.methods.includes(method) ? method : (dims.methods[0] || '');
  const effState = dims.states.includes(fromState) ? fromState : (dims.states[0] || '');
  const effCoating = dims.coatings.includes(coating)
    ? coating
    : (dims.coatings.includes('paint') ? 'paint' : (dims.coatings[0] || ''));

  // Merge active module + scenario drafts over canonical so edits show live.
  const mergedBundle = useMemo(
    () => ({
      ...bundle,
      modules: mergeModuleDrafts(bundle.modules, moduleDrafts),
      scenarios: mergeScenarioDrafts(bundle.scenarios, scenarioDrafts),
    }),
    [moduleDrafts, scenarioDrafts]
  );

  const sel = { paintable_item: substrate, application_method: effMethod, substrate_state: effState, coating_type: effCoating };

  const vm = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveVantage(mergedBundle, sel);
  }, [mergedBundle, substrate, effMethod, effState, effCoating]);

  const materials = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveMaterials(mergedBundle, bundle, sel);
  }, [mergedBundle, substrate, effMethod, effState, effCoating]);

  const activeDraftCount = moduleDrafts.filter(isActive).length + scenarioDrafts.filter(isActive).length;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [taskPicker, setTaskPicker] = useState(null);     // { tier, baseModuleId, phase }
  const [modulePicker, setModulePicker] = useState(null); // { tier }

  // Persist a vantage-edits plan: save its scenario/module drafts, or delete on revert.
  async function persist(plan) {
    if (!plan) return;
    if (plan.module) await saveModule({ id: plan.module.module_id, payload: plan.module, status: 'draft' });
    if (plan.scenario) await saveScenario({ id: plan.scenario.scenario_id, payload: plan.scenario, status: 'draft' });
    if (plan.deleteScenarioId) {
      await removeScenario(plan.deleteScenarioId);
      for (const mid of plan.deleteModuleIds || []) await removeModule(mid);
    }
  }

  async function run(makePlan) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await persist(makePlan()); }
    catch (e) { console.error('QT Builder: edit failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const tiers = vm?.tiers || [];
  const isServed = (t) => (vm?.served || []).includes(t);
  // Array-pattern (legacy multi-tier) tiers read as baseline but can't be forked
  // effectively yet (a scalar fork won't out-specify the array), so edits there
  // would be inert — disable them until the array→baseline conversion (staged).
  const tierEditable = (t) => isServed(t) && !(vm?.isArrayTierByTier?.[t]);

  function pickTask(task_id) {
    if (!taskPicker) return;
    const { tier, baseModuleId } = taskPicker;
    run(() => planAddTask(mergedBundle, sel, tier, baseModuleId, task_id));
    setTaskPicker(null);
  }

  function pickModule(moduleId) {
    if (!modulePicker) return;
    const { tier } = modulePicker;
    run(() => planAddModule(mergedBundle, sel, tier, moduleId));
    setModulePicker(null);
  }

  function commitMultiplier(tier, raw) {
    const m = vm?.multiplierRow?.[tier];
    if (!m) return;
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v <= 0 || v === m.value) return;   // ignore invalid / unchanged
    run(() => planSetQtFactor(mergedBundle, sel, tier, v));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Finder */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={labelStyle}>Substrate
          <select value={substrate} onChange={e => setSubstrate(e.target.value)} style={{ ...inputStyle, width: 200 }}>
            {substrates.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Method
          <select value={effMethod} onChange={e => setMethod(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            {dims.methods.map(m => <option key={m} value={m}>{humanize(m)}</option>)}
          </select>
        </label>
        <label style={labelStyle}>From state
          <select value={effState} onChange={e => setFromState(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            {dims.states.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </label>
        {dims.coatings.length > 1 && (
          <label style={labelStyle}>Coating
            <select value={effCoating} onChange={e => setCoating(e.target.value)} style={{ ...inputStyle, width: 130 }}>
              {dims.coatings.map(c => <option key={c} value={c}>{humanize(c)}</option>)}
            </select>
          </label>
        )}
      </div>

      {activeDraftCount > 0 && (
        <div style={bannerStyle}>
          {activeDraftCount} draft{activeDraftCount === 1 ? '' : 's'} — live in estimates now. Publish from the Drafts tab.
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span><b style={{ color: 'var(--text)' }}>✓</b> shared (baseline)</span>
        <span><b style={{ color: 'var(--accent, #82aaff)' }}>✓</b> forked / added at tier</span>
        <span><b style={{ color: 'var(--accent, #82aaff)' }}>+</b> add here</span>
        <span><b>·</b> absent</span>
        <span><b>—</b> tier not served</span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>editing a baseline tier forks it automatically · multi-tier tiers are read-only until split</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
        {!vm ? (
          <div style={emptyStyle}>Pick a substrate, method, and state.</div>
        ) : vm.phaseGroups.length === 0 ? (
          <div style={emptyStyle}>No scenario matched this combination.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ ...thStyle, textAlign: 'left', width: 340 }}>Phase · Module · Task</th>
                {tiers.map(t => (
                  <th key={t} style={thStyle}>
                    {t}
                    {!isServed(t)
                      ? <div style={tierTagNa}>n/a</div>
                      : vm.isForkByTier[t]
                        ? <div style={tierTagFork}>forked&nbsp;
                            <span onClick={() => !busy && run(() => planRevertTier(mergedBundle, sel, t))}
                                  title="Delete this tier's fork, revert to baseline" style={revertLink}>revert</span>
                          </div>
                        : vm.isArrayTierByTier[t]
                          ? <div style={tierTagNa} title="This tier shares a legacy multi-tier scenario file; per-tier edits are inert until it's split into baseline + forks (staged conversion).">shared · multi-tier</div>
                          : <div style={tierTagBase}>baseline</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* QT time multiplier — scenario-level, per tier */}
              <tr style={{ borderTop: '1px solid var(--border)', background: 'rgba(130,170,255,0.05)' }}>
                <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                  <b style={{ fontSize: 11 }}>QT time multiplier</b>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 10 }}>speed vs QT3 baseline</span>
                </td>
                {tiers.map(t => {
                  const m = vm.multiplierRow[t];
                  if (!m || !m.served) return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                  if (m.isAnchor) return (
                    <td key={t} style={cellStyle}>
                      <span style={{ color: 'var(--text-muted)' }} title="QT3 is the baseline anchor (×1.00). Edit QT3 speed via the task rate, not here.">×1.00 🔒</span>
                    </td>
                  );
                  if (!tierEditable(t)) return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                  return (
                    <td key={t} style={cellStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>×</span>
                        <input
                          key={`${t}:${m.value}`}
                          type="number" step="0.05" min="0.05"
                          defaultValue={m.value}
                          disabled={busy}
                          title={m.isOverride ? `Override (global default ×${m.def})` : `Set an override (global default ×${m.def})`}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          onBlur={e => commitMultiplier(t, e.currentTarget.value)}
                          style={{ ...inputStyle, width: 54, textAlign: 'center',
                            borderColor: m.isOverride ? 'var(--accent, #82aaff)' : 'var(--border)',
                            color: m.isOverride ? 'var(--accent, #82aaff)' : 'var(--text)' }}
                        />
                        {m.isOverride && (
                          <button title={`Clear override → global ×${m.def}`} disabled={busy}
                            onClick={() => run(() => planClearQtFactor(mergedBundle, sel, t))}
                            style={removeBtn}>×</button>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {vm.phaseGroups.map(group => (
                <Fragment key={group.phase}>
                  <tr><td colSpan={tiers.length + 1} style={phaseStyle}>{humanize(group.phase)}</td></tr>
                  {group.modules.map(row => (
                    <Fragment key={row.baseModuleId}>
                      {/* Module row */}
                      <tr style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{row.baseModuleId}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{row.name}</span>
                        </td>
                        {tiers.map(t => {
                          const c = row.cells[t];
                          if (c.state === 'na') return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                          const editable = tierEditable(t);
                          if (c.state === 'absent') return (
                            <td key={t} style={cellStyle}>
                              {editable
                                ? <button title="Add this module at this tier" disabled={busy}
                                    onClick={() => run(() => planAddModule(mergedBundle, sel, t, row.baseModuleId))}
                                    style={addCellBtn}>+</button>
                                : <span style={mutedGlyph}>·</span>}
                            </td>
                          );
                          const accent = c.state === 'forked' || c.state === 'added';
                          const color = accent ? 'var(--accent, #82aaff)' : 'var(--text)';
                          const repeatable = COAT_PHASES.has(row.phase);
                          return (
                            <td key={t} style={cellStyle}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                {repeatable && editable ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <button style={{ ...stepBtn, opacity: busy || c.count <= 1 ? 0.4 : 1 }} disabled={busy || c.count <= 1} title="Fewer coats"
                                      onClick={() => run(() => planSetCoats(mergedBundle, sel, t, row.baseModuleId, c.count - 1))}>−</button>
                                    <b style={{ color }} title={c.state}>×{c.count}</b>
                                    <button style={{ ...stepBtn, opacity: busy ? 0.4 : 1 }} disabled={busy} title="More coats"
                                      onClick={() => run(() => planSetCoats(mergedBundle, sel, t, row.baseModuleId, c.count + 1))}>+</button>
                                  </span>
                                ) : (
                                  <b style={{ color }} title={c.state}>✓{c.count > 1 ? `×${c.count}` : ''}</b>
                                )}
                                {editable && (
                                  <button title={repeatable && c.count > 1 ? 'Remove one coat at this tier' : 'Remove this module at this tier'}
                                    disabled={busy}
                                    onClick={() => run(() => planRemoveModule(mergedBundle, sel, t, row.baseModuleId))}
                                    style={removeBtn}>×</button>
                                )}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      {/* Task rows */}
                      {row.tasks.map(task => (
                        <tr key={task.task_ref}>
                          <td style={{ padding: '3px 10px 3px 26px', textAlign: 'left' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{task.task_ref}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{task.name}</span>
                          </td>
                          {tiers.map(t => {
                            const state = task.cells[t];
                            if (state === 'na') return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                            const editable = tierEditable(t);
                            const added = state === 'added';
                            if (state === 'absent') return (
                              <td key={t} style={cellStyle}>
                                {editable
                                  ? <button title="Add this task at this tier" disabled={busy}
                                      onClick={() => run(() => planAddTask(mergedBundle, sel, t, row.baseModuleId, task.task_ref))}
                                      style={addCellBtn}>+</button>
                                  : <span style={mutedGlyph}>·</span>}
                              </td>
                            );
                            return (
                              <td key={t} style={cellStyle}>
                                {editable
                                  ? <button title="Remove this task at this tier" disabled={busy}
                                      onClick={() => run(() => planRemoveTask(mergedBundle, sel, t, row.baseModuleId, task.task_ref))}
                                      style={{ ...cellToggle, color: added ? 'var(--accent, #82aaff)' : 'var(--text)', fontWeight: added ? 600 : 400 }}>✓</button>
                                  : <span style={{ color: added ? 'var(--accent, #82aaff)' : 'var(--text)' }}>✓</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {/* + task sub-row (tier-column targeted) */}
                      <tr>
                        <td style={addSubRowLabel}>+ task</td>
                        {tiers.map(t => (
                          <td key={t} style={cellStyle}>
                            {tierEditable(t)
                              ? <button title={`Add a library task to ${row.baseModuleId} at ${t}`} disabled={busy}
                                  onClick={() => setTaskPicker({ tier: t, baseModuleId: row.baseModuleId, phase: row.phase })}
                                  style={addCellBtn}>+</button>
                              : <span style={mutedGlyph}>—</span>}
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  ))}
                  {/* + module sub-row (tier-column targeted) */}
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={addSubRowLabel}>+ module ({humanize(group.phase)})</td>
                    {tiers.map(t => (
                      <td key={t} style={cellStyle}>
                        {tierEditable(t)
                          ? <button title={`Add a library module at ${t}`} disabled={busy}
                              onClick={() => setModulePicker({ tier: t })}
                              style={addCellBtn}>+</button>
                          : <span style={mutedGlyph}>—</span>}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {materials && materials.materialRoles.length > 0 && (
        <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 3, flexShrink: 0 }}>
          <div style={phaseStyle}>Materials</div>
          <div style={{ padding: '2px 10px 6px', fontSize: 9, color: 'var(--text-muted)' }}>
            Materials apply at the project quality tier today; per-tier picks are saved for the per-tier rollout. The real-product pick stays in the Materials tab.
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ ...thStyle, textAlign: 'left', width: 340 }}>Role</th>
                {tiers.map(t => (
                  <th key={t} style={thStyle}>{t}{!isServed(t) && <div style={tierTagNa}>n/a</div>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.materialRoles.map(role => (
                <tr key={role} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', textAlign: 'left', textTransform: 'capitalize' }}>{role}</td>
                  {tiers.map(t => {
                    const tm = materials.byTier[t];
                    const cands = tm?.candidatesByRole?.[role] || [];
                    if (!tierEditable(t) || !tm || cands.length === 0) {
                      return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                    }
                    const val = tm.resolvedByRole[role] || '';
                    const isOv = tm.isOverrideByRole[role];
                    return (
                      <td key={t} style={cellStyle}>
                        <select value={val} disabled={busy}
                          onChange={e => run(() => planSetMaterial(mergedBundle, bundle, sel, t, role, e.target.value))}
                          style={{ ...matSelect, opacity: busy ? 0.5 : 1, borderColor: isOv ? 'var(--accent, #82aaff)' : 'var(--border)' }}>
                          {cands.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {isOv && (
                          <div style={{ fontSize: 8, color: 'var(--accent, #82aaff)' }}>
                            override <span onClick={() => !busy && run(() => planClearMaterial(mergedBundle, bundle, sel, t, role))}
                              title="Revert to the canonical system" style={revertLink}>default</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TaskPicker open={!!taskPicker} phaseHint={taskPicker?.phase} onClose={() => setTaskPicker(null)} onPick={pickTask} />

      {modulePicker && (
        <div onClick={() => setModulePicker(null)} style={modalBackdrop}>
          <div onClick={e => e.stopPropagation()} style={modalPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Add a module at {modulePicker.tier}</h3>
              <button className="btn btn-sm" onClick={() => setModulePicker(null)} style={{ fontSize: 11 }}>Close</button>
            </div>
            <ModulePicker drafts={moduleDrafts} value={[]} height={360}
              onChange={arr => { const id = arr[arr.length - 1]; if (id) pickModule(id); }} />
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' };
const inputStyle = { padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const thStyle = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };
const phaseStyle = { padding: '6px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)' };
const bannerStyle = { marginBottom: 10, padding: '6px 10px', fontSize: 11, color: 'var(--text)', background: 'rgba(130,170,255,0.08)', border: '1px solid var(--border)', borderRadius: 4 };
const emptyStyle = { padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 };
const cellStyle = { textAlign: 'center', padding: '4px 6px', userSelect: 'none' };
const mutedGlyph = { color: 'var(--text-muted)' };
const stepBtn = { fontSize: 12, lineHeight: 1, padding: '0 6px', cursor: 'pointer', background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const addCellBtn = { fontSize: 12, lineHeight: 1, padding: '0 7px', cursor: 'pointer', background: 'transparent', color: 'var(--accent, #82aaff)', border: '1px dashed var(--border)', borderRadius: 3 };
const removeBtn = { fontSize: 11, lineHeight: 1, marginLeft: 2, padding: '0 4px', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', border: 'none' };
const cellToggle = { fontSize: 12, lineHeight: 1, padding: '0 7px', cursor: 'pointer', background: 'transparent', border: 'none' };
const addSubRowLabel = { padding: '2px 10px 4px 26px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)' };
const tierTagNa = { fontSize: 8, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none' };
const tierTagBase = { fontSize: 8, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none' };
const tierTagFork = { fontSize: 8, fontWeight: 400, color: 'var(--accent, #82aaff)', textTransform: 'none' };
const revertLink = { cursor: 'pointer', textDecoration: 'underline' };
const matSelect = { maxWidth: 150, padding: '2px 4px', fontSize: 10, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const modalBackdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalPanel = { width: 560, maxWidth: '92vw', maxHeight: '80vh', overflow: 'auto', background: 'var(--bg-panel, #1a1a1a)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 };

// QT Builder — editable tier ladder (Phase 2a–2c). Pick Substrate / Method /
// State / Coating. Click a served-tier cell to toggle whether a task fires at
// that tier (module drafts); step finish coats per tier (scenario drafts). All
// edits autosave and go live via the overlay; publish from the Drafts tab.
// Derivation + compile live in ./qt-builder/*.

import { Fragment, useMemo, useState, useRef } from 'react';
import bundle from '../../data/scenario-bundle.gen.js';
import { listSubstrates, listDimensions, deriveTierLadder } from './qt-builder/derive-tier-ladder.js';
import { mergeModuleDrafts, setTierMembership, addTaskEntry } from './qt-builder/edit-tier-ladder.js';
import { mergeScenarioDrafts, setFinishCoats, deriveTierCoats } from './qt-builder/tier-coats.js';
import { mergeTaskDrafts, effectiveTierRates, setTierRate, rateEditable } from './qt-builder/tier-rates.js';
import { deriveTierQtFactors, setQtFactor, clearQtFactor } from './qt-builder/tier-qt-factor.js';
import TaskPicker from './TaskPicker.jsx';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';
import { useScenarioDrafts } from '../../hooks/useScenarioDrafts.js';
import { useTaskDrafts } from '../../hooks/useTaskDrafts.js';

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/^SS_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const isActive = (d) => d.status === 'draft' || d.status === 'local_override';

const CELL = {
  fires: { icon: '✓', color: 'var(--text)' },
  added: { icon: '+', color: 'var(--accent, #82aaff)' },
  skip:  { icon: '·', color: 'var(--text-muted)' },
  na:    { icon: '—', color: 'var(--text-muted)' },
};

export default function QTBuilder() {
  const { drafts: moduleDrafts, save: saveModule } = useModuleDrafts();
  const { drafts: scenarioDrafts, save: saveScenario } = useScenarioDrafts();
  const { drafts: taskDrafts, save: saveTask, remove: removeTask } = useTaskDrafts();

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
      tasks: mergeTaskDrafts(bundle.tasks, taskDrafts),
    }),
    [moduleDrafts, scenarioDrafts, taskDrafts]
  );

  const sel = { paintable_item: substrate, application_method: effMethod, substrate_state: effState, coating_type: effCoating };

  const ladder = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveTierLadder(mergedBundle, sel);
  }, [mergedBundle, substrate, effMethod, effState, effCoating]);

  const tierCoats = useMemo(() => {
    if (!ladder) return {};
    return deriveTierCoats(mergedBundle, sel);
  }, [mergedBundle, ladder, substrate, effMethod, effState, effCoating]);

  const tierQtFactors = useMemo(() => {
    if (!ladder) return {};
    return deriveTierQtFactors(mergedBundle, sel);
  }, [mergedBundle, ladder, substrate, effMethod, effState, effCoating]);

  const [expanded, setExpanded] = useState(null); // task_id whose rate editor is open

  const tiers = ladder?.tiers || [];
  const served = ladder?.served || [];

  const scenarioRefCount = useMemo(() => {
    const counts = new Map();
    for (const s of bundle.scenarios || []) for (const m of s.modules || []) counts.set(m, (counts.get(m) || 0) + 1);
    return counts;
  }, []);

  const activeDraftCount = moduleDrafts.filter(isActive).length + scenarioDrafts.filter(isActive).length + taskDrafts.filter(isActive).length;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  function coatsShared(tier) {
    const id = tierCoats[tier]?.scenarioId;
    return id && served.some(t => t !== tier && tierCoats[t]?.scenarioId === id);
  }

  async function toggleCell(row, tier) {
    if (!served.includes(tier) || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const firing = new Set(served.filter(t => row.cells[t] === 'fires' || row.cells[t] === 'added'));
      if (firing.has(tier)) firing.delete(tier); else firing.add(tier);
      const desired = [...firing];
      for (const moduleId of row.moduleIds) {
        const mod = mergedBundle.modules[moduleId];
        if (!mod) continue;
        const updated = setTierMembership(mod, row.task_id, desired, served);
        if (updated !== mod) await saveModule({ id: moduleId, payload: updated, status: 'draft' });
      }
    } catch (e) { console.error('QT Builder: toggle failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function changeCoats(tier, newCount) {
    if (busyRef.current || newCount < 1) return;
    const tc = tierCoats[tier];
    if (!tc) return;
    const scn = mergedBundle.scenarios.find(s => s.scenario_id === tc.scenarioId);
    if (!scn) return;
    busyRef.current = true; setBusy(true);
    try {
      const updated = setFinishCoats(scn, mergedBundle.modules, newCount);
      if (updated !== scn) await saveScenario({ id: scn.scenario_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: coats change failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function firingTiersFor(row) {
    return served.filter(t => row.cells[t] === 'fires' || row.cells[t] === 'added');
  }

  async function changeRate(row, tier, value) {
    if (busyRef.current) return;
    const task = mergedBundle.tasks[row.task_id];
    if (!task) return;
    busyRef.current = true; setBusy(true);
    try {
      const updated = setTierRate(task, tier, value, firingTiersFor(row), mergedBundle);
      if (updated !== task) await saveTask({ id: row.task_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: rate change failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function resetRate(row) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await removeTask(row.task_id); }
    catch (e) { console.error('QT Builder: rate reset failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function changeQtFactor(tier, value) {
    if (busyRef.current) return;
    const qf = tierQtFactors[tier];
    if (!qf) return;
    const scn = mergedBundle.scenarios.find(s => s.scenario_id === qf.scenarioId);
    if (!scn) return;
    busyRef.current = true; setBusy(true);
    try {
      const updated = setQtFactor(scn, tier, value);
      if (updated !== scn) await saveScenario({ id: scn.scenario_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: QT factor change failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function clearQt(tier) {
    if (busyRef.current) return;
    const qf = tierQtFactors[tier];
    if (!qf) return;
    const scn = mergedBundle.scenarios.find(s => s.scenario_id === qf.scenarioId);
    if (!scn) return;
    busyRef.current = true; setBusy(true);
    try {
      const updated = clearQtFactor(scn, tier);
      if (updated !== scn) await saveScenario({ id: scn.scenario_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: QT factor clear failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const [picker, setPicker] = useState(null);

  async function addTask(task_id) {
    if (!picker || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const mod = mergedBundle.modules[picker.moduleId];
      if (mod) {
        const updated = addTaskEntry(mod, task_id, served);
        if (updated !== mod) await saveModule({ id: picker.moduleId, payload: updated, status: 'draft' });
      }
    } catch (e) { console.error('QT Builder: add failed', e); }
    finally { busyRef.current = false; setBusy(false); setPicker(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={labelStyle}>Substrate
          <select value={substrate} onChange={e => setSubstrate(e.target.value)} style={{ ...inputStyle, width: 180 }}>
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
        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingBottom: 4 }}>toggle cells · step coats</div>
      </div>

      {activeDraftCount > 0 && (
        <div style={bannerStyle}>
          {activeDraftCount} draft{activeDraftCount === 1 ? '' : 's'} — live in estimates now. Publish from the Drafts tab.
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        <span><b style={{ color: 'var(--text)' }}>✓</b> fires</span>
        <span><b style={{ color: 'var(--accent, #82aaff)' }}>+</b> added at tier</span>
        <span><b>·</b> skipped</span>
        <span><b>—</b> tier not served</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
        {!ladder ? (
          <div style={emptyStyle}>Pick a substrate, method, and state.</div>
        ) : ladder.groups.length === 0 ? (
          <div style={emptyStyle}>No scenario matched this combination.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ ...thStyle, textAlign: 'left', width: 320 }}>Task</th>
                {tiers.map(t => (
                  <th key={t} style={thStyle}>
                    {t}
                    {t === ladder.baseline && <span style={baselineBadge}>baseline</span>}
                    {!served.includes(t) && <div style={{ fontSize: 8, fontWeight: 400 }}>n/a</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '6px 10px', fontWeight: 500, color: 'var(--text-muted)' }}>Finish coats</td>
                {tiers.map(t => {
                  const tc = tierCoats[t];
                  if (!tc || tc.finishCoats === 0) return <td key={t} style={coatsCellStyle}><span style={{ color: 'var(--text-muted)' }}>—</span></td>;
                  return (
                    <td key={t} style={coatsCellStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button style={{ ...stepBtn, opacity: busy ? 0.4 : 1 }} disabled={busy || tc.finishCoats <= 1} onClick={() => changeCoats(t, tc.finishCoats - 1)}>−</button>
                        <b>{tc.finishCoats}</b>
                        <button style={{ ...stepBtn, opacity: busy ? 0.4 : 1 }} disabled={busy} onClick={() => changeCoats(t, tc.finishCoats + 1)}>+</button>
                      </span>
                      {coatsShared(t) && <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>shared</div>}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Interstage rounds</td>
                {tiers.map(t => <td key={t} style={coatsCellStyle}>{tierCoats[t] ? tierCoats[t].interstageRounds : '—'}</td>)}
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }} title="Per-tier FAC_QT time multiplier for this substrate scenario">QT time multiplier</td>
                {tiers.map(t => {
                  const qf = tierQtFactors[t];
                  if (!qf) return <td key={t} style={coatsCellStyle}><span style={{ color: 'var(--text-muted)' }}>—</span></td>;
                  return (
                    <td key={t} style={coatsCellStyle}>
                      <input type="number" step="0.05" min="0.1"
                        key={`qf:${t}:${qf.value}:${qf.isOverride}`} defaultValue={qf.value} disabled={busy}
                        onBlur={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v) && v > 0 && v !== qf.value) changeQtFactor(t, v); }}
                        style={{ ...qtInput, opacity: busy ? 0.5 : 1 }} />
                      {qf.isOverride && (
                        <div style={{ fontSize: 8, color: 'var(--accent, #82aaff)' }}>
                          override <span onClick={() => !busy && clearQt(t)} title="Revert to global FAC_QT" style={{ cursor: 'pointer', textDecoration: 'underline' }}>×</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {ladder.groups.map(group => (
                <Fragment key={group.phase}>
                  <tr><td colSpan={tiers.length + 1} style={phaseStyle}>{humanize(group.phase)}</td></tr>
                  {group.rows.map(r => {
                    const shared = Math.max(1, ...r.moduleIds.map(m => scenarioRefCount.get(m) || 1));
                    const task = mergedBundle.tasks[r.task_id];
                    const ed = rateEditable(task);
                    const isOpen = expanded === r.task_id;
                    const firing = firingTiersFor(r);
                    const seed = isOpen ? effectiveTierRates(task, firing, mergedBundle) : null;
                    return (
                      <Fragment key={r.task_id}>
                      <tr style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                          <button onClick={() => ed.editable && setExpanded(isOpen ? null : r.task_id)}
                                  disabled={!ed.editable} title={ed.editable ? 'Per-tier rate' : ed.reason}
                                  style={{ ...expandBtn, cursor: ed.editable ? 'pointer' : 'default', opacity: ed.editable ? 1 : 0.25 }}>
                            {isOpen ? '▾' : '▸'}
                          </button>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.task_id}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{r.name}</span>
                          {shared > 1 && <span style={sharedBadge} title={`Edits to this task's module affect ${shared} scenario(s) that reference it, including this view.`}>shared ×{shared}</span>}
                        </td>
                        {tiers.map(t => {
                          const c = CELL[r.cells[t]] || CELL.na;
                          const editable = served.includes(t);
                          const hasRate = task?.rates_by_tier?.[t] != null;
                          return (
                            <td key={t}
                                onClick={editable && !busy ? () => toggleCell(r, t) : undefined}
                                title={editable ? 'Click to toggle this tier' : 'Tier not served'}
                                style={{ textAlign: 'center', padding: '6px 8px', color: c.color, fontWeight: r.cells[t] === 'added' ? 600 : 400, cursor: editable && !busy ? 'pointer' : 'default', userSelect: 'none' }}>
                              {c.icon}
                              {hasRate && <span style={ratePill} title={`Per-tier rate set at ${t}`}>$</span>}
                            </td>
                          );
                        })}
                      </tr>
                      {isOpen && (
                        <tr style={{ background: 'rgba(130,170,255,0.05)' }}>
                          <td style={{ padding: '4px 10px 8px 30px', fontSize: 10, color: 'var(--text-muted)' }}>
                            per-tier rate ({task?.uom || 'unit'}/hr) · FAC_QT off for this task
                            {task?.rates_by_tier && <span onClick={() => !busy && resetRate(r)} title="Drop the draft, revert to canonical" style={{ marginLeft: 8, cursor: 'pointer', textDecoration: 'underline' }}>reset</span>}
                          </td>
                          {tiers.map(t => {
                            if (!firing.includes(t)) return <td key={t} style={coatsCellStyle}><span style={{ color: 'var(--text-muted)' }}>—</span></td>;
                            return (
                              <td key={t} style={coatsCellStyle}>
                                <input type="number" step="1" min="1"
                                  key={`rate:${r.task_id}:${t}:${seed.byTier[t]}`} defaultValue={seed.byTier[t]} disabled={busy}
                                  onBlur={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v) && v > 0 && v !== seed.byTier[t]) changeRate(r, t, v); }}
                                  style={{ ...qtInput, opacity: busy ? 0.5 : 1 }} />
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                  <tr>
                    <td colSpan={tiers.length + 1} style={addRowStyle}
                        onClick={() => setPicker({ phase: group.phase, moduleId: group.rows[0].moduleIds[0] })}>
                      + Add task to {humanize(group.phase)}…
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ladder?.warnings?.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
          {ladder.warnings.length} matcher note(s) — first: {ladder.warnings[0]}
        </div>
      )}
      <TaskPicker open={!!picker} phaseHint={picker?.phase} onClose={() => setPicker(null)} onPick={addTask} />
    </div>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' };
const inputStyle = { padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const thStyle = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };
const phaseStyle = { padding: '6px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)' };
const baselineBadge = { marginLeft: 6, fontSize: 8, fontWeight: 400, padding: '0 5px', borderRadius: 8, background: 'rgba(130,170,255,0.2)', color: 'var(--accent, #82aaff)', textTransform: 'none' };
const sharedBadge = { marginLeft: 8, fontSize: 9, padding: '0 5px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-muted)' };
const bannerStyle = { marginBottom: 10, padding: '6px 10px', fontSize: 11, color: 'var(--text)', background: 'rgba(130,170,255,0.08)', border: '1px solid var(--border)', borderRadius: 4 };
const emptyStyle = { padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 };
const addRowStyle = { padding: '5px 10px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', borderTop: '1px solid var(--border)' };
const coatsCellStyle = { textAlign: 'center', padding: '6px 8px' };
const stepBtn = { fontSize: 12, lineHeight: 1, padding: '0 6px', cursor: 'pointer', background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const qtInput = { width: 50, padding: '2px 4px', fontSize: 10, textAlign: 'center', background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const ratePill = { marginLeft: 4, fontSize: 8, color: 'var(--accent, #82aaff)', verticalAlign: 'super' };
const expandBtn = { fontSize: 10, lineHeight: 1, marginRight: 6, padding: '0 4px', background: 'transparent', color: 'var(--text-muted)', border: 'none' };

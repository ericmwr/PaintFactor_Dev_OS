// QT Builder — editable tier ladder (Phase 2b). Pick Substrate / Method /
// State / Coating; click a served-tier cell to toggle whether that task fires
// at that tier. Edits compile to applies_when.quality_tier on the task's
// module entry and autosave as module drafts (live via overlay; publish from
// the Drafts tab). Derivation + compile live in ./qt-builder/*.

import { Fragment, useMemo, useState, useRef } from 'react';
import bundle from '../../data/scenario-bundle.gen.js';
import { listSubstrates, listDimensions, deriveTierLadder } from './qt-builder/derive-tier-ladder.js';
import { mergeModuleDrafts, setTierMembership, addTaskEntry } from './qt-builder/edit-tier-ladder.js';
import TaskPicker from './TaskPicker.jsx';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/^SS_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const CELL = {
  fires: { icon: '✓', color: 'var(--text)' },
  added: { icon: '+', color: 'var(--accent, #82aaff)' },
  skip:  { icon: '·', color: 'var(--text-muted)' },
  na:    { icon: '—', color: 'var(--text-muted)' },
};

export default function QTBuilder() {
  const { drafts: moduleDrafts, save } = useModuleDrafts();

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

  // Merge active module drafts over canonical so edits appear immediately.
  const mergedBundle = useMemo(
    () => ({ ...bundle, modules: mergeModuleDrafts(bundle.modules, moduleDrafts) }),
    [moduleDrafts]
  );

  const ladder = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveTierLadder(mergedBundle, {
      paintable_item: substrate, application_method: effMethod,
      substrate_state: effState, coating_type: effCoating,
    });
  }, [mergedBundle, substrate, effMethod, effState, effCoating]);

  const tiers = ladder?.tiers || [];
  const served = ladder?.served || [];

  // Blast radius: how many scenarios reference each module (canonical structure).
  const scenarioRefCount = useMemo(() => {
    const counts = new Map();
    for (const s of bundle.scenarios || []) for (const m of s.modules || []) counts.set(m, (counts.get(m) || 0) + 1);
    return counts;
  }, []);

  const activeDraftCount = moduleDrafts.filter(d => d.status === 'draft' || d.status === 'local_override').length;

  const busyRef = useRef(false);

  async function toggleCell(row, tier) {
    if (!served.includes(tier) || busyRef.current) return;
    busyRef.current = true;
    try {
      const firing = new Set(served.filter(t => row.cells[t] === 'fires' || row.cells[t] === 'added'));
      if (firing.has(tier)) firing.delete(tier); else firing.add(tier);
      const desired = [...firing];
      for (const moduleId of row.moduleIds) {
        const mod = mergedBundle.modules[moduleId];
        if (!mod) continue;
        const updated = setTierMembership(mod, row.task_id, desired, served);
        if (updated !== mod) await save({ id: moduleId, payload: updated, status: 'draft' });
      }
    } catch (e) { console.error('QT Builder: toggle failed', e); }
    finally { busyRef.current = false; }
  }

  const [picker, setPicker] = useState(null); // { phase, moduleId } | null

  async function addTask(task_id) {
    if (!picker || busyRef.current) { setPicker(null); return; }
    busyRef.current = true;
    try {
      const mod = mergedBundle.modules[picker.moduleId];
      if (mod) {
        const updated = addTaskEntry(mod, task_id, served);
        if (updated !== mod) await save({ id: picker.moduleId, payload: updated, status: 'draft' });
      }
    } catch (e) { console.error('QT Builder: add failed', e); }
    finally { busyRef.current = false; setPicker(null); }
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
        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingBottom: 4 }}>click a served-tier cell to toggle</div>
      </div>

      {activeDraftCount > 0 && (
        <div style={bannerStyle}>
          {activeDraftCount} module draft{activeDraftCount === 1 ? '' : 's'} — live in estimates now. Publish from the Drafts tab.
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
        ) : ladder.rows.length === 0 ? (
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
              {ladder.groups.map(group => (
                <Fragment key={group.phase}>
                  <tr><td colSpan={tiers.length + 1} style={phaseStyle}>{humanize(group.phase)}</td></tr>
                  {group.rows.map(r => {
                    const shared = Math.max(1, ...r.moduleIds.map(m => scenarioRefCount.get(m) || 1));
                    return (
                      <tr key={r.task_id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.task_id}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{r.name}</span>
                          {shared > 1 && <span style={sharedBadge} title={`This task's module is shared by ${shared} scenarios — edits affect all of them.`}>shared ×{shared}</span>}
                        </td>
                        {tiers.map(t => {
                          const c = CELL[r.cells[t]] || CELL.na;
                          const editable = served.includes(t);
                          return (
                            <td key={t}
                                onClick={editable ? () => toggleCell(r, t) : undefined}
                                title={editable ? 'Click to toggle this tier' : 'Tier not served'}
                                style={{ textAlign: 'center', padding: '6px 8px', color: c.color, fontWeight: r.cells[t] === 'added' ? 600 : 400, cursor: editable ? 'pointer' : 'default', userSelect: 'none' }}>
                              {c.icon}
                            </td>
                          );
                        })}
                      </tr>
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

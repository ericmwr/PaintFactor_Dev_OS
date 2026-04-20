// Module editor — atomic task bundle CRUD.
//
// Saves go to IndexedDB (module_drafts store). The overlay-loader
// merges active drafts over the canonical scenario bundle at estimate
// time, so an edit here is immediately visible in ScenarioEnginePanel
// on the next estimate run (current session requires a reload to
// re-merge — acceptable for admin work).
//
// Publish flow (Phase E) will flip status to 'published' and POST the
// JSON to the dev-only publish endpoint.

import { useState, useEffect } from 'react';
import ModifierImpactPreview from './ModifierImpactPreview.jsx';
import TaskPicker from './TaskPicker.jsx';
import canonicalBundle from '../../data/scenario-bundle.gen.js';

const RARE_OVERRIDE_FIELDS = ['ps_key', 'uom', 'skill_level', 'name'];

const PHASE_OPTIONS = ['setup', 'prep', 'prime', 'apply', 'finish', 'interstage', 'cleanup'];
const MODIFIER_KEYS = ['qt', 'height', 'texture', 'complexity', 'condition', 'access', 'coat'];

const EMPTY_TASK = {
  task_id: '',
  name: '',
  ps_key: '',
  uom: 'SF',
  skill_level: 'general',
  rate_per_hour: 0,
  applies_when: null,
};

function cloneEmptyTask() {
  return JSON.parse(JSON.stringify(EMPTY_TASK));
}

function emptyModule() {
  return {
    id: '',
    payload: {
      module_id: '',
      name: '',
      phase: 'apply',
      intent: '',
      tasks: [cloneEmptyTask()],
      modifier_eligibility: MODIFIER_KEYS.reduce((m, k) => ({ ...m, [k]: false }), {}),
      doctrine: '',
    },
    status: 'draft',
  };
}

export default function ModuleEditor({ draft, onSave, onCancel, onPublish }) {
  const [record, setRecord] = useState(() => draft ? structuredClone(draft) : emptyModule());
  const [dirty, setDirty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Track which rare-field overrides are revealed per task-index (variant B
  // pattern — user clicks "override" to reveal an input, otherwise canonical
  // value is shown read-only).
  const [revealedOverrides, setRevealedOverrides] = useState({}); // { [taskIdx]: Set<fieldName> }

  useEffect(() => {
    setRecord(draft ? structuredClone(draft) : emptyModule());
    setDirty(false);
  }, [draft]);

  const payload = record.payload;

  const update = (mut) => {
    setRecord(prev => {
      const next = structuredClone(prev);
      mut(next);
      return next;
    });
    setDirty(true);
  };

  const updatePayload = (mut) => update(r => mut(r.payload));

  const handleHeaderChange = (field, value) => {
    updatePayload(p => { p[field] = value; });
    // Sync id + module_id
    if (field === 'module_id') {
      update(r => { r.id = value; r.payload.module_id = value; });
    }
  };

  const handleTaskChange = (idx, field, value) => {
    updatePayload(p => {
      if (field === 'rate_per_hour') {
        p.tasks[idx][field] = parseFloat(value) || 0;
      } else if (field === 'coat_2_rate_multiplier') {
        // Store as string while typing — prevents parseFloat from interfering
        // with intermediate values like "1." or "1.2" when aiming for "1.25".
        // Normalized on blur (see handleTaskBlur).
        if (value === '' || value == null) {
          delete p.tasks[idx].coat_2_rate_multiplier;
        } else {
          p.tasks[idx].coat_2_rate_multiplier = value;
        }
      } else {
        p.tasks[idx][field] = value;
      }
    });
  };

  // Per-task modifier eligibility override. Tri-state: 'inherit' | 'on' | 'off'.
  // 'inherit' removes the key from task.modifier_eligibility (task follows module).
  // 'on' / 'off' set task.modifier_eligibility[key] to true/false respectively,
  // overriding the module's setting just for this task.
  // If the task's override object becomes empty, remove it entirely.
  const setTaskEligibilityOverride = (idx, key, mode) => {
    updatePayload(p => {
      const task = p.tasks[idx];
      const current = task.modifier_eligibility || {};
      if (mode === 'inherit') {
        delete current[key];
      } else {
        current[key] = (mode === 'on');
      }
      if (Object.keys(current).length === 0) {
        delete task.modifier_eligibility;
      } else {
        task.modifier_eligibility = current;
      }
    });
  };

  // On blur: coerce coat_2_rate_multiplier to a number. If blank/invalid/1.0,
  // remove the field entirely so the task uses the default (coat 2 = coat 1).
  const handleCoat2Blur = (idx) => {
    updatePayload(p => {
      const raw = p.tasks[idx].coat_2_rate_multiplier;
      if (raw === undefined || raw === '') return;
      const n = parseFloat(raw);
      if (isNaN(n) || n === 1 || n <= 0) {
        delete p.tasks[idx].coat_2_rate_multiplier;
      } else {
        p.tasks[idx].coat_2_rate_multiplier = n;
      }
    });
  };

  const addTask = () => updatePayload(p => { p.tasks.push(cloneEmptyTask()); });
  const addLibraryTask = (taskId) => updatePayload(p => { p.tasks.push({ task_ref: taskId }); });
  const removeTask = (idx) => updatePayload(p => { p.tasks.splice(idx, 1); });

  // ── Library task helpers ──

  const getCanonicalTask = (taskRef) => {
    return canonicalBundle.tasks?.[taskRef] || null;
  };

  const isLibraryTask = (t) => !!t.task_ref;

  /**
   * For library tasks, compute the effective value: override from entry
   * if set, otherwise canonical. Returns { value, isOverride }.
   */
  const resolveLibraryField = (t, field) => {
    if (Object.prototype.hasOwnProperty.call(t, field)) {
      return { value: t[field], isOverride: true };
    }
    const canon = getCanonicalTask(t.task_ref);
    return { value: canon ? canon[field] : undefined, isOverride: false };
  };

  /**
   * Set (or clear) an override on a library task entry.
   * Value === '' or null clears the override (entry reverts to canonical).
   */
  const setLibraryOverride = (idx, field, value) => {
    updatePayload(p => {
      const t = p.tasks[idx];
      if (value === '' || value == null) {
        delete t[field];
      } else if (field === 'rate_per_hour') {
        const n = parseFloat(value);
        if (isNaN(n) || n <= 0) delete t[field];
        else t[field] = n;
      } else {
        t[field] = value;
      }
    });
  };

  const toggleRevealedOverride = (idx, field) => {
    setRevealedOverrides(prev => {
      const next = { ...prev };
      const cur = new Set(next[idx] || []);
      if (cur.has(field)) {
        cur.delete(field);
        // If removing reveal, also clear the override itself
        updatePayload(p => { delete p.tasks[idx][field]; });
      } else {
        cur.add(field);
      }
      next[idx] = cur;
      return next;
    });
  };

  const toggleModEligibility = (key) => updatePayload(p => {
    p.modifier_eligibility = { ...p.modifier_eligibility, [key]: !p.modifier_eligibility[key] };
  });

  const handleSave = async () => {
    if (!record.id) { alert('Module ID is required'); return; }
    const toSave = { ...record, id: record.id || payload.module_id };
    await onSave(toSave);
    setDirty(false);
  };

  const handleAppliesWhenEdit = (idx, text) => {
    updatePayload(p => {
      try {
        p.tasks[idx].applies_when = text.trim() ? JSON.parse(text) : null;
      } catch {
        // Leave previous value; user is still typing
      }
    });
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <TaskPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addLibraryTask}
        phaseHint={payload.phase}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{draft ? 'Edit Module' : 'New Module'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={labelStyle}>
              Module ID
              <input
                style={inputStyle}
                placeholder="MOD_APPLY_..."
                value={payload.module_id}
                onChange={e => handleHeaderChange('module_id', e.target.value)}
                disabled={!!(draft?.payload?.module_id || draft?.module_id)}
              />
            </label>
            <label style={labelStyle}>
              Phase
              <select style={inputStyle} value={payload.phase} onChange={e => handleHeaderChange('phase', e.target.value)}>
                {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <label style={{ ...labelStyle, marginTop: 8 }}>
            Display Name
            <input style={inputStyle} value={payload.name} onChange={e => handleHeaderChange('name', e.target.value)} />
          </label>
          <label style={{ ...labelStyle, marginTop: 8 }}>
            Intent
            <textarea
              style={{ ...inputStyle, minHeight: 50, fontFamily: 'inherit' }}
              value={payload.intent}
              onChange={e => handleHeaderChange('intent', e.target.value)}
            />
          </label>
        </div>

        {/* Tasks */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>TASKS ({payload.tasks.length})</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-accent" onClick={addTask} style={{ fontSize: 10 }}>+ Inline Task</button>
              <button className="btn btn-sm" onClick={() => setPickerOpen(true)} style={{ fontSize: 10 }}>+ From Library</button>
            </div>
          </div>
          {payload.tasks.map((t, idx) => (
            isLibraryTask(t)
              ? <LibraryTaskRow
                  key={idx}
                  idx={idx}
                  entry={t}
                  canonical={getCanonicalTask(t.task_ref)}
                  revealed={revealedOverrides[idx] || new Set()}
                  onRateChange={(v) => setLibraryOverride(idx, 'rate_per_hour', v)}
                  onFieldChange={(field, v) => setLibraryOverride(idx, field, v)}
                  onToggleReveal={(field) => toggleRevealedOverride(idx, field)}
                  onRemove={() => removeTask(idx)}
                />
              : (
            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, marginBottom: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 9, padding: '1px 5px', background: '#555', color: '#fff', borderRadius: 2 }}>inline</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  self-contained task definition in this module
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: 6, alignItems: 'end' }}>
                <label style={labelStyle}>
                  Task ID
                  <input style={inputStyle} value={t.task_id} onChange={e => handleTaskChange(idx, 'task_id', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  PS Key
                  <input style={inputStyle} value={t.ps_key} onChange={e => handleTaskChange(idx, 'ps_key', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  UOM
                  <select style={inputStyle} value={t.uom} onChange={e => handleTaskChange(idx, 'uom', e.target.value)}>
                    {['SF', 'LF', 'EA', 'MINS', 'HRS'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Rate/hr (coat 1)
                  <input style={inputStyle} type="number" step="0.01" value={t.rate_per_hour} onChange={e => handleTaskChange(idx, 'rate_per_hour', e.target.value)} />
                </label>
                <label style={labelStyle} title="Coat 2 rate = Rate/hr × this. Leave blank if same as coat 1. e.g. 1.25 = coat 2 is 25% faster.">
                  Coat 2 ×
                  <input
                    style={inputStyle}
                    type="text"
                    inputMode="decimal"
                    placeholder="1.0"
                    value={t.coat_2_rate_multiplier ?? ''}
                    onChange={e => handleTaskChange(idx, 'coat_2_rate_multiplier', e.target.value)}
                    onBlur={() => handleCoat2Blur(idx)}
                  />
                </label>
                <button className="btn btn-sm" onClick={() => removeTask(idx)} style={{ color: '#e74c3c', fontSize: 10 }}>X</button>
              </div>
              <label style={{ ...labelStyle, marginTop: 6 }}>
                Name
                <input style={inputStyle} value={t.name} onChange={e => handleTaskChange(idx, 'name', e.target.value)} />
              </label>
              <label style={{ ...labelStyle, marginTop: 6 }}>
                applies_when (JSON)
                <textarea
                  style={{ ...inputStyle, minHeight: 32, fontFamily: 'var(--font-mono)', fontSize: 10 }}
                  placeholder='e.g. {"height_band": "high"}'
                  defaultValue={t.applies_when ? JSON.stringify(t.applies_when) : ''}
                  onBlur={e => handleAppliesWhenEdit(idx, e.target.value)}
                />
              </label>

              {/* Per-task modifier eligibility — tri-state per modifier. 'inherit' follows
                  the module-level checkboxes below; on/off overrides for this task only. */}
              <div style={{ marginTop: 8, padding: 6, border: '1px dashed var(--border)', borderRadius: 3, background: 'rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Task modifier overrides
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 4 }}>
                  {MODIFIER_KEYS.map(k => {
                    const taskEl = t.modifier_eligibility || {};
                    const hasOverride = Object.prototype.hasOwnProperty.call(taskEl, k);
                    const mode = !hasOverride ? 'inherit' : (taskEl[k] ? 'on' : 'off');
                    const moduleVal = !!payload.modifier_eligibility?.[k];
                    const inheritLabel = `inherit (${moduleVal ? 'on' : 'off'})`;
                    const isOverridden = hasOverride;
                    return (
                      <label key={k} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 70, fontFamily: 'var(--font-mono)', fontSize: 10, color: isOverridden ? 'var(--accent, #82aaff)' : 'var(--text-muted)' }}>
                          {k}
                        </span>
                        <select
                          value={mode}
                          onChange={e => setTaskEligibilityOverride(idx, k, e.target.value)}
                          style={{
                            flex: 1,
                            padding: '2px 4px',
                            fontSize: 10,
                            background: 'var(--bg-input, #222)',
                            color: isOverridden ? 'var(--accent, #82aaff)' : 'var(--text)',
                            border: `1px solid ${isOverridden ? 'var(--accent, #82aaff)' : 'var(--border)'}`,
                            borderRadius: 2,
                          }}
                          title={isOverridden ? 'Task overrides the module setting' : 'Task follows the module setting'}
                        >
                          <option value="inherit">{inheritLabel}</option>
                          <option value="on">on</option>
                          <option value="off">off</option>
                        </select>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
              )
          ))}
        </div>

        {/* Modifier eligibility */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>MODIFIER ELIGIBILITY</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODIFIER_KEYS.map(k => (
              <label key={k} style={{ fontSize: 11, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!payload.modifier_eligibility?.[k]}
                  onChange={() => toggleModEligibility(k)}
                />{' '}{k}
              </label>
            ))}
          </div>
        </div>

        <label style={labelStyle}>
          Doctrine (notes)
          <textarea
            style={{ ...inputStyle, minHeight: 40, fontFamily: 'inherit' }}
            value={payload.doctrine || ''}
            onChange={e => handleHeaderChange('doctrine', e.target.value)}
          />
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'sticky', bottom: 0, background: 'var(--bg-panel)', padding: '8px 0' }}>
          <button className="btn btn-accent" onClick={handleSave} disabled={!dirty && !!draft}>
            {dirty ? 'Save Draft' : 'Saved'}
          </button>
          {onPublish && (
            <button className="btn" onClick={() => onPublish(record)} disabled={dirty}>
              Publish to JSON
            </button>
          )}
          <button className="btn" onClick={onCancel}>Cancel</button>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
            status: <strong>{record.status}</strong>
          </span>
        </div>
      </div>

      {/* Right panel: impact preview + JSON */}
      <div style={{ width: 360, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 12, overflowY: 'auto' }}>
        <ModifierImpactPreview modulePayload={payload} />
        <h4 style={{ margin: '12px 0 8px', fontSize: 11, color: 'var(--text-muted)' }}>JSON PREVIEW</h4>
        <pre style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4, overflow: 'auto', margin: 0 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
};
const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: 2,
  padding: '4px 6px',
  fontSize: 12,
  background: 'var(--bg-input, #222)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 3,
};

// ── Library task row ──
//
// Compact block for task_ref entries. Variant A UX for rate_per_hour (inline
// input with canonical shown faded). Variant B for rare fields (ps_key, uom,
// skill_level, name) — canonical shown read-only until user clicks "override".
function LibraryTaskRow({ idx, entry, canonical, revealed, onRateChange, onFieldChange, onToggleReveal, onRemove }) {
  if (!canonical) {
    // Broken ref — missing from library
    return (
      <div style={{ border: '1px solid #e74c3c', borderRadius: 4, padding: 8, marginBottom: 6, fontSize: 12 }}>
        <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 4 }}>
          ⚠ Unresolved task_ref: <code>{entry.task_ref}</code>
        </div>
        <button className="btn btn-sm" onClick={onRemove} style={{ color: '#e74c3c', fontSize: 10 }}>Remove</button>
      </div>
    );
  }

  const canonRate = canonical.rate_per_hour;
  const overrideRate = Object.prototype.hasOwnProperty.call(entry, 'rate_per_hour') ? entry.rate_per_hour : null;
  const effectiveRate = overrideRate != null ? overrideRate : canonRate;

  return (
    <div style={{ border: '1px solid var(--accent, #82aaff)', borderRadius: 4, padding: 8, marginBottom: 6, fontSize: 12, background: 'rgba(130, 170, 255, 0.04)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--accent, #82aaff)', color: '#000', borderRadius: 2 }}>library</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{entry.task_ref}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>— {canonical.name}</span>
        <button className="btn btn-sm" onClick={onRemove} style={{ color: '#e74c3c', fontSize: 10, padding: '2px 6px' }}>X</button>
      </div>

      {/* Rate — Variant A: inline override with canonical shown faded */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, alignItems: 'end', marginBottom: 6 }}>
        <label style={libLabel}>
          Rate/hr{overrideRate != null && <span style={{ color: 'var(--accent, #82aaff)' }}> (override)</span>}
          <input
            style={{ ...libInput, fontWeight: overrideRate != null ? 600 : 400, color: overrideRate != null ? 'var(--accent, #82aaff)' : 'var(--text)' }}
            type="number"
            step="0.01"
            placeholder={`canonical: ${canonRate}`}
            value={overrideRate ?? ''}
            onChange={e => onRateChange(e.target.value)}
          />
          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
            canonical: {canonRate} {canonical.uom}/hr · effective: {effectiveRate} {canonical.uom}/hr
          </span>
        </label>
        <div style={{ fontSize: 11 }}>
          <div style={libLabel}>PS Key</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', padding: '4px 6px' }}>
            {entry.ps_key || canonical.ps_key}
          </div>
        </div>
        <div style={{ fontSize: 11 }}>
          <div style={libLabel}>UOM / Skill</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 6px' }}>
            {entry.uom || canonical.uom} · {entry.skill_level || canonical.skill_level}
          </div>
        </div>
      </div>

      {/* Rare-field overrides — Variant B: toggle to reveal */}
      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
          Overrides (rare)
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RARE_OVERRIDE_FIELDS.map(field => {
            const isRevealed = revealed.has(field);
            const hasOverride = Object.prototype.hasOwnProperty.call(entry, field);
            const showInput = isRevealed || hasOverride;
            return (
              <div key={field} style={{ flex: showInput ? '1 1 180px' : '0 0 auto' }}>
                {showInput ? (
                  <label style={libLabel}>
                    {field}{hasOverride && <span style={{ color: 'var(--accent, #82aaff)' }}> (override)</span>}
                    <input
                      style={{ ...libInput, color: hasOverride ? 'var(--accent, #82aaff)' : 'var(--text)' }}
                      placeholder={`canonical: ${canonical[field] ?? '—'}`}
                      value={entry[field] ?? ''}
                      onChange={e => onFieldChange(field, e.target.value)}
                    />
                    <button
                      onClick={() => onToggleReveal(field)}
                      style={{ fontSize: 9, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                      title="Hide and revert to canonical"
                    >clear override</button>
                  </label>
                ) : (
                  <button
                    onClick={() => onToggleReveal(field)}
                    style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      background: 'transparent',
                      border: '1px dashed var(--border)',
                      borderRadius: 3,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    title={`Override canonical ${field} (${canonical[field] ?? '—'})`}
                  >+ override {field}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const libLabel = {
  display: 'block',
  fontSize: 10,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
};
const libInput = {
  display: 'block',
  width: '100%',
  marginTop: 2,
  padding: '4px 6px',
  fontSize: 12,
  background: 'var(--bg-input, #222)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 3,
};

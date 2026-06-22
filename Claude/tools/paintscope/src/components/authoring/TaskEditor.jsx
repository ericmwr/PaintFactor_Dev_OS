// Editor for a single canonical task. Mirrors ModuleEditor layout.
// Saves go to IndexedDB (task_drafts store); publishing writes back to
// Claude/tasks/<TSK_*>.json (pipeline parallel to module publish).
//
// Changes here propagate to ALL modules using the task_ref — a banner
// near the top makes that consequence explicit, and the inline
// TaskUsagePanel shows which modules would be affected.

import { useState, useEffect } from 'react';
import TaskUsagePanel from './TaskUsagePanel.jsx';
import RenameTaskModal from './RenameTaskModal.jsx';
import PsKeyField from './PsKeyField.jsx';
import { AUTOFILL_UOMS } from '../../data/ps-key-catalog.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { archiveEntity, regenBundle } from '../../authoring/archive-ops.js';

function DerivedClassificationPanel({ taskId }) {
  if (!taskId) return null;
  const task = canonicalBundle.tasks?.[taskId];
  const d = task?._derived;
  if (!d) return null;

  const isOrphan = d.module_count === 0;

  return (
    <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--border)', borderRadius: 4, background: 'rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        <span>Derived classifications</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {d.module_count} mod · {d.scenario_count} scn
        </span>
      </div>
      {isOrphan ? (
        <div style={{ fontSize: 11, color: '#e74c3c', fontStyle: 'italic' }}>
          Orphan — no module references this task. Consider archiving, or wire it into a module.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: 11 }}>
          <DerivedRow label="Phase"     values={d.phases} />
          <DerivedRow label="Substrate" values={d.substrates} />
          <DerivedRow label="Method"    values={d.methods} />
          <DerivedRow label="Coating"   values={d.coatings} />
          <DerivedRow label="QT"        values={d.qts} />
          <DerivedRow label="Context"   values={d.buckets} />
        </div>
      )}
    </div>
  );
}

function DerivedRow({ label, values }) {
  return (
    <>
      <span style={{ color: 'var(--text-muted)', fontSize: 10, alignSelf: 'center' }}>{label}</span>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {values && values.length > 0
          ? values.map(v => (
              <span key={v} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                background: 'rgba(130, 170, 255, 0.12)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}>{v}</span>
            ))
          : <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 10 }}>—</span>}
      </span>
    </>
  );
}

const UOM_OPTIONS = ['SF', 'LF', 'EA', 'EA_SIDE', 'MINS', 'HRS'];
const SKILL_OPTIONS = ['general', 'experienced', 'qualified_painter', 'specialist'];
const PHASE_OPTIONS = ['setup', 'prep', 'prime', 'apply', 'finish', 'interstage', 'cleanup'];
const MODIFIER_KEYS = ['qt', 'height', 'texture', 'complexity', 'condition', 'overhead', 'material', 'access', 'coat'];
const TASK_CLASSIFICATIONS = ['', 'binary', 'qt_scaled'];

function emptyTask() {
  return {
    id: '',
    payload: {
      task_id: '',
      name: '',
      ps_key: '',
      uom: 'SF',
      skill_level: 'general',
      rate_per_hour: 0,
      doctrine: '',
    },
    status: 'draft',
  };
}

export default function TaskEditor({ draft, onSave, onCancel, onPublish, onNavigateToModule }) {
  const [record, setRecord] = useState(() => draft ? structuredClone(draft) : emptyTask());
  const [dirty, setDirty] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  useEffect(() => {
    setRecord(draft ? structuredClone(draft) : emptyTask());
    setDirty(false);
  }, [draft]);

  const payload = record.payload;

  const updatePayload = (mut) => {
    setRecord(prev => {
      const next = structuredClone(prev);
      mut(next.payload);
      return next;
    });
    setDirty(true);
  };

  const handleField = (field, value) => {
    updatePayload(p => {
      if (field === 'rate_per_hour' || field === 'fixed_minutes') {
        const n = parseFloat(value);
        if (isNaN(n) || n <= 0) delete p[field];
        else p[field] = n;
      } else if (field === 'coat_2_rate_multiplier') {
        if (value === '' || value == null) delete p.coat_2_rate_multiplier;
        else p.coat_2_rate_multiplier = value;
      } else if (field === 'task_classification') {
        if (!value) delete p.task_classification;
        else p.task_classification = value;
      } else {
        p[field] = value;
      }
    });
    if (field === 'task_id') {
      setRecord(prev => ({ ...prev, id: value }));
    }
  };

  const handleCoat2Blur = () => {
    updatePayload(p => {
      const raw = p.coat_2_rate_multiplier;
      if (raw === undefined || raw === '') return;
      const n = parseFloat(raw);
      if (isNaN(n) || n === 1 || n <= 0) delete p.coat_2_rate_multiplier;
      else p.coat_2_rate_multiplier = n;
    });
  };

  // Tri-state: 'inherit' (key absent — task follows the module's setting),
  // 'on' (true — task forces enabled), 'off' (false — task forces disabled).
  // Engine's resolveEligibility shallow-merges task over module, so explicit
  // on/off here overrides what any consuming module declares.
  const setEligibility = (key, mode) => {
    updatePayload(p => {
      const cur = { ...(p.modifier_eligibility || {}) };
      if (mode === 'inherit') delete cur[key];
      else cur[key] = (mode === 'on');
      if (Object.keys(cur).length === 0) delete p.modifier_eligibility;
      else p.modifier_eligibility = cur;
    });
  };

  const handleSave = async () => {
    if (!record.id || !payload.task_id) { alert('Task ID is required'); return; }
    const toSave = { ...record, id: payload.task_id };
    await onSave(toSave);
    setDirty(false);
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{draft?.id ? 'Edit Canonical Task' : 'New Canonical Task'}</h3>
          <div style={{
            padding: '6px 10px',
            background: 'rgba(224, 184, 74, 0.12)',
            border: '1px solid rgba(224, 184, 74, 0.5)',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--text)',
            marginBottom: 10,
          }}>
            Changes here propagate to every module that references this task via <code>task_ref</code>.
            Per-module overrides (set in the Module Editor) are unaffected.
          </div>
        </div>

        {/* Core fields */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
            <label style={labelStyle}>
              Task ID
              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="TSK_..."
                  value={payload.task_id}
                  onChange={e => handleField('task_id', e.target.value)}
                  disabled={!!draft?.payload?.task_id}
                />
                {payload.task_id && record.status !== 'new' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ fontSize: 10, padding: '0 8px', whiteSpace: 'nowrap' }}
                    title="Rename this task and cascade the new ID through every module that references it"
                    onClick={() => setRenameOpen(true)}
                  >Rename…</button>
                )}
              </div>
            </label>
            <label style={labelStyle}>
              Phase (optional)
              <select style={inputStyle} value={payload.phase || ''} onChange={e => handleField('phase', e.target.value || undefined)}>
                <option value="">—</option>
                {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <label style={{ ...labelStyle, marginTop: 8 }}>
            Display Name
            <input style={inputStyle} value={payload.name} onChange={e => handleField('name', e.target.value)} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginTop: 8 }}>
            <label style={labelStyle}>
              PS Key
              <PsKeyField
                value={payload.ps_key || ''}
                onChange={v => handleField('ps_key', v)}
                onSelect={entry => {
                  handleField('ps_key', entry.key);
                  if (AUTOFILL_UOMS.has(entry.uom)) handleField('uom', entry.uom);
                }}
              />
            </label>
            <label style={labelStyle}>
              UOM
              <select style={inputStyle} value={payload.uom} onChange={e => handleField('uom', e.target.value)}>
                {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              Skill
              <select style={inputStyle} value={payload.skill_level || 'general'} onChange={e => handleField('skill_level', e.target.value)}>
                {SKILL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Rate */}
        <div style={{ marginBottom: 12, padding: 8, border: '1px solid var(--border)', borderRadius: 4 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rate</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <label style={labelStyle}>
              Rate/hr (coat 1)
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={payload.rate_per_hour || ''}
                onChange={e => handleField('rate_per_hour', e.target.value)}
              />
            </label>
            <label style={labelStyle} title="Coat 2 rate = Rate/hr × this. Leave blank if same as coat 1.">
              Coat 2 ×
              <input
                style={inputStyle}
                type="text"
                inputMode="decimal"
                placeholder="1.0"
                value={payload.coat_2_rate_multiplier ?? ''}
                onChange={e => handleField('coat_2_rate_multiplier', e.target.value)}
                onBlur={handleCoat2Blur}
              />
            </label>
            <label style={labelStyle} title="Fixed-minutes task: quantity-less, no modifier applied.">
              Fixed minutes (alt)
              <input
                style={inputStyle}
                type="number"
                step="0.1"
                value={payload.fixed_minutes || ''}
                onChange={e => handleField('fixed_minutes', e.target.value)}
              />
            </label>
          </div>
          <label style={{ ...labelStyle, marginTop: 8 }}>
            Task classification
            <select
              style={inputStyle}
              value={payload.task_classification || ''}
              onChange={e => handleField('task_classification', e.target.value)}
            >
              {TASK_CLASSIFICATIONS.map(t => <option key={t} value={t}>{t || '—'}</option>)}
            </select>
          </label>
        </div>

        {/* Modifier eligibility — tri-state per key. Tasks inherit their
            module's setting by default; explicit on/off here overrides what
            any consuming module would otherwise apply. */}
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Modifier eligibility
          </h4>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
            Tasks inherit their module's eligibility by default. Set <b>on</b> to force enabled, <b>off</b> to force disabled — either overrides what any consuming module declares. Example: inspection tasks should be <b>off</b> for <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>overhead</code> and <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>height</code> so they don't slow down when their parent module is configured for ceiling/high-access work.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 4 }}>
            {MODIFIER_KEYS.map(k => {
              const taskEl = payload.modifier_eligibility || {};
              const hasOverride = Object.prototype.hasOwnProperty.call(taskEl, k);
              const mode = !hasOverride ? 'inherit' : (taskEl[k] ? 'on' : 'off');
              return (
                <label key={k} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 80, fontFamily: 'var(--font-mono)', fontSize: 10, color: hasOverride ? 'var(--accent, #82aaff)' : 'var(--text-muted)' }}>
                    {k}
                  </span>
                  <select
                    value={mode}
                    onChange={e => setEligibility(k, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '2px 4px',
                      fontSize: 10,
                      background: 'var(--bg-input, #222)',
                      color: hasOverride ? 'var(--accent, #82aaff)' : 'var(--text)',
                      border: `1px solid ${hasOverride ? 'var(--accent, #82aaff)' : 'var(--border)'}`,
                      borderRadius: 2,
                    }}
                    title={hasOverride ? 'Task forces this state regardless of module setting' : 'Task follows the module setting'}
                  >
                    <option value="inherit">inherit (module decides)</option>
                    <option value="on">on (force enabled)</option>
                    <option value="off">off (force disabled)</option>
                  </select>
                </label>
              );
            })}
          </div>
        </div>

        <label style={labelStyle}>
          Doctrine (notes)
          <textarea
            style={{ ...inputStyle, minHeight: 50, fontFamily: 'inherit' }}
            value={payload.doctrine || ''}
            onChange={e => handleField('doctrine', e.target.value)}
          />
        </label>

        {/* Derived classifications — populated at bundle build time by
            walking modules → scenarios. Read-only badges; the truth source
            is the reference graph, not this task. */}
        <DerivedClassificationPanel taskId={payload.task_id} />

        {/* Where used */}
        <TaskUsagePanel taskId={payload.task_id} onNavigateToModule={onNavigateToModule} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'sticky', bottom: 0, background: 'var(--bg-panel)', padding: '8px 0' }}>
          <button className="btn btn-accent" onClick={handleSave} disabled={!dirty && !!draft?.id}>
            {dirty ? 'Save Draft' : 'Saved'}
          </button>
          {onPublish && (
            <button className="btn" onClick={() => onPublish(record)} disabled={dirty}>
              Publish to JSON
            </button>
          )}
          <button className="btn" onClick={onCancel}>Cancel</button>
          {payload.task_id && record.status !== 'new' && (
            <button
              className="btn"
              style={{ color: '#e74c3c', borderColor: '#e74c3c' }}
              onClick={async () => {
                if (!confirm(`Archive ${payload.task_id}?\n\nMoves Claude/tasks/${payload.task_id}.json → Claude/tasks/archive/. Bundle regenerates automatically. Restorable from the Archive tab.`)) return;
                try {
                  await archiveEntity('task', payload.task_id);
                  await regenBundle();
                  onCancel?.();
                } catch (e) {
                  alert(`Archive failed: ${e.message}`);
                }
              }}
            >Archive</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
            status: <strong>{record.status}</strong>
          </span>
        </div>
      </div>

      {/* JSON preview */}
      <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 12, overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-muted)' }}>JSON PREVIEW</h4>
        <pre style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4, overflow: 'auto', margin: 0 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>

      {renameOpen && (
        <RenameTaskModal
          oldId={payload.task_id}
          onClose={() => setRenameOpen(false)}
          onComplete={(result) => {
            alert(`Rename drafts created:\n  • 1 task draft (${result.newId})\n  • ${result.moduleDraftsCreated} module drafts\n\nReview in the Drafts tab and click Publish All to apply. The smoke gate will catch any rewrite that missed.`);
          }}
        />
      )}
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

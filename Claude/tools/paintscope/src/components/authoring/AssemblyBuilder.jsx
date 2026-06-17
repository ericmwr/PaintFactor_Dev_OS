// Assembly builder — compose multiple scenarios under quantity-driven rules.
// Each rule = boolean condition on quantities/ctx + scenario_match criteria.

import { useState, useEffect } from 'react';
import { useAssemblyDrafts } from '../../hooks/useAssemblyDrafts.js';
import { resolveAssembly, validateAssembly } from '../../engine/assembly-resolver.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { findBestMatch } from '../../engine/scenario-matcher.js';

function emptyAssembly() {
  return {
    id: '',
    payload: {
      assembly_id: '',
      name: '',
      trigger: { job_type: '' },
      scenario_rules: [],
    },
    status: 'draft',
  };
}

const SAMPLE_QUANTITIES = { cabinet_sf: 120, trim_lf: 80, wall_sf: 400, ceiling_sf: 200 };

export default function AssemblyBuilder({ pendingSelection } = {}) {
  const { drafts, loading, save, remove } = useAssemblyDrafts();
  const [record, setRecord] = useState(null);
  const [creating, setCreating] = useState(false);

  // Cross-tab navigation from DraftsView — find the draft by id and open it.
  useEffect(() => {
    if (!pendingSelection) return;
    const d = drafts.find(x => x.id === pendingSelection.id);
    if (d) { setRecord(structuredClone(d)); setCreating(false); }
  }, [pendingSelection?.nonce]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading assemblies...</div>;

  const handleCreate = () => { setRecord(emptyAssembly()); setCreating(true); };
  const handleSelect = (d) => { setRecord(structuredClone(d)); setCreating(false); };
  const handleSave = async () => {
    if (!record?.id) { alert('assembly_id required'); return; }
    const v = validateAssembly(record.payload);
    if (!v.ok) { alert('Invalid:\n' + v.errors.join('\n')); return; }
    const saved = await save(record);
    setRecord(saved);
    setCreating(false);
  };
  const handleDelete = async (id) => {
    if (!confirm(`Delete assembly ${id}?`)) return;
    await remove(id);
    if (record?.id === id) setRecord(null);
  };

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Assemblies ({drafts.length})</h3>
          <button className="btn btn-sm btn-accent" onClick={handleCreate} style={{ fontSize: 11 }}>+ New</button>
        </div>
        {drafts.map(d => {
          const isSel = record?.id === d.id;
          return (
            <div key={d.id}
              onClick={() => handleSelect(d)}
              style={{ padding: '5px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 3, marginBottom: 2,
                background: isSel ? 'rgba(130,170,255,0.12)' : 'transparent',
                borderLeft: isSel ? '2px solid var(--accent, #82aaff)' : '2px solid transparent' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{d.id}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{(d.payload || d).name} — {((d.payload || d).scenario_rules || []).length} rules</div>
              <button onClick={e => { e.stopPropagation(); handleDelete(d.id); }} style={{ fontSize: 9, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>delete</button>
            </div>
          );
        })}
        {drafts.length === 0 && !creating && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>No assemblies yet.</div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {record ? (
          <Editor key={record.id || 'new'} record={record} setRecord={setRecord} onSave={handleSave} onCancel={() => { setRecord(null); setCreating(false); }} />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Select an assembly or create a new one.</div>
        )}
      </div>
    </div>
  );
}

function Editor({ record, setRecord, onSave, onCancel }) {
  const [dirty, setDirty] = useState(false);
  const p = record.payload;

  const update = (mut) => {
    setRecord(prev => {
      const next = structuredClone(prev);
      mut(next);
      return next;
    });
    setDirty(true);
  };

  const setHeader = (field, value) => {
    update(r => {
      r.payload[field] = value;
      if (field === 'assembly_id') r.id = value;
    });
  };

  const addRule = () => update(r => {
    r.payload.scenario_rules = [...(r.payload.scenario_rules || []), { if: 'true', scenario_match: {}, label: '' }];
  });
  const removeRule = (i) => update(r => {
    r.payload.scenario_rules = r.payload.scenario_rules.filter((_, idx) => idx !== i);
  });
  const updateRule = (i, mut) => update(r => {
    const next = r.payload.scenario_rules.slice();
    const rule = structuredClone(next[i]);
    mut(rule);
    next[i] = rule;
    r.payload.scenario_rules = next;
  });

  const resolved = (() => {
    try { return resolveAssembly(p, SAMPLE_QUANTITIES, {}); } catch { return []; }
  })();

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Assembly Editor</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={labelStyle}>
            Assembly ID
            <input style={inputStyle} placeholder="ASM_KITCHEN_FULL_REPAINT" value={p.assembly_id} onChange={e => setHeader('assembly_id', e.target.value)} />
          </label>
          <label style={labelStyle}>
            Name
            <input style={inputStyle} value={p.name} onChange={e => setHeader('name', e.target.value)} />
          </label>
        </div>
        <label style={{ ...labelStyle, marginTop: 8 }}>
          Trigger (job_type)
          <input style={inputStyle} value={p.trigger?.job_type || ''} onChange={e => update(r => { r.payload.trigger = { ...r.payload.trigger, job_type: e.target.value }; })} />
        </label>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <h4 style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>RULES ({(p.scenario_rules || []).length})</h4>
            <button className="btn btn-sm btn-accent" onClick={addRule} style={{ fontSize: 10 }}>+ Rule</button>
          </div>
          {(p.scenario_rules || []).map((rule, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>Rule {i + 1}</span>
                <button onClick={() => removeRule(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 11, cursor: 'pointer' }}>×</button>
              </div>
              <label style={labelStyle}>
                Label (optional)
                <input style={inputStyle} value={rule.label || ''} onChange={e => updateRule(i, r => { r.label = e.target.value; })} />
              </label>
              <label style={{ ...labelStyle, marginTop: 6 }}>
                Condition (JS expr on <code>quantities</code>, <code>ctx</code>)
                <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} placeholder="quantities.cabinet_sf > 0" value={rule.if || 'true'} onChange={e => updateRule(i, r => { r.if = e.target.value; })} />
              </label>
              <label style={{ ...labelStyle, marginTop: 6 }}>
                Scenario match (JSON)
                <textarea
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono)', minHeight: 50, fontSize: 10 }}
                  placeholder='{"paintable_item": "int_cabinet"}'
                  defaultValue={JSON.stringify(rule.scenario_match || {})}
                  onBlur={e => {
                    try {
                      const parsed = JSON.parse(e.target.value || '{}');
                      updateRule(i, r => { r.scenario_match = parsed; });
                    } catch {}
                  }}
                />
              </label>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'sticky', bottom: 0, background: 'var(--bg-panel)', padding: '8px 0' }}>
          <button className="btn btn-accent" onClick={onSave}>{dirty ? 'Save Draft' : 'Save'}</button>
          <button className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 12, overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>PREVIEW</h4>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
          Sample quantities: <code style={{ fontFamily: 'var(--font-mono)' }}>{JSON.stringify(SAMPLE_QUANTITIES)}</code>
        </div>
        {resolved.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No rules fire with sample quantities.</div>
        ) : (
          <div>
            {resolved.map((r, i) => {
              const match = findBestMatch({ modules: canonicalBundle.modules, scenarios: canonicalBundle.scenarios }, r.scenario_match);
              return (
                <div key={i} style={{ border: '1px dotted var(--border)', borderRadius: 3, padding: 6, marginBottom: 4, fontSize: 11 }}>
                  <div><strong>{r.rule_label || `Rule ${i + 1}`}</strong></div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    match: {JSON.stringify(r.scenario_match)}
                  </div>
                  <div style={{ fontSize: 10, color: match.scenario ? '#5aa85a' : '#e74c3c', marginTop: 2 }}>
                    → {match.scenario ? match.scenario.scenario_id : '(no matching scenario)'}
                    {match.tied && <span style={{ color: '#e0b84a' }}> TIE</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <h4 style={{ margin: '12px 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>JSON</h4>
        <pre style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4, overflow: 'auto', margin: 0 }}>
          {JSON.stringify(p, null, 2)}
        </pre>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 2, padding: '4px 6px', fontSize: 12,
  background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3,
};

// Scenario editor — composes modules into a "recipe" driven by match criteria.
// This is the Estimate Rocket analogue: pick matches, pick modules, set coats,
// declare modifiers. Live match preview catches collisions with canonical scenarios.

import { useState, useEffect } from 'react';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';
import ModulePicker from './ModulePicker.jsx';
import MatchPreview from './MatchPreview.jsx';
import { archiveEntity, regenBundle } from '../../authoring/archive-ops.js';

const COMMON_MATCH_KEYS = ['paintable_item', 'quality_tier', 'application_method', 'substrate_state', 'surface', 'context', 'height_band'];
const DOMAIN_OPTIONS = ['interior', 'exterior', 'both'];
const CONTEXT_OPTIONS = ['NC', 'RP', 'mixed'];

function emptyScenario() {
  return {
    id: '',
    payload: {
      scenario_id: '',
      name: '',
      domain: 'interior',
      context: 'NC',
      matches: {},
      modules: [],
      coat_counts: { finish_coats: 2 },
      protection_zones: [],
      material_systems: [],
      modifiers: [],
      output_state: '',
    },
    status: 'draft',
  };
}

export default function ScenarioEditor({ draft, onSave, onCancel, onPublish }) {
  const { drafts: moduleDrafts } = useModuleDrafts();
  const [record, setRecord] = useState(() => draft ? structuredClone(draft) : emptyScenario());
  const [dirty, setDirty] = useState(false);
  const [matchKey, setMatchKey] = useState('');
  const [matchVal, setMatchVal] = useState('');

  useEffect(() => {
    setRecord(draft ? structuredClone(draft) : emptyScenario());
    setDirty(false);
  }, [draft]);

  const p = record.payload;

  const update = (mut) => {
    setRecord(prev => {
      const next = structuredClone(prev);
      mut(next.payload);
      return next;
    });
    setDirty(true);
  };

  const setHeader = (field, value) => {
    update(pay => { pay[field] = value; });
    if (field === 'scenario_id') {
      setRecord(prev => ({ ...prev, id: value, payload: { ...prev.payload, scenario_id: value } }));
    }
  };

  const addMatchKey = () => {
    if (!matchKey || !matchVal) return;
    update(pay => {
      const existing = pay.matches[matchKey];
      const v = matchVal.includes(',') ? matchVal.split(',').map(s => s.trim()) : matchVal;
      pay.matches = { ...pay.matches, [matchKey]: v };
    });
    setMatchKey('');
    setMatchVal('');
  };

  const removeMatchKey = (k) => update(pay => {
    const copy = { ...pay.matches };
    delete copy[k];
    pay.matches = copy;
  });

  const pickModule = (id) => update(pay => { pay.modules = [...pay.modules, id]; });
  const removeModule = (idx) => update(pay => {
    const next = pay.modules.slice();
    next.splice(idx, 1);
    pay.modules = next;
  });
  const moveModule = (idx, delta) => update(pay => {
    const next = pay.modules.slice();
    const j = idx + delta;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    pay.modules = next;
  });

  const setCoat = (k, v) => update(pay => { pay.coat_counts = { ...pay.coat_counts, [k]: parseInt(v, 10) || 0 }; });

  const setCsvField = (field, text) => update(pay => {
    pay[field] = text.split(',').map(s => s.trim()).filter(Boolean);
  });

  const handleSave = async () => {
    if (!record.id) { alert('scenario_id required'); return; }
    await onSave(record);
    setDirty(false);
  };

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{draft ? 'Edit Scenario' : 'New Scenario'}</h3>

        {/* Header */}
        {/* Lock scenario_id only when editing an existing record (draft came in with a scenario_id).
            Clone hands in a payload with scenario_id='', so the input stays editable for the new id. */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <label style={labelStyle}>
            Scenario ID
            <input style={inputStyle} placeholder="SCN_..." value={p.scenario_id} onChange={e => setHeader('scenario_id', e.target.value)} disabled={!!(draft?.payload?.scenario_id || draft?.scenario_id)} />
          </label>
          <label style={labelStyle}>
            Domain
            <select style={inputStyle} value={p.domain} onChange={e => setHeader('domain', e.target.value)}>
              {DOMAIN_OPTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Context
            <select style={inputStyle} value={p.context} onChange={e => setHeader('context', e.target.value)}>
              {CONTEXT_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label style={labelStyle}>
          Display Name
          <input style={inputStyle} value={p.name} onChange={e => setHeader('name', e.target.value)} />
        </label>

        {/* Matches */}
        <div style={{ marginTop: 12 }}>
          <h4 style={sectionHeader}>MATCH CRITERIA</h4>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <select style={{ ...inputStyle, flex: 1 }} value={matchKey} onChange={e => setMatchKey(e.target.value)}>
              <option value="">— key —</option>
              {COMMON_MATCH_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <input style={{ ...inputStyle, flex: 2 }} placeholder="value or csv,list" value={matchVal} onChange={e => setMatchVal(e.target.value)} />
            <button className="btn btn-sm" onClick={addMatchKey}>+</button>
          </div>
          {Object.entries(p.matches).map(([k, v]) => (
            <div key={k} style={{ fontSize: 11, padding: '3px 6px', borderBottom: '1px dotted var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{k}</strong>: <span style={{ fontFamily: 'var(--font-mono)' }}>{JSON.stringify(v)}</span></span>
              <button onClick={() => removeMatchKey(k)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 10, cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>

        {/* Modules */}
        <div style={{ marginTop: 12 }}>
          <h4 style={sectionHeader}>MODULES ({p.modules.length}) — order matters</h4>
          {p.modules.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11 }}>
              <span style={{ width: 20, color: 'var(--text-muted)' }}>{i + 1}.</span>
              <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{m}</span>
              <button className="btn btn-sm" onClick={() => moveModule(i, -1)} disabled={i === 0} style={{ fontSize: 10 }}>↑</button>
              <button className="btn btn-sm" onClick={() => moveModule(i, 1)} disabled={i === p.modules.length - 1} style={{ fontSize: 10 }}>↓</button>
              <button className="btn btn-sm" onClick={() => removeModule(i)} style={{ fontSize: 10, color: '#e74c3c' }}>×</button>
            </div>
          ))}
          <div style={{ marginTop: 6 }}>
            <ModulePicker drafts={moduleDrafts} value={p.modules} onChange={arr => update(pay => { pay.modules = arr; })} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Click any module to append.</div>
          </div>
        </div>

        {/* Coat counts, modifiers, material systems */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <label style={labelStyle}>
            Finish coats
            <input style={inputStyle} type="number" min="0" value={p.coat_counts?.finish_coats ?? 0} onChange={e => setCoat('finish_coats', e.target.value)} />
          </label>
          <label style={labelStyle}>
            Prime coats
            <input style={inputStyle} type="number" min="0" value={p.coat_counts?.prime_coats ?? 0} onChange={e => setCoat('prime_coats', e.target.value)} />
          </label>
          <label style={labelStyle}>
            Interstage cycles
            <input style={inputStyle} type="number" min="0" value={p.coat_counts?.interstage_cycles ?? 0} onChange={e => setCoat('interstage_cycles', e.target.value)} />
          </label>
        </div>

        <label style={{ ...labelStyle, marginTop: 8 }}>
          Modifiers (FAC_..., csv)
          <input style={inputStyle} value={(p.modifiers || []).join(', ')} onChange={e => setCsvField('modifiers', e.target.value)} />
        </label>
        <label style={{ ...labelStyle, marginTop: 8 }}>
          Material Systems (SYS_..., csv)
          <input style={inputStyle} value={(p.material_systems || []).join(', ')} onChange={e => setCsvField('material_systems', e.target.value)} />
        </label>
        <label style={{ ...labelStyle, marginTop: 8 }}>
          Output State
          <input style={inputStyle} placeholder="SS_PAINTED_EGGSHELL" value={p.output_state || ''} onChange={e => setHeader('output_state', e.target.value)} />
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'sticky', bottom: 0, background: 'var(--bg-panel)', padding: '8px 0' }}>
          <button className="btn btn-accent" onClick={handleSave} disabled={!dirty && !!draft}>{dirty ? 'Save Draft' : 'Saved'}</button>
          {onPublish && <button className="btn" onClick={() => onPublish(record)} disabled={dirty}>Publish to JSON</button>}
          <button className="btn" onClick={onCancel}>Cancel</button>
          {p.scenario_id && record.status !== 'new' && (
            <button
              className="btn"
              style={{ color: '#e74c3c', borderColor: '#e74c3c' }}
              onClick={async () => {
                if (!confirm(`Archive ${p.scenario_id}?\n\nMoves Claude/scenarios/${p.scenario_id}.json → Claude/scenarios/archive/. Bundle regenerates automatically. Restorable from the Archive tab.`)) return;
                try {
                  await archiveEntity('scenario', p.scenario_id);
                  await regenBundle();
                  onCancel?.();
                } catch (e) {
                  alert(`Archive failed: ${e.message}`);
                }
              }}
            >Archive</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>status: <strong>{record.status}</strong></span>
        </div>
      </div>

      {/* Right: JSON + match preview */}
      <div style={{ width: 360, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 12, overflowY: 'auto' }}>
        <MatchPreview draftScenario={p} />
        <h4 style={{ ...sectionHeader, marginTop: 12 }}>JSON PREVIEW</h4>
        <pre style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4, overflow: 'auto', margin: 0 }}>
          {JSON.stringify(p, null, 2)}
        </pre>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' };
const sectionHeader = { margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)' };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 2, padding: '4px 6px', fontSize: 12,
  background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3,
};

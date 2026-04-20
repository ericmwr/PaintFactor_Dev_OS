// Modifier registry UI. Shows all FAC_* from bundle (plus drafts), lets
// admin edit factor values per ctx-key and save draft / publish.
// Also shows "used by" reverse-lookup — which modules/scenarios reference
// each FAC_*.

import { useMemo, useState, useEffect } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { useModifierDrafts } from '../../hooks/useModifierDrafts.js';
import { publishDraft } from '../../authoring/publish.js';

export default function ModifierList({ pendingSelection } = {}) {
  const { drafts, loading, save, remove } = useModifierDrafts();
  const [selectedId, setSelectedId] = useState(null);

  // Cross-tab navigation from DraftsView.
  useEffect(() => {
    if (!pendingSelection) return;
    setSelectedId(pendingSelection.id);
  }, [pendingSelection?.nonce]);  // eslint-disable-line react-hooks/exhaustive-deps

  const merged = useMemo(() => {
    const canonical = canonicalBundle.modifiers || {};
    const draftById = new Map(drafts.map(d => [d.id, d]));
    const ids = new Set([...Object.keys(canonical), ...drafts.map(d => d.id)]);
    return [...ids].sort().map(id => {
      const d = draftById.get(id);
      const base = canonical[id];
      if (d) return { id, payload: d.payload || d, source: base ? 'draft' : 'new', status: d.status };
      return { id, payload: base, source: 'canonical', status: 'canonical' };
    });
  }, [drafts]);

  const selected = merged.find(m => m.id === selectedId);

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading modifiers...</div>;

  const handleSave = async (rec) => {
    const saved = await save(rec);
    setSelectedId(saved.id);
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete draft for ${id}? Canonical modifier remains untouched.`)) return;
    await remove(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handlePublish = async (rec) => {
    if (!confirm(`Publish ${rec.id} to Claude/modifiers/${rec.id}.json?`)) return;
    try {
      const r = await publishDraft('modifier', rec);
      alert(`Published to ${r.path}`);
    } catch (e) {
      alert(`Publish failed: ${e.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      {/* Left: list */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 12, overflowY: 'auto' }}>
        <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 8px' }}>Modifiers ({merged.length})</h3>
        {merged.map(m => {
          const isSel = selectedId === m.id;
          const badgeColor = m.source === 'draft' ? '#e0b84a' : m.source === 'new' ? '#5aa85a' : '#555';
          return (
            <div
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              style={{
                padding: '5px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 3,
                background: isSel ? 'rgba(130,170,255,0.12)' : 'transparent',
                borderLeft: isSel ? '2px solid var(--accent, #82aaff)' : '2px solid transparent',
                marginBottom: 2,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{m.id}</span>
                <span style={{ fontSize: 9, padding: '1px 4px', background: badgeColor, borderRadius: 2, color: '#000' }}>{m.source}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {m.payload?.name || '(no name)'} · {m.payload?.kind}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: editor */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selected ? (
          <ModifierEditor
            key={selected.id}
            record={selected}
            onSave={handleSave}
            onPublish={handlePublish}
            onDelete={selected.source === 'draft' ? () => handleDelete(selected.id) : null}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Select a modifier.
          </div>
        )}
      </div>
    </div>
  );
}

function ModifierEditor({ record, onSave, onPublish, onDelete }) {
  const [draft, setDraft] = useState(() => ({
    id: record.id,
    payload: structuredClone(record.payload || { modifier_id: record.id, factors: {}, kind: 'dynamic' }),
    status: record.status === 'canonical' ? 'local_override' : record.status,
  }));
  const [dirty, setDirty] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  // Separate state for the band_thresholds_ft row adder (distinct from factor adder)
  const [newThKey, setNewThKey] = useState('');
  const [newThVal, setNewThVal] = useState('');

  const p = draft.payload;

  const update = (mut) => {
    setDraft(prev => {
      const next = structuredClone(prev);
      mut(next.payload);
      return next;
    });
    setDirty(true);
  };

  const setField = (field, value) => update(pay => { pay[field] = value; });

  const setFactor = (key, value) => update(pay => {
    pay.factors = { ...(pay.factors || {}), [key]: parseFloat(value) || 0 };
  });

  const removeFactor = (key) => update(pay => {
    const copy = { ...(pay.factors || {}) };
    delete copy[key];
    pay.factors = copy;
  });

  const addFactor = () => {
    if (!newKey) return;
    setFactor(newKey, newVal || '1');
    setNewKey('');
    setNewVal('');
  };

  // band_thresholds_ft editing — parallel to factors. Keys match factor keys
  // (e.g. STEP, EXT, SCAFFOLD, LIFT); values are the minimum ft each band
  // starts at. deriveHeightBand in derive-room.js reads these at runtime.
  const setThreshold = (key, value) => update(pay => {
    const n = parseFloat(value);
    const existing = pay.band_thresholds_ft || {};
    if (isNaN(n)) { delete existing[key]; pay.band_thresholds_ft = { ...existing }; return; }
    pay.band_thresholds_ft = { ...existing, [key]: n };
  });
  const removeThreshold = (key) => update(pay => {
    const copy = { ...(pay.band_thresholds_ft || {}) };
    delete copy[key];
    pay.band_thresholds_ft = copy;
  });
  const addThreshold = () => {
    if (!newThKey) return;
    setThreshold(newThKey, newThVal || '0');
    setNewThKey('');
    setNewThVal('');
  };

  // Reverse lookup — who uses this modifier?
  const usedByModules = useMemo(() => {
    const ids = [];
    for (const [id, mod] of Object.entries(canonicalBundle.modules || {})) {
      const elig = mod.modifier_eligibility || {};
      if (p.eligibility_key && elig[p.eligibility_key] === true) ids.push(id);
    }
    return ids;
  }, [p.eligibility_key]);

  const usedByScenarios = useMemo(() => {
    return (canonicalBundle.scenarios || [])
      .filter(s => Array.isArray(s.modifiers) && s.modifiers.includes(record.id))
      .map(s => s.scenario_id);
  }, [record.id]);

  const handleSave = async () => {
    await onSave({ ...draft, status: 'draft' });
    setDirty(false);
  };

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>
          {record.id} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({p.kind})</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={labelStyle}>
            Display Name
            <input style={inputStyle} value={p.name || ''} onChange={e => setField('name', e.target.value)} />
          </label>
          <label style={labelStyle}>
            ctx_key
            <input style={inputStyle} value={p.ctx_key || ''} onChange={e => setField('ctx_key', e.target.value)} />
          </label>
          <label style={labelStyle}>
            Default value
            <input style={inputStyle} value={p.default || ''} onChange={e => setField('default', e.target.value)} />
          </label>
          <label style={labelStyle}>
            Kind
            <select style={inputStyle} value={p.kind || 'dynamic'} onChange={e => setField('kind', e.target.value)}>
              <option>static</option>
              <option>dynamic</option>
            </select>
          </label>
          {p.kind === 'static' && (
            <label style={labelStyle}>
              eligibility_key
              <input style={inputStyle} placeholder="qt | height | complexity | condition | texture" value={p.eligibility_key || ''} onChange={e => setField('eligibility_key', e.target.value)} />
            </label>
          )}
          {p.kind === 'dynamic' && (
            <label style={labelStyle}>
              gated_by_eligibility (optional)
              <input style={inputStyle} placeholder="e.g. height for FAC_EXT_ACCESS" value={p.gated_by_eligibility || ''} onChange={e => setField('gated_by_eligibility', e.target.value)} />
            </label>
          )}
        </div>

        <label style={{ ...labelStyle, marginTop: 8 }}>
          Description
          <textarea style={{ ...inputStyle, minHeight: 40, fontFamily: 'inherit' }} value={p.description || ''} onChange={e => setField('description', e.target.value)} />
        </label>

        {/* Factor table */}
        <div style={{ marginTop: 12 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>FACTOR TABLE (key → multiplier)</h4>
          <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, background: 'rgba(0,0,0,0.1)' }}>
            {Object.entries(p.factors || {}).map(([key, val]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{key}</span>
                <input
                  type="number"
                  step="0.01"
                  style={{ ...inputStyle, marginTop: 0 }}
                  value={val}
                  onChange={e => setFactor(key, e.target.value)}
                />
                <button onClick={() => removeFactor(key)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}>×</button>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: 6, marginTop: 6, alignItems: 'center', borderTop: '1px dotted var(--border)', paddingTop: 6 }}>
              <input
                placeholder="new key (e.g. QT6)"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                style={{ ...inputStyle, marginTop: 0 }}
              />
              <input
                placeholder="value (e.g. 1.80)"
                value={newVal}
                onChange={e => setNewVal(e.target.value)}
                style={{ ...inputStyle, marginTop: 0 }}
              />
              <button className="btn btn-sm" onClick={addFactor}>+</button>
            </div>
          </div>
        </div>

        {/* Range thresholds — shown when the modifier defines or wants band_thresholds_ft.
            Height bands use these to decide which band applies to a given ceiling height.
            Value is the minimum ft at which that band kicks in. */}
        {(p.band_thresholds_ft || p.modifier_id === 'FAC_HEIGHT') && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>
              RANGE THRESHOLDS (band → minimum ft)
            </h4>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
              Ceiling heights ≥ this value trigger the band. Highest matching band wins.
              E.g. <code>STEP: 10</code> means step-ladder band applies at 10 ft and above (until the next threshold kicks in).
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, background: 'rgba(0,0,0,0.1)' }}>
              {Object.entries(p.band_thresholds_ft || {}).sort((a, b) => a[1] - b[1]).map(([key, val]) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{key}</span>
                  <input
                    type="number"
                    step="0.5"
                    style={{ ...inputStyle, marginTop: 0 }}
                    value={val}
                    onChange={e => setThreshold(key, e.target.value)}
                    title="Minimum ceiling height (ft) for this band"
                  />
                  <button onClick={() => removeThreshold(key)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: 6, marginTop: 6, alignItems: 'center', borderTop: '1px dotted var(--border)', paddingTop: 6 }}>
                <input
                  placeholder="new band (e.g. MID)"
                  value={newThKey}
                  onChange={e => setNewThKey(e.target.value)}
                  style={{ ...inputStyle, marginTop: 0 }}
                />
                <input
                  placeholder="min ft (e.g. 11)"
                  value={newThVal}
                  onChange={e => setNewThVal(e.target.value)}
                  style={{ ...inputStyle, marginTop: 0 }}
                />
                <button className="btn btn-sm" onClick={addThreshold}>+</button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'sticky', bottom: 0, background: 'var(--bg-panel)', padding: '8px 0' }}>
          <button className="btn btn-accent" onClick={handleSave} disabled={!dirty}>
            {dirty ? 'Save Draft' : 'Saved'}
          </button>
          <button className="btn" onClick={() => onPublish(draft)} disabled={dirty}>Publish to JSON</button>
          {onDelete && <button className="btn" onClick={onDelete} style={{ color: '#e74c3c' }}>Delete Draft</button>}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>status: <strong>{draft.status}</strong></span>
        </div>
      </div>

      {/* Right panel: reverse lookup + json */}
      <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 12, overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>USED BY</h4>
        {p.kind === 'static' && (
          <div style={{ marginBottom: 8, fontSize: 11 }}>
            <strong>{usedByModules.length}</strong> modules declare <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>modifier_eligibility.{p.eligibility_key || '?'} = true</code>
            {usedByModules.length > 0 && (
              <details style={{ marginTop: 4 }}>
                <summary style={{ fontSize: 10, cursor: 'pointer', color: 'var(--text-muted)' }}>show module ids</summary>
                <div style={{ maxHeight: 160, overflow: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {usedByModules.slice(0, 50).map(id => <div key={id}>{id}</div>)}
                  {usedByModules.length > 50 && <div>… and {usedByModules.length - 50} more</div>}
                </div>
              </details>
            )}
          </div>
        )}
        <div style={{ marginBottom: 8, fontSize: 11 }}>
          <strong>{usedByScenarios.length}</strong> scenarios declare this modifier in <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>modifiers[]</code>
          {usedByScenarios.length > 0 && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ fontSize: 10, cursor: 'pointer', color: 'var(--text-muted)' }}>show scenario ids</summary>
              <div style={{ maxHeight: 160, overflow: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                {usedByScenarios.slice(0, 50).map(id => <div key={id}>{id}</div>)}
                {usedByScenarios.length > 50 && <div>… and {usedByScenarios.length - 50} more</div>}
              </div>
            </details>
          )}
        </div>

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

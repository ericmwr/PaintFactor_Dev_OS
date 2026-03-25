import { useState } from 'react';

const CONDITION_PRESETS = {
  substrate_state: {
    label: 'Substrate State',
    options: [
      { value: 'SS_BARE', label: 'Bare Wood' },
      { value: 'SS_PRIMED_FACTORY', label: 'Factory Primed' },
      { value: 'SS_PRIMED_FIELD', label: 'Field Primed' },
      { value: 'SS_PAINTED', label: 'Previously Painted' },
      { value: 'SS_STAINED', label: 'Stained' },
      { value: 'SS_CLEAR_COATED', label: 'Clear Coated' },
    ]
  },
  application_method: {
    label: 'Application Method',
    options: [
      { value: 'brush', label: 'Brush' },
      { value: 'spray', label: 'Spray' },
      { value: 'roll', label: 'Roll' },
      { value: 'brush_roll', label: 'Brush + Roll' },
      { value: 'spray_backroll', label: 'Spray + Backroll' },
      { value: 'spray_rolloff', label: 'Spray + Rolloff' },
    ]
  },
  quality_tier: {
    label: 'Quality Tier',
    options: [
      { value: 'QT2', label: 'QT2' },
      { value: 'QT3', label: 'QT3' },
      { value: 'QT4', label: 'QT4' },
      { value: 'QT5', label: 'QT5' },
    ]
  },
  coating_type: {
    label: 'Coating Type',
    options: [
      { value: 'paint', label: 'Paint' },
      { value: 'stain_clear', label: 'Stain + Clear' },
      { value: 'stain_only', label: 'Stain Only' },
      { value: 'clear_only', label: 'Clear Only' },
    ]
  },
};

const chipStyle = (active) => ({
  fontSize: 10, padding: '2px 6px', borderRadius: 3, cursor: 'pointer', border: '1px solid',
  borderColor: active ? 'var(--accent)' : 'var(--border, #1a2a3a)',
  background: active ? 'rgba(130,170,255,0.15)' : 'transparent',
  color: active ? 'var(--accent)' : 'var(--text-muted)',
});

export default function AppliesWhenChip({ value, onChange, label }) {
  const [editing, setEditing] = useState(false);
  const [conditions, setConditions] = useState({});

  const hasCondition = value && typeof value === 'object' && Object.keys(value).length > 0;

  const summary = hasCondition
    ? Object.entries(value).map(([k, v]) => {
        const preset = CONDITION_PRESETS[k];
        const vals = Array.isArray(v) ? v : [v];
        const labels = vals.map(val => preset?.options.find(o => o.value === val)?.label || val);
        return `${preset?.label || k}: ${labels.join(', ')}`;
      }).join(' + ')
    : null;

  const handleOpen = (e) => {
    e.stopPropagation();
    setConditions(hasCondition ? JSON.parse(JSON.stringify(value)) : {});
    setEditing(true);
  };

  const toggleValue = (field, val) => {
    const next = { ...conditions };
    if (!next[field]) next[field] = [];
    const arr = [...next[field]];
    const idx = arr.indexOf(val);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(val);
    if (arr.length === 0) delete next[field];
    else next[field] = arr;
    setConditions(next);
  };

  const handleSave = () => {
    onChange(Object.keys(conditions).length > 0 ? conditions : null);
    setEditing(false);
  };

  const handleClear = () => {
    onChange(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'absolute', zIndex: 10, top: -4, left: 0, background: 'var(--bg-card, #111a28)', border: '1px solid var(--accent)', borderRadius: 4, padding: 8, width: 280, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>{label} — applies when</div>

          {Object.entries(CONDITION_PRESETS).map(([field, preset]) => {
            const active = conditions[field] || [];
            return (
              <div key={field} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>{preset.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {preset.options.map(opt => (
                    <span key={opt.value} onClick={() => toggleValue(field, opt.value)}
                      style={chipStyle(active.includes(opt.value))}>
                      {opt.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Preview */}
          {Object.keys(conditions).length > 0 && (
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, padding: '3px 4px', background: 'var(--bg-input, #0a1018)', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>
              {JSON.stringify(conditions)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <button onClick={handleSave} style={{ background: 'var(--accent)', color: '#000', border: 'none', padding: '3px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>Save</button>
            <button onClick={handleClear} style={{ background: 'none', border: '1px solid var(--border)', color: '#e74c3c', padding: '3px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>Clear</button>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
        <span style={{ fontSize: 9, color: 'var(--accent)', cursor: 'pointer' }}>editing...</span>
      </div>
    );
  }

  if (hasCondition) {
    return (
      <span onClick={handleOpen} title={JSON.stringify(value)}
        style={{ fontSize: 9, color: '#e6a020', background: 'rgba(230,160,32,0.1)', padding: '1px 4px', borderRadius: 2, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200, display: 'inline-block' }}>
        {summary}
      </span>
    );
  }

  return (
    <span onClick={handleOpen} style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5 }} title="Add condition">
      +when
    </span>
  );
}

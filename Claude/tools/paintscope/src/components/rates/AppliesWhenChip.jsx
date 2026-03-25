import { useState } from 'react';

export default function AppliesWhenChip({ value, onChange, label }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const hasCondition = value && typeof value === 'object' && Object.keys(value).length > 0;

  const summary = hasCondition
    ? Object.entries(value).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('|') : v}`).join(', ')
    : null;

  const handleOpen = (e) => {
    e.stopPropagation();
    setDraft(hasCondition ? JSON.stringify(value, null, 2) : '{\n  "substrate_state": ["SS_BARE"]\n}');
    setEditing(true);
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draft);
      onChange(Object.keys(parsed).length > 0 ? parsed : null);
      setEditing(false);
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  };

  const handleClear = () => {
    onChange(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'absolute', zIndex: 10, top: -4, left: 0, background: 'var(--bg-card, #111a28)', border: '1px solid var(--accent)', borderRadius: 4, padding: 6, width: 260, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>{label} applies_when</div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)}
            rows={5} style={{ width: '100%', background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--accent)', padding: 4, borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 10, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button onClick={handleSave} style={{ background: 'var(--accent)', color: '#000', border: 'none', padding: '2px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>Save</button>
            <button onClick={handleClear} style={{ background: 'none', border: '1px solid var(--border)', color: '#e74c3c', padding: '2px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>Clear</button>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
        <span style={{ fontSize: 9, color: 'var(--accent)', cursor: 'pointer' }}>editing...</span>
      </div>
    );
  }

  if (hasCondition) {
    return (
      <span onClick={handleOpen} title={JSON.stringify(value)}
        style={{ fontSize: 9, color: '#e6a020', background: 'rgba(230,160,32,0.1)', padding: '1px 4px', borderRadius: 2, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120, display: 'inline-block' }}>
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

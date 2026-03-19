import React, { useState } from 'react';

const SHEEN_OPTIONS = ['flat', 'matte', 'eggshell', 'satin', 'semi_gloss', 'gloss'];

export default function ColorEntryForm({ initial = {}, inherited = {}, onSave, onCancel, compact }) {
  const [draft, setDraft] = useState({
    color_code: initial.color_code || '',
    color_name: initial.color_name || '',
    product: initial.product || '',
    sheen: initial.sheen || '',
  });

  const set = (field, value) => setDraft(d => ({ ...d, [field]: value }));

  const handleSave = () => {
    const data = {};
    if (draft.color_code) data.color_code = draft.color_code;
    if (draft.color_name) data.color_name = draft.color_name;
    if (draft.product) data.product = draft.product;
    if (draft.sheen) data.sheen = draft.sheen;
    onSave(data);
  };

  const inputStyle = { padding: '4px 6px', background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 };
  const labelStyle = { fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' }}>
      <div>
        <div style={labelStyle}>Color Code</div>
        <input style={{ ...inputStyle, width: 80 }}
          value={draft.color_code}
          onChange={e => set('color_code', e.target.value)}
          placeholder={inherited.color_code || 'SW 7006'} />
      </div>
      <div>
        <div style={labelStyle}>Color Name</div>
        <input style={{ ...inputStyle, width: 110 }}
          value={draft.color_name}
          onChange={e => set('color_name', e.target.value)}
          placeholder={inherited.color_name || 'Extra White'} />
      </div>
      <div>
        <div style={labelStyle}>Product</div>
        <input style={{ ...inputStyle, width: 100 }}
          value={draft.product}
          onChange={e => set('product', e.target.value)}
          placeholder={inherited.product || 'Duration'} />
      </div>
      <div>
        <div style={labelStyle}>Sheen</div>
        <select style={{ ...inputStyle, width: 90 }}
          value={draft.sheen}
          onChange={e => set('sheen', e.target.value)}>
          <option value="">{inherited.sheen ? `← ${inherited.sheen}` : 'Select...'}</option>
          {SHEEN_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', '-')}</option>)}
        </select>
      </div>
      <button onClick={handleSave}
        style={{ padding: '4px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
        Save
      </button>
      {onCancel && (
        <button onClick={onCancel}
          style={{ padding: '4px 12px', background: 'var(--bg-panel)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
          Cancel
        </button>
      )}
    </div>
  );
}

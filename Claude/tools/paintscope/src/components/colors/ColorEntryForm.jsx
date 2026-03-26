import React, { useState } from 'react';

const COATING_TYPES = [
  { value: 'paint', label: 'Paint' },
  { value: 'stain', label: 'Stain' },
  { value: 'clear', label: 'Clear Coat' },
  { value: 'stain_clear', label: 'Stain + Clear' },
];

const PAINT_SHEENS = ['flat', 'matte', 'eggshell', 'satin', 'semi_gloss', 'gloss'];
const STAIN_TYPES = ['penetrating_oil', 'penetrating_wb', 'gel_stain', 'lacquer_stain'];
const CLEAR_SHEENS = ['satin', 'semi_gloss', 'gloss'];

const STAIN_LABELS = {
  penetrating_oil: 'Penetrating Oil',
  penetrating_wb: 'Penetrating WB',
  gel_stain: 'Gel Stain',
  lacquer_stain: 'Lacquer Stain',
};

export default function ColorEntryForm({ initial = {}, inherited = {}, onSave, onCancel, compact }) {
  const [draft, setDraft] = useState({
    coating_type: initial.coating_type || inherited.coating_type || 'paint',
    color_code: initial.color_code || '',
    color_name: initial.color_name || '',
    product: initial.product || '',
    sheen: initial.sheen || '',
    stain_type: initial.stain_type || '',
    stain_color: initial.stain_color || '',
    stain_product: initial.stain_product || '',
    clear_product: initial.clear_product || '',
    clear_sheen: initial.clear_sheen || '',
  });

  const set = (field, value) => setDraft(d => ({ ...d, [field]: value }));

  const ct = draft.coating_type;
  const hasPaint = ct === 'paint';
  const hasStain = ct === 'stain' || ct === 'stain_clear';
  const hasClear = ct === 'clear' || ct === 'stain_clear';

  const handleSave = () => {
    const data = { coating_type: ct };
    if (hasPaint) {
      if (draft.color_code) data.color_code = draft.color_code;
      if (draft.color_name) data.color_name = draft.color_name;
      if (draft.product) data.product = draft.product;
      if (draft.sheen) data.sheen = draft.sheen;
    }
    if (hasStain) {
      if (draft.stain_type) data.stain_type = draft.stain_type;
      if (draft.stain_color) data.stain_color = draft.stain_color;
      if (draft.stain_product) data.stain_product = draft.stain_product;
      // Use stain color as the primary color_code for resolution cascade
      if (!hasPaint && draft.stain_color) {
        data.color_code = draft.stain_color;
        data.color_name = draft.stain_color;
      }
    }
    if (hasClear) {
      if (draft.clear_product) data.clear_product = draft.clear_product;
      if (draft.clear_sheen) data.clear_sheen = draft.clear_sheen;
      // For clear-only, use product as identifier
      if (!hasPaint && !hasStain && draft.clear_product) {
        data.color_code = draft.clear_product;
        data.color_name = 'Clear Coat';
      }
    }
    onSave(data);
  };

  const inputStyle = { padding: '4px 6px', background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 };
  const labelStyle = { fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <div style={labelStyle}>Coating Type</div>
          <select style={{ ...inputStyle, width: 110 }}
            value={ct}
            onChange={e => set('coating_type', e.target.value)}>
            {COATING_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {hasPaint && (
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
              {PAINT_SHEENS.map(s => <option key={s} value={s}>{s.replace('_', '-')}</option>)}
            </select>
          </div>
        </div>
      )}

      {hasStain && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <div style={labelStyle}>Stain Type</div>
            <select style={{ ...inputStyle, width: 120 }}
              value={draft.stain_type}
              onChange={e => set('stain_type', e.target.value)}>
              <option value="">Select...</option>
              {STAIN_TYPES.map(s => <option key={s} value={s}>{STAIN_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Stain Color</div>
            <input style={{ ...inputStyle, width: 110 }}
              value={draft.stain_color}
              onChange={e => set('stain_color', e.target.value)}
              placeholder="e.g. Natural, Golden Oak" />
          </div>
          <div>
            <div style={labelStyle}>Stain Product</div>
            <input style={{ ...inputStyle, width: 120 }}
              value={draft.stain_product}
              onChange={e => set('stain_product', e.target.value)}
              placeholder="e.g. Minwax 250 VOC" />
          </div>
        </div>
      )}

      {hasClear && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <div style={labelStyle}>Clear Product</div>
            <input style={{ ...inputStyle, width: 140 }}
              value={draft.clear_product}
              onChange={e => set('clear_product', e.target.value)}
              placeholder="e.g. ProLuxe Poly" />
          </div>
          <div>
            <div style={labelStyle}>Clear Sheen</div>
            <select style={{ ...inputStyle, width: 90 }}
              value={draft.clear_sheen}
              onChange={e => set('clear_sheen', e.target.value)}>
              <option value="">Select...</option>
              {CLEAR_SHEENS.map(s => <option key={s} value={s}>{s.replace('_', '-')}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
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
    </div>
  );
}

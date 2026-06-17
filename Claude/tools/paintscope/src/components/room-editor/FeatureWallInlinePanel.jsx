import { getFixtureLevels, getFixtureDefault } from '../../data/mask-levels';

// W-15 — Feature Wall used to require the user to jump to the Protection tab
// to enter length/height/protection/deduct-baseboard. The panel is just a
// standard SF item with multiple entries, so it lives inline next to other
// room-content fixtures on the Identity tab.

export default function FeatureWallInlinePanel({ roomId, cfg, dispatch }) {
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  const totalSF = items.reduce((s, i) => s + Math.round((parseFloat(i.length_ft) || 0) * (parseFloat(i.height_ft) || 0)), 0);

  const addItem = () => dispatch({ type: 'ADD_FEATURE_WALL', payload: { roomId } });
  const removeItem = (itemId) => dispatch({ type: 'REMOVE_FEATURE_WALL', payload: { roomId, itemId } });
  const setItem = (itemId, field, value) => dispatch({ type: 'SET_FEATURE_WALL', payload: { roomId, itemId, field, value } });

  return (
    <div style={{ padding: '4px 0', borderBottom: '1px dashed var(--border-subtle, var(--border))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, width: 140 }}>Feature Wall</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>
          {items.length === 0 ? 'No feature walls added yet.' : `${items.length} wall${items.length === 1 ? '' : 's'}${totalSF > 0 ? ` · ${totalSF} SF total` : ''}`}
        </span>
        <button
          onClick={addItem}
          style={{ fontSize: 11, padding: '3px 8px', cursor: 'pointer', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 3 }}
        >
          + Add wall
        </button>
      </div>

      {items.length > 0 && (
        <div style={{ marginLeft: 12 }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{ padding: '6px 8px', marginBottom: 4, background: 'var(--bg-tertiary)', borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Wall {idx + 1}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                  title="Remove this feature wall"
                >
                  &#x2715;
                </button>
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div>
                  <div className="field-label">Length (ft)</div>
                  <input type="number" min="0" step="0.5" value={item.length_ft || ''}
                    onChange={e => setItem(item.id, 'length_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
                <div>
                  <div className="field-label">Height (ft)</div>
                  <input type="number" min="0" step="0.5" value={item.height_ft || ''}
                    onChange={e => setItem(item.id, 'height_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
                <div>
                  <div className="field-label">Protection</div>
                  <select
                    value={item.protection || getFixtureDefault('feature_wall')}
                    onChange={e => setItem(item.id, 'protection', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {getFixtureLevels('feature_wall').map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id={`fw-bb-${item.id}`}
                  checked={!!item.deduct_baseboard}
                  onChange={e => setItem(item.id, 'deduct_baseboard', e.target.checked)}
                />
                <label htmlFor={`fw-bb-${item.id}`} style={{ fontSize: 11 }}>Deduct baseboard</label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

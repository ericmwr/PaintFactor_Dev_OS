import { LIGHT_FIXTURE_TYPES, LIGHT_FIXTURE_TYPE_MAP, FIXTURE_ACTION_MODES } from '../../data/light-fixture-types';
import { FIXTURE_MASK_LEVELS } from '../../data/mask-levels';

// Light fixtures detail panel. Each row is a fixture type (recessed,
// ceiling fan, bulb, transparent glass, or custom). User mixes types
// per room with count + protection level + action mode and enters their
// own install + remove minutes for that fixture type. No taxonomy time
// defaults — everything is user input.
//
// 50% auto-fill: when in mask mode and the user types an install time,
// the remove field auto-fills to 50% of that value if it's still empty.
// User can override the remove field manually anytime.

const TYPE_OPTIONS = LIGHT_FIXTURE_TYPES.map(t => ({ value: t.id, label: t.label }));
const PROTECTION_LEVELS = FIXTURE_MASK_LEVELS.light_fixtures;

// (action_mode, side) → which item field holds the time value
const FIELD_FOR = {
  mask:   { install: 'mask_install_time_min',     remove: 'mask_remove_time_min' },
  remove: { install: 'fixture_uninstall_time_min', remove: 'fixture_reinstall_time_min' },
};
const PLACEHOLDER = {
  mask:   { install: 'apply mask',  remove: 'take off mask' },
  remove: { install: 'take down',   remove: 'reinstall' },
};

export default function LightFixturesInlinePanel({ roomId, cfg, dispatch }) {
  const items = Array.isArray(cfg.items) ? cfg.items : [];

  const addItem = (type = 'other') => dispatch({ type: 'ADD_LIGHT_FIXTURE_ITEM', payload: { roomId, type } });
  const removeItem = (itemId) => dispatch({ type: 'REMOVE_LIGHT_FIXTURE_ITEM', payload: { roomId, itemId } });
  const setItem = (itemId, field, value) => dispatch({ type: 'SET_LIGHT_FIXTURE_ITEM', payload: { roomId, itemId, field, value } });

  // Parse a free-text time input → number | null (empty = null, not 0).
  const parseTime = (raw) => (raw === '' || raw == null) ? null : (parseFloat(raw) || 0);

  return (
    <div style={{ padding: '4px 0', borderBottom: '1px dashed var(--border-subtle, var(--border))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, width: 140 }}>Light Fixtures</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>
          {items.length === 0 ? 'No fixture types added yet.' : `${items.length} type${items.length === 1 ? '' : 's'} · ${items.reduce((s, i) => s + (parseInt(i.count) || 0), 0)} fixture${items.reduce((s, i) => s + (parseInt(i.count) || 0), 0) === 1 ? '' : 's'} total`}
        </span>
        <button
          onClick={() => addItem('other')}
          style={{ fontSize: 11, padding: '3px 8px', cursor: 'pointer', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 3 }}
        >
          + Add type
        </button>
      </div>

      {items.length > 0 && (
        <table className="data-table" style={{ width: '100%', fontSize: 11, marginLeft: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 170 }}>Type</th>
              <th style={{ width: 55 }}>Count</th>
              <th style={{ width: 120 }}>Action</th>
              <th style={{ width: 130 }}>Protection</th>
              <th style={{ width: 80 }}>Install (min)</th>
              <th style={{ width: 80 }}>Remove (min)</th>
              <th></th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const taxonomy = LIGHT_FIXTURE_TYPE_MAP[item.type] || LIGHT_FIXTURE_TYPE_MAP['other'];
              const isCustom = !!taxonomy.is_custom;
              const mode = (item.action_mode || 'mask');
              const isMask = mode === 'mask';
              const fields = FIELD_FOR[mode];
              const placeholders = PLACEHOLDER[mode];
              const installVal = item[fields.install];
              const removeVal  = item[fields.remove];
              const installMin = Number(installVal) || 0;
              const removeMin  = Number(removeVal)  || 0;
              const totalMin = (installMin + removeMin) * (parseInt(item.count) || 0);
              const actionOptions = taxonomy.allow_remove === false
                ? FIXTURE_ACTION_MODES.filter(a => a.value === 'mask')
                : FIXTURE_ACTION_MODES;

              const handleInstallChange = (raw) => {
                const v = parseTime(raw);
                setItem(item.id, fields.install, v);
                // Mask-mode 50% auto-fill: if remove side is still empty and
                // user just entered an install time, seed remove at 50%. User
                // can edit afterwards.
                if (isMask && v != null && v > 0 && (removeVal == null || removeVal === '')) {
                  setItem(item.id, fields.remove, Math.round(v * 0.5 * 10) / 10);
                }
              };

              return (
                <tr key={item.id}>
                  <td>
                    <select
                      value={item.type}
                      onChange={e => setItem(item.id, 'type', e.target.value)}
                      style={{ width: '100%', fontSize: 11 }}
                    >
                      {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {isCustom && (
                      <input
                        type="text"
                        value={item.custom_label || ''}
                        onChange={e => setItem(item.id, 'custom_label', e.target.value)}
                        placeholder="Custom label"
                        style={{ width: '100%', fontSize: 10, marginTop: 2 }}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.count ?? ''}
                      onChange={e => setItem(item.id, 'count', parseInt(e.target.value) || 0)}
                      style={{ width: '100%', fontSize: 11 }}
                    />
                  </td>
                  <td>
                    <select
                      value={mode}
                      onChange={e => setItem(item.id, 'action_mode', e.target.value)}
                      style={{ width: '100%', fontSize: 11 }}
                      disabled={taxonomy.allow_remove === false}
                      title={taxonomy.allow_remove === false ? `${taxonomy.label} doesn't support Remove mode` : ''}
                    >
                      {actionOptions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      value={item.protection || taxonomy.default_protection || 'full'}
                      onChange={e => setItem(item.id, 'protection', e.target.value)}
                      style={{ width: '100%', fontSize: 11 }}
                      disabled={!isMask}
                      title={!isMask ? 'Protection level only applies to Mask action' : ''}
                    >
                      {PROTECTION_LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={installVal ?? ''}
                      onChange={e => handleInstallChange(e.target.value)}
                      placeholder={placeholders.install}
                      style={{ width: '100%', fontSize: 11 }}
                      title={isMask ? 'Minutes to apply masking, per fixture' : 'Minutes to uninstall the fixture, per fixture'}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={removeVal ?? ''}
                      onChange={e => setItem(item.id, fields.remove, parseTime(e.target.value))}
                      placeholder={placeholders.remove}
                      style={{ width: '100%', fontSize: 11 }}
                      title={isMask ? 'Minutes to remove masking, per fixture (50% of install by default)' : 'Minutes to reinstall the fixture, per fixture'}
                    />
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {totalMin > 0 ? `= ${totalMin.toFixed(1)} min` : '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                      title="Remove this fixture type"
                    >
                      &#x2715;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

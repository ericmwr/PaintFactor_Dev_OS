import { LIGHT_FIXTURE_TYPES, LIGHT_FIXTURE_TYPE_MAP, FIXTURE_ACTION_MODES } from '../../data/light-fixture-types';
import { FIXTURE_MASK_LEVELS } from '../../data/mask-levels';

// W-16 Phase 2 — replaces the single-row count-only inline UI for the
// light_fixtures fixture with a multi-row panel where each row is a
// fixture type (recessed, ceiling fan, bulb, transparent glass, or
// custom "other"). User can mix multiple types per room with their own
// count, protection level, action mode (mask vs remove), and optional
// time-min overrides.

const TYPE_OPTIONS = LIGHT_FIXTURE_TYPES.map(t => ({ value: t.id, label: t.label }));
const PROTECTION_LEVELS = FIXTURE_MASK_LEVELS.light_fixtures; // group-B levels w/ "Full cover" label

export default function LightFixturesInlinePanel({ roomId, cfg, dispatch }) {
  const items = Array.isArray(cfg.items) ? cfg.items : [];

  const addItem = (type = 'other') => dispatch({ type: 'ADD_LIGHT_FIXTURE_ITEM', payload: { roomId, type } });
  const removeItem = (itemId) => dispatch({ type: 'REMOVE_LIGHT_FIXTURE_ITEM', payload: { roomId, itemId } });
  const setItem = (itemId, field, value) => dispatch({ type: 'SET_LIGHT_FIXTURE_ITEM', payload: { roomId, itemId, field, value } });

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
              <th style={{ width: 180 }}>Type</th>
              <th style={{ width: 60 }}>Count</th>
              <th style={{ width: 130 }}>Action</th>
              <th style={{ width: 140 }}>Protection</th>
              <th style={{ width: 90 }}>Time (min)</th>
              <th></th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const taxonomy = LIGHT_FIXTURE_TYPE_MAP[item.type] || LIGHT_FIXTURE_TYPE_MAP['other'];
              const isCustom = !!taxonomy.is_custom;
              const isMask = (item.action_mode || 'mask') === 'mask';
              const defaultTime = isMask ? taxonomy.mask_time_min : taxonomy.remove_time_min;
              const overrideKey = isMask ? 'mask_time_min_override' : 'remove_time_min_override';
              const overrideVal = item[overrideKey];
              const effectiveTime = overrideVal != null ? overrideVal : defaultTime;
              const totalMin = (effectiveTime || 0) * (parseInt(item.count) || 0);
              const actionOptions = taxonomy.allow_remove === false
                ? FIXTURE_ACTION_MODES.filter(a => a.value === 'mask')
                : FIXTURE_ACTION_MODES;
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
                      value={item.action_mode || 'mask'}
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
                      disabled={(item.action_mode || 'mask') === 'remove'}
                      title={(item.action_mode || 'mask') === 'remove' ? 'Protection level only applies to Mask action' : ''}
                    >
                      {PROTECTION_LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={overrideVal ?? ''}
                      onChange={e => setItem(item.id, overrideKey, e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder={defaultTime != null ? `${defaultTime}` : 'enter'}
                      style={{ width: '100%', fontSize: 11 }}
                      title={defaultTime != null ? `Default: ${defaultTime} min/fixture (${isMask ? 'mask' : 'remove'})` : 'No default — enter time per fixture'}
                    />
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {totalMin > 0 ? `= ${totalMin} min` : '—'}
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

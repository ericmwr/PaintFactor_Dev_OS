import { useState, useMemo } from 'react';
import { FIXTURE_CATALOG, FIXTURE_MAP, FIXTURE_GROUPS, FLOOR_TYPES } from '../../../data/fixture-catalog';
import { deriveProtectionSummary } from '../../../engine/derive-protection';

const PROTECTION_LABELS = {
  none: 'NONE', edge_only: 'EDGE', light_mask: 'LIGHT',
  partial_cover: 'PARTIAL', item_mask: 'ITEM',
  full_cover: 'FULL', full_mask: 'FULL MASK'
};

export default function ProtectionTab({ room, derived, dispatch, project }) {
  const rid = room.id;
  const subs = room.substrates || {};
  const applicationMethod = room.application_method || project.default_application_method;
  const protectionSummary = useMemo(() => deriveProtectionSummary(room, subs, applicationMethod), [room, subs, applicationMethod]);

  const setRoom = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v } });

  // Fixture focus state
  const [focusedFixture, setFocusedFixture] = useState(null);

  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        Mark items present in the room that are not being painted.
      </div>

      {/* Floor Type & Protection */}
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div>
          <div className="field-label">Floor Type</div>
          <select value={room.floor_type || ''} onChange={e => {
            const ft = FLOOR_TYPES.find(f => f.id === e.target.value);
            setRoom('floor_type', e.target.value || '');
            setRoom('floor_protection', ft ? ft.defaultProtection : '');
          }} style={{ width: '100%' }}>
            <option value="">&mdash; Select &mdash;</option>
            {FLOOR_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <div className="field-label">Floor Protection</div>
          <select value={room.floor_protection || ''} onChange={e => setRoom('floor_protection', e.target.value)} style={{ width: '100%' }} disabled={!room.floor_type || room.floor_type === 'subfloor'}>
            <option value="">&mdash;</option>
            <option value="edge_only">Edge Only</option>
            <option value="partial_cover">Partial Cover</option>
            <option value="full_cover">Full Cover</option>
          </select>
        </div>
        <div style={{ alignSelf: 'end', fontSize: 11, color: 'var(--text-muted)' }}>
          {!room.floor_type ? '' : room.floor_type === 'subfloor' ? 'Subfloor \u2014 no protection needed' : ''}
        </div>
      </div>

      {/* Master/Detail: Fixture Checklist + Config/Summary */}
      <div className="master-detail-container" style={{ marginTop: 8 }}>
        {/* LEFT: Fixture checklist grouped by Kitchen/Bathroom/Feature */}
        <div className="master-list">
          {FIXTURE_GROUPS.map(g => (
            <div key={g.group} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{g.group}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
                {g.items.map(fix => {
                  const checked = !!(room.fixtures && room.fixtures[fix.id]);
                  const isFocused = focusedFixture === fix.id;
                  return (
                    <div key={fix.id} className={'substrate-item' + (isFocused ? ' focused' : '')}
                      onClick={() => { if (checked) setFocusedFixture(fix.id); }}>
                      <input type="checkbox" checked={checked}
                        onChange={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'TOGGLE_FIXTURE', payload: { roomId: rid, fixtureId: fix.id } });
                          if (!checked) setFocusedFixture(fix.id);
                          else if (focusedFixture === fix.id) setFocusedFixture(null);
                        }}
                        onClick={(e) => e.stopPropagation()} />
                      <span style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fix.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Per-fixture config (top) + Accumulated summary (bottom) */}
        <div className="detail-panel">
          {/* Per-fixture config when one is focused */}
          {focusedFixture && room.fixtures && room.fixtures[focusedFixture] && (() => {
            const cfg = room.fixtures[focusedFixture];
            const setFix = (f, v) => dispatch({ type: 'SET_FIXTURE', payload: { roomId: rid, fixtureId: focusedFixture, field: f, value: v } });
            const header = (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{FIXTURE_MAP[focusedFixture].label}</span>
                <button onClick={() => setFocusedFixture(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>&times;</button>
              </div>
            );

            // Cabinet-specific config
            if (focusedFixture === 'cabinets') return (
              <div style={{ marginBottom: 12 }}>
                {header}
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <div className="field-label">Layout</div>
                    <select value={cfg.layout || 'lower_upper'} onChange={e => setFix('layout', e.target.value)} style={{ width: '100%' }}>
                      <option value="lower_only">Lower Only</option>
                      <option value="lower_upper">Lower + Upper</option>
                    </select>
                  </div>
                  <div>
                    <div className="field-label">Protection Level</div>
                    <select value={cfg.protection || 'full_cover'} onChange={e => setFix('protection', e.target.value)} style={{ width: '100%' }}>
                      <option value="edge_only">Edge Only</option>
                      <option value="partial_cover">Partial Cover</option>
                      <option value="full_cover">Full Cover</option>
                    </select>
                  </div>
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 6 }}>
                  <div>
                    <div className="field-label">Linear Feet</div>
                    <input type="number" min="0" max="200" step="0.5" value={cfg.linear_ft || ''} onChange={e => setFix('linear_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                  </div>
                  {(cfg.layout === 'lower_upper') && (
                    <div>
                      <div className="field-label">Upper Height (ft)</div>
                      <input type="number" min="1" max="6" step="0.5" value={cfg.upper_height_ft || ''} onChange={e => setFix('upper_height_ft', parseFloat(e.target.value) || 2.5)} placeholder="2.5" />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 6 }}>
                  <div className="field-label">Notes</div>
                  <input type="text" value={cfg.notes || ''} onChange={e => setFix('notes', e.target.value)} style={{ width: '100%' }} placeholder="e.g., L-shaped run, island separate" />
                </div>
              </div>
            );

            // Feature Wall config — items list
            if (focusedFixture === 'feature_wall') {
              const items = cfg.items || [];
              const totalSF = items.reduce((s, i) => s + Math.round((parseFloat(i.length_ft) || 0) * (parseFloat(i.height_ft) || 0)), 0);
              const totalBaseboardDeduct = items.filter(i => i.deduct_baseboard).reduce((s, i) => s + Math.round(parseFloat(i.length_ft) || 0), 0);
              const setFW = (itemId, f, v) => dispatch({ type: 'SET_FEATURE_WALL', payload: { roomId: rid, itemId, field: f, value: v } });
              return (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Feature Walls</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {totalSF > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--derived)' }}>{totalSF} SF total</span>}
                      <button className="btn btn-sm btn-accent" onClick={() => dispatch({ type: 'ADD_FEATURE_WALL', payload: { roomId: rid } })}>+ Add</button>
                      <button onClick={() => setFocusedFixture(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>&times;</button>
                    </div>
                  </div>
                  {items.map((item, idx) => {
                    const itemSF = Math.round((parseFloat(item.length_ft) || 0) * (parseFloat(item.height_ft) || 0));
                    return (
                      <div key={item.id} style={{ padding: '6px 8px', marginBottom: 6, background: 'var(--bg-tertiary)', borderRadius: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Wall {idx + 1}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {itemSF > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{itemSF} SF deducted</span>}
                            <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_FEATURE_WALL', payload: { roomId: rid, itemId: item.id } })}>&times;</button>
                          </div>
                        </div>
                        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                          <div>
                            <div className="field-label">Length (ft)</div>
                            <input type="number" min="0" step="0.5" value={item.length_ft || ''} onChange={e => setFW(item.id, 'length_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                          </div>
                          <div>
                            <div className="field-label">Height (ft)</div>
                            <input type="number" min="0" step="0.5" value={item.height_ft || ''} onChange={e => setFW(item.id, 'height_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                          </div>
                          <div>
                            <div className="field-label">Protection</div>
                            <select value={item.protection || 'full_mask'} onChange={e => setFW(item.id, 'protection', e.target.value)} style={{ width: '100%' }}>
                              <option value="edge_only">Edge Only</option>
                              <option value="partial_cover">Partial Cover</option>
                              <option value="full_cover">Full Cover</option>
                              <option value="full_mask">Full Mask</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" id={`fw-bb-${item.id}`} checked={!!item.deduct_baseboard}
                            onChange={e => setFW(item.id, 'deduct_baseboard', e.target.checked)} />
                          <label htmlFor={`fw-bb-${item.id}`} style={{ fontSize: 11 }}>Deduct baseboard</label>
                          {item.deduct_baseboard && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{`\u2212${Math.round(parseFloat(item.length_ft) || 0)} LF`}</span>}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <input type="text" value={item.notes || ''} onChange={e => setFW(item.id, 'notes', e.target.value)} style={{ width: '100%', fontSize: 11 }} placeholder="e.g., stone veneer, shiplap" />
                        </div>
                      </div>
                    );
                  })}
                  {totalBaseboardDeduct > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      Total baseboard deduction: {totalBaseboardDeduct} LF
                    </div>
                  )}
                </div>
              );
            }

            // Built-in shelving: needs dimensions for SF-based protection
            if (focusedFixture === 'builtin_shelving') {
              const bsSF = Math.round((parseFloat(cfg.width_ft) || 0) * (parseFloat(cfg.height_ft) || 0) * (parseInt(cfg.count) || 1));
              return (
                <div style={{ marginBottom: 12 }}>
                  {header}
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div>
                      <div className="field-label">Count</div>
                      <input type="number" min="1" max="20" value={cfg.count || ''} onChange={e => setFix('count', parseInt(e.target.value) || 1)} placeholder="1" />
                    </div>
                    <div>
                      <div className="field-label">Width (ft)</div>
                      <input type="number" min="0" step="0.5" value={cfg.width_ft || ''} onChange={e => setFix('width_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                    </div>
                    <div>
                      <div className="field-label">Height (ft)</div>
                      <input type="number" min="0" step="0.5" value={cfg.height_ft || ''} onChange={e => setFix('height_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                    </div>
                  </div>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 6 }}>
                    <div>
                      <div className="field-label">Protection Level</div>
                      <select value={cfg.protection || 'partial_cover'} onChange={e => setFix('protection', e.target.value)} style={{ width: '100%' }}>
                        <option value="edge_only">Edge Only</option>
                        <option value="partial_cover">Partial Cover</option>
                        <option value="full_cover">Full Cover</option>
                      </select>
                    </div>
                    <div style={{ alignSelf: 'end' }}>
                      {bsSF > 0 && (
                        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--derived)' }}>
                          {bsSF} SF
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <div className="field-label">Notes</div>
                    <input type="text" value={cfg.notes || ''} onChange={e => setFix('notes', e.target.value)} style={{ width: '100%' }} placeholder="e.g., floor-to-ceiling bookcase, entertainment center" />
                  </div>
                </div>
              );
            }

            // Dimensioned fixtures: shower, vanity, fireplace, stone_fireplace
            if (['shower', 'vanity', 'fireplace', 'stone_fireplace'].includes(focusedFixture)) {
              const fixSF = Math.round((parseFloat(cfg.width_ft) || 0) * (parseFloat(cfg.height_ft) || 0) * (parseInt(cfg.count) || 1));
              const fixLabel = FIXTURE_MAP[focusedFixture]?.label || focusedFixture;
              return (
                <div style={{ marginBottom: 12 }}>
                  {header}
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div>
                      <div className="field-label">Count</div>
                      <input type="number" min="1" max="10" value={cfg.count || ''} onChange={e => setFix('count', parseInt(e.target.value) || 1)} placeholder="1" />
                    </div>
                    <div>
                      <div className="field-label">Width (ft)</div>
                      <input type="number" min="0" step="0.5" value={cfg.width_ft || ''} onChange={e => setFix('width_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                    </div>
                    <div>
                      <div className="field-label">Height (ft)</div>
                      <input type="number" min="0" step="0.5" value={cfg.height_ft || ''} onChange={e => setFix('height_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
                    </div>
                  </div>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 6 }}>
                    <div>
                      <div className="field-label">Protection Level</div>
                      <select value={cfg.protection || FIXTURE_MAP[focusedFixture]?.defaultProtection || 'full_cover'} onChange={e => setFix('protection', e.target.value)} style={{ width: '100%' }}>
                        <option value="edge_only">Edge Only</option>
                        <option value="partial_cover">Partial Cover</option>
                        <option value="full_cover">Full Cover</option>
                        <option value="full_mask">Full Mask</option>
                      </select>
                    </div>
                    <div style={{ alignSelf: 'end' }}>
                      {fixSF > 0 && (
                        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--derived)' }}>
                          {fixSF} SF
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <div className="field-label">Notes</div>
                    <input type="text" value={cfg.notes || ''} onChange={e => setFix('notes', e.target.value)} style={{ width: '100%' }} placeholder={`e.g., ${focusedFixture === 'shower' ? 'walk-in, glass door' : focusedFixture === 'vanity' ? 'double sink, wall-mounted' : 'mantel + surround'}`} />
                  </div>
                </div>
              );
            }

            // Generic fixture config
            return (
              <div style={{ marginBottom: 12 }}>
                {header}
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <div className="field-label">Count</div>
                    <input type="number" min="1" max="20" value={cfg.count || ''} onChange={e => setFix('count', parseInt(e.target.value) || 1)} placeholder="1" />
                  </div>
                  <div>
                    <div className="field-label">Protection Level</div>
                    <select value={cfg.protection || 'partial_cover'} onChange={e => setFix('protection', e.target.value)} style={{ width: '100%' }}>
                      <option value="none">None</option>
                      <option value="edge_only">Edge Only</option>
                      <option value="partial_cover">Partial Cover</option>
                      <option value="full_cover">Full Cover</option>
                      <option value="item_mask">Item Mask</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 6 }}>
                  <div className="field-label">Size / Notes</div>
                  <input type="text" value={cfg.size || ''} onChange={e => setFix('size', e.target.value)} style={{ width: '100%' }} placeholder="e.g., 6ft granite island" />
                </div>
              </div>
            );
          })()}

          {/* Accumulated protection summary — always visible */}
          <div style={{ borderTop: focusedFixture && room.fixtures && room.fixtures[focusedFixture] ? '1px solid var(--border)' : 'none', paddingTop: 8 }}>
            <div className="field-label" style={{ marginBottom: 4 }}>Protection Summary</div>
            {protectionSummary.map(item => {
              const badgeLabel = PROTECTION_LABELS[item.protection] || item.protection?.toUpperCase() || '?';
              return (
                <div key={item.zone} className="protection-row">
                  <span className={'protection-badge ' + item.protection}>{badgeLabel}</span>
                  <span>{item.label}</span>
                  {item.count > 1 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>&times;{item.count}</span>}
                  {item.auto && <span className="auto-tag">auto</span>}
                  {item.contextDependent && <span className="auto-tag" style={{ background: 'var(--bg-tertiary)', color: '#b87333' }} title="Protection level varies by painting context and application method. Resolved at estimate time.">varies</span>}
                </div>
              );
            })}
            {protectionSummary.length === 0 && <div className="detail-panel-empty">No protection required</div>}
          </div>
        </div>
      </div>
    </>
  );
}

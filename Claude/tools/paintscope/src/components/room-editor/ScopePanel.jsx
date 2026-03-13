import { useState, useMemo } from 'react';
import Select from '../shared/Select';
import Toggle from '../shared/Toggle';
import OpeningsSection from './OpeningsSection';
import SubstrateDetailPanel from './SubstrateDetailPanel';
import { ENUMS } from '../../data/enums';
import { SUBSTRATE_MAP, SUBSTRATE_GROUPS } from '../../data/substrate-catalog';
import { FIXTURE_CATALOG, FIXTURE_MAP, FIXTURE_GROUPS, FLOOR_TYPES } from '../../data/fixture-catalog';
import { deriveProtectionSummary } from '../../engine/derive-protection';

export default function ScopePanel({ room, derived, dispatch, project, focusedSubstrate, setFocusedSubstrate }) {
  const rid = room.id;
  const setRoom = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v } });
  const setRoomNullable = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v || null } });
  const subs = room.substrates || {};

  // v0.5 fixture focus state
  const [focusedFixture, setFocusedFixture] = useState(null);
  const applicationMethod = room.application_method || project.default_application_method;
  const protectionSummary = useMemo(() => deriveProtectionSummary(room, subs, applicationMethod), [room, subs, applicationMethod]);

  // Opening substrates handled by OpeningsSection — filter out of checklist
  const openingIds = new Set(['doors', 'windows', 'door_casing', 'window_casing', 'door_frames', 'window_jamb']);
  const filteredGroups = SUBSTRATE_GROUPS.map(g => ({ ...g, items: g.items.filter(c => !openingIds.has(c.id)) })).filter(g => g.items.length > 0);

  // Handle checkbox toggle + auto-focus
  const handleToggle = (catId) => {
    const isChecked = !!subs[catId];
    dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: catId } });
    if (!isChecked) {
      setFocusedSubstrate(catId); // newly checked -> auto-focus
    } else if (focusedSubstrate === catId) {
      setFocusedSubstrate(null); // unchecked the focused item -> clear
    }
  };

  // Handle clicking an already-checked item label -> set focus
  const handleItemClick = (catId) => {
    if (subs[catId]) setFocusedSubstrate(catId);
  };

  return (
    <div>
      <div className="panel-section" data-section="overrides">
        <div className="section-title">Room-Level Overrides</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Complexity <span style={{ color: 'var(--text-muted)' }}>({project.default_complexity})</span></div>
            <Select options={ENUMS.complexity} value={room.complexity} onChange={v => setRoomNullable('complexity', v)} placeholder="Project Default" />
          </div>
          <div>
            <div className="field-label">Height Band</div>
            <div style={{ padding: '6px 0', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{derived.heightBand} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>&mdash; auto from {derived.effectiveHeight} ft{derived.effectiveHeight > derived.H ? ' (peak)' : ''}</span></div>
          </div>
        </div>
      </div>
      <div className="panel-section" data-section="identity">
        <div className="section-title">Room Identity</div>
        <div className="form-grid" style={{ gridTemplateColumns: '2fr 2fr' }}>
          <div>
            <div className="field-label">Room Label</div>
            <input value={room.label} onChange={e => setRoom('label', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Master Bedroom" />
          </div>
          <div>
            <div className="field-label">Area Group</div>
            <input value={room.area_group} onChange={e => setRoom('area_group', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Main Floor" />
          </div>
        </div>
      </div>
      <div className="panel-section" data-section="dimensions">
        <div className="section-title">Dimensions</div>
        <div className="form-row">
          <div>
            <div className="field-label">Length (ft)</div>
            <input type="number" value={room.length_ft || ''} onChange={e => setRoom('length_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 16 }}>&times;</span>
          <div>
            <div className="field-label">Width (ft)</div>
            <input type="number" value={room.width_ft || ''} onChange={e => setRoom('width_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 16 }}>&times;</span>
          <div>
            <div className="field-label">Height (ft)</div>
            <input type="number" value={room.height_ft || ''} onChange={e => setRoom('height_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <span>Perimeter: <b style={{ color: 'var(--text-primary)' }}>{derived.perimeter} LF</b></span>
          <span>Floor/Ceiling: <b style={{ color: 'var(--text-primary)' }}>{derived.ceilingSF} SF</b></span>
          <span>Wall Gross: <b style={{ color: 'var(--text-primary)' }}>{derived.wallGross} SF</b></span>
          <span>Opening Deduct: <b style={{ color: 'var(--warning)' }}>{derived.openingDeduction} SF</b></span>
        </div>
      </div>

      <div className="panel-section" data-section="vault">
        <div className="section-title">Vault &amp; Gable</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <div>
            <Toggle checked={!!room.vaulted_ceiling} onChange={v => setRoom('vaulted_ceiling', v)} label="Vaulted Ceiling" />
          </div>
          <div>
            <div className="field-label">Peak Height (ft)</div>
            <input type="number" value={room.peak_height_ft || ''} onChange={e => setRoom('peak_height_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" disabled={!room.vaulted_ceiling} style={{ opacity: room.vaulted_ceiling ? 1 : 0.4 }} />
          </div>
          <div>
            <div className="field-label">Ridge Direction</div>
            <select value={room.ridge_direction || 'length'} onChange={e => setRoom('ridge_direction', e.target.value)} disabled={!room.vaulted_ceiling} style={{ opacity: room.vaulted_ceiling ? 1 : 0.4 }}>
              <option value="length">Along Length</option>
              <option value="width">Along Width</option>
            </select>
          </div>
          <div>
            <div className="field-label">Pitch</div>
            <div style={{ padding: '6px 0', fontSize: 13, color: room.vaulted_ceiling && derived.pitch > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{derived.pitch > 0 ? `${derived.pitch}:12` : '\u2014'}</div>
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr', marginTop: 4 }}>
          <div>
            <div className="field-label">Gable Walls</div>
            <input type="number" value={room.gable_walls || ''} onChange={e => setRoom('gable_walls', parseInt(e.target.value) || 0)} min="0" max="4" disabled={!room.vaulted_ceiling} style={{ width: 60, opacity: room.vaulted_ceiling ? 1 : 0.4 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
            {room.vaulted_ceiling && (derived.vaultedExtra > 0 || derived.gableExtra > 0) && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {derived.vaultedExtra > 0 && <span>Extra Ceiling: <b style={{ color: 'var(--accent)' }}>+{derived.vaultedExtra} SF</b></span>}
                {derived.vaultedExtra > 0 && derived.gableExtra > 0 && <span style={{ margin: '0 8px' }}>|</span>}
                {derived.gableExtra > 0 && <span>Extra Wall: <b style={{ color: 'var(--accent)' }}>+{derived.gableExtra} SF</b></span>}
              </span>
            )}
          </div>
        </div>
      </div>

      {room.vaulted_ceiling && (
      <div className="panel-section" data-section="beams">
        <div className="section-title">Ceiling Beams</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <div>
            <Toggle checked={!!room.beams_enabled} onChange={v => setRoom('beams_enabled', v)} label="Ceiling Beams" />
          </div>
          <div>
            <div className="field-label">Width (in)</div>
            <input type="number" value={room.beam_width_in || ''} onChange={e => setRoom('beam_width_in', parseFloat(e.target.value) || 6)} min="2" max="36" step="1" disabled={!room.beams_enabled} style={{ opacity: room.beams_enabled ? 1 : 0.4 }} />
          </div>
          <div>
            <div className="field-label">Depth (in)</div>
            <input type="number" value={room.beam_depth_in || ''} onChange={e => setRoom('beam_depth_in', parseFloat(e.target.value) || 6)} min="2" max="36" step="1" disabled={!room.beams_enabled} style={{ opacity: room.beams_enabled ? 1 : 0.4 }} />
          </div>
          <div>
            <div className="field-label">Substrate</div>
            <select value={room.beam_substrate_state || 'bare_wood'} onChange={e => setRoom('beam_substrate_state', e.target.value)} disabled={!room.beams_enabled} style={{ opacity: room.beams_enabled ? 1 : 0.4 }}>
              <option value="bare_wood">Bare Wood</option>
              <option value="factory_primed">Factory Primed</option>
              <option value="stained_sealed">Stained / Sealed</option>
              <option value="previously_finished">Previously Finished</option>
              <option value="drywall">Drywall</option>
            </select>
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', marginTop: 4 }}>
          <div>
            <Toggle checked={!!room.peak_beam} onChange={v => setRoom('peak_beam', v)} label="Peak Beam" disabled={!room.beams_enabled} />
          </div>
          <div>
            <div className="field-label">Cross Beams</div>
            <input type="number" value={room.cross_beam_count || ''} onChange={e => setRoom('cross_beam_count', parseInt(e.target.value) || 0)} min="0" max="20" disabled={!room.beams_enabled} style={{ width: 60, opacity: room.beams_enabled ? 1 : 0.4 }} placeholder="0" />
          </div>
          <div>
            <div className="field-label">Ridge Beams (half)</div>
            <input type="number" value={room.ridge_beam_count || ''} onChange={e => setRoom('ridge_beam_count', parseInt(e.target.value) || 0)} min="0" max="20" disabled={!room.beams_enabled} style={{ width: 60, opacity: room.beams_enabled ? 1 : 0.4 }} placeholder="0" />
          </div>
          <div>
            <div className="field-label">Application</div>
            <select value={room.beam_application_method || 'brush'} onChange={e => setRoom('beam_application_method', e.target.value)} disabled={!room.beams_enabled} style={{ opacity: room.beams_enabled ? 1 : 0.4 }}>
              <option value="brush">Brush</option>
              <option value="spray">Spray</option>
              <option value="spray_backbrush">Spray &amp; Back-brush</option>
            </select>
          </div>
        </div>
        {room.beams_enabled && derived.beamTotalLF > 0 && (
          <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: 2, color: 'var(--text-muted)', fontSize: 10 }}>Paintable LF = beam length &times; exposed faces (bottom + 2 sides)</div>
            {room.peak_beam && derived.beamPeakLF > 0 && <div>Peak: {derived.beamPeakLF} LF &times; 3 faces = <b>{Math.round(derived.beamPeakLF * 3)}</b> LF</div>}
            {room.cross_beam_count > 0 && derived.beamCrossLFEach > 0 && <div>Cross: {room.cross_beam_count} &times; {derived.beamCrossLFEach} LF &times; 3 faces = <b>{Math.round(room.cross_beam_count * derived.beamCrossLFEach * 3)}</b> LF</div>}
            {room.ridge_beam_count > 0 && derived.beamRidgeLFEach > 0 && <div>Ridge: {room.ridge_beam_count} &times; {Math.round(derived.beamRidgeLFEach * 10) / 10} LF &times; 2 faces = <b>{Math.round(room.ridge_beam_count * derived.beamRidgeLFEach * 2)}</b> LF</div>}
            <div style={{ marginTop: 3, color: 'var(--accent)', fontWeight: 600 }}>Total Beam LF: {derived.beamTotalLF} LF</div>
          </div>
        )}
      </div>
      )}

      <OpeningsSection room={room} derived={derived} dispatch={dispatch} project={project} />

      <div className="panel-section" data-section="substrates">
        <div className="section-title">What Are We Painting?</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Click a checked item to configure it in the panel to the right.</div>
        <div className="master-detail-container">
          <div className="master-list">
            {filteredGroups.map(g => (
              <div key={g.group} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{g.group}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
                  {g.items.map(cat => {
                    const checked = !!subs[cat.id];
                    const isFocused = focusedSubstrate === cat.id;
                    return (
                      <div key={cat.id} className={`substrate-item${isFocused ? ' focused' : ''}`}
                        onClick={() => handleItemClick(cat.id)}>
                        <input type="checkbox" checked={checked}
                          onChange={(e) => { e.stopPropagation(); handleToggle(cat.id); }}
                          onClick={(e) => e.stopPropagation()} />
                        <span style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{cat.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="detail-panel">
            {focusedSubstrate && subs[focusedSubstrate] ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{SUBSTRATE_MAP[focusedSubstrate]?.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{SUBSTRATE_MAP[focusedSubstrate]?.group} &middot; {SUBSTRATE_MAP[focusedSubstrate]?.uom}</span>
                  </div>
                  <button onClick={() => setFocusedSubstrate(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>&times;</button>
                </div>
                <SubstrateDetailPanel room={room} derived={derived} dispatch={dispatch} substrateId={focusedSubstrate} project={project} />
              </div>
            ) : (
              <div className="detail-panel-empty">Select an item to configure</div>
            )}
          </div>
        </div>
      </div>

      <div className="panel-section" data-section="adjacency">
        <div className="section-title">Room Adjacency &amp; Protection</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          Mark items present in the room that are not being painted.
        </div>

        {/* Floor Type — always visible */}
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
                const PROTECTION_LABELS = { none: 'NONE', edge_only: 'EDGE', light_mask: 'LIGHT', partial_cover: 'PARTIAL', item_mask: 'ITEM', full_cover: 'FULL', full_mask: 'FULL MASK' };
                const badgeLabel = PROTECTION_LABELS[item.protection] || item.protection?.toUpperCase() || '?';
                return (
                  <div key={item.zone} className="protection-row">
                    <span className={'protection-badge ' + item.protection}>{badgeLabel}</span>
                    <span>{item.label}</span>
                    {item.count > 1 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>&times;{item.count}</span>}
                    {item.auto && <span className="auto-tag">auto</span>}
                  </div>
                );
              })}
              {protectionSummary.length === 0 && <div className="detail-panel-empty">No protection required</div>}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

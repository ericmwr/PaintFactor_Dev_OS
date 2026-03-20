import React from 'react';
import Select from '../../shared/Select';
import Toggle from '../../shared/Toggle';
import { ENUMS } from '../../../data/enums';
import { OPENING_TYPES } from '../../../data/opening-types';
import { SUBSTRATE_APPLICATION_METHODS } from '../../../data/substrate-catalog';

// Compact inline stain/clear controls for opening substrates
function InlineCoatingControls({ subConfig, onSet }) {
  if (!subConfig || subConfig.substrate_state !== 'bare_wood') return null;
  const ct = subConfig.coating_type || 'paint';
  const hasStain = ct === 'stain_clear' || ct === 'stain_only';
  const hasClear = ct === 'stain_clear' || ct === 'clear_only';
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 24, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Coating</span>
        <Select options={ENUMS.intCoatingTypes} value={ct} onChange={v => onSet('coating_type', v)} style={{ width: 160, fontSize: 11 }} />
      </div>
      {ct !== 'paint' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Species</span>
          <Select options={ENUMS.woodSpeciesGroup} value={subConfig.wood_species_group || 'hardwood'} onChange={v => onSet('wood_species_group', v)} style={{ width: 140, fontSize: 11 }} />
        </div>
      )}
      {hasStain && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Stain</span>
            <Select options={ENUMS.stainApplicationMethods} value={subConfig.application_method_stain || 'brush'} onChange={v => onSet('application_method_stain', v)} style={{ width: 110, fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Stain Coats</span>
            <Select options={ENUMS.stainCoatCounts} value={subConfig.stain_coats ?? 1} onChange={v => onSet('stain_coats', Number(v))} style={{ width: 70, fontSize: 11 }} />
          </div>
        </>
      )}
      {hasClear && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Clear</span>
            <Select options={ENUMS.clearApplicationMethods} value={subConfig.application_method_clear || 'brush'} onChange={v => onSet('application_method_clear', v)} style={{ width: 90, fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sheen</span>
            <Select options={ENUMS.clearSheen} value={subConfig.clear_sheen || 'satin'} onChange={v => onSet('clear_sheen', v)} style={{ width: 100, fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sealer</span>
            <Select options={ENUMS.sealerCoatCounts} value={subConfig.sealer_coats ?? 0} onChange={v => onSet('sealer_coats', Number(v))} style={{ width: 70, fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Clear Coats</span>
            <Select options={ENUMS.clearCoatCounts} value={subConfig.clear_coats ?? 1} onChange={v => onSet('clear_coats', Number(v))} style={{ width: 70, fontSize: 11 }} />
          </div>
        </>
      )}
    </div>
  );
}

export default function OpeningsTab({ room, derived, dispatch, project }) {
  const rid = room.id;
  const subs = room.substrates || {};
  const openings = room.openings || [];
  const doorItems = subs.doors?.items || [];
  const windowItems = subs.windows?.items || [];
  const doorsPainting = !!subs.doors?.painting;
  const windowsPainting = !!subs.windows?.painting;
  const doorStates = ENUMS.substrateStates.filter(s => s.applies_to.includes('doors'));
  const winStates = ENUMS.substrateStates.filter(s => s.applies_to.includes('windows'));
  const casingStates = ENUMS.substrateStates.filter(s => s.applies_to.includes('door_casing'));
  const frameStates = ENUMS.substrateStates.filter(s => s.applies_to.includes('door_frames'));
  const winCasingStates = ENUMS.substrateStates.filter(s => s.applies_to.includes('window_casing'));
  const jambStates = ENUMS.substrateStates.filter(s => s.applies_to.includes('window_jamb'));

  const totalOpenings = derived.totalOpenings;
  const totalWindows = derived.totalWindows;
  const doorDeduct = derived.doorOpeningDeduction;
  const winDeduct = totalWindows * 15;
  const totalDeduct = derived.openingDeduction;
  const doorCasingLF = derived.openingCasingLF;
  const winCasingLF = totalWindows * 12;

  const openingTypeOptions = Object.entries(OPENING_TYPES).map(([k, v]) => ({ value: k, label: v.label }));
  const setRoomField = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v || null } });
  const setSub = (subId, field, value) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: subId, field, value: value || null } });

  // Any paintable opening item active?
  const anyPaintable = doorsPainting || windowsPainting || !!subs.door_casing?.painting || !!subs.door_frames || !!subs.window_casing?.painting || !!subs.window_jamb;
  const effectiveQT = room.openings_quality_tier || project.default_quality_tier;

  return (
    <>
      {/* Quality Tier override for all opening items */}
      {anyPaintable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Openings Quality Tier</span>
          <Select options={ENUMS.qualityTiers} value={room.openings_quality_tier} onChange={v => setRoomField('openings_quality_tier', v)} placeholder={`Project Default (${project.default_quality_tier})`} style={{ width: 200 }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Applies to doors, windows, frames</span>
        </div>
      )}
      {(totalOpenings > 0 || totalWindows > 0) && (
        <div style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 8 }}>
          <div>Wall deductions: {totalOpenings > 0 && <span>{openings.map(o => { const t = OPENING_TYPES[o.opening_type] || OPENING_TYPES.single; return `${o.count} ${t.label.toLowerCase()} x ${t.deduction_sf} SF`; }).join(' + ')}</span>}
          {totalOpenings > 0 && totalWindows > 0 && ' + '}
          {totalWindows > 0 && <span>{totalWindows} window{totalWindows !== 1 ? 's' : ''} x 15 SF</span>}
          {' = '}<b style={{ color: 'var(--warning)' }}>{totalDeduct} SF deducted</b></div>
          <div style={{ marginTop: 2 }}>Masking: {doorCasingLF > 0 && <span>{doorCasingLF} LF door casing</span>}
          {doorCasingLF > 0 && winCasingLF > 0 && ' | '}
          {winCasingLF > 0 && <span>{totalWindows} window{totalWindows !== 1 ? 's' : ''} x 12 = {winCasingLF} LF window casing</span>}</div>
        </div>
      )}

      {/* === OPENINGS TABLE — structural wall holes === */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Door Openings</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(wall deductions, casing, frames)</span>
          <button className="btn btn-sm btn-accent" style={{ marginLeft: 'auto' }} onClick={() => dispatch({ type: 'ADD_OPENING', payload: { roomId: rid } })}>+ Add Opening</button>
        </div>
        {openings.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: 8, textAlign: 'center', fontSize: 12 }}>No openings added yet.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Count</th><th>Type</th><th>Width</th><th>Deduction</th><th>Casing LF</th><th></th></tr></thead>
            <tbody>
              {openings.map(opn => {
                const t = OPENING_TYPES[opn.opening_type] || OPENING_TYPES.single;
                const cnt = parseInt(opn.count) || 0;
                return (
                  <tr key={opn.id}>
                    <td><input type="number" value={opn.count || ''} min="0" onChange={e => dispatch({ type: 'SET_OPENING', payload: { roomId: rid, openingId: opn.id, field: 'count', value: parseInt(e.target.value) || 0 } })} style={{ width: 60 }} placeholder="0" /></td>
                    <td><Select options={openingTypeOptions} value={opn.opening_type} onChange={v => dispatch({ type: 'SET_OPENING', payload: { roomId: rid, openingId: opn.id, field: 'opening_type', value: v } })} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{t.width_ft} ft</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{cnt * t.deduction_sf} SF</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--derived)' }}>{cnt * t.casing_lf} LF</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_OPENING', payload: { roomId: rid, openingId: opn.id } })}>&#x2715;</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {/* Associated Door Trim — derived from openings */}
        <div style={{ marginTop: 6, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Toggle checked={!!subs.door_casing?.painting} onChange={() => dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: 'door_casing' } })} label="Paint" />
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Door Casing</span>
            <span style={{ fontSize: 10, color: subs.door_casing?.painting ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500 }}>{subs.door_casing?.painting ? 'PAINT' : 'PROTECT'}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--derived)', marginLeft: 'auto' }}>{doorCasingLF > 0 ? `${doorCasingLF} LF` : '\u2014'}</span>
          </div>
          {subs.door_casing?.painting && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 4, paddingLeft: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>State</span>
                  <Select options={casingStates} value={subs.door_casing?.substrate_state || null} onChange={v => setSub('door_casing', 'substrate_state', v)} placeholder="Default" style={{ width: 130, fontSize: 11 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>App</span>
                  {(() => {
                    const sam = SUBSTRATE_APPLICATION_METHODS['door_casing'];
                    const opts = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));
                    return <Select options={opts} value={subs.door_casing?.application_method || null} onChange={v => setSub('door_casing', 'application_method', v)} placeholder={`Default (${sam.default})`} style={{ width: 130, fontSize: 11 }} />;
                  })()}
                </div>
              </div>
              <InlineCoatingControls subConfig={subs.door_casing} onSet={(f, v) => setSub('door_casing', f, v)} />
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <input type="checkbox" checked={!!subs.door_frames} onChange={() => dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: 'door_frames' } })} />
            <span style={{ fontSize: 12, color: subs.door_frames ? 'var(--text-primary)' : 'var(--text-muted)' }}>Door Frames</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--derived)', marginLeft: 'auto' }}>{totalOpenings > 0 ? `${totalOpenings} EA` : '\u2014'}</span>
          </div>
          {!!subs.door_frames && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 4, paddingLeft: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>State</span>
                  <Select options={frameStates} value={subs.door_frames?.substrate_state || null} onChange={v => setSub('door_frames', 'substrate_state', v)} placeholder="Default" style={{ width: 130, fontSize: 11 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>App</span>
                  {(() => {
                    const sam = SUBSTRATE_APPLICATION_METHODS['door_frames'];
                    const opts = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));
                    return <Select options={opts} value={subs.door_frames?.application_method || null} onChange={v => setSub('door_frames', 'application_method', v)} placeholder={`Default (${sam.default})`} style={{ width: 130, fontSize: 11 }} />;
                  })()}
                </div>
              </div>
              <InlineCoatingControls subConfig={subs.door_frames} onSet={(f, v) => setSub('door_frames', f, v)} />
            </>
          )}
        </div>
      </div>

      {/* === DOORS SUB-SECTION — paintable panels === */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Door Panels</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(painting scope)</span>
          <Toggle checked={doorsPainting} onChange={() => dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: 'doors' } })} label="Paint Doors" />
          <button className="btn btn-sm btn-accent" style={{ marginLeft: 'auto' }} onClick={() => dispatch({ type: 'ADD_DOOR', payload: { roomId: rid } })}>+ Add Door</button>
        </div>
        {doorsPainting && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
              <div>
                <span className="field-label" style={{ marginRight: 4 }}>Application</span>
                {(() => {
                  const sam = SUBSTRATE_APPLICATION_METHODS['doors'];
                  const methodOptions = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));
                  return <Select options={methodOptions} value={subs.doors?.application_method || null}
                    onChange={v => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: 'doors', field: 'application_method', value: v || null } })}
                    placeholder={`Default (${sam.default})`} style={{ width: 150 }} />;
                })()}
              </div>
            </div>
          </>
        )}
        {doorItems.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: 8, textAlign: 'center', fontSize: 12 }}>No door panels added yet.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Count</th><th>Type</th><th>Substrate State</th><th>Sides</th><th>Total Sides</th><th></th></tr></thead>
            <tbody>
              {doorItems.map(door => (
                <React.Fragment key={door.id}>
                  <tr>
                    <td><input type="number" value={door.count || ''} min="0" onChange={e => dispatch({ type: 'SET_DOOR', payload: { roomId: rid, doorId: door.id, field: 'count', value: parseInt(e.target.value) || 0 } })} style={{ width: 60 }} placeholder="0" /></td>
                    <td><Select options={ENUMS.doorTypes} value={door.door_type} onChange={v => dispatch({ type: 'SET_DOOR', payload: { roomId: rid, doorId: door.id, field: 'door_type', value: v } })} /></td>
                    <td><Select options={doorStates} value={door.substrate_state} onChange={v => dispatch({ type: 'SET_DOOR', payload: { roomId: rid, doorId: door.id, field: 'substrate_state', value: v } })} /></td>
                    <td><input type="number" value={door.sides_per_door || ''} min="1" max="2" onChange={e => dispatch({ type: 'SET_DOOR', payload: { roomId: rid, doorId: door.id, field: 'sides_per_door', value: parseInt(e.target.value) || 2 } })} style={{ width: 50 }} placeholder="2" /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{(parseInt(door.count) || 0) * (parseInt(door.sides_per_door) || 2)} EA_SIDE</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_DOOR', payload: { roomId: rid, doorId: door.id } })}>&#x2715;</button></td>
                  </tr>
                  {door.substrate_state === 'bare_wood' && doorsPainting && (
                    <tr><td colSpan="6" style={{ padding: '2px 0' }}>
                      <InlineCoatingControls subConfig={door} onSet={(f, v) => dispatch({ type: 'SET_DOOR', payload: { roomId: rid, doorId: door.id, field: f, value: v } })} />
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* === WINDOWS SUB-SECTION === */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Windows</span>
          <Toggle checked={windowsPainting} onChange={() => dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: 'windows' } })} label="Paint Windows" />
          <button className="btn btn-sm btn-accent" style={{ marginLeft: 'auto' }} onClick={() => dispatch({ type: 'ADD_WINDOW', payload: { roomId: rid } })}>+ Add Window</button>
        </div>
        {windowsPainting && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
              <div>
                <span className="field-label" style={{ marginRight: 4 }}>Application</span>
                {(() => {
                  const sam = SUBSTRATE_APPLICATION_METHODS['windows'];
                  const methodOptions = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));
                  return <Select options={methodOptions} value={subs.windows?.application_method || null}
                    onChange={v => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: 'windows', field: 'application_method', value: v || null } })}
                    placeholder={`Default (${sam.default})`} style={{ width: 150 }} />;
                })()}
              </div>
            </div>
          </>
        )}
        {windowItems.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: 8, textAlign: 'center', fontSize: 12 }}>No windows added yet.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Count</th><th>Type</th><th>Size Bucket</th><th>Substrate State</th><th>PS Key</th><th></th></tr></thead>
            <tbody>
              {windowItems.map(win => (
                <React.Fragment key={win.id}>
                  <tr>
                    <td><input type="number" value={win.count || ''} min="0" onChange={e => dispatch({ type: 'SET_WINDOW', payload: { roomId: rid, winId: win.id, field: 'count', value: parseInt(e.target.value) || 0 } })} style={{ width: 60 }} placeholder="0" /></td>
                    <td><Select options={ENUMS.windowTypes} value={win.window_type} onChange={v => dispatch({ type: 'SET_WINDOW', payload: { roomId: rid, winId: win.id, field: 'window_type', value: v } })} /></td>
                    <td><Select options={ENUMS.windowSizes} value={win.size_bucket} onChange={v => dispatch({ type: 'SET_WINDOW', payload: { roomId: rid, winId: win.id, field: 'size_bucket', value: v } })} /></td>
                    <td><Select options={winStates} value={win.substrate_state} onChange={v => dispatch({ type: 'SET_WINDOW', payload: { roomId: rid, winId: win.id, field: 'substrate_state', value: v } })} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--derived)' }}>PS_OPENING_EA.WINDOW_{win.size_bucket}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_WINDOW', payload: { roomId: rid, winId: win.id } })}>&#x2715;</button></td>
                  </tr>
                  {win.substrate_state === 'bare_wood' && windowsPainting && (
                    <tr><td colSpan="6" style={{ padding: '2px 0' }}>
                      <InlineCoatingControls subConfig={win} onSet={(f, v) => dispatch({ type: 'SET_WINDOW', payload: { roomId: rid, winId: win.id, field: f, value: v } })} />
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        {/* Associated Window Trim — casing always present for masking, toggle controls paint */}
        <div style={{ marginTop: 6, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Toggle checked={!!subs.window_casing?.painting} onChange={() => dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: 'window_casing' } })} label="Paint" />
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Window Casing</span>
            <span style={{ fontSize: 10, color: subs.window_casing?.painting ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500 }}>{subs.window_casing?.painting ? 'PAINT' : 'PROTECT'}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--derived)', marginLeft: 'auto' }}>{totalWindows > 0 ? `${totalWindows} x 12 = ${totalWindows * 12} LF` : '\u2014'}</span>
          </div>
          {subs.window_casing?.painting && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 4, paddingLeft: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>State</span>
                  <Select options={winCasingStates} value={subs.window_casing?.substrate_state || null} onChange={v => setSub('window_casing', 'substrate_state', v)} placeholder="Default" style={{ width: 130, fontSize: 11 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>App</span>
                  {(() => {
                    const sam = SUBSTRATE_APPLICATION_METHODS['window_casing'];
                    const opts = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));
                    return <Select options={opts} value={subs.window_casing?.application_method || null} onChange={v => setSub('window_casing', 'application_method', v)} placeholder={`Default (${sam.default})`} style={{ width: 130, fontSize: 11 }} />;
                  })()}
                </div>
              </div>
              <InlineCoatingControls subConfig={subs.window_casing} onSet={(f, v) => setSub('window_casing', f, v)} />
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <input type="checkbox" checked={!!subs.window_jamb} onChange={() => dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: 'window_jamb' } })} />
            <span style={{ fontSize: 12, color: subs.window_jamb ? 'var(--text-primary)' : 'var(--text-muted)' }}>Window Jambs</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--derived)', marginLeft: 'auto' }}>{totalWindows > 0 ? `${totalWindows} EA` : '\u2014'}</span>
          </div>
          {!!subs.window_jamb && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 4, paddingLeft: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>State</span>
                  <Select options={jambStates} value={subs.window_jamb?.substrate_state || null} onChange={v => setSub('window_jamb', 'substrate_state', v)} placeholder="Default" style={{ width: 130, fontSize: 11 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>App</span>
                  {(() => {
                    const sam = SUBSTRATE_APPLICATION_METHODS['window_jamb'];
                    const opts = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));
                    return <Select options={opts} value={subs.window_jamb?.application_method || null} onChange={v => setSub('window_jamb', 'application_method', v)} placeholder={`Default (${sam.default})`} style={{ width: 130, fontSize: 11 }} />;
                  })()}
                </div>
              </div>
              <InlineCoatingControls subConfig={subs.window_jamb} onSet={(f, v) => setSub('window_jamb', f, v)} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

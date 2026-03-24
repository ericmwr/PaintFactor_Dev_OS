import Toggle from '../../shared/Toggle';
import Select from '../../shared/Select';
import NumField from '../../shared/NumField';
import SubstrateStateSelect from '../SubstrateStateSelect';
import { ENUMS } from '../../../data/enums';
import { SUBSTRATE_APPLICATION_METHODS } from '../../../data/substrate-catalog';

export default function StructureTab({ room, derived, dispatch, project }) {
  const rid = room.id;
  const subs = room.substrates || {};
  const setRoom = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v } });
  const setSub = (subId, field, value) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: subId, field, value: value ?? null } });

  // Surface config helpers
  const wallCfg = subs.walls || {};
  const ceilCfg = subs.ceiling || {};
  const wallSAM = SUBSTRATE_APPLICATION_METHODS['walls'];
  const ceilSAM = SUBSTRATE_APPLICATION_METHODS['ceiling'];
  const wallMethodOpts = ENUMS.applicationMethods.filter(m => wallSAM.methods.includes(m.value));
  const ceilMethodOpts = ENUMS.applicationMethods.filter(m => ceilSAM.methods.includes(m.value));

  return (
    <div>
      {/* ── Walls ── */}
      <div className="panel-section" data-section="walls">
        <div className="section-title">Walls</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!subs.walls}
            onChange={() => dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: 'walls' } })} />
          Paint
        </label>
      {subs.walls && (
        <>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId="walls" value={wallCfg.substrate_state} onChange={v => setSub('walls', 'substrate_state', v)} />
          </div>
          <div>
            <div className="field-label">Texture</div>
            <Select options={ENUMS.textures} value={wallCfg.texture} onChange={v => setSub('walls', 'texture', v || null)} placeholder="Project Default" />
          </div>
          <div>
            <div className="field-label">Application Method</div>
            <Select options={wallMethodOpts} value={wallCfg.application_method} onChange={v => setSub('walls', 'application_method', v || null)} placeholder={`Default (${wallSAM.default})`} />
          </div>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.qualityTiers} value={wallCfg.quality_tier || null} onChange={v => setSub('walls', 'quality_tier', v || null)} placeholder={`Project (${project?.default_quality_tier || 'QT3'})`} />
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div className="field-label">Wall SF</div>
          <NumField value={wallCfg.sf_manual || ''} derived={Math.round(derived.wall_field_sf || 0)} isOverride={!!wallCfg.sf_override}
            onValueChange={v => setSub('walls', 'sf_manual', v)} onOverrideToggle={v => setSub('walls', 'sf_override', v)} uom="SF" />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Gross {derived.wallGross} - Deduct {derived.openingDeduction} = Net {derived.wallNet}{derived.gableExtra > 0 ? ` + Gable ${derived.gableExtra}` : ''}{derived.extraWallSF > 0 ? ` + Extra ${derived.extraWallSF}` : ''}</div>
        </div>
        {/* ── Extra Walls ── */}
        <div style={{ marginTop: 10 }}>
          {(room.extra_walls || []).length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Extra Walls</div>
          )}
          {(room.extra_walls || []).map(w => {
            const wSF = (parseFloat(w.length_ft) || 0) * (parseFloat(w.height_ft) || 0) * (w.both_sides ? 2 : 1);
            return (
              <div key={w.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <input
                  value={w.label}
                  onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'label', value: e.target.value } })}
                  placeholder="Label"
                  style={{ width: 100, fontSize: 12, padding: '3px 6px' }}
                />
                <input
                  type="number" min="0" step="0.5"
                  value={w.length_ft || ''}
                  onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'length_ft', value: parseFloat(e.target.value) || 0 } })}
                  placeholder="Length"
                  style={{ width: 60, fontSize: 12, padding: '3px 6px' }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{'\u00d7'}</span>
                <input
                  type="number" min="0" step="0.5"
                  value={w.height_ft || ''}
                  onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'height_ft', value: parseFloat(e.target.value) || 0 } })}
                  placeholder="Height"
                  style={{ width: 60, fontSize: 12, padding: '3px 6px' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={!!w.both_sides}
                    onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'both_sides', value: e.target.checked } })}
                  />
                  Both sides
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 50 }}>{Math.round(wSF)} SF</span>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_EXTRA_WALL', payload: { roomId: rid, wallId: w.id } })}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                  title="Remove wall"
                >{'\u00d7'}</button>
              </div>
            );
          })}
          {(derived.extraWallSF > 0) && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              Extra walls: +{derived.extraWallSF} SF wall, +{derived.extraWallLF} LF baseboard
            </div>
          )}
          <button
            className="btn btn-sm"
            onClick={() => dispatch({ type: 'ADD_EXTRA_WALL', payload: { roomId: rid } })}
            style={{ fontSize: 11, marginTop: 4 }}
          >+ Add Wall</button>
        </div>
        </>
      )}
      </div>

      {/* ── Ceiling ── */}
      <div className="panel-section" data-section="ceiling">
        <div className="section-title">Ceiling</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!subs.ceiling}
            onChange={() => dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: 'ceiling' } })} />
          Paint
        </label>
      {subs.ceiling && (
        <>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId="ceiling" value={ceilCfg.substrate_state} onChange={v => setSub('ceiling', 'substrate_state', v)} />
          </div>
          <div>
            <div className="field-label">Texture</div>
            <Select options={ENUMS.textures} value={ceilCfg.texture} onChange={v => setSub('ceiling', 'texture', v || null)} placeholder="Project Default" />
          </div>
          <div>
            <div className="field-label">Application Method</div>
            <Select options={ceilMethodOpts} value={ceilCfg.application_method} onChange={v => setSub('ceiling', 'application_method', v || null)} placeholder={`Default (${ceilSAM.default})`} />
          </div>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.qualityTiers} value={ceilCfg.quality_tier || null} onChange={v => setSub('ceiling', 'quality_tier', v || null)} placeholder={`Project (${project?.default_quality_tier || 'QT3'})`} />
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div className="field-label">Ceiling SF</div>
          <NumField value={ceilCfg.sf_manual || ''} derived={Math.round(derived.ceiling_field_sf || 0)} isOverride={!!ceilCfg.sf_override}
            onValueChange={v => setSub('ceiling', 'sf_manual', v)} onOverrideToggle={v => setSub('ceiling', 'sf_override', v)} uom="SF" />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>L&times;W = {derived.ceilingSF}{derived.vaultedExtra > 0 ? ` + Vault ${derived.vaultedExtra}` : ''}</div>
        </div>
        {subs.wood_ceiling && (
          <div style={{ padding: '6px 10px', marginTop: 6, background: '#4a3a1a', borderRadius: 4, fontSize: 11, color: '#f0c040' }}>
            <strong>Note:</strong> Wood Ceiling is also active in the Specialty tab. Both will generate separate ceiling estimates. If this is a wood ceiling, uncheck Ceiling here and configure it in Specialty instead.
          </div>
        )}
        {!subs.wood_ceiling && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            For wood plank, beadboard, or coffered ceilings, use Wood Ceiling in the Specialty tab instead.
          </div>
        )}
        </>
      )}
      </div>

      {/* ── Vault & Gable ── */}
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

      {/* ── Ceiling Beams ── (only shown when vaulted) */}
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
            <input type="number" value={room.cross_beam_count || ''} onChange={e => setRoom('cross_beam_count', parseInt(e.target.value) || 0)} min="0" max="20" disabled={!room.beams_enabled} style={{ width: 60, opacity: room.beams_enabled ? 1 : 0.4 }} />
          </div>
          <div>
            <div className="field-label">Ridge Beams (half)</div>
            <input type="number" value={room.ridge_beam_count || ''} onChange={e => setRoom('ridge_beam_count', parseInt(e.target.value) || 0)} min="0" max="20" disabled={!room.beams_enabled} style={{ width: 60, opacity: room.beams_enabled ? 1 : 0.4 }} />
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
    </div>
  );
}

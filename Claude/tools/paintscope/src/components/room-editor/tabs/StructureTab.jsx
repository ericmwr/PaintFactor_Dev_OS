import Toggle from '../../shared/Toggle';
import Select from '../../shared/Select';
import NumField from '../../shared/NumField';
import SubstrateStateSelect from '../SubstrateStateSelect';
import { ENUMS } from '../../../data/enums';
import { SUBSTRATE_APPLICATION_METHODS } from '../../../data/substrate-catalog';

const MATERIAL_OPTS = [{value:'drywall',label:'Drywall'},{value:'wood',label:'Wood'}];
const COATING_OPTS = [{value:'paint',label:'Paint'},{value:'stain_clear',label:'Stain + Clear'},{value:'stain_only',label:'Stain Only'},{value:'clear_only',label:'Clear Only'}];
const SPECIES_OPTS = [{value:'softwood',label:'Softwood'},{value:'hardwood',label:'Hardwood'}];
const STAIN_METHOD_OPTS = [{value:'brush',label:'Brush'},{value:'spray',label:'Spray'},{value:'roll',label:'Roll'}];
const CLEAR_METHOD_OPTS = [{value:'brush',label:'Brush'},{value:'spray',label:'Spray'}];

export default function StructureTab({ room, derived, dispatch, project }) {
  const rid = room.id;
  const subs = room.substrates || {};
  const setRoom = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v } });
  const setSub = (subId, field, value) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: subId, field, value: value ?? null } });

  const wallCfg = subs.walls || {};
  const ceilCfg = subs.ceiling || {};
  const wallSAM = SUBSTRATE_APPLICATION_METHODS['walls'];
  const ceilSAM = SUBSTRATE_APPLICATION_METHODS['ceiling'];
  const wallMethodOpts = ENUMS.applicationMethods.filter(m => wallSAM.methods.includes(m.value));
  const ceilMethodOpts = ENUMS.applicationMethods.filter(m => ceilSAM.methods.includes(m.value));

  const isWoodWall = room.wall_material === 'wood';
  const isWoodCeil = room.ceiling_material === 'wood';
  const isBareWoodWall = isWoodWall && wallCfg.substrate_state === 'bare_wood';
  const isBareWoodCeil = isWoodCeil && ceilCfg.substrate_state === 'bare_wood';
  const wallCoating = wallCfg.coating_type || 'paint';
  const ceilCoating = ceilCfg.coating_type || 'paint';
  const hasStain = (ct) => ct === 'stain_clear' || ct === 'stain_only';
  const hasClear = (ct) => ct === 'stain_clear' || ct === 'clear_only';

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
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Material</div>
            <Select options={MATERIAL_OPTS} value={room.wall_material || 'drywall'} onChange={v => setRoom('wall_material', v || 'drywall')} />
          </div>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId={isWoodWall ? 'wood_feature_wall' : 'walls'} value={wallCfg.substrate_state} onChange={v => setSub('walls', 'substrate_state', v)} />
          </div>
          {!isBareWoodWall && (
            <div>
              <div className="field-label">Texture</div>
              <Select options={ENUMS.textures} value={wallCfg.texture} onChange={v => setSub('walls', 'texture', v || null)} placeholder="Project Default" />
            </div>
          )}
          {isBareWoodWall && (
            <div>
              <div className="field-label">Coating Type</div>
              <Select options={COATING_OPTS} value={wallCoating} onChange={v => setSub('walls', 'coating_type', v)} />
            </div>
          )}
          <div>
            <div className="field-label">Application Method</div>
            <Select options={wallMethodOpts} value={wallCfg.application_method} onChange={v => setSub('walls', 'application_method', v || null)} placeholder={`Default (${wallSAM.default})`} />
          </div>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.qualityTiers} value={wallCfg.quality_tier || null} onChange={v => setSub('walls', 'quality_tier', v || null)} placeholder={`Project (${project?.default_quality_tier || 'QT3'})`} />
          </div>
        </div>

        {isBareWoodWall && (
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', marginTop: 6 }}>
            <div>
              <div className="field-label">Wood Species</div>
              <Select options={SPECIES_OPTS} value={wallCfg.wood_species_group || 'hardwood'} onChange={v => setSub('walls', 'wood_species_group', v)} />
            </div>
            {hasStain(wallCoating) && (
              <div>
                <div className="field-label">Stain Method</div>
                <Select options={STAIN_METHOD_OPTS} value={wallCfg.application_method_stain || 'brush'} onChange={v => setSub('walls', 'application_method_stain', v)} />
              </div>
            )}
            {hasClear(wallCoating) && (
              <div>
                <div className="field-label">Clear Method</div>
                <Select options={CLEAR_METHOD_OPTS} value={wallCfg.application_method_clear || 'brush'} onChange={v => setSub('walls', 'application_method_clear', v)} />
              </div>
            )}
          </div>
        )}

        {/* Wall SF */}
        <div style={{ marginTop: 6 }}>
          <div className="field-label">Wall SF</div>
          <NumField value={wallCfg.sf_manual || ''} derived={Math.round(derived.wall_field_sf || 0)} isOverride={!!wallCfg.sf_override}
            onValueChange={v => setSub('walls', 'sf_manual', v)} onOverrideToggle={v => setSub('walls', 'sf_override', v)} uom="SF" />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Gross {derived.wallGross} - Deduct {derived.openingDeduction} = Net {derived.wallNet}{derived.gableExtra > 0 ? ` + Gable ${derived.gableExtra}` : ''}{derived.extraWallSF > 0 ? ` + Extra ${derived.extraWallSF}` : ''}{derived.wallDeductSF > 0 ? ` - Deduct ${derived.wallDeductSF}` : ''}</div>
        </div>

        {/* Extra Walls */}
        <div style={{ marginTop: 10 }}>
          {(room.extra_walls || []).length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Extra Walls</div>
          )}
          {(room.extra_walls || []).map(w => {
            const wSF = (parseFloat(w.length_ft) || 0) * (parseFloat(w.height_ft) || 0) * (w.both_sides ? 2 : 1);
            return (
              <div key={w.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <input value={w.label} onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'label', value: e.target.value } })} placeholder="Label" style={{ width: 100, fontSize: 12, padding: '3px 6px' }} />
                <input type="number" min="0" step="0.5" value={w.length_ft || ''} onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'length_ft', value: parseFloat(e.target.value) || 0 } })} placeholder="Length" style={{ width: 60, fontSize: 12, padding: '3px 6px' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{'\u00d7'}</span>
                <input type="number" min="0" step="0.5" value={w.height_ft || ''} onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'height_ft', value: parseFloat(e.target.value) || 0 } })} placeholder="Height" style={{ width: 60, fontSize: 12, padding: '3px 6px' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={!!w.both_sides} onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'both_sides', value: e.target.checked } })} />
                  Both sides
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 50 }}>{Math.round(wSF)} SF</span>
                <button onClick={() => dispatch({ type: 'REMOVE_EXTRA_WALL', payload: { roomId: rid, wallId: w.id } })} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }} title="Remove wall">{'\u00d7'}</button>
              </div>
            );
          })}
          {(derived.extraWallSF > 0) && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Extra walls: +{derived.extraWallSF} SF wall, +{derived.extraWallLF} LF baseboard</div>
          )}
          <button className="btn btn-sm" onClick={() => dispatch({ type: 'ADD_EXTRA_WALL', payload: { roomId: rid } })} style={{ fontSize: 11, marginTop: 4 }}>+ Add Wall</button>
        </div>

        {/* Wall Deductions */}
        <div style={{ marginTop: 10 }}>
          {(room.wall_deductions || []).length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Wall Deductions</div>
          )}
          {(room.wall_deductions || []).map(w => {
            const wSF = (parseFloat(w.length_ft) || 0) * (parseFloat(w.height_ft) || 0) * (w.both_sides ? 2 : 1);
            return (
              <div key={w.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <input value={w.label} onChange={e => dispatch({ type: 'SET_WALL_DEDUCTION', payload: { roomId: rid, wallId: w.id, field: 'label', value: e.target.value } })} placeholder="Label" style={{ width: 100, fontSize: 12, padding: '3px 6px' }} />
                <input type="number" min="0" step="0.5" value={w.length_ft || ''} onChange={e => dispatch({ type: 'SET_WALL_DEDUCTION', payload: { roomId: rid, wallId: w.id, field: 'length_ft', value: parseFloat(e.target.value) || 0 } })} placeholder="Length" style={{ width: 60, fontSize: 12, padding: '3px 6px' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{'\u00d7'}</span>
                <input type="number" min="0" step="0.5" value={w.height_ft || ''} onChange={e => dispatch({ type: 'SET_WALL_DEDUCTION', payload: { roomId: rid, wallId: w.id, field: 'height_ft', value: parseFloat(e.target.value) || 0 } })} placeholder="Height" style={{ width: 60, fontSize: 12, padding: '3px 6px' }} />
                <span style={{ fontSize: 11, color: '#e74c3c', minWidth: 55 }}>-{Math.round(wSF)} SF</span>
                <button onClick={() => dispatch({ type: 'REMOVE_WALL_DEDUCTION', payload: { roomId: rid, wallId: w.id } })} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }} title="Remove deduction">{'\u00d7'}</button>
              </div>
            );
          })}
          {(derived.wallDeductSF > 0) && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Wall deductions: -{derived.wallDeductSF} SF wall, -{derived.wallDeductLF} LF baseboard</div>
          )}
          <button className="btn btn-sm" onClick={() => dispatch({ type: 'ADD_WALL_DEDUCTION', payload: { roomId: rid } })} style={{ fontSize: 11, marginTop: 4 }}>- Deduct Wall</button>
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
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Material</div>
            <Select options={MATERIAL_OPTS} value={room.ceiling_material || 'drywall'} onChange={v => setRoom('ceiling_material', v || 'drywall')} />
          </div>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId={isWoodCeil ? 'wood_ceiling' : 'ceiling'} value={ceilCfg.substrate_state} onChange={v => setSub('ceiling', 'substrate_state', v)} />
          </div>
          {!isBareWoodCeil && (
            <div>
              <div className="field-label">Texture</div>
              <Select options={ENUMS.textures} value={ceilCfg.texture} onChange={v => setSub('ceiling', 'texture', v || null)} placeholder="Project Default" />
            </div>
          )}
          {isBareWoodCeil && (
            <div>
              <div className="field-label">Coating Type</div>
              <Select options={COATING_OPTS} value={ceilCoating} onChange={v => setSub('ceiling', 'coating_type', v)} />
            </div>
          )}
          <div>
            <div className="field-label">Application Method</div>
            <Select options={ceilMethodOpts} value={ceilCfg.application_method} onChange={v => setSub('ceiling', 'application_method', v || null)} placeholder={`Default (${ceilSAM.default})`} />
          </div>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.qualityTiers} value={ceilCfg.quality_tier || null} onChange={v => setSub('ceiling', 'quality_tier', v || null)} placeholder={`Project (${project?.default_quality_tier || 'QT3'})`} />
          </div>
        </div>

        {isBareWoodCeil && (
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', marginTop: 6 }}>
            <div>
              <div className="field-label">Wood Species</div>
              <Select options={SPECIES_OPTS} value={ceilCfg.wood_species_group || 'hardwood'} onChange={v => setSub('ceiling', 'wood_species_group', v)} />
            </div>
            {hasStain(ceilCoating) && (
              <div>
                <div className="field-label">Stain Method</div>
                <Select options={STAIN_METHOD_OPTS} value={ceilCfg.application_method_stain || 'brush'} onChange={v => setSub('ceiling', 'application_method_stain', v)} />
              </div>
            )}
            {hasClear(ceilCoating) && (
              <div>
                <div className="field-label">Clear Method</div>
                <Select options={CLEAR_METHOD_OPTS} value={ceilCfg.application_method_clear || 'brush'} onChange={v => setSub('ceiling', 'application_method_clear', v)} />
              </div>
            )}
          </div>
        )}

        {/* Ceiling SF */}
        <div style={{ marginTop: 6 }}>
          <div className="field-label">Ceiling SF</div>
          <NumField value={ceilCfg.sf_manual || ''} derived={Math.round(derived.ceiling_field_sf || 0)} isOverride={!!ceilCfg.sf_override}
            onValueChange={v => setSub('ceiling', 'sf_manual', v)} onOverrideToggle={v => setSub('ceiling', 'sf_override', v)} uom="SF" />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>L&times;W = {derived.ceilingSF}{derived.vaultedExtra > 0 ? ` + Vault ${derived.vaultedExtra}` : ''}</div>
        </div>

        {/* Vault & Gable — inline under ceiling */}
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Vault &amp; Gable</div>
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
          {room.vaulted_ceiling && (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr', marginTop: 4 }}>
              <div>
                <div className="field-label">Gable Walls</div>
                <input type="number" value={room.gable_walls || ''} onChange={e => setRoom('gable_walls', parseInt(e.target.value) || 0)} min="0" max="4" style={{ width: 60 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                {(derived.vaultedExtra > 0 || derived.gableExtra > 0) && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {derived.vaultedExtra > 0 && <span>Extra Ceiling: <b style={{ color: 'var(--accent)' }}>+{derived.vaultedExtra} SF</b></span>}
                    {derived.vaultedExtra > 0 && derived.gableExtra > 0 && <span style={{ margin: '0 8px' }}>|</span>}
                    {derived.gableExtra > 0 && <span>Extra Wall: <b style={{ color: 'var(--accent)' }}>+{derived.gableExtra} SF</b></span>}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Conflict warnings */}
        {subs.wood_ceiling && isWoodCeil && (
          <div style={{ padding: '6px 10px', marginTop: 6, background: '#4a3a1a', borderRadius: 4, fontSize: 11, color: '#f0c040' }}>
            <strong>Note:</strong> Wood Ceiling is also active in Specialty. Since ceiling material is set to Wood here, the Specialty wood ceiling will produce duplicate estimates — consider unchecking it there.
          </div>
        )}
        {subs.wood_ceiling && !isWoodCeil && (
          <div style={{ padding: '6px 10px', marginTop: 6, background: '#4a3a1a', borderRadius: 4, fontSize: 11, color: '#f0c040' }}>
            <strong>Note:</strong> Wood Ceiling is also active in Specialty. Both will generate separate ceiling estimates. Set ceiling material to Wood here, or uncheck Ceiling and use Specialty instead.
          </div>
        )}
        </>
      )}
      </div>

      {/* ── Ceiling Beams ── (available for all ceilings, not just vaulted) */}
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
          {room.vaulted_ceiling && (
            <div>
              <Toggle checked={!!room.peak_beam} onChange={v => setRoom('peak_beam', v)} label="Peak Beam" disabled={!room.beams_enabled} />
            </div>
          )}
          <div>
            <div className="field-label">Cross Beams</div>
            <input type="number" value={room.cross_beam_count || ''} onChange={e => setRoom('cross_beam_count', parseInt(e.target.value) || 0)} min="0" max="20" disabled={!room.beams_enabled} style={{ width: 60, opacity: room.beams_enabled ? 1 : 0.4 }} />
          </div>
          {room.vaulted_ceiling && (
            <div>
              <div className="field-label">Ridge Beams (half)</div>
              <input type="number" value={room.ridge_beam_count || ''} onChange={e => setRoom('ridge_beam_count', parseInt(e.target.value) || 0)} min="0" max="20" disabled={!room.beams_enabled} style={{ width: 60, opacity: room.beams_enabled ? 1 : 0.4 }} />
            </div>
          )}
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
    </div>
  );
}

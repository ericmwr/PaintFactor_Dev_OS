import Select from '../shared/Select';
import NumField from '../shared/NumField';
import SubstrateStateSelect from './SubstrateStateSelect';
import { ENUMS } from '../../data/enums';
import { SUBSTRATE_MAP, SUBSTRATE_APPLICATION_METHODS } from '../../data/substrate-catalog';
import { SUBSTRATE_SYSTEMS, SYSTEM_METADATA, inferDefaultSystem, coatingTypeFromSystem } from '../../data/system-catalog.js';
import { useModifierEnum } from '../../hooks/useModifierEnum';
import { deriveHeightBand } from '../../engine/derive-room.js';

const HEIGHT_BAND_OPTIONS = [
  { value: 'STD',      label: 'Ground Level (STD)' },
  { value: 'STEP',     label: 'Step Ladder (9–13 ft)' },
  { value: 'EXT',      label: 'Extension Ladder (13–18 ft)' },
  { value: 'SCAFFOLD', label: 'Scaffold (18–25 ft)' },
  { value: 'LIFT',     label: 'Lift (25+ ft)' },
];

const HEIGHT_BAND_LABELS = HEIGHT_BAND_OPTIONS.reduce((acc, o) => { acc[o.value] = o.label; return acc; }, {});

export default function SubstrateDetailPanel({ room, derived, dispatch, substrateId, project }) {
  const textureOptions = useModifierEnum('FAC_TEXTURE');
  const rid = room.id;
  const config = room.substrates[substrateId];
  if (!config) return null;
  const cat = SUBSTRATE_MAP[substrateId];
  if (!cat) return null;

  const setSub = (f, v) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId, field: f, value: v } });

  // Stain/clear coat helpers
  const WOOD_SUBSTRATES = new Set([
    'doors', 'door_frames', 'door_casing', 'window_casing', 'windows', 'window_jamb',
    'baseboard', 'crown', 'chair_rail', 'shoe_mold', 'wainscoting',
    'wood_feature_wall', 'wood_ceiling', 'beams', 'columns', 'mantels',
    'builtins', 'stair_risers', 'stair_railing',
  ]);
  const isWood = WOOD_SUBSTRATES.has(substrateId);
  const isBareWood = isWood && config.substrate_state === 'bare_wood';
  // coating_type was retired as a UI field — System is the source of truth.
  // Derive coating_type from the effective system (explicit or auto-inferred).
  const _effectiveSystem = config.system || inferDefaultSystem(substrateId, config.substrate_state);
  const coatingType = coatingTypeFromSystem(_effectiveSystem) || config.coating_type || 'paint';
  const includesStain = coatingType === 'stain_clear' || coatingType === 'stain_only';
  const includesClear = coatingType === 'stain_clear' || coatingType === 'clear_only';

  // Determine derived value and UOM
  const uom = cat.uom;
  const hasAuto = !!cat.autoDerive;
  let autoDerivedVal = 0;
  if (hasAuto) {
    // Look up the derived value by key convention
    const dKey = Object.keys(derived).find(k => k.startsWith(substrateId.replace(/_/g, '_')));
    if (dKey) autoDerivedVal = derived[dKey] || 0;
    else autoDerivedVal = cat.autoDerive({
      perimeter: derived.perimeter,
      totalDoors: derived.totalDoors,
      totalWindows: derived.totalWindows,
      totalOpenings: derived.totalOpenings,
      openingCasingLF: derived.openingCasingLF,
      wall_field_sf: derived.wall_field_sf,
      ceiling_field_sf: derived.ceiling_field_sf,
    }) || 0;
  }

  // For SF-based surfaces (walls, ceiling)
  const isSF = uom === 'SF' && (config.sf_override !== undefined || config.sf_manual !== undefined);
  // For LF-based substrates
  const isLF = uom === 'LF';
  // For EA-based substrates (specialty)
  const isEA = uom === 'EA' && config.ea_manual !== undefined;
  // For EA-auto (door_frames, window_jamb)
  const isEAAuto = uom === 'EA' && config.ea_manual === undefined;

  return (
    <div>
      <div className="panel-section">
        <div className="section-title">{cat.label} Details</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId={substrateId} value={config.substrate_state} onChange={v => setSub('substrate_state', v)} />
          </div>

          {/* Quality Tier per-substrate override */}
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.qualityTiers} value={config.quality_tier || null} onChange={v => setSub('quality_tier', v || null)} placeholder={`Project Default (${project?.default_quality_tier || 'QT3'})`} />
          </div>

          {/* System (workflow intent) — gates which spec phases activate */}
          {(() => {
            const allowed = SUBSTRATE_SYSTEMS[substrateId] || [];
            if (allowed.length === 0) return null;
            const inferred = inferDefaultSystem(substrateId, config.substrate_state);
            const effective = config.system || inferred;
            const isAutoInferred = !config.system || config.system === inferred;
            const options = allowed.map(v => ({ value: v, label: SYSTEM_METADATA[v]?.label || v }));
            return (
              <div>
                <div className="field-label" title="Workflow intent — prime+finish, finish-only, prime-only, stain, etc.">
                  System {isAutoInferred && effective && <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(auto-inferred)</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1 }}>
                    <Select
                      options={options}
                      value={effective || null}
                      onChange={v => setSub('system', v || null)}
                      placeholder={inferred ? `Default (${SYSTEM_METADATA[inferred]?.label || inferred})` : 'Select system…'}
                    />
                  </div>
                  {config.system && (
                    <button
                      onClick={() => setSub('system', null)}
                      title="Reset to auto-inferred default"
                      style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer' }}
                    >↺</button>
                  )}
                </div>
                {effective && SYSTEM_METADATA[effective]?.description && (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    {SYSTEM_METADATA[effective].description}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Application Method per-substrate */}
          {config.application_method !== undefined && (() => {
            const sam = SUBSTRATE_APPLICATION_METHODS[substrateId];
            if (!sam) return null;
            const methodOptions = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));
            return (
              <div>
                <div className="field-label">Application Method</div>
                <Select options={methodOptions} value={config.application_method} onChange={v => setSub('application_method', v || null)} placeholder={`Default (${sam.default})`} />
              </div>
            );
          })()}

          {/* Texture for walls/ceiling */}
          {config.texture !== undefined && (
            <div>
              <div className="field-label">Texture (null = project default)</div>
              <Select options={textureOptions} value={config.texture} onChange={v => setSub('texture', v || null)} placeholder="Project Default" />
            </div>
          )}

          {/* Style for casing types */}
          {config.style !== undefined && (
            <div>
              <div className="field-label">Profile Style</div>
              <input value={config.style || ''} onChange={e => setSub('style', e.target.value || null)} style={{ width: '100%' }} placeholder="e.g. Colonial, Craftsman" />
            </div>
          )}

          {/* V1a: Finish Group — non-wall/ceiling only. A/B reserved for
              walls/ceiling (driven by the combined-finish toggle). */}
          {!['walls', 'ceiling'].includes(substrateId) && config.finish_group !== undefined && (
            <div>
              <div className="field-label" title="Groups items that share a finish pass. Items in the same group get one coordinated setup/cleanup.">
                Finish Group
              </div>
              <Select
                options={[
                  { value: 'C', label: 'C' },
                  { value: 'D', label: 'D' },
                  { value: 'E', label: 'E' },
                  { value: 'F', label: 'F' },
                ]}
                value={config.finish_group}
                onChange={v => setSub('finish_group', v)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Height Band — per-substrate work-height override for trim that
          doesn't follow the room band (crown at ceiling, picture_rail near
          ceiling, panel_mold / shadow_box with optional explicit override). */}
      {['crown', 'picture_rail', 'panel_mold', 'shadow_box'].includes(substrateId) && (() => {
        const ceilFt = parseFloat(room.peak_height_ft) || parseFloat(room.height_ft) || 0;
        let derivedBand = null;
        let derivedSourceFt = 0;
        if (substrateId === 'crown' && ceilFt > 0) {
          derivedBand = deriveHeightBand(ceilFt);
          derivedSourceFt = ceilFt;
        } else if (substrateId === 'picture_rail') {
          const explicit = parseFloat(config.mounted_height_ft);
          if (explicit > 0) {
            derivedBand = deriveHeightBand(explicit);
            derivedSourceFt = explicit;
          } else if (ceilFt > 0) {
            derivedSourceFt = Math.max(0, ceilFt - 1);
            derivedBand = deriveHeightBand(derivedSourceFt);
          }
        }
        return (
          <div className="panel-section">
            <div className="section-title">Height Band</div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {substrateId === 'crown' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {derivedBand
                      ? <>Auto: <strong>{HEIGHT_BAND_LABELS[derivedBand]}</strong> (from {derivedSourceFt.toFixed(1)} ft ceiling/peak)</>
                      : <>Set ceiling height on the Structure tab to derive the band.</>}
                  </div>
                </div>
              )}

              {substrateId === 'picture_rail' && (
                <>
                  <div>
                    <div className="field-label" title="Override the derived mounting height (ceiling − 1 ft) when the picture rail sits at a non-standard height.">
                      Mounted Height (ft)
                    </div>
                    <input
                      type="number" min="0" step="0.5"
                      value={config.mounted_height_ft || ''}
                      onChange={e => setSub('mounted_height_ft', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder={ceilFt > 0 ? `Auto (${Math.max(0, ceilFt - 1).toFixed(1)})` : 'Auto'}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div className="field-label">Derived Band</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 0' }}>
                      {derivedBand ? HEIGHT_BAND_LABELS[derivedBand] : '—'}
                    </div>
                  </div>
                </>
              )}

              {(substrateId === 'panel_mold' || substrateId === 'shadow_box') && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="field-label" title="Defaults to ground level. Override only when this substrate is mounted high (e.g. coffered ceiling panels).">
                    Height Band Override
                  </div>
                  <Select
                    options={HEIGHT_BAND_OPTIONS}
                    value={config.height_band_override || null}
                    onChange={v => setSub('height_band_override', v || null)}
                    placeholder="Default (Ground Level)"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Stain / Clear Coat controls (bare wood on wood substrates only).
          Coating Type was retired — see System above for workflow choice. */}
      {isBareWood && coatingType !== 'paint' && (
        <div className="panel-section">
          <div className="section-title">Coating</div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="field-label">Wood Species</div>
              <Select options={ENUMS.woodSpeciesGroup} value={config.wood_species_group || 'hardwood'}
                onChange={v => setSub('wood_species_group', v)} />
            </div>
            {/* placeholder retained so the original block structure stays clean */}
            <div></div>

            {includesStain && (
              <>
                <div>
                  <div className="field-label">Stain Method</div>
                  <Select options={ENUMS.stainApplicationMethods} value={config.application_method_stain || 'brush'}
                    onChange={v => setSub('application_method_stain', v)} />
                </div>
                <div>
                  <div className="field-label">Stain Coats</div>
                  <Select options={ENUMS.stainCoatCounts} value={config.stain_coats ?? 1}
                    onChange={v => setSub('stain_coats', Number(v))} />
                </div>
              </>
            )}

            {includesClear && (
              <>
                <div>
                  <div className="field-label">Clear Method</div>
                  <Select options={ENUMS.clearApplicationMethods} value={config.application_method_clear || 'brush'}
                    onChange={v => setSub('application_method_clear', v)} />
                </div>
                <div>
                  <div className="field-label">Clear Sheen</div>
                  <Select options={ENUMS.clearSheen} value={config.clear_sheen || 'satin'}
                    onChange={v => setSub('clear_sheen', v)} />
                </div>
                <div>
                  <div className="field-label">Sealer Coats</div>
                  <Select options={ENUMS.sealerCoatCounts} value={config.sealer_coats ?? 0}
                    onChange={v => setSub('sealer_coats', Number(v))} />
                </div>
                <div>
                  <div className="field-label">Clear Coats</div>
                  <Select options={ENUMS.clearCoatCounts} value={config.clear_coats ?? 1}
                    onChange={v => setSub('clear_coats', Number(v))} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grain Fill toggle (bare wood + paint coating only) */}
      {isBareWood && coatingType === 'paint' && (
        <div className="panel-section">
          <div className="section-title">Grain Fill</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <input type="checkbox" id={`grain-fill-${substrateId}`} checked={!!config.grain_fill}
              onChange={e => setSub('grain_fill', e.target.checked)} />
            <label htmlFor={`grain-fill-${substrateId}`} style={{ fontSize: 12 }}>
              Fill open grain before painting
            </label>
          </div>
          {config.grain_fill && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Open-grain hardwoods (oak, ash, walnut, hickory, mahogany). Coat count follows quality tier.
            </div>
          )}
        </div>
      )}

      {/* Quantity section */}
      <div className="panel-section">
        <div className="section-title">Quantity ({uom})</div>

        {/* SF with override (walls, ceiling) */}
        {isSF && hasAuto && (
          <div>
            <NumField value={config.sf_manual || ''} derived={Math.round(autoDerivedVal)} isOverride={!!config.sf_override}
              onValueChange={v => setSub('sf_manual', v)} onOverrideToggle={v => setSub('sf_override', v)} uom="SF" />
            {substrateId === 'walls' && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Gross {derived.wallGross} - Openings {derived.openingDeduction}{derived.featureWallDeduct > 0 ? ` - Feature Wall ${derived.featureWallDeduct}` : ''}{derived.gableExtra > 0 ? ` + Gable ${derived.gableExtra}` : ''} = {derived.wall_field_sf} SF</div>}
            {substrateId === 'ceiling' && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>L&times;W = {derived.ceilingSF}{derived.vaultedExtra > 0 ? ` + Vault ${derived.vaultedExtra}` : ''}</div>}
          </div>
        )}

        {/* SF manual-only (specialty SF items, EXCEPT wainscoting/mantels which
            have their own length-driven calc — handled in their own blocks below) */}
        {isSF && !hasAuto && substrateId !== 'wainscoting' && substrateId !== 'mantels' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={config.sf_manual || ''} onChange={e => setSub('sf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 100 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>SF</span>
            <span className="badge badge-manual">manual</span>
          </div>
        )}

        {/* Wainscot Panel — Length × Height drives SF; SF stays as override. */}
        {substrateId === 'wainscoting' && (() => {
          const lf = parseFloat(config.lf_manual) || 0;
          const ht = parseFloat(config.wainscot_height_ft) || 0;
          const computedSF = Math.round(lf * ht);
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Length</span>
                  <input type="number" value={config.lf_manual || ''} onChange={e => setSub('lf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 80 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LF</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Height</span>
                  <input type="number" step="0.25" value={config.wainscot_height_ft || ''} onChange={e => setSub('wainscot_height_ft', parseFloat(e.target.value) || 0)} min="0" style={{ width: 70 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ft</span>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <NumField
                  value={config.sf_manual || ''}
                  derived={computedSF}
                  isOverride={!!config.sf_override}
                  onValueChange={v => setSub('sf_manual', v)}
                  onOverrideToggle={v => setSub('sf_override', v)}
                  uom="SF"
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  Length × Height = {computedSF} SF (override for non-rectangular runs)
                </div>
              </div>
            </div>
          );
        })()}

        {/* Beams — Length × Sides drives total LF (each face contributes its own LF). */}
        {substrateId === 'beams' && (() => {
          const lf = parseFloat(config.lf_manual) || 0;
          const sides = parseInt(config.beam_sides) || 4;
          const totalLF = lf * sides;
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Length</span>
                  <input type="number" value={config.lf_manual || ''} onChange={e => setSub('lf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 80 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LF</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sides</span>
                  <Select
                    options={[
                      { value: 3, label: '3 (attached to ceiling)' },
                      { value: 4, label: '4 (exposed)' },
                    ]}
                    value={sides}
                    onChange={v => setSub('beam_sides', parseInt(v) || 4)}
                  />
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                Length × Sides = {totalLF} LF total
              </div>
            </div>
          );
        })()}

        {/* Columns — Height × Sides drives total LF (each face contributes its own LF). */}
        {substrateId === 'columns' && (() => {
          const lf = parseFloat(config.lf_manual) || 0;
          const sides = parseInt(config.column_sides) || 4;
          const totalLF = lf * sides;
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Height</span>
                  <input type="number" value={config.lf_manual || ''} onChange={e => setSub('lf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 80 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LF</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sides</span>
                  <Select
                    options={[
                      { value: 3, label: '3 (attached to wall)' },
                      { value: 4, label: '4 (free-standing)' },
                    ]}
                    value={sides}
                    onChange={v => setSub('column_sides', parseInt(v) || 4)}
                  />
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                Height × Sides = {totalLF} LF total
              </div>
            </div>
          );
        })()}

        {/* Mantels — Length drives SF (top + bottom + sides folded into 2× LF rule). */}
        {substrateId === 'mantels' && (() => {
          const lf = parseFloat(config.lf_manual) || 0;
          const totalSF = lf * 2;
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Length</span>
                <input type="number" value={config.lf_manual || ''} onChange={e => setSub('lf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 80 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LF</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                Length × 2 = {totalSF} SF total (top + bottom + sides)
              </div>
            </div>
          );
        })()}

        {/* LF with auto-derive */}
        {isLF && hasAuto && (
          <div>
            <NumField value={config.lf_manual || ''} derived={Math.round(autoDerivedVal)} isOverride={!!config.lf_override}
              onValueChange={v => setSub('lf_manual', v)} onOverrideToggle={v => setSub('lf_override', v)} uom="LF" />
          </div>
        )}

        {/* LF manual-only (chair rail, shoe mold, etc.) — beams/columns handled above */}
        {isLF && !hasAuto && substrateId !== 'beams' && substrateId !== 'columns' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={config.lf_manual || ''} onChange={e => setSub('lf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 100 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LF</span>
            <span className="badge badge-manual">manual</span>
          </div>
        )}

        {/* EA manual (specialty) */}
        {isEA && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={config.ea_manual || ''} onChange={e => setSub('ea_manual', parseInt(e.target.value) || 0)} min="0" style={{ width: 80 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>EA</span>
            <span className="badge badge-manual">manual</span>
          </div>
        )}

        {/* EA auto-derived (door_frames, window_jamb) */}
        {isEAAuto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)' }}>{Math.round(autoDerivedVal)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>EA (auto-derived)</span>
            <span className="badge badge-auto">auto</span>
          </div>
        )}
      </div>
    </div>
  );
}

import Select from '../shared/Select';
import NumField from '../shared/NumField';
import SubstrateStateSelect from './SubstrateStateSelect';
import { ENUMS } from '../../data/enums';
import { SUBSTRATE_MAP, SUBSTRATE_APPLICATION_METHODS } from '../../data/substrate-catalog';

export default function SubstrateDetailPanel({ room, derived, dispatch, substrateId, project }) {
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
  const coatingType = config.coating_type || 'paint';
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
              <Select options={ENUMS.textures} value={config.texture} onChange={v => setSub('texture', v || null)} placeholder="Project Default" />
            </div>
          )}

          {/* Style for casing types */}
          {config.style !== undefined && (
            <div>
              <div className="field-label">Profile Style</div>
              <input value={config.style || ''} onChange={e => setSub('style', e.target.value || null)} style={{ width: '100%' }} placeholder="e.g. Colonial, Craftsman" />
            </div>
          )}
        </div>
      </div>

      {/* Stain / Clear Coat controls (bare wood on wood substrates only) */}
      {isBareWood && (
        <div className="panel-section">
          <div className="section-title">Coating</div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="field-label">Coating Type</div>
              <Select options={ENUMS.intCoatingTypes} value={coatingType}
                onChange={v => setSub('coating_type', v)} />
            </div>

            {coatingType !== 'paint' && (
              <div>
                <div className="field-label">Wood Species</div>
                <Select options={ENUMS.woodSpeciesGroup} value={config.wood_species_group || 'hardwood'}
                  onChange={v => setSub('wood_species_group', v)} />
              </div>
            )}

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

        {/* SF manual-only (specialty SF items) */}
        {isSF && !hasAuto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={config.sf_manual || ''} onChange={e => setSub('sf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 100 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>SF</span>
            <span className="badge badge-manual">manual</span>
          </div>
        )}

        {/* LF with auto-derive */}
        {isLF && hasAuto && (
          <div>
            <NumField value={config.lf_manual || ''} derived={Math.round(autoDerivedVal)} isOverride={!!config.lf_override}
              onValueChange={v => setSub('lf_manual', v)} onOverrideToggle={v => setSub('lf_override', v)} uom="LF" />
          </div>
        )}

        {/* LF manual-only (chair rail, shoe mold, etc.) */}
        {isLF && !hasAuto && (
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

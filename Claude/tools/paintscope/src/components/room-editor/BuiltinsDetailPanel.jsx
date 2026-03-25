import Select from '../shared/Select';
import SubstrateStateSelect from './SubstrateStateSelect';
import { ENUMS } from '../../data/enums';
import { SUBSTRATE_APPLICATION_METHODS } from '../../data/substrate-catalog';

export default function BuiltinsDetailPanel({ room, dispatch, project }) {
  const rid = room.id;
  const config = room.substrates.builtins;
  if (!config) return null;

  const setSub = (f, v) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: 'builtins', field: f, value: v } });

  // Coating visibility
  const isBareWood = config.substrate_state === 'bare_wood';
  const coatingType = config.coating_type || 'paint';
  const includesStain = coatingType === 'stain_clear' || coatingType === 'stain_only';
  const includesClear = coatingType === 'stain_clear' || coatingType === 'clear_only';

  // Application method options
  const sam = SUBSTRATE_APPLICATION_METHODS.builtins;
  const methodOptions = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));

  // Total openings
  const totalOpenings = (config.openings_s || 0) + (config.openings_m || 0) + (config.openings_l || 0) + (config.openings_xl || 0);

  return (
    <div>
      {/* Section 1: Substrate & Coating */}
      <div className="panel-section">
        <div className="section-title">Built-ins Details</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId="builtins" value={config.substrate_state} onChange={v => setSub('substrate_state', v)} />
          </div>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.qualityTiers} value={config.quality_tier || null} onChange={v => setSub('quality_tier', v || null)} placeholder={`Project Default (${project?.default_quality_tier || 'QT3'})`} />
          </div>
          <div>
            <div className="field-label">Application Method</div>
            <Select options={methodOptions} value={config.application_method} onChange={v => setSub('application_method', v || null)} placeholder={`Default (${sam.default})`} />
          </div>
          {isBareWood && (
            <div>
              <div className="field-label">Coating Type</div>
              <Select options={ENUMS.intCoatingTypes} value={coatingType} onChange={v => setSub('coating_type', v)} />
            </div>
          )}
        </div>
      </div>

      {/* Stain / Clear Coat controls (bare wood + non-paint) */}
      {isBareWood && coatingType !== 'paint' && (
        <div className="panel-section">
          <div className="section-title">Coating</div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="field-label">Wood Species</div>
              <Select options={ENUMS.woodSpeciesGroup} value={config.wood_species_group || 'hardwood'} onChange={v => setSub('wood_species_group', v)} />
            </div>
            {includesStain && (
              <>
                <div>
                  <div className="field-label">Stain Method</div>
                  <Select options={ENUMS.stainApplicationMethods} value={config.application_method_stain || 'brush'} onChange={v => setSub('application_method_stain', v)} />
                </div>
                <div>
                  <div className="field-label">Stain Coats</div>
                  <Select options={ENUMS.stainCoatCounts} value={config.stain_coats ?? 1} onChange={v => setSub('stain_coats', Number(v))} />
                </div>
              </>
            )}
            {includesClear && (
              <>
                <div>
                  <div className="field-label">Clear Method</div>
                  <Select options={ENUMS.clearApplicationMethods} value={config.application_method_clear || 'brush'} onChange={v => setSub('application_method_clear', v)} />
                </div>
                <div>
                  <div className="field-label">Clear Sheen</div>
                  <Select options={ENUMS.clearSheen} value={config.clear_sheen || 'satin'} onChange={v => setSub('clear_sheen', v)} />
                </div>
                <div>
                  <div className="field-label">Sealer Coats</div>
                  <Select options={ENUMS.sealerCoatCounts} value={config.sealer_coats ?? 0} onChange={v => setSub('sealer_coats', Number(v))} />
                </div>
                <div>
                  <div className="field-label">Clear Coats</div>
                  <Select options={ENUMS.clearCoatCounts} value={config.clear_coats ?? 1} onChange={v => setSub('clear_coats', Number(v))} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grain Fill (bare wood + paint only) */}
      {isBareWood && coatingType === 'paint' && (
        <div className="panel-section">
          <div className="section-title">Grain Fill</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <input type="checkbox" id="grain-fill-builtins" checked={!!config.grain_fill} onChange={e => setSub('grain_fill', e.target.checked)} />
            <label htmlFor="grain-fill-builtins" style={{ fontSize: 12 }}>Fill open grain before painting</label>
          </div>
          {config.grain_fill && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Open-grain hardwoods (oak, ash, walnut, hickory, mahogany). Coat count follows quality tier.
            </div>
          )}
        </div>
      )}

      {/* Section 2: Opening Counts */}
      <div className="panel-section">
        <div className="section-title">Opening Counts</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {[
            { key: 'openings_s', label: 'Small', hint: '6\u201318"' },
            { key: 'openings_m', label: 'Medium', hint: '18\u201336"' },
            { key: 'openings_l', label: 'Large', hint: '36\u201360"' },
            { key: 'openings_xl', label: 'X-Large', hint: '60"+' },
          ].map(t => (
            <div key={t.key} style={{ textAlign: 'center' }}>
              <div className="field-label" style={{ textAlign: 'center' }}>{t.label}</div>
              <input type="number" value={config[t.key] || ''} min="0"
                onChange={e => setSub(t.key, parseInt(e.target.value) || 0)}
                style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{t.hint}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="field-label" style={{ margin: 0 }}>Full-Height Sides</div>
          <input type="number" value={config.full_height_sides || ''} min="0"
            onChange={e => setSub('full_height_sides', parseInt(e.target.value) || 0)}
            style={{ width: 60, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>EA</span>
        </div>
        <div style={{ marginTop: 6, textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>
          Total openings: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{totalOpenings}</span>
        </div>
      </div>

      {/* Section 3: Modifiers */}
      <div className="panel-section">
        <div className="section-title">Modifiers</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Depth</div>
            <Select options={ENUMS.builtinDepth} value={config.depth_modifier || 'deep'} onChange={v => setSub('depth_modifier', v)} />
          </div>
          <div>
            <div className="field-label">Detail / Profile</div>
            <Select options={ENUMS.builtinDetail} value={config.detail_modifier || 'simple_box'} onChange={v => setSub('detail_modifier', v)} />
          </div>
          <div>
            <div className="field-label">Access</div>
            <Select options={ENUMS.builtinAccess} value={config.access_modifier || 'open_access'} onChange={v => setSub('access_modifier', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

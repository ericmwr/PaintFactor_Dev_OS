import Select from '../shared/Select';
import SubstrateStateSelect from './SubstrateStateSelect';
import { ENUMS } from '../../data/enums';
import { SUBSTRATE_APPLICATION_METHODS } from '../../data/substrate-catalog';

export default function ClosetShelvingDetailPanel({ room, dispatch, project }) {
  const rid = room.id;
  const config = room.substrates.closet_shelving;
  if (!config) return null;

  const setSub = (f, v) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: 'closet_shelving', field: f, value: v } });

  // Coating visibility
  const isBareWood = config.substrate_state === 'bare_wood';
  const coatingType = config.coating_type || 'paint';
  const includesStain = coatingType === 'stain_clear' || coatingType === 'stain_only';
  const includesClear = coatingType === 'stain_clear' || coatingType === 'clear_only';

  // Application method options
  const sam = SUBSTRATE_APPLICATION_METHODS.closet_shelving;
  const methodOptions = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));

  // Computed values
  const shelfCount = config.shelf_count || 0;
  const lfPerShelf = config.lf_per_shelf || 0;
  const depthIn = config.depth_in || 12;
  const totalLF = shelfCount * lfPerShelf;
  const totalSF = Math.round(totalLF * (depthIn / 12) * 2 * 10) / 10;

  return (
    <div>
      {/* Title */}
      <div className="panel-section">
        <div className="field-label">Title</div>
        <input value={config.title || ''} onChange={e => setSub('title', e.target.value || '')}
          placeholder="e.g. Master Closet Shelves"
          style={{ width: '100%', fontSize: 13 }} />
      </div>

      {/* Section 1: Substrate & Coating */}
      <div className="panel-section">
        <div className="section-title">Shelving Details</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId="closet_shelving" value={config.substrate_state} onChange={v => setSub('substrate_state', v)} />
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

      {/* Stain / Clear Coat controls */}
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

      {/* Grain Fill */}
      {isBareWood && coatingType === 'paint' && (
        <div className="panel-section">
          <div className="section-title">Grain Fill</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <input type="checkbox" id="grain-fill-closet-shelving" checked={!!config.grain_fill} onChange={e => setSub('grain_fill', e.target.checked)} />
            <label htmlFor="grain-fill-closet-shelving" style={{ fontSize: 12 }}>Fill open grain before painting</label>
          </div>
          {config.grain_fill && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Open-grain hardwoods (oak, ash, walnut, hickory, mahogany). Coat count follows quality tier.
            </div>
          )}
        </div>
      )}

      {/* Section 2: Shelf Measurements */}
      <div className="panel-section">
        <div className="section-title">Shelf Measurements</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Shelf Count</div>
            <input type="number" value={config.shelf_count || ''} min="0"
              onChange={e => setSub('shelf_count', parseInt(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
          <div>
            <div className="field-label">Length per Shelf (LF)</div>
            <input type="number" value={config.lf_per_shelf || ''} min="0" step="0.5"
              onChange={e => setSub('lf_per_shelf', parseFloat(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
          <div>
            <div className="field-label">Depth (inches)</div>
            <input type="number" value={config.depth_in || ''} min="0" step="1"
              onChange={e => setSub('depth_in', parseFloat(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
        </div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
          <span>Total LF: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{totalLF}</span></span>
          <span>Paintable SF: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{totalSF}</span> <span style={{ color: '#555' }}>(LF × {depthIn}" depth × 2 sides)</span></span>
        </div>
      </div>
    </div>
  );
}

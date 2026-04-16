import Select from '../shared/Select';
import SubstrateStateSelect from './SubstrateStateSelect';
import { ENUMS } from '../../data/enums';
import { SUBSTRATE_APPLICATION_METHODS } from '../../data/substrate-catalog';

const SCOPE_OPTIONS = [
  { value: 'doors_only', label: 'Doors Only' },
  { value: 'full_exterior', label: 'Full Exterior' },
  { value: 'full_with_interior', label: 'Full with Interior' },
];

const PROTECTION_LEVEL_OPTIONS = [
  { value: 'light', label: 'Light — tape + plastic on cabinet faces' },
  { value: 'standard', label: 'Standard — faces + countertop + hardware' },
  { value: 'heavy', label: 'Heavy — full kitchen containment' },
];

const DOOR_STYLE_OPTIONS = [
  { value: 'slab', label: 'Slab' },
  { value: 'shaker', label: 'Shaker' },
  { value: 'raised_panel', label: 'Raised Panel' },
  { value: 'glass_frame', label: 'Glass Frame' },
];

const KITCHEN_COMPLEXITY_OPTIONS = [
  { value: 'simple', label: 'Simple' },
  { value: 'galley', label: 'Galley' },
  { value: 'u_shape', label: 'U-Shape' },
  { value: 'island', label: 'Island' },
];

const SHEEN_OPTIONS = [
  { value: 'satin', label: 'Satin' },
  { value: 'semi_gloss', label: 'Semi-Gloss' },
  { value: 'gloss', label: 'Gloss (QT5 only)' },
];

export default function CabinetsDetailPanel({ room, dispatch, project }) {
  const rid = room.id;
  const config = room.substrates.cabinets;
  if (!config) return null;

  const setSub = (f, v) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: 'cabinets', field: f, value: v } });

  const paintCabinets = config.paint_cabinets !== false && config.paint_cabinets !== undefined ? config.paint_cabinets : false;
  const protectionLevel = config.protection_level || 'standard';
  const scope = config.scope || 'full_exterior';

  const sam = SUBSTRATE_APPLICATION_METHODS.cabinets;
  const methodOptions = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));

  return (
    <div>
      {/* Title */}
      <div className="panel-section">
        <div className="field-label">Title</div>
        <input value={config.title || ''} onChange={e => setSub('title', e.target.value || '')}
          placeholder="e.g. Kitchen Main, Island, Butler's Pantry"
          style={{ width: '100%', fontSize: 13 }} />
      </div>

      {/* Cabinet Details */}
      <div className="panel-section">
        <div className="section-title">Cabinet Details</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId="cabinets" value={config.substrate_state} onChange={v => setSub('substrate_state', v)} />
          </div>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.qualityTiers} value={config.quality_tier || null} onChange={v => setSub('quality_tier', v || null)} placeholder={`Project Default (${project?.default_quality_tier || 'QT3'})`} />
          </div>
          <div>
            <div className="field-label">Application Method</div>
            <Select options={methodOptions} value={config.application_method} onChange={v => setSub('application_method', v || null)} placeholder={`Default (${sam.default})`} />
          </div>
          <div>
            <div className="field-label">Coating Type</div>
            <Select options={[{ value: 'paint', label: 'Paint' }]} value="paint" onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* Paint or Protect */}
      <div className="panel-section">
        <div className="section-title">Paint or Protect</div>
        <div style={{ display: 'flex', gap: 16, padding: '4px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="radio" name={`cab-toggle-${rid}`} checked={!paintCabinets} onChange={() => setSub('paint_cabinets', false)} />
            Protect
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="radio" name={`cab-toggle-${rid}`} checked={paintCabinets} onChange={() => setSub('paint_cabinets', true)} />
            Paint
          </label>
        </div>

        {/* Protection Level (when protect) */}
        {!paintCabinets && (
          <div style={{ marginTop: 8 }}>
            <div className="field-label">Protection Level</div>
            {PROTECTION_LEVEL_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', padding: '2px 0' }}>
                <input type="radio" name={`cab-protect-level-${rid}`} checked={protectionLevel === opt.value} onChange={() => setSub('protection_level', opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        )}

        {/* Scope + Sheen (when paint) */}
        {paintCabinets && (
          <div style={{ marginTop: 8 }}>
            <div className="field-label">Scope</div>
            {SCOPE_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', padding: '2px 0' }}>
                <input type="radio" name={`cab-scope-${rid}`} checked={scope === opt.value} onChange={() => setSub('scope', opt.value)} />
                {opt.label}
              </label>
            ))}
            <div style={{ marginTop: 8 }}>
              <div className="field-label">Sheen</div>
              <Select options={SHEEN_OPTIONS} value={config.sheen || 'satin'} onChange={v => setSub('sheen', v)} />
            </div>
          </div>
        )}
      </div>

      {/* Quantities */}
      <div className="panel-section">
        <div className="section-title">Quantities</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Cabinet Count</div>
            <input type="number" value={config.cabinet_count || ''} min="0"
              onChange={e => setSub('cabinet_count', parseInt(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
          <div>
            <div className="field-label">Door Count</div>
            <input type="number" value={config.door_count || ''} min="0"
              onChange={e => setSub('door_count', parseInt(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
          <div>
            <div className="field-label">Drawer Count</div>
            <input type="number" value={config.drawer_count || ''} min="0"
              onChange={e => setSub('drawer_count', parseInt(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
          <div>
            <div className="field-label">Frame SF</div>
            <input type="number" value={config.frame_sf || ''} min="0" step="1"
              onChange={e => setSub('frame_sf', parseFloat(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
          <div>
            <div className="field-label" style={{ color: scope !== 'full_with_interior' && paintCabinets ? 'var(--text-muted)' : undefined }}>Interior SF</div>
            <input type="number" value={config.interior_sf || ''} min="0" step="1"
              onChange={e => setSub('interior_sf', parseFloat(e.target.value) || 0)}
              disabled={paintCabinets && scope !== 'full_with_interior'}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, opacity: paintCabinets && scope !== 'full_with_interior' ? 0.4 : 1 }} />
          </div>
          <div>
            <div className="field-label">Hardware Count</div>
            <input type="number" value={config.hardware_count || ''} min="0"
              onChange={e => setSub('hardware_count', parseInt(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
        </div>
        <div style={{ marginTop: 4 }}>
          <div className="field-label">Caulk LF</div>
          <input type="number" value={config.caulk_lf || ''} min="0" step="1"
            onChange={e => setSub('caulk_lf', parseFloat(e.target.value) || 0)}
            style={{ width: 120, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }} />
        </div>
        {paintCabinets && scope !== 'full_with_interior' && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            Interior SF disabled — select "Full with Interior" scope to enable.
          </div>
        )}
      </div>

      {/* Modifiers */}
      <div className="panel-section">
        <div className="section-title">Modifiers</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Door Style</div>
            <Select options={DOOR_STYLE_OPTIONS} value={config.door_style || 'shaker'} onChange={v => setSub('door_style', v)} />
          </div>
          <div>
            <div className="field-label">Kitchen Complexity</div>
            <Select options={KITCHEN_COMPLEXITY_OPTIONS} value={config.kitchen_complexity || 'galley'} onChange={v => setSub('kitchen_complexity', v)} />
          </div>
          <div>
            <div className="field-label">Height Band</div>
            <Select options={ENUMS.heightBands || [{ value: 'standard', label: 'Standard' }, { value: 'upper_reach', label: 'Upper Reach' }, { value: 'scaffold', label: 'Scaffold' }]} value={config.height_band || 'standard'} onChange={v => setSub('height_band', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

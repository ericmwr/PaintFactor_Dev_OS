import Select from '../shared/Select';
import { ENUMS } from '../../data/enums';
import {
  EXT_SIDING_TYPES, EXT_SUBSTRATE_MATERIALS, EXT_SUBSTRATE_STATES, EXT_CAULK_SCOPES
} from '../../state/exterior-state';

const WIND_OPTIONS = [
  { value: 'calm', label: 'Calm' },
  { value: 'light_breeze', label: 'Light Breeze' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High Wind' },
];

const SUN_OPTIONS = [
  { value: 'full_shade', label: 'Full Shade' },
  { value: 'partial_shade', label: 'Partial Shade' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'full_sun', label: 'Full Sun' },
];

const TEMP_OPTIONS = [
  { value: 'optimal', label: 'Optimal (50-90\u00B0F)' },
  { value: 'standard', label: 'Standard' },
  { value: 'cold_surface', label: 'Cold (<50\u00B0F)' },
  { value: 'hot_surface', label: 'Hot (>90\u00B0F)' },
];

export default function SiteConditionsPanel({ exterior, dispatch }) {
  const sc = exterior.site_conditions;
  const defaults = exterior.defaults;
  const setSC = (f, v) => dispatch({ type: 'SET_SITE_CONDITION', payload: { field: f, value: v } });
  const setDef = (f, v) => dispatch({ type: 'SET_EXTERIOR_DEFAULT', payload: { field: f, value: v } });

  return (
    <div>
      <div className="panel-section">
        <div className="section-title">Site Conditions</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Wind Exposure</div>
            <Select options={WIND_OPTIONS} value={sc.wind_exposure} onChange={v => setSC('wind_exposure', v)} />
          </div>
          <div>
            <div className="field-label">Sun Exposure</div>
            <Select options={SUN_OPTIONS} value={sc.sun_exposure} onChange={v => setSC('sun_exposure', v)} />
          </div>
          <div>
            <div className="field-label">Temperature</div>
            <Select options={TEMP_OPTIONS} value={sc.temperature_zone} onChange={v => setSC('temperature_zone', v)} />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">Project Defaults</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.extQualityTiers} value={defaults.quality_tier} onChange={v => setDef('quality_tier', v)} />
          </div>
          <div>
            <div className="field-label">Application Method</div>
            <Select options={ENUMS.extApplicationMethods} value={defaults.application_method} onChange={v => setDef('application_method', v)} />
          </div>
          <div>
            <div className="field-label">Default Siding Type</div>
            <Select options={EXT_SIDING_TYPES} value={defaults.siding_type} onChange={v => setDef('siding_type', v)} />
          </div>
          <div>
            <div className="field-label">Default Siding State</div>
            <Select options={EXT_SUBSTRATE_STATES} value={defaults.siding_substrate_state} onChange={v => setDef('siding_substrate_state', v)} />
          </div>
          <div>
            <div className="field-label">Default Trim Substrate</div>
            <Select options={EXT_SUBSTRATE_MATERIALS} value={defaults.trim_substrate} onChange={v => setDef('trim_substrate', v)} />
          </div>
          <div>
            <div className="field-label">Default Trim State</div>
            <Select options={EXT_SUBSTRATE_STATES} value={defaults.trim_substrate_state} onChange={v => setDef('trim_substrate_state', v)} />
          </div>
          <div>
            <div className="field-label">Default Caulk Scope</div>
            <Select options={EXT_CAULK_SCOPES} value={defaults.caulk_scope} onChange={v => setDef('caulk_scope', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { Fragment } from 'react';
import Select from '../shared/Select';
import Toggle from '../shared/Toggle';
import { ENUMS } from '../../data/enums';
import { useProject } from '../../hooks/useProject';
import { createExteriorState, EXT_SIDING_TYPES, EXT_SUBSTRATE_MATERIALS, EXT_SUBSTRATE_STATES, EXT_RP_SUBSTRATE_STATES, EXT_CAULK_SCOPES, EXT_CONDITION_SCALE } from '../../state/exterior-state';

const DEFAULT_SURFACE_OPTIONS = [
  { id: 'ceiling', label: 'Ceiling' },
  { id: 'walls', label: 'Walls' },
  { id: 'baseboard', label: 'Baseboard' },
  { id: 'crown', label: 'Crown' },
  { id: 'chair_rail', label: 'Chair Rail' },
  { id: 'shoe_mold', label: 'Shoe Mold' },
];

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

export default function ProjectSetup() {
  const { state, dispatch } = useProject();
  const project = state.project;
  const exterior = state.exterior || createExteriorState();
  const sc = exterior.site_conditions;
  const defaults = exterior.defaults;
  const isRP = exterior.project_type === 'RP';
  const stateOptions = isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES;
  const set = (field, value) => dispatch({ type: 'SET_PROJECT', payload: { field, value } });
  const setSC = (f, v) => dispatch({ type: 'SET_SITE_CONDITION', payload: { field: f, value: v } });
  const setDef = (f, v) => dispatch({ type: 'SET_EXTERIOR_DEFAULT', payload: { field: f, value: v } });

  return (
    <div className="setup-form">
      <h2 style={{ fontSize: 18, marginBottom: 20, color: 'var(--accent)' }}>Project Setup</h2>

      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
        <div className="setup-field">
          <label>Project Name</label>
          <input
            value={project.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Smith Residence NC"
            style={{ fontSize: 15, padding: '8px 12px' }}
          />
        </div>
        <div className="setup-field">
          <label>Client Name</label>
          <input
            value={project.client_name || ''}
            onChange={e => set('client_name', e.target.value)}
            placeholder="Client name"
            style={{ fontSize: 15, padding: '8px 12px' }}
          />
        </div>
        <div className="setup-field" style={{ gridColumn: '1 / -1' }}>
          <label>Address</label>
          <input
            value={project.address || ''}
            onChange={e => set('address', e.target.value)}
            placeholder="Job site address"
            style={{ fontSize: 15, padding: '8px 12px' }}
          />
        </div>
      </div>

      <div className="setup-field">
        <Toggle
          checked={project.new_construction}
          onChange={v => set('new_construction', v)}
          label="New Construction"
        />
        <div className="hint">All 18 current specs are interior new construction</div>
      </div>

      {/* ── Interior Defaults ── */}
      <div className="panel-section" style={{ background: 'rgba(130, 170, 255, 0.04)', border: '1px solid rgba(130, 170, 255, 0.12)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
        <div className="section-title">Interior Defaults</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="setup-field">
            <label>Quality Tier</label>
            <Select options={ENUMS.qualityTiers} value={project.default_quality_tier} onChange={v => set('default_quality_tier', v)} />
          </div>
          <div className="setup-field">
            <label>Complexity</label>
            <Select options={ENUMS.complexity} value={project.default_complexity} onChange={v => set('default_complexity', v)} />
          </div>
          <div className="setup-field">
            <label>Application Method</label>
            <Select options={ENUMS.applicationMethods} value={project.default_application_method} onChange={v => set('default_application_method', v)} />
          </div>
          <div className="setup-field">
            <label>Surface Texture</label>
            <Select options={ENUMS.textures} value={project.default_texture} onChange={v => set('default_texture', v)} />
          </div>
        </div>

        <div className="setup-field" style={{ marginTop: 8 }}>
          <label>Default Paintable Surfaces</label>
          <div className="hint">
            New rooms will include these surfaces by default.
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto auto 24px auto auto 24px auto auto',
              alignItems: 'center',
              gap: '6px 0',
              marginTop: 8,
            }}
          >
            {DEFAULT_SURFACE_OPTIONS.map((s, i) => {
              const col = i % 3;
              const colStart = col * 3 + 1;
              return (
                <Fragment key={s.id}>
                  <span style={{ gridColumn: colStart, fontSize: 13, whiteSpace: 'nowrap' }}>{s.label}</span>
                  <input
                    type="checkbox"
                    style={{ gridColumn: colStart + 1, justifySelf: 'center' }}
                    checked={(project.default_substrates || []).includes(s.id)}
                    onChange={() => dispatch({ type: 'TOGGLE_PROJECT_SUBSTRATE', payload: s.id })}
                  />
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Exterior Defaults ── */}
      <div className="panel-section" style={{ background: 'rgba(100, 210, 140, 0.04)', border: '1px solid rgba(100, 210, 140, 0.12)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>Exterior Defaults</div>
          <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button
              style={{
                padding: '3px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: !isRP ? 'var(--accent)' : 'var(--bg-card)', color: !isRP ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => dispatch({ type: 'SET_EXTERIOR_PROJECT_TYPE', payload: 'NC' })}
            >New Construction</button>
            <button
              style={{
                padding: '3px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: isRP ? 'var(--accent-warn, #e67e22)' : 'var(--bg-card)', color: isRP ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => dispatch({ type: 'SET_EXTERIOR_PROJECT_TYPE', payload: 'RP' })}
            >Repaint</button>
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="setup-field">
            <label>Quality Tier</label>
            <Select options={ENUMS.extQualityTiers} value={defaults.quality_tier} onChange={v => setDef('quality_tier', v)} />
          </div>
          <div className="setup-field">
            <label>Application Method</label>
            <Select options={ENUMS.extApplicationMethods} value={defaults.application_method} onChange={v => setDef('application_method', v)} />
          </div>
          <div className="setup-field">
            <label>Default Siding Type</label>
            <Select options={EXT_SIDING_TYPES} value={defaults.siding_type} onChange={v => setDef('siding_type', v)} />
          </div>
          <div className="setup-field">
            <label>Default Siding State</label>
            <Select options={stateOptions} value={defaults.siding_substrate_state} onChange={v => setDef('siding_substrate_state', v)} />
          </div>
          <div className="setup-field">
            <label>Default Trim Substrate</label>
            <Select options={EXT_SUBSTRATE_MATERIALS} value={defaults.trim_substrate} onChange={v => setDef('trim_substrate', v)} />
          </div>
          <div className="setup-field">
            <label>Default Trim State</label>
            <Select options={stateOptions} value={defaults.trim_substrate_state} onChange={v => setDef('trim_substrate_state', v)} />
          </div>
          {isRP && (
            <div className="setup-field">
              <label>Default Condition</label>
              <Select options={EXT_CONDITION_SCALE} value={defaults.condition_scale || 'GOOD'} onChange={v => setDef('condition_scale', v)} />
            </div>
          )}
          <div className="setup-field">
            <label>Default Caulk Scope</label>
            <Select options={EXT_CAULK_SCOPES} value={defaults.caulk_scope} onChange={v => setDef('caulk_scope', v)} />
          </div>
        </div>
      </div>

      {/* ── Site Conditions ── */}
      <div className="panel-section" style={{ background: 'rgba(255, 190, 100, 0.04)', border: '1px solid rgba(255, 190, 100, 0.12)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
        <div className="section-title">Site Conditions</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="setup-field">
            <label>Wind Exposure</label>
            <Select options={WIND_OPTIONS} value={sc.wind_exposure} onChange={v => setSC('wind_exposure', v)} />
          </div>
          <div className="setup-field">
            <label>Sun Exposure</label>
            <Select options={SUN_OPTIONS} value={sc.sun_exposure} onChange={v => setSC('sun_exposure', v)} />
          </div>
          <div className="setup-field">
            <label>Temperature</label>
            <Select options={TEMP_OPTIONS} value={sc.temperature_zone} onChange={v => setSC('temperature_zone', v)} />
          </div>
        </div>
      </div>

      <div className="setup-field" style={{ marginTop: 8 }}>
        <label>Project Notes</label>
        <textarea
          value={project.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Optional project notes..."
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          className="btn btn-accent"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'scope' })}
          style={{ padding: '8px 24px', fontSize: 14 }}
        >
          Continue to Scope
        </button>
      </div>
    </div>
  );
}

import { Fragment } from 'react';
import Select from '../shared/Select';
import Toggle from '../shared/Toggle';
import { ENUMS } from '../../data/enums';
import { useProject } from '../../hooks/useProject';
import { useModifierEnum } from '../../hooks/useModifierEnum';
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
  const complexityOptions = useModifierEnum('FAC_COMPLEXITY');
  const exterior = { ...createExteriorState(), ...(state.exterior || {}) };
  const sc = exterior.site_conditions;
  const defaults = exterior.defaults;
  const isRP = exterior.project_type === 'RP';
  const stateOptions = isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES;
  const set = (field, value) => dispatch({ type: 'SET_PROJECT', payload: { field, value } });
  const setSC = (f, v) => dispatch({ type: 'SET_SITE_CONDITION', payload: { field: f, value: v } });
  const setDef = (f, v) => dispatch({ type: 'SET_EXTERIOR_DEFAULT', payload: { field: f, value: v } });

  // Protection heuristics dispatch — merges into nested object via SET_PROJECT.
  const ph = project.protection_heuristics || {};
  const setPH = (field, value) => set('protection_heuristics', { ...ph, [field]: value });
  // Canonical task rates — shown as placeholders when override is null.
  const PH_RATE_DEFAULTS = {
    outlet_mask_rate: 40,             // TSK_MASK_OUTLET_SWITCH_INSTALL/REMOVE
    outlet_remove_reinstall_rate: 60, // TSK_PREP_OUTLET_COVER_REMOVE/REINSTALL
    hvac_mask_rate: 20,               // TSK_MASK_HVAC_VENT_INSTALL (REMOVE is 30 — single override applies to both)
    hvac_remove_reinstall_rate: 10,   // TSK_PREP_HVAC_VENT_REMOVE/REINSTALL
  };
  const PH_FIELD_DEFAULTS = {
    outlets_per_room: 4,
    hvac_vents_per_room: 0.7,
    outlet_remove_reinstall: false,
    hvac_action: 'mask',
    outlet_mask_rate: null,
    outlet_remove_reinstall_rate: null,
    hvac_mask_rate: null,
    hvac_remove_reinstall_rate: null,
  };
  const resetPH = () => set('protection_heuristics', { ...PH_FIELD_DEFAULTS });
  // Number-input change handler — empty string → null (use canonical), else parsed number.
  const numOrNull = (s) => {
    if (s === '' || s == null) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

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

      {/* ─────────────────────────────────────────────────────────────────
          Protection Heuristics — collapsible panel near top.
          Project-level defaults for outlet + HVAC vent counts & rates.
          Counts/toggles drive quantity emission; rates override the
          canonical task rates (null = use canonical, plumbed via overlayMap
          in useEstimateScenario.js).
          Pilot scope — outlet covers + HVAC vents only. Add more heuristics
          here as future needs arise.
          ───────────────────────────────────────────────────────────────── */}
      <details style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, background: 'var(--bg-elevated, #1f1f1f)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--accent)', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Protection Heuristics</span>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (window.confirm('Reset protection heuristics to defaults?')) resetPH(); }}
            style={{ fontSize: 11, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
            title="Reset all heuristics fields to their default values"
          >
            Reset to defaults
          </button>
        </summary>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Project-level counts, toggles, and production rates that drive outlet/switch and HVAC vent protection. Rate fields show the canonical default as placeholder — leave blank to use the canonical rate, or override per-project.
        </div>

        {/* Outlets section */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Outlets / Switches</div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="setup-field">
              <label title="Mask quantity per non-closet room when any spray method is active in the room.">Outlets per room</label>
              <input
                type="number" min="0" step="1"
                value={ph.outlets_per_room ?? ''}
                onChange={e => setPH('outlets_per_room', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                placeholder="4"
                style={{ fontSize: 14, padding: '6px 10px' }}
              />
            </div>
            <div className="setup-field">
              <label title="Mask install + remove rate. Applies to both TSK_MASK_OUTLET_SWITCH_INSTALL and TSK_MASK_OUTLET_SWITCH_REMOVE.">Outlet mask rate (EA/hr)</label>
              <input
                type="number" min="0" step="1"
                value={ph.outlet_mask_rate ?? ''}
                onChange={e => setPH('outlet_mask_rate', numOrNull(e.target.value))}
                placeholder={String(PH_RATE_DEFAULTS.outlet_mask_rate)}
                style={{ fontSize: 14, padding: '6px 10px' }}
              />
            </div>
            <div className="setup-field" style={{ gridColumn: '1 / -1' }}>
              <Toggle
                checked={!!ph.outlet_remove_reinstall}
                onChange={v => setPH('outlet_remove_reinstall', v)}
                label="Outlet Covers Remove + Reinstall"
              />
              <div className="hint" title="When on, fires separate prep tasks to physically remove + reinstall outlet covers (additive to mask).">Adds prep tasks (additive to mask, not replacement)</div>
            </div>
            {ph.outlet_remove_reinstall && (
              <div className="setup-field" style={{ gridColumn: '1 / -1' }}>
                <label title="Remove + reinstall rate. Applies to both TSK_PREP_OUTLET_COVER_REMOVE and TSK_PREP_OUTLET_COVER_REINSTALL.">Outlet Covers R+R rate (EA/hr)</label>
                <input
                  type="number" min="0" step="1"
                  value={ph.outlet_remove_reinstall_rate ?? ''}
                  onChange={e => setPH('outlet_remove_reinstall_rate', numOrNull(e.target.value))}
                  placeholder={String(PH_RATE_DEFAULTS.outlet_remove_reinstall_rate)}
                  style={{ fontSize: 14, padding: '6px 10px', maxWidth: 200 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* HVAC Vents section */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>HVAC Vents</div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="setup-field">
              <label title="Mask quantity per room (closets excluded). Fractional avg across rooms — e.g. 0.7 means ~7 vents per 10 rooms.">HVAC vents per room</label>
              <input
                type="number" min="0" step="0.1"
                value={ph.hvac_vents_per_room ?? ''}
                onChange={e => setPH('hvac_vents_per_room', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                placeholder="0.7"
                style={{ fontSize: 14, padding: '6px 10px' }}
              />
            </div>
            <div className="setup-field">
              <label title="Mask install + remove rate. Applies to both TSK_MASK_HVAC_VENT_INSTALL and TSK_MASK_HVAC_VENT_REMOVE (canonical defaults differ — install 20, remove 30; this single value applies to both).">HVAC mask rate (EA/hr)</label>
              <input
                type="number" min="0" step="1"
                value={ph.hvac_mask_rate ?? ''}
                onChange={e => setPH('hvac_mask_rate', numOrNull(e.target.value))}
                placeholder={String(PH_RATE_DEFAULTS.hvac_mask_rate)}
                style={{ fontSize: 14, padding: '6px 10px' }}
              />
            </div>
            <div className="setup-field" style={{ gridColumn: '1 / -1' }}>
              <label title="Mask = tape over the vent. Remove = unscrew + reinstall the vent cover. None = no HVAC vent work fires (e.g. ceiling-only repaint where vents stay untouched).">HVAC Action</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="hvac_action" checked={ph.hvac_action === 'mask'} onChange={() => setPH('hvac_action', 'mask')} />
                  Mask
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="hvac_action" checked={ph.hvac_action === 'remove'} onChange={() => setPH('hvac_action', 'remove')} />
                  Remove
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="hvac_action" checked={ph.hvac_action === 'none'} onChange={() => setPH('hvac_action', 'none')} />
                  None (do nothing)
                </label>
              </div>
            </div>
            {ph.hvac_action === 'remove' && (
              <div className="setup-field" style={{ gridColumn: '1 / -1' }}>
                <label title="Remove + reinstall rate. Applies to both TSK_PREP_HVAC_VENT_REMOVE and TSK_PREP_HVAC_VENT_REINSTALL.">HVAC Vent R+R rate (EA/hr)</label>
                <input
                  type="number" min="0" step="1"
                  value={ph.hvac_remove_reinstall_rate ?? ''}
                  onChange={e => setPH('hvac_remove_reinstall_rate', numOrNull(e.target.value))}
                  placeholder={String(PH_RATE_DEFAULTS.hvac_remove_reinstall_rate)}
                  style={{ fontSize: 14, padding: '6px 10px', maxWidth: 200 }}
                />
              </div>
            )}
          </div>
        </div>
      </details>

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
            <Select options={complexityOptions} value={project.default_complexity} onChange={v => set('default_complexity', v)} />
          </div>
          <div className="setup-field">
            <label>Preferred Brand</label>
            <Select
              options={[
                { value: '', label: 'No Preference' },
                { value: 'Sherwin-Williams', label: 'Sherwin-Williams' },
                { value: 'Benjamin Moore', label: 'Benjamin Moore' },
                { value: 'PPG', label: 'PPG' },
              ]}
              value={project.default_brand || ''}
              onChange={v => set('default_brand', v || null)}
            />
          </div>
          <div className="setup-field" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Toggle
                checked={!!project.default_combined_prime}
                onChange={() => set('default_combined_prime', !project.default_combined_prime)}
              />
              <span>Combined wall and ceiling prime (pre-trim)</span>
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 36, marginTop: 2 }}>
              For pre-trim NC jobs where walls + ceiling get primed in one continuous spray pass. Rooms can override individually.
            </div>
          </div>
          <div className="setup-field" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Toggle
                checked={!!project.default_combined_wc_finish}
                onChange={() => set('default_combined_wc_finish', !project.default_combined_wc_finish)}
              />
              <span>Combined wall and ceiling finish (same sheen/product)</span>
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 36, marginTop: 2 }}>
              When walls and ceiling will receive the same finish paint — estimator's consultation call. Dedups setup/cleanup + drops between-substrate cut-in. Rooms can override individually.
            </div>
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

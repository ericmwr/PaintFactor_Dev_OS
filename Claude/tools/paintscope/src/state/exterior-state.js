import { genId } from './initial-state';

// ============================================================
// EXTERIOR STATE FACTORIES
// ============================================================

// Exterior trim type catalog — defines what trim types can be checked
export const EXT_TRIM_TYPES = [
  { value: 'fascia',         label: 'Fascia',          caulk_lf_per_lf: 1.0,  auto_derive: null },
  { value: 'rake',           label: 'Rake Trim',       caulk_lf_per_lf: 1.0,  auto_derive: null },
  { value: 'frieze',         label: 'Frieze Board',    caulk_lf_per_lf: 2.0,  auto_derive: null },
  { value: 'corner_boards',  label: 'Corner Boards',   caulk_lf_per_lf: 2.0,  auto_derive: null },
  { value: 'soffit',         label: 'Soffit',          caulk_lf_per_lf: 0,    auto_derive: null },
  { value: 'window_casing',  label: 'Window Casing',   caulk_lf_per_lf: 1.0,  auto_derive: 'windows' },
  { value: 'door_casing',    label: 'Door Casing',     caulk_lf_per_lf: 1.0,  auto_derive: 'doors' },
  { value: 'water_table',    label: 'Water Table',     caulk_lf_per_lf: 2.0,  auto_derive: null },
  { value: 'belly_band',     label: 'Belly Band',      caulk_lf_per_lf: 2.0,  auto_derive: null },
  { value: 'band_board',     label: 'Band Board',      caulk_lf_per_lf: 2.0,  auto_derive: null },
  { value: 'window_sill',    label: 'Window Sill',     caulk_lf_per_lf: 1.0,  auto_derive: 'windows' },
];

export const EXT_SIDING_TYPES = [
  { value: 'wood_lap',             label: 'Wood Lap Siding' },
  { value: 'wood_shingle',         label: 'Wood Shingle/Shake' },
  { value: 'fiber_cement_lap',     label: 'Fiber Cement Lap' },
  { value: 'fiber_cement_panel',   label: 'Fiber Cement Panel' },
  { value: 'engineered_wood',      label: 'Engineered Wood (LP SmartSide)' },
  { value: 'vinyl',                label: 'Vinyl Siding' },
  { value: 'aluminum',             label: 'Aluminum Siding' },
  { value: 'stucco',               label: 'Stucco/EIFS' },
  { value: 'masonry',              label: 'Masonry/Brick/Block' },
  { value: 'board_and_batten',     label: 'Board & Batten' },
  { value: 'cedar_shingle',        label: 'Cedar Shingle' },
];

export const EXT_ACCESS_TYPES = [
  { value: 'ground',   label: 'Ground (0-8 ft)' },
  { value: 'ladder',   label: 'Ladder (8-16 ft)' },
  { value: 'scaffold', label: 'Scaffold (16-25 ft)' },
  { value: 'lift',     label: 'Lift (25+ ft)' },
];

export const EXT_CAULK_SCOPES = [
  { value: 'none',            label: 'No Caulking' },
  { value: 'touchup',         label: 'Touch-Up (fill cracks)' },
  { value: 'removal_repair',  label: 'Removal & Repair' },
  { value: 'complete',        label: 'Complete Re-Caulk' },
];

export const EXT_SOFFIT_PROFILES = [
  { value: 'closed_face',  label: 'Closed Face (solid)' },
  { value: 'open_face',    label: 'Open Face (exposed rafters)' },
  { value: 'corrugated',   label: 'Corrugated/Vented' },
];

export const EXT_SUBSTRATE_MATERIALS = [
  { value: 'wood',        label: 'Wood' },
  { value: 'composite',   label: 'Composite/PVC' },
  { value: 'aluminum',    label: 'Aluminum' },
  { value: 'vinyl',       label: 'Vinyl' },
  { value: 'fiber_cement', label: 'Fiber Cement' },
];

export const EXT_SUBSTRATE_STATES = [
  { value: 'bare_wood',        label: 'Bare Wood',             spec: 'SS_EXT_BARE_WOOD' },
  { value: 'factory_primed',   label: 'Factory Primed',        spec: 'SS_EXT_PRIMED_FACTORY' },
  { value: 'field_primed',     label: 'Field Primed',          spec: 'SS_EXT_PRIMED_FIELD' },
  { value: 'factory_finished', label: 'Factory Finished',      spec: 'SS_EXT_FACTORY_FINISHED' },
  { value: 'bare_fibercement', label: 'Bare Fiber Cement',     spec: 'SS_EXT_BARE_FIBERCEMENT' },
  { value: 'sound_paint',      label: 'Sound Existing Paint',  spec: 'SS_EXT_SOUND_PAINT' },
  { value: 'chalking',         label: 'Chalking Paint',        spec: 'SS_EXT_CHALKING' },
  { value: 'failing_paint',    label: 'Failing/Cracking Paint', spec: 'SS_EXT_FAILING_PAINT' },
  { value: 'peeling',          label: 'Peeling Paint',         spec: 'SS_EXT_PEELING' },
  { value: 'weathered',        label: 'Weathered Wood',        spec: 'SS_EXT_WEATHERED' },
  { value: 'stained_solid',    label: 'Solid Stain',           spec: 'SS_EXT_STAINED_SOLID' },
  { value: 'stained_semi',     label: 'Semi-Transparent Stain', spec: 'SS_EXT_STAINED_SEMI' },
  { value: 'painted_flat',     label: 'Painted (Flat)',        spec: 'SS_EXT_PAINTED_FLAT' },
  { value: 'painted_satin',    label: 'Painted (Satin)',       spec: 'SS_EXT_PAINTED_SATIN' },
  { value: 'painted_semigloss', label: 'Painted (Semi-Gloss)', spec: 'SS_EXT_PAINTED_SEMIGLOSS' },
];

// ── Siding Section ──
export function createSidingSection(overrides = {}) {
  return {
    id: genId('sid'),
    label: 'Main Siding',
    siding_type: 'fiber_cement_lap',
    substrate_material: 'fiber_cement',
    substrate_state: 'factory_primed',
    texture_profile: 'smooth',
    condition_scale: null,   // RP mode: GOOD | FAIR | POOR
    sf: 0,
    sf_override: false,
    ...overrides,
  };
}

// ── Trim Type Config ──
export function createTrimConfig(trimType, overrides = {}) {
  return {
    type: trimType,
    enabled: true,
    substrate_material: 'wood',
    substrate_state: 'bare_wood',
    profile_complexity: 'standard',
    condition_scale: null,   // RP mode: GOOD | FAIR | POOR
    width_in: trimType === 'soffit' ? 12 : 4,
    depth_ft: trimType === 'soffit' ? 1.5 : 0,
    lf: 0,
    lf_override: false,
    // Soffit-specific
    soffit_profile: trimType === 'soffit' ? 'closed_face' : null,
    ...overrides,
  };
}

// ── Exterior Window ──
export function createExtWindow(overrides = {}) {
  return {
    id: genId('xwin'),
    type: 'double_hung',
    size: 'M',
    count: 1,
    ...overrides,
  };
}

// ── Exterior Door ──
export function createExtDoor(overrides = {}) {
  return {
    id: genId('xdoor'),
    type: 'entry',
    complexity: 'panel',
    substrate: 'fiberglass',
    count: 1,
    ...overrides,
  };
}

// ── Sub-Elements ──
export function createBumpOut(overrides = {}) {
  return {
    id: genId('bump'),
    label: 'Bump-Out',
    width_ft: 0,
    depth_ft: 0,
    height_ft: 0,
    siding_type: null,       // null = inherit from parent elevation
    has_soffit: true,
    has_fascia: true,
    has_corner_trim: true,
    has_foundation: false,
    windows: [],
    ...overrides,
  };
}

export function createDormer(overrides = {}) {
  return {
    id: genId('dorm'),
    label: 'Dormer',
    width_ft: 0,
    height_ft: 0,
    roof_pitch: 6,
    siding_type: null,
    has_window: true,
    window: createExtWindow({ type: 'double_hung', size: 'S', count: 1 }),
    has_corner_caps: true,
    has_soffit: true,
    has_fascia: true,
    ...overrides,
  };
}

export function createGable(overrides = {}) {
  return {
    id: genId('gable'),
    label: 'Gable',
    base_ft: 0,
    peak_ft: 0,
    siding_type: null,       // null = inherit, or override for different siding
    substrate_state: null,
    has_rake_trim: true,
    rake_lf: 0,              // auto-derived from geometry if 0
    ...overrides,
  };
}

// ── Elevation ──
export function createElevation(overrides = {}) {
  return {
    id: genId('elev'),
    label: 'Front',
    width_ft: 0,
    height_to_eave_ft: 0,
    access_type: 'ground',

    // Override cascade: null = inherit from project defaults
    quality_tier: null,
    application_method: null,

    // Siding (multiple sections possible per elevation)
    siding_sections: [],

    // Trim types — keyed by type, only present if checked
    trim: {},

    // Caulking scope for this elevation
    caulk_scope: null,       // null = inherit project default

    // Windows & doors
    windows: [],
    doors: [],

    // Sub-elements
    bump_outs: [],
    dormers: [],
    gables: [],

    notes: '',
    ...overrides,
  };
}

// ── Standalone Items ──
export function createGarageDoor(overrides = {}) {
  return {
    id: genId('gdr'),
    size: 'double',
    panel_type: 'raised_panel',
    substrate: 'steel',
    substrate_state: 'factory_primed',
    condition_scale: null,   // RP mode: GOOD | FAIR | POOR
    has_windows: false,
    count: 1,
    ...overrides,
  };
}

export function createDeck(overrides = {}) {
  return {
    id: genId('deck'),
    enabled: true,
    sf: 0,
    substrate: 'wood',
    substrate_state: 'bare_wood',
    condition_scale: null,   // RP mode: GOOD | FAIR | POOR
    railing_lf: 0,
    coating_type: 'stain',
    ...overrides,
  };
}

export function createFence(overrides = {}) {
  return {
    id: genId('fence'),
    enabled: true,
    total_lf: 0,
    height_ft: 6,
    sides: 2,
    substrate: 'wood',
    substrate_state: 'bare_wood',
    condition_scale: null,   // RP mode: GOOD | FAIR | POOR
    coating_type: 'stain',
    style: 'board',
    ...overrides,
  };
}

export function createFoundation(overrides = {}) {
  return {
    id: genId('fnd'),
    enabled: true,
    perimeter_lf: 0,
    height_ft: 2,
    substrate: 'concrete',
    substrate_state: 'bare_wood',
    condition_scale: null,   // RP mode: GOOD | FAIR | POOR
    ...overrides,
  };
}

export function createPorch(overrides = {}) {
  return {
    id: genId('porch'),
    floor: { enabled: false, sf: 0, substrate: 'concrete', substrate_state: 'bare_wood', condition_scale: null },
    ceiling: { enabled: false, sf: 0, substrate: 'wood', substrate_state: 'bare_wood', condition_scale: null },
    ...overrides,
  };
}

export function createMetalSurface(overrides = {}) {
  return {
    id: genId('metal'),
    type: 'railing',
    lf: 0,
    substrate_state: 'sound_paint',
    condition_scale: null,   // RP mode: GOOD | FAIR | POOR
    ...overrides,
  };
}

// ── Site Conditions ──
export function createSiteConditions(overrides = {}) {
  return {
    wind_exposure: 'moderate',
    sun_exposure: 'mixed',
    temperature_zone: 'standard',
    ...overrides,
  };
}

// ── Condition Scale (RP mode) ──
export const EXT_CONDITION_SCALE = [
  { value: 'GOOD', label: 'Good (1.0x)' },
  { value: 'FAIR', label: 'Fair (1.5x)' },
  { value: 'POOR', label: 'Poor (2.0x)' },
];

// Substrate states filtered for RP mode (exclude NC-only bare/factory states)
export const EXT_RP_SUBSTRATE_STATES = EXT_SUBSTRATE_STATES.filter(s =>
  ['sound_paint', 'chalking', 'failing_paint', 'peeling', 'weathered',
   'stained_solid', 'stained_semi', 'painted_flat', 'painted_satin', 'painted_semigloss'].includes(s.value)
);

// ── Full Exterior State ──
export function createExteriorState(overrides = {}) {
  return {
    project_type: 'NC',  // 'NC' | 'RP'
    elevations: [],
    standalone: {
      garage_doors: [],
      foundation: createFoundation(),
      deck: createDeck({ enabled: false }),
      fence: createFence({ enabled: false }),
      porch: createPorch(),
      metal_surfaces: [],
    },
    site_conditions: createSiteConditions(),
    defaults: {
      quality_tier: 'QT3',
      application_method: 'spray_backbrush',
      siding_type: 'fiber_cement_lap',
      siding_substrate_state: 'factory_primed',
      trim_substrate: 'wood',
      trim_substrate_state: 'bare_wood',
      caulk_scope: 'complete',
      condition_scale: 'GOOD',  // RP mode default
    },
    ...overrides,
  };
}

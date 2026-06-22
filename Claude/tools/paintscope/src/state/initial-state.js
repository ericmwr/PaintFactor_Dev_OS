import { SUBSTRATE_MAP, WOOD_SUBSTRATES } from '../data/substrate-catalog';
import { ROOM_PRESETS } from '../data/room-presets';
import { createExteriorState } from './exterior-state';
import { initialColorState } from './color-state.js';
import { inferDefaultSystem } from '../data/system-catalog.js';
import { genId, bumpNextId, getNextId } from './id.js';

// ============================================================
// STATE FACTORY
// ============================================================
// genId / bumpNextId / getNextId now live in ./id.js (imported above) to break
// the initial-state <-> exterior-state import cycle that threw a TDZ error under
// Vitest. Re-exported here so existing `import { ... } from './initial-state'`
// consumers (reducer.js, migrations.js, ...) keep working unchanged.
export { genId, bumpNextId, getNextId };

// Walk a state tree and bump nextId past every entity ID seen.
// Defensive: HMR can reset the module-level counter, causing new entities
// to collide with existing ones. Call this from any reducer action that
// creates a new entity, BEFORE calling createRoom/createDoor/etc.
export function bumpNextIdFromState(state) {
  let maxId = 0;
  const num = (s) => { const m = s && String(s).match(/_(\d+)$/); return m ? parseInt(m[1]) : 0; };
  (state?.rooms || []).forEach(r => {
    maxId = Math.max(maxId, num(r.id));
    const subs = r.substrates || {};
    (subs.doors?.items || []).forEach(d => { maxId = Math.max(maxId, num(d.id)); });
    (subs.windows?.items || []).forEach(w => { maxId = Math.max(maxId, num(w.id)); });
    (r.openings || []).forEach(o => { maxId = Math.max(maxId, num(o.id)); });
    (r.closets || []).forEach(c => { maxId = Math.max(maxId, num(c.id)); });
    Object.values(r.fixtures || {}).forEach(f => {
      (f?.items || []).forEach(i => { maxId = Math.max(maxId, num(i?.id)); });
    });
  });
  bumpNextId(maxId);
}

// ============================================================
// FINISH GROUP default seeding
// ============================================================
// V1a palette reserves A/B for walls/ceiling (toggle-driven); non-wall/ceiling
// items get seeded to C (paint package) or D (stain/clear package) based on
// coating_type. Unknown/null coating_type falls back to C.
const STAIN_LIKE_COATING_TYPES = new Set(['stain_clear', 'stain_only', 'clear_only']);

export function defaultFinishGroupForCoatingType(coatingType) {
  if (STAIN_LIKE_COATING_TYPES.has(coatingType)) return 'D';
  return 'C';
}

export function createOpening(overrides={}) {
  return { id:genId('opn'), opening_type:'single', count:1, ...overrides };
}

// Closet shelving type options
export const CLOSET_SHELVING_TYPES = [
  { value: 'none',           label: 'No Shelving' },
  { value: 'wire_shelving',  label: 'Wire Shelving' },
  { value: 'wood_shelving',  label: 'Wood/Melamine Shelving' },
  { value: 'builtin_system', label: 'Built-In Closet System' },
];

export function createCloset(overrides={}) {
  return {
    id: genId('closet'),
    label: 'Closet',
    length_ft: 0,
    width_ft: 0,
    // height inherited from parent room — not stored here
    shelving_type: 'none',
    shelving_lf: 0,
    // Paint/protect toggle for shelving — only meaningful when shelving_type !== 'none'
    paint_shelving: true,
    // Protection level override — null = use shelving type's default
    // Values: any canonical mask level (see data/mask-levels.js)
    protection_level: null,
    // Only contains keys the user explicitly overrides; absent = inherit from parent room
    substrate_overrides: {},
    ...overrides,
  };
}

export function createDoor(overrides={}) {
  return { id:genId('door'), count:1, door_type:'panel_6', substrate_state:'factory_primed', sides_per_door:2, painting:true, ...overrides };
}

export function createWindow(overrides={}) {
  return {
    id: genId('win'),
    count: 1,
    window_type: 'double_hung',
    size_bucket: 'M',
    substrate_state: 'bare_wood',
    width_ft: 0,
    height_ft: 0,
    // Window position drives height_band derivation for window_casing/stool/
    // apron/jamb on this window. 'ground' uses room band; 'clerestory'/'transom'
    // override with sill_height_band (defaulted to STEP at UI layer when toggled
    // off ground).
    window_position: 'ground',
    sill_height_band: 'STD',
    ...overrides,
  };
}

/** Build a default substrate config by merging catalog defaults with any overrides. */
export function createSubstrateConfig(substrateId, overrides={}) {
  const cat = SUBSTRATE_MAP[substrateId];
  if (!cat) return overrides;
  const base = JSON.parse(JSON.stringify(cat.defaultConfig));
  // For items-based substrates (doors/windows), stamp IDs on items
  if (overrides.items && Array.isArray(overrides.items)) {
    if (substrateId === 'doors') overrides.items = overrides.items.map(d => createDoor(d));
    else if (substrateId === 'windows') overrides.items = overrides.items.map(w => createWindow(w));
  }
  const config = { ...base, ...overrides };
  if (WOOD_SUBSTRATES.has(substrateId)) {
    config.coating_type = config.coating_type || 'paint';
    config.wood_species_group = config.wood_species_group || 'hardwood';
    config.application_method_stain = config.application_method_stain || 'brush';
    config.application_method_clear = config.application_method_clear || 'brush';
    config.stain_coats = config.stain_coats ?? 1;
    config.sealer_coats = config.sealer_coats ?? 0;
    config.clear_coats = config.clear_coats ?? 1;
    config.clear_sheen = config.clear_sheen || 'satin';
    config.stain_on = config.stain_on ?? false;
    config.sealer_on = config.sealer_on ?? false;
    config.clear_on = config.clear_on ?? false;
  }
  // Infer default `system` (workflow intent) from substrate_state if not set.
  // Explicit overrides always win; if nothing matches the inference, leaves it null
  // and resolveSystem falls back to room/project defaults or final null.
  if (config.system === undefined) {
    config.system = inferDefaultSystem(substrateId, config.substrate_state) || null;
  }
  // V1a: seed finish_group for non-wall/ceiling substrates. Walls and ceiling
  // are driven by the combined-finish toggle (written by the adapter / selector
  // layer), not by this factory. Fixed set of IDs is the simplest guard.
  const FINISH_GROUP_EXCLUDED = new Set(['walls', 'ceiling']);
  if (!FINISH_GROUP_EXCLUDED.has(substrateId)) {
    if (config.finish_group === undefined) {
      config.finish_group = defaultFinishGroupForCoatingType(config.coating_type);
    }
  }
  return config;
}

export function createRoom(overrides={}) {
  const preset = overrides._preset ? ROOM_PRESETS[overrides._preset] : null;
  const base = {
    id: genId('room'),
    label: preset ? preset.label : `Room ${getNextId()}`,
    area_group: '',
    // Identity tab additions (v0.10) — informational room classification +
    // painting scope preset. Scope preset bulk-toggles substrates via reducer.
    room_type: '',                     // '' | one of ROOM_TYPES ids
    painting_scope_preset: 'custom',   // 'custom' = user manages substrates manually
    is_interior: true,
    wall_material: 'drywall',
    ceiling_material: 'drywall',
    length_ft: 0, width_ft: 0, height_ft: 8,
    // v0.3 vault/gable
    vaulted_ceiling: false,
    peak_height_ft: 0,
    ridge_direction: 'length',
    gable_walls: 0,
    // Cathedral ceiling: flat ceiling at room height_ft, no slope/gable. Mutually
    // exclusive with vaulted_ceiling. Pure labeling flag (no geometry impact) —
    // surfaces "Cathedral Ceiling" suffix on ceiling/wall/clerestory-window tasks
    // in the estimate.
    cathedral_ceiling: false,
    // v0.4 ceiling beams (conditional on vaulted_ceiling)
    beams_enabled: false,
    peak_beam: false,
    cross_beam_count: 0,
    ridge_beam_count: 0,
    beam_width_in: 6,
    beam_depth_in: 6,
    beam_substrate_state: 'bare_wood',
    beam_application_method: 'brush',
    // Room-level overrides
    quality_tier: null, height_band: null, complexity: null, application_method: null,
    openings_quality_tier: null, // v0.8 — QT override for all opening-related specs
    system: null, // v0.9 — room-level workflow override; substrates inherit if not explicitly set
    // v0.3 substrate model — starts blank, presence = in scope
    substrates: {},
    // v0.7 openings — structural wall holes (deductions, casing, frames); separate from door items
    openings: [],
    // Closets — sub-rooms with own dimensions, inherited substrates
    closets: [],
    // Extra walls — partitions, shower walls, nooks
    extra_walls: [],
    // Wall deductions — cabinets, tile, built-ins covering wall area
    wall_deductions: [],
    // v0.5 adjacency — items present but not being painted
    floor_type: '',
    floor_protection: '',
    fixtures: {},  // keyed by fixture_id → { protection: 'partial', count: 1, size: '', notes: '' }
    // v0.10 room-level protection state — Protection tab v2.
    // Mask-level fields (floor/wall/ceiling) are intentionally absent here so
    // that fresh rooms default to AUTO (deriver fills in the matrix output).
    // Setting an explicit value via the Protection tab dropdown flips the row
    // to OVERRIDE. Boolean toggles persist as false defaults.
    protection: {
      // floor_mask_level / wall_mask_level / ceiling_mask_level: undefined → auto
      tapeline_edge: false,
      containment_mode: false,
      containment_door_zipper: false,
    },
    notes: ''
  };

  if (preset) {
    base.length_ft = preset.length_ft;
    base.width_ft = preset.width_ft;
    base.height_ft = preset.height_ft;
    base.label = preset.label;
    // Build substrates from preset
    if (preset.substrates) {
      Object.entries(preset.substrates).forEach(([subId, config]) => {
        base.substrates[subId] = createSubstrateConfig(subId, config);
      });
      // Presets that include doors/windows/casing → set painting=true (they opted in explicitly)
      if (base.substrates.doors) base.substrates.doors.painting = true;
      if (base.substrates.windows) base.substrates.windows.painting = true;
      if (base.substrates.door_casing) base.substrates.door_casing.painting = true;
      if (base.substrates.window_casing) base.substrates.window_casing.painting = true;
      // Auto-generate openings from preset door items (1 single opening per door count)
      const presetDoorItems = base.substrates.doors?.items || [];
      const presetDoorTotal = presetDoorItems.reduce((s,d) => s + (parseInt(d.count)||0), 0);
      if (presetDoorTotal > 0) {
        base.openings = [createOpening({ count: presetDoorTotal })];
      }
    }
  }
  // Doors, windows, and casing always present (for deductions + masking); painting flag controls spec activation
  if (!base.substrates.doors) base.substrates.doors = createSubstrateConfig('doors');
  if (!base.substrates.windows) base.substrates.windows = createSubstrateConfig('windows');
  if (!base.substrates.door_casing) base.substrates.door_casing = createSubstrateConfig('door_casing');
  if (!base.substrates.window_casing) base.substrates.window_casing = createSubstrateConfig('window_casing');
  return base;
}

export const initialState = {
  project: {
    name: '', client_name: '', address: '', status: 'draft',
    new_construction: true,
    default_quality_tier: 'QT3', default_height_band: 'STD',
    default_complexity: 'STD',
    rate_overrides: {},
    tracker_roster: [],
    // Pre-trim NC workflow: when true, walls and ceiling are primed in one
    // continuous spray pass. Combined scenarios drop the wall-line cut-in and
    // ceiling masking. Per-room override in room.combined_prime_override.
    default_combined_prime: false,
    // Finish-phase workflow: when true, walls and ceiling are finished in one
    // spray pass (estimator's consultation call — same sheen/product, no need
    // to cut in between them). Per-room override in room.combined_wc_finish_override.
    default_combined_wc_finish: false,
    default_brand: null,
    material_overrides: { system: {}, manual: [] },
    notes: '',
    default_substrates: ['ceiling', 'walls', 'baseboard'],
    // v0.10 Protection rollout — project-level heuristics for outlets/HVAC vents
    // and project-wide protection defaults.
    protection_defaults: {
      full_trim_tapeline: false,
    },
    protection_heuristics: {
      outlets_per_room: 4,            // mask qty per non-closet room when spraying
      hvac_vents_per_room: 0.7,       // mask qty per room (closets excluded)
      outlet_remove_reinstall: false, // toggle: also remove + reinstall outlet covers (separate prep)
      hvac_action: 'mask',            // 'mask' | 'remove' — mutually exclusive
      // Per-project production rate overrides (EA/hr). null = use canonical
      // task rate; a number = override both install + remove tasks in that
      // category. Plumbed through useEstimateScenario → overlayMap.
      outlet_mask_rate: null,             // overrides TSK_MASK_OUTLET_SWITCH_INSTALL/REMOVE (default 40)
      outlet_remove_reinstall_rate: null, // overrides TSK_PREP_OUTLET_COVER_REMOVE/REINSTALL (default 60)
      hvac_mask_rate: null,               // overrides TSK_MASK_HVAC_VENT_INSTALL/REMOVE (default 20/30)
      hvac_remove_reinstall_rate: null,   // overrides TSK_PREP_HVAC_VENT_REMOVE/REINSTALL (default 10)
    },
  },
  room_categories: [],
  rooms: [],
  exterior: createExteriorState(),
  colors: initialColorState,
  ui: { activeRoomId: null, activeElevationId: null, activeTab:'scope', view:'setup', scopeMode: 'interior' }
};

import { SUBSTRATE_MAP, WOOD_SUBSTRATES } from '../data/substrate-catalog';
import { ROOM_PRESETS } from '../data/room-presets';
import { createExteriorState } from './exterior-state';
import { initialColorState } from './color-state.js';

// ============================================================
// STATE FACTORY
// ============================================================
let nextId = 1;
export function genId(prefix) { return `${prefix}_${nextId++}`; }

// Allow persistence layer to bump nextId past existing IDs
export function bumpNextId(n) { if (n >= nextId) nextId = n + 1; }
export function getNextId() { return nextId; }

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
    // Only contains keys the user explicitly overrides; absent = inherit from parent room
    substrate_overrides: {},
    ...overrides,
  };
}

export function createDoor(overrides={}) {
  return { id:genId('door'), count:1, door_type:'panel_6', substrate_state:'factory_primed', sides_per_door:2, ...overrides };
}

export function createWindow(overrides={}) {
  return { id:genId('win'), count:1, window_type:'double_hung', size_bucket:'M', substrate_state:'bare_wood', width_ft:0, height_ft:0, ...overrides };
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
  }
  return config;
}

export function createRoom(overrides={}) {
  const preset = overrides._preset ? ROOM_PRESETS[overrides._preset] : null;
  const base = {
    id: genId('room'),
    label: preset ? preset.label : `Room ${nextId}`,
    area_group: '',
    is_interior: true,
    length_ft: 0, width_ft: 0, height_ft: 8,
    // v0.3 vault/gable
    vaulted_ceiling: false,
    peak_height_ft: 0,
    ridge_direction: 'length',
    gable_walls: 0,
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
    // v0.3 substrate model — starts blank, presence = in scope
    substrates: {},
    // v0.7 openings — structural wall holes (deductions, casing, frames); separate from door items
    openings: [],
    // Closets — sub-rooms with own dimensions, inherited substrates
    closets: [],
    // v0.5 adjacency — items present but not being painted
    floor_type: '',
    floor_protection: '',
    fixtures: {},  // keyed by fixture_id → { protection: 'partial_cover', count: 1, size: '', notes: '' }
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
    default_complexity: 'STD', default_application_method: 'spray_backroll',
    default_texture: 'smooth',
    default_brand: null,
    material_overrides: { system: {}, manual: {} },
    notes: '',
    default_substrates: ['ceiling', 'walls', 'baseboard']
  },
  rooms: [createRoom()],
  exterior: createExteriorState(),
  colors: initialColorState,
  ui: { activeRoomId: null, activeElevationId: null, activeTab:'scope', view:'setup', scopeMode: 'interior' }
};

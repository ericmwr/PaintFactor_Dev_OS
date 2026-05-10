// Tier 1 NC interior baseline probes. Each probe activates one (or
// closely-related set of) substrate(s) at canonical defaults so the
// engine fires the corresponding spec families and seeds the ledger.
//
// Probe authoring approach: a compact factory + per-probe overrides.
// Modify defaults via spread in each probe entry. Add Tier 2/3/4
// variants by composing on top of these.
//
// User to manually fill gaps after running this set; this is the
// baseline starter, not exhaustive coverage.

const DEFAULT_PROJECT = {
  name: 'Probe',
  client_name: '',
  address: '',
  status: 'draft',
  new_construction: true,
  default_quality_tier: 'QT3',
  default_height_band: 'STD',
  default_complexity: 'STD',
  default_application_method: 'spray_backroll',
  default_texture: 'smooth',
  default_brand: null,
  default_combined_prime: true,
  protection_heuristics: {
    outlets_per_room: 4,
    hvac_vents_per_room: 0.7,
    outlet_remove_reinstall: true,
    hvac_action: 'remove',
    outlet_mask_rate: 30,
    hvac_mask_rate: 10,
  },
};

const DEFAULT_ROOM = {
  id: 'room_1',
  label: 'Probe Room',
  area_group: 'Probe',
  is_interior: true,
  wall_material: 'drywall',
  ceiling_material: 'drywall',
  length_ft: 12,
  width_ft: 12,
  height_ft: 9,
  vaulted_ceiling: false,
  peak_height_ft: 0,
  ridge_direction: 'length',
  gable_walls: 0,
  beams_enabled: false,
  beam_substrate_state: 'bare_wood',
  beam_application_method: 'brush',
  quality_tier: null,
  height_band: null,
  complexity: null,
  application_method: null,
  openings_quality_tier: null,
  substrates: {},
  openings: [],
  closets: [],
  extra_walls: [],
  wall_deductions: [],
  floor_type: 'hardwood',
  floor_protection: '',  // legacy field, no longer drives anything
  fixtures: {},
  notes: '',
  room_type: 'bedroom',
  painting_scope_preset: 'custom',
};

function makeProbe(id, description, substrateOverrides, roomOverrides = {}) {
  return {
    probe_id: id,
    description,
    project: { ...DEFAULT_PROJECT, name: `Probe: ${description}` },
    rooms: [{
      ...DEFAULT_ROOM,
      ...roomOverrides,
      substrates: { ...DEFAULT_ROOM.substrates, ...substrateOverrides },
    }],
  };
}

// Canonical substrate stubs — minimum fields the adapter needs.
const SURFACE = (state, extras = {}) => ({ substrate_state: state, texture: 'smooth', application_method: null, sf_override: false, sf_manual: 0, ...extras });
const TRIM = (state, extras = {}) => ({
  substrate_state: state,
  application_method: null,
  lf_override: false,
  lf_manual: 0,
  painting: true,
  coating_type: 'paint',
  ...extras,
});
const TRIM_WITH_SYSTEM = (state, system, extras = {}) => TRIM(state, { system, ...extras });

export const NC_INTERIOR_BASELINE_PROBES = [
  // ── Drywall surfaces ──
  makeProbe(
    'PRB_NC_DRYWALL_WALL_BARE',
    'Drywall wall NC — bare drywall, smooth',
    { walls: SURFACE('bare_drywall') }
  ),
  makeProbe(
    'PRB_NC_DRYWALL_CEILING_BARE',
    'Drywall ceiling NC — bare drywall, smooth',
    { ceiling: SURFACE('bare_drywall') }
  ),
  makeProbe(
    'PRB_NC_DRYWALL_WALL_FIELD_PRIMED',
    'Drywall wall NC — field-primed, smooth',
    { walls: SURFACE('field_primed') }
  ),

  // ── Trim ──
  makeProbe(
    'PRB_NC_BASEBOARD_BARE',
    'Baseboard NC — bare wood',
    { baseboard: TRIM_WITH_SYSTEM('bare_wood', 'paint_full') }
  ),
  makeProbe(
    'PRB_NC_CROWN_FACTORY',
    'Crown NC — factory primed',
    { crown: TRIM_WITH_SYSTEM('factory_primed', 'paint_finish') }
  ),
  makeProbe(
    'PRB_NC_DOOR_CASING_FACTORY',
    'Door casing NC — factory primed',
    { door_casing: TRIM('factory_primed') }
  ),
  makeProbe(
    'PRB_NC_WINDOW_CASING_FACTORY',
    'Window casing NC — factory primed',
    { window_casing: TRIM('factory_primed') }
  ),

  // ── Doors & windows ──
  makeProbe(
    'PRB_NC_DOOR_SLAB_FACTORY',
    'Door slab NC — factory primed, panel_6',
    {
      doors: {
        items: [{
          id: 'door_1', count: 2, door_type: 'panel_6',
          substrate_state: 'factory_primed', sides_per_door: 1, painting: true,
        }],
        application_method: null,
        painting: true,
        coating_type: 'paint',
      },
    }
  ),
  makeProbe(
    'PRB_NC_WINDOW_INT_VINYL',
    'Window interior NC — vinyl clad, double hung',
    {
      windows: {
        items: [{
          id: 'win_1', count: 2, window_type: 'double_hung',
          size_bucket: 'M', substrate_state: 'vinyl_clad',
          width_ft: 0, height_ft: 0,
          window_position: 'ground', sill_height_band: 'STD',
        }],
        application_method: null,
        painting: true,
        coating_type: 'paint',
      },
    }
  ),

  // ── Room-level protection ──
  // Combines walls + ceiling + a trim so SCN_ROOM_PROTECTION_NC fires
  // alongside the painting specs.
  makeProbe(
    'PRB_NC_PROTECTION_BASIC',
    'Room protection — walls + ceiling + baseboard, full floor mask',
    {
      walls: SURFACE('bare_drywall'),
      ceiling: SURFACE('bare_drywall'),
      baseboard: TRIM_WITH_SYSTEM('bare_wood', 'paint_full'),
    },
    {
      protection: { floor_mask_level: 'full', wall_mask_level: null, ceiling_mask_level: null },
      openings: [
        { id: 'opn_1', opening_type: 'single', count: 1 },
      ],
    }
  ),

  // ── Cabinet protect path (paint=false → fires SCN_CABINET_PROTECT_*) ──
  makeProbe(
    'PRB_NC_CABINET_PROTECT_FULL',
    'Cabinet protect — full mask (kitchen path 1, paint=false)',
    {
      walls: SURFACE('bare_drywall'),
      ceiling: SURFACE('bare_drywall'),
    },
    {
      room_type: 'kitchen',
      fixtures: {
        cabinets: { linear_ft: 18, layout: 'lower_upper', protection: 'full' },
      },
    }
  ),

  // ── Closet shelf paint ──
  makeProbe(
    'PRB_NC_CLOSET_SHELF_PAINT',
    'Closet shelf paint — wood/melamine, painting=true',
    {
      walls: SURFACE('bare_drywall'),
    },
    {
      closets: [{
        id: 'cl_1',
        label: 'Closet 1',
        length_ft: 4,
        width_ft: 2,
        shelving_type: 'wood_melamine',
        painting: true,
        substrate_overrides: {},
      }],
    }
  ),

  // ── Bath fixtures with spray (forces TSK_MASK_*_INSTALL/REMOVE) ──
  makeProbe(
    'PRB_NC_BATH_SPRAY_FIXTURES',
    'Bath fixtures + spray — toilet/vanity/tub/shower mask install+remove',
    {
      walls: { ...SURFACE('bare_drywall'), application_method: 'spray_backroll' },
      ceiling: { ...SURFACE('bare_drywall'), application_method: 'spray_backroll' },
    },
    {
      room_type: 'bathroom',
      fixtures: {
        toilet: { count: 1, protection: 'partial' },
        vanity: { count: 1, width_ft: 4, protection: 'partial' },
        bathtub: { count: 1, protection: 'full' },
        shower: { count: 1, width_ft: 3, height_ft: 6, protection: 'full' },
      },
    }
  ),
];

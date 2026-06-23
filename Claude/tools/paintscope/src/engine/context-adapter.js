// Context adapter: PaintScope UI state → scenario engine inputs.
//
// Extracts the per-(room, spec) context derivation from run-estimate.js
// into a standalone module so the scenario engine can consume the same
// inputs the legacy engine does. This is the bridge that lets us run
// both engines on the same project data side-by-side.
//
// Usage:
//   const adapter = buildScenarioInputs(state);
//   // adapter.roomInputs: Array<{ roomIndex, roomLabel, specId, ctx, roomQty, roomItems }>
//   // adapter.lookups:    the underlying buildRoomQuantityLookups output (useful for debugging)
//
// Each roomInput can be passed directly to runScenarioEstimate:
//   runScenarioEstimate({ scenarioBundle, ctx, roomQty, roomIndex, roomLabel })
//
// The adapter does NOT call the scenario engine — it only builds inputs.
// The test harness (Phase 5) decides how to run and compare both engines.

import { buildRoomQuantityLookups } from './quantity-lookups.js';
import { buildElevationQuantityLookups, buildStandaloneQuantityLookups, buildRooflineSectionQuantities } from './quantity-lookups-exterior.js';
import { deriveElevation, deriveAccessBand } from './derive-elevation.js';
import {
  resolveQualityTier,
  resolveApplicationMethod,
  resolveTextureForSpec,
  resolveCoatingType,
  resolveStainMethod,
  resolveClearMethod,
  resolveCoatCounts,
  resolveClearSheen,
  resolveWoodSpecies,
  deriveStainScope,
} from './scenario-resolution.js';
import { resolveSubstrateStateForSpec, isSpecStateCompatible } from './scenario-compatibility.js';
import { deriveRoom, deriveHeightBand } from './derive-room.js';
import { FIXTURE_CATALOG } from '../data/fixture-catalog.js';
import { SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';
import {
  STAIN_SPEC_FAMILIES,
  DECOMPOSED_STAIN_FAMILIES,
  UI_STATE_TO_SPEC_STATE,
  EXT_UI_STATE_TO_SPEC_STATE,
  SPEC_SUBSTRATE_MAP,
  SPEC_ROLE,
} from '../data/scenario-maps.js';
import { resolveActivation, STATE_TRANSITION_TARGET } from '../data/system-catalog.js';
import { resolveSystem } from './scenario-resolution.js';
import { deriveProtectionDefaults } from './derive-protection-defaults.js';
import { resolvePassGroups } from './pass-groups.js';

// Helper: returns true if any substrate in the room uses a spray application
// method. Mirrors the same check in quantity-lookups.js. Used by the
// room_protection ctx to gate outlet mask tasks (and any future mask tasks
// that should only fire when spraying is happening).
//
// application_method falls back to SUBSTRATE_APPLICATION_METHODS[id].default
// when the user hasn't explicitly picked one — the UI shows that default in
// the dropdown placeholder. The engine has to honor the same rule or rooms
// where the user never touched the dropdown get reported as brush-only.
function computeAnySprayInRoom(room) {
  const subs = room?.substrates || {};
  const isSpray = (m) => (m || '').toString().includes('spray');
  const effective = (id, sub) => sub?.application_method || SUBSTRATE_APPLICATION_METHODS[id]?.default || '';
  if (isSpray(effective('walls', subs.walls))) return true;
  if (isSpray(effective('ceiling', subs.ceiling))) return true;
  const trimIds = ['baseboard','crown','door_casing','window_casing','chair_rail','shoe_mold','picture_rail','window_stool','window_apron','shadow_box','panel_mold','door_frames','window_jamb'];
  for (const id of trimIds) {
    const s = subs[id];
    if (!s || s.painting === false) continue;
    if (isSpray(effective(id, s))) return true;
  }
  return false;
}

// Helper: set explicit-null pass-group fields on a ctx. Required because
// applies_when: { pass_group_id: [null] } uses array-includes semantics and
// [null].includes(undefined) === false — so pass-group fields MUST be null,
// not undefined, on ungrouped inputs.
function normalizePassGroupCtx(ctx) {
  if (ctx.pass_group_id === undefined) ctx.pass_group_id = null;
  if (ctx.pass_group_substrates === undefined) ctx.pass_group_substrates = null;
  if (ctx.pass_type === undefined) ctx.pass_type = null;
  return ctx;
}

// Build ctx for a grouped input by taking common values from the first
// substrate. Precheck in resolvePassGroups already verified the critical
// dimensions (QT, method, state) are identical across substrates.
function buildGroupCtx(group, room, project, roomDerived) {
  const firstSub = room.substrates[group.substrates[0]];
  const ctx = {
    // Dimensions (verified identical by precheck)
    quality_tier:       firstSub.quality_tier || room.quality_tier || project.default_quality_tier || 'QT3',
    application_method: firstSub.application_method || 'brush_roll',
    substrate_state:    firstSub.substrate_state ? uiStateToSpecState(firstSub.substrate_state) : null,
    complexity:         room.complexity || project.default_complexity || 'STD',
    height_band:        roomDerived?.heightBand || 'STD',
    texture:            firstSub.texture || 'smooth',

    // Pass group fields
    pass_group_id:         group.group_id,
    pass_group_substrates: group.substrates.slice(),
    pass_type:             group.pass_type,

    // V1a: when source is item_assignment, expose finish_group on ctx so
    // downstream consumers (summary display, scenario matchers) can see
    // which palette slot this group represents.
    ...(group.metadata?.finish_group ? { finish_group: group.metadata.finish_group } : {}),

    // Phase-specific flags from metadata
    ...(group.metadata?.prime_mode ? { prime_mode: group.metadata.prime_mode } : {}),
    ...(group.metadata?.finish_mode ? { finish_mode: group.metadata.finish_mode } : {}),

    // Sheen resolution — finish scenarios match on sheen, so populate from
    // the first substrate with a fallback to project default. Estimator
    // declared walls + ceiling share the same finish via the toggle, so
    // taking walls' sheen (with fallback) is correct.
    sheen: firstSub.sheen || project.default_sheen || 'eggshell',

    // Explicit null for paintable_item — no single-substrate identity
    paintable_item: null,
  };
  return ctx;
}

// Bridge: the room substrate_state strings use UI conventions ("bare_drywall");
// scenarios match on spec-state names ("SS_BARE_DRYWALL"). The existing
// UI_STATE_TO_SPEC_STATE map handles this.
function uiStateToSpecState(uiState) {
  return UI_STATE_TO_SPEC_STATE?.[uiState] || uiState;
}

// Spec families that map cleanly to a paintable_item in the scenario matcher.
// This is the single-most-important mapping between the spec-keyed legacy
// engine and the scenario-keyed new engine. Scenarios match on paintable_item
// (e.g. "drywall", "ext_eng_siding", "int_door") rather than spec family id.
//
// Missing entries default to null — the scenario matcher will fail to match
// and the caller will see a warning, which is the correct behavior during
// the transition period (exposes gaps rather than silently producing zero).
export const SPEC_TO_PAINTABLE_ITEM = {
  // Interior paint NC
  SF_DRYWALL_WALL_NC_FINISH:        'drywall',
  SF_DRYWALL_WALL_NC_PRIME:         'drywall',
  SF_DRYWALL_CEILING_NC_FINISH:     'drywall',
  SF_DRYWALL_CEILING_NC_PRIME:      'drywall',
  SF_DOOR_SLAB_INT_NC:              'door_slab',
  SF_DOOR_FRAME_NC_FINISH:          'door_frame',
  SF_DOOR_FRAME_NC_PRIME:           'door_frame',
  SF_WINDOW_INT_NC:                 'window',
  SF_WINDOW_JAMB_NC_FINISH:         'window_jamb',
  SF_WINDOW_JAMB_NC_PRIME:          'window_jamb',
  SF_WINDOW_CASING_NC_PAINT:        'window_casing',
  SF_WINDOW_CASING_NC_PRIME:        'window_casing',
  SF_DOOR_CASING_NC_PAINT:          'door_casing',
  SF_DOOR_CASING_NC_PRIME:          'door_casing',
  SF_CROWN_NC_PAINT:                'crown',
  SF_CROWN_NC_PRIME:                'crown',
  SF_CHAIR_RAIL_NC_PAINT:           'chair_rail',
  SF_CHAIR_RAIL_NC_PRIME:           'chair_rail',
  SF_SHOE_MOLD_NC_PAINT:            'shoe_mold',
  SF_SHOE_MOLD_NC_PRIME:            'shoe_mold',
  SF_PICTURE_RAIL_NC_PAINT:         'picture_rail',
  SF_PICTURE_RAIL_NC_PRIME:         'picture_rail',
  SF_WINDOW_STOOL_NC_PAINT:         'window_stool',
  SF_WINDOW_STOOL_NC_PRIME:         'window_stool',
  SF_WINDOW_APRON_NC_PAINT:         'window_apron',
  SF_WINDOW_APRON_NC_PRIME:         'window_apron',
  SF_SHADOW_BOX_NC_PAINT:           'shadow_box',
  SF_SHADOW_BOX_NC_PRIME:           'shadow_box',
  SF_PANEL_MOLD_NC_PAINT:           'panel_mold',
  SF_PANEL_MOLD_NC_PRIME:           'panel_mold',
  SF_BASEBOARD_NC_PAINT:            'baseboard',
  SF_BASEBOARD_NC_PRIME:            'baseboard',
  SF_WAINSCOT_PANEL_NC:             'wainscot',
  SF_WOOD_WALL_NC:                  'wood_wall',
  SF_WOOD_CEILING_NC:               'wood_ceiling',
  SF_ARCH_ELEMENT_NC:               'arch_element',
  SF_BUILTIN_NC:                    'builtin',
  SF_CABINET_NC_PAINT:              'cabinet',
  SF_CLOSET_SHELF_NC:               'closet',

  // Room-level protection (decoupled from paintable-item modules).
  // Activated once per room via buildRoomProtectionCtxs after the substrate loop.
  SF_ROOM_PROTECTION:               'room_protection',

  // Interior stain NC (matches SCN_INT_*_STAIN_CLEAR scenarios which use int_ prefix)
  SF_DOOR_CASING_NC_STAIN:          'int_door_casing',
  SF_WINDOW_CASING_NC_STAIN:        'int_window_casing',
  SF_BASEBOARD_NC_STAIN:            'int_baseboard',
  SF_CROWN_NC_STAIN:                'int_crown',
  SF_CHAIR_RAIL_NC_STAIN:           'int_chair_rail',
  SF_SHOE_MOLD_NC_STAIN:            'int_shoe_mold',
  SF_PICTURE_RAIL_NC_STAIN:         'int_picture_rail',
  SF_WINDOW_STOOL_NC_STAIN:         'int_window_stool',
  SF_WINDOW_APRON_NC_STAIN:         'int_window_apron',
  SF_SHADOW_BOX_NC_STAIN:           'int_shadow_box',
  SF_PANEL_MOLD_NC_STAIN:           'int_panel_mold',
  SF_WINDOW_JAMB_NC_STAIN:          'int_window_jamb',
  SF_WINDOW_INT_NC_STAIN:           'int_window',
  SF_WAINSCOT_PANEL_NC_STAIN:       'int_wainscot',
  SF_WOOD_WALL_NC_STAIN:            'int_wood_wall',
  SF_WOOD_CEILING_NC_STAIN:         'int_wood_ceiling',
  SF_ARCH_ELEMENT_NC_STAIN:         'int_arch_element',
  SF_DOOR_CASING_NC_SEALER:         'int_door_casing',
  SF_DOOR_CASING_NC_CLEAR:          'int_door_casing',
  SF_ARCH_ELEMENT_NC_SEALER:        'int_arch_element',
  SF_ARCH_ELEMENT_NC_CLEAR:         'int_arch_element',
  SF_BASEBOARD_NC_SEALER:           'int_baseboard',
  SF_BASEBOARD_NC_CLEAR:            'int_baseboard',
  SF_CROWN_NC_SEALER:               'int_crown',
  SF_CROWN_NC_CLEAR:                'int_crown',
  SF_CHAIR_RAIL_NC_SEALER:          'int_chair_rail',
  SF_CHAIR_RAIL_NC_CLEAR:           'int_chair_rail',
  SF_WINDOW_CASING_NC_SEALER:       'int_window_casing',
  SF_WINDOW_CASING_NC_CLEAR:        'int_window_casing',
  SF_SHOE_MOLD_NC_SEALER:           'int_shoe_mold',
  SF_SHOE_MOLD_NC_CLEAR:            'int_shoe_mold',
  SF_PICTURE_RAIL_NC_SEALER:        'int_picture_rail',
  SF_PICTURE_RAIL_NC_CLEAR:         'int_picture_rail',
  SF_WINDOW_STOOL_NC_SEALER:        'int_window_stool',
  SF_WINDOW_STOOL_NC_CLEAR:         'int_window_stool',
  SF_WINDOW_APRON_NC_SEALER:        'int_window_apron',
  SF_WINDOW_APRON_NC_CLEAR:         'int_window_apron',
  SF_SHADOW_BOX_NC_SEALER:          'int_shadow_box',
  SF_SHADOW_BOX_NC_CLEAR:           'int_shadow_box',
  SF_PANEL_MOLD_NC_SEALER:          'int_panel_mold',
  SF_PANEL_MOLD_NC_CLEAR:           'int_panel_mold',
  SF_DOOR_FRAME_NC_STAIN:           'int_door_frame',
  SF_DOOR_SLAB_INT_NC_STAIN:        'int_door_slab',
  SF_WINDOW_JAMB_NC_SEALER:         'int_window_jamb',
  SF_WINDOW_JAMB_NC_CLEAR:          'int_window_jamb',
  SF_DOOR_FRAME_NC_SEALER:          'int_door_frame',
  SF_DOOR_FRAME_NC_CLEAR:           'int_door_frame',
  SF_DOOR_SLAB_INT_NC_SEALER:       'int_door_slab',
  SF_DOOR_SLAB_INT_NC_CLEAR:        'int_door_slab',
  SF_WAINSCOT_PANEL_NC_SEALER:      'int_wainscot',
  SF_WAINSCOT_PANEL_NC_CLEAR:       'int_wainscot',
  SF_WOOD_WALL_NC_SEALER:           'int_wood_wall',
  SF_WOOD_WALL_NC_CLEAR:            'int_wood_wall',
  SF_WOOD_CEILING_NC_SEALER:        'int_wood_ceiling',
  SF_WOOD_CEILING_NC_CLEAR:         'int_wood_ceiling',
  SF_WINDOW_INT_NC_SEALER:          'int_window',
  SF_WINDOW_INT_NC_CLEAR:           'int_window',

  // Interior RP
  SF_DRYWALL_WALL_INT_RP:           'drywall_wall',
  SF_DRYWALL_CEILING_INT_RP:        'drywall_ceiling',
  SF_TRIM_INT_RP:                   'trim',
  SF_DOOR_INT_RP:                   'int_door',
  SF_WINDOW_INT_RP:                 'int_window',
  SF_STAIR_INT_RP:                  'int_stair',
  SF_CLOSET_INT_RP:                 'closet',
  SF_CABINET_INT_RP:                'cabinet',
  SF_SPECIALTY_INT_RP:              'int_specialty',

  // Exterior (families converted in Phase 2a)
  SF_TRIM_EXT_NC:                   'ext_trim',
  SF_TRIM_EXT_RP:                   'ext_trim',
  // Wood siding is the generic "siding" paintable_item. Engineered/fibercement/
  // vinyl/aluminum scenarios use prefixed paintable_items (ext_eng_siding, etc.)
  // because they're alternative siding TYPES; wood is the canonical default.
  SF_WOOD_SIDING_EXT_NC_PAINT:      'siding',
  SF_SIDING_WOOD_EXT_RP:            'siding',
  SF_SIDING_ENGINEERED_EXT_NC:      'ext_eng_siding',
  SF_SIDING_ENGINEERED_EXT_RP:      'ext_eng_siding',
  SF_SIDING_FIBERCEMENT_EXT_NC:     'ext_fc_siding',
  SF_SIDING_FIBERCEMENT_EXT_RP:     'ext_fc_siding',
  SF_SIDING_VINYL_EXT_RP:           'ext_vinyl_siding',
  SF_SIDING_ALUMINUM_EXT_RP:        'ext_aluminum_siding',
  SF_DOOR_EXT_NC:                   'ext_door',
  SF_DOOR_EXT_RP:                   'ext_door',
  SF_WINDOW_EXT_NC:                 'ext_window',
  SF_WINDOW_EXT_RP:                 'ext_window',
  SF_PORCH_CEILING_EXT_NC:          'ext_porch_ceiling',
  SF_PORCH_CEILING_EXT_RP:          'ext_porch_ceiling',
  SF_PORCH_FLOOR_EXT_NC:            'ext_porch_floor',
  SF_PORCH_FLOOR_EXT_RP:            'ext_porch_floor',
  SF_SOFFIT_EXT_NC:                 'ext_soffit',
  SF_SOFFIT_EXT_RP:                 'ext_soffit',
  SF_FOUNDATION_EXT_NC:             'ext_foundation',
  SF_FOUNDATION_EXT_RP:             'ext_foundation',
  SF_MASONRY_EXT_NC:                'ext_masonry_wall',
  SF_MASONRY_EXT_RP:                'ext_masonry_wall',
  SF_STUCCO_EXT_NC:                 'ext_stucco_wall',
  SF_STUCCO_EXT_RP:                 'ext_stucco_wall',
  SF_METAL_EXT:                     'ext_metal_railing',
  SF_METAL_EXT_RP:                  'ext_metal_railing',
  SF_GARAGE_DOOR_EXT_NC:            'ext_garage_door',
  SF_GARAGE_DOOR_EXT_RP:            'ext_garage_door',
  SF_CAULK_EXT:                     'ext_caulk_joint',
  SF_DECK_EXT:                      'ext_deck_floor',
  SF_DECK_EXT_RP:                   'ext_deck_floor',
  SF_FENCE_EXT:                     'ext_fence',
  SF_FENCE_EXT_RP:                  'ext_fence',

  // Specialty add-on
  SF_WOOD_GRAIN_FILL_NC:            'grain_fill_surface',
};

// Window-related specs that fan out per height band when a room contains
// windows at different mounting heights (e.g. ground-level + clerestory).
// Maps spec_id → { sub: <key in roomDerived.windowBandLf>, mainKey, jointKey }.
// At adapter-input emit time, if roomDerived.windowBandLf carries multiple
// bands with non-zero LF for the substrate, the engine emits one input per
// band: ctx.height_band is overridden to the band and roomQty is cloned with
// band-specific LF substituted for the spec's main + joint keys. Single-band
// rooms emit one input (the band override still applies, so all-clerestory
// rooms correctly bill at STEP/EXT instead of the room's STD band).
const WINDOW_BAND_SPEC_KEYS = {
  'SF_WINDOW_CASING_NC_PAINT':  { sub: 'casing', mainKey: 'PS_SURFACE_LF.TRIM_CASING_WINDOW',  jointKey: 'PS_EDGE_LF.TRIM_JOINTS_CASING_WINDOW'  },
  'SF_WINDOW_CASING_NC_PRIME':  { sub: 'casing', mainKey: 'PS_SURFACE_LF.TRIM_CASING_WINDOW',  jointKey: 'PS_EDGE_LF.TRIM_JOINTS_CASING_WINDOW'  },
  'SF_WINDOW_JAMB_NC_FINISH':   { sub: 'jamb',   mainKey: 'PS_SURFACE_LF.WINDOW_JAMB',         jointKey: 'PS_EDGE_LF.TRIM_JOINTS_WINDOW_JAMB'   },
  'SF_WINDOW_JAMB_NC_PRIME':    { sub: 'jamb',   mainKey: 'PS_SURFACE_LF.WINDOW_JAMB',         jointKey: 'PS_EDGE_LF.TRIM_JOINTS_WINDOW_JAMB'   },
  'SF_WINDOW_STOOL_NC_PAINT':   { sub: 'stool',  mainKey: 'PS_SURFACE_LF.TRIM_WINDOW_STOOL',   jointKey: 'PS_EDGE_LF.TRIM_JOINTS_WINDOW_STOOL'  },
  'SF_WINDOW_STOOL_NC_PRIME':   { sub: 'stool',  mainKey: 'PS_SURFACE_LF.TRIM_WINDOW_STOOL',   jointKey: 'PS_EDGE_LF.TRIM_JOINTS_WINDOW_STOOL'  },
  'SF_WINDOW_APRON_NC_PAINT':   { sub: 'apron',  mainKey: 'PS_SURFACE_LF.TRIM_WINDOW_APRON',   jointKey: 'PS_EDGE_LF.TRIM_JOINTS_WINDOW_APRON'  },
  'SF_WINDOW_APRON_NC_PRIME':   { sub: 'apron',  mainKey: 'PS_SURFACE_LF.TRIM_WINDOW_APRON',   jointKey: 'PS_EDGE_LF.TRIM_JOINTS_WINDOW_APRON'  },
};

// Substrate-specific height-band override.
// For trim substrates whose work height differs from the room band, returns
// the band derived from substrate config or room geometry. Returns null when
// no override applies (callers fall back to ctx.height_band = roomDerived.heightBand).
//
// Works for both paint specs (subId = 'crown', etc.) and stain specs
// (subId = 'int_crown', etc.) — the int_ prefix is normalized away so the
// same substrate config drives both pipelines.
//
// Rules:
//   crown        → ceiling/peak (always at ceiling level, follows vault)
//   picture_rail → ceiling − 1 ft, or explicit cfg.mounted_height_ft
//   panel_mold   → STD by default, or explicit cfg.height_band_override
//   shadow_box   → STD by default, or explicit cfg.height_band_override
function deriveSubstrateHeightBand(specId, room, subsObj) {
  const rawSubId = SPEC_TO_PAINTABLE_ITEM[specId];
  if (!rawSubId) return null;
  const subId = rawSubId.startsWith('int_') ? rawSubId.slice(4) : rawSubId;
  const cfg = subsObj?.[subId];
  if (!cfg) return null;

  if (subId === 'crown') {
    const ft = parseFloat(room.peak_height_ft) || parseFloat(room.height_ft) || 0;
    return ft > 0 ? deriveHeightBand(ft) : null;
  }
  if (subId === 'picture_rail') {
    const explicit = parseFloat(cfg.mounted_height_ft);
    if (explicit > 0) return deriveHeightBand(explicit);
    const ceil = parseFloat(room.peak_height_ft) || parseFloat(room.height_ft) || 0;
    return ceil > 0 ? deriveHeightBand(Math.max(0, ceil - 1)) : null;
  }
  if (subId === 'panel_mold' || subId === 'shadow_box') {
    // Wall-mounted decorative trim — at hand height regardless of ceiling.
    // Default constant STD; user can override for unusual mounting (e.g.
    // coffered ceiling panels at peak height).
    return cfg.height_band_override || 'STD';
  }
  return null;
}

// Specs that use per-substrate-child expansion: the adapter emits one ctx per
// enabled child element (stair components, closets) rather than a single
// room-level ctx. Each ctx carries paintable_item = <child-scoped> (e.g.
// 'baluster', 'tread', 'closet') instead of a spec-level paintable_item.
export const COMPONENT_EXPANDED_SPECS = new Set([
  'SF_STAIR_RISER_NC',
  'SF_STAIR_RAILING_NC',
  'SF_STAIR_RISER_NC_STAIN',
  'SF_STAIR_RISER_NC_SEALER',
  'SF_STAIR_RISER_NC_CLEAR',
  'SF_STAIR_RAILING_NC_STAIN',
  'SF_STAIR_RAILING_NC_SEALER',
  'SF_STAIR_RAILING_NC_CLEAR',
  'SF_STAIR_TREAD_NC_STAIN',
  'SF_STAIR_TREAD_NC_SEALER',
  'SF_STAIR_TREAD_NC_CLEAR',
  'SF_CLOSET_SHELF_NC',
]);

// Map spec_id → the list of stairway components it covers.
// Each entry is a pair [substrate_key, paintable_item_name] because the
// substrate uses plural names (risers/treads/balusters/newel_posts) but
// the paintable_item must be singular.
const STAIR_SPEC_COMPONENTS = {
  'SF_STAIR_RISER_NC': [
    ['stringer',   'stringer'],
    ['risers',     'riser'],
    ['skirtboard', 'skirtboard'],
  ],
  'SF_STAIR_RAILING_NC': [
    ['balusters',   'baluster'],
    ['newel_posts', 'newel'],
    ['open_rail',   'open_rail'],
    ['wall_rail',   'wall_rail'],
  ],
  // Stain/sealer/clear phase specs: RRST = riser (EA), SRST = open_rail (LF).
  // SRST covers only open_rail for stain — tasks are LF-based (STAIR_OPEN_RAIL ps_key).
  // Baluster/newel/wall_rail stain support deferred to future per-component specs.
  'SF_STAIR_RISER_NC_STAIN':   [['risers',     'riser']],
  'SF_STAIR_RISER_NC_SEALER':  [['risers',     'riser']],
  'SF_STAIR_RISER_NC_CLEAR':   [['risers',     'riser']],
  'SF_STAIR_RAILING_NC_STAIN':  [['open_rail',  'open_rail']],
  'SF_STAIR_RAILING_NC_SEALER': [['open_rail',  'open_rail']],
  'SF_STAIR_RAILING_NC_CLEAR':  [['open_rail',  'open_rail']],
  // TRST = tread (EA). Tasks are EA-based (PS_SURFACE_EA.STAIR_TREAD).
  'SF_STAIR_TREAD_NC_STAIN':   [['treads', 'tread']],
  'SF_STAIR_TREAD_NC_SEALER':  [['treads', 'tread']],
  'SF_STAIR_TREAD_NC_CLEAR':   [['treads', 'tread']],
};

// Convert UI substrate_state (e.g. 'bare_wood', 'factory_primed', 'stained')
// to the spec form (SS_BARE, SS_PRIMED_FACTORY, SS_STAINED).
function stairUIStateToSpecState(uiState) {
  switch (uiState) {
    case 'bare_wood':       return 'SS_BARE';
    case 'factory_primed':  return 'SS_PRIMED_FACTORY';
    case 'stained':         return 'SS_STAINED';
    default:                return 'SS_BARE';
  }
}

// coating_phase for decomposed stair stain phase specs.
// Decomposed SEALER/CLEAR stair specs carry coating_phase so scenario matches
// can discriminate phases (mirroring the PHASE_BY_ROLE logic for flat specs).
const STAIR_STAIN_PHASE = {
  'SF_STAIR_RISER_NC_STAIN':    'stain',
  'SF_STAIR_RISER_NC_SEALER':   'sealer',
  'SF_STAIR_RISER_NC_CLEAR':    'clear',
  'SF_STAIR_RAILING_NC_STAIN':  'stain',
  'SF_STAIR_RAILING_NC_SEALER': 'sealer',
  'SF_STAIR_RAILING_NC_CLEAR':  'clear',
  'SF_STAIR_TREAD_NC_STAIN':    'stain',
  'SF_STAIR_TREAD_NC_SEALER':   'sealer',
  'SF_STAIR_TREAD_NC_CLEAR':    'clear',
};

/**
 * For stair specs in COMPONENT_EXPANDED_SPECS, emit one ctx per enabled component.
 * Each ctx carries paintable_item = <component> plus that component's own
 * substrate_state, application_method, quality_tier, coating_type.
 * Decomposed stain phase specs (STAIN/SEALER/CLEAR) also stamp coating_phase
 * so scenario matches can use coating_phase as a discriminator.
 *
 * Returns: array of ctx objects. Empty array if no enabled components or no stairway.
 */
export function expandStairwaySpecContexts(specId, room, project) {
  const stair = room?.substrates?.stairway;
  if (!stair) return [];
  const componentPairs = STAIR_SPEC_COMPONENTS[specId];
  if (!componentPairs) return [];

  const isStainSpec = specId.includes('STAIN') || specId.includes('SEALER') || specId.includes('CLEAR');
  // Set of acceptable coating_types for this spec. A component whose
  // coating_type doesn't match is silently skipped — this prevents stain
  // specs from emitting duplicate ctxs for paint components (and vice versa),
  // which was causing double-counting in mixed-coating stairways.
  const expectedCoatingTypes = isStainSpec
    ? new Set(['stain_clear', 'stain_only', 'clear_only'])
    : new Set(['paint']);
  const coatingPhase = STAIR_STAIN_PHASE[specId] || null;
  const contexts = [];

  for (const [subKey, paintableItem] of componentPairs) {
    const comp = stair.components?.[subKey];
    if (!comp || comp.enabled === false) continue;
    // Default coating_type if unset matches the spec's family.
    const compCoatingType = comp.coating_type || (isStainSpec ? 'stain_clear' : 'paint');
    if (!expectedCoatingTypes.has(compCoatingType)) continue;

    const appMethod = comp.application_method || (isStainSpec ? 'brush' : 'brush');
    const ctx = {
      paintable_item: paintableItem,
      substrate_state: stairUIStateToSpecState(comp.substrate_state),
      application_method: appMethod,
      quality_tier: comp.quality_tier || project?.default_quality_tier || 'QT3',
      coating_type: compCoatingType,
      grain_fill: comp.grain_fill || false,
      height_band: 'STD',
      complexity: 'STD',
      __specId: specId,
      __component: paintableItem,
    };
    if (isStainSpec) {
      // Stain/sealer/clear specs need per-phase method fields for module gates
      ctx.application_method_stain = comp.application_method_stain || appMethod;
      ctx.application_method_clear = comp.application_method_clear || appMethod;
      ctx.wood_species_group        = comp.wood_species_group || 'hardwood';
      ctx.clear_sheen               = comp.clear_sheen || 'satin';
    }
    if (coatingPhase) ctx.coating_phase = coatingPhase;
    if (paintableItem === 'baluster') {
      ctx.baluster_type = comp.baluster_type || 'square';
      ctx.material = comp.material || 'wood';
    }
    contexts.push(ctx);
  }
  return contexts;
}

/**
 * Build protect ctxs for a cabinet substrate in protect mode.
 *
 * Returns an array of 0 or 1 ctx objects. Two sources are checked:
 *
 *   1. Protection tab fixture: room.fixtures.cabinets (preferred)
 *      Has: linear_ft, layout (lower_only/lower_upper), protection level.
 *      Emitted when the fixture checkbox is checked (fixture exists + linear_ft > 0).
 *
 *   2. Specialty tab fallback: room.substrates.cabinets with paint_cabinets === false
 *      Legacy path — kept for backwards compatibility with coverage kit data.
 *
 * Matches SCN_CABINET_PROTECT_{LIGHT,STANDARD,HEAVY} scenarios.
 */
export function buildCabinetProtectCtxs(room, project) {
  // ── Source 1: Protection tab fixture (authoritative when present) ──
  const fix = room?.fixtures?.cabinets;
  if (fix) {
    const lf = parseFloat(fix.linear_ft) || 0;
    if (lf > 0) {
      // Path 1: pass canonical mask-level vocab through directly. The 7
      // SCN_CABINET_PROTECT_* scenarios match on canonical levels
      // (edge/partial/full/encapsulate/edge_partial/edge_full/edge_encapsulate).
      // The legacy LIGHT/STANDARD/HEAVY scenarios are reserved for Path 2.
      const level = fix.protection || 'partial';
      return [{
        paintable_item: 'cabinet',
        coating_type: 'protect',
        protection_level: level,
        quality_tier: project?.default_quality_tier || 'QT3',
        application_method: 'n/a',
        substrate_state: 'SS_PROTECTED',
        height_band: 'STD',
        complexity: 'STD',
        __specId: 'SF_CABINET_NC_PAINT',
        __component: 'cabinet_protect',
        __source: 'fixture',
      }];
    }
  }

  // ── Source 2: Specialty tab fallback ──
  const cab = room?.substrates?.cabinets;
  if (!cab) return [];
  if (cab.paint_cabinets !== false) return [];
  const totalFaces = (cab.door_count || 0) + (cab.drawer_count || 0);
  if (totalFaces <= 0) return [];
  // CabinetsDetailPanel ("Protect" mode) emits canonical mask-level vocab
  // (edge / partial / full / encapsulate). Path 1 scenarios match on
  // canonical levels directly — no translation needed.
  const level = cab.protection_level || 'partial';
  return [{
    paintable_item: 'cabinet',
    coating_type: 'protect',
    protection_level: level,
    quality_tier: cab.quality_tier || project?.default_quality_tier || 'QT3',
    application_method: 'n/a',
    substrate_state: 'SS_PROTECTED',
    height_band: 'STD',
    complexity: 'STD',
    __specId: 'SF_CABINET_NC_PAINT',
    __component: 'cabinet_protect',
    __source: 'substrate',
  }];
}

/**
 * Build protect ctxs for closets in protect mode.
 *
 * Iterates room.closets[] and emits one ctx per closet with:
 *   - shelving_type !== 'none'
 *   - shelving_lf > 0
 *   - paint_shelving === false
 *
 * Protection level resolution: user override if set, else shelving-type default
 * (wire_shelving → edge, wood_shelving → partial). Built-in systems are
 * SKIPPED — they have a separate SF-based protection design (deferred).
 *
 * Canonical mask-level vocab passes through directly — the 7 new
 * SCN_CLOSET_SHELF_PROTECT_* scenarios match on canonical levels.
 */
export function buildClosetShelfProtectCtxs(room, project) {
  const closets = room?.closets || [];
  if (closets.length === 0) return [];
  const contexts = [];
  for (const closet of closets) {
    // Built-in systems are out of scope for this protection model.
    if (closet.shelving_type !== 'wire_shelving' && closet.shelving_type !== 'wood_shelving') continue;
    const lf = parseFloat(closet.shelving_lf) || 0;
    if (lf <= 0) continue;
    if (closet.paint_shelving !== false) continue;
    // Level: user override, else shelving-type default (canonical vocab).
    let level = closet.protection_level;
    if (!level) {
      level = closet.shelving_type === 'wire_shelving' ? 'edge' : 'partial';
    }
    contexts.push({
      paintable_item: 'closet',
      coating_type: 'protect',
      protection_level: level,
      quality_tier: closet.quality_tier || project?.default_quality_tier || 'QT3',
      application_method: 'n/a',
      substrate_state: 'SS_PROTECTED',
      height_band: 'STD',
      complexity: 'STD',
      __specId: 'SF_CLOSET_SHELF_NC',
      __component: 'closet_shelf_protect',
      __closetId: closet.id || null,
      __closetLabel: closet.label || null,
    });
  }
  return contexts;
}

/**
 * Build paint ctxs for closets in paint mode.
 *
 * Iterates room.closets[] and emits one ctx per closet with:
 *   - shelving_type !== 'none'
 *   - shelving_lf > 0
 *   - paint_shelving !== false (paint is the default)
 *
 * Each ctx carries that closet's own substrate_state, quality_tier,
 * application_method — critical for kits where a single room has closets
 * with mixed states (bare + factory_primed + melamine etc.).
 *
 * Matches SCN_CLOSET_SHELF_NC_* scenarios.
 */
export function buildClosetShelfPaintCtxs(room, project) {
  const closets = room?.closets || [];
  if (closets.length === 0) return [];
  const contexts = [];
  for (const closet of closets) {
    if (closet.shelving_type === 'none') continue;
    const lf = parseFloat(closet.shelving_lf) || 0;
    if (lf <= 0) continue;
    if (closet.paint_shelving === false) continue; // protect path, not paint
    // UI → spec state conversion (mirrors stair converter).
    const uiState = closet.substrate_state;
    const specState =
      uiState === 'bare_wood'      ? 'SS_BARE'
      : uiState === 'factory_primed' ? 'SS_PRIMED_FACTORY'
      : uiState === 'melamine'     ? 'SS_FACTORY_FINISH'
      : uiState === 'stained'      ? 'SS_STAINED'
      : 'SS_BARE';
    contexts.push({
      paintable_item: 'closet',
      coating_type: closet.coating_type || 'paint',
      substrate_state: specState,
      quality_tier: closet.quality_tier || project?.default_quality_tier || 'QT3',
      application_method: closet.application_method || 'brush_roll',
      height_band: 'STD',
      complexity: 'STD',
      __specId: 'SF_CLOSET_SHELF_NC',
      __component: 'closet_shelf_paint',
      __closetId: closet.id || null,
      __closetLabel: closet.label || null,
    });
  }
  return contexts;
}

/**
 * Dispatcher for all protect-mode ctx builders.
 *
 * Returns a flat array of protect ctxs for the given room. Each
 * substrate-specific helper decides whether to emit anything. Future
 * substrates (walls, trim, floors) plug in here without changing the
 * adapter's control flow.
 */
export function expandProtectContexts(room, project) {
  const out = [];
  out.push(...buildCabinetProtectCtxs(room, project));
  out.push(...buildClosetShelfProtectCtxs(room, project));
  return out;
}

/**
 * Build the SF_ROOM_PROTECTION ctx for a room. Fires when the room has at
 * least one active paintable item (otherwise no protection needed). Pulls
 * mask levels + flags from `room.protection` state. Modules' applies_when
 * gates pick which level's task fires per surface.
 *
 * Caller should only invoke this AFTER the substrate loop has determined
 * whether the room has any active spec — pass `roomHasActiveSpec` boolean.
 */
export function buildRoomProtectionCtxs(room, project, roomHasActiveSpec) {
  if (!roomHasActiveSpec) return [];
  const p = room.protection || {};
  // Auto-derive defaults from active scope + floor type + methods. User overrides
  // in room.protection.* take precedence; rules fill in anything the user hasn't pinned.
  const defaults = deriveProtectionDefaults(room, project);
  return [{
    paintable_item: 'room_protection',
    quality_tier: project?.default_quality_tier || 'QT3',
    application_method: 'n/a',
    substrate_state: 'SS_ANY',
    height_band: 'STD',
    complexity: room.complexity || project?.default_complexity || 'STD',
    floor_mask_level:    p.floor_mask_level    || defaults.floor_mask_level,
    wall_mask_level:     p.wall_mask_level     || defaults.wall_mask_level,
    ceiling_mask_level:  p.ceiling_mask_level  || defaults.ceiling_mask_level,
    containment_mode:        p.containment_mode === true,
    containment_door_zipper: p.containment_door_zipper === true,
    tapeline_edge:           p.tapeline_edge === true || project?.protection_defaults?.full_trim_tapeline === true,
    // Spray-in-room flag — gates outlet mask tasks (and any other future
    // mask tasks that should only fire when spraying happens).
    any_spray_in_room:       computeAnySprayInRoom(room),
    // Project-level prep heuristic toggles — gate prep-phase tasks
    outlet_remove_reinstall: project?.protection_heuristics?.outlet_remove_reinstall === true,
    hvac_action:             project?.protection_heuristics?.hvac_action || 'mask',
    __specId: 'SF_ROOM_PROTECTION',
    __component: 'room_protection',
    __auto_categories: defaults._categories,  // exposed for diagnostic / UI reason display
  }];
}

/**
 * Exterior roomIndex namespacing convention
 * -----------------------------------------
 * Exterior inputs use negative roomIndex values so they never collide with
 * positive interior room indices in downstream consumers. The two exterior
 * builders below partition that negative range:
 *
 *   Elevation inputs:  roomIndex ∈ [-100, -999]  (one per elevation, -100 - ei)
 *   Standalone inputs: roomIndex ∈ [-1000, -1999] (one per standalone item type,
 *                                                  -1000 - STANDALONE_INDEX[type])
 *
 * The -1000 floor for standalones means we can have up to 900 elevations
 * before the ranges collide, which is well beyond any realistic project.
 */

/**
 * Predicate for the convention above: true when a roomIndex belongs to an
 * exterior input (elevation OR standalone — both occupy roomIndex <= -100).
 * Single source of truth so downstream domain checks don't hardcode -100.
 */
export function isExteriorRoomIndex(roomIndex) {
  return roomIndex <= -100;
}

/**
 * Build scenario inputs from state.exterior.elevations[].
 *
 * For each elevation × each active exterior elevation-bound spec (siding,
 * trim, soffit, window, door, foundation, caulk, porch — the non-standalone
 * subset), emits one roomInput-shaped object the scenario engine can consume.
 *
 * Returns: Array<{ roomIndex, roomLabel, specId, ctx, roomQty, roomItems }>
 *
 * roomIndex uses negative offsets (-100 - ei) so exterior never collides with
 * interior room indices in downstream consumers. See namespacing comment above.
 */
export function buildElevationScenarioInputs(state) {
  const inputs = [];
  const exterior = state.exterior;
  if (!exterior || !Array.isArray(exterior.elevations) || exterior.elevations.length === 0) {
    return inputs;
  }
  const project = state.project || {};
  const extDefaults = exterior.defaults || {};
  const siteConditions = exterior.site_conditions || {};
  const projectType = exterior.project_type || 'NC';
  const activeSpecIds = projectType === 'RP'
    ? new Set(['SF_SIDING_WOOD_EXT_RP','SF_SIDING_ALUMINUM_EXT_RP','SF_SIDING_VINYL_EXT_RP',
               'SF_SIDING_FIBERCEMENT_EXT_RP','SF_SIDING_ENGINEERED_EXT_RP',
               'SF_STUCCO_EXT_RP','SF_MASONRY_EXT_RP','SF_TRIM_EXT_RP','SF_SOFFIT_EXT_RP',
               'SF_WINDOW_EXT_RP','SF_DOOR_EXT_RP','SF_GARAGE_DOOR_EXT_RP','SF_DECK_EXT_RP',
               'SF_FENCE_EXT_RP','SF_FOUNDATION_EXT_RP','SF_PORCH_CEILING_EXT_RP',
               'SF_PORCH_FLOOR_EXT_RP','SF_METAL_EXT_RP'])
    : new Set(['SF_WOOD_SIDING_EXT_NC_PAINT','SF_SIDING_FIBERCEMENT_EXT_NC',
               'SF_SIDING_ENGINEERED_EXT_NC','SF_STUCCO_EXT_NC','SF_MASONRY_EXT_NC',
               'SF_TRIM_EXT_NC','SF_SOFFIT_EXT_NC','SF_WINDOW_EXT_NC','SF_DOOR_EXT_NC',
               'SF_GARAGE_DOOR_EXT_NC','SF_CAULK_EXT','SF_DECK_EXT','SF_FENCE_EXT',
               'SF_FOUNDATION_EXT_NC','SF_PORCH_CEILING_EXT_NC','SF_PORCH_FLOOR_EXT_NC',
               'SF_METAL_EXT']);
  const elevLookups = buildElevationQuantityLookups(state);

  // Elevation-bound specs (everything NOT in STANDALONE_SPECS below).
  const STANDALONE_SPECS = new Set([
    'SF_DECK_EXT', 'SF_FENCE_EXT', 'SF_FOUNDATION_EXT_NC',
    'SF_PORCH_CEILING_EXT_NC', 'SF_PORCH_FLOOR_EXT_NC',
    'SF_GARAGE_DOOR_EXT_NC', 'SF_METAL_EXT',
    'SF_DECK_EXT_RP', 'SF_FENCE_EXT_RP', 'SF_FOUNDATION_EXT_RP',
    'SF_PORCH_CEILING_EXT_RP', 'SF_PORCH_FLOOR_EXT_RP',
    'SF_GARAGE_DOOR_EXT_RP', 'SF_METAL_EXT_RP',
  ]);

  exterior.elevations.forEach((elev, ei) => {
    const roomLabel = elev.label || `Elevation ${ei + 1}`;

    // Roofline sections price as virtual elevations under their OWN access band
    // (their peak height — not the wall's eave). Emitted before the wall's
    // empty-qty guard so a section still prices even if the elevation itself
    // carries no wall siding. roomIndex uses a separate -3000 namespace so each
    // section reads as its own exterior line without colliding with elevations
    // (-100..) or standalone items (-1000..-1999).
    const sectionBuckets = buildRooflineSectionQuantities(deriveElevation(elev).rooflineSections);
    sectionBuckets.forEach((bucket, si) => {
      const sectionElev = { ...elev, access_type: bucket.accessBand.toLowerCase() };
      const sectionRoomIndex = -3000 - (ei * 100 + si);
      const sectionLabel = `${roomLabel} · roofline ${si + 1}`;
      for (const specId of activeSpecIds) {
        if (STANDALONE_SPECS.has(specId)) continue;
        const sctx = buildExteriorCtx(specId, sectionElev, extDefaults, siteConditions, null, ei, projectType, project);
        sctx.section_difficulty = bucket.difficultyFactor;
        inputs.push({
          roomIndex: sectionRoomIndex,
          roomLabel: sectionLabel,
          specId,
          ctx: normalizePassGroupCtx(sctx),
          roomQty: bucket.qty,
          roomItems: { doors: [], windows: [] },
        });
      }
    });

    const qty = elevLookups.get(ei);
    if (!qty || qty.size === 0) return;
    const roomIndex = -100 - ei;

    for (const specId of activeSpecIds) {
      if (STANDALONE_SPECS.has(specId)) continue;
      const ctx = buildExteriorCtx(specId, elev, extDefaults, siteConditions, null, ei, projectType, project);
      // Emit one input per (elevation × every active exterior elevation-bound
      // spec); the scenario matcher gates on paintable_item / substrate_state
      // downstream. No per-spec PS-key filter is applied here — false
      // candidates surface as gap-list noise during Task 4, which is the
      // intended cost trade-off (vs implementing a per-spec PS-key check now).
      inputs.push({
        roomIndex,
        roomLabel,
        specId,
        ctx: normalizePassGroupCtx(ctx),
        roomQty: qty,
        roomItems: { doors: elev.doors || [], windows: elev.windows || [] },
      });
    }
  });

  return inputs;
}

/**
 * Build scenario inputs from state.exterior.standalone (garage doors, fence,
 * deck, foundation, porch, metal — items not bound to a specific elevation).
 *
 * Returns: Array<{ roomIndex, roomLabel, specId, ctx, roomQty, roomItems }>
 *
 * Note: `porch` is one standalone lookup (key emitted by
 * buildStandaloneQuantityLookups) but produces TWO inputs — one for ceiling,
 * one for floor — because the porch lookup carries both ceiling and floor SF
 * keys, and each is consumed by a separate spec.
 *
 * See exterior roomIndex namespacing comment above buildElevationScenarioInputs
 * for the negative-index convention.
 */
export function buildStandaloneScenarioInputs(state) {
  const inputs = [];
  const exterior = state.exterior;
  if (!exterior) return inputs;
  const project = state.project || {};
  const extDefaults = exterior.defaults || {};
  const siteConditions = exterior.site_conditions || {};
  const projectType = exterior.project_type || 'NC';
  const standaloneLookups = buildStandaloneQuantityLookups(state);

  // Map standalone lookup key → list of spec ids that should consume it.
  // Most keys map 1:1, but `porch` is 1:2 (ceiling + floor specs) because
  // a single porch lookup carries both PS keys.
  const STANDALONE_SPECS_FOR_ITEM = {
    garage_doors:   [projectType === 'RP' ? 'SF_GARAGE_DOOR_EXT_RP' : 'SF_GARAGE_DOOR_EXT_NC'],
    fence:          [projectType === 'RP' ? 'SF_FENCE_EXT_RP'       : 'SF_FENCE_EXT'],
    deck:           [projectType === 'RP' ? 'SF_DECK_EXT_RP'        : 'SF_DECK_EXT'],
    foundation:     [projectType === 'RP' ? 'SF_FOUNDATION_EXT_RP'  : 'SF_FOUNDATION_EXT_NC'],
    porch:          projectType === 'RP'
      ? ['SF_PORCH_CEILING_EXT_RP', 'SF_PORCH_FLOOR_EXT_RP']
      : ['SF_PORCH_CEILING_EXT_NC', 'SF_PORCH_FLOOR_EXT_NC'],
    metal_surfaces: [projectType === 'RP' ? 'SF_METAL_EXT_RP'       : 'SF_METAL_EXT'],
  };

  // Stable slot table — decouples roomIndex from object-key insertion order.
  // Unknown itemTypes are skipped (rather than colliding at -1).
  const STANDALONE_INDEX = {
    garage_doors:   0,
    fence:          1,
    deck:           2,
    foundation:     3,
    porch:          4,
    metal_surfaces: 5,
  };

  standaloneLookups.forEach((qty, itemType) => {
    if (!qty || qty.size === 0) return;
    const specIds = STANDALONE_SPECS_FOR_ITEM[itemType];
    if (!specIds) return;
    const standaloneSlot = STANDALONE_INDEX[itemType];
    if (standaloneSlot === undefined) return; // unknown itemType — skip
    const roomIndex = -1000 - standaloneSlot;
    const roomLabel = `Standalone: ${itemType}`;
    for (const specId of specIds) {
      const ctx = buildExteriorCtx(specId, null, extDefaults, siteConditions, exterior.standalone, itemType, projectType, project);
      inputs.push({
        roomIndex,
        roomLabel,
        specId,
        ctx: normalizePassGroupCtx(ctx),
        roomQty: qty,
        roomItems: null,
      });
    }
  });

  return inputs;
}

// Exterior spec → substrate source key. Was previously in SPEC_SUBSTRATE_MAP
// but those entries were stripped in the SF_EXT_* cutover (commit 2d333e3).
// The adapter still needs this mapping to route substrate_state / texture /
// material reads to the correct section/trim/standalone config. Keeping it
// inline here (vs. re-adding to scenario-maps.js) so the scenario engine path
// owns its dependencies — interior code no longer references it.
const EXT_SPEC_SUBSTRATE_MAP = Object.freeze({
  // NC
  SF_WOOD_SIDING_EXT_NC_PAINT:    'ext_siding',
  SF_SIDING_FIBERCEMENT_EXT_NC:   'ext_siding',
  SF_SIDING_ENGINEERED_EXT_NC:    'ext_siding',
  SF_STUCCO_EXT_NC:               'ext_siding',
  SF_MASONRY_EXT_NC:              'ext_siding',
  SF_TRIM_EXT_NC:                 'ext_trim',
  SF_SOFFIT_EXT_NC:               'ext_soffit',
  SF_WINDOW_EXT_NC:               'ext_window',
  SF_DOOR_EXT_NC:                 'ext_door',
  SF_GARAGE_DOOR_EXT_NC:          'ext_garage_door',
  SF_CAULK_EXT:                   'ext_caulk',
  SF_DECK_EXT:                    'ext_deck',
  SF_FENCE_EXT:                   'ext_fence',
  SF_FOUNDATION_EXT_NC:           'ext_foundation',
  SF_PORCH_CEILING_EXT_NC:        'ext_porch_ceiling',
  SF_PORCH_FLOOR_EXT_NC:          'ext_porch_floor',
  SF_METAL_EXT:                   'ext_metal',
  // RP
  SF_SIDING_WOOD_EXT_RP:          'ext_siding',
  SF_SIDING_ALUMINUM_EXT_RP:      'ext_siding',
  SF_SIDING_VINYL_EXT_RP:         'ext_siding',
  SF_SIDING_FIBERCEMENT_EXT_RP:   'ext_siding',
  SF_SIDING_ENGINEERED_EXT_RP:    'ext_siding',
  SF_STUCCO_EXT_RP:               'ext_siding',
  SF_MASONRY_EXT_RP:              'ext_siding',
  SF_TRIM_EXT_RP:                 'ext_trim',
  SF_SOFFIT_EXT_RP:               'ext_soffit',
  SF_WINDOW_EXT_RP:               'ext_window',
  SF_DOOR_EXT_RP:                 'ext_door',
  SF_GARAGE_DOOR_EXT_RP:          'ext_garage_door',
  SF_DECK_EXT_RP:                 'ext_deck',
  SF_FENCE_EXT_RP:                'ext_fence',
  SF_FOUNDATION_EXT_RP:           'ext_foundation',
  SF_PORCH_CEILING_EXT_RP:        'ext_porch_ceiling',
  SF_PORCH_FLOOR_EXT_RP:          'ext_porch_floor',
  SF_METAL_EXT_RP:                'ext_metal',
});

/**
 * Build the per-(spec, elevation|standalone) ctx with the three-level override
 * cascade: project defaults → elevation → siding section.
 *
 * Lifted from run-estimate.js `buildExteriorContext()` (lines 911-980) and
 * adapted to also stamp the fields the scenario engine expects (paintable_item,
 * surface, etc.) so the scenario matcher can resolve.
 */
function buildExteriorCtx(specId, elevation, extDefaults, siteConditions, standalone, index, projectType, project) {
  const ctx = {
    // Core spec context
    quality_tier: extDefaults.quality_tier || project?.default_quality_tier || 'QT3',
    application_method: extDefaults.application_method || 'spray_backbrush',
    surface_texture: 'smooth',
    height_band: 'GROUND',
    complexity: 'STD',

    // Site conditions
    wind_exposure: siteConditions.wind_exposure || 'moderate',
    sun_exposure: siteConditions.sun_exposure || 'mixed',
    temperature_zone: siteConditions.temperature_zone || 'standard',

    // Exterior identity
    access_type: 'ground',
    project_type: projectType,
    condition_scale: projectType === 'RP' ? (extDefaults.condition_scale || 'GOOD') : undefined,

    // Scenario-matcher fields — populated below from spec id / elevation data
    paintable_item: SPEC_TO_PAINTABLE_ITEM[specId] || null,
    substrate_state: null,
    coating_type: 'paint',
    surface: null,

    // Pass-group fields (always null for exterior)
    pass_group_id: null,
    pass_group_substrates: null,
    pass_type: null,
  };

  // Elevation overrides
  if (elevation) {
    if (elevation.quality_tier) ctx.quality_tier = elevation.quality_tier;
    if (elevation.application_method) ctx.application_method = elevation.application_method;
    ctx.access_type = elevation.access_type || 'ground';
    ctx.height_band = deriveAccessBand(ctx.access_type);

    // Caulking scope (legacy parity — flows from elevation if set).
    if (elevation.caulk_scope) ctx.caulk_scope = elevation.caulk_scope;

    // Substrate state / texture / siding type from the first matching section
    const substrateSource = EXT_SPEC_SUBSTRATE_MAP[specId];
    if (substrateSource === 'ext_siding' && Array.isArray(elevation.siding_sections) && elevation.siding_sections.length > 0) {
      const sec = elevation.siding_sections[0];
      if (sec.substrate_state && EXT_UI_STATE_TO_SPEC_STATE[sec.substrate_state]) {
        ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[sec.substrate_state];
      }
      ctx.surface_texture = sec.texture_profile || 'smooth';
      ctx.siding_type = sec.siding_type;
      ctx.siding_profile = sec.siding_profile || null;
      // Legacy ctx fields:
      //   substrate_material — read from section
      //   condition_scale    — per-section override wins over RP default
      ctx.substrate_material = sec.substrate_material || null;
      if (sec.condition_scale) ctx.condition_scale = sec.condition_scale;
    }
    if (substrateSource === 'ext_trim') {
      // elevation.trim is an object map keyed by trim type (see exterior-state.js
      // createElevation). Iterate and pick the first enabled config with a
      // substrate_state, mirroring legacy buildExteriorContext behavior.
      const trimMap = elevation.trim || {};
      for (const config of Object.values(trimMap)) {
        if (config?.enabled && config.substrate_state && EXT_UI_STATE_TO_SPEC_STATE[config.substrate_state]) {
          ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[config.substrate_state];
          // Legacy ctx fields from the same matched trim config:
          ctx.substrate_material = config.substrate_material || null;
          ctx.profile_complexity = config.profile_complexity || 'standard';
          if (config.condition_scale) ctx.condition_scale = config.condition_scale;
          break;
        }
      }
    }
  }

  // Standalone overrides
  if (standalone) {
    if (index === 'fence' && standalone.fence) {
      ctx.fence_style = standalone.fence.style || 'privacy';
      if (standalone.fence.substrate_state && EXT_UI_STATE_TO_SPEC_STATE[standalone.fence.substrate_state]) {
        ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[standalone.fence.substrate_state];
      }
    }
    if (index === 'deck' && standalone.deck) {
      ctx.coating_type = standalone.deck.coating_type || 'paint';
      if (standalone.deck.substrate_state && EXT_UI_STATE_TO_SPEC_STATE[standalone.deck.substrate_state]) {
        ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[standalone.deck.substrate_state];
      }
    }
    if (index === 'foundation' && standalone.foundation) {
      ctx.foundation_type = standalone.foundation.type || 'poured';
    }
    // C2 fix: state-shape key is `standalone.metal_surfaces` (array), not
    // `standalone.metal`. The standalone lookup also emits this under the
    // `metal_surfaces` key, so `index` is `metal_surfaces` here.
    if (index === 'metal_surfaces' && Array.isArray(standalone.metal_surfaces) && standalone.metal_surfaces.length > 0) {
      const metal = standalone.metal_surfaces[0];
      ctx.metal_profile_complexity = metal.profile_complexity || 'simple';
    }
    if (index === 'garage_doors' && Array.isArray(standalone.garage_doors) && standalone.garage_doors.length > 0) {
      const gd = standalone.garage_doors[0];
      ctx.door_size = gd.size || 'single';
      ctx.panel_complexity = gd.panel_type || 'flush';
    }
  }

  return ctx;
}

/**
 * Build the per-spec per-room context + quantity lookup for every active
 * (room, spec) pair in the project. Iterates the scenario-owned active-spec
 * list (Object.keys(SPEC_SUBSTRATE_MAP)) over state.rooms and returns a flat
 * array the scenario engine can iterate.
 *
 * Inputs:
 *   state — full PaintScope project state { project, rooms }
 *
 * Returns:
 *   {
 *     roomInputs: Array<{
 *       roomIndex: number,
 *       roomLabel: string,
 *       specId:    string,            // legacy spec family id (for diffing)
 *       ctx:       object,            // { quality_tier, application_method, ... }
 *       roomQty:   Map<ps_key, { value }>,
 *       roomItems: object | null,     // { doors: [...], windows: [...] }
 *     }>,
 *     lookups: ReturnType<buildRoomQuantityLookups>,
 *     warnings: string[],
 *   }
 */
export function buildScenarioInputs(state) {
  const warnings = [];
  const roomInputs = [];
  const project = state.project || {};
  const rooms = state.rooms || [];

  const lookups = buildRoomQuantityLookups(state);

  // Active specs come from the scenario-owned routing map. Any spec id absent
  // from SPEC_SUBSTRATE_MAP is skipped by the `if (!primarySub) continue` guard
  // in the loop below, so iterating the map's keys is equivalent to the former
  // legacy-table union and removes the scenario adapter's last spec-table
  // dependency (P1, spec-system retirement).
  const activeSpecIds = new Set(Object.keys(SPEC_SUBSTRATE_MAP));

  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    const roomLabel = room.label || room.name || `Room ${ri + 1}`;
    const roomDerived = deriveRoom(room);
    const roomQty = lookups.get(ri)?.qty || new Map();
    const roomItems = {
      doors: room.doors || [],
      windows: room.windows || [],
    };

    const subsObj = room.substrates || {};

    // Pass groups: coalesce N substrates into one coordinated painting pass.
    // Phases 2-3: combined-prime and combined-finish.
    // Both combined groups are toggle-driven (project flag + room override);
    // resolver reads those flags off room/project directly.
    const passGroups = resolvePassGroups(room, project);

    // Build the set of (substrate, spec_role) pairs that a pass group
    // covers. Only specs matching a pair are skipped — finish specs for a
    // grouped substrate keep firing when the group is a prime group, and
    // vice versa. Pass group pass_type ('prime'|'finish') maps to SPEC_ROLE
    // enum ('PRIME'|'FINISH').
    const groupedRolesBySubstrate = new Map(); // substrate → Set<SPEC_ROLE>
    // finish_group_assignment groups DO NOT suppress per-substrate specs —
    // their members keep firing so prep + apply tasks reach the estimate.
    // Only shared setup/interstage/cleanup tasks are deduped (via applies_when
    // gates on the per-substrate task definitions). See
    // docs/superpowers/specs/2026-04-22-finish-groups-v1a-design.md §10.
    // Parallel map: members of a finish_group_assignment group get pass_group_id
    // threaded into their per-substrate ctx so gates can detect grouped state.
    const memberToItemGroup = new Map(); // substrate → PassGroup (item_assignment only)
    for (const group of passGroups) {
      if (group.group_id === 'finish_group_assignment') {
        for (const sub of group.substrates) memberToItemGroup.set(sub, group);
        continue;
      }
      const role = group.pass_type === 'prime' ? 'PRIME'
                 : group.pass_type === 'finish' ? 'FINISH'
                 : null;
      if (!role) continue;
      for (const sub of group.substrates) {
        if (!groupedRolesBySubstrate.has(sub)) groupedRolesBySubstrate.set(sub, new Set());
        groupedRolesBySubstrate.get(sub).add(role);
      }
    }

    // Emit one merged input per group BEFORE the spec loop. The group's
    // merged ctx replaces per-substrate scenarios for the grouped substrates.
    for (const group of passGroups) {
      const groupCtx = buildGroupCtx(group, room, project, roomDerived);
      normalizePassGroupCtx(groupCtx);
      roomInputs.push({
        roomIndex: ri,
        roomLabel,
        specId: group.group_id,           // group_id acts as specId for downstream
        ctx: groupCtx,
        roomQty,
        roomItems,
        passGroup: group,                  // reference for downstream consumers
      });
    }

    for (const specId of activeSpecIds) {
      // Is this spec active for this room? Look up the spec's primary
      // substrate in SPEC_SUBSTRATE_MAP, then check whether that substrate
      // key is present in room.substrates and (for opening substrates)
      // whether painting is enabled. This matches run-estimate.js lines
      // 199-203.
      const primarySub = SPEC_SUBSTRATE_MAP[specId];
      if (!primarySub) continue;
      // Skip specs ONLY when a pass group covers (this substrate + this role).
      // A prime-phase pass group skips PRIME specs for walls/ceiling but
      // leaves their FINISH specs intact so they still fire per-substrate.
      const skipRoles = groupedRolesBySubstrate.get(primarySub);
      if (skipRoles && skipRoles.has(SPEC_ROLE[specId])) continue;
      // Arch element shares one spec across three child substrates
      // (beams / columns / mantels). Activate when ANY of them is present, not
      // only when the primary 'beams' key exists.
      const ARCH_FALLBACK_SUBS = ['beams', 'columns', 'mantels'];
      const archSpec = (specId === 'SF_ARCH_ELEMENT_NC' || specId === 'SF_ARCH_ELEMENT_NC_STAIN');
      let subConfig = subsObj[primarySub];
      if (!subConfig && archSpec) {
        for (const alt of ARCH_FALLBACK_SUBS) {
          if (subsObj[alt]) { subConfig = subsObj[alt]; break; }
        }
      }
      if (!subConfig) continue;

      // Per-child-element expansion for stair NC + closet shelf specs.
      // These specs emit multiple roomInputs — one per enabled child element
      // (stair component or closet) — with per-child substrate_state, method,
      // QT in each ctx. Bypass the room-level state compat check (each
      // ctx carries its own substrate_state).
      if (COMPONENT_EXPANDED_SPECS.has(specId)) {
        const perComponentCtxs =
          specId === 'SF_CLOSET_SHELF_NC'
            ? buildClosetShelfPaintCtxs(room, project)
            : expandStairwaySpecContexts(specId, room, project);
        for (const compCtx of perComponentCtxs) {
          roomInputs.push({
            roomIndex: ri,
            roomLabel,
            specId,
            ctx: normalizePassGroupCtx(compCtx),
            roomQty,
            roomItems,
          });
        }
        continue;
      }

      // Opening substrates (doors, windows, door_casing, window_casing) have
      // a painting toggle — skip specs whose substrate has painting=false.
      if (subConfig.painting === false) continue;

      // Substrate-state compatibility: skip specs whose valid_input_states don't
      // accept the room's resolved substrate_state (e.g. NC specs for painted
      // rooms, RP specs for bare rooms). Uses one-level chain activation so
      // FINISH specs still activate when a PRIME spec's output matches.
      if (!isSpecStateCompatible(specId, room)) continue;

      const paintableItem = SPEC_TO_PAINTABLE_ITEM[specId] || null;
      if (!paintableItem) {
        warnings.push(`No paintable_item mapping for spec ${specId} — scenario match will fail`);
      }

      const coatingType = resolveCoatingType(specId, room, project);
      const roomSpecStates = resolveSubstrateStateForSpec(specId, room);
      const resolvedInputState = (roomSpecStates && roomSpecStates.length > 0) ? roomSpecStates[0] : null;

      // ── System-driven activation & state transition (Pass A) ──
      // `system` expresses workflow intent (paint_full / paint_finish / stain_clear / etc.).
      // For each spec family, its SPEC_ROLE + the resolved system decides:
      //   (a) does this spec activate? (PRIME skipped under paint_finish, etc.)
      //   (b) what substrate_state does its ctx carry? FINISH specs under paint_full
      //       get SS_PRIMED because a PRIME pass precedes them in the workflow.
      const system = resolveSystem(specId, room, project);
      const specRole = SPEC_ROLE[specId] || 'COMBINED';
      const PHASE_BY_ROLE = { STAIN: 'stain', SEALER: 'sealer', CLEAR: 'clear' };
      const coatingPhase = PHASE_BY_ROLE[specRole] || null;
      const activation = resolveActivation(system, specRole);
      if (activation.active === false) {
        // Spec is suppressed by the current system — skip emitting an input for it.
        continue;
      }

      // ── Decomposed-family clear-only deferral gate ──
      // For decomposed families (DECOMPOSED_STAIN_FAMILIES, SEALER role, CLEAR role),
      // stain is required. If deriveStainScope returns null (no stain → clear-only,
      // sealer-only, or no flags), skip this spec entirely so no input is emitted.
      // This prevents the legacy clear_refresh path from firing against decomposed
      // substrates that have no authored clear-over-bare scenarios.
      // Bundled families (not decomposed) are NOT gated here — they keep using the
      // legacy coating_type/system path which handles clear-only via existing logic.
      const isDecomposedSpec =
        DECOMPOSED_STAIN_FAMILIES.has(specId) ||
        specRole === 'SEALER' ||
        specRole === 'CLEAR';
      if (isDecomposedSpec && deriveStainScope(subConfig) === null) {
        continue;
      }

      const transitionTarget = STATE_TRANSITION_TARGET[activation.stateTransition];
      const effectiveSubstrateState = transitionTarget != null ? transitionTarget : resolvedInputState;

      const ctx = {
        // Core spec context
        quality_tier: resolveQualityTier(specId, room, project),
        height_band: roomDerived.heightBand,
        complexity: room.complexity || project.default_complexity,
        application_method: resolveApplicationMethod(specId, room, project),
        surface_texture: resolveTextureForSpec(specId, room, project),
        substrate_state: effectiveSubstrateState,
        coating_type: coatingType,
        ...(coatingPhase ? { coating_phase: coatingPhase } : {}),

        // Room adjacency
        floor_type: room.floor_type || 'subfloor',
        floor_protection: room.floor_protection || '',

        // Room ceiling-type flags — drive Cathedral/Vaulted Ceiling suffix on
        // ceiling/wall/clerestory-window task lines and spec headers downstream.
        cathedral_ceiling: !!room.cathedral_ceiling,
        vaulted_ceiling:   !!room.vaulted_ceiling,

        // New architecture additions
        paintable_item: paintableItem,
        substrate_condition: room.substrate_condition || 'fair',
        // surface: derived from paintable_item for scenarios that match on surface
        //   (e.g. 'wall' vs 'ceiling' for drywall specs)
        surface: deriveSurfaceFromSpec(specId),
        // Pre-trim NC workflow indicator. Drives scenario selection for drywall
        // prime (and later finish) — combined mode fires scenarios that skip
        // wall-line cut-in and ceiling masking. Resolution: room override wins
        // over project default; null override inherits project default.
        prime_mode: (room.combined_prime_override === 'combined' || room.combined_prime_override === 'separate')
          ? room.combined_prime_override
          : (project.default_combined_prime ? 'combined' : 'separate'),
        // Workflow intent (visible in Dev tab; matcher consumption deferred to Pass B)
        system: system,
        spec_role: specRole,
      };

      // Fixture presence flags (matches run-estimate.js lines 237-239)
      FIXTURE_CATALOG.forEach(f => { ctx['has_' + f.id] = false; });
      Object.keys(room.fixtures || {}).forEach(fId => { ctx['has_' + fId] = true; });

      // Window substrate (matches line 231)
      if (specId === 'SF_WINDOW_INT_NC') ctx.window_substrate_material = 'wood';

      // Beam overrides (matches lines 241-257)
      if (specId === 'SF_ARCH_ELEMENT_NC' && room.vaulted_ceiling && room.beams_enabled) {
        const peakFt = parseFloat(room.peak_height_ft) || 0;
        if (peakFt > 0) ctx.height_band = deriveHeightBand(peakFt);
        if (room.beam_application_method) ctx.application_method = room.beam_application_method;
        if (room.beam_substrate_state) {
          const mapped = UI_STATE_TO_SPEC_STATE[room.beam_substrate_state];
          if (mapped) ctx.substrate_state = mapped;
        }
      }

      // Per-substrate height-band override for trim substrates whose work
      // height differs from the room band (crown at ceiling, picture_rail
      // at ceiling-1, panel_mold/shadow_box with optional explicit override).
      // Returns null when no override applies, leaving ctx.height_band as-is.
      const subBand = deriveSubstrateHeightBand(specId, room, subsObj);
      if (subBand) ctx.height_band = subBand;

      // Stain-specific context (matches lines 260-270). coating_type is
      // emitted for all specs above; stain specs add method/species/coat fields.
      // Coats: for DECOMPOSED families (SEALER/CLEAR roles + DECOMPOSED_STAIN_FAMILIES),
      // the scenario's coat_counts is the per-tier default — do NOT emit ctx coats
      // (per-item ctx override = Phase 3). Bundled families keep emitting ctx coats.
      if (STAIN_SPEC_FAMILIES.has(specId)) {
        ctx.application_method_stain = resolveStainMethod(specId, room, project);
        ctx.application_method_clear = resolveClearMethod(specId, room, project);
        ctx.wood_species_group = resolveWoodSpecies(specId, room, project);
        ctx.clear_sheen = resolveClearSheen(specId, room, project);
        const decomposed =
          SPEC_ROLE[specId] === 'SEALER' ||
          SPEC_ROLE[specId] === 'CLEAR' ||
          DECOMPOSED_STAIN_FAMILIES.has(specId);
        if (!decomposed) {
          const coats = resolveCoatCounts(specId, room, project);
          ctx.stain_coats = coats.stain_coats;
          ctx.sealer_coats = coats.sealer_coats;
          ctx.clear_coats = coats.clear_coats;
        }
      }

      // Exterior-only fields pulled from project/room when present.
      // The legacy engine doesn't explicitly track these on the room yet,
      // so we read from project config as a fallback. Exterior modules
      // use these via scenario.modifiers[].
      ctx.access_type = room.access_type || project.default_access_type || 'ground';
      ctx.substrate_type = room.substrate_type || null;
      ctx.coating_system = room.coating_system || null;
      ctx.foundation_type = room.foundation_type || null;
      ctx.siding_profile = room.siding_profile || null;
      ctx.texture_profile = room.texture_profile || null;
      ctx.soffit_face_type = room.soffit_face_type || 'closed_face';
      ctx.fence_style = room.fence_style || null;
      ctx.chalk_severity = room.chalk_severity || 'none';
      ctx.metal_profile_complexity = room.metal_profile_complexity || 'simple';
      ctx.door_size = room.door_size || 'single';
      // Door-type: pulled from the first door item so door slab scenarios can
      // match on panel_4 / panel_6 / flush / french / etc. Only meaningful for
      // door specs; harmless elsewhere.
      ctx.door_type = subsObj.doors?.items?.[0]?.door_type || 'panel_4';
      ctx.panel_complexity = room.panel_complexity || 'flush';
      ctx.surface_profile = room.surface_profile || 'flat';
      ctx.condition_scale = room.condition_scale || 'GOOD';

      // V1a: if this substrate is a finish_group_assignment member, thread
      // pass-group context so gate-based tasks (setup/interstage/cleanup)
      // can detect grouped state via applies_when. Per-substrate prep + apply
      // still fire; only dedup-able phase tasks gate off.
      const memberGroup = memberToItemGroup.get(primarySub);
      if (memberGroup) {
        ctx.pass_group_id         = memberGroup.group_id;
        ctx.pass_group_substrates = memberGroup.substrates.slice();
        ctx.pass_type             = memberGroup.pass_type;
        ctx.finish_group          = memberGroup.metadata.finish_group;
      }

      // Window-related specs fan out per height band when the room contains
      // windows at different mounting heights. roomDerived.windowBandLf carries
      // per-band LF for casing/jamb/stool/apron. For each band with non-zero
      // LF, emit one input with ctx.height_band = band and roomQty cloned with
      // band-specific LF for the spec's main + joint keys. Falls through to the
      // default single-push when no band entries exist (no windows in room).
      const winBandKeys = WINDOW_BAND_SPEC_KEYS[specId];
      const bandLfMap = winBandKeys ? roomDerived.windowBandLf : null;
      if (winBandKeys && bandLfMap && Object.keys(bandLfMap).length > 0) {
        for (const [band, lfBySub] of Object.entries(bandLfMap)) {
          const lf = lfBySub[winBandKeys.sub] || 0;
          if (lf <= 0) continue;
          const bandQty = new Map(roomQty);
          bandQty.set(winBandKeys.mainKey, { value: Math.round(lf), uom: 'LF' });
          if (winBandKeys.jointKey) {
            bandQty.set(winBandKeys.jointKey, { value: Math.round(lf), uom: 'LF' });
          }
          roomInputs.push({
            roomIndex: ri,
            roomLabel,
            specId,
            ctx: normalizePassGroupCtx({ ...ctx, height_band: band }),
            roomQty: bandQty,
            roomItems,
          });
        }
        continue; // skip default single-push below
      }

      roomInputs.push({
        roomIndex: ri,
        roomLabel,
        specId,
        ctx: normalizePassGroupCtx(ctx),
        roomQty,
        roomItems,
      });
    }

    // Room-level protection — emit one SF_ROOM_PROTECTION ctx per room that
    // has any active paintable item. Modules gate by mask_level applies_when.
    const roomHasActiveSpec = roomInputs.some(ri2 => ri2.roomIndex === ri);
    for (const protectionCtx of buildRoomProtectionCtxs(room, project, roomHasActiveSpec)) {
      roomInputs.push({
        roomIndex: ri,
        roomLabel,
        specId: protectionCtx.__specId,
        ctx: normalizePassGroupCtx(protectionCtx),
        roomQty,
        roomItems,
      });
    }

    // Protect-mode expansion: emit protect ctxs for cabinets/closets in protect mode.
    // Each ctx becomes its own roomInput so the scenario matcher handles them like any other.
    for (const protectCtx of expandProtectContexts(room, project)) {
      roomInputs.push({
        roomIndex: ri,
        roomLabel,
        specId: protectCtx.__specId,
        ctx: normalizePassGroupCtx(protectCtx),
        roomQty,
        roomItems,
      });
    }
  }

  // ── Exterior: append elevation + standalone scenario inputs ──
  const extElevationInputs = buildElevationScenarioInputs(state);
  const extStandaloneInputs = buildStandaloneScenarioInputs(state);
  for (const inp of extElevationInputs) roomInputs.push(inp);
  for (const inp of extStandaloneInputs) roomInputs.push(inp);

  return { roomInputs, lookups, warnings };
}

/**
 * Derive the 'surface' context key from a spec family id. Scenarios for
 * drywall wall vs ceiling both have paintable_item: "drywall" but differ on
 * surface: "wall" vs "ceiling". Returns null for specs that don't need this
 * disambiguation.
 */
function deriveSurfaceFromSpec(specId) {
  if (!specId) return null;
  // Check CEILING first — otherwise 'DRYWALL_CEILING' matches WALL via substring
  // and every drywall ceiling spec gets silently tagged as surface=wall.
  if (specId.includes('CEILING')) return 'ceiling';
  if (specId.includes('WALL')) return 'wall';
  return null;
}

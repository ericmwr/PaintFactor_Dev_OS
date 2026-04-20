// Context adapter: PaintScope UI state → scenario engine inputs.
//
// Extracts the per-(room, spec) context derivation from run-estimate.js
// into a standalone module so the scenario engine can consume the same
// inputs the legacy engine does. This is the bridge that lets us run
// both engines on the same project data side-by-side.
//
// Usage:
//   const adapter = buildScenarioInputs(state, db);
//   // adapter.roomInputs: Array<{ roomIndex, roomLabel, specId, ctx, roomQty, roomItems }>
//   // adapter.lookups:    the underlying buildRoomQuantityLookups output (useful for debugging)
//
// Each roomInput can be passed directly to runScenarioEstimate:
//   runScenarioEstimate({ scenarioBundle, ctx, roomQty, roomIndex, roomLabel })
//
// The adapter does NOT call the scenario engine — it only builds inputs.
// The test harness (Phase 5) decides how to run and compare both engines.

import { buildRoomQuantityLookups } from './quantity-lookups.js';
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
} from './spec-resolution.js';
import { resolveSubstrateStateForSpec, isSpecStateCompatible } from './spec-compatibility.js';
import { deriveRoom, deriveHeightBand } from './derive-room.js';
import { FIXTURE_CATALOG } from '../data/fixture-catalog.js';
import { STAIN_SPEC_FAMILIES, UI_STATE_TO_SPEC_STATE, SPEC_SUBSTRATE_MAP, SPEC_ROLE } from '../data/spec-maps.js';
import { resolveActivation, STATE_TRANSITION_TARGET } from '../data/system-catalog.js';
import { resolveSystem } from './spec-resolution.js';

// Spec families that map cleanly to a paintable_item in the scenario matcher.
// This is the single-most-important mapping between the spec-keyed legacy
// engine and the scenario-keyed new engine. Scenarios match on paintable_item
// (e.g. "drywall", "ext_eng_siding", "int_door") rather than spec family id.
//
// Missing entries default to null — the scenario matcher will fail to match
// and the caller will see a warning, which is the correct behavior during
// the transition period (exposes gaps rather than silently producing zero).
const SPEC_TO_PAINTABLE_ITEM = {
  // Interior paint NC
  SF_DRYWALL_WALL_NC_FINISH:        'drywall',
  SF_DRYWALL_WALL_NC_PRIME:         'drywall',
  SF_DRYWALL_CEILING_NC_FINISH:     'drywall',
  SF_DRYWALL_CEILING_NC_PRIME:      'drywall',
  SF_TRIM_NC_PAINT:                 'trim',
  SF_TRIM_NC_PRIME:                 'trim',
  SF_DOOR_SLAB_INT_NC:              'door_slab',
  SF_DOOR_FRAME_NC_FINISH:          'door_frame',
  SF_WINDOW_INT_NC:                 'window',
  SF_WAINSCOT_PANEL_NC:             'wainscot',
  SF_WOOD_WALL_NC:                  'wood_wall',
  SF_WOOD_CEILING_NC:               'wood_ceiling',
  SF_ARCH_ELEMENT_NC:               'arch_element',
  SF_BUILTIN_NC:                    'builtin',
  SF_CABINET_NC_PAINT:              'cabinet',
  SF_CLOSET_SHELF_NC:               'closet',

  // Interior stain NC (matches SCN_INT_*_STAIN_CLEAR scenarios which use int_ prefix)
  SF_TRIM_NC_STAIN:                 'trim',
  SF_DOOR_SLAB_INT_NC_STAIN:        'int_door_slab',
  SF_DOOR_FRAME_NC_STAIN:           'int_door_frame',
  SF_WINDOW_INT_NC_STAIN:           'int_window',
  SF_WAINSCOT_PANEL_NC_STAIN:       'int_wainscot',
  SF_WOOD_WALL_NC_STAIN:            'int_wood_wall',
  SF_WOOD_CEILING_NC_STAIN:         'int_wood_ceiling',
  SF_ARCH_ELEMENT_NC_STAIN:         'int_arch_element',

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
  SF_WOOD_SIDING_EXT_NC_PAINT:      'ext_siding',
  SF_SIDING_WOOD_EXT_RP:            'ext_siding',
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

// Specs that use per-substrate-child expansion: the adapter emits one ctx per
// enabled child element (stair components, closets) rather than a single
// room-level ctx. Each ctx carries paintable_item = <child-scoped> (e.g.
// 'baluster', 'tread', 'closet') instead of a spec-level paintable_item.
export const COMPONENT_EXPANDED_SPECS = new Set([
  'SF_STAIR_RISER_NC',
  'SF_STAIR_RAILING_NC',
  'SF_STAIR_RISER_NC_STAIN',
  'SF_STAIR_RAILING_NC_STAIN',
  'SF_STAIR_TREAD_NC_STAIN',
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
  'SF_STAIR_RISER_NC_STAIN': [
    ['risers',     'riser'],
  ],
  'SF_STAIR_RAILING_NC_STAIN': [
    ['balusters',   'baluster'],
    ['newel_posts', 'newel'],
    ['open_rail',   'open_rail'],
    ['wall_rail',   'wall_rail'],
  ],
  'SF_STAIR_TREAD_NC_STAIN': [
    ['treads',     'tread'],
  ],
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

/**
 * For stair specs in COMPONENT_EXPANDED_SPECS, emit one ctx per enabled component.
 * Each ctx carries paintable_item = <component> plus that component's own
 * substrate_state, application_method, quality_tier, coating_type.
 *
 * Returns: array of ctx objects. Empty array if no enabled components or no stairway.
 */
export function expandStairwaySpecContexts(specId, room, project) {
  const stair = room?.substrates?.stairway;
  if (!stair) return [];
  const componentPairs = STAIR_SPEC_COMPONENTS[specId];
  if (!componentPairs) return [];

  const isStainSpec = specId.includes('STAIN');
  // Set of acceptable coating_types for this spec. A component whose
  // coating_type doesn't match is silently skipped — this prevents stain
  // specs from emitting duplicate ctxs for paint components (and vice versa),
  // which was causing double-counting in mixed-coating stairways.
  const expectedCoatingTypes = isStainSpec
    ? new Set(['stain_clear', 'stain_only', 'clear_only'])
    : new Set(['paint']);
  const contexts = [];

  for (const [subKey, paintableItem] of componentPairs) {
    const comp = stair.components?.[subKey];
    if (!comp || comp.enabled === false) continue;
    // Default coating_type if unset matches the spec's family.
    const compCoatingType = comp.coating_type || (isStainSpec ? 'stain_clear' : 'paint');
    if (!expectedCoatingTypes.has(compCoatingType)) continue;

    const ctx = {
      paintable_item: paintableItem,
      substrate_state: stairUIStateToSpecState(comp.substrate_state),
      application_method: comp.application_method || (isStainSpec ? 'wipe' : 'brush'),
      quality_tier: comp.quality_tier || project?.default_quality_tier || 'QT3',
      coating_type: compCoatingType,
      grain_fill: comp.grain_fill || false,
      height_band: 'STD',
      complexity: 'STD',
      __specId: specId,
      __component: paintableItem,
    };
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
      // Map Protection tab's 'protection' field to scenario's protection_level.
      // Protection tab uses: edge_only / partial_cover / full_cover
      // Scenarios use: light / standard / heavy
      const levelMap = { edge_only: 'light', partial_cover: 'standard', full_cover: 'heavy' };
      const level = levelMap[fix.protection] || 'standard';
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
  const level = cab.protection_level || 'standard';
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
 * (wire_shelving → item_mask, wood_shelving → partial_cover, builtin_system → full_cover).
 * Mirrors resolveProtectionLevel() in data/closet-shelving-protection.js.
 *
 * Matches SCN_CLOSET_SHELF_PROTECT_{ITEM_MASK,PARTIAL_COVER,FULL_COVER}.
 */
export function buildClosetShelfProtectCtxs(room, project) {
  const closets = room?.closets || [];
  if (closets.length === 0) return [];
  const contexts = [];
  for (const closet of closets) {
    if (closet.shelving_type === 'none') continue;
    const lf = parseFloat(closet.shelving_lf) || 0;
    if (lf <= 0) continue;
    if (closet.paint_shelving !== false) continue;
    // Level: user override, else shelving-type default.
    let level = closet.protection_level;
    if (!level) {
      level = closet.shelving_type === 'wire_shelving'  ? 'item_mask'
            : closet.shelving_type === 'wood_shelving'  ? 'partial_cover'
            : closet.shelving_type === 'builtin_system' ? 'full_cover'
            : 'partial_cover';
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
 * Build the per-spec per-room context + quantity lookup for every active
 * (room, spec) pair in the project. Mirrors the `for (spec of db.spec_families)
 * { for (room of state.rooms) { ... } }` loop in run-estimate.js lines 180-280
 * but returns a flat array the scenario engine can iterate.
 *
 * Inputs:
 *   state — full PaintScope project state { project, rooms }
 *   db    — spec data bundle (used to iterate active specs, though the
 *           scenario engine doesn't read db directly)
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
export function buildScenarioInputs(state, db) {
  const warnings = [];
  const roomInputs = [];
  const project = state.project || {};
  const rooms = state.rooms || [];

  const lookups = buildRoomQuantityLookups(state);

  // Active specs — iterate db.spec_families when available (matches legacy
  // engine), otherwise fall back to every spec known in SPEC_SUBSTRATE_MAP.
  const activeSpecIds = new Set();
  if (db && Array.isArray(db.spec_families)) {
    for (const spec of db.spec_families) activeSpecIds.add(spec.id);
  }
  // Always union in specs from SPEC_SUBSTRATE_MAP so scenario-only families
  // (e.g. Interior RP specs that have no legacy SQLite row) still iterate.
  for (const sid of Object.keys(SPEC_SUBSTRATE_MAP)) activeSpecIds.add(sid);

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
    for (const specId of activeSpecIds) {
      // Is this spec active for this room? Look up the spec's primary
      // substrate in SPEC_SUBSTRATE_MAP, then check whether that substrate
      // key is present in room.substrates and (for opening substrates)
      // whether painting is enabled. This matches run-estimate.js lines
      // 199-203.
      const primarySub = SPEC_SUBSTRATE_MAP[specId];
      if (!primarySub) continue;
      const subConfig = subsObj[primarySub];
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
            ctx: compCtx,
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
      const activation = resolveActivation(system, specRole);
      if (activation.active === false) {
        // Spec is suppressed by the current system — skip emitting an input for it.
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

        // Room adjacency
        floor_type: room.floor_type || 'subfloor',
        floor_protection: room.floor_protection || '',

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

      // Stain-specific context (matches lines 260-270). coating_type is
      // emitted for all specs above; stain specs add method/species/coat fields.
      if (STAIN_SPEC_FAMILIES.has(specId)) {
        ctx.application_method_stain = resolveStainMethod(specId, room, project);
        ctx.application_method_clear = resolveClearMethod(specId, room, project);
        ctx.wood_species_group = resolveWoodSpecies(specId, room, project);
        ctx.clear_sheen = resolveClearSheen(specId, room, project);
        const coats = resolveCoatCounts(specId, room, project);
        ctx.stain_coats = coats.stain_coats;
        ctx.sealer_coats = coats.sealer_coats;
        ctx.clear_coats = coats.clear_coats;
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

      roomInputs.push({
        roomIndex: ri,
        roomLabel,
        specId,
        ctx,
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
        ctx: protectCtx,
        roomQty,
        roomItems,
      });
    }
  }

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

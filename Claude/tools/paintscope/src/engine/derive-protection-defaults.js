// Derive auto-suggested mask levels for floor/wall/ceiling from room state.
// Implements the matrix in Claude/devos/mask_level_matrix.docx (filled
// 2026-04-27). Pure function — no engine state, no side effects.
// Updated 2026-04-29: methodOf cascade matches resolveApplicationMethod.
//
// Mask level enum (per-surface):
//   none, edge, spot, partial, full, encapsulate,
//   edge_partial, edge_full, edge_encapsulate
//
// Ceiling never returns 'full' or 'edge_full' (gravity prevents draping).

import { SUBSTRATE_MAP, SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';

// Substrates classified as "fine finish" — i.e., what an estimator calls
// the "trim package" once scope is decided. Not an engine grouping; just
// a rule-time category for protection logic.
const FINE_FINISH_SUBSTRATES = new Set([
  'baseboard', 'crown', 'door_casing', 'window_casing',
  'chair_rail', 'shoe_mold', 'picture_rail',
  'window_stool', 'window_apron', 'shadow_box', 'panel_mold',
  'door_frames', 'window_jamb',
  'wainscoting', 'wood_feature_wall', 'wood_ceiling',
  'beams', 'columns', 'mantels', 'builtins',
]);

const CASING_OR_FRAME = new Set(['door_casing', 'door_frame', 'door_frames']);

/**
 * Categorize the active substrates in a room into protection-rule categories.
 * Returns:
 *   {
 *     ceiling: bool,         // ceiling being painted
 *     walls:   bool,         // walls being painted
 *     openings: bool,        // doors and/or windows being painted (panels)
 *     fineFinish: string[],  // active fine-finish substrate IDs
 *     fineFinishKind: 'none' | 'baseboard_only' | 'casing_or_frame_only'
 *                   | 'crown_in' | 'multi' | 'single_other',
 *     methods: { ceiling, walls, fineFinish }  // 'brush' | 'spray' | 'mixed' | null
 *   }
 */
export function categorizeScope(room, project = {}) {
  const subs = room.substrates || {};
  const active = (id) => {
    const s = subs[id];
    if (!s) return false;
    // Items-based substrates (doors, windows): active if painting=true and any items
    if (s.painting === false) return false;
    return true;
  };

  const ceiling = active('ceiling');
  const walls = active('walls');
  const doorsActive = active('doors');
  const windowsActive = active('windows');
  const openings = doorsActive || windowsActive;

  const fineFinish = [];
  for (const id of Object.keys(subs)) {
    if (!FINE_FINISH_SUBSTRATES.has(id)) continue;
    if (!active(id)) continue;
    fineFinish.push(id);
  }

  // Classify the fine-finish set into a rule sub-category
  let fineFinishKind = 'none';
  if (fineFinish.length === 0) fineFinishKind = 'none';
  else if (fineFinish.length === 1) {
    const only = fineFinish[0];
    if (only === 'baseboard') fineFinishKind = 'baseboard_only';
    else if (CASING_OR_FRAME.has(only)) fineFinishKind = 'casing_or_frame_only';
    else fineFinishKind = 'single_other';
  } else if (fineFinish.length === 2 && fineFinish.every(s => CASING_OR_FRAME.has(s))) {
    fineFinishKind = 'casing_or_frame_only';
  } else {
    fineFinishKind = fineFinish.includes('crown') ? 'multi_crown' : 'multi';
  }

  // Resolve methods per category. 'spray' if any active sub uses spray;
  // 'brush' if all use brush/roll; 'mixed' if a mix.
  // Cascade matches resolveApplicationMethod in spec-resolution.js:
  //   1. substrate.application_method (explicit per-substrate override)
  //   2. SUBSTRATE_APPLICATION_METHODS[id].default (substrate type default)
  //   3. room.application_method (room-level override)
  const methodOf = (subId) => {
    const s = subs[subId] || {};
    const coatingType = s.coating_type || 'paint';
    const isStainCoating = coatingType !== 'paint';
    // Stain coating types: prefer the stain method (clear method also valid).
    // Stain method is irrelevant for paint substrates — even if a stale
    // application_method_stain is saved, ignore it.
    if (isStainCoating) {
      if (s.application_method_stain) return s.application_method_stain;
      if (s.application_method_clear) return s.application_method_clear;
    }
    // Paint cascade — matches resolveApplicationMethod in spec-resolution.js
    if (s.application_method) return s.application_method;
    const sam = SUBSTRATE_APPLICATION_METHODS[subId];
    if (sam?.default) return sam.default;
    if (room.application_method) return room.application_method;
    return null;
  };
  const isSpray = (m) => m === 'spray' || m === 'spray_backbrush' || m === 'spray_backroll';
  const methodFor = (subList) => {
    const meths = subList.map(methodOf).filter(Boolean);
    if (meths.length === 0) return null;
    const sprayCount = meths.filter(isSpray).length;
    if (sprayCount === meths.length) return 'spray';
    if (sprayCount === 0) return 'brush';
    return 'mixed';
  };
  const methods = {
    ceiling: ceiling ? methodOf('ceiling') : null,
    walls: walls ? methodOf('walls') : null,
    fineFinish: methodFor(fineFinish),
    openings: openings ? (methodOf('doors') || methodOf('windows')) : null,
  };

  return { ceiling, walls, openings, fineFinish, fineFinishKind, methods };
}

// =============================================================================
// FLOOR MASK LEVEL
// =============================================================================
// Maps painting scope × method × floor type to a default mask level.
// "Optional Edge+" cells return the BASE level (e.g. 'partial'); estimator
// upgrades to 'edge_partial' via UI override if desired.

function isSprayMethod(m) {
  return m === 'spray' || m === 'spray_backbrush' || m === 'spray_backroll' || m === 'mixed';
}

export function deriveFloorMaskLevel(cats, floorType) {
  const { ceiling, walls, openings, fineFinishKind, methods } = cats;
  const ft = (floorType || 'subfloor').toLowerCase();

  // Subfloor → never any protection regardless of scope
  if (ft === 'subfloor') return 'none';

  const ceilingSpray = ceiling && isSprayMethod(methods.ceiling);
  const wallsSpray   = walls && isSprayMethod(methods.walls);
  const trimSpray    = fineFinishKind !== 'none' && isSprayMethod(methods.fineFinish);
  const openingsSpray = openings && isSprayMethod(methods.openings);
  const anySpray = ceilingSpray || wallsSpray || trimSpray || openingsSpray;

  // Full scope = ceiling + walls + trim (and optionally openings)
  const fullScope = ceiling && walls && fineFinishKind !== 'none';
  const fullPlus = fullScope && openings;

  // 1. FULL (ceiling+walls+trim+openings) — always Edge+ Encapsulate
  if (fullPlus) return 'edge_encapsulate';
  if (fullScope) {
    if (anySpray) return 'edge_encapsulate';
    return 'encapsulate'; // all-brush: optional Edge+ default = encapsulate
  }

  // 2. Ceiling + Trim
  if (ceiling && fineFinishKind !== 'none' && !walls) {
    if (anySpray) return 'edge_encapsulate';
    return 'full'; // optional Edge+ default = full
  }

  // 3. Walls + Trim (no ceiling) — matrix rows 11–14
  // Trim spray = encapsulate (trim overspray reaches deep into floor area).
  // Walls spray + trim brush = perimeter only (wall overspray stays at edge).
  // All brush = perimeter.
  if (!ceiling && walls && fineFinishKind !== 'none') {
    if (trimSpray) return 'edge_encapsulate'; // covers trim+walls both spray and trim spray + walls brush
    return 'partial';                         // walls spray + trim brush, OR all-brush
  }

  // 4. Ceiling + Walls (no trim)
  if (ceiling && walls && fineFinishKind === 'none') {
    if (ceilingSpray && wallsSpray) return 'encapsulate';
    return 'full';
  }

  // 5. Ceiling only
  if (ceiling && !walls && fineFinishKind === 'none') return 'full';

  // 6. Walls only
  if (!ceiling && walls && fineFinishKind === 'none') {
    return wallsSpray ? 'partial' : 'partial'; // base level — Edge+ optional
  }

  // 7. Trim only — granularity by fineFinishKind
  if (!ceiling && !walls && fineFinishKind !== 'none') {
    // Baseboard only
    if (fineFinishKind === 'baseboard_only') {
      return trimSpray ? 'edge_partial' : 'partial';
    }
    // Door casing or door frame only — spot mask at base of opening when sprayed
    if (fineFinishKind === 'casing_or_frame_only') {
      return trimSpray ? 'spot' : 'spot'; // brush: small drop at location; spray: edge+spot bundle (uses spot task w/ 5min/EA)
    }
    // Generic trim package (multi-substrate or other single)
    return trimSpray ? 'edge_encapsulate' : 'partial';
  }

  // 8. Doors/windows only (no other scope)
  if (openings && !ceiling && !walls && fineFinishKind === 'none') {
    return openingsSpray ? 'partial' : 'edge';
  }

  return 'none';
}

// =============================================================================
// WALL MASK LEVEL
// =============================================================================
// Walls IN scope → 'none' (no overspray-on-self). Otherwise per matrix.

export function deriveWallMaskLevel(cats) {
  const { ceiling, walls, openings, fineFinishKind, methods } = cats;
  if (walls) return 'none';

  const ceilingSpray = ceiling && isSprayMethod(methods.ceiling);
  const trimSpray    = fineFinishKind !== 'none' && isSprayMethod(methods.fineFinish);
  const openingsSpray = openings && isSprayMethod(methods.openings);

  // Ceiling + Trim
  if (ceiling && fineFinishKind !== 'none') {
    if (ceilingSpray || trimSpray) return 'edge_full';
    return 'full'; // both brush
  }

  // Ceiling only
  if (ceiling && fineFinishKind === 'none' && !openings) {
    return ceilingSpray ? 'edge_full' : 'full';
  }

  // Trim only
  if (!ceiling && fineFinishKind !== 'none') {
    return trimSpray ? 'edge_partial' : 'none'; // brush trim: optional edge default = none
  }

  // Doors/windows only
  if (!ceiling && fineFinishKind === 'none' && openings) {
    return openingsSpray ? 'edge_partial' : 'none';
  }

  return 'none';
}

// =============================================================================
// CEILING MASK LEVEL
// =============================================================================
// Ceiling IN scope → 'none'. No 'full' option (gravity).

export function deriveCeilingMaskLevel(cats) {
  const { ceiling, walls, openings, fineFinish, fineFinishKind, methods } = cats;
  if (ceiling) return 'none';

  const wallsSpray   = walls && isSprayMethod(methods.walls);
  const trimSpray    = fineFinishKind !== 'none' && isSprayMethod(methods.fineFinish);
  const openingsSpray = openings && isSprayMethod(methods.openings);
  const hasCrown = fineFinish.includes('crown');

  // Walls + Trim
  if (walls && fineFinishKind !== 'none') {
    if (trimSpray && !wallsSpray) return 'spot'; // trim spray, walls brush → spot above openings
    if (wallsSpray || trimSpray) return 'edge_partial';
    return 'none'; // all brush → cut in
  }

  // Walls only
  if (walls && fineFinishKind === 'none' && !openings) {
    return wallsSpray ? 'edge_partial' : 'none';
  }

  // Trim only
  if (!walls && fineFinishKind !== 'none') {
    if (hasCrown) return trimSpray ? 'edge_partial' : 'none'; // crown-near-ceiling: edge important
    return trimSpray ? 'spot' : 'none'; // no crown, spray on lower trim: spot above openings
  }

  // Doors/windows only
  if (!walls && fineFinishKind === 'none' && openings) {
    return openingsSpray ? 'spot' : 'none';
  }

  return 'none';
}

/**
 * Top-level entry: returns auto-suggested mask levels per surface.
 * Caller (buildRoomProtectionCtxs) merges these into ctx along with any
 * user overrides from room.protection state.
 */
export function deriveProtectionDefaults(room, project) {
  const cats = categorizeScope(room, project);
  return {
    floor_mask_level:   deriveFloorMaskLevel(cats, room.floor_type),
    wall_mask_level:    deriveWallMaskLevel(cats),
    ceiling_mask_level: deriveCeilingMaskLevel(cats),
    _categories: cats, // for debugging / Protection-tab reasoning display
  };
}

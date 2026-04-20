import { OPENING_TYPES } from '../data/opening-types.js';
import { SUBSTRATE_MAP } from '../data/substrate-catalog.js';
import canonicalBundle from '../data/scenario-bundle.gen.js';

// Fallback thresholds (ft) if FAC_HEIGHT.band_thresholds_ft is missing from
// the bundle. Mirrors the original hardcoded breakpoints.
const DEFAULT_HEIGHT_THRESHOLDS = { STEP: 10, EXT: 13, SCAFFOLD: 18, LIFT: 25 };

// Overlay state. When the scenario engine loads drafts via overlay-loader, it
// calls configureHeightThresholds() with the merged bundle so deriveHeightBand
// sees the user's authored thresholds (not just canonical).
let overlayBundle = null;
let overlayDefaultBand = null;

/**
 * Called by useEstimateScenario after loadOverlayBundle resolves. Accepts
 * either the full merged bundle, a FAC_HEIGHT modifier definition, or a raw
 * thresholds object. Passing null/undefined clears the overlay (fallback to
 * canonical static import).
 */
export function configureHeightThresholds(source) {
  if (!source) { overlayBundle = null; overlayDefaultBand = null; return; }
  const fac = source.modifiers ? source.modifiers.FAC_HEIGHT
    : source.band_thresholds_ft ? source
    : null;
  if (fac) {
    overlayBundle = fac.band_thresholds_ft || null;
    overlayDefaultBand = fac.default || null;
  } else if (typeof source === 'object') {
    overlayBundle = source;
    overlayDefaultBand = null;
  }
}

/**
 * Pick a height band for a ceiling height (ft). Thresholds are read from
 * FAC_HEIGHT in the scenario bundle so they're author-editable in the
 * Modifier editor — change "step ladder starts at 9 ft" without touching code.
 *
 * Semantics: band_thresholds_ft[band] = minimum ft that band applies at.
 * Highest matching threshold wins. If no threshold matches, returns the
 * modifier's default band (normally 'STD').
 *
 * Arbitrary band names are supported — add a new key to factors AND
 * band_thresholds_ft and deriveHeightBand will return it automatically.
 */
export function deriveHeightBand(heightFt) {
  const canonFac = (canonicalBundle && canonicalBundle.modifiers) ? canonicalBundle.modifiers.FAC_HEIGHT : null;
  // Overlay thresholds (from IDB drafts via overlay-loader) take precedence over canonical.
  const thresholds = overlayBundle || (canonFac && canonFac.band_thresholds_ft) || DEFAULT_HEIGHT_THRESHOLDS;
  const defaultBand = overlayDefaultBand || (canonFac && canonFac.default) || 'STD';

  // Sort (band, threshold) pairs descending by threshold so the tallest match wins
  const sorted = Object.entries(thresholds)
    .filter(function (entry) { return typeof entry[1] === 'number' && entry[1] > 0; })
    .sort(function (a, b) { return b[1] - a[1]; });

  for (var i = 0; i < sorted.length; i++) {
    const band = sorted[i][0];
    const minFt = sorted[i][1];
    if (heightFt >= minFt) return band;
  }
  return defaultBand;
}

export function deriveRoom(room) {
  const L = parseFloat(room.length_ft) || 0;
  const W = parseFloat(room.width_ft) || 0;
  const H = parseFloat(room.height_ft) || 0;
  const perimeter = 2 * (L + W);
  const subs = room.substrates || {};

  // Openings — structural wall holes (drive deductions, casing, frames)
  const openings = room.openings || [];
  const totalOpenings = openings.reduce((s, o) => s + (parseInt(o.count) || 0), 0);
  const openingCasingLF = openings.reduce((s, o) => {
    const cnt = parseInt(o.count) || 0;
    const type = OPENING_TYPES[o.opening_type] || OPENING_TYPES.single;
    return s + cnt * type.casing_lf;
  }, 0);
  const doorOpeningDeduction = openings.reduce((s, o) => {
    const cnt = parseInt(o.count) || 0;
    const type = OPENING_TYPES[o.opening_type] || OPENING_TYPES.single;
    return s + cnt * type.deduction_sf;
  }, 0);

  // Door/window counts from substrates (painting scope only)
  const doorItems = subs.doors?.items || [];
  const windowItems = subs.windows?.items || [];
  const totalDoors = doorItems.reduce((s,d) => s + (parseInt(d.count)||0), 0);
  const totalWindows = windowItems.reduce((s,w) => s + (parseInt(w.count)||0), 0);
  const totalDoorSides = doorItems.reduce((s,d) => s + ((parseInt(d.count)||0) * (parseInt(d.sides_per_door)||2)), 0);

  // Opening deduction from openings + windows (always present for wall area calculation)
  const openingDeduction = doorOpeningDeduction + (totalWindows * 15);
  const wallGross = perimeter * H;
  const wallNet = Math.max(0, wallGross - openingDeduction);
  const ceilingSF = L * W;

  // Vault/gable additions — auto-calculated from peak height + ridge direction
  let vaultedExtra = 0;
  let gableExtra = 0;
  let pitch = 0;
  if (room.vaulted_ceiling) {
    const P = parseFloat(room.peak_height_ft) || 0;
    const rise = Math.max(0, P - H);
    if (rise > 0) {
      const ridgeAlongLength = (room.ridge_direction || 'length') === 'length';
      const slopeRun = ridgeAlongLength ? W / 2 : L / 2;
      const slopeHyp = Math.sqrt(slopeRun * slopeRun + rise * rise);
      const slopedCeilingSF = ridgeAlongLength ? 2 * slopeHyp * L : 2 * slopeHyp * W;
      vaultedExtra = Math.round(slopedCeilingSF - ceilingSF);
      pitch = slopeRun > 0 ? Math.round(rise / slopeRun * 12 * 10) / 10 : 0;
      const gableCount = parseInt(room.gable_walls) || 0;
      const gableBase = ridgeAlongLength ? W : L;
      gableExtra = Math.round(gableCount * (gableBase * rise) / 2);
    }
  }

  // Ceiling beams — auto-calculated from vault geometry + beam config
  let beamTotalLF = 0, beamPeakLF = 0, beamCrossLFEach = 0, beamRidgeLFEach = 0;
  if (room.vaulted_ceiling && room.beams_enabled) {
    const bwIn = parseFloat(room.beam_width_in) || 6;
    const bdIn = parseFloat(room.beam_depth_in) || 6;
    const widthMult = Math.ceil(bwIn / 12);
    const depthMult = Math.ceil(bdIn / 12);
    const fullFaces = widthMult + 2 * depthMult;
    const halfFaces = widthMult + depthMult;

    const ridgeAlongLength = (room.ridge_direction || 'length') === 'length';
    const P = parseFloat(room.peak_height_ft) || 0;
    const rise = Math.max(0, P - H);
    const slopeRun = ridgeAlongLength ? W / 2 : L / 2;
    const slopeHyp = (rise > 0 && slopeRun > 0)
      ? Math.sqrt(slopeRun * slopeRun + rise * rise) : 0;

    // Peak beam — runs along the apex (horizontal)
    if (room.peak_beam) {
      beamPeakLF = ridgeAlongLength ? L : W;
      beamTotalLF += beamPeakLF * fullFaces;
    }

    // Cross beams — perpendicular to ridge, follow ceiling slope (2 slope runs)
    const crossCount = parseInt(room.cross_beam_count) || 0;
    if (crossCount > 0) {
      beamCrossLFEach = slopeHyp > 0
        ? Math.round(2 * slopeHyp * 10) / 10
        : (ridgeAlongLength ? W : L);
      beamTotalLF += crossCount * beamCrossLFEach * fullFaces;
    }

    // Ridge beams (half-beams) — along gable slope (1 slope run)
    const ridgeCount = parseInt(room.ridge_beam_count) || 0;
    if (ridgeCount > 0) {
      beamRidgeLFEach = slopeHyp > 0 ? slopeHyp : 0;
      beamTotalLF += ridgeCount * beamRidgeLFEach * halfFaces;
    }

    beamTotalLF = Math.round(beamTotalLF);
  }

  // Feature wall deductions (from protection fixtures — supports multiple items)
  const fwItems = room.fixtures?.feature_wall?.items || [];
  // Backwards compat: old format had count/length_ft/height_ft at top level
  const fwLegacy = room.fixtures?.feature_wall;
  const fwItemsResolved = fwItems.length > 0 ? fwItems
    : (fwLegacy && fwLegacy.length_ft ? [{ length_ft: fwLegacy.length_ft, height_ft: fwLegacy.height_ft, count: fwLegacy.count, deduct_baseboard: fwLegacy.deduct_baseboard }] : []);
  const featureWallDeduct = fwItemsResolved.reduce((s, i) =>
    s + Math.round((parseFloat(i.length_ft) || 0) * (parseFloat(i.height_ft) || 0) * (parseInt(i.count) || 1)), 0);
  const fwBaseboardDeduct = fwItemsResolved.filter(i => i.deduct_baseboard).reduce((s, i) =>
    s + Math.round((parseFloat(i.length_ft) || 0) * (parseInt(i.count) || 1)), 0);

  // Extra walls — partitions, shower walls, nooks
  const extraWalls = room.extra_walls || [];
  const extraWallSF = extraWalls.reduce((s, w) => {
    const sf = (parseFloat(w.length_ft) || 0) * (parseFloat(w.height_ft) || 0);
    return s + sf * (w.both_sides ? 2 : 1);
  }, 0);
  const extraWallLF = extraWalls.reduce((s, w) => {
    const lf = parseFloat(w.length_ft) || 0;
    return s + lf * (w.both_sides ? 2 : 1);
  }, 0);

  // Wall deductions — cabinets, tile, built-ins covering wall area
  const wallDeductions = room.wall_deductions || [];
  const wallDeductSF = wallDeductions.reduce((s, w) => {
    const sf = (parseFloat(w.length_ft) || 0) * (parseFloat(w.height_ft) || 0);
    return s + sf * (w.both_sides ? 2 : 1);
  }, 0);
  const wallDeductLF = wallDeductions.reduce((s, w) => {
    const lf = parseFloat(w.length_ft) || 0;
    return s + lf * (w.both_sides ? 2 : 1);
  }, 0);

  // Walls — only derive if substrate checked
  const wall_field_sf = subs.walls
    ? (subs.walls.sf_override ? parseFloat(subs.walls.sf_manual)||0 : Math.max(0, Math.round(wallNet + gableExtra - featureWallDeduct + extraWallSF - wallDeductSF)))
    : 0;

  // Ceiling — derive if drywall ceiling OR wood ceiling is checked
  const anyCeiling = subs.ceiling || subs.wood_ceiling;
  const ceiling_field_sf = anyCeiling
    ? (subs.ceiling?.sf_override ? parseFloat(subs.ceiling.sf_manual)||0
      : subs.wood_ceiling?.sf_override ? parseFloat(subs.wood_ceiling.sf_manual)||0
      : Math.round(ceilingSF + vaultedExtra))
    : 0;

  // Helper: derive LF for a trim substrate with auto-derive from catalog
  function deriveLF(subId) {
    if (!subs[subId]) return 0;
    const cat = SUBSTRATE_MAP[subId];
    if (subs[subId].lf_override) return parseFloat(subs[subId].lf_manual)||0;
    if (cat?.autoDerive) return Math.round(cat.autoDerive({ perimeter, totalDoors, totalWindows, totalOpenings, openingCasingLF, wall_field_sf, ceiling_field_sf }));
    return parseFloat(subs[subId].lf_manual)||0;
  }

  const baseboard_lf_raw = deriveLF('baseboard') + (subs.baseboard ? Math.round(extraWallLF) - Math.round(wallDeductLF) : 0);
  const baseboard_lf = fwBaseboardDeduct > 0 && !subs.baseboard?.lf_override
    ? Math.max(0, baseboard_lf_raw - fwBaseboardDeduct)
    : baseboard_lf_raw;
  const crown_lf = deriveLF('crown');
  const door_casing_lf = deriveLF('door_casing');
  const window_casing_lf = deriveLF('window_casing');
  const chair_rail_lf = deriveLF('chair_rail');
  const shoe_mold_lf = deriveLF('shoe_mold');
  const wainscot_cap_lf = deriveLF('wainscot_cap');
  const picture_rail_lf = deriveLF('picture_rail');
  const window_stool_lf = deriveLF('window_stool');
  const window_apron_lf = deriveLF('window_apron');
  const shadow_box_lf = deriveLF('shadow_box');
  const panel_mold_lf = deriveLF('panel_mold');

  // EA-based substrates
  const door_frames_ea = subs.door_frames ? (SUBSTRATE_MAP.door_frames.autoDerive({ totalOpenings })) : 0;
  const window_jamb_ea = subs.window_jamb ? (SUBSTRATE_MAP.window_jamb.autoDerive({ totalWindows })) : 0;

  const effectiveHeight = (room.vaulted_ceiling && parseFloat(room.peak_height_ft) > H)
    ? parseFloat(room.peak_height_ft) : H;
  // Honor explicit room-level override (defined in initial-state.js:100)
  // before falling back to geometry-derived band.
  const heightBand = room.height_band || deriveHeightBand(effectiveHeight);

  return {
    L, W, H, effectiveHeight, perimeter,
    totalOpenings, openingCasingLF, doorOpeningDeduction,
    totalDoors, totalWindows, openingDeduction,
    wallGross, wallNet, ceilingSF, vaultedExtra, gableExtra, pitch, featureWallDeduct, fwBaseboardDeduct,
    extraWallSF: Math.round(extraWallSF), extraWallLF: Math.round(extraWallLF),
    wallDeductSF: Math.round(wallDeductSF), wallDeductLF: Math.round(wallDeductLF),
    heightBand,
    wall_field_sf, ceiling_field_sf,
    baseboard_lf, crown_lf, door_casing_lf, window_casing_lf,
    chair_rail_lf, shoe_mold_lf, wainscot_cap_lf, picture_rail_lf,
    window_stool_lf, window_apron_lf, shadow_box_lf, panel_mold_lf,
    door_frames_ea, window_jamb_ea,
    totalDoorSides,
    beamTotalLF, beamPeakLF, beamCrossLFEach, beamRidgeLFEach
  };
}

/**
 * Derive geometry for a closet sub-room.
 * Height inherited from parent room. Standard single-doorway deduction of 21 SF.
 * Only emits wall/ceiling/baseboard if parent room has those substrates enabled.
 */
export function deriveCloset(closet, parentRoom) {
  const L = parseFloat(closet.length_ft) || 0;
  const W = parseFloat(closet.width_ft) || 0;
  const H = parseFloat(parentRoom.height_ft) || 0;
  const perimeter = 2 * (L + W);
  const wallGross = perimeter * H;
  // Standard single doorway deduction — only if closet has real dimensions
  const doorwayDeduction = (L > 0 && W > 0) ? 21 : 0;
  const wallNet = Math.max(0, wallGross - doorwayDeduction);
  const ceilingSF = L * W;

  const parentSubs = parentRoom.substrates || {};
  const wall_field_sf = parentSubs.walls ? Math.round(wallNet) : 0;
  const ceiling_field_sf = parentSubs.ceiling ? Math.round(ceilingSF) : 0;
  // Baseboard: perimeter minus ~3 ft for doorway opening
  const baseboard_lf = parentSubs.baseboard ? Math.max(0, Math.round(perimeter - 3)) : 0;
  const shelving_lf = parseFloat(closet.shelving_lf) || 0;

  return {
    L, W, H, perimeter,
    wallGross, wallNet, doorwayDeduction, ceilingSF,
    wall_field_sf, ceiling_field_sf, baseboard_lf, shelving_lf,
    heightBand: deriveHeightBand(H),
  };
}

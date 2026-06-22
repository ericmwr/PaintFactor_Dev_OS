import { EXT_TRIM_TYPES } from '../state/exterior-state.js';

// ============================================================
// EXTERIOR GEOMETRY DERIVATION
// Parallel to derive-room.js for interior — converts elevation
// dimensions + components into derived quantities.
// ============================================================

// Window opening deduction SF by size bucket
const WINDOW_DEDUCTION_SF = { S: 6, M: 15, L: 24 };
// Window casing LF by size bucket (perimeter of trim surround)
const WINDOW_CASING_LF = { S: 8, M: 12, L: 16 };
// Door deduction SF and casing LF
const DOOR_DEDUCTION_SF = 21;
const DOOR_CASING_LF = 17;
// Window sill LF by size bucket
const WINDOW_SILL_LF = { S: 2, M: 3, L: 4 };
// Garage door deduction SF by size
const GARAGE_DOOR_DEDUCTION_SF = { single: 63, double: 126 };

/**
 * Maps access_type to a modifier band string.
 * Used by the modifier stack to look up access modifiers.
 */
export function deriveAccessBand(accessType) {
  switch (accessType) {
    case 'ground':   return 'GROUND';
    case 'ladder':   return 'LADDER';
    case 'scaffold': return 'SCAFFOLD';
    case 'lift':     return 'LIFT';
    default:         return 'GROUND';
  }
}

/**
 * Derive all geometry quantities for a single elevation.
 *
 * @param {Object} elevation - Elevation state object from createElevation()
 * @returns {Object} Derived quantities for PS_EXT_ key emission
 */
export function deriveElevation(elevation) {
  const width = parseFloat(elevation.width_ft) || 0;
  const height = parseFloat(elevation.height_to_eave_ft) || 0;
  const grossSF = width * height;

  // ── Window counts by size bucket ──
  const windows = elevation.windows || [];
  const windowsBySize = { S: 0, M: 0, L: 0 };
  windows.forEach(w => {
    const size = w.size || 'M';
    const count = parseInt(w.count) || 0;
    if (windowsBySize[size] !== undefined) windowsBySize[size] += count;
    else windowsBySize.M += count;
  });
  const totalWindows = windowsBySize.S + windowsBySize.M + windowsBySize.L;

  // ── Door counts ──
  const doors = elevation.doors || [];
  const totalDoors = doors.reduce((s, d) => s + (parseInt(d.count) || 0), 0);

  // ── Opening deductions ──
  const windowDeductionSF = (windowsBySize.S * WINDOW_DEDUCTION_SF.S)
    + (windowsBySize.M * WINDOW_DEDUCTION_SF.M)
    + (windowsBySize.L * WINDOW_DEDUCTION_SF.L);
  const doorDeductionSF = totalDoors * DOOR_DEDUCTION_SF;
  const totalDeductionSF = windowDeductionSF + doorDeductionSF;

  // ── Net siding SF (sum of sections, or derived from gross minus deductions) ──
  const sidingSections = elevation.siding_sections || [];
  let sidingSF = 0;
  const sectionDetails = sidingSections.map(sec => {
    let sf;
    if (sec.sf_override && parseFloat(sec.sf) > 0) {
      sf = parseFloat(sec.sf);
    } else {
      // Auto-derive: proportional share of net wall area
      // If only one section, it gets the full net area
      sf = Math.max(0, grossSF - totalDeductionSF);
    }
    sidingSF += sf;
    return { id: sec.id, sf: Math.round(sf), siding_type: sec.siding_type };
  });
  // If no siding sections defined, use gross minus deductions
  if (sidingSections.length === 0) {
    sidingSF = Math.max(0, grossSF - totalDeductionSF);
  }
  const netSidingSF = Math.round(sidingSF);

  // ── Trim LF derivation ──
  const trim = elevation.trim || {};
  const trimLF = {};
  let totalTrimLF = 0;
  for (const [trimType, config] of Object.entries(trim)) {
    if (!config || !config.enabled) continue;
    let lf;
    if (config.lf_override && parseFloat(config.lf) > 0) {
      lf = parseFloat(config.lf);
    } else {
      lf = deriveTrimLF(trimType, config, elevation, { totalWindows, totalDoors, width });
    }
    lf = Math.round(lf);
    trimLF[trimType] = lf;
    totalTrimLF += lf;
  }

  // ── Soffit SF ──
  let soffitSF = 0;
  if (trim.soffit && trim.soffit.enabled) {
    const soffitConfig = trim.soffit;
    const runLF = parseFloat(soffitConfig.lf) || width;
    const depthFt = parseFloat(soffitConfig.depth_ft) || 1.5;
    soffitSF = Math.round(runLF * depthFt);
  }

  // ── Caulking LF (derived from trim types + scope) ──
  let caulkLF = 0;
  const caulkScope = elevation.caulk_scope;
  if (caulkScope && caulkScope !== 'none') {
    for (const [trimType, lf] of Object.entries(trimLF)) {
      const trimDef = EXT_TRIM_TYPES.find(t => t.value === trimType);
      if (trimDef) {
        caulkLF += lf * (trimDef.caulk_lf_per_lf || 0);
      }
    }
    caulkLF = Math.round(caulkLF);
  }

  // ── Window casing LF and sill LF (for trim spec) ──
  const windowCasingLF = (windowsBySize.S * WINDOW_CASING_LF.S)
    + (windowsBySize.M * WINDOW_CASING_LF.M)
    + (windowsBySize.L * WINDOW_CASING_LF.L);
  const windowSillLF = (windowsBySize.S * WINDOW_SILL_LF.S)
    + (windowsBySize.M * WINDOW_SILL_LF.M)
    + (windowsBySize.L * WINDOW_SILL_LF.L);
  const doorCasingLF = totalDoors * DOOR_CASING_LF;

  // ── Sub-elements — geometry generators ──
  const bumpOuts = (elevation.bump_outs || []).map(b => deriveBumpOut(b, elevation));
  const dormers = (elevation.dormers || []).map(d => deriveDormer(d));
  const gables = (elevation.gables || []).map(g => deriveGable(g));

  // Aggregate sub-element contributions
  const subSidingSF = bumpOuts.reduce((s, b) => s + b.sidingSF, 0)
    + dormers.reduce((s, d) => s + d.sidingSF, 0)
    + gables.reduce((s, g) => s + g.sidingSF, 0);
  const subTrimLF = {
    fascia: bumpOuts.reduce((s, b) => s + b.fasciaLF, 0) + dormers.reduce((s, d) => s + d.fasciaLF, 0),
    soffit: bumpOuts.reduce((s, b) => s + b.soffitSF, 0) + dormers.reduce((s, d) => s + d.soffitSF, 0),
    corner_boards: bumpOuts.reduce((s, b) => s + b.cornerLF, 0) + dormers.reduce((s, d) => s + d.cornerLF, 0),
    rake: dormers.reduce((s, d) => s + d.rakeLF, 0) + gables.reduce((s, g) => s + g.rakeLF, 0),
  };
  const subWindowCount = bumpOuts.reduce((s, b) => s + b.windowCount, 0)
    + dormers.reduce((s, d) => s + d.windowCount, 0);
  const subFoundationSF = bumpOuts.reduce((s, b) => s + b.foundationSF, 0);

  const accessBand = deriveAccessBand(elevation.access_type);

  return {
    width, height, grossSF,
    windowsBySize, totalWindows,
    totalDoors,
    windowDeductionSF, doorDeductionSF, totalDeductionSF,
    netSidingSF, sectionDetails,
    trimLF, totalTrimLF,
    soffitSF,
    caulkLF, caulkScope,
    windowCasingLF, windowSillLF, doorCasingLF,
    bumpOuts, dormers, gables,
    subSidingSF, subTrimLF, subWindowCount, subFoundationSF,
    accessBand,
  };
}

// ── Trim LF auto-derivation by type ──
function deriveTrimLF(trimType, config, elevation, ctx) {
  const width = ctx.width;
  const widthIn = parseFloat(config.width_in) || 4;

  switch (trimType) {
    case 'fascia':       return width; // runs along eave line
    case 'rake':         return 0;     // requires gable geometry — derived from gables
    case 'frieze':       return width; // horizontal band at top of siding
    case 'corner_boards': return (parseFloat(elevation.height_to_eave_ft) || 0) * 2; // 2 corners per elevation
    case 'soffit':       return width; // soffit run_lf defaults to elevation width
    case 'window_casing': return ctx.totalWindows * 12; // ~12 LF per window avg
    case 'door_casing':  return ctx.totalDoors * DOOR_CASING_LF;
    case 'water_table':  return width;
    case 'belly_band':   return width;
    case 'band_board':   return width;
    case 'window_sill':  return ctx.totalWindows * 3; // ~3 LF per window avg
    default: return 0;
  }
}

// ── Sub-Element: Bump-Out ──
function deriveBumpOut(bumpOut, parentElevation) {
  const w = parseFloat(bumpOut.width_ft) || 0;
  const d = parseFloat(bumpOut.depth_ft) || 0;
  const h = parseFloat(bumpOut.height_ft) || 0;

  // 3 faces: front + 2 sides
  const sidingSF = Math.round((w * h) + 2 * (d * h));
  const fasciaLF = bumpOut.has_fascia ? Math.round(w + 2 * d) : 0;
  const soffitSF = bumpOut.has_soffit ? Math.round(w * d) : 0;
  const cornerLF = bumpOut.has_corner_trim ? Math.round(h * 2) : 0; // 2 outside corners
  const foundationSF = bumpOut.has_foundation ? Math.round((w + 2 * d) * 2) : 0; // ~2 ft high

  // Windows inside bump-out
  const bumpWindows = bumpOut.windows || [];
  const windowCount = bumpWindows.reduce((s, w) => s + (parseInt(w.count) || 0), 0);

  return { id: bumpOut.id, sidingSF, fasciaLF, soffitSF, cornerLF, foundationSF, windowCount };
}

// ── Sub-Element: Dormer ──
function deriveDormer(dormer) {
  const w = parseFloat(dormer.width_ft) || 0;
  const h = parseFloat(dormer.height_ft) || 0;
  const pitch = parseFloat(dormer.roof_pitch) || 6;

  // Cheek walls (2 triangular sides): triangle = 0.5 * base * height
  // Approximate cheek base from pitch: run = h * 12/pitch
  const cheekRun = pitch > 0 ? (h * 12 / pitch) : h;
  const cheekSF = Math.round(2 * 0.5 * cheekRun * h);

  // Front face
  const frontSF = Math.round(w * h);
  const sidingSF = cheekSF + frontSF;

  // Roofline trim
  const fasciaLF = Math.round(w);
  const rakeLF = Math.round(2 * Math.sqrt(cheekRun * cheekRun + h * h));
  const soffitSF = dormer.has_soffit ? Math.round(w * 1) : 0; // ~1 ft depth
  const cornerLF = dormer.has_corner_caps ? Math.round(h * 2) : 0;

  // Window
  const windowCount = dormer.has_window ? (parseInt(dormer.window?.count) || 1) : 0;

  return { id: dormer.id, sidingSF, fasciaLF, rakeLF, soffitSF, cornerLF, windowCount };
}

// ── Sub-Element: Gable ──
function deriveGable(gable) {
  const base = parseFloat(gable.base_ft) || 0;
  const peak = parseFloat(gable.peak_ft) || 0;

  // Triangle area: 0.5 * base * rise
  const sidingSF = Math.round(0.5 * base * peak);

  // Rake trim: 2 hypotenuse runs from base corners to peak
  const halfBase = base / 2;
  const rakeLF = gable.has_rake_trim
    ? (parseFloat(gable.rake_lf) || Math.round(2 * Math.sqrt(halfBase * halfBase + peak * peak)))
    : 0;

  return { id: gable.id, sidingSF, rakeLF };
}

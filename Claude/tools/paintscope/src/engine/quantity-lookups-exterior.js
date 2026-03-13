import { deriveElevation } from './derive-elevation.js';

/**
 * Build per-elevation quantity lookups from exterior state.
 * Returns Map<elevationIndex, Map<psKey, {value, uom}>>
 *
 * Elevation-bound specs consume these keyed by the elevation they belong to.
 */
export function buildElevationQuantityLookups(state) {
  const { exterior } = state;
  if (!exterior) return new Map();

  const elevations = exterior.elevations || [];
  const elevLookups = new Map();

  elevations.forEach((elev, ei) => {
    const d = deriveElevation(elev);
    const qty = new Map();

    function addQ(key, uom, val) {
      if (!val || val <= 0) return;
      const existing = qty.get(key);
      if (existing) existing.value += val;
      else qty.set(key, { value: val, uom });
    }

    // ── Siding field SF ──
    // Route to type-specific keys based on siding_type
    const sidingSections = elev.siding_sections || [];
    sidingSections.forEach(sec => {
      const sf = d.sectionDetails.find(s => s.id === sec.id)?.sf || 0;
      const sidingKey = sidingTypeToKey(sec.siding_type);
      addQ(sidingKey, 'SF', sf);
    });
    // If no sections but have net siding SF, emit generic siding key
    if (sidingSections.length === 0 && d.netSidingSF > 0) {
      addQ('PS_EXT_SURFACE_SF.SIDING_FIELD', 'SF', d.netSidingSF);
    }

    // Sub-element siding contributions
    if (d.subSidingSF > 0) {
      addQ('PS_EXT_SURFACE_SF.SIDING_FIELD', 'SF', d.subSidingSF);
    }

    // ── Trim LF keys ──
    const trimKeyMap = {
      fascia:         'PS_EXT_EDGE_LF.FASCIA',
      rake:           'PS_EXT_EDGE_LF.TRIM_RAKE',
      frieze:         'PS_EXT_EDGE_LF.TRIM_FRIEZE',
      corner_boards:  'PS_EXT_EDGE_LF.TRIM_CORNER',
      water_table:    'PS_EXT_EDGE_LF.TRIM_BAND',
      belly_band:     'PS_EXT_EDGE_LF.TRIM_BAND',
      band_board:     'PS_EXT_EDGE_LF.TRIM_BAND',
      window_casing:  'PS_EXT_EDGE_LF.TRIM_WINDOW_CASING',
      door_casing:    'PS_EXT_EDGE_LF.TRIM_DOOR_CASING',
      window_sill:    'PS_EXT_EDGE_LF.SILL',
    };
    for (const [trimType, lf] of Object.entries(d.trimLF)) {
      if (trimType === 'soffit') continue; // soffit emits as SF, not LF
      const psKey = trimKeyMap[trimType];
      if (psKey) addQ(psKey, 'LF', lf);
    }

    // Sub-element trim contributions
    if (d.subTrimLF.fascia) addQ('PS_EXT_EDGE_LF.FASCIA', 'LF', d.subTrimLF.fascia);
    if (d.subTrimLF.corner_boards) addQ('PS_EXT_EDGE_LF.TRIM_CORNER', 'LF', d.subTrimLF.corner_boards);
    if (d.subTrimLF.rake) addQ('PS_EXT_EDGE_LF.TRIM_RAKE', 'LF', d.subTrimLF.rake);

    // ── Soffit SF ──
    const totalSoffitSF = d.soffitSF + (d.subTrimLF.soffit || 0);
    addQ('PS_EXT_SURFACE_SF.SOFFIT_FIELD', 'SF', totalSoffitSF);

    // ── Caulking LF ──
    addQ('PS_EXT_SURFACE_LF.CAULK_JOINTS', 'LF', d.caulkLF);

    // ── Window casing and sill from derivation ──
    addQ('PS_EXT_EDGE_LF.TRIM_WINDOW_CASING', 'LF', d.windowCasingLF);
    addQ('PS_EXT_EDGE_LF.TRIM_DOOR_CASING', 'LF', d.doorCasingLF);
    addQ('PS_EXT_EDGE_LF.SILL', 'LF', d.windowSillLF);

    // ── Opening counts ──
    addQ('PS_EXT_OPENING_EA.WINDOW_S', 'EA', d.windowsBySize.S);
    addQ('PS_EXT_OPENING_EA.WINDOW_M', 'EA', d.windowsBySize.M);
    addQ('PS_EXT_OPENING_EA.WINDOW_L', 'EA', d.windowsBySize.L);
    addQ('PS_EXT_OPENING_EA.DOOR_EXT', 'EA', d.totalDoors);

    // Sub-element window contributions
    if (d.subWindowCount > 0) {
      addQ('PS_EXT_OPENING_EA.WINDOW_M', 'EA', d.subWindowCount); // default to M
    }

    // ── Protection keys (auto-derived from openings) ──
    const totalWin = d.totalWindows + d.subWindowCount;
    addQ('PS_EXT_PROTECT_EA.GLASS_WINDOW', 'EA', totalWin);
    addQ('PS_EXT_PROTECT_EA.GLASS_DOOR', 'EA', d.totalDoors);
    addQ('PS_EXT_PROTECT_EA.DOOR_HARDWARE', 'EA', d.totalDoors);

    // ── Foundation from sub-elements ──
    if (d.subFoundationSF > 0) {
      addQ('PS_EXT_SURFACE_SF.FOUNDATION_WALL', 'SF', d.subFoundationSF);
    }

    // ── Meta ──
    addQ('PS_EXT_META.EA.ELEVATIONS_TOTAL', 'EA', 1);

    elevLookups.set(ei, qty);
  });

  return elevLookups;
}

/**
 * Build quantity lookups for standalone items (not elevation-bound).
 * Returns Map<string, Map<psKey, {value, uom}>> keyed by item type.
 */
export function buildStandaloneQuantityLookups(state) {
  const { exterior } = state;
  if (!exterior) return new Map();

  const standalone = exterior.standalone || {};
  const lookups = new Map();

  // ── Foundation ──
  const fnd = standalone.foundation;
  if (fnd && fnd.enabled) {
    const qty = new Map();
    const perimeterLF = parseFloat(fnd.perimeter_lf) || 0;
    const heightFt = parseFloat(fnd.height_ft) || 2;
    const sf = Math.round(perimeterLF * heightFt);
    if (sf > 0) qty.set('PS_EXT_SURFACE_SF.FOUNDATION_WALL', { value: sf, uom: 'SF' });
    if (qty.size > 0) lookups.set('foundation', qty);
  }

  // ── Deck ──
  const deck = standalone.deck;
  if (deck && deck.enabled) {
    const qty = new Map();
    const sf = parseFloat(deck.sf) || 0;
    if (sf > 0) qty.set('PS_EXT_SURFACE_SF.DECK_FIELD', { value: sf, uom: 'SF' });
    const railLF = parseFloat(deck.railing_lf) || 0;
    if (railLF > 0) qty.set('PS_EXT_EDGE_LF.DECK_RAILING', { value: railLF, uom: 'LF' });
    if (qty.size > 0) lookups.set('deck', qty);
  }

  // ── Fence ──
  const fence = standalone.fence;
  if (fence && fence.enabled) {
    const qty = new Map();
    const totalLF = parseFloat(fence.total_lf) || 0;
    const heightFt = parseFloat(fence.height_ft) || 6;
    const sides = parseInt(fence.sides) || 2;
    const sf = Math.round(totalLF * heightFt * sides);
    if (sf > 0) qty.set('PS_EXT_SURFACE_SF.FENCE_FIELD', { value: sf, uom: 'SF' });
    if (qty.size > 0) lookups.set('fence', qty);
  }

  // ── Porch ──
  const porch = standalone.porch;
  if (porch) {
    const qty = new Map();
    if (porch.ceiling?.enabled) {
      const sf = parseFloat(porch.ceiling.sf) || 0;
      if (sf > 0) qty.set('PS_EXT_SURFACE_SF.PORCH_CEILING', { value: sf, uom: 'SF' });
    }
    if (porch.floor?.enabled) {
      const sf = parseFloat(porch.floor.sf) || 0;
      if (sf > 0) qty.set('PS_EXT_SURFACE_SF.PORCH_FLOOR', { value: sf, uom: 'SF' });
    }
    if (qty.size > 0) lookups.set('porch', qty);
  }

  // ── Garage Doors ──
  const garageDoors = standalone.garage_doors || [];
  if (garageDoors.length > 0) {
    const qty = new Map();
    const totalEA = garageDoors.reduce((s, g) => s + (parseInt(g.count) || 1), 0);
    if (totalEA > 0) qty.set('PS_EXT_OPENING_EA.DOOR_GARAGE', { value: totalEA, uom: 'EA' });
    if (qty.size > 0) lookups.set('garage_doors', qty);
  }

  // ── Metal Surfaces ──
  const metalSurfaces = standalone.metal_surfaces || [];
  if (metalSurfaces.length > 0) {
    const qty = new Map();
    const totalLF = metalSurfaces.reduce((s, m) => s + (parseFloat(m.lf) || 0), 0);
    if (totalLF > 0) qty.set('PS_EXT_EDGE_LF.METAL_RAILING', { value: totalLF, uom: 'LF' });
    if (qty.size > 0) lookups.set('metal_surfaces', qty);
  }

  return lookups;
}

/**
 * Map siding_type to the appropriate PS_EXT_SURFACE_SF key.
 */
function sidingTypeToKey(sidingType) {
  switch (sidingType) {
    case 'stucco':               return 'PS_EXT_SURFACE_SF.STUCCO_FIELD';
    case 'masonry':              return 'PS_EXT_SURFACE_SF.MASONRY_WALL';
    case 'board_and_batten':     return 'PS_EXT_SURFACE_SF.SIDING_BOARD_BATTEN';
    default:                     return 'PS_EXT_SURFACE_SF.SIDING_FIELD';
  }
}

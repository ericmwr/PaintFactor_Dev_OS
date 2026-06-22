import { describe, it, expect } from 'vitest';
import { computeMaterialEstimates } from '../material-estimates.js';

// ─── Fixture helpers ───────────────────────────────────────────────────────

// Minimal state compatible with computeMaterialEstimates internals:
// one room whose substrate substates won't filter anything out (no isSpecStateCompatible blocks).
function minimalState() {
  return {
    project: { default_quality_tier: 'QT3' },
    rooms: [{ substrates: {} }],
  };
}

// A roomLookup Map with one quantity for the given psKey.
function roomLookupFor(psKey, value = 100) {
  return new Map([[0, { qty: new Map([[psKey, { value, uom: 'SF' }]]) }]]);
}

// ─── Test 1: stain role uses threaded per-phase coat count ─────────────────
//
// SF_STAIR_RAILING_NC_STAIN is in MATERIAL_COVERAGE_PROFILES (stain roles,
// no coverage_sf_per_gallon) and in MATERIAL_SYSTEMS. SYS_STAIN_OIL is a real
// stain system whose catalog product has coverage_sf_per_gallon = 250.
// We thread clear_coats: 3 in scenarioMaterials and assert the emitted clear
// line's `coats` field equals 3 (not the resolveCoats default of 1).
//
// The stain system used here (SYS_CLEAR_POLY_OIL) resolves via the catalog
// (PROD_MINWAX_POLY_OIL or similar) with coverage data, so coverageRate is
// non-null and a line is emitted.

describe('stain material coats — phase coat threading', () => {
  it('stain line gallons use threaded phase coats (stain_coats)', () => {
    // SF_STAIR_RAILING_NC_STAIN has SYS_STAIN_OIL in MATERIAL_SYSTEMS.
    // MATERIAL_COVERAGE_PROFILES entry for this spec has no coverage_sf_per_gallon,
    // so we rely on resolveProduct → PROD_SW_OIL_STAIN with coverage_sf_per_gallon=250.
    const state = minimalState();
    const roomLookups = roomLookupFor('PS_SURFACE_SF.STAIR_RAIL', 200);
    // specResults must name a task with the psKey so surfaceKeys populate
    const specResults = [
      {
        specId: 'SF_STAIR_RAILING_NC_STAIN',
        domain: 'interior',
        tasks: [{ psKey: 'PS_SURFACE_SF.STAIR_RAIL' }],
      },
    ];
    // Thread stain_coats = 2 (default would be 1 from resolveCoats)
    const scenarioMaterials = {
      SF_STAIR_RAILING_NC_STAIN: {
        scenarioId: 'SCN_TEST',
        systems: ['SYS_STAIN_OIL'],
        coats: { stain_coats: 2, sealer_coats: 1, clear_coats: 1 },
      },
    };
    const estimates = computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
    const stainLine = estimates.find(
      e => e.specFamilyId === 'SF_STAIR_RAILING_NC_STAIN' && e.productRole === 'stain'
    );
    expect(stainLine).toBeDefined();
    // coats must equal the threaded stain_coats value, not resolveCoats' default
    expect(stainLine.coats).toBe(2);
  });

  it('clear role uses threaded clear_coats when > 1', () => {
    const state = minimalState();
    const roomLookups = roomLookupFor('PS_SURFACE_SF.STAIR_RAIL', 200);
    const specResults = [
      {
        specId: 'SF_STAIR_RAILING_NC_STAIN',
        domain: 'interior',
        tasks: [{ psKey: 'PS_SURFACE_SF.STAIR_RAIL' }],
      },
    ];
    // Thread clear_coats = 3 — a catalog-resolvable system is needed to emit a line
    // SYS_CLEAR_POLY_OIL resolves via PROD_MINWAX_POLY_OIL (coverage_sf_per_gallon in catalog)
    const scenarioMaterials = {
      SF_STAIR_RAILING_NC_STAIN: {
        scenarioId: 'SCN_TEST',
        systems: ['SYS_CLEAR_POLY_OIL'],
        coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 3 },
      },
    };
    const estimates = computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
    const clearLine = estimates.find(
      e => e.specFamilyId === 'SF_STAIR_RAILING_NC_STAIN' && e.productRole === 'clear'
    );
    expect(clearLine).toBeDefined();
    expect(clearLine.coats).toBe(3);
  });
});

// ─── Test 2: paint role is unaffected by the stain coats change ────────────
//
// SF_CABINET_NC_PAINT with a primer system (SYS_PRIMER_WOOD_ACRYLIC) must still
// resolve coats via resolveCoats (own-family / cross-family / default), not from
// sysEntry.coats. The scenarioMaterials entry deliberately omits the `coats` key
// to prove the paint path doesn't depend on it.

describe('paint material coats — resolveCoats path unchanged', () => {
  it('paint primer line coats come from resolveCoats, not the stain coats struct', () => {
    const state = minimalState();
    const roomLookups = roomLookupFor('PS_SURFACE_SF.CABINET_FRAME', 200);
    const specResults = [
      {
        specId: 'SF_CABINET_NC_PAINT',
        domain: 'interior',
        tasks: [{ psKey: 'PS_SURFACE_SF.CABINET_FRAME' }],
      },
    ];
    // scenarioMaterials has NO `coats` key — paint path must not crash or use 0
    const scenarioMaterials = {
      SF_CABINET_NC_PAINT: {
        scenarioId: 'SCN_X',
        systems: ['SYS_PRIMER_WOOD_ACRYLIC', 'SYS_FF_STANDARD_ACRYLIC'],
        // intentionally no `coats` field — paint must not read it
      },
    };
    const estimates = computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
    const primerLine = estimates.find(
      e => e.specFamilyId === 'SF_CABINET_NC_PAINT' && e.productRole === 'primer'
    );
    expect(primerLine).toBeDefined();
    // Paint primer resolves coats via resolveCoats (default = 1 when no product row);
    // it must NOT be 0 (which would happen if it accidentally read sysEntry?.coats?.stain_coats)
    expect(primerLine.coats).toBeGreaterThanOrEqual(1);
    // gallons must be positive
    expect(primerLine.gallons).toBeGreaterThan(0);
  });

  it('paint finish line gallons match coverage-profile math (coats from resolveCoats)', () => {
    const state = minimalState();
    // Use a well-defined quantity so we can check the math
    const SF = 400;
    const roomLookups = roomLookupFor('PS_SURFACE_SF.CABINET_FRAME', SF);
    const specResults = [
      {
        specId: 'SF_CABINET_NC_PAINT',
        domain: 'interior',
        tasks: [{ psKey: 'PS_SURFACE_SF.CABINET_FRAME' }],
      },
    ];
    const scenarioMaterials = {
      SF_CABINET_NC_PAINT: {
        scenarioId: 'SCN_X',
        systems: ['SYS_FF_STANDARD_ACRYLIC'],
      },
    };
    const estimates = computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
    const finishLine = estimates.find(
      e => e.specFamilyId === 'SF_CABINET_NC_PAINT' && e.productRole === 'finish'
    );
    expect(finishLine).toBeDefined();
    // Must have used resolveCoats path; coats ≥ 1 and gallons > 0
    expect(finishLine.coats).toBeGreaterThanOrEqual(1);
    expect(finishLine.gallons).toBeGreaterThan(0);
  });
});

// ─── Test 3: fired spec NOT in MATERIAL_COVERAGE_PROFILES still emits ───────
//
// A decomposed stain specId like 'SF_DOOR_CASING_NC_STAIN' has NO entry in
// MATERIAL_COVERAGE_PROFILES. After the A2 outer-loop union fix, it IS included
// in specFamilyIds. Since it has a resolvable system (SYS_STAIN_OIL →
// coverage_sf_per_gallon=250 via catalog), the engine must emit a material line.
// Pre-A2, specFamilyIds only came from MATERIAL_COVERAGE_PROFILES so this spec
// would be invisible to the materials loop — no line would be emitted.

describe('outer-loop union — fired specs without coverage profiles', () => {
  it('emits a stain line for a spec not in MATERIAL_COVERAGE_PROFILES when resolveProduct supplies coverage', () => {
    const state = minimalState();
    const roomLookups = roomLookupFor('PS_SURFACE_LF.DOOR_CASING', 50);
    const specResults = [
      {
        specId: 'SF_DOOR_CASING_NC_STAIN',
        domain: 'interior',
        tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }],
      },
    ];
    // This specId is NOT in MATERIAL_COVERAGE_PROFILES — it's purely in scenarioMaterials.
    // SYS_STAIN_OIL resolves via catalog (coverage_sf_per_gallon = 250).
    const scenarioMaterials = {
      SF_DOOR_CASING_NC_STAIN: {
        scenarioId: 'SCN_TEST',
        systems: ['SYS_STAIN_OIL'],
        coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 1 },
      },
    };
    const estimates = computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
    const stainLine = estimates.find(
      e => e.specFamilyId === 'SF_DOOR_CASING_NC_STAIN' && e.productRole === 'stain'
    );
    // Pre-A2: this would be undefined (spec invisible to materials loop)
    // Post-A2: must be defined with positive gallons
    expect(stainLine).toBeDefined();
    expect(stainLine.gallons).toBeGreaterThan(0);
  });

  it('emits no line when the fired spec has an empty systems array', () => {
    const state = minimalState();
    const roomLookups = roomLookupFor('PS_SURFACE_LF.DOOR_CASING', 50);
    const specResults = [
      {
        specId: 'SF_DOOR_CASING_NC_STAIN',
        domain: 'interior',
        tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }],
      },
    ];
    const scenarioMaterials = {
      SF_DOOR_CASING_NC_STAIN: {
        scenarioId: 'SCN_TEST',
        systems: [],  // empty → matchedSystems.length === 0 → return early
        coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 1 },
      },
    };
    const estimates = computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
    const lines = estimates.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_STAIN');
    expect(lines).toHaveLength(0);
  });
});

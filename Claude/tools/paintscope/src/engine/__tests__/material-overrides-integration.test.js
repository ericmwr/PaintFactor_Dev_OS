import { describe, it, expect } from 'vitest';
import { computeMaterialEstimates } from '../material-estimates.js';

// Minimal fixture: 2 door casings in different finish_groups, both stained.
// Same spec family fires twice with different finish_group ctx values.
function fixture({ projectOverrides = { system: {}, manual: [], byRole: {}, byFinishGroup: {} } } = {}) {
  const state = {
    project: { quality_tier: 'QT3', default_brand: null, default_complexity: 'STD', material_overrides: projectOverrides },
    rooms: [
      { id: 'R1', substrates: {
        door_casing: { painting: true, stain_on: true, sealer_on: false, clear_on: true, finish_group: 'D', substrate_state: 'bare_wood' },
      } },
      { id: 'R2', substrates: {
        door_casing: { painting: true, stain_on: true, sealer_on: false, clear_on: true, finish_group: 'E', substrate_state: 'bare_wood' },
      } },
    ],
  };
  const roomLookups = new Map([
    [0, { qty: new Map([['PS_SURFACE_LF.DOOR_CASING', { value: 30, unit: 'LF' }]]) }],
    [1, { qty: new Map([['PS_SURFACE_LF.DOOR_CASING', { value: 50, unit: 'LF' }]]) }],
  ]);
  const specResults = [
    { specId: 'SF_DOOR_CASING_NC_STAIN', domain: 'interior', roomIndex: 0,
      tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }] },
    { specId: 'SF_DOOR_CASING_NC_STAIN', domain: 'interior', roomIndex: 1,
      tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }] },
    { specId: 'SF_DOOR_CASING_NC_CLEAR', domain: 'interior', roomIndex: 0,
      tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }] },
    { specId: 'SF_DOOR_CASING_NC_CLEAR', domain: 'interior', roomIndex: 1,
      tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }] },
  ];
  // The rekey by Task 3 means scenarioMaterials is keyed `${specId}|${finish_group}`.
  // Same scenario shape per group (only the system + coats differ via override).
  const scenarioMaterials = {
    'SF_DOOR_CASING_NC_STAIN|D': { specId: 'SF_DOOR_CASING_NC_STAIN', finishGroup: 'D', scenarioId: 'SCN_DC_STAIN',
      systems: ['SYS_STAIN_OIL'], coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 1 } },
    'SF_DOOR_CASING_NC_STAIN|E': { specId: 'SF_DOOR_CASING_NC_STAIN', finishGroup: 'E', scenarioId: 'SCN_DC_STAIN',
      systems: ['SYS_STAIN_OIL'], coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 1 } },
    'SF_DOOR_CASING_NC_CLEAR|D': { specId: 'SF_DOOR_CASING_NC_CLEAR', finishGroup: 'D', scenarioId: 'SCN_DC_CLEAR',
      systems: ['SYS_CLEAR_POLY_WB'], coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 2 } },
    'SF_DOOR_CASING_NC_CLEAR|E': { specId: 'SF_DOOR_CASING_NC_CLEAR', finishGroup: 'E', scenarioId: 'SCN_DC_CLEAR',
      systems: ['SYS_CLEAR_POLY_WB'], coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 2 } },
  };
  return computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
}

describe('material overrides — per-finish-group integration', () => {
  it('emits one clear line per finish_group when no overrides set (partitioned by group, totals byte-equivalent to today)', () => {
    const est = fixture();
    const clearLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && e.productRole === 'clear');
    expect(clearLines.length).toBe(2);
    // Both groups still resolve to SYS_CLEAR_POLY_WB (scenario file pick)
    const productIds = clearLines.map(l => l.system?.id || l.systemId).sort();
    expect(productIds).toEqual(['SYS_CLEAR_POLY_WB', 'SYS_CLEAR_POLY_WB']);
    // Surface totals: 30 LF (group D) + 50 LF (group E) = 80 LF total (matches pre-P3 single line)
    const totalSF = clearLines.reduce((a, b) => a + (b.surfaceSF ?? b.specSF ?? 0), 0);
    expect(totalSF).toBeCloseTo(80, 1);
  });

  it('applies a finish-group override only to the matching group', () => {
    const est = fixture({ projectOverrides: {
      system: {}, manual: [], byRole: {},
      byFinishGroup: { D: { clear_system: 'SYS_CLEAR_LACQUER' } },
    }});
    const clearLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && e.productRole === 'clear');
    expect(clearLines.length).toBe(2);
    const byGroup = Object.fromEntries(clearLines.map(l => [l.finishGroup, l.system?.id || l.systemId]));
    expect(byGroup.D).toBe('SYS_CLEAR_LACQUER');   // overridden
    expect(byGroup.E).toBe('SYS_CLEAR_POLY_WB');   // file default
  });

  it('project default (byRole) applies to all groups when finish-group has no override', () => {
    const est = fixture({ projectOverrides: {
      system: {}, manual: [], byFinishGroup: {},
      byRole: { clear_system: 'SYS_CLEAR_LACQUER' },
    }});
    const clearLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && e.productRole === 'clear');
    expect(clearLines.every(l => (l.system?.id || l.systemId) === 'SYS_CLEAR_LACQUER')).toBe(true);
  });

  it('finish-group override beats project default for the same role', () => {
    const est = fixture({ projectOverrides: {
      system: {}, manual: [],
      byRole: { clear_system: 'SYS_CLEAR_LACQUER' },
      byFinishGroup: { D: { clear_system: 'SYS_CLEAR_POLY_OIL' } },
    }});
    const clearLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && e.productRole === 'clear');
    const byGroup = Object.fromEntries(clearLines.map(l => [l.finishGroup, l.system?.id || l.systemId]));
    expect(byGroup.D).toBe('SYS_CLEAR_POLY_OIL');     // finish-group wins
    expect(byGroup.E).toBe('SYS_CLEAR_LACQUER');      // project default
  });

  it('coats override (byFinishGroup) moves stain-role gallons for that group only', () => {
    // Same fixture but stain override: group D = 2 stain coats, group E = file default (1)
    const est = fixture({ projectOverrides: {
      system: {}, manual: [], byRole: {},
      byFinishGroup: { D: { stain_coats: 2 } },
    }});
    const stainLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_STAIN' && e.productRole === 'stain');
    expect(stainLines.length).toBe(2);
    const byGroup = Object.fromEntries(stainLines.map(l => [l.finishGroup, l.gallons]));
    // Group D should have ~2x gallons of group E (same SF: D=30, E=50; D has 2 coats, E has 1)
    // Ratio = (30 * 2) / (50 * 1) = 1.2x — D should be 60 SF-coats, E should be 50 SF-coats
    expect(byGroup.D / 60).toBeCloseTo(byGroup.E / 50, 2);
  });
});

describe('paint coats override (risk #1 verification)', () => {
  it('byRole.finish_coats overrides paint finish gallons', () => {
    // Stand up a minimal cabinet-paint fixture (paint side; primer + finish roles).
    const state = {
      project: { quality_tier: 'QT3', default_brand: null, default_complexity: 'STD',
        material_overrides: { system: {}, manual: [], byRole: { finish_coats: 3 }, byFinishGroup: {} } },
      rooms: [{ id: 'R1', substrates: { cabinets: { painting: true, finish_group: 'C', substrate_state: 'bare_wood' } } }],
    };
    const roomLookups = new Map([[0, { qty: new Map([['PS_SURFACE_SF.CABINET_FRAME', { value: 400, unit: 'SF' }]]) }]]);
    const specResults = [{ specId: 'SF_CABINET_NC_PAINT', domain: 'interior', roomIndex: 0,
      tasks: [{ psKey: 'PS_SURFACE_SF.CABINET_FRAME' }] }];
    const scenarioMaterials = {
      'SF_CABINET_NC_PAINT|C': { specId: 'SF_CABINET_NC_PAINT', finishGroup: 'C', scenarioId: 'SCN_CAB',
        systems: ['SYS_PRIMER_WOOD_ACRYLIC', 'SYS_FF_STANDARD_ACRYLIC'] },
    };
    const est = computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
    const finishLine = est.find(e => e.specFamilyId === 'SF_CABINET_NC_PAINT' && e.productRole === 'finish');
    expect(finishLine).toBeDefined();
    // Without override, paint would use product.coats_required (typically 1 or 2).
    // With override = 3, gallons should reflect 3 coats. We assert the override
    // value flowed into the math by comparing to a no-override baseline.
    const baselineState = { ...state, project: { ...state.project, material_overrides: { system: {}, manual: [], byRole: {}, byFinishGroup: {} } } };
    const baselineEst = computeMaterialEstimates(baselineState, roomLookups, specResults, scenarioMaterials);
    const baselineFinish = baselineEst.find(e => e.specFamilyId === 'SF_CABINET_NC_PAINT' && e.productRole === 'finish');
    expect(finishLine.gallons).toBeGreaterThan(baselineFinish.gallons);  // override → more coats → more gallons
  });
});

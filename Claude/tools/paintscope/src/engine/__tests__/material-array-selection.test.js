import { describe, it, expect } from 'vitest';
import { computeMaterialEstimates } from '../material-estimates.js';

// Minimal state: one room, cabinet spec activated, with a quantity for the spec's PS key.
function fixture(systems) {
  const state = { project: { default_quality_tier: 'QT3' }, rooms: [{ substrates: {} }] };
  const roomLookups = new Map([[0, { qty: new Map([['PS_SURFACE_SF.CABINET_FRAME', { value: 200, uom: 'SF' }]]) }]]);
  const specResults = [{ specId: 'SF_CABINET_NC_PAINT', domain: 'interior',
    tasks: [{ psKey: 'PS_SURFACE_SF.CABINET_FRAME' }] }];
  const scenarioMaterials = { SF_CABINET_NC_PAINT: { scenarioId: 'SCN_X', systems } };
  return computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
}

describe('computeMaterialEstimates — array selection', () => {
  it('emits a line per role from the scenario array (primer + finish)', () => {
    const est = fixture(['SYS_PRIMER_WOOD_ACRYLIC', 'SYS_FF_STANDARD_ACRYLIC']);
    const roles = est.filter(e => e.specFamilyId === 'SF_CABINET_NC_PAINT').map(e => e.productRole).sort();
    expect(roles).toEqual(['finish', 'primer']);
  });
  it('emits no lines when the array is empty', () => {
    const est = fixture([]);
    expect(est.filter(e => e.specFamilyId === 'SF_CABINET_NC_PAINT')).toEqual([]);
  });
});

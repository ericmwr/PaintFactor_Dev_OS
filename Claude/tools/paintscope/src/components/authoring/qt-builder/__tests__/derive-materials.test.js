import { describe, it, expect } from 'vitest';
import { deriveMaterials } from '../derive-materials.js';

// Uses the REAL cabinet family (SF_CABINET_NC_PAINT: 5 primers + 3 finishes).
// paintable_item 'cabinet' + SS_BARE resolves to SF_CABINET_NC_PAINT.
function bundle(finishSystem = 'SYS_FF_STANDARD_ACRYLIC') {
  return {
    scenarios: [
      { scenario_id: 'SCN_CAB',
        matches: { paintable_item: 'cabinet', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' },
        modules: [], material_systems: ['SYS_PRIMER_WOOD_ACRYLIC', finishSystem] },
    ],
    modules: {}, tasks: {},
  };
}
const sel = { paintable_item: 'cabinet', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' };

describe('deriveMaterials', () => {
  it('resolves the spec family and groups candidate systems by role', () => {
    const vm = deriveMaterials(bundle(), bundle(), sel);
    expect(vm.served).toContain('QT3');
    const q3 = vm.byTier.QT3;
    expect(q3.specId).toBe('SF_CABINET_NC_PAINT');
    expect(q3.candidatesByRole.primer.length).toBeGreaterThanOrEqual(2);
    expect(q3.candidatesByRole.finish.length).toBeGreaterThanOrEqual(2);
    expect(q3.candidatesByRole.finish.every(c => c.id && c.name)).toBe(true);
  });

  it('reads resolvedByRole from the scenario array', () => {
    const vm = deriveMaterials(bundle(), bundle(), sel);
    expect(vm.byTier.QT3.resolvedByRole.primer).toBe('SYS_PRIMER_WOOD_ACRYLIC');
    expect(vm.byTier.QT3.resolvedByRole.finish).toBe('SYS_FF_STANDARD_ACRYLIC');
  });

  it('flags isOverrideByRole when the resolved system differs from canonical', () => {
    const merged = bundle('SYS_FF_PREMIUM');
    const canonical = bundle('SYS_FF_STANDARD_ACRYLIC');
    const vm = deriveMaterials(merged, canonical, sel);
    expect(vm.byTier.QT3.isOverrideByRole.finish).toBe(true);
    expect(vm.byTier.QT3.isOverrideByRole.primer).toBe(false);
  });

  it('orders materialRoles primer before finish', () => {
    const vm = deriveMaterials(bundle(), bundle(), sel);
    expect(vm.materialRoles).toEqual(['primer', 'finish']);
  });

  it('marks a tier null when no scenario matches', () => {
    const empty = { scenarios: [], modules: {}, tasks: {} };
    const vm = deriveMaterials(empty, empty, sel);
    expect(vm.served).toEqual([]);
    expect(vm.byTier.QT3).toBeNull();
  });

  it('flags a role present only in canonical (override dropped it) as an override', () => {
    const merged = {
      scenarios: [{ scenario_id: 'SCN_CAB',
        matches: { paintable_item: 'cabinet', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' },
        modules: [], material_systems: ['SYS_FF_STANDARD_ACRYLIC'] }],   // primer dropped
      modules: {}, tasks: {},
    };
    const canonical = {
      scenarios: [{ scenario_id: 'SCN_CAB',
        matches: { paintable_item: 'cabinet', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' },
        modules: [], material_systems: ['SYS_PRIMER_WOOD_ACRYLIC', 'SYS_FF_STANDARD_ACRYLIC'] }],
      modules: {}, tasks: {},
    };
    const sel = { paintable_item: 'cabinet', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' };
    const vm = deriveMaterials(merged, canonical, sel);
    expect(vm.byTier.QT3.isOverrideByRole.primer).toBe(true);
    expect(vm.byTier.QT3.isOverrideByRole.finish).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { deriveMaterials } from '../derive-materials.js';

// Real specForScenarioMatches maps int_door_casing + coating_phase -> SF_DOOR_CASING_NC_{STAIN,SEALER,CLEAR}.
function stainBundle(systems = ['SYS_STAIN_OIL']) {
  return {
    scenarios: [
      { scenario_id: 'SCN_DC_STAIN',
        matches: { paintable_item: 'int_door_casing', substrate_state: ['SS_BARE'], coating_phase: 'stain' },
        modules: [], material_systems: systems },
    ],
    modules: {}, tasks: {},
  };
}
const stainSel = { paintable_item: 'int_door_casing', substrate_state: 'SS_BARE', coating_phase: 'stain', application_method_stain: 'brush' };

describe('deriveMaterials — decomposed stain', () => {
  it('renders one role (the phase) with the canonical menu', () => {
    const vm = deriveMaterials(stainBundle(), stainBundle(), stainSel);
    expect(vm.materialRoles).toEqual(['stain']);
    const q3 = vm.byTier.QT3;
    expect(q3.specId).toBe('SF_DOOR_CASING_NC_STAIN');
    expect(q3.resolvedByRole.stain).toBe('SYS_STAIN_OIL');
    const ids = q3.candidatesByRole.stain.map(c => c.id).sort();
    expect(ids).toEqual(['SYS_STAIN_GEL', 'SYS_STAIN_OIL', 'SYS_STAIN_OIL_MOD', 'SYS_STAIN_WB']);
  });
  it('flags an override when the resolved stain system differs from canonical', () => {
    const vm = deriveMaterials(stainBundle(['SYS_STAIN_GEL']), stainBundle(['SYS_STAIN_OIL']), stainSel);
    expect(vm.byTier.QT3.isOverrideByRole.stain).toBe(true);
  });
});

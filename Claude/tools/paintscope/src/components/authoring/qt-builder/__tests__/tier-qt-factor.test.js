import { describe, it, expect } from 'vitest';
import { deriveTierQtFactors, setQtFactor, clearQtFactor } from '../tier-qt-factor.js';

// One multi-tier scenario serving QT3-5, with a QT5 FAC_QT override.
function multiTier() {
  return {
    modifiers: {}, modules: {},
    scenarios: [{
      scenario_id: 'SCN_M',
      matches: { paintable_item: 'w', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' },
      modules: [],
      modifier_overrides: { FAC_QT: { QT5: 1.8 } },
    }],
  };
}
// Per-tier-file: QT3 and QT5 scenarios; override belongs on the QT5 file.
function perTierFile() {
  return {
    modifiers: {}, modules: {},
    scenarios: [
      { scenario_id: 'SCN_QT3', matches: { paintable_item: 'c', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT3', coating_type: 'paint' }, modules: [] },
      { scenario_id: 'SCN_QT5', matches: { paintable_item: 'c', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT5', coating_type: 'paint' }, modules: [], modifier_overrides: { FAC_QT: { QT5: 2.0 } } },
    ],
  };
}
const selM = { paintable_item: 'w', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' };
const selP = { paintable_item: 'c', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' };

describe('deriveTierQtFactors', () => {
  it('reports override value+flag for the overridden tier, global default elsewhere', () => {
    const f = deriveTierQtFactors(multiTier(), selM);
    expect(f.QT2).toBeNull();
    expect(f.QT3).toEqual({ scenarioId: 'SCN_M', value: 1.0, isOverride: false });
    expect(f.QT5).toEqual({ scenarioId: 'SCN_M', value: 1.8, isOverride: true });
  });
  it('routes per-tier-file: the QT5 override resolves against the QT5 scenario', () => {
    const f = deriveTierQtFactors(perTierFile(), selP);
    expect(f.QT3).toEqual({ scenarioId: 'SCN_QT3', value: 1.0, isOverride: false });
    expect(f.QT5).toEqual({ scenarioId: 'SCN_QT5', value: 2.0, isOverride: true });
  });
});

describe('setQtFactor / clearQtFactor', () => {
  it('sets a nested override immutably', () => {
    const scn = { scenario_id: 'S' };
    const out = setQtFactor(scn, 'QT4', 1.4);
    expect(out.modifier_overrides).toEqual({ FAC_QT: { QT4: 1.4 } });
    expect(scn.modifier_overrides).toBeUndefined();
  });
  it('merges with an existing FAC_QT map', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_QT: { QT5: 1.8 } } };
    expect(setQtFactor(scn, 'QT4', 1.4).modifier_overrides.FAC_QT).toEqual({ QT4: 1.4, QT5: 1.8 });
  });
  it('clears one tier and prunes empty objects', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_QT: { QT5: 1.8 } } };
    expect(clearQtFactor(scn, 'QT5').modifier_overrides).toBeUndefined();
  });
  it('clear is a no-op when the tier has no override', () => {
    const scn = { scenario_id: 'S' };
    expect(clearQtFactor(scn, 'QT5')).toBe(scn);
  });
});

import { describe, it, expect } from 'vitest';
import { listSubstrates, listDimensions } from '../derive-tier-ladder.js';

// One multi-tier scenario.
function multiTierBundle() {
  return {
    scenarios: [{
      scenario_id: 'SCN_MULTI', domain: 'interior',
      matches: { paintable_item: 'widget', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' },
      modules: ['MOD_PREP_W', 'MOD_FIN_W'],
    }],
    modules: {},
    tasks: {},
    modifiers: {},
  };
}

// Separate per-tier scenario files for one substrate.
function perTierFilesBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_CAB_QT3', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT3', coating_type: 'paint' }, modules: ['MOD_BASE'] },
      { scenario_id: 'SCN_CAB_QT5', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT5', coating_type: 'paint' }, modules: ['MOD_BASE', 'MOD_EXTRA'] },
    ],
    modules: {},
    tasks: {},
    modifiers: {},
  };
}

describe('listSubstrates / listDimensions', () => {
  it('lists distinct interior substrates', () => {
    expect(listSubstrates(multiTierBundle())).toEqual(['widget']);
  });
  it('lists distinct methods, states, coatings for a substrate', () => {
    const d = listDimensions(perTierFilesBundle(), 'cab');
    expect(d.methods).toEqual(['spray']);
    expect(d.states).toEqual(['SS_BARE']);
    expect(d.coatings).toEqual(['paint']);
  });
});

import { describe, it, expect } from 'vitest';
import { planSetStainCoats } from '../vantage-edits.js';

function stainBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_DC_STAIN', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_BARE'], coating_phase: 'stain' },
        modules: ['MOD_APPLY_STAIN'],
        dynamic_coats: { MOD_APPLY_STAIN: { field: 'stain_coats', interstage: 'MOD_IS' } },
        coat_counts: { stain_coats: 1 } },
    ],
    modules: { MOD_APPLY_STAIN: { module_id: 'MOD_APPLY_STAIN', phase: 'apply', tasks: [] } },
    tasks: {}, modifiers: {},
  };
}
const sel = { paintable_item: 'int_dc', substrate_state: 'SS_BARE', coating_phase: 'stain', application_method_stain: 'brush' };

describe('planSetStainCoats', () => {
  it('forks the tier and writes the coat scalar', () => {
    const { scenario } = planSetStainCoats(stainBundle(), sel, 'QT4', 'stain_coats', 2);
    expect(scenario.matches.quality_tier).toBe('QT4');
    expect(scenario.coat_counts.stain_coats).toBe(2);
  });
  it('forks QT3 in place of the baseline (matching paint coats)', () => {
    const { scenario } = planSetStainCoats(stainBundle(), sel, 'QT3', 'stain_coats', 2);
    expect(scenario.matches.quality_tier).toBe('QT3');
    expect(scenario.coat_counts.stain_coats).toBe(2);
  });
  it('clamps to the field range (stain 1..2)', () => {
    expect(planSetStainCoats(stainBundle(), sel, 'QT5', 'stain_coats', 9).scenario.coat_counts.stain_coats).toBe(2);
    expect(planSetStainCoats(stainBundle(), sel, 'QT5', 'stain_coats', 0).scenario.coat_counts.stain_coats).toBe(1);
  });
  it('returns {} when no scenario governs the tier', () => {
    expect(planSetStainCoats({ scenarios: [], modules: {}, tasks: {} }, sel, 'QT4', 'stain_coats', 2)).toEqual({});
  });
});

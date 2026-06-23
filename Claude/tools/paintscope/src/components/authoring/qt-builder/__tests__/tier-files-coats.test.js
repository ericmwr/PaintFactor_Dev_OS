import { describe, it, expect } from 'vitest';
import { setScenarioCoatCount } from '../tier-files.js';

describe('setScenarioCoatCount', () => {
  it('sets the field immutably, cloning coat_counts', () => {
    const scn = { scenario_id: 'S', coat_counts: { stain_coats: 1 }, material_systems: ['SYS_STAIN_OIL'] };
    const next = setScenarioCoatCount(scn, 'stain_coats', 2);
    expect(next).not.toBe(scn);
    expect(next.coat_counts).not.toBe(scn.coat_counts);
    expect(next.coat_counts.stain_coats).toBe(2);
    expect(scn.coat_counts.stain_coats).toBe(1);           // source untouched
    expect(next.material_systems).toBe(scn.material_systems); // other fields shared
  });
  it('creates coat_counts when absent', () => {
    const next = setScenarioCoatCount({ scenario_id: 'S' }, 'clear_coats', 3);
    expect(next.coat_counts).toEqual({ clear_coats: 3 });
  });
  it('returns same ref on no-op', () => {
    const scn = { coat_counts: { stain_coats: 2 } };
    expect(setScenarioCoatCount(scn, 'stain_coats', 2)).toBe(scn);
  });
});

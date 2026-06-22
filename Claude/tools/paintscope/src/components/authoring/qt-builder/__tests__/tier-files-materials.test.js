import { describe, it, expect } from 'vitest';
import { setScenarioMaterial, clearScenarioMaterial } from '../tier-files.js';

// Pattern-classifiable ids: SYS_PRIMER_* → primer, SYS_FF_* → finish (baseRole).
const RBSI = {}; // empty roleBySystemId → classifySystemRole falls back to id-pattern / baseRole
const scn = (systems) => ({ scenario_id: 'SCN_X', matches: {}, material_systems: systems });

describe('setScenarioMaterial', () => {
  it('replaces the element of the given role, preserving order', () => {
    const next = setScenarioMaterial(scn(['SYS_PRIMER_A', 'SYS_FF_A']), 'SYS_FF_B', 'finish', RBSI);
    expect(next.material_systems).toEqual(['SYS_PRIMER_A', 'SYS_FF_B']);
  });
  it('appends when no element of that role exists', () => {
    const next = setScenarioMaterial(scn(['SYS_PRIMER_A']), 'SYS_FF_A', 'finish', RBSI);
    expect(next.material_systems).toEqual(['SYS_PRIMER_A', 'SYS_FF_A']);
  });
  it('returns the same ref on a no-op (value already set)', () => {
    const s = scn(['SYS_PRIMER_A', 'SYS_FF_A']);
    expect(setScenarioMaterial(s, 'SYS_FF_A', 'finish', RBSI)).toBe(s);
  });
  it('does not mutate the source array', () => {
    const src = scn(['SYS_PRIMER_A', 'SYS_FF_A']);
    setScenarioMaterial(src, 'SYS_FF_B', 'finish', RBSI);
    expect(src.material_systems).toEqual(['SYS_PRIMER_A', 'SYS_FF_A']);
  });
});

describe('clearScenarioMaterial', () => {
  it('restores the role element to the baseline system id', () => {
    const next = clearScenarioMaterial(scn(['SYS_PRIMER_A', 'SYS_FF_B']), 'finish', 'SYS_FF_A', RBSI);
    expect(next.material_systems).toEqual(['SYS_PRIMER_A', 'SYS_FF_A']);
  });
  it('removes the role element when baselineSystemId is null', () => {
    const next = clearScenarioMaterial(scn(['SYS_PRIMER_A', 'SYS_FF_B']), 'finish', null, RBSI);
    expect(next.material_systems).toEqual(['SYS_PRIMER_A']);
  });
  it('returns the same ref when already at the baseline value', () => {
    const s = scn(['SYS_PRIMER_A', 'SYS_FF_A']);
    expect(clearScenarioMaterial(s, 'finish', 'SYS_FF_A', RBSI)).toBe(s);
  });
});

import { describe, it, expect } from 'vitest';
import { coatUnits, setFinishCoats, mergeScenarioDrafts, deriveTierCoats } from '../tier-coats.js';

// modulesById phase map
const PH = {
  MOD_SETUP: { phase: 'setup' }, MOD_PREP: { phase: 'prep' }, MOD_PRIME: { phase: 'prime' },
  MOD_FINISH: { phase: 'finish' }, MOD_INTER: { phase: 'interstage' }, MOD_CLEAN: { phase: 'cleanup' },
  MOD_CUTIN_C: { phase: 'apply' }, MOD_CUTIN_T: { phase: 'apply' }, MOD_ROLL: { phase: 'apply' },
};

// Cabinet-style: 2 finish coats with an interstage between
const cabinet = () => ({ scenario_id: 'SCN_CAB', modules: ['MOD_SETUP', 'MOD_PREP', 'MOD_PRIME', 'MOD_FINISH', 'MOD_INTER', 'MOD_FINISH', 'MOD_CLEAN'] });
// Drywall-style: 2 multi-module coats, back-to-back (no interstage)
const drywall = () => ({ scenario_id: 'SCN_DW', modules: ['MOD_PREP', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CLEAN'] });

describe('coatUnits', () => {
  it('counts single-module coat units and the interstage between (prime not counted)', () => {
    const u = coatUnits(cabinet(), PH);
    expect(u.count).toBe(2);
    expect(u.lastUnit).toEqual(['MOD_FINISH']);
    expect(u.interstageBetween).toEqual(['MOD_INTER']);
  });
  it('counts multi-module coat units back-to-back (empty interstage)', () => {
    const u = coatUnits(drywall(), PH);
    expect(u.count).toBe(2);
    expect(u.lastUnit).toEqual(['MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL']);
    expect(u.interstageBetween).toEqual([]);
  });
  it('returns count 0 when there are no apply/finish modules', () => {
    const u = coatUnits({ scenario_id: 'X', modules: ['MOD_PREP', 'MOD_CLEAN'] }, PH);
    expect(u.count).toBe(0);
    expect(u.lastUnit).toEqual([]);
    expect(u.interstageBetween).toEqual([]);
  });
});

describe('setFinishCoats — cabinet (with interstage)', () => {
  it('+1 appends interstage + finish unit', () => {
    const out = setFinishCoats(cabinet(), PH, 3);
    expect(out.modules).toEqual(['MOD_SETUP', 'MOD_PREP', 'MOD_PRIME', 'MOD_FINISH', 'MOD_INTER', 'MOD_FINISH', 'MOD_INTER', 'MOD_FINISH', 'MOD_CLEAN']);
  });
  it('-1 removes the last interstage + finish', () => {
    const out = setFinishCoats(cabinet(), PH, 1);
    expect(out.modules).toEqual(['MOD_SETUP', 'MOD_PREP', 'MOD_PRIME', 'MOD_FINISH', 'MOD_CLEAN']);
  });
  it('clamps below 1 (no-op) and no-ops on equal count', () => {
    const c = cabinet();
    expect(setFinishCoats(c, PH, 0)).toBe(c);
    expect(setFinishCoats(c, PH, 2)).toBe(c);
  });
  it('does not mutate the input', () => {
    const c = cabinet();
    setFinishCoats(c, PH, 3);
    expect(c.modules).toHaveLength(7);
  });
  it('3 -> 1 removes the trailing two coat units in one go', () => {
    const three = setFinishCoats(cabinet(), PH, 3);
    const back = setFinishCoats(three, PH, 1);
    expect(back.modules).toEqual(['MOD_SETUP', 'MOD_PREP', 'MOD_PRIME', 'MOD_FINISH', 'MOD_CLEAN']);
  });
});

describe('setFinishCoats — drywall (multi-module, back-to-back)', () => {
  it('+1 appends the whole coat unit, no interstage', () => {
    const out = setFinishCoats(drywall(), PH, 3);
    expect(out.modules).toEqual(['MOD_PREP', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CLEAN']);
  });
  it('-1 removes the last coat unit', () => {
    const out = setFinishCoats(drywall(), PH, 1);
    expect(out.modules).toEqual(['MOD_PREP', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CLEAN']);
  });
});

describe('mergeScenarioDrafts', () => {
  it('overlays active drafts by scenario_id and appends new; skips published', () => {
    const canon = [{ scenario_id: 'A', v: 1 }, { scenario_id: 'B', v: 1 }];
    const drafts = [
      { id: 'A', status: 'draft', payload: { scenario_id: 'A', v: 2 } },
      { id: 'C', status: 'draft', payload: { scenario_id: 'C', v: 1 } },
      { id: 'B', status: 'published', payload: { scenario_id: 'B', v: 9 } },
    ];
    const out = mergeScenarioDrafts(canon, drafts);
    expect(out.find(s => s.scenario_id === 'A').v).toBe(2);
    expect(out.find(s => s.scenario_id === 'B').v).toBe(1);
    expect(out.find(s => s.scenario_id === 'C').v).toBe(1);
    expect(out).toHaveLength(3);
  });
});

describe('deriveTierCoats', () => {
  it('returns per-tier coat counts; null for unserved tiers', () => {
    const bundle = {
      modules: PH,
      scenarios: [{ scenario_id: 'SCN_CAB', matches: { paintable_item: 'cab', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' }, modules: cabinet().modules }],
    };
    const tc = deriveTierCoats(bundle, { paintable_item: 'cab', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(tc.QT2).toBeNull();
    expect(tc.QT3).toEqual({ scenarioId: 'SCN_CAB', finishCoats: 2, interstageRounds: 1 });
    expect(tc.QT5.finishCoats).toBe(2);
  });
});

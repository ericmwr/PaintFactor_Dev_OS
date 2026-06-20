import { describe, it, expect } from 'vitest';
import { tierId, scenarioTierPin, forkScenarioForTier, forkModuleForTier, addModuleToTier, removeModuleFromTier, moveModule, addTask, removeTask } from '../tier-files.js';
import { forkScenarioForTier as fS, forkModuleForTier as fM, addModuleToTier as aM, addTask as aT } from '../tier-files.js';

describe('tierId', () => {
  it('appends _QT<n> to a baseline id', () => {
    expect(tierId('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE', 'QT4')).toBe('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE_QT4');
    expect(tierId('MOD_APPLY_ARCH_ELEMENT_FINISH', 'QT4')).toBe('MOD_APPLY_ARCH_ELEMENT_FINISH_QT4');
  });
  it('replaces an existing _QT token (mid-id or suffix), idempotent for same tier', () => {
    expect(tierId('SCN_ARCH_ELEMENT_NC_QT3_BRUSH_FROM_BARE', 'QT4')).toBe('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE_QT4');
    expect(tierId('MOD_X_QT4', 'QT4')).toBe('MOD_X_QT4');
    expect(tierId('MOD_X_QT4', 'QT5')).toBe('MOD_X_QT5');
  });
});

describe('scenarioTierPin', () => {
  it('returns null for a baseline (no quality_tier)', () => {
    expect(scenarioTierPin({ matches: { paintable_item: 'x' } })).toBeNull();
    expect(scenarioTierPin({})).toBeNull();
  });
  it('returns the single pinned tier (string or 1-element array)', () => {
    expect(scenarioTierPin({ matches: { quality_tier: 'QT4' } })).toBe('QT4');
    expect(scenarioTierPin({ matches: { quality_tier: ['QT4'] } })).toBe('QT4');
  });
  it('returns null for a multi-tier match', () => {
    expect(scenarioTierPin({ matches: { quality_tier: ['QT3', 'QT4'] } })).toBeNull();
  });
});

describe('forkScenarioForTier', () => {
  it('clones a baseline into a tier-pinned fork without mutating the baseline', () => {
    const base = { scenario_id: 'SCN_B', name: 'B', matches: { paintable_item: 'x' }, modules: ['A', 'B'] };
    const { scenario, created } = forkScenarioForTier(base, 'QT4');
    expect(created).toBe(true);
    expect(scenario.scenario_id).toBe('SCN_B_QT4');
    expect(scenario.matches).toEqual({ paintable_item: 'x', quality_tier: 'QT4' });
    expect(scenario.modules).toEqual(['A', 'B']);
    expect(scenario.modules).not.toBe(base.modules);      // cloned array
    expect(base.matches.quality_tier).toBeUndefined();    // baseline untouched
  });
  it('is a no-op (same ref, created false) when already pinned to that tier', () => {
    const s = { scenario_id: 'SCN_B_QT4', matches: { quality_tier: 'QT4' }, modules: [] };
    const r = forkScenarioForTier(s, 'QT4');
    expect(r.created).toBe(false);
    expect(r.scenario).toBe(s);
  });
});

describe('forkModuleForTier', () => {
  const scn = { scenario_id: 'SCN_B_QT4', matches: { quality_tier: 'QT4' }, modules: ['MOD_X', 'MOD_Y'] };
  const src = { module_id: 'MOD_X', phase: 'apply', tasks: [{ task_ref: 'T1' }, { task_ref: 'T2' }] };

  it('clones the module to a tier id and swaps the scenario reference', () => {
    const { scenario, module, created } = forkModuleForTier(scn, 'MOD_X', src, 'QT4');
    expect(created).toBe(true);
    expect(module.module_id).toBe('MOD_X_QT4');
    expect(module.phase).toBe('apply');
    expect(module.tasks).toEqual([{ task_ref: 'T1' }, { task_ref: 'T2' }]);
    expect(scenario.modules).toEqual(['MOD_X_QT4', 'MOD_Y']);   // first occurrence swapped, order kept
  });
  it('does not mutate the source scenario or module', () => {
    forkModuleForTier(scn, 'MOD_X', src, 'QT4');
    expect(scn.modules).toEqual(['MOD_X', 'MOD_Y']);
    expect(src.module_id).toBe('MOD_X');
    expect(src.tasks).toEqual([{ task_ref: 'T1' }, { task_ref: 'T2' }]);
  });
  it('is a no-op when the module already pins that tier', () => {
    const s2 = { ...scn, modules: ['MOD_X_QT4', 'MOD_Y'] };
    const src2 = { module_id: 'MOD_X_QT4', phase: 'apply', tasks: [] };
    const r = forkModuleForTier(s2, 'MOD_X_QT4', src2, 'QT4');
    expect(r.created).toBe(false);
    expect(r.scenario).toBe(s2);
    expect(r.module).toBe(src2);
  });
});

describe('module composition', () => {
  const scn = { scenario_id: 'S', modules: ['A', 'B', 'C'] };

  it('appends a module by default and inserts at an index', () => {
    expect(addModuleToTier(scn, 'D').modules).toEqual(['A', 'B', 'C', 'D']);
    expect(addModuleToTier(scn, 'D', 1).modules).toEqual(['A', 'D', 'B', 'C']);
    expect(scn.modules).toEqual(['A', 'B', 'C']);          // unmutated
  });
  it('allows repeats (for coats)', () => {
    expect(addModuleToTier(scn, 'B').modules).toEqual(['A', 'B', 'C', 'B']);
  });
  it('removes the first occurrence; no-op (same ref) when absent', () => {
    expect(removeModuleFromTier(scn, 'B').modules).toEqual(['A', 'C']);
    expect(removeModuleFromTier(scn, 'Z')).toBe(scn);
  });
  it('reorders; no-op (same ref) for out-of-range or equal indices', () => {
    expect(moveModule(scn, 0, 2).modules).toEqual(['B', 'C', 'A']);
    expect(moveModule(scn, 1, 1)).toBe(scn);
    expect(moveModule(scn, 0, 9)).toBe(scn);
  });
});

describe('task composition', () => {
  const mod = { module_id: 'MOD_X_QT4', phase: 'apply', tasks: [{ task_ref: 'T1' }] };

  it('appends a plain { task_ref } with NO applies_when', () => {
    const out = addTask(mod, 'T2');
    expect(out.tasks).toEqual([{ task_ref: 'T1' }, { task_ref: 'T2' }]);
    expect(out.tasks[1].applies_when).toBeUndefined();
    expect(mod.tasks).toEqual([{ task_ref: 'T1' }]);       // unmutated
  });
  it('dedups by task_ref (same ref on no-op)', () => {
    expect(addTask(mod, 'T1')).toBe(mod);
  });
  it('removes by task_ref; same ref when absent', () => {
    expect(removeTask(mod, 'T1').tasks).toEqual([]);
    expect(removeTask(mod, 'Z')).toBe(mod);
  });
});

describe('fork→edit composition smoke', () => {
  it('forks a baseline to QT5, forks a module, adds a task, and adds a whole module — sources untouched', () => {
    const baseline = { scenario_id: 'SCN_BASE', matches: { paintable_item: 'x', application_method: 'brush' }, modules: ['MOD_PREP', 'MOD_APPLY'] };
    const applyMod = { module_id: 'MOD_APPLY', phase: 'apply', tasks: [{ task_ref: 'T_COAT' }] };

    // 1) QT5 needs its own scenario.
    const { scenario: s1, created: c1 } = fS(baseline, 'QT5');
    expect(c1).toBe(true);
    expect(s1.matches.quality_tier).toBe('QT5');

    // 2) QT5's apply module needs an extra task → fork it + swap the ref.
    const { scenario: s2, module: m2 } = fM(s1, 'MOD_APPLY', applyMod, 'QT5');
    expect(s2.modules).toEqual(['MOD_PREP', 'MOD_APPLY_QT5']);
    const m3 = aT(m2, 'T_EXTRA_SAND');
    expect(m3.tasks.map(t => t.task_ref)).toEqual(['T_COAT', 'T_EXTRA_SAND']);

    // 3) QT5 also needs a whole extra module the baseline lacks.
    const s3 = aM(s2, 'MOD_INSPECT');
    expect(s3.modules).toEqual(['MOD_PREP', 'MOD_APPLY_QT5', 'MOD_INSPECT']);

    // Sources are pristine — baseline and the shared module never changed.
    expect(baseline.matches.quality_tier).toBeUndefined();
    expect(baseline.modules).toEqual(['MOD_PREP', 'MOD_APPLY']);
    expect(applyMod.tasks).toEqual([{ task_ref: 'T_COAT' }]);
  });
});

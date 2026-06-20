import { describe, it, expect } from 'vitest';
import { planAddTask, planRemoveTask, planAddModule, planRemoveModule, planSetCoats, planRevertTier } from '../vantage-edits.js';

function bundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_B',
        matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' },
        modules: ['MOD_PREP', 'MOD_APPLY'] },
    ],
    modules: {
      MOD_PREP:  { module_id: 'MOD_PREP',  phase: 'prep',  name: 'Prep',  tasks: [{ task_ref: 'T_SAND' }] },
      MOD_APPLY: { module_id: 'MOD_APPLY', phase: 'apply', name: 'Apply', tasks: [{ task_ref: 'T_COAT' }] },
    },
    tasks: { T_SAND: { name: 'Sand' }, T_COAT: { name: 'Coat' }, T_EXTRA: { name: 'Extra' } },
  };
}
const sel = { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' };

describe('planAddTask', () => {
  it('forks the baseline scenario AND the shared module, swaps the ref, adds the task — sources untouched', () => {
    const b = bundle();
    const { scenario, module } = planAddTask(b, sel, 'QT5', 'MOD_APPLY', 'T_EXTRA');
    expect(scenario.scenario_id).toBe('SCN_B_QT5');
    expect(scenario.matches.quality_tier).toBe('QT5');
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY_QT5']);     // shared module ref swapped to the fork
    expect(module.module_id).toBe('MOD_APPLY_QT5');
    expect(module.tasks.map(t => t.task_ref)).toEqual(['T_COAT', 'T_EXTRA']);
    expect(module.tasks[1].applies_when).toBeUndefined();               // no applies_when.quality_tier
    expect(b.scenarios[0].matches.quality_tier).toBeUndefined();        // baseline untouched
    expect(b.modules.MOD_APPLY.tasks).toEqual([{ task_ref: 'T_COAT' }]); // shared module untouched
  });
});

describe('planRemoveTask', () => {
  it('forks scenario + module and removes the task from the fork', () => {
    const b = bundle();
    const { scenario, module } = planRemoveTask(b, sel, 'QT5', 'MOD_APPLY', 'T_COAT');
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY_QT5']);
    expect(module.module_id).toBe('MOD_APPLY_QT5');
    expect(module.tasks).toEqual([]);
  });
  it('returns {} when the base module is not in the tier scenario', () => {
    expect(planRemoveTask(bundle(), sel, 'QT5', 'MOD_NOPE', 'T')).toEqual({});
  });
});

describe('planAddModule / planRemoveModule', () => {
  it('forks the scenario and appends a whole module at the tier', () => {
    const b = bundle();
    b.modules.MOD_GLAZE = { module_id: 'MOD_GLAZE', phase: 'finish', name: 'Glaze', tasks: [] };
    const { scenario } = planAddModule(b, sel, 'QT5', 'MOD_GLAZE');
    expect(scenario.scenario_id).toBe('SCN_B_QT5');
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY', 'MOD_GLAZE']);
  });
  it('forks the scenario and removes a module at the tier', () => {
    const { scenario } = planRemoveModule(bundle(), sel, 'QT5', 'MOD_PREP');
    expect(scenario.modules).toEqual(['MOD_APPLY']);
  });
  it('planAddModule returns {} for a module not in the library', () => {
    expect(planAddModule(bundle(), sel, 'QT5', 'MOD_GHOST')).toEqual({});
  });
  it('planRemoveModule returns {} when the base module is absent', () => {
    expect(planRemoveModule(bundle(), sel, 'QT5', 'MOD_NOPE')).toEqual({});
  });
});

describe('planSetCoats', () => {
  it('repeats the module to reach N (coats up)', () => {
    const { scenario } = planSetCoats(bundle(), sel, 'QT5', 'MOD_APPLY', 3);
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY', 'MOD_APPLY', 'MOD_APPLY']);
  });
  it('removes repeats to reach N (coats down)', () => {
    const b = bundle();
    b.scenarios = [{ ...b.scenarios[0], modules: ['MOD_PREP', 'MOD_APPLY', 'MOD_APPLY', 'MOD_APPLY'] }];
    const { scenario } = planSetCoats(b, sel, 'QT5', 'MOD_APPLY', 1);
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY']);
  });
  it('returns {} for n < 1', () => {
    expect(planSetCoats(bundle(), sel, 'QT5', 'MOD_APPLY', 0)).toEqual({});
  });
});

describe('planRevertTier', () => {
  it('returns the fork scenario id + its _QT module ids to delete', () => {
    const b = bundle();
    b.scenarios.push({ scenario_id: 'SCN_B_QT5', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT5' }, modules: ['MOD_PREP', 'MOD_APPLY_QT5'] });
    b.modules.MOD_APPLY_QT5 = { module_id: 'MOD_APPLY_QT5', phase: 'apply', name: 'Apply QT5', tasks: [] };
    expect(planRevertTier(b, sel, 'QT5')).toEqual({ deleteScenarioId: 'SCN_B_QT5', deleteModuleIds: ['MOD_APPLY_QT5'] });
  });
  it('returns {} when the tier is served by the baseline (nothing to revert)', () => {
    expect(planRevertTier(bundle(), sel, 'QT5')).toEqual({});
  });
});

describe('composition smoke', () => {
  it('add-task then revert names the same fork files; baseline stays pristine', () => {
    const b = bundle();
    const add = planAddTask(b, sel, 'QT4', 'MOD_APPLY', 'T_EXTRA');
    expect(add.scenario.scenario_id).toBe('SCN_B_QT4');
    expect(add.module.module_id).toBe('MOD_APPLY_QT4');
    // Simulate those drafts now overlaying the bundle, then revert.
    const b2 = { ...b, scenarios: [...b.scenarios, add.scenario], modules: { ...b.modules, [add.module.module_id]: add.module } };
    expect(planRevertTier(b2, sel, 'QT4')).toEqual({ deleteScenarioId: 'SCN_B_QT4', deleteModuleIds: ['MOD_APPLY_QT4'] });
    expect(b.scenarios[0].matches.quality_tier).toBeUndefined();
  });
});

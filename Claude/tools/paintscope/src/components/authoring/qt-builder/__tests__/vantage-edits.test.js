import { describe, it, expect } from 'vitest';
import { planAddTask, planRemoveTask } from '../vantage-edits.js';

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

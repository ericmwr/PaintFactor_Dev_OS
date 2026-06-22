import { describe, it, expect } from 'vitest';
import { runScenarioEstimate } from '../run-estimate-scenario.js';

// Minimal bundle: one scenario, one apply module repeated via dynamic_coats.
// Note: engine reads task.ps_key (snake_case), not psKey.
function bundle(scenario, modules) {
  return { scenarios: [scenario], modules };
}
const APPLY = {
  module_id: 'MOD_T_APPLY', phase: 'apply',
  tasks: [{ task_ref: 'TSK_T' }],
  modifier_eligibility: { qt: false, height: false, texture: false, complexity: false, condition: false },
};
const TASKS = { TSK_T: { task_id: 'TSK_T', name: 't', phase: 'apply', uom: 'LF', rate_per_hour: 10, ps_key: 'PS_SURFACE_LF.T' } };

const scn = (extra) => ({
  scenario_id: 'SCN_T', matches: { paintable_item: 'thing' },
  modules: ['MOD_T_APPLY'],
  dynamic_coats: { MOD_T_APPLY: { field: 'clear_coats' } },
  ...extra,
});

describe('dynamic_coats count fallback', () => {
  it('uses scenario.coat_counts when ctx lacks the field', () => {
    const b = bundle(scn({ coat_counts: { clear_coats: 3 } }), { MOD_T_APPLY: APPLY });
    const r = runScenarioEstimate({ scenarioBundle: { ...b, tasks: TASKS }, ctx: { paintable_item: 'thing', quality_tier: 'QT3' }, roomQty: new Map([['PS_SURFACE_LF.T', { value: 10 }]]) });
    // 3 apply reps expected → TSK_T appears 3 times.
    expect(r.tasks.filter(t => t.taskId === 'TSK_T').length).toBe(3);
  });
  it('ctx field still wins when present', () => {
    const b = bundle(scn({ coat_counts: { clear_coats: 3 } }), { MOD_T_APPLY: APPLY });
    const r = runScenarioEstimate({ scenarioBundle: { ...b, tasks: TASKS }, ctx: { paintable_item: 'thing', quality_tier: 'QT3', clear_coats: 1 }, roomQty: new Map([['PS_SURFACE_LF.T', { value: 10 }]]) });
    expect(r.tasks.filter(t => t.taskId === 'TSK_T').length).toBe(1);
  });
  it('ctx field 0 still skips (preserves bundled behavior)', () => {
    const b = bundle(scn({ coat_counts: { clear_coats: 3 } }), { MOD_T_APPLY: APPLY });
    const r = runScenarioEstimate({ scenarioBundle: { ...b, tasks: TASKS }, ctx: { paintable_item: 'thing', quality_tier: 'QT3', clear_coats: 0 }, roomQty: new Map([['PS_SURFACE_LF.T', { value: 10 }]]) });
    expect(r.tasks.filter(t => t.taskId === 'TSK_T').length).toBe(0);
  });
  it('defaults to 1 when neither ctx nor coat_counts present', () => {
    const b = bundle(scn({}), { MOD_T_APPLY: APPLY });
    const r = runScenarioEstimate({ scenarioBundle: { ...b, tasks: TASKS }, ctx: { paintable_item: 'thing', quality_tier: 'QT3' }, roomQty: new Map([['PS_SURFACE_LF.T', { value: 10 }]]) });
    expect(r.tasks.filter(t => t.taskId === 'TSK_T').length).toBe(1);
  });
});

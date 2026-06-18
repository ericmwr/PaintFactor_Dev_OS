import { describe, it, expect } from 'vitest';
import { runScenarioEstimate } from '../run-estimate-scenario.js';
import { computeScenarioModifierStack } from '../run-estimate-scenario.js';

// Synthetic bundle: one apply module repeated via dynamic_coats with an
// interstage module interleaved between coats. coat_counts_by_tier sets the
// per-tier coat count via the ctx field `finish_coats`.
function makeCoatBundle() {
  return {
    modules: {
      MOD_APPLY: { module_id: 'MOD_APPLY', phase: 'finish', tasks: [{ task_ref: 'TSK_APPLY' }], modifier_eligibility: {} },
      MOD_INTER: { module_id: 'MOD_INTER', phase: 'interstage', tasks: [{ task_ref: 'TSK_INTER' }], modifier_eligibility: {} },
    },
    scenarios: [{
      scenario_id: 'SCN_COAT',
      matches: { paintable_item: 'test' },
      modules: ['MOD_APPLY'],
      dynamic_coats: { MOD_APPLY: { field: 'finish_coats', interstage: 'MOD_INTER' } },
      coat_counts_by_tier: { QT3: { finish_coats: 2 }, QT5: { finish_coats: 3 } },
    }],
    modifiers: {},
    tasks: {
      TSK_APPLY: { task_id: 'TSK_APPLY', name: 'Apply', ps_key: 'PS_TEST.X', uom: 'SF', skill_level: 'experienced', rate_per_hour: 100 },
      TSK_INTER: { task_id: 'TSK_INTER', name: 'Interstage', ps_key: 'PS_TEST.X', uom: 'SF', skill_level: 'experienced', rate_per_hour: 200 },
    },
  };
}

function ctxFor(tier) {
  return {
    paintable_item: 'test', quality_tier: tier, application_method: 'brush',
    substrate_state: null, complexity: 'STD', height_band: 'STD', surface_texture: 'smooth',
    pass_group_id: null, pass_group_substrates: null, pass_type: null,
  };
}

function counts(result) {
  return {
    apply: result.tasks.filter(t => t.taskId === 'TSK_APPLY').length,
    inter: result.tasks.filter(t => t.taskId === 'TSK_INTER').length,
  };
}

describe('coat_counts_by_tier', () => {
  const roomQty = () => new Map([['PS_TEST.X', { value: 100, uom: 'SF' }]]);

  it('QT3 → 2 coats and 1 interstage round', () => {
    const r = runScenarioEstimate({ scenarioBundle: makeCoatBundle(), ctx: ctxFor('QT3'), roomQty: roomQty(), roomIndex: 0, roomLabel: 'R1' });
    expect(counts(r)).toEqual({ apply: 2, inter: 1 });
  });

  it('QT5 → 3 coats and 2 interstage rounds (one knob drives both)', () => {
    const r = runScenarioEstimate({ scenarioBundle: makeCoatBundle(), ctx: ctxFor('QT5'), roomQty: roomQty(), roomIndex: 0, roomLabel: 'R1' });
    expect(counts(r)).toEqual({ apply: 3, inter: 2 });
  });
});

describe('scenario-scoped modifier_overrides', () => {
  const bundle = { modifiers: { FAC_QT: { factors: { QT3: 1.0, QT5: 1.5 }, default: 'QT3' } } };
  const moduleEl = { modifier_eligibility: { qt: true } };
  const ctx = { quality_tier: 'QT5', height_band: 'STD', surface_texture: 'smooth', complexity: 'STD', substrate_condition: 'fair' };

  it('uses the global FAC_QT factor when no override is given', () => {
    const stack = computeScenarioModifierStack(moduleEl, ctx, null, bundle);
    expect(stack.qt).toBe(1.5);
  });

  it('uses the scenario override over the global factor', () => {
    const stack = computeScenarioModifierStack(moduleEl, ctx, null, bundle, null, { FAC_QT: { QT5: 1.8 } });
    expect(stack.qt).toBe(1.8);
  });

  it('task fac_qt_override still wins over the scenario override (precedence)', () => {
    const task = { fac_qt_override: { QT5: 2.0 } };
    const stack = computeScenarioModifierStack(moduleEl, ctx, null, bundle, task, { FAC_QT: { QT5: 1.8 } });
    expect(stack.qt).toBe(2.0);
  });
});

import { describe, it, expect } from 'vitest';
import { resolvePassGroups } from '../pass-groups.js';
import { buildScenarioInputs } from '../context-adapter.js';

describe('resolvePassGroups', () => {
  it('returns empty array for a minimal room (no groups yet)', () => {
    const room = { substrates: {} };
    const project = {};
    const result = resolvePassGroups(room, project, null);
    expect(result).toEqual([]);
  });

  it('returns an array even when inputs are null/undefined', () => {
    expect(resolvePassGroups(null, null, null)).toEqual([]);
    expect(resolvePassGroups(undefined, undefined, undefined)).toEqual([]);
  });
});

// A minimal bundle with one deprecated scenario and one live scenario.
function makeTestBundle() {
  return {
    modules: {
      MOD_TEST: {
        module_id: 'MOD_TEST',
        phase: 'apply',
        tasks: [{ task_ref: 'TSK_TEST' }],
        modifier_eligibility: {},
      },
    },
    scenarios: [
      {
        scenario_id: 'SCN_DEPRECATED',
        status: 'deprecated',
        matches: { paintable_item: 'test' },
        modules: ['MOD_TEST'],
      },
      {
        scenario_id: 'SCN_LIVE',
        matches: { paintable_item: 'test' },
        modules: ['MOD_TEST'],
      },
    ],
    modifiers: {},
    tasks: {
      TSK_TEST: {
        task_id: 'TSK_TEST', name: 'Test Task', ps_key: 'PS_TEST.X',
        uom: 'EA', skill_level: 'experienced', rate_per_hour: 100,
      },
    },
  };
}

describe('findMatchingScenario deprecated-scenario skip', () => {
  it('skips scenarios with status: "deprecated" silently', async () => {
    const { runScenarioEstimate } = await import('../run-estimate-scenario.js');
    const bundle = makeTestBundle();
    const ctx = {
      paintable_item: 'test',
      quality_tier: 'QT3', application_method: 'brush', substrate_state: null,
      complexity: 'STD', height_band: 'STD', texture: 'smooth',
      pass_group_id: null, pass_group_substrates: null, pass_type: null,
    };
    const roomQty = new Map([['PS_TEST.X', { value: 10, uom: 'EA' }]]);
    const result = runScenarioEstimate({
      scenarioBundle: bundle, ctx, roomQty,
      roomIndex: 0, roomLabel: 'R1',
    });
    expect(result.scenarioId).toBe('SCN_LIVE');
    // No warning about deprecation — silent skip
    const deprecWarnings = result.warnings.filter(w => w.includes('deprecated'));
    expect(deprecWarnings).toEqual([]);
  });
});

describe('buildScenarioInputs with pass-group fields', () => {
  it('adds explicit-null pass-group fields to every ctx when no groups form', () => {
    // Minimal fixture: one room, walls substrate only.
    const state = {
      project: {
        name: 'test',
        default_quality_tier: 'QT3',
        default_application_method: 'spray_backroll',
        new_construction: true,
        default_substrates: ['walls'],
      },
      rooms: [
        {
          id: 'r1',
          label: 'Test Room',
          length_ft: 10,
          width_ft: 10,
          height_ft: 9,
          substrates: {
            walls: { substrate_state: 'bare_drywall', texture: 'smooth' },
          },
        },
      ],
    };
    const result = buildScenarioInputs(state, null);
    expect(result.roomInputs.length).toBeGreaterThan(0);
    for (const input of result.roomInputs) {
      expect(input.ctx).toHaveProperty('pass_group_id', null);
      expect(input.ctx).toHaveProperty('pass_group_substrates', null);
      expect(input.ctx).toHaveProperty('pass_type', null);
    }
  });
});

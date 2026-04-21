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

describe('resolvePassGroups combined-prime precheck', () => {
  const baseRoom = {
    substrates: {
      walls: {
        substrate_state: 'bare_drywall',
        application_method: 'spray_backroll',
      },
      ceiling: {
        substrate_state: 'bare_drywall',
        application_method: 'spray_backroll',
      },
    },
    quality_tier: 'QT3',
  };
  const baseProject = {
    default_combined_prime: true,
    default_quality_tier: 'QT3',
    default_application_method: 'spray_backroll',
    new_construction: true,
  };

  it('forms a combined-prime group when all conditions met', () => {
    const groups = resolvePassGroups(baseRoom, baseProject, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].group_id).toBe('walls_ceiling_prime_combined');
    expect(groups[0].substrates).toEqual(['walls', 'ceiling']);
    expect(groups[0].pass_type).toBe('prime');
    expect(groups[0].source).toBe('project_flag');
    expect(groups[0].metadata.prime_mode).toBe('combined');
  });

  it('returns [] when combined-prime flag is off', () => {
    const project = { ...baseProject, default_combined_prime: false };
    expect(resolvePassGroups(baseRoom, project, null)).toEqual([]);
  });

  it('returns [] when walls substrate is missing', () => {
    const room = { ...baseRoom, substrates: { ceiling: baseRoom.substrates.ceiling } };
    expect(resolvePassGroups(room, baseProject, null)).toEqual([]);
  });

  it('returns [] when ceiling substrate is missing', () => {
    const room = { ...baseRoom, substrates: { walls: baseRoom.substrates.walls } };
    expect(resolvePassGroups(room, baseProject, null)).toEqual([]);
  });

  it('returns [] when walls and ceiling substrate_state differ', () => {
    const room = {
      ...baseRoom,
      substrates: {
        walls: { ...baseRoom.substrates.walls, substrate_state: 'bare_drywall' },
        ceiling: { ...baseRoom.substrates.ceiling, substrate_state: 'primed_factory' },
      },
    };
    expect(resolvePassGroups(room, baseProject, null)).toEqual([]);
  });

  it('returns [] when application_method is not spray_backroll', () => {
    const project = { ...baseProject, default_application_method: 'brush_roll' };
    const room = {
      ...baseRoom,
      substrates: {
        walls: { ...baseRoom.substrates.walls, application_method: 'brush_roll' },
        ceiling: { ...baseRoom.substrates.ceiling, application_method: 'brush_roll' },
      },
    };
    expect(resolvePassGroups(room, project, null)).toEqual([]);
  });

  it('room-level combined_prime_override="separate" suppresses the group', () => {
    const room = { ...baseRoom, combined_prime_override: 'separate' };
    expect(resolvePassGroups(room, baseProject, null)).toEqual([]);
  });

  it('room-level combined_prime_override="combined" creates the group even when project flag is off', () => {
    const project = { ...baseProject, default_combined_prime: false };
    const room = { ...baseRoom, combined_prime_override: 'combined' };
    const groups = resolvePassGroups(room, project, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].group_id).toBe('walls_ceiling_prime_combined');
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

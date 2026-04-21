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

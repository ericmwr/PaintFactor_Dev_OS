import { describe, it, expect } from 'vitest';
import { defaultFinishGroupForCoatingType, createSubstrateConfig } from '../../state/initial-state.js';
import { migrateInline } from '../../state/migrations.js';

describe('defaultFinishGroupForCoatingType', () => {
  it('returns C for paint', () => {
    expect(defaultFinishGroupForCoatingType('paint')).toBe('C');
  });
  it('returns D for stain_clear, stain_only, clear_only', () => {
    expect(defaultFinishGroupForCoatingType('stain_clear')).toBe('D');
    expect(defaultFinishGroupForCoatingType('stain_only')).toBe('D');
    expect(defaultFinishGroupForCoatingType('clear_only')).toBe('D');
  });
  it('returns C for null or unknown', () => {
    expect(defaultFinishGroupForCoatingType(null)).toBe('C');
    expect(defaultFinishGroupForCoatingType(undefined)).toBe('C');
    expect(defaultFinishGroupForCoatingType('weird_value')).toBe('C');
  });
});

describe('createSubstrateConfig seeds finish_group', () => {
  it('paint items default to C (baseboard, coating_type=paint)', () => {
    const cfg = createSubstrateConfig('baseboard');
    expect(cfg.finish_group).toBe('C');
  });
  it('stain_clear items default to D', () => {
    const cfg = createSubstrateConfig('door_frames', { coating_type: 'stain_clear', substrate_state: 'bare_wood' });
    expect(cfg.finish_group).toBe('D');
  });
  it('walls and ceiling do NOT carry finish_group through createSubstrateConfig (driven externally)', () => {
    const walls = createSubstrateConfig('walls');
    const ceiling = createSubstrateConfig('ceiling');
    expect(walls.finish_group).toBeUndefined();
    expect(ceiling.finish_group).toBeUndefined();
  });
  it('explicit override in overrides wins over auto-seed', () => {
    const cfg = createSubstrateConfig('baseboard', { finish_group: 'E' });
    expect(cfg.finish_group).toBe('E');
  });
});

describe('v1.7 migration — finish_group seeding', () => {
  it('seeds finish_group on existing non-wall/ceiling substrates based on coating_type', () => {
    const state = {
      rooms: [{
        id: 'room_1', label: 'R',
        substrates: {
          walls:        { substrate_state: 'bare_drywall' },
          ceiling:      { substrate_state: 'bare_drywall' },
          baseboard:    { substrate_state: 'factory_primed', coating_type: 'paint' },
          door_frames:  { substrate_state: 'bare_wood', coating_type: 'stain_clear' },
        },
        closets: [], openings: [], extra_walls: [], wall_deductions: [],
      }],
      project: {},
      colors: {},
      exterior: { defaults: {} },
    };
    const out = migrateInline(state);
    expect(out.rooms[0].substrates.baseboard.finish_group).toBe('C');
    expect(out.rooms[0].substrates.door_frames.finish_group).toBe('D');
    // walls/ceiling never get finish_group via this migration (driven externally)
    expect(out.rooms[0].substrates.walls.finish_group).toBeUndefined();
    expect(out.rooms[0].substrates.ceiling.finish_group).toBeUndefined();
  });

  it('does NOT overwrite existing finish_group values', () => {
    const state = {
      rooms: [{
        id: 'room_1', label: 'R',
        substrates: {
          baseboard: { substrate_state: 'factory_primed', coating_type: 'paint', finish_group: 'E' },
        },
        closets: [], openings: [], extra_walls: [], wall_deductions: [],
      }],
      project: {},
      colors: {},
      exterior: { defaults: {} },
    };
    const out = migrateInline(state);
    expect(out.rooms[0].substrates.baseboard.finish_group).toBe('E');
  });
});

import { reducer } from '../../state/reducer.js';

describe('SET_SUBSTRATE coating_type flip re-seeds finish_group', () => {
  function baseState() {
    return {
      rooms: [{
        id: 'room_1', label: 'R',
        substrates: {
          door_frames: { substrate_state: 'bare_wood', coating_type: 'paint', finish_group: 'C' },
        },
      }],
      project: { default_quality_tier: 'QT3' },
    };
  }

  it('paint (C) → stain_clear reseeds to D', () => {
    const s = baseState();
    const out = reducer(s, {
      type: 'SET_SUBSTRATE',
      payload: { roomId: 'room_1', substrateId: 'door_frames', field: 'coating_type', value: 'stain_clear' },
    });
    expect(out.rooms[0].substrates.door_frames.finish_group).toBe('D');
  });

  it('stain_clear (D) → paint reseeds to C', () => {
    const s = baseState();
    s.rooms[0].substrates.door_frames.coating_type = 'stain_clear';
    s.rooms[0].substrates.door_frames.finish_group = 'D';
    const out = reducer(s, {
      type: 'SET_SUBSTRATE',
      payload: { roomId: 'room_1', substrateId: 'door_frames', field: 'coating_type', value: 'paint' },
    });
    expect(out.rooms[0].substrates.door_frames.finish_group).toBe('C');
  });

  it('manual override (E) is preserved across coating_type flip', () => {
    const s = baseState();
    s.rooms[0].substrates.door_frames.finish_group = 'E';
    const out = reducer(s, {
      type: 'SET_SUBSTRATE',
      payload: { roomId: 'room_1', substrateId: 'door_frames', field: 'coating_type', value: 'stain_clear' },
    });
    expect(out.rooms[0].substrates.door_frames.finish_group).toBe('E');
  });
});

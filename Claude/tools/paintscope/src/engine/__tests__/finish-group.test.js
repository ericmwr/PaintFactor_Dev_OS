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

import { resolvePassGroups } from '../pass-groups.js';

describe('resolveItemAssignmentGroups', () => {
  function baseRoom(substrates) {
    return { substrates };
  }

  it('emits a group when 2+ items share finish_group C', () => {
    const room = baseRoom({
      baseboard:   { finish_group: 'C', coating_type: 'paint' },
      door_casing: { finish_group: 'C', coating_type: 'paint' },
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    expect(fgGroups).toHaveLength(1);
    expect(fgGroups[0].substrates.sort()).toEqual(['baseboard', 'door_casing']);
    expect(fgGroups[0].pass_type).toBe('finish');
    expect(fgGroups[0].metadata?.finish_group).toBe('C');
  });

  it('emits TWO groups when items split across C and D', () => {
    const room = baseRoom({
      baseboard:   { finish_group: 'C', coating_type: 'paint' },
      door_casing: { finish_group: 'C', coating_type: 'paint' },
      door_frames: { finish_group: 'D', coating_type: 'stain_clear' },
      window_jamb: { finish_group: 'D', coating_type: 'stain_clear' },
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    expect(fgGroups).toHaveLength(2);
    const cGroup = fgGroups.find(g => g.metadata.finish_group === 'C');
    const dGroup = fgGroups.find(g => g.metadata.finish_group === 'D');
    expect(cGroup.substrates.sort()).toEqual(['baseboard', 'door_casing']);
    expect(dGroup.substrates.sort()).toEqual(['door_frames', 'window_jamb']);
  });

  it('SKIPS singletons (group with only 1 member)', () => {
    const room = baseRoom({
      baseboard:   { finish_group: 'C', coating_type: 'paint' },
      door_casing: { finish_group: 'C', coating_type: 'paint' },
      door_frames: { finish_group: 'D', coating_type: 'stain_clear' },  // singleton
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    expect(fgGroups).toHaveLength(1);
    expect(fgGroups[0].metadata.finish_group).toBe('C');
  });

  it('EXCLUDES walls and ceiling from item-assignment grouping', () => {
    const room = baseRoom({
      walls:       { finish_group: 'A' },
      ceiling:     { finish_group: 'A' },
      baseboard:   { finish_group: 'A', coating_type: 'paint' },
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    // baseboard in A with no other non-wall/ceiling members = singleton, skipped
    expect(fgGroups).toHaveLength(0);
  });

  it('IGNORES items with null or undefined finish_group', () => {
    const room = baseRoom({
      baseboard:   { finish_group: null, coating_type: 'paint' },
      door_casing: { coating_type: 'paint' },  // no finish_group at all
      crown:       { finish_group: 'C', coating_type: 'paint' },
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    expect(fgGroups).toHaveLength(0);  // only crown has C; singleton
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

describe('resolvePassGroups precedence — pre-authored vs dynamic', () => {
  it('both pre-authored walls_ceiling_finish_combined AND dynamic finish_group fire when applicable', () => {
    const room = {
      combined_wc_finish_override: 'combined',
      substrates: {
        walls:       { substrate_state: 'bare_drywall', application_method: 'spray_backroll', quality_tier: 'QT3' },
        ceiling:     { substrate_state: 'bare_drywall', application_method: 'spray_backroll', quality_tier: 'QT3' },
        baseboard:   { finish_group: 'C', coating_type: 'paint' },
        door_casing: { finish_group: 'C', coating_type: 'paint' },
        crown:       { finish_group: 'C', coating_type: 'paint' },
      },
    };
    const project = { default_combined_wc_finish: true };
    const groups = resolvePassGroups(room, project, null);

    const wc = groups.find(g => g.group_id === 'walls_ceiling_finish_combined');
    const fg = groups.find(g => g.group_id === 'finish_group_assignment');

    expect(wc).toBeDefined();
    expect(wc.substrates.sort()).toEqual(['ceiling', 'walls']);

    expect(fg).toBeDefined();
    expect(fg.substrates.sort()).toEqual(['baseboard', 'crown', 'door_casing']);
    // Walls and ceiling must NOT appear in the dynamic group
    expect(fg.substrates).not.toContain('walls');
    expect(fg.substrates).not.toContain('ceiling');
  });
});

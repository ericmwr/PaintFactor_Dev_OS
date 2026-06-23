import { describe, it, expect } from 'vitest';
import { migrateInline } from '../migrations.js';
import { initialState } from '../initial-state.js';

describe('material_overrides — byRole / byFinishGroup backfill', () => {
  it('initialState seeds material_overrides with byRole and byFinishGroup empties', () => {
    const p = initialState.project;
    expect(p.material_overrides).toEqual({ system: {}, manual: [], byRole: {}, byFinishGroup: {} });
  });
  it('migrates an old project missing material_overrides entirely', () => {
    const state = { project: { name: 'X' }, rooms: [] };
    migrateInline(state);
    expect(state.project.material_overrides).toBeDefined();
    expect(state.project.material_overrides.system).toEqual({});
    expect(Array.isArray(state.project.material_overrides.manual)).toBe(true);
    expect(state.project.material_overrides.byRole).toEqual({});
    expect(state.project.material_overrides.byFinishGroup).toEqual({});
  });
  it('migrates an old project with material_overrides but no byRole/byFinishGroup', () => {
    const state = { project: { name: 'X', material_overrides: { system: { SF_X: 'SYS_X' }, manual: [{ id: 'm1' }] } }, rooms: [] };
    migrateInline(state);
    expect(state.project.material_overrides.system).toEqual({ SF_X: 'SYS_X' });  // preserved
    expect(state.project.material_overrides.manual).toEqual([{ id: 'm1' }]);     // preserved
    expect(state.project.material_overrides.byRole).toEqual({});                  // added
    expect(state.project.material_overrides.byFinishGroup).toEqual({});           // added
  });
  it('does not overwrite existing byRole / byFinishGroup values on re-migration', () => {
    const state = { project: { material_overrides: { system: {}, manual: [], byRole: { clear_system: 'SYS_X' }, byFinishGroup: { D: { stain_coats: 2 } } } }, rooms: [] };
    migrateInline(state);
    expect(state.project.material_overrides.byRole).toEqual({ clear_system: 'SYS_X' });
    expect(state.project.material_overrides.byFinishGroup).toEqual({ D: { stain_coats: 2 } });
  });
});

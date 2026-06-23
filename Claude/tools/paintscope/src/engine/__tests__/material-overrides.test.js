import { describe, it, expect } from 'vitest';
import { resolveSystem, resolveCoats } from '../material-overrides.js';

describe('resolveSystem', () => {
  it('falls through to scenarioSystem when overrides is null/empty', () => {
    expect(resolveSystem('clear', 'D', null, 'SYS_FILE')).toBe('SYS_FILE');
    expect(resolveSystem('clear', 'D', {}, 'SYS_FILE')).toBe('SYS_FILE');
    expect(resolveSystem('clear', 'D', { byRole: {}, byFinishGroup: {} }, 'SYS_FILE')).toBe('SYS_FILE');
  });
  it('uses project default (byRole) when finish-group has no entry', () => {
    const o = { byRole: { clear_system: 'SYS_PROJECT' }, byFinishGroup: {} };
    expect(resolveSystem('clear', 'D', o, 'SYS_FILE')).toBe('SYS_PROJECT');
  });
  it('finish-group overrides project default', () => {
    const o = {
      byRole: { clear_system: 'SYS_PROJECT' },
      byFinishGroup: { D: { clear_system: 'SYS_GROUP' } },
    };
    expect(resolveSystem('clear', 'D', o, 'SYS_FILE')).toBe('SYS_GROUP');
    // Different group falls through to project default
    expect(resolveSystem('clear', 'E', o, 'SYS_FILE')).toBe('SYS_PROJECT');
  });
  it('null override at a layer falls through (does not block)', () => {
    const o = {
      byRole: { clear_system: 'SYS_PROJECT' },
      byFinishGroup: { D: { clear_system: null } },  // explicit null = no override
    };
    expect(resolveSystem('clear', 'D', o, 'SYS_FILE')).toBe('SYS_PROJECT');
  });
  it('handles null finishGroup gracefully (no group → only project default + file)', () => {
    const o = { byRole: { clear_system: 'SYS_PROJECT' }, byFinishGroup: { D: { clear_system: 'SYS_GROUP' } } };
    expect(resolveSystem('clear', null, o, 'SYS_FILE')).toBe('SYS_PROJECT');
  });
  it('works the same for paint roles (primer / finish)', () => {
    const o = { byRole: { primer_system: 'SYS_PROJECT_PRIMER' }, byFinishGroup: { C: { finish_system: 'SYS_GROUP_FINISH' } } };
    expect(resolveSystem('primer', 'C', o, 'SYS_FILE_PRIMER')).toBe('SYS_PROJECT_PRIMER');
    expect(resolveSystem('finish', 'C', o, 'SYS_FILE_FINISH')).toBe('SYS_GROUP_FINISH');
  });
});

describe('resolveCoats', () => {
  it('falls through to scenarioCoats when no overrides', () => {
    expect(resolveCoats('clear', 'D', null, 2)).toBe(2);
    expect(resolveCoats('clear', 'D', { byRole: {}, byFinishGroup: {} }, 2)).toBe(2);
  });
  it('layers byFinishGroup > byRole > scenarioCoats', () => {
    const o = {
      byRole: { clear_coats: 2 },
      byFinishGroup: { D: { clear_coats: 3 } },
    };
    expect(resolveCoats('clear', 'D', o, 1)).toBe(3);
    expect(resolveCoats('clear', 'E', o, 1)).toBe(2);
    expect(resolveCoats('clear', null, o, 1)).toBe(2);
  });
  it('handles 0 as a valid coat count (sealer can be 0)', () => {
    const o = { byRole: { sealer_coats: 0 }, byFinishGroup: {} };
    expect(resolveCoats('sealer', 'D', o, 1)).toBe(0);
  });
  it('null override falls through (not 0, not undefined-as-zero)', () => {
    const o = { byRole: {}, byFinishGroup: { D: { clear_coats: null } } };
    expect(resolveCoats('clear', 'D', o, 2)).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';
import { mergeModuleDrafts, setTierMembership, addTaskEntry } from '../edit-tier-ladder.js';

const mod = () => ({
  module_id: 'MOD_X', phase: 'prep',
  tasks: [
    { task_ref: 'TSK_A' },
    { task_ref: 'TSK_B', applies_when: { application_method: ['brush'] } },
  ],
});

describe('mergeModuleDrafts', () => {
  it('overlays active drafts by id and skips published', () => {
    const canon = { MOD_X: { module_id: 'MOD_X', phase: 'prep', tasks: [] } };
    const drafts = [
      { id: 'MOD_X', status: 'draft', payload: { module_id: 'MOD_X', phase: 'prep', tasks: [{ task_ref: 'TSK_A' }] } },
      { id: 'MOD_Y', status: 'published', payload: { module_id: 'MOD_Y' } },
    ];
    const out = mergeModuleDrafts(canon, drafts);
    expect(out.MOD_X.tasks).toEqual([{ task_ref: 'TSK_A' }]);
    expect(out.MOD_Y).toBeUndefined();
  });
});

describe('setTierMembership', () => {
  it('writes an explicit subset when not all served tiers fire', () => {
    const out = setTierMembership(mod(), 'TSK_A', ['QT4', 'QT5'], ['QT3', 'QT4', 'QT5']);
    expect(out.tasks[0]).toEqual({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT4', 'QT5'] } });
  });
  it('removes the quality_tier key when it fires at all served tiers, preserving other keys', () => {
    const out = setTierMembership(mod(), 'TSK_B', ['QT3', 'QT4', 'QT5'], ['QT3', 'QT4', 'QT5']);
    expect(out.tasks[1]).toEqual({ task_ref: 'TSK_B', applies_when: { application_method: ['brush'] } });
  });
  it('removes the entry entirely when no served tier fires', () => {
    const out = setTierMembership(mod(), 'TSK_A', [], ['QT3', 'QT4', 'QT5']);
    expect(out.tasks.find(t => t.task_ref === 'TSK_A')).toBeUndefined();
    expect(out.tasks).toHaveLength(1);
  });
  it('does not mutate the input module', () => {
    const m = mod();
    setTierMembership(m, 'TSK_A', ['QT5'], ['QT3', 'QT4', 'QT5']);
    expect(m.tasks[0]).toEqual({ task_ref: 'TSK_A' });
  });
  it('is a no-op for a task not in the module', () => {
    const m = mod();
    expect(setTierMembership(m, 'TSK_ZZZ', ['QT5'], ['QT3', 'QT4', 'QT5'])).toBe(m);
  });
});

describe('addTaskEntry', () => {
  it('appends a gated entry', () => {
    const out = addTaskEntry(mod(), 'TSK_NEW', ['QT5']);
    expect(out.tasks[out.tasks.length - 1]).toEqual({ task_ref: 'TSK_NEW', applies_when: { quality_tier: ['QT5'] } });
  });
  it('is a no-op when the task is already present', () => {
    const m = mod();
    expect(addTaskEntry(m, 'TSK_A', ['QT5'])).toBe(m);
  });
  it('appends an ungated entry when tiers is empty', () => {
    const out = addTaskEntry(mod(), 'TSK_NEW', []);
    expect(out.tasks[out.tasks.length - 1]).toEqual({ task_ref: 'TSK_NEW' });
  });
});

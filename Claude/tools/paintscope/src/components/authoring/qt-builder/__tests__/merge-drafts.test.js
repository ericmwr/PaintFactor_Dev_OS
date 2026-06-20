import { describe, it, expect } from 'vitest';
import { mergeModuleDrafts, mergeScenarioDrafts } from '../merge-drafts.js';

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

describe('mergeScenarioDrafts', () => {
  it('overlays active drafts by scenario_id and appends new; skips published', () => {
    const canon = [{ scenario_id: 'A', v: 1 }, { scenario_id: 'B', v: 1 }];
    const drafts = [
      { id: 'A', status: 'draft', payload: { scenario_id: 'A', v: 2 } },
      { id: 'C', status: 'draft', payload: { scenario_id: 'C', v: 1 } },
      { id: 'B', status: 'published', payload: { scenario_id: 'B', v: 9 } },
    ];
    const out = mergeScenarioDrafts(canon, drafts);
    expect(out.find(s => s.scenario_id === 'A').v).toBe(2);
    expect(out.find(s => s.scenario_id === 'B').v).toBe(1);
    expect(out.find(s => s.scenario_id === 'C').v).toBe(1);
    expect(out).toHaveLength(3);
  });
});

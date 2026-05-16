import { describe, it, expect } from 'vitest';
import { pruneStaleRateOverrides } from '../migrations.js';

function makeTasks(tasks) {
  return tasks;
}

describe('pruneStaleRateOverrides', () => {
  it('keeps overrides for tasks that still exist and use rate_per_hour', () => {
    const tasks = makeTasks({
      TSK_A: { task_id: 'TSK_A', rate_per_hour: 80 },
    });
    const state = { project: { rate_overrides: { TSK_A: { rate_per_hour: 95, ts: 1000 } } } };
    const result = pruneStaleRateOverrides(state, tasks);
    expect(result.project.rate_overrides.TSK_A).toEqual({ rate_per_hour: 95, ts: 1000 });
    expect(result._lastRateOverridePruneReport).toBeUndefined();
  });

  it('drops overrides for tasks not in the bundle (archived/missing)', () => {
    const tasks = makeTasks({});
    const state = { project: { rate_overrides: { TSK_ARCHIVED: { rate_per_hour: 95, ts: 1000 } } } };
    const result = pruneStaleRateOverrides(state, tasks);
    expect(result.project.rate_overrides.TSK_ARCHIVED).toBeUndefined();
    expect(result._lastRateOverridePruneReport.dropped).toEqual([
      { task_id: 'TSK_ARCHIVED', reason: 'task archived/missing' },
    ]);
  });

  it('drops overrides for tasks that no longer use flat rate_per_hour', () => {
    const tasks = makeTasks({
      TSK_TIER: { task_id: 'TSK_TIER', rates_by_tier: { QT3: 80, QT4: 75, QT5: 70 } },
      TSK_FIXED: { task_id: 'TSK_FIXED', fixed_minutes: 5 },
      TSK_RATES: { task_id: 'TSK_RATES', rates: [{ rate_per_hour: 80 }] },
      TSK_COAT: { task_id: 'TSK_COAT', rates_by_coat: { '1': 80, '2': 65 } },
    });
    const state = {
      project: {
        rate_overrides: {
          TSK_TIER: { rate_per_hour: 95, ts: 1000 },
          TSK_FIXED: { rate_per_hour: 10, ts: 1000 },
          TSK_RATES: { rate_per_hour: 90, ts: 1000 },
          TSK_COAT: { rate_per_hour: 85, ts: 1000 },
        },
      },
    };
    const result = pruneStaleRateOverrides(state, tasks);
    expect(result.project.rate_overrides).toEqual({});
    expect(result._lastRateOverridePruneReport.dropped.length).toBe(4);
    expect(result._lastRateOverridePruneReport.dropped.every(d => d.reason === 'task no longer uses flat rate_per_hour')).toBe(true);
  });

  it('is a no-op when rate_overrides is empty or missing', () => {
    const tasks = makeTasks({ TSK_A: { task_id: 'TSK_A', rate_per_hour: 80 } });
    const result1 = pruneStaleRateOverrides({ project: { rate_overrides: {} } }, tasks);
    expect(result1.project.rate_overrides).toEqual({});
    expect(result1._lastRateOverridePruneReport).toBeUndefined();

    const result2 = pruneStaleRateOverrides({ project: {} }, tasks);
    expect(result2).toEqual({ project: {} });
  });

  it('does not mutate the input state', () => {
    const tasks = makeTasks({});
    const state = { project: { rate_overrides: { TSK_GONE: { rate_per_hour: 95, ts: 1000 } } } };
    const snapshot = JSON.stringify(state);
    pruneStaleRateOverrides(state, tasks);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

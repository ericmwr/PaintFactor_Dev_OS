import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reducer } from '../reducer.js';

function makeState(rateOverrides = {}) {
  return {
    rooms: [],
    project: {
      name: 'test',
      rate_overrides: rateOverrides,
    },
    ui: {},
  };
}

describe('reducer SET_RATE_OVERRIDE', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T12:00:00Z'));
  });

  it('sets a new override entry with rate_per_hour and ts', () => {
    const state = makeState({});
    const action = { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF', rate_per_hour: 95 } };
    const next = reducer(state, action);
    expect(next.project.rate_overrides.TSK_BRUSH_COAT_LF).toEqual({
      rate_per_hour: 95,
      ts: new Date('2026-05-16T12:00:00Z').getTime(),
    });
  });

  it('overwrites an existing override and updates ts', () => {
    const state = makeState({ TSK_BRUSH_COAT_LF: { rate_per_hour: 80, ts: 1000 } });
    const action = { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF', rate_per_hour: 95 } };
    const next = reducer(state, action);
    expect(next.project.rate_overrides.TSK_BRUSH_COAT_LF.rate_per_hour).toBe(95);
    expect(next.project.rate_overrides.TSK_BRUSH_COAT_LF.ts).toBeGreaterThan(1000);
  });

  it('treats zero or null rate_per_hour as a clear', () => {
    const state = makeState({ TSK_BRUSH_COAT_LF: { rate_per_hour: 80, ts: 1000 } });
    const next1 = reducer(state, { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF', rate_per_hour: 0 } });
    expect(next1.project.rate_overrides.TSK_BRUSH_COAT_LF).toBeUndefined();

    const next2 = reducer(state, { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF', rate_per_hour: null } });
    expect(next2.project.rate_overrides.TSK_BRUSH_COAT_LF).toBeUndefined();
  });

  it('preserves other overrides when setting one', () => {
    const state = makeState({
      TSK_A: { rate_per_hour: 80, ts: 1000 },
      TSK_B: { rate_per_hour: 50, ts: 1000 },
    });
    const next = reducer(state, { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_C', rate_per_hour: 30 } });
    expect(Object.keys(next.project.rate_overrides).sort()).toEqual(['TSK_A', 'TSK_B', 'TSK_C']);
    expect(next.project.rate_overrides.TSK_A.rate_per_hour).toBe(80);
    expect(next.project.rate_overrides.TSK_B.rate_per_hour).toBe(50);
  });
});

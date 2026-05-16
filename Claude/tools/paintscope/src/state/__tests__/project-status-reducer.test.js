import { describe, it, expect } from 'vitest';
import { reducer } from '../reducer.js';

function makeState(project = {}) {
  return {
    rooms: [],
    project: { name: 'test', status: 'draft', tracker_roster: [], ...project },
    ui: {},
  };
}

describe('reducer SET_PROJECT_STATUS', () => {
  it('updates the project status', () => {
    const state = makeState();
    const next = reducer(state, { type: 'SET_PROJECT_STATUS', payload: 'in_progress' });
    expect(next.project.status).toBe('in_progress');
  });

  it('ignores invalid status values', () => {
    const state = makeState({ status: 'estimate' });
    const next = reducer(state, { type: 'SET_PROJECT_STATUS', payload: 'bogus' });
    expect(next).toBe(state);
  });

  it('accepts all five canonical statuses', () => {
    const state = makeState();
    for (const s of ['draft', 'estimated', 'approved', 'in_progress', 'completed']) {
      const next = reducer(state, { type: 'SET_PROJECT_STATUS', payload: s });
      expect(next.project.status).toBe(s);
    }
  });
});

describe('reducer APPEND_ROSTER_NAME', () => {
  it('appends a new name to the roster', () => {
    const state = makeState({ tracker_roster: ['John'] });
    const next = reducer(state, { type: 'APPEND_ROSTER_NAME', payload: 'Mike' });
    expect(next.project.tracker_roster).toEqual(['John', 'Mike']);
  });

  it('does not duplicate an existing name (case-insensitive)', () => {
    const state = makeState({ tracker_roster: ['John'] });
    const next1 = reducer(state, { type: 'APPEND_ROSTER_NAME', payload: 'John' });
    expect(next1.project.tracker_roster).toEqual(['John']);
    const next2 = reducer(state, { type: 'APPEND_ROSTER_NAME', payload: 'john' });
    expect(next2.project.tracker_roster).toEqual(['John']);
  });

  it('ignores empty or whitespace-only names', () => {
    const state = makeState({ tracker_roster: ['John'] });
    const next1 = reducer(state, { type: 'APPEND_ROSTER_NAME', payload: '' });
    const next2 = reducer(state, { type: 'APPEND_ROSTER_NAME', payload: '  ' });
    expect(next1).toBe(state);
    expect(next2).toBe(state);
  });

  it('trims whitespace before saving', () => {
    const state = makeState({ tracker_roster: [] });
    const next = reducer(state, { type: 'APPEND_ROSTER_NAME', payload: '  Mike  ' });
    expect(next.project.tracker_roster).toEqual(['Mike']);
  });
});

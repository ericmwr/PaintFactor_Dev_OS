import { describe, it, expect } from 'vitest';
import {
  computeRoomCompletion,
  computeActivityCompletion,
  sumLoggedHours,
  sumStageLoggedHours,
  computeStageCompletion,
} from '../rollup.js';

const activity = {
  activity_id: 'act_test',
  rooms: [
    { room_id: 'room_0', room_label: 'A', estimated_hours: 2 },
    { room_id: 'room_1', room_label: 'B', estimated_hours: 6 },
  ],
};

describe('computeRoomCompletion', () => {
  it('returns 0 when no entries touch the room', () => {
    expect(computeRoomCompletion('room_0', [])).toBe(0);
  });

  it('returns latest entry`s pct for the room (room mode)', () => {
    const entries = [
      { id: '1', created_at: '2026-05-15T10:00:00Z', mode: 'rooms', room_progress: { room_0: { complete: false, pct: 30 } } },
      { id: '2', created_at: '2026-05-16T10:00:00Z', mode: 'rooms', room_progress: { room_0: { complete: false, pct: 60 } } },
    ];
    expect(computeRoomCompletion('room_0', entries)).toBe(60);
  });

  it('uses project_completion_pct from latest project-mode entry as fallback', () => {
    const entries = [
      { id: '1', created_at: '2026-05-15T10:00:00Z', mode: 'project', project_completion_pct: 75 },
    ];
    expect(computeRoomCompletion('room_0', entries)).toBe(75);
  });

  it('room-mode wins over older project-mode entry', () => {
    const entries = [
      { id: '1', created_at: '2026-05-15T10:00:00Z', mode: 'project', project_completion_pct: 50 },
      { id: '2', created_at: '2026-05-16T10:00:00Z', mode: 'rooms', room_progress: { room_0: { complete: false, pct: 80 } } },
    ];
    expect(computeRoomCompletion('room_0', entries)).toBe(80);
  });

  it('older room-mode entry stays put when newer entry does not touch this room', () => {
    const entries = [
      { id: '1', created_at: '2026-05-15T10:00:00Z', mode: 'rooms', room_progress: { room_0: { complete: false, pct: 40 } } },
      { id: '2', created_at: '2026-05-16T10:00:00Z', mode: 'rooms', room_progress: { room_1: { complete: true, pct: 100 } } },
    ];
    expect(computeRoomCompletion('room_0', entries)).toBe(40);
  });
});

describe('computeActivityCompletion', () => {
  it('returns 0 when no entries exist', () => {
    expect(computeActivityCompletion(activity, [])).toBe(0);
  });

  it('uses latest project-mode entry when present', () => {
    const entries = [
      { id: '1', created_at: '2026-05-16T10:00:00Z', mode: 'project', project_completion_pct: 75 },
    ];
    expect(computeActivityCompletion(activity, entries)).toBe(75);
  });

  it('computes weighted average of per-room completions when no project entry', () => {
    const entries = [
      { id: '1', created_at: '2026-05-15T10:00:00Z', mode: 'rooms', room_progress: { room_0: { complete: true, pct: 100 }, room_1: { complete: false, pct: 50 } } },
    ];
    // (100 * 2 + 50 * 6) / (2 + 6) = (200 + 300) / 8 = 62.5
    expect(computeActivityCompletion(activity, entries)).toBe(62.5);
  });

  it('handles activity with no rooms gracefully', () => {
    const noRoomActivity = { activity_id: 'act_a', rooms: [] };
    expect(computeActivityCompletion(noRoomActivity, [])).toBe(0);
  });
});

describe('sumStageLoggedHours', () => {
  const entries = [
    { hours: 1, stage: 'install' },
    { hours: 2, stage: 'install' },
    { hours: 0.5, stage: 'remove' },
    { hours: 4 },
  ];

  it('sums only entries tagged with the matching stage', () => {
    expect(sumStageLoggedHours('install', entries)).toBe(3);
    expect(sumStageLoggedHours('remove', entries)).toBe(0.5);
  });

  it('returns 0 when no entries match the stage', () => {
    expect(sumStageLoggedHours('install', [])).toBe(0);
    expect(sumStageLoggedHours('remove', [{ hours: 4 }])).toBe(0);
  });
});

describe('computeStageCompletion', () => {
  it('returns 0 for a stage with no estimated hours', () => {
    expect(computeStageCompletion({ stage: 'install', estimated_hours: 0 }, [])).toBe(0);
  });

  it('returns the logged/estimated ratio rounded to the nearest integer percent', () => {
    const stage = { stage: 'install', estimated_hours: 4 };
    const entries = [{ hours: 1, stage: 'install' }, { hours: 2, stage: 'install' }];
    expect(computeStageCompletion(stage, entries)).toBe(75);
  });

  it('caps at 100 when overlogged', () => {
    const stage = { stage: 'remove', estimated_hours: 2 };
    const entries = [{ hours: 5, stage: 'remove' }];
    expect(computeStageCompletion(stage, entries)).toBe(100);
  });

  it('ignores entries tagged with a different stage', () => {
    const stage = { stage: 'install', estimated_hours: 4 };
    const entries = [{ hours: 3, stage: 'remove' }];
    expect(computeStageCompletion(stage, entries)).toBe(0);
  });
});

describe('sumLoggedHours', () => {
  it('returns 0 for no entries', () => {
    expect(sumLoggedHours([])).toBe(0);
  });

  it('sums hours across entries', () => {
    const entries = [
      { hours: 2.5 }, { hours: 1.0 }, { hours: 3.75 },
    ];
    expect(sumLoggedHours(entries)).toBe(7.25);
  });

  it('ignores missing/null/undefined hours', () => {
    const entries = [
      { hours: 2 }, { hours: null }, { hours: undefined }, { hours: 1 },
    ];
    expect(sumLoggedHours(entries)).toBe(3);
  });
});

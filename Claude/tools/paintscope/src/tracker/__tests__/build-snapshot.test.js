import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSnapshot } from '../build-snapshot.js';

// Minimal fake estimate shape — matches the keys buildSnapshot reads.
function fakeEstimate(tasks) {
  return {
    specResults: [
      {
        specId: 'SF_FAKE',
        specName: 'Fake spec',
        tasks: tasks.map(t => ({
          taskId: t.taskId,
          taskName: t.taskName || t.taskId,
          phase: t.phase,
          hours: t.hours,
          roomIndex: t.roomIndex ?? 0,
          roomLabel: t.roomLabel ?? `Room ${t.roomIndex ?? 0}`,
          substrate: t.substrate,
        })),
      },
    ],
  };
}

const FAKE_PROJECT = { name: 'Test Project' };
const FAKE_PROJECT_ID = 'proj_test';

describe('buildSnapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('returns a snapshot with project_id, project_name, taken_at, and total hours', () => {
    const estimate = fakeEstimate([
      { taskId: 'TSK_SPACKLE_BASEBOARD', phase: 'prep', hours: 2, substrate: 'baseboard' },
    ]);
    const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    expect(snap.project_id).toBe('proj_test');
    expect(snap.project_name).toBe('Test Project');
    expect(snap.taken_at).toBe('2026-05-16T12:00:00.000Z');
    expect(snap.total_estimated_hours).toBe(2);
  });

  it('merges tasks with same activity name + same element parent into one activity', () => {
    // CAULK_JOINTS rule matches all three task IDs → they collapse into the
    // 'Caulk Joints' activity on the trim element parent.
    const estimate = fakeEstimate([
      { taskId: 'TSK_CAULK_JOINTS_BASEBOARD',   phase: 'prep', hours: 1, substrate: 'baseboard' },
      { taskId: 'TSK_CAULK_JOINTS_CASING_DOOR', phase: 'prep', hours: 2, substrate: 'door_casing' },
      { taskId: 'TSK_CAULK_JOINTS_CROWN',       phase: 'prep', hours: 3, substrate: 'crown' },
    ]);
    const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    const trimCaulk = snap.activities.find(a => a.activity_name === 'Caulk Joints' && a.element_parent === 'trim');
    expect(trimCaulk).toBeDefined();
    expect(trimCaulk.estimated_hours).toBe(6);
    expect(trimCaulk.contributing_tasks.length).toBe(3);
  });

  it('merges walls + ceilings into drywall_prep for prep phase', () => {
    const estimate = fakeEstimate([
      { taskId: 'TSK_SPACKLE_WALL',    phase: 'prep', hours: 2, substrate: 'walls' },
      { taskId: 'TSK_SPACKLE_CEILING', phase: 'prep', hours: 1, substrate: 'ceiling' },
    ]);
    const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    const drywallPrep = snap.activities.find(a => a.element_parent === 'drywall_prep');
    expect(drywallPrep).toBeDefined();
    expect(drywallPrep.estimated_hours).toBe(3);
  });

  it('keeps walls + ceilings SEPARATE for finish phase', () => {
    const estimate = fakeEstimate([
      { taskId: 'TSK_ROLL_FINISH_WALL',     phase: 'finish', hours: 4, substrate: 'walls' },
      { taskId: 'TSK_SPRAY_FINISH_CEILING', phase: 'finish', hours: 2, substrate: 'ceiling' },
    ]);
    const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    expect(snap.activities.find(a => a.element_parent === 'walls')).toBeDefined();
    expect(snap.activities.find(a => a.element_parent === 'ceilings')).toBeDefined();
    expect(snap.activities.find(a => a.element_parent === 'drywall_prep')).toBeUndefined();
  });

  it('falls back to task name as activity when no activity-rule matches', () => {
    const estimate = fakeEstimate([
      { taskId: 'TSK_NO_RULE_MATCH', taskName: 'Custom unmapped task', phase: 'prep', hours: 1, substrate: 'baseboard' },
    ]);
    const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    expect(snap.activities[0].activity_name).toBe('Custom unmapped task');
  });

  it('sums per-room hours within an activity', () => {
    const estimate = fakeEstimate([
      { taskId: 'TSK_SPACKLE_BASEBOARD', phase: 'prep', hours: 1, substrate: 'baseboard', roomIndex: 0, roomLabel: 'Master' },
      { taskId: 'TSK_SPACKLE_BASEBOARD', phase: 'prep', hours: 2, substrate: 'baseboard', roomIndex: 1, roomLabel: 'Kitchen' },
    ]);
    const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    const act = snap.activities[0];
    expect(act.rooms.length).toBe(2);
    const master = act.rooms.find(r => r.room_label === 'Master');
    const kitchen = act.rooms.find(r => r.room_label === 'Kitchen');
    expect(master.estimated_hours).toBe(1);
    expect(kitchen.estimated_hours).toBe(2);
  });

  it('produces empty activities array for empty estimate', () => {
    const snap = buildSnapshot(fakeEstimate([]), FAKE_PROJECT, FAKE_PROJECT_ID);
    expect(snap.activities).toEqual([]);
    expect(snap.total_estimated_hours).toBe(0);
  });

  it('stamps a stable activity_id based on (element_parent, phase, activity_name)', () => {
    const estimate = fakeEstimate([
      { taskId: 'TSK_SPACKLE_BASEBOARD', phase: 'prep', hours: 1, substrate: 'baseboard' },
    ]);
    const snap1 = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    const snap2 = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    expect(snap1.activities[0].activity_id).toBe(snap2.activities[0].activity_id);
  });
});

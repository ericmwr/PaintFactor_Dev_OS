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

  describe('lifecycle stages', () => {
    function protectionEstimate(tasks) {
      return {
        specResults: [
          {
            specId: 'SF_ROOM_PROTECTION',
            specName: 'Room Protection',
            tasks: tasks.map(t => ({
              taskId: t.taskId,
              taskName: t.taskName || t.taskId,
              phase: t.phase,
              hours: t.hours,
              roomIndex: t.roomIndex ?? 0,
              roomLabel: t.roomLabel ?? `Room ${t.roomIndex ?? 0}`,
            })),
          },
        ],
      };
    }

    it('emits a stages array on lifecycle activities with both install + remove', () => {
      const snap = buildSnapshot(protectionEstimate([
        { taskId: 'TSK_MASK_OUTLET_SWITCH_INSTALL',  phase: 'setup',   hours: 1 },
        { taskId: 'TSK_MASK_OUTLET_SWITCH_REMOVE',   phase: 'cleanup', hours: 1 },
        { taskId: 'TSK_PREP_OUTLET_COVER_REINSTALL', phase: 'cleanup', hours: 2 },
        { taskId: 'TSK_PREP_OUTLET_COVER_REMOVE',    phase: 'setup',   hours: 2 },
      ]), FAKE_PROJECT, FAKE_PROJECT_ID);

      const outlet = snap.activities.find(a => a.activity_name === 'Outlet/Switch Cover Cycle');
      expect(outlet).toBeDefined();
      expect(outlet.stages).toBeDefined();
      expect(outlet.stages).toHaveLength(2);

      const install = outlet.stages.find(s => s.stage === 'install');
      const remove  = outlet.stages.find(s => s.stage === 'remove');
      expect(install.estimated_hours).toBe(3);
      expect(remove.estimated_hours).toBe(3);
    });

    it('tags stage on each contributing_task entry', () => {
      const snap = buildSnapshot(protectionEstimate([
        { taskId: 'TSK_MASK_OUTLET_SWITCH_INSTALL', phase: 'setup',   hours: 1 },
        { taskId: 'TSK_MASK_OUTLET_SWITCH_REMOVE',  phase: 'cleanup', hours: 1 },
      ]), FAKE_PROJECT, FAKE_PROJECT_ID);

      const outlet = snap.activities.find(a => a.activity_name === 'Outlet/Switch Cover Cycle');
      const byId = Object.fromEntries(outlet.contributing_tasks.map(t => [t.task_id, t]));
      expect(byId.TSK_MASK_OUTLET_SWITCH_INSTALL.stage).toBe('install');
      expect(byId.TSK_MASK_OUTLET_SWITCH_REMOVE.stage).toBe('remove');
    });

    it('does not emit stages array when activity has only one stage', () => {
      const snap = buildSnapshot(protectionEstimate([
        { taskId: 'TSK_MASK_WALL_FIXTURES', phase: 'setup', hours: 2 },
      ]), FAKE_PROJECT, FAKE_PROJECT_ID);

      const wallFixture = snap.activities.find(a => a.activity_name === 'Wall Fixture Mask Cycle');
      expect(wallFixture).toBeDefined();
      expect(wallFixture.stages).toBeUndefined();
    });

    it('does not emit stages array when activity has no stage at all', () => {
      const estimate = fakeEstimate([
        { taskId: 'TSK_CAULK_JOINTS_BASEBOARD', phase: 'prep', hours: 1, substrate: 'baseboard' },
      ]);
      const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
      const caulk = snap.activities.find(a => a.activity_name === 'Caulk Joints');
      expect(caulk).toBeDefined();
      expect(caulk.stages).toBeUndefined();
      expect(caulk.contributing_tasks[0].stage).toBeNull();
    });

    it('generic pairing: install + remove with the same taskName base merge into one staged activity', () => {
      const snap = buildSnapshot(protectionEstimate([
        { taskId: 'TSK_MASK_TOILET_INSTALL', taskName: 'Toilet Mask — Install', phase: 'setup',   hours: 0.4 },
        { taskId: 'TSK_MASK_TOILET_REMOVE',  taskName: 'Toilet Mask — Remove',  phase: 'cleanup', hours: 0.2 },
      ]), FAKE_PROJECT, FAKE_PROJECT_ID);

      const toilet = snap.activities.find(a => a.activity_name === 'Toilet Mask');
      expect(toilet).toBeDefined();
      expect(toilet.stages).toHaveLength(2);
      expect(toilet.stages.find(s => s.stage === 'install').estimated_hours).toBeCloseTo(0.4, 5);
      expect(toilet.stages.find(s => s.stage === 'remove').estimated_hours).toBeCloseTo(0.2, 5);
    });

    it('generic pairing: leading-verb taskNames ("Install Foo" / "Remove Foo") also merge', () => {
      const snap = buildSnapshot(protectionEstimate([
        { taskId: 'TSK_PROTECT_FLOOR_PARTIAL_INSTALL', taskName: 'Install Floor Partial Drop', phase: 'setup',   hours: 0.2 },
        { taskId: 'TSK_PROTECT_FLOOR_PARTIAL_REMOVE',  taskName: 'Remove Floor Partial Drop',  phase: 'cleanup', hours: 0.1 },
      ]), FAKE_PROJECT, FAKE_PROJECT_ID);

      const drop = snap.activities.find(a => a.activity_name === 'Floor Partial Drop');
      expect(drop).toBeDefined();
      expect(drop.stages).toHaveLength(2);
    });

    it('cabinet remove+reinstall pairs route to project_protection and stage-merge', () => {
      const estimate = fakeEstimate([
        { taskId: 'TSK_CABT_DOOR_REMOVE',    taskName: 'Remove Cabinet Doors',    phase: 'setup',   hours: 2.0, substrate: 'cabinets' },
        { taskId: 'TSK_CABT_DOOR_REINSTALL', taskName: 'Reinstall Cabinet Doors', phase: 'cleanup', hours: 1.6, substrate: 'cabinets' },
      ]);
      const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);

      const doors = snap.activities.find(a => a.activity_name === 'Cabinet Doors');
      expect(doors).toBeDefined();
      expect(doors.element_parent).toBe('project_protection');
      expect(doors.stages).toHaveLength(2);

      // Cabinet PAINTING tasks still land in 'cabinets' (not protection).
      const paintingEstimate = fakeEstimate([
        { taskId: 'TSK_CABT_BRUSH_FINISH', taskName: 'Brush Finish Cabinets', phase: 'finish', hours: 4, substrate: 'cabinets' },
      ]);
      const paintSnap = buildSnapshot(paintingEstimate, FAKE_PROJECT, FAKE_PROJECT_ID);
      expect(paintSnap.activities[0].element_parent).toBe('cabinets');
    });

    it('cabinet/closet protection mask SETUP+TEARDOWN pairs route + stage-merge', () => {
      const estimate = fakeEstimate([
        { taskId: 'TSK_CABT_PROT_ENCAP_SETUP',    taskName: 'Mask Cabinets — Encapsulate (setup)', phase: 'setup',   hours: 2.7, substrate: 'cabinets' },
        { taskId: 'TSK_CABT_PROT_ENCAP_TEARDOWN', taskName: 'Remove Cabinet Encapsulate Mask',      phase: 'cleanup', hours: 0.2, substrate: 'cabinets' },
        { taskId: 'TSK_CLOSET_SHELF_PROT_ENCAP_SETUP',    taskName: 'Mask Closet Shelf — Encapsulate (setup)', phase: 'setup',   hours: 0.6, substrate: 'closet_shelving' },
        { taskId: 'TSK_CLOSET_SHELF_PROT_ENCAP_TEARDOWN', taskName: 'Remove Closet Shelf Encapsulate Mask',     phase: 'cleanup', hours: 0.3, substrate: 'closet_shelving' },
      ]);
      const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);

      const cabinet = snap.activities.find(a => a.activity_name === 'Cabinet Encapsulate Mask');
      expect(cabinet).toBeDefined();
      expect(cabinet.element_parent).toBe('project_protection');
      expect(cabinet.stages).toHaveLength(2);

      const closet = snap.activities.find(a => a.activity_name === 'Closet Shelf Encapsulate Mask');
      expect(closet).toBeDefined();
      expect(closet.element_parent).toBe('project_protection');
      expect(closet.stages).toHaveLength(2);
    });

    it('trim tape line install/remove (no em-dash naming) pair via extended strip', () => {
      const estimate = fakeEstimate([
        { taskId: 'TSK_TRIM_TAPELINE_INSTALL', taskName: 'Trim Tape Line Install', phase: 'finish', hours: 4.1, substrate: 'specialty' },
        { taskId: 'TSK_TRIM_TAPELINE_REMOVE',  taskName: 'Trim Tape Line Remove',  phase: 'finish', hours: 1.6, substrate: 'specialty' },
      ]);
      const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);

      const tape = snap.activities.find(a => a.activity_name === 'Trim Tape Line');
      expect(tape).toBeDefined();
      expect(tape.stages).toHaveLength(2);
    });

    it('explicit rule still wins over generic pairing', () => {
      const snap = buildSnapshot(protectionEstimate([
        { taskId: 'TSK_MASK_OUTLET_SWITCH_INSTALL', taskName: 'Outlet/Switch Mask — Install', phase: 'setup',   hours: 1 },
        { taskId: 'TSK_MASK_OUTLET_SWITCH_REMOVE',  taskName: 'Outlet/Switch Mask — Remove',  phase: 'cleanup', hours: 1 },
      ]), FAKE_PROJECT, FAKE_PROJECT_ID);

      expect(snap.activities.find(a => a.activity_name === 'Outlet/Switch Cover Cycle')).toBeDefined();
      expect(snap.activities.find(a => a.activity_name === 'Outlet/Switch Mask')).toBeUndefined();
    });
  });
});

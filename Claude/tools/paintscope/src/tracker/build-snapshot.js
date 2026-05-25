import { matchActivityRule, deriveStage, deriveLifecycleActivityName, deriveProtectionMaskName } from '../data/activity-rules.js';
import { SPEC_SUBSTRATE_MAP } from '../data/spec-maps.js';
import { getElementParent, applyPhaseMergeRule } from './element-parents.js';

const PROTECTION_SPECS = new Set(['SF_ROOM_PROTECTION', 'SF_FIXTURE_PROTECTION']);

// Project-level element parents collapse the phase dimension so lifecycle
// activities (e.g., "Outlet/Switch Cover Cycle" with install in setup +
// remove in cleanup) merge into one row instead of appearing twice.
const PROJECT_LEVEL_PARENTS = new Set(['project_setup', 'project_protection', 'project_cleanup']);

// Task-ID patterns whose lifecycle pairs belong to the protection bucket
// even though the task lives under a non-protection spec/substrate. Lets
// us pull cabinet door/drawer/hardware remove+reinstall pairs out of the
// "Cabinets" bucket and into "Project Protection" where they merge into
// staged activities (Cabinet Doors install/remove, etc.).
const PROTECTION_LIFECYCLE_TASK_PATTERNS = [
  // Cabinet door/drawer/hardware remove + reinstall (lifecycle for painting)
  /^TSK_CABT_.+_(REMOVE|REINSTALL)$/,
  // Cabinet + closet shelf encapsulation/edge/full/partial mask setup + teardown
  /^TSK_(CABT|CLOSET_SHELF)_PROT_.+_(SETUP|TEARDOWN)$/,
];

function isProtectionLifecycleTask(taskId) {
  if (!taskId) return false;
  return PROTECTION_LIFECYCLE_TASK_PATTERNS.some(rx => rx.test(taskId));
}

/**
 * Derive substrate from specId (engine pattern from scope-tree.js).
 * Strips `_v\d+` version suffix and looks up in SPEC_SUBSTRATE_MAP.
 */
function substrateFromSpecId(specId) {
  if (!specId) return null;
  if (SPEC_SUBSTRATE_MAP[specId]) return SPEC_SUBSTRATE_MAP[specId];
  const base = specId.replace(/_v\d+$/, '');
  return SPEC_SUBSTRATE_MAP[base] || null;
}

/**
 * Resolve the element parent for a spec — protection specs route to the
 * virtual project_protection parent; everything else derives substrate
 * → parent. `spec.substrate` (when explicitly set by the test harness)
 * wins over derivation so unit tests don't need a real SPEC_SUBSTRATE_MAP
 * entry.
 */
function resolveSpecParent(spec, phase) {
  if (PROTECTION_SPECS.has(spec.specId)) return 'project_protection';
  const substrate = spec.substrate || substrateFromSpecId(spec.specId);
  const baseParent = getElementParent(substrate) || 'specialty';
  return applyPhaseMergeRule(baseParent, phase);
}

/**
 * Stable hash for activity_id — small string from element/phase/activity tuple.
 * Not cryptographic; just stable + collision-free at the scale of a few
 * hundred activities per project.
 */
function activityIdFor(elementParent, phase, activityName) {
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `act_${slug(elementParent)}_${slug(phase)}_${slug(activityName)}`;
}

/**
 * Resolve the activity name for a task.
 *   1. Explicit named ACTIVITY_RULES (e.g., "Outlet/Switch Cover Cycle")
 *   2. Protection-mask task ID stem (Cabinet/Closet Shelf Encapsulate Mask)
 *      — needed because SETUP/TEARDOWN halves have asymmetric taskNames
 *      that pure name-stripping can't reconcile.
 *   3. Generic lifecycle pair via name strip (Toilet Mask, Door Slab Mask)
 *   4. Raw taskName/taskId fallback
 */
function deriveActivityName(task) {
  const ruleMatch = matchActivityRule(task.taskId);
  if (ruleMatch) return ruleMatch;
  const maskName = deriveProtectionMaskName(task.taskId);
  if (maskName) return maskName;
  const lifecycleName = deriveLifecycleActivityName(task.taskId, task.taskName);
  if (lifecycleName) return lifecycleName;
  return task.taskName || task.taskId;
}

/**
 * In-place finalize the stages rollup on an activity. Converts the private
 * `_stageHours` accumulator into a public `stages` array iff ≥2 stages have
 * non-zero hours; otherwise drops the field. Always strips `_stageHours`.
 */
function finalizeStages(act) {
  const stageHours = act._stageHours;
  delete act._stageHours;

  const present = ['install', 'remove'].filter(s => stageHours[s] > 0);
  if (present.length < 2) return;

  act.stages = present.map(stage => ({
    stage,
    estimated_hours: stageHours[stage],
    contributing_tasks: act.contributing_tasks.filter(ct => ct.stage === stage),
  }));
}

/**
 * Walk the scenario-engine estimate output and produce a frozen snapshot
 * of all activities grouped by (element_parent, phase, activity_name).
 * Pure — no IDB writes, no side effects.
 *
 * The caller stamps snapshot_id (e.g., snap_<projectId>_<timestamp>) and
 * persists via tracker-db.js#saveTrackerSnapshot.
 */
export function buildSnapshot(estimate, project, projectId) {
  const taken_at = new Date().toISOString();
  const projectName = project?.name || 'Untitled Project';

  // (elementParent + phase + activityName) → activity record
  const acts = new Map();

  const specResults = estimate?.specResults || [];
  for (const spec of specResults) {
    for (const t of spec.tasks || []) {
      // Routing precedence:
      //   1. Per-task protection lifecycle override (TSK_CABT_*_REMOVE etc.)
      //   2. Per-task substrate (test fixture / scenario-engine output)
      //   3. Spec-level resolution (PROTECTION_SPECS → project_protection;
      //      everything else → substrate map → element parent)
      let elementParent;
      if (isProtectionLifecycleTask(t.taskId)) {
        elementParent = 'project_protection';
      } else if (t.substrate) {
        elementParent = applyPhaseMergeRule(getElementParent(t.substrate) || 'specialty', t.phase);
      } else {
        elementParent = resolveSpecParent(spec, t.phase);
      }
      const activityName = deriveActivityName(t);
      // Project-level parents collapse phase into a single "lifecycle" bucket
      // so install/remove pairs (setup + cleanup) merge into one row.
      const isProjectLevel = PROJECT_LEVEL_PARENTS.has(elementParent);
      const keyPhase = isProjectLevel ? 'lifecycle' : t.phase;
      const key = `${elementParent}::${keyPhase}::${activityName}`;

      let act = acts.get(key);
      if (!act) {
        act = {
          activity_id: activityIdFor(elementParent, keyPhase, activityName),
          element_parent: elementParent,
          phase: keyPhase,
          activity_name: activityName,
          estimated_hours: 0,
          contributing_tasks: [],
          rooms: [],
          _stageHours: { install: 0, remove: 0 }, // stripped before return
        };
        acts.set(key, act);
      }

      act.estimated_hours += (t.hours || 0);

      const stage = deriveStage(t.taskId);
      if (stage) act._stageHours[stage] += (t.hours || 0);
      if (!act.contributing_tasks.some(ct => ct.task_id === t.taskId)) {
        act.contributing_tasks.push({ task_id: t.taskId, name: t.taskName || t.taskId, stage });
      }

      const roomId = `room_${t.roomIndex ?? 0}`;
      let room = act.rooms.find(r => r.room_id === roomId);
      if (!room) {
        room = { room_id: roomId, room_label: t.roomLabel || roomId, estimated_hours: 0 };
        act.rooms.push(room);
      }
      room.estimated_hours += (t.hours || 0);
    }
  }

  // Promote per-activity stage hours into a `stages` array when an activity
  // genuinely has ≥2 lifecycle stages (install + remove). Singletons + tasks
  // with no stage drop the field so consumers can `if (activity.stages)` to
  // decide whether to render the install/remove sub-buckets.
  const activities = [...acts.values()];
  for (const act of activities) {
    finalizeStages(act);
  }
  const total_estimated_hours = activities.reduce((s, a) => s + a.estimated_hours, 0);

  return {
    project_id: projectId,
    project_name: projectName,
    taken_at,
    total_estimated_hours,
    activities,
  };
}

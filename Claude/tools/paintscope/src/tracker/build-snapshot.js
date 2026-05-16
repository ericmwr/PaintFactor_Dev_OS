import { matchActivityRule } from '../data/activity-rules.js';
import { SPEC_SUBSTRATE_MAP } from '../data/spec-maps.js';
import { getElementParent, applyPhaseMergeRule } from './element-parents.js';

const PROTECTION_SPECS = new Set(['SF_ROOM_PROTECTION', 'SF_FIXTURE_PROTECTION']);

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
 * Resolve the activity name for a task. Uses activity-rules.js first;
 * falls back to the task's display name when no rule matches.
 */
function deriveActivityName(task) {
  const ruleMatch = matchActivityRule(task.taskId);
  if (ruleMatch) return ruleMatch;
  return task.taskName || task.taskId;
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
      // Per-task substrate (if test sets it on the task) wins; otherwise
      // resolve from the parent spec via SPEC_SUBSTRATE_MAP. Protection
      // specs route to the project_protection virtual parent regardless
      // of substrate.
      const elementParent = t.substrate
        ? applyPhaseMergeRule(getElementParent(t.substrate) || 'specialty', t.phase)
        : resolveSpecParent(spec, t.phase);
      const activityName = deriveActivityName(t);
      const key = `${elementParent}::${t.phase}::${activityName}`;

      let act = acts.get(key);
      if (!act) {
        act = {
          activity_id: activityIdFor(elementParent, t.phase, activityName),
          element_parent: elementParent,
          phase: t.phase,
          activity_name: activityName,
          estimated_hours: 0,
          contributing_tasks: [],
          rooms: [],
        };
        acts.set(key, act);
      }

      act.estimated_hours += (t.hours || 0);

      if (!act.contributing_tasks.some(ct => ct.task_id === t.taskId)) {
        act.contributing_tasks.push({ task_id: t.taskId, name: t.taskName || t.taskId });
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

  const activities = [...acts.values()];
  const total_estimated_hours = activities.reduce((s, a) => s + a.estimated_hours, 0);

  return {
    project_id: projectId,
    project_name: projectName,
    taken_at,
    total_estimated_hours,
    activities,
  };
}

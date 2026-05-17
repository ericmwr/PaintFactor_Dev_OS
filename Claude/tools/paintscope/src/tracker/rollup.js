// Completion + hours rollups for the Tracker UI. All pure — no IDB reads,
// no side effects. Consumes the snapshot activity record + the list of
// time_entries for that activity.

/**
 * Sort entries newest-first by created_at (then by id as a tiebreaker).
 */
function newestFirst(entries) {
  return [...entries].sort((a, b) => {
    const cmp = (b.created_at || '').localeCompare(a.created_at || '');
    if (cmp !== 0) return cmp;
    return (b.id || '').localeCompare(a.id || '');
  });
}

/**
 * Compute the completion % for a specific room within an activity.
 *
 * Rules (newest-first scan, first match wins):
 *   1. Newest entry with mode === 'rooms' AND room_progress[roomId] set → that pct
 *   2. Newest entry with mode === 'project' → its project_completion_pct
 *   3. Nothing matched → 0
 */
export function computeRoomCompletion(roomId, entries) {
  const sorted = newestFirst(entries || []);
  for (const e of sorted) {
    if (e.mode === 'rooms' && e.room_progress && e.room_progress[roomId]) {
      return e.room_progress[roomId].pct ?? 0;
    }
    if (e.mode === 'project') {
      return e.project_completion_pct ?? 0;
    }
  }
  return 0;
}

/**
 * Compute the rolled-up completion % for an entire activity.
 *
 * Rules:
 *   1. If any project-mode entry exists, use the newest one's pct.
 *   2. Otherwise, weighted average of per-room completions, weighted by
 *      room.estimated_hours.
 *   3. Activity with no rooms → 0.
 */
export function computeActivityCompletion(activity, entries) {
  const rooms = activity?.rooms || [];
  if (rooms.length === 0) return 0;

  const sorted = newestFirst(entries || []);
  const newestProject = sorted.find(e => e.mode === 'project');
  if (newestProject) return newestProject.project_completion_pct ?? 0;

  // Weighted average over rooms
  let weightSum = 0;
  let pctSum = 0;
  for (const room of rooms) {
    const w = room.estimated_hours || 0;
    const pct = computeRoomCompletion(room.room_id, entries);
    weightSum += w;
    pctSum += pct * w;
  }
  if (weightSum === 0) return 0;
  return Math.round((pctSum / weightSum) * 100) / 100;
}

/**
 * Sum logged hours across a list of entries. Treats null/undefined as 0.
 */
export function sumLoggedHours(entries) {
  return (entries || []).reduce((s, e) => s + (e.hours || 0), 0);
}

/**
 * Group snapshot activities by phase, computing per-phase totals + per-room
 * breakdown of that phase. Project-level virtual parents (project_setup,
 * project_protection, project_cleanup) are not grouped under a real phase —
 * the caller handles them separately.
 *
 * @param {object} snapshot   tracker snapshot
 * @returns {object} { [phase]: { phase, estimated_hours, rooms: [...], activities: [...] } }
 */
export function buildPhaseRollups(snapshot) {
  const result = {};
  const activities = snapshot?.activities || [];

  for (const act of activities) {
    if (act.element_parent && act.element_parent.startsWith('project_')) continue;
    if (act.phase === 'lifecycle') continue;

    if (!result[act.phase]) {
      result[act.phase] = {
        phase: act.phase,
        estimated_hours: 0,
        rooms: {},      // room_id → { room_id, room_label, estimated_hours }
        activities: [], // refs to all activities in this phase
      };
    }
    const bucket = result[act.phase];
    bucket.estimated_hours += act.estimated_hours;
    bucket.activities.push(act);
    for (const room of act.rooms || []) {
      if (!bucket.rooms[room.room_id]) {
        bucket.rooms[room.room_id] = {
          room_id: room.room_id,
          room_label: room.room_label,
          estimated_hours: 0,
        };
      }
      bucket.rooms[room.room_id].estimated_hours += room.estimated_hours;
    }
  }

  // Convert rooms map → array for stable rendering
  for (const phase of Object.keys(result)) {
    result[phase].rooms = Object.values(result[phase].rooms);
  }
  return result;
}

/**
 * Sum logged hours for all entries whose activity_id belongs to one of the
 * activities in the phase rollup.
 */
export function sumPhaseLoggedHours(phaseRollup, entries) {
  if (!phaseRollup) return 0;
  const ids = new Set(phaseRollup.activities.map(a => a.activity_id));
  return (entries || [])
    .filter(e => ids.has(e.activity_id))
    .reduce((s, e) => s + (e.hours || 0), 0);
}

/**
 * Phase-level completion = weighted average of activity completions in that
 * phase, weighted by each activity's estimated_hours.
 */
export function computePhaseCompletion(phaseRollup, entriesByActivity) {
  if (!phaseRollup || !phaseRollup.activities.length) return 0;
  let weightSum = 0;
  let pctSum = 0;
  for (const act of phaseRollup.activities) {
    const w = act.estimated_hours || 0;
    const entries = entriesByActivity[act.activity_id] || [];
    const pct = computeActivityCompletion(act, entries);
    weightSum += w;
    pctSum += pct * w;
  }
  if (weightSum === 0) return 0;
  return Math.round((pctSum / weightSum) * 100) / 100;
}

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
 * Build rollups for the three project-level groups (project_setup,
 * project_protection, project_cleanup) — same shape as buildPhaseRollups
 * so PhaseLogForm + PhaseHeader can render them with the multi-task picker.
 * Returns { [element_parent]: { phase, element_parent, label, estimated_hours, rooms, activities } }
 * Only includes groups that have at least one activity.
 */
const PROJECT_LEVEL_GROUPS = [
  { id: 'project_setup',      label: 'Project Setup' },
  { id: 'project_protection', label: 'Project Protection' },
  { id: 'project_cleanup',    label: 'Project Cleanup' },
];

export function buildProjectLevelRollups(snapshot) {
  const result = {};
  const activities = snapshot?.activities || [];

  for (const group of PROJECT_LEVEL_GROUPS) {
    const acts = activities.filter(a => a.element_parent === group.id);
    if (acts.length === 0) continue;

    const rooms = {};
    let est = 0;
    for (const act of acts) {
      est += act.estimated_hours;
      for (const r of act.rooms || []) {
        if (!rooms[r.room_id]) rooms[r.room_id] = { room_id: r.room_id, room_label: r.room_label, estimated_hours: 0 };
        rooms[r.room_id].estimated_hours += r.estimated_hours;
      }
    }
    result[group.id] = {
      phase: group.id,
      element_parent: group.id,
      label: group.label,
      estimated_hours: est,
      rooms: Object.values(rooms),
      activities: acts,
    };
  }
  return result;
}

/**
 * Per-worker summary: groups entries by worker_name.
 * Returns array of { worker, totalHours, entryCount, activityIds (Set of touched),
 * roomIds (Set of touched), firstDate, lastDate, dateCount }.
 */
export function buildWorkerSummary(entries) {
  const map = {};
  for (const e of entries || []) {
    if (e._legacy) continue;
    const name = e.worker_name || '(unknown)';
    if (!map[name]) {
      map[name] = {
        worker: name,
        totalHours: 0,
        entryCount: 0,
        activityIds: new Set(),
        roomIds: new Set(),
        dates: new Set(),
        firstDate: null,
        lastDate: null,
      };
    }
    const w = map[name];
    w.totalHours += e.hours || 0;
    w.entryCount += 1;
    if (e.activity_id) w.activityIds.add(e.activity_id);
    if (e.room_progress) for (const rid of Object.keys(e.room_progress)) w.roomIds.add(rid);
    if (e.date) {
      w.dates.add(e.date);
      if (!w.firstDate || e.date < w.firstDate) w.firstDate = e.date;
      if (!w.lastDate || e.date > w.lastDate) w.lastDate = e.date;
    }
  }
  return Object.values(map).map(w => ({
    worker: w.worker,
    totalHours: Math.round(w.totalHours * 100) / 100,
    entryCount: w.entryCount,
    activityIds: [...w.activityIds],
    roomIds: [...w.roomIds],
    dateCount: w.dates.size,
    firstDate: w.firstDate,
    lastDate: w.lastDate,
  })).sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * Per-room summary: logged hours rolled up to room level.
 * Returns { [room_id]: { room_id, room_label, logged_hours, estimated_hours, pct } }.
 */
export function buildRoomSummary(snapshot, entries) {
  // Sum estimated_hours per room across all activities
  const roomEst = {};
  const roomLabel = {};
  for (const act of snapshot?.activities || []) {
    for (const room of act.rooms || []) {
      roomEst[room.room_id] = (roomEst[room.room_id] || 0) + (room.estimated_hours || 0);
      roomLabel[room.room_id] = room.room_label;
    }
  }
  // Allocate logged hours per room: split each entry's hours across the rooms it touched
  const roomLogged = {};
  for (const e of entries || []) {
    if (e._legacy) continue;
    const roomIds = e.room_progress ? Object.keys(e.room_progress) : [];
    if (roomIds.length === 0) continue;
    const each = (e.hours || 0) / roomIds.length;
    for (const rid of roomIds) {
      roomLogged[rid] = (roomLogged[rid] || 0) + each;
    }
  }
  const allRoomIds = new Set([...Object.keys(roomEst), ...Object.keys(roomLogged)]);
  const result = {};
  for (const rid of allRoomIds) {
    const est = roomEst[rid] || 0;
    const logged = roomLogged[rid] || 0;
    result[rid] = {
      room_id: rid,
      room_label: roomLabel[rid] || rid,
      estimated_hours: Math.round(est * 100) / 100,
      logged_hours: Math.round(logged * 100) / 100,
      pct: est > 0 ? Math.round((logged / est) * 100) : 0,
    };
  }
  return result;
}

/**
 * Phase comparison: estimated vs logged per phase + variance.
 */
export function buildPhaseComparison(snapshot, entries) {
  const phaseRollups = buildPhaseRollups(snapshot);
  const entriesByActivity = {};
  for (const e of entries || []) {
    if (e._legacy || !e.activity_id) continue;
    if (!entriesByActivity[e.activity_id]) entriesByActivity[e.activity_id] = [];
    entriesByActivity[e.activity_id].push(e);
  }
  const rows = [];
  for (const phase of Object.keys(phaseRollups)) {
    const r = phaseRollups[phase];
    const logged = sumPhaseLoggedHours(r, entries);
    const est = r.estimated_hours;
    const variance = logged - est;
    const variancePct = est > 0 ? Math.round((variance / est) * 100) : 0;
    rows.push({
      phase,
      estimated: Math.round(est * 100) / 100,
      logged: Math.round(logged * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePct,
      pct: est > 0 ? Math.round((logged / est) * 100) : 0,
    });
  }
  return rows;
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

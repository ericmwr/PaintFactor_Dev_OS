# Project Tracker MVP — Snapshot-Driven, Per-Project Activity Tracker

**Date:** 2026-05-16
**Status:** Design Approved
**Scope:** PaintScope Tracker tab — replace the existing free-form time logger with a snapshot-driven, activity-based tracker that lets crew members log time and progress against frozen estimate output, on a per-project basis.

**Pivot from prior design:** the original Scope Tree v1 idea was a system-wide tracker reading live from all projects' estimates. This MVP scopes the tracker to one project at a time, anchored to a frozen estimate snapshot — avoids the orphaned/unassigned/legacy task pollution that would crush a global view today.

---

## Problem

Today the Tracker tab has a thin time logger: each entry takes a date, room, substrate, phase, hours, completion %, worker name, notes. It's free-form — entries aren't connected to the estimate's tasks, can't roll up against estimated hours, and have no concept of "what's left to do." Crews can't see progress against the plan. PMs can't compare actuals to estimate. The data doesn't feed analytics or a client Gantt because nothing anchors entries to the estimate.

Original ambition was a system-wide tracker grouping tasks across all projects, but the canonical task library has too many orphaned/unassigned/legacy tasks to sort through right now. A global view would be unusable.

## Goal

Per-project tracker that:
- Snapshots the current estimate's task list when the project transitions to `in-progress`.
- Renders an **Element-Phase view** (Trim Prep, Drywall Prep, Ceilings Finish, etc.) using rolled-up activities the crew thinks in.
- Lets crew log time against an activity with optional per-room completion %.
- Rolls up progress automatically (per room, per activity, per phase, per project).
- Captures data in a shape that supports a future client-portal Gantt without needing schema changes.

Beta/MVP scope. Single-user (PM enters or oversees entries). No real auth, no employee table, no backend.

## Out of Scope

- **System-wide cross-project view** — the pivot from this design. Activities and entries are project-local.
- **Real authentication** — crew identification stays as free-text name + saved roster per project. Login is post-MVP.
- **Employee table / RBAC** — no `employees` IDB store. Per-employee analytics waits for the auth pass.
- **Server backend** — all data stays in IDB. Migration to Supabase/Firebase is the platform-level Phase 5 concern.
- **Client portal Gantt UI** — the tracker captures the data the Gantt will need (per-activity actual_start, actual_end derivable from entry dates). The portal-side renderer is a separate spec.
- **Analytics dashboard** — estimated-vs-actual rate confidence, P4P bonus calc, crew performance ratings — Phase 6 per the PaintFactor platform roadmap.
- **Custom activity rules** — users can't author new activity patterns through the UI. The activity-rules.js dictionary stays code-edit-only.
- **Multi-user concurrent editing** — single-tab use. No locking, no merge conflicts.
- **Editing entries after the fact** beyond delete+re-create — MVP supports create + delete. Inline edit is post-MVP polish.
- **Mid-project re-snapshot diff UI** — re-snapshotting works (existing entries stay tied to original activities; new activities appear; removed activities show in a "Removed activities" panel) but no visual diff of what changed.

## Verified Findings

### Existing tracker — 3 files, ~250 LOC, IDB-backed

`src/components/tracker/TimeTrackerView.jsx` (93 LOC) + `TimeEntryForm.jsx` (90 LOC) + `TimeEntrySummary.jsx` (63 LOC) currently render a table of free-form entries with create/edit/delete. Backed by `useTimeEntries(projectId)` hook → `time_entries` IDB store. Entry shape: `{ id, date, room_id, substrate_type, task_category, hours, completion_pct, worker_name, notes }`.

The new tracker REPLACES these three components. The `time_entries` store schema evolves (adds `snapshot_id`, `activity_id`, `mode`, `room_progress`). Existing entries lacking those fields get a `_legacy: true` flag at migration time and surface in a quarantine panel — never deleted.

### Activity rules — dictionary already exists, half-wired

`src/data/activity-rules.js` exports `matchActivityRule(taskId)` + `deriveActivity(task)` + `ACTIVITY_NAMES`. Used today only by the Authoring TaskList filter. Per the scope-tree-lab memory: "buildScopeTree never emits `merged_task` or `activity` nodes" — the renderer has dead code branches for `kind: 'activity'` waiting for the builder to emit them.

The tracker reuses these rules. New module `tracker/build-snapshot.js` walks the estimate's specResults and produces the snapshot's `activities[]` array using `deriveActivity` for naming and `element-parents.js` for substrate-group classification.

### Scope tree reuse

`src/engine/scope-tree.js` builds 7-level pivots (Project → Room → ElementGroup → Substrate → [Coating] → Phase → Task). The lab components (`ScopeTreeBody`, `ScopeTreeNode`, ~700 LOC) provide orientation/depth/expand toggles. Lab is unwired (not imported in `App.jsx` or `main.jsx`).

The tracker doesn't render scope tree directly. It renders a **flat activity list grouped by Element-Phase** (or by Phase or by Room, via orientation toggle). The lab's orientation/depth toggle UI gets adapted to the tracker's vocabulary but its actual pivot logic isn't reused — the snapshot pre-computes the grouping.

Lab can stay unwired; this work doesn't depend on it. Phase 2 lab integration is a separate decision.

### Project state — already has projectId, no status field

`useProject()` returns `{ state, dispatch, saveNow, projectId }`. The IDB `projects` store records have `project_data: { project: {...}, room_categories, rooms, exterior, colors, ui }`. No `status` field today. Adding `state.project.status` slots in cleanly via the existing reducer pattern + a migration in `migrations.js`.

### Estimate output shape

The Scenario Engine output (consumed via `useEstimateScenario`) produces `specResults: [{ specId, specName, tasks: [{ taskId, taskName, phase, hours, baseRate, roomIndex, roomLabel, ...}], ...}]`. The snapshot walks this, grouping by `(element_parent_of(specSubstrate), phase, deriveActivity(task))`, summing hours, and emitting per-room rollup data.

## Design Overview

Five components:

1. **State + persistence** — new `state.project.status` field (estimate / approved / in-progress / completed); new `tracker_snapshots` IDB store; evolved `time_entries` schema with `snapshot_id`/`activity_id`/`mode`/`room_progress`.
2. **Snapshot builder** — `tracker/build-snapshot.js` walks the current estimate's specResults and produces a frozen `activities[]` array.
3. **Element parent mapping** — `tracker/element-parents.js` maps substrate IDs to element parent buckets (with Walls/Ceilings split rules).
4. **Tracker UI** — replaces the 3 existing files. Renders Element-Phase view by default, activity drilldown with per-room rows, Log Time form with project-wide or per-room mode.
5. **Status surface** — dropdown in Setup tab + colored chip in Projects tab. Transition to `in-progress` triggers snapshot.

Each piece has a clear boundary. Snapshot builder is pure (estimate → snapshot), no UI. Element parents are pure data. State changes flow through the existing reducer. UI components consume the snapshot + entries via new hooks.

## Section 1: State Shape

### `state.project.status` (new field)

```js
state.project.status = 'estimate' | 'approved' | 'in_progress' | 'completed'
```

Enum values use underscore (`in_progress`). Display labels use hyphen (`in-progress`) — same as Phase A/B convention for status fields. Default `'estimate'` on new projects. Migration: existing projects without a status field get `'estimate'` backfilled in `migrateInline`.

### `tracker_snapshots` IDB store (new)

Keyed by `snapshot_id`. One snapshot per project at a time — when re-snapshotting, the new snapshot replaces the old (the old entries stay tied via `entry.snapshot_id`, which lets the "Removed activities" panel surface old-snapshot orphans).

```js
{
  snapshot_id: 'snap_<projectId>_<timestamp>',  // unique, sortable
  project_id: 'proj_xxx',
  project_name: 'Hetu',                          // frozen at handoff
  taken_at: '2026-05-16T20:00:00Z',
  status_at_snapshot: 'in_progress',
  total_estimated_hours: 142.5,

  activities: [
    {
      activity_id: 'act_<hash>',                 // stable hash of (element_parent, phase, activity_name)
      element_parent: 'trim',                    // see Section 4 for full list
      phase: 'prep',                             // setup | prep | prime | apply | interstage | finish | cleanup
      activity_name: 'Spackle Defects',          // from activity-rules.js, or fallback to task name if no rule matched
      estimated_hours: 6.0,
      contributing_tasks: [                      // for debug/drill, not displayed by default
        { task_id: 'TSK_SPACKLE_BASEBOARD', name: 'Spackle Baseboard' },
        { task_id: 'TSK_SPACKLE_CASING_DOOR', name: 'Spackle Door Casing' },
        ...
      ],
      rooms: [
        { room_id: 'room_1', room_label: 'Master Bedroom', estimated_hours: 1.5 },
        { room_id: 'room_2', room_label: 'Kitchen', estimated_hours: 2.0 },
        ...
      ],
    },
    ...
  ],
}
```

### `time_entries` IDB store (evolved)

New schema. Existing entries lacking the new fields get tagged `_legacy: true` at migration time.

```js
{
  id: 'entry_<timestamp>',
  project_id: 'proj_xxx',
  snapshot_id: 'snap_xxx',
  activity_id: 'act_xxx',
  worker_name: 'John D.',
  date: '2026-05-16',
  hours: 2.5,
  notes: '',
  created_at: '2026-05-16T20:15:00Z',

  // Discriminated by mode:
  mode: 'project' | 'rooms',

  // mode === 'project':
  project_completion_pct: 75,                    // single % for the whole activity

  // mode === 'rooms':
  room_progress: {
    'room_1': { complete: true,  pct: 100 },
    'room_2': { complete: false, pct: 80 },
    // rooms not in the map = "no change" — preserves prior entry's value
  },
}
```

### Roster persistence

Per-project worker autocomplete. Stored as `state.project.tracker_roster: ['John D.', 'Mike S.', ...]`. Auto-appended whenever a new worker name is saved via the entry form. Editable via a small "Roster" panel in the Tracker tab toolbar.

## Section 2: Snapshot Builder

`src/tracker/build-snapshot.js`:

```js
import { getElementParent, getElementParentMergeOverride } from './element-parents.js';
import { deriveActivity } from '../data/activity-rules.js';

/**
 * Walk the scenario engine's estimate output and produce a frozen
 * snapshot of all activities grouped by (element_parent, phase,
 * activity_name). Pure — no IDB writes, no side effects.
 *
 * @param {object} estimate   useEstimateScenario output
 * @param {object} project    state.project (for project_name)
 * @param {string} projectId  IDB project record id
 * @returns {object}          snapshot record (no snapshot_id — caller stamps it)
 */
export function buildSnapshot(estimate, project, projectId) {
  // ... groups specResults.tasks by (element_parent, phase, activity_name)
  // ... applies merge overrides (Drywall Prep merges walls+ceilings; Finish doesn't)
  // ... sums estimated_hours per activity and per room within activity
  // ... emits the activities[] array
}
```

Pure function. Vitest covers:
- Tasks with same activity name + same element parent merge into one activity row.
- Walls + Ceilings substrates merge into "Drywall Prep" in the prep phase.
- Walls + Ceilings stay separate in the Finish phase ("Walls Finish", "Ceilings Finish").
- Tasks with no activity-rule match use the task's display name as activity_name fallback.
- Per-room hours within an activity sum correctly.
- Snapshot total = sum of activity hours.

## Section 3: Element Parent Mapping

`src/tracker/element-parents.js`:

```js
// Substrate ID → element parent bucket. Coarser than scope-tree's element_group
// (which has 'Surfaces' covering walls+ceilings); finer in that walls and ceilings
// can split into their own parents for certain phases.
export const SUBSTRATE_TO_ELEMENT_PARENT = {
  walls: 'walls',
  ceiling: 'ceilings',

  baseboard: 'trim',
  crown: 'trim',
  chair_rail: 'trim',
  shoe_mold: 'trim',
  picture_rail: 'trim',
  door_casing: 'trim',
  window_casing: 'trim',
  door_frames: 'trim',
  window_jamb: 'trim',
  window_stool: 'trim',
  window_apron: 'trim',
  shadow_box: 'trim',
  panel_mold: 'trim',

  doors: 'doors',
  windows: 'windows',
  cabinets: 'cabinets',
  stairway: 'stairway',

  wainscoting: 'specialty',
  wood_feature_wall: 'specialty',
  wood_ceiling: 'specialty',
  beams: 'specialty',
  columns: 'specialty',
  mantels: 'specialty',
  builtins: 'specialty',
  closet_shelving: 'specialty',
};

// Virtual element parents — tasks routed here by ps_key / spec metadata
// rather than substrate ID (protection + setup + cleanup don't have
// a "substrate" in the usual sense).
export const VIRTUAL_PARENTS = ['project_setup', 'project_protection', 'project_cleanup'];

// Per-phase merge overrides. For (element_parent, phase) pairs in this map,
// the listed sub-parents collapse into one row.
//
// Example: in prep phase, walls + ceilings collapse to 'drywall_prep'.
// In finish phase, they stay separate (walls_finish vs ceilings_finish).
export const PHASE_MERGE_RULES = {
  prep: {
    drywall_prep: ['walls', 'ceilings'],  // merge walls + ceilings for prep
  },
  prime: {
    drywall_prime: ['walls', 'ceilings'], // merge for prime too
  },
  // finish: no merge — walls_finish and ceilings_finish stay separate
};
```

Display labels: `<Element> <Phase>` (e.g., "Trim Prep", "Drywall Prep", "Walls Finish", "Ceilings Finish"). Project-level activities show as bare element parent (e.g., "Project Protection") — phase suffix omitted because they're single-phase.

## Section 4: UI Surfaces

### Tracker tab — replaced from scratch

New components under `src/components/tracker/`:

| File | Purpose | ~LOC |
|---|---|---|
| `TrackerView.jsx` | Top-level shell. Reads snapshot + entries, renders header, summary strip, toolbar, body. | ~100 |
| `TrackerBody.jsx` | Element-Phase pivot tree renderer. Handles orientation toggle (Element-Phase / Room / Phase). | ~180 |
| `ActivityRow.jsx` | Single activity row + expand-to-rooms drilldown. | ~100 |
| `LogTimeForm.jsx` | Slide-out panel: worker, date, hours, mode toggle, room widget, notes. | ~180 |
| `StatusDropdown.jsx` | The status dropdown + snapshot-confirm modal. Used by Setup tab. | ~80 |
| `LegacyEntriesPanel.jsx` | Collapsed quarantine for `_legacy: true` entries. | ~60 |
| `RosterEditor.jsx` | Tiny modal for editing the saved worker roster. | ~50 |

Existing files (`TimeTrackerView.jsx`, `TimeEntryForm.jsx`, `TimeEntrySummary.jsx`) are deleted.

### Tracker view layout

```
┌──────────────────────────────────────────────────────────────┐
│  Tracker — Hetu                  status: ▼ in-progress       │
│  Snapshot: 2026-05-16 14:32  •  Total: 26h / 142h  18%       │
│  ──────────────────────────────────────────────────────────  │
│  View: [Element-Phase ▼]  Depth: [Activity ▼]  [Expand All]  │
│  ──────────────────────────────────────────────────────────  │
│  ═══ PROJECT-LEVEL ═══                                       │
│  ▼ Project Setup                4h / 6h    67%               │
│  ▶ Project Protection           0h / 4h     0%               │
│                                                              │
│  ═══ PREP ═══                                                │
│  ▼ Trim Prep                   12h / 18h   67%               │
│    ▼ Spackle Defects [trim]     4h / 6h   62%    [+ Log]    │
│      ✓ Master Bedroom    100%                                │
│      ○ Kitchen           80%                                 │
│      ○ Living Room       40%                                 │
│      ○ Dining Room        0%                                 │
│    ▶ Caulk Joints [trim]        5h / 8h   70%    [+ Log]    │
│    ▶ Sand Spackle [trim]        3h / 4h   75%    [+ Log]    │
│  ▶ Drywall Prep                 3h / 8h   38%                │
│  ▶ Doors Prep                   0h / 4h    0%                │
│  ▶ Windows Prep                 0h / 3h    0%                │
│                                                              │
│  ═══ PRIME ═══                                               │
│  ▶ Trim Prime                   0h / 12h   0%                │
│  ▶ Drywall Prime                0h / 10h   0%                │
│                                                              │
│  ═══ FINISH ═══                                              │
│  ▶ Trim Finish                  0h / 16h   0%                │
│  ▶ Walls Finish                 0h / 14h   0%                │
│  ▶ Ceilings Finish              0h / 8h    0%                │
│  ▶ Doors Finish                 0h / 12h   0%                │
│  ▶ Windows Finish               0h / 6h    0%                │
│  ▶ Cabinets Finish              0h / 18h   0%                │
│                                                              │
│  ═══ PROJECT-LEVEL ═══                                       │
│  ▶ Project Cleanup              0h / 4h    0%                │
│                                                              │
│  ────────────────────────────────────────────────────────    │
│  ▶ Legacy entries (12) — pre-snapshot time logs              │
└──────────────────────────────────────────────────────────────┘
```

### Activity drilldown

- Click activity row → expand inline. Reveals room list with current % per room and a `[+ Log Time]` button.
- Click `[+ Log Time]` → slide-out panel (320px wide, right side) with the Log Time form.
- Multiple entries can exist per activity; the row shows rolled-up state.

### Log Time form

```
┌────────────────────────────────────┐
│  Spackle Defects [trim]    est 6h  │
│  ────────────────────────────────  │
│  Worker:  John D.          ▼       │
│  Date:    2026-05-16               │
│  Hours:   [2.5]                    │
│                                    │
│  Mode:  [Project-wide] [Per-room]  │
│                                    │
│  ─── ROOM PROGRESS ───             │
│  ☐ All rooms      (bulk-set 100%)  │
│                                    │
│  ☑ Master Bedroom  (was 80%)  100% │
│  ☐ Kitchen         (was 60%)   80% │
│  ☐ Living Room     (was 20%)   40% │
│  ☐ Dining Room     (was 0%)     —  │
│  ☐ Hallway         (was 0%)     —  │
│                                    │
│  Notes: [_________________]        │
│                                    │
│         [Save Entry]   [Cancel]    │
└────────────────────────────────────┘
```

- Mode toggle defaults to `Per-room` for multi-room activities, `Project-wide` for `project_setup` / `project_protection` / `project_cleanup`.
- "All rooms" checkbox = bulk-set all room rows to 100%. Individual rows still editable after.
- "was X%" hint shows previous value.
- Empty per-room % = "no change" — entry doesn't touch that room's progress.
- Worker autocomplete from `state.project.tracker_roster`. New names get appended on save.

### Status surface

- **Setup tab:** New `Project Status` field (dropdown) near the project name. Options: `estimate / approved / in-progress / completed`.
- Transition to `in-progress` from any other state → confirm modal:

  ```
  Snapshot the current estimate as the tracker baseline?

  This locks the activity list. You can re-snapshot later if scope
  changes significantly — existing time entries stay tied to their
  original activities.

  Estimate totals at snapshot:
    • Total hours: 142.5
    • Activities: 27
    • Rooms: 6

  [Cancel]    [Snapshot & Activate]
  ```

- Re-entering `in-progress` after a previous snapshot exists → confirm:

  ```
  Re-snapshot this project?

  Existing time entries stay tied to their original activities by
  snapshot_id. New activities appear in the tree. Entries whose
  activities no longer exist in the new snapshot remain in IDB but
  won't render in the tree (visible in MVP only via raw IDB inspection;
  "Removed activities" panel ships post-MVP — see Phase 2+ teaser).

  [Cancel]    [Re-snapshot]
  ```

- **Projects tab:** Status chip next to each project row (colored: estimate=gray, approved=blue, in-progress=green, completed=purple). Read-only chip; click into the project + Setup tab to change.

### Empty states

- **No snapshot yet** (status = estimate or approved): Tracker tab shows banner *"This project doesn't have a tracker snapshot yet. Set status to In-Progress on the Setup tab to create one."* with a button that opens the Setup tab focused on the status dropdown.
- **Snapshot but no entries**: Renders the full Element-Phase tree with 0h / Xh on every row, `[+ Log Time]` buttons on each activity. No special empty-state.

### Orientation toggle

Three orientations available, switchable via toolbar dropdown:

- **Element-Phase** (default) — groups by `(element_parent, phase)`. Activities listed under each.
- **Phase** — flat phase headers (Setup, Prep, Prime, Apply, Finish, Cleanup), activities listed underneath with element chip.
- **Room** — groups by room, each room expandable into phase → activity sublists.

The Element-Phase view is the primary. Phase and Room are convenience pivots for "what's happening today across the project" or "what's left in the master bedroom" questions.

## Section 5: Activity Completion Rollup

Rollup happens in a pure helper, exercised by Vitest.

### Per-room completion

For a given activity:
```
room_pct(room_id) = latest entry where:
  - mode === 'rooms' AND room_progress[room_id] is set → use room_progress[room_id].pct
  - mode === 'project' → use project_completion_pct (project-wide entry applies to all rooms)
  - if no entry sets this room → 0
```

Last-write-wins per room (most recent entry that touches the room).

### Per-activity completion

```
if any entry exists with mode === 'project':
  activity_pct = most recent project entry's project_completion_pct
else:
  activity_pct = weighted average of room_pct(room) values
                 weighted by snapshot's room.estimated_hours
```

Activities with no entries → 0%.

### Per-element-phase, per-phase, per-project rollups

Hours-weighted averages of contained activities. Identical math, different scope.

## Section 6: Migration + Persistence

### `state.project.status` migration

In `migrations.js#migrateInline`:

```js
// Project Tracker MVP: backfill status field on projects predating the feature.
if (parsed.project && parsed.project.status === undefined) {
  parsed.project.status = 'estimate';
}
if (parsed.project && !parsed.project.tracker_roster) {
  parsed.project.tracker_roster = [];
}
```

### `tracker_snapshots` IDB store

New store. Schema declared in the existing IDB upgrade path (wherever `projects` / `task_drafts` etc. are declared).

### `time_entries` schema evolution

Existing entries don't have `snapshot_id` / `activity_id` / `mode` / `room_progress`. At hook initialization time, the `useTimeEntries` hook tags them with `_legacy: true` if they lack `snapshot_id`. The new tracker UI filters them out of the main flow and surfaces them in `LegacyEntriesPanel`.

No destructive migration — old data is preserved, just quarantined.

## Section 7: Testing

### Pure-function Vitest tests (new file: `src/tracker/__tests__/build-snapshot.test.js`)

- Same activity name across multiple substrates merges into one activity row (e.g., Spackle Defects across baseboard + casing → one "Spackle Defects [trim]" row).
- Walls + Ceilings substrates merge into "Drywall Prep" in prep phase.
- Walls + Ceilings stay separate in Finish phase.
- Tasks with no activity-rule match use task's display name as activity_name.
- Per-room hours within an activity sum correctly.
- Snapshot total = sum of activity hours = sum of per-room hours within activities.
- Empty estimate produces empty snapshot.

### Pure-function Vitest tests (new file: `src/tracker/__tests__/rollup.test.js`)

- Per-room completion = latest entry's value for that room.
- Project-wide entry applies to all rooms.
- Activity completion = weighted average of room %, weighted by estimated_hours.
- Activity completion with a project-mode entry overrides per-room math.
- No entries → 0%.

### Manual browser smoke

1. Create new project, add room with substrates, build estimate. Tracker tab shows empty-state.
2. Go to Setup, change status to `in-progress`, confirm snapshot. Tracker tab shows Element-Phase tree.
3. Click activity → expand → click `[+ Log Time]` → fill form → save. Activity row updates with hours + %.
4. Toggle orientation (Element-Phase / Phase / Room). Same data, different grouping.
5. Re-snapshot after adding a new substrate to the estimate. Confirm: new activity appears, existing entries still tied to original activities.
6. Inject a legacy entry (`_legacy: true`) into IDB. Verify it surfaces in the Legacy panel only.

## File-Level Change Inventory

| File | Action | ~LOC |
|---|---|---|
| `src/tracker/build-snapshot.js` *(new)* | Snapshot builder — pure function | ~150 |
| `src/tracker/element-parents.js` *(new)* | Substrate → element parent map + merge rules | ~80 |
| `src/tracker/rollup.js` *(new)* | Completion rollup helpers — pure | ~100 |
| `src/tracker/__tests__/build-snapshot.test.js` *(new)* | Vitest unit tests | ~200 |
| `src/tracker/__tests__/rollup.test.js` *(new)* | Vitest unit tests | ~150 |
| `src/hooks/useTrackerSnapshot.js` *(new)* | IDB CRUD for `tracker_snapshots` store | ~60 |
| `src/hooks/useTimeEntries.js` *(evolve)* | Add `_legacy` tagging, schema evolution | ~30 (delta) |
| `src/data/project-db.js` *(evolve)* | Add `tracker_snapshots` store to IDB upgrade path | ~20 (delta) |
| `src/state/migrations.js` *(evolve)* | Backfill `status` + `tracker_roster` on projects | ~10 (delta) |
| `src/state/reducer.js` *(evolve)* | `SET_PROJECT_STATUS`, `APPEND_ROSTER_NAME` actions | ~30 (delta) |
| `src/components/tracker/TrackerView.jsx` *(new — replaces existing)* | Top-level tracker shell | ~120 |
| `src/components/tracker/TrackerBody.jsx` *(new)* | Element-Phase pivot tree renderer | ~200 |
| `src/components/tracker/ActivityRow.jsx` *(new)* | Activity row + room drilldown | ~120 |
| `src/components/tracker/LogTimeForm.jsx` *(new)* | Log Time slide-out form | ~200 |
| `src/components/tracker/StatusDropdown.jsx` *(new)* | Status dropdown + snapshot confirm modal | ~100 |
| `src/components/tracker/LegacyEntriesPanel.jsx` *(new)* | Quarantine for `_legacy: true` entries | ~70 |
| `src/components/tracker/RosterEditor.jsx` *(new)* | Worker roster editor modal | ~60 |
| `src/components/tracker/TimeTrackerView.jsx` *(delete)* | Replaced | -93 |
| `src/components/tracker/TimeEntryForm.jsx` *(delete)* | Replaced | -90 |
| `src/components/tracker/TimeEntrySummary.jsx` *(delete)* | Replaced | -63 |
| `src/components/setup/ProjectSetup.jsx` *(evolve)* | Add Project Status field | ~30 (delta) |
| `src/components/projects/ProjectList.jsx` *(evolve)* | Add status chip to project rows | ~25 (delta) |

**Total**: ~1,500 LOC across ~17 files (15 new/modified, 3 deleted). No engine changes, no scenario-bundle regen, no backend.

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Snapshot drifts from current estimate (scope changes after handoff) | High | Re-snapshot button + existing entries stay valid. "Removed activities" panel preserves data continuity. |
| Crew misclicks "Per-room" mode when they mean project-wide | Medium | Mode toggle defaults to per-room only for multi-room activities. Project-level activities default to project-wide. User can toggle per entry. |
| Two entries on same day, same activity, same room — which wins? | Low | Last-write-wins per room (timestamp on `created_at`). Future polish: collision detection + confirm dialog. |
| `_legacy: true` entries clutter the IDB store | Low | Quarantined to the Legacy panel; never shown in main flow. Future cleanup pass can prune them. |
| Activity-rules.js misses a task → activity falls back to task name | Medium | Falls back cleanly (each task becomes its own activity). User can extend `activity-rules.js` to add patterns. |
| Tracker breaks when estimate is empty (no rooms, no specs) | Low | `buildSnapshot` returns empty activities[]; UI shows empty-state. |
| Re-snapshot orphans a lot of entries (big scope change) | Low | "Removed activities" panel shows orphans; user can see what was lost. No data deletion. |
| User changes status from `in-progress` → `approved` (rollback) | Low | Snapshot stays. Entries stay. Status just flips back. Re-entering in-progress doesn't auto-re-snapshot (existing snapshot still valid). |

## Phase 2+ Teaser (not in scope here)

- **Gantt rendering** — derive per-activity start/end from entry dates; render as timeline. Same snapshot + entry data, new visualization. Client portal consumer.
- **Analytics dashboard** — estimated-vs-actual rate confidence per activity / task / employee. Requires the `employees` table (post-MVP).
- **P4P bonus calc** — once we have employees + bid_hours / p4p_target_hours / actual_hours, the math runs per snapshot.
- **System-wide cross-project view** — once orphan tasks are sorted out, the global tracker idea becomes viable. The activity rollup logic from this MVP is the right primitive.
- **"Removed activities" panel** — surface time entries whose original activity is no longer in the current snapshot (mid-project scope shrink). Deferred from MVP; data preservation is in place (entries keep their `snapshot_id`), just no UI to view them.
- **Authoring → activity-rules.js editor** — user-facing UI to add/edit activity patterns instead of code-editing the dictionary.
- **Inline entry editing** — currently MVP supports create + delete only.
- **Mid-snapshot diff UI** — visual diff of "what changed in this re-snapshot" instead of just adds/removes.
- **Mobile-first log form** — eventually a separate app or PWA wrapper for crew tablet/phone use.

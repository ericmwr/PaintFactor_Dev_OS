# Project Tracker MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing free-form Tracker tab with a snapshot-driven, activity-based tracker. Crew logs time + completion against activities rolled up from the frozen estimate at the moment a project transitions to `in_progress`.

**Architecture:** State gains `project.status` + `project.tracker_roster`. New IDB store `tracker_snapshots` (one snapshot per project at a time). Existing `time_entries` store schema evolves with `_legacy` tagging for old entries. Three pure helpers (`element-parents.js`, `build-snapshot.js`, `rollup.js`) carry the data logic and get Vitest coverage. UI replaces 3 existing tracker components with 7 new ones built around an Element-Phase pivot view.

**Tech Stack:** React 19, useReducer + Context, Vitest 3 for unit tests, IDB via the existing `data/project-db.js` + `data/authoring-db.js` pattern, no TypeScript, custom CSS via `variables.css`.

**Spec reference:** `Claude/docs/superpowers/specs/2026-05-16-project-tracker-mvp-design.md`

---

## Working directory + dev server

All file paths are relative to:
`C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha`

Dev server runs on port 5183 (`paintscope` config in `.claude/launch.json`). Use `mcp__Claude_Preview__preview_list` to grab the live `serverId`.

Vitest commands run from `Claude/tools/paintscope/`:
```
cd Claude/tools/paintscope && npx vitest run <path>
```

## File map

| File | Action |
|---|---|
| `Claude/tools/paintscope/src/state/migrations.js` | Modify — backfill `project.status` + `project.tracker_roster` |
| `Claude/tools/paintscope/src/state/initial-state.js` | Modify — add `status` + `tracker_roster` to project shape |
| `Claude/tools/paintscope/src/state/reducer.js` | Modify — add `SET_PROJECT_STATUS` + `APPEND_ROSTER_NAME` cases |
| `Claude/tools/paintscope/src/state/__tests__/project-status-reducer.test.js` | Create — reducer tests |
| `Claude/tools/paintscope/src/data/project-db.js` | Modify — add `tracker_snapshots` IDB store to upgrade path |
| `Claude/tools/paintscope/src/data/tracker-db.js` | Create — IDB CRUD for `tracker_snapshots` store |
| `Claude/tools/paintscope/src/hooks/useTrackerSnapshot.js` | Create — React hook wrapping tracker-db.js |
| `Claude/tools/paintscope/src/hooks/useTimeEntries.js` | Modify — tag legacy entries (`_legacy: true`) on load |
| `Claude/tools/paintscope/src/tracker/element-parents.js` | Create — substrate → element parent map + merge rules |
| `Claude/tools/paintscope/src/tracker/build-snapshot.js` | Create — pure snapshot builder |
| `Claude/tools/paintscope/src/tracker/rollup.js` | Create — completion rollup helpers |
| `Claude/tools/paintscope/src/tracker/__tests__/element-parents.test.js` | Create — Vitest unit tests |
| `Claude/tools/paintscope/src/tracker/__tests__/build-snapshot.test.js` | Create — Vitest unit tests |
| `Claude/tools/paintscope/src/tracker/__tests__/rollup.test.js` | Create — Vitest unit tests |
| `Claude/tools/paintscope/src/components/tracker/StatusDropdown.jsx` | Create — status dropdown + snapshot confirm modal |
| `Claude/tools/paintscope/src/components/setup/ProjectSetup.jsx` | Modify — wire `<StatusDropdown />` near project name |
| `Claude/tools/paintscope/src/components/projects/ProjectList.jsx` | Modify — add status chip per project row |
| `Claude/tools/paintscope/src/components/tracker/TrackerView.jsx` | Replace — new top-level shell |
| `Claude/tools/paintscope/src/components/tracker/TrackerBody.jsx` | Create — Element-Phase pivot tree |
| `Claude/tools/paintscope/src/components/tracker/ActivityRow.jsx` | Create — activity row + room drilldown |
| `Claude/tools/paintscope/src/components/tracker/LogTimeForm.jsx` | Create — slide-out form |
| `Claude/tools/paintscope/src/components/tracker/LegacyEntriesPanel.jsx` | Create — quarantine panel |
| `Claude/tools/paintscope/src/components/tracker/RosterEditor.jsx` | Create — worker roster modal |
| `Claude/tools/paintscope/src/components/tracker/TimeEntryForm.jsx` | Delete — replaced |
| `Claude/tools/paintscope/src/components/tracker/TimeEntrySummary.jsx` | Delete — replaced |

---

## Task 1: State — `project.status` + `project.tracker_roster` (TDD)

**Files:**
- Modify: `Claude/tools/paintscope/src/state/initial-state.js`
- Modify: `Claude/tools/paintscope/src/state/migrations.js`
- Modify: `Claude/tools/paintscope/src/state/reducer.js`
- Create: `Claude/tools/paintscope/src/state/__tests__/project-status-reducer.test.js`

- [ ] **Step 1: Write the failing tests**

Create `Claude/tools/paintscope/src/state/__tests__/project-status-reducer.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { reducer } from '../reducer.js';

function makeState(project = {}) {
  return {
    rooms: [],
    project: { name: 'test', status: 'estimate', tracker_roster: [], ...project },
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

  it('accepts all four canonical statuses', () => {
    const state = makeState();
    for (const s of ['estimate', 'approved', 'in_progress', 'completed']) {
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/state/__tests__/project-status-reducer.test.js`
Expected: tests FAIL — actions not yet handled.

- [ ] **Step 3: Add `status` + `tracker_roster` to project initial state**

In `Claude/tools/paintscope/src/state/initial-state.js`, find the project initializer (the object literal around line ~246 with `default_complexity`, `default_application_method`, `rate_overrides`). Add two new properties:

```js
default_complexity: 'STD',
default_application_method: 'spray_backroll',
rate_overrides: {},
status: 'estimate',
tracker_roster: [],
```

- [ ] **Step 4: Add the reducer cases**

In `Claude/tools/paintscope/src/state/reducer.js`, find the `switch (type) {` block. Add two new cases near the `SET_RATE_OVERRIDE` case:

```js
case 'SET_PROJECT_STATUS': {
  const valid = ['estimate', 'approved', 'in_progress', 'completed'];
  if (!valid.includes(payload)) return state;
  return { ...state, project: { ...state.project, status: payload } };
}
case 'APPEND_ROSTER_NAME': {
  if (typeof payload !== 'string') return state;
  const name = payload.trim();
  if (!name) return state;
  const roster = state.project.tracker_roster || [];
  const lower = name.toLowerCase();
  if (roster.some(n => n.toLowerCase() === lower)) return state;
  return { ...state, project: { ...state.project, tracker_roster: [...roster, name] } };
}
```

- [ ] **Step 5: Backfill via migration**

In `Claude/tools/paintscope/src/state/migrations.js`, find the end of `migrateInline()` (just before `return parsed;`). Add the backfill block:

```js
// Project Tracker MVP: backfill status + tracker_roster on projects predating the feature.
if (parsed.project) {
  if (parsed.project.status === undefined) {
    parsed.project.status = 'estimate';
  }
  if (!Array.isArray(parsed.project.tracker_roster)) {
    parsed.project.tracker_roster = [];
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/state/__tests__/project-status-reducer.test.js`
Expected: 8 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add Claude/tools/paintscope/src/state/initial-state.js Claude/tools/paintscope/src/state/migrations.js Claude/tools/paintscope/src/state/reducer.js Claude/tools/paintscope/src/state/__tests__/project-status-reducer.test.js
git commit -m "feat(paintscope): add project.status + project.tracker_roster (Tracker MVP)"
```

---

## Task 2: IDB — `tracker_snapshots` store + CRUD

**Files:**
- Modify: `Claude/tools/paintscope/src/data/project-db.js`
- Create: `Claude/tools/paintscope/src/data/tracker-db.js`

- [ ] **Step 1: Inspect the current IDB upgrade path**

Run: `grep -n "objectStoreNames\|createObjectStore\|version" Claude/tools/paintscope/src/data/project-db.js | head -20`
Expected: existing IDB store declarations (likely `projects`, `time_entries`, etc.). Note the current `version` number — we'll bump it.

- [ ] **Step 2: Add the `tracker_snapshots` store to the upgrade path**

In `project-db.js`, locate the IDB `open()` call's `upgrade(db, oldVersion, newVersion, transaction)` callback (or equivalent). Bump the version number by one, and inside the upgrade callback add:

```js
if (!db.objectStoreNames.contains('tracker_snapshots')) {
  const store = db.createObjectStore('tracker_snapshots', { keyPath: 'snapshot_id' });
  store.createIndex('by_project', 'project_id', { unique: false });
  store.createIndex('by_taken_at', 'taken_at', { unique: false });
}
```

The `by_project` index lets us look up the current snapshot for a project. `by_taken_at` is for ordering if multiple snapshots accumulate.

- [ ] **Step 3: Create the CRUD module**

Create `Claude/tools/paintscope/src/data/tracker-db.js`:

```js
// IDB CRUD for tracker_snapshots store. One snapshot per project is the
// current/active snapshot — re-snapshotting writes a new record and
// supersedes the prior one (the prior stays in the store so that
// time_entries.snapshot_id references remain valid, but the tracker
// UI only renders the latest).

import { getDB } from './project-db.js';

const STORE = 'tracker_snapshots';

export async function saveTrackerSnapshot(snapshot) {
  if (!snapshot || !snapshot.snapshot_id || !snapshot.project_id) {
    throw new Error('tracker-db: snapshot must have snapshot_id and project_id');
  }
  const db = await getDB();
  await db.put(STORE, snapshot);
  return snapshot;
}

export async function loadCurrentTrackerSnapshot(projectId) {
  if (!projectId) return null;
  const db = await getDB();
  const tx = db.transaction(STORE, 'readonly');
  const index = tx.store.index('by_project');
  const all = await index.getAll(projectId);
  if (!all || all.length === 0) return null;
  // Newest first by taken_at
  all.sort((a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''));
  return all[0];
}

export async function listSnapshotsForProject(projectId) {
  if (!projectId) return [];
  const db = await getDB();
  const tx = db.transaction(STORE, 'readonly');
  const all = await tx.store.index('by_project').getAll(projectId);
  return all.sort((a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''));
}

export async function deleteTrackerSnapshot(snapshotId) {
  const db = await getDB();
  await db.delete(STORE, snapshotId);
}
```

- [ ] **Step 4: Smoke check the IDB schema upgrade**

Get the live server id via `preview_list`, then verify the store exists after a page reload:

```js
(async () => {
  const dbs = await indexedDB.databases();
  const pf = dbs.find(d => d.name === 'paintfactor');
  return new Promise((resolve) => {
    const req = indexedDB.open('paintfactor');
    req.onsuccess = (e) => {
      const db = e.target.result;
      const stores = Array.from(db.objectStoreNames);
      db.close();
      resolve({ dbVersion: pf?.version, stores });
    };
  });
})()
```

Expected: `stores` includes `'tracker_snapshots'`. If not, reload the page once and re-check — Vite HMR may not pick up IDB schema changes.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/data/project-db.js Claude/tools/paintscope/src/data/tracker-db.js
git commit -m "feat(paintscope): add tracker_snapshots IDB store + CRUD (Tracker MVP)"
```

---

## Task 3: Hook — `useTrackerSnapshot(projectId)`

**Files:**
- Create: `Claude/tools/paintscope/src/hooks/useTrackerSnapshot.js`

- [ ] **Step 1: Create the hook**

Create `Claude/tools/paintscope/src/hooks/useTrackerSnapshot.js`:

```js
// useTrackerSnapshot — React hook wrapping tracker-db.js. Loads the
// current (newest) snapshot for the given projectId. Mirrors the shape
// of useTaskDrafts / useModuleDrafts.

import { useState, useEffect, useCallback } from 'react';
import {
  loadCurrentTrackerSnapshot,
  saveTrackerSnapshot,
} from '../data/tracker-db.js';

export function useTrackerSnapshot(projectId) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    const snap = await loadCurrentTrackerSnapshot(projectId);
    setSnapshot(snap);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (snap) => {
    const saved = await saveTrackerSnapshot(snap);
    await refresh();
    return saved;
  }, [refresh]);

  return { snapshot, loading, save, refresh };
}
```

- [ ] **Step 2: Commit**

```bash
git add Claude/tools/paintscope/src/hooks/useTrackerSnapshot.js
git commit -m "feat(paintscope): add useTrackerSnapshot hook (Tracker MVP)"
```

---

## Task 4: Hook — `useTimeEntries` legacy tagging

**Files:**
- Modify: `Claude/tools/paintscope/src/hooks/useTimeEntries.js`

- [ ] **Step 1: Read the current hook**

Run: `cat Claude/tools/paintscope/src/hooks/useTimeEntries.js`
Expected: existing hook with list/save/remove signatures. Note the field names it expects on entries.

- [ ] **Step 2: Add `_legacy` tagging on load**

In `useTimeEntries.js`, find the `refresh` callback that calls `listTimeEntries(projectId)` (or equivalent). After the list comes back, tag each entry as legacy if it lacks the new schema:

```js
const all = await listTimeEntries(projectId);
const tagged = all.map(e => {
  if (e.snapshot_id && e.activity_id && e.mode) return e;
  return { ...e, _legacy: true };
});
setEntries(tagged);
```

Don't write the `_legacy` flag back to IDB — it's a runtime computed property only. (Tagging the in-memory copy is enough; the new UI splits entries by `_legacy` before rendering.)

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/hooks/useTimeEntries.js
git commit -m "feat(paintscope): tag pre-snapshot time entries as _legacy on load (Tracker MVP)"
```

---

## Task 5: Helper — `element-parents.js` (TDD)

**Files:**
- Create: `Claude/tools/paintscope/src/tracker/element-parents.js`
- Create: `Claude/tools/paintscope/src/tracker/__tests__/element-parents.test.js`

- [ ] **Step 1: Write the failing tests**

Create `Claude/tools/paintscope/src/tracker/__tests__/element-parents.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  getElementParent,
  applyPhaseMergeRule,
  SUBSTRATE_TO_ELEMENT_PARENT,
  PHASE_MERGE_RULES,
  ELEMENT_PARENT_LABELS,
} from '../element-parents.js';

describe('getElementParent', () => {
  it('maps walls → walls', () => {
    expect(getElementParent('walls')).toBe('walls');
  });

  it('maps ceiling → ceilings', () => {
    expect(getElementParent('ceiling')).toBe('ceilings');
  });

  it('maps trim substrates → trim', () => {
    expect(getElementParent('baseboard')).toBe('trim');
    expect(getElementParent('crown')).toBe('trim');
    expect(getElementParent('door_casing')).toBe('trim');
    expect(getElementParent('window_casing')).toBe('trim');
    expect(getElementParent('window_jamb')).toBe('trim');
  });

  it('maps doors/windows/cabinets/stairway each to their own parent', () => {
    expect(getElementParent('doors')).toBe('doors');
    expect(getElementParent('windows')).toBe('windows');
    expect(getElementParent('cabinets')).toBe('cabinets');
    expect(getElementParent('stairway')).toBe('stairway');
  });

  it('maps specialty substrates → specialty', () => {
    expect(getElementParent('wainscoting')).toBe('specialty');
    expect(getElementParent('beams')).toBe('specialty');
    expect(getElementParent('columns')).toBe('specialty');
    expect(getElementParent('mantels')).toBe('specialty');
    expect(getElementParent('builtins')).toBe('specialty');
    expect(getElementParent('closet_shelving')).toBe('specialty');
  });

  it('returns null for unknown substrate', () => {
    expect(getElementParent('mystery_substrate')).toBeNull();
  });
});

describe('applyPhaseMergeRule', () => {
  it('merges walls + ceilings into drywall_prep for prep phase', () => {
    expect(applyPhaseMergeRule('walls', 'prep')).toBe('drywall_prep');
    expect(applyPhaseMergeRule('ceilings', 'prep')).toBe('drywall_prep');
  });

  it('merges walls + ceilings into drywall_prime for prime phase', () => {
    expect(applyPhaseMergeRule('walls', 'prime')).toBe('drywall_prime');
    expect(applyPhaseMergeRule('ceilings', 'prime')).toBe('drywall_prime');
  });

  it('does NOT merge walls + ceilings for finish phase', () => {
    expect(applyPhaseMergeRule('walls', 'finish')).toBe('walls');
    expect(applyPhaseMergeRule('ceilings', 'finish')).toBe('ceilings');
  });

  it('returns the parent unchanged for non-merged combinations', () => {
    expect(applyPhaseMergeRule('trim', 'prep')).toBe('trim');
    expect(applyPhaseMergeRule('doors', 'finish')).toBe('doors');
  });
});

describe('ELEMENT_PARENT_LABELS', () => {
  it('has display labels for every known parent', () => {
    const parents = new Set(Object.values(SUBSTRATE_TO_ELEMENT_PARENT));
    parents.add('drywall_prep');
    parents.add('drywall_prime');
    for (const p of ['project_setup', 'project_protection', 'project_cleanup']) {
      parents.add(p);
    }
    for (const p of parents) {
      expect(ELEMENT_PARENT_LABELS[p], `missing label for ${p}`).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/tracker/__tests__/element-parents.test.js`
Expected: all tests FAIL — module doesn't exist.

- [ ] **Step 3: Create the module**

Create `Claude/tools/paintscope/src/tracker/element-parents.js`:

```js
// Substrate ID → element parent bucket. Coarser than scope-tree's
// element_group (which has 'Surfaces' covering walls+ceilings); finer
// in that walls and ceilings can split into their own parents for
// certain phases (Walls Finish vs Ceilings Finish stay separate).

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
// rather than substrate ID (protection + setup + cleanup don't have a
// substrate in the usual sense).
export const VIRTUAL_PARENTS = ['project_setup', 'project_protection', 'project_cleanup'];

// Per-phase merge overrides. For (parent, phase) pairs in this map,
// the listed sub-parents collapse into one row.
//
// Example: in prep + prime phases, walls + ceilings collapse to
// 'drywall_prep' / 'drywall_prime'. In finish phase, they stay
// separate (walls_finish vs ceilings_finish).
export const PHASE_MERGE_RULES = {
  prep: {
    drywall_prep: ['walls', 'ceilings'],
  },
  prime: {
    drywall_prime: ['walls', 'ceilings'],
  },
};

// Display labels for every parent (including merged variants and virtuals).
export const ELEMENT_PARENT_LABELS = {
  walls:               'Walls',
  ceilings:            'Ceilings',
  trim:                'Trim',
  doors:               'Doors',
  windows:             'Windows',
  cabinets:            'Cabinets',
  stairway:            'Stairway',
  specialty:           'Specialty',
  drywall_prep:        'Drywall',
  drywall_prime:       'Drywall',
  project_setup:       'Project Setup',
  project_protection:  'Project Protection',
  project_cleanup:     'Project Cleanup',
};

/**
 * Map a substrate ID to its element parent bucket.
 * @param {string} substrateId
 * @returns {string|null}
 */
export function getElementParent(substrateId) {
  return SUBSTRATE_TO_ELEMENT_PARENT[substrateId] ?? null;
}

/**
 * Given a base element parent + phase, apply the phase merge rule (if any)
 * and return the effective parent for that (parent, phase) pair.
 *
 * Example: applyPhaseMergeRule('walls', 'prep') → 'drywall_prep'
 *          applyPhaseMergeRule('walls', 'finish') → 'walls'
 */
export function applyPhaseMergeRule(parent, phase) {
  const rules = PHASE_MERGE_RULES[phase];
  if (!rules) return parent;
  for (const [mergedParent, subParents] of Object.entries(rules)) {
    if (subParents.includes(parent)) return mergedParent;
  }
  return parent;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/tracker/__tests__/element-parents.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/tracker/element-parents.js Claude/tools/paintscope/src/tracker/__tests__/element-parents.test.js
git commit -m "feat(paintscope): add element-parents helper + tests (Tracker MVP)"
```

---

## Task 6: Helper — `build-snapshot.js` (TDD)

**Files:**
- Create: `Claude/tools/paintscope/src/tracker/build-snapshot.js`
- Create: `Claude/tools/paintscope/src/tracker/__tests__/build-snapshot.test.js`

- [ ] **Step 1: Write the failing tests**

Create `Claude/tools/paintscope/src/tracker/__tests__/build-snapshot.test.js`:

```js
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
    const estimate = fakeEstimate([
      { taskId: 'TSK_SPACKLE_BASEBOARD',   phase: 'prep', hours: 1, substrate: 'baseboard' },
      { taskId: 'TSK_SPACKLE_CASING_DOOR', phase: 'prep', hours: 2, substrate: 'door_casing' },
      { taskId: 'TSK_SPACKLE_CROWN',       phase: 'prep', hours: 3, substrate: 'crown' },
    ]);
    const snap = buildSnapshot(estimate, FAKE_PROJECT, FAKE_PROJECT_ID);
    const trimSpackle = snap.activities.find(a => a.activity_name === 'Spackle Defects' && a.element_parent === 'trim');
    expect(trimSpackle).toBeDefined();
    expect(trimSpackle.estimated_hours).toBe(6);
    expect(trimSpackle.contributing_tasks.length).toBe(3);
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
      { taskId: 'TSK_ROLL_FINISH_WALL',    phase: 'finish', hours: 4, substrate: 'walls' },
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/tracker/__tests__/build-snapshot.test.js`
Expected: all tests FAIL — module doesn't exist.

- [ ] **Step 3: Create the module**

Create `Claude/tools/paintscope/src/tracker/build-snapshot.js`:

```js
import { matchActivityRule } from '../data/activity-rules.js';
import { getElementParent, applyPhaseMergeRule } from './element-parents.js';

/**
 * Stable hash for activity_id — small string from element/phase/activity tuple.
 * Doesn't need to be cryptographic; just stable + collision-free at the
 * scale of a few hundred activities per project.
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
      const baseParent = getElementParent(t.substrate) || 'specialty'; // safe default for unknown substrates
      const elementParent = applyPhaseMergeRule(baseParent, t.phase);
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

      // Track contributing tasks — dedupe by taskId
      if (!act.contributing_tasks.some(ct => ct.task_id === t.taskId)) {
        act.contributing_tasks.push({ task_id: t.taskId, name: t.taskName || t.taskId });
      }

      // Per-room rollup
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
    // snapshot_id stamped by caller
    project_id: projectId,
    project_name: projectName,
    taken_at,
    total_estimated_hours,
    activities,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/tracker/__tests__/build-snapshot.test.js`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/tracker/build-snapshot.js Claude/tools/paintscope/src/tracker/__tests__/build-snapshot.test.js
git commit -m "feat(paintscope): add build-snapshot helper + tests (Tracker MVP)"
```

---

## Task 7: Helper — `rollup.js` (TDD)

**Files:**
- Create: `Claude/tools/paintscope/src/tracker/rollup.js`
- Create: `Claude/tools/paintscope/src/tracker/__tests__/rollup.test.js`

- [ ] **Step 1: Write the failing tests**

Create `Claude/tools/paintscope/src/tracker/__tests__/rollup.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  computeRoomCompletion,
  computeActivityCompletion,
  sumLoggedHours,
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/tracker/__tests__/rollup.test.js`
Expected: tests FAIL — module doesn't exist.

- [ ] **Step 3: Create the module**

Create `Claude/tools/paintscope/src/tracker/rollup.js`:

```js
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
 *
 * @param {string} roomId
 * @param {Array} entries
 * @returns {number}
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
 *
 * @param {object} activity   snapshot activity record (must have .rooms)
 * @param {Array} entries     all time_entries scoped to this activity
 * @returns {number}
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/tracker/__tests__/rollup.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/tracker/rollup.js Claude/tools/paintscope/src/tracker/__tests__/rollup.test.js
git commit -m "feat(paintscope): add rollup helper + tests (Tracker MVP)"
```

---

## Task 8: `StatusDropdown` component + snapshot confirm modal

**Files:**
- Create: `Claude/tools/paintscope/src/components/tracker/StatusDropdown.jsx`

- [ ] **Step 1: Create the component**

Create `Claude/tools/paintscope/src/components/tracker/StatusDropdown.jsx`:

```jsx
import { useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useEstimateScenario } from '../../hooks/useEstimateScenario';
import { buildSnapshot } from '../../tracker/build-snapshot.js';

const STATUS_OPTIONS = [
  { value: 'estimate',     label: 'estimate',    color: '#888' },
  { value: 'approved',     label: 'approved',    color: '#82aaff' },
  { value: 'in_progress',  label: 'in-progress', color: '#5d5' },
  { value: 'completed',    label: 'completed',   color: '#c792ea' },
];

/**
 * Project status dropdown + snapshot-confirm flow. Lives in the Setup tab.
 *
 * Status transitions update state.project.status via SET_PROJECT_STATUS.
 * When the new status is `in_progress`, we open a confirm modal that
 * either takes a fresh snapshot (first time) or re-snapshots (overrides
 * the previous one). All other transitions are direct.
 */
export default function StatusDropdown() {
  const { state, dispatch, projectId } = useProject();
  const { snapshot, save: saveSnapshot } = useTrackerSnapshot(projectId);
  const { estimate } = useEstimateScenario();
  const [confirmFor, setConfirmFor] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  const current = state.project.status || 'estimate';

  const handleChange = (newStatus) => {
    if (newStatus === current) return;
    if (newStatus === 'in_progress') {
      setConfirmFor(newStatus);
      return;
    }
    dispatch({ type: 'SET_PROJECT_STATUS', payload: newStatus });
  };

  const handleConfirm = async () => {
    setError(null);
    setWorking(true);
    try {
      const snap = buildSnapshot(estimate, state.project, projectId);
      snap.snapshot_id = `snap_${projectId}_${Date.now()}`;
      snap.status_at_snapshot = 'in_progress';
      await saveSnapshot(snap);
      dispatch({ type: 'SET_PROJECT_STATUS', payload: 'in_progress' });
      setConfirmFor(null);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setWorking(false);
    }
  };

  const currentColor = STATUS_OPTIONS.find(o => o.value === current)?.color || '#888';

  return (
    <>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>Status:</span>
        <select
          value={current}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            background: 'var(--bg-input, #1f1f1f)',
            color: currentColor,
            border: '1px solid var(--border, #333)',
            padding: '3px 6px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      {confirmFor && (
        <div
          onClick={() => !working && setConfirmFor(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card, #1f1f1f)', color: 'var(--text)',
              border: '1px solid var(--border, #333)', borderRadius: 6,
              padding: 20, maxWidth: 480, width: '90%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
              {snapshot ? 'Re-snapshot this project?' : 'Snapshot the current estimate?'}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              {snapshot ? (
                <>
                  Existing time entries stay tied to their original activities by
                  snapshot_id. New activities appear in the tree. Entries whose
                  activities no longer exist in the new snapshot remain in IDB but
                  won't render in the tree.
                </>
              ) : (
                <>
                  This locks the activity list as the tracker baseline. You can
                  re-snapshot later if scope changes significantly — existing time
                  entries stay tied to their original activities.
                </>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              Estimate totals at snapshot:
              <ul style={{ margin: '4px 0 0 16px' }}>
                <li>Total hours: {Math.round((estimate?.totalHours || 0) * 10) / 10}</li>
                <li>Rooms: {state.rooms?.length || 0}</li>
              </ul>
            </div>
            {error && (
              <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 12 }}>
                ❌ {error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => !working && setConfirmFor(null)}
                disabled={working}
                style={{
                  background: 'transparent', border: '1px solid var(--border, #333)',
                  color: 'var(--text)', padding: '6px 14px', borderRadius: 4,
                  cursor: working ? 'not-allowed' : 'pointer', fontSize: 12,
                }}
              >Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={working}
                style={{
                  background: working ? 'var(--bg-input)' : 'var(--accent, #82aaff)',
                  color: working ? 'var(--text-muted)' : 'var(--bg, #0f0f0f)',
                  border: 'none', padding: '6px 14px', borderRadius: 4,
                  cursor: working ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >
                {working ? 'Snapshotting...' : (snapshot ? 'Re-snapshot' : 'Snapshot & Activate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify no parse errors via preview**

Get the server id via `preview_list`, then check:
```js
// preview_console_logs level=error
```
Expected: no parse errors mentioning `StatusDropdown.jsx`.

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/tracker/StatusDropdown.jsx
git commit -m "feat(paintscope): add StatusDropdown component (Tracker MVP)"
```

---

## Task 9: Wire `<StatusDropdown />` into Setup tab

**Files:**
- Modify: `Claude/tools/paintscope/src/components/setup/ProjectSetup.jsx`

- [ ] **Step 1: Find a placement spot**

Run: `grep -n "project.name\|ProjectName\|project_name" Claude/tools/paintscope/src/components/setup/ProjectSetup.jsx | head`
Expected: a section where the project name input is rendered. We'll add the status dropdown nearby (header row).

- [ ] **Step 2: Import + render**

In `ProjectSetup.jsx`, add the import near the top:

```jsx
import StatusDropdown from '../tracker/StatusDropdown.jsx';
```

Then add `<StatusDropdown />` in the project header area (somewhere visible near the project name field). Wrap with a flex container if not already in one:

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
  {/* existing project name input here */}
  <StatusDropdown />
</div>
```

- [ ] **Step 3: Smoke check**

Get the live server id (`preview_list`), navigate to Setup tab. Verify the status dropdown renders. Click it — should show 4 options. Select `approved` — status updates without modal. Select `in-progress` — confirm modal opens.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/setup/ProjectSetup.jsx
git commit -m "feat(paintscope): wire StatusDropdown into Setup tab (Tracker MVP)"
```

---

## Task 10: Status chip on ProjectList

**Files:**
- Modify: `Claude/tools/paintscope/src/components/projects/ProjectList.jsx`

- [ ] **Step 1: Inspect ProjectList**

Run: `grep -n "project.name\|p.name\|projects.map" Claude/tools/paintscope/src/components/projects/ProjectList.jsx | head`
Expected: a `.map()` rendering project rows.

- [ ] **Step 2: Add the chip**

In `ProjectList.jsx`, define a small helper at the top of the file:

```jsx
const STATUS_CHIP_COLORS = {
  estimate:     '#888',
  approved:     '#82aaff',
  in_progress:  '#5d5',
  completed:    '#c792ea',
};
const STATUS_CHIP_LABELS = {
  estimate:     'estimate',
  approved:     'approved',
  in_progress:  'in-progress',
  completed:    'completed',
};
```

In the project row JSX, near the project name, add the chip:

```jsx
{(() => {
  const status = p.project_data?.project?.status || 'estimate';
  return (
    <span style={{
      fontSize: 10, padding: '2px 6px', borderRadius: 3, marginLeft: 8,
      background: 'rgba(0,0,0,0.3)', color: STATUS_CHIP_COLORS[status] || '#888',
      border: `1px solid ${STATUS_CHIP_COLORS[status] || '#888'}`,
    }}>{STATUS_CHIP_LABELS[status] || status}</span>
  );
})()}
```

- [ ] **Step 3: Smoke check**

Navigate to Projects tab. Each row should show a status chip (most likely `estimate` colored gray for migrated/existing projects).

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/projects/ProjectList.jsx
git commit -m "feat(paintscope): show project status chip in ProjectList (Tracker MVP)"
```

---

## Task 11: Replace `TrackerView.jsx` with new shell + delete old files

**Files:**
- Replace: `Claude/tools/paintscope/src/components/tracker/TrackerView.jsx` (rewritten from scratch — keep the filename so App.jsx routing stays put)
- Delete: `Claude/tools/paintscope/src/components/tracker/TimeEntryForm.jsx`
- Delete: `Claude/tools/paintscope/src/components/tracker/TimeEntrySummary.jsx`

- [ ] **Step 1: Read the old TimeTrackerView for App.jsx import name**

Run: `grep -n "tracker\|Tracker" Claude/tools/paintscope/src/App.jsx | head`
Expected: the import line referencing the tracker view component. Note the import name — we'll preserve it.

Run: `cat Claude/tools/paintscope/src/components/tracker/TimeTrackerView.jsx | head -10`
Expected: confirm the component is `TimeTrackerView` (default export). We'll create `TrackerView.jsx` and update the App.jsx import.

- [ ] **Step 2: Create the new TrackerView shell**

Create `Claude/tools/paintscope/src/components/tracker/TrackerView.jsx`:

```jsx
import { useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { sumLoggedHours } from '../../tracker/rollup.js';
import TrackerBody from './TrackerBody.jsx';
import LegacyEntriesPanel from './LegacyEntriesPanel.jsx';

export default function TrackerView() {
  const { state, projectId } = useProject();
  const { snapshot, loading: snapLoading } = useTrackerSnapshot(projectId);
  const { entries, loading: entriesLoading } = useTimeEntries(projectId);

  const status = state.project?.status || 'estimate';
  const newEntries = useMemo(() => (entries || []).filter(e => !e._legacy), [entries]);
  const legacyEntries = useMemo(() => (entries || []).filter(e => e._legacy), [entries]);

  const totalLogged = sumLoggedHours(newEntries);
  const totalEstimated = snapshot?.total_estimated_hours || 0;
  const overallPct = totalEstimated > 0 ? Math.round((totalLogged / totalEstimated) * 100) : 0;

  if (snapLoading || entriesLoading) {
    return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading tracker...</div>;
  }

  if (!projectId) {
    return (
      <div style={{ padding: 20, color: 'var(--text-muted)' }}>
        Save the project to enable tracking.
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{
          padding: 16, background: 'rgba(255,190,100,0.06)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)', fontSize: 12,
        }}>
          This project doesn't have a tracker snapshot yet.
          {' '}Set status to <strong>in-progress</strong> on the Setup tab to create one.
          {' '}<span style={{ color: 'var(--text-muted)' }}>(current status: <strong>{status.replace('_', '-')}</strong>)</span>
        </div>
        {legacyEntries.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <LegacyEntriesPanel entries={legacyEntries} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, color: 'var(--accent)', margin: 0 }}>
          Tracker — {state.project?.name || 'Untitled'}
        </h2>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          status: <strong style={{ color: 'var(--accent)' }}>{status.replace('_', '-')}</strong>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
        Snapshot: {new Date(snapshot.taken_at).toLocaleString()} &nbsp;•&nbsp;
        Total: {totalLogged.toFixed(1)}h / {totalEstimated.toFixed(1)}h &nbsp;•&nbsp;
        <span style={{ color: 'var(--accent)' }}>{overallPct}%</span>
      </div>

      <TrackerBody snapshot={snapshot} entries={newEntries} />

      {legacyEntries.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <LegacyEntriesPanel entries={legacyEntries} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update the App.jsx import**

In `Claude/tools/paintscope/src/App.jsx`, find the import line for the tracker component and update it:

```jsx
import TrackerView from './components/tracker/TrackerView.jsx';
```

If it was previously importing `TimeTrackerView` from `./components/tracker/TimeTrackerView.jsx`, change the name + path. Also update the JSX usage site (search for `<TimeTrackerView`) to `<TrackerView`.

- [ ] **Step 4: Delete the old files**

```bash
git rm Claude/tools/paintscope/src/components/tracker/TimeTrackerView.jsx Claude/tools/paintscope/src/components/tracker/TimeEntryForm.jsx Claude/tools/paintscope/src/components/tracker/TimeEntrySummary.jsx
```

- [ ] **Step 5: Stub TrackerBody and LegacyEntriesPanel so the shell renders without errors**

These two files are fully implemented in later tasks (12, 15). For Task 11's smoke check to work, create minimal stubs now:

Create `Claude/tools/paintscope/src/components/tracker/TrackerBody.jsx`:

```jsx
export default function TrackerBody({ snapshot, entries }) {
  return (
    <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
      TrackerBody stub — {snapshot?.activities?.length || 0} activities, {entries?.length || 0} entries.
    </div>
  );
}
```

Create `Claude/tools/paintscope/src/components/tracker/LegacyEntriesPanel.jsx`:

```jsx
export default function LegacyEntriesPanel({ entries }) {
  return (
    <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 4 }}>
      ▶ Legacy entries ({entries?.length || 0}) — pre-snapshot time logs (stub)
    </div>
  );
}
```

- [ ] **Step 6: Smoke check**

Reload the dev server preview. Navigate to Tracker tab. Without a snapshot, should see the "no snapshot yet" empty state. Go to Setup → flip status to `in-progress` → confirm. Return to Tracker tab — should see the new shell with snapshot timestamp + total hours.

- [ ] **Step 7: Commit**

```bash
git add Claude/tools/paintscope/src/components/tracker/TrackerView.jsx Claude/tools/paintscope/src/components/tracker/TrackerBody.jsx Claude/tools/paintscope/src/components/tracker/LegacyEntriesPanel.jsx Claude/tools/paintscope/src/App.jsx
git rm Claude/tools/paintscope/src/components/tracker/TimeTrackerView.jsx Claude/tools/paintscope/src/components/tracker/TimeEntryForm.jsx Claude/tools/paintscope/src/components/tracker/TimeEntrySummary.jsx 2>/dev/null || true
git commit -m "feat(paintscope): replace TimeTrackerView with snapshot-driven TrackerView (Tracker MVP)"
```

---

## Task 12: `TrackerBody` — Element-Phase pivot tree

**Files:**
- Replace: `Claude/tools/paintscope/src/components/tracker/TrackerBody.jsx` (replaces stub from Task 11)

- [ ] **Step 1: Replace the stub with full implementation**

Replace `Claude/tools/paintscope/src/components/tracker/TrackerBody.jsx`:

```jsx
import { useState, useMemo } from 'react';
import { ELEMENT_PARENT_LABELS, VIRTUAL_PARENTS } from '../../tracker/element-parents.js';
import ActivityRow from './ActivityRow.jsx';

const PHASE_ORDER = ['setup', 'prep', 'prime', 'apply', 'interstage', 'finish', 'cleanup'];
const PHASE_LABELS = {
  setup: 'SETUP', prep: 'PREP', prime: 'PRIME', apply: 'APPLY',
  interstage: 'INTERSTAGE', finish: 'FINISH', cleanup: 'CLEANUP',
};

// Element parent order within each phase section
const ELEMENT_PARENT_ORDER = [
  'trim', 'drywall_prep', 'drywall_prime', 'walls', 'ceilings',
  'doors', 'windows', 'cabinets', 'stairway', 'specialty',
];

function isVirtualParent(parent) {
  return VIRTUAL_PARENTS.includes(parent);
}

/**
 * TrackerBody — Element-Phase pivot tree for the snapshot.
 *
 * Layout: project-level activities (Setup, Protection, Cleanup) anchor
 * the top + bottom; phase-grouped activities fill the middle. Each
 * activity is rendered as an <ActivityRow /> that handles its own
 * drilldown and Log-Time interaction.
 */
export default function TrackerBody({ snapshot, entries }) {
  const [expandAll, setExpandAll] = useState(false);
  const activities = snapshot?.activities || [];

  // Group activities into:
  //   projectLevel.before    — Setup
  //   projectLevel.middle    — Protection  (sits at top of work phases)
  //   projectLevel.after     — Cleanup
  //   phaseGroups[phase][parent] = activity
  const { projectLevel, phaseGroups, presentPhases } = useMemo(() => {
    const pl = { before: [], middle: [], after: [] };
    const pg = {};
    const phases = new Set();

    for (const act of activities) {
      if (act.element_parent === 'project_setup') {
        pl.before.push(act);
      } else if (act.element_parent === 'project_protection') {
        pl.middle.push(act);
      } else if (act.element_parent === 'project_cleanup') {
        pl.after.push(act);
      } else {
        phases.add(act.phase);
        if (!pg[act.phase]) pg[act.phase] = {};
        if (!pg[act.phase][act.element_parent]) pg[act.phase][act.element_parent] = [];
        pg[act.phase][act.element_parent].push(act);
      }
    }

    const orderedPhases = PHASE_ORDER.filter(p => phases.has(p));
    return { projectLevel: pl, phaseGroups: pg, presentPhases: orderedPhases };
  }, [activities]);

  const entriesByActivity = useMemo(() => {
    const map = {};
    for (const e of entries) {
      if (!e.activity_id) continue;
      if (!map[e.activity_id]) map[e.activity_id] = [];
      map[e.activity_id].push(e);
    }
    return map;
  }, [entries]);

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setExpandAll(true)}
          style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', borderRadius: 3 }}
        >Expand All</button>
        <button
          onClick={() => setExpandAll(false)}
          style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', borderRadius: 3 }}
        >Collapse All</button>
      </div>

      {(projectLevel.before.length > 0 || projectLevel.middle.length > 0) && (
        <SectionHeader label="PROJECT-LEVEL" />
      )}
      {projectLevel.before.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
        />
      ))}
      {projectLevel.middle.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
        />
      ))}

      {presentPhases.map(phase => {
        const parentsInPhase = ELEMENT_PARENT_ORDER.filter(p => phaseGroups[phase] && phaseGroups[phase][p]);
        if (parentsInPhase.length === 0) return null;
        return (
          <div key={phase}>
            <SectionHeader label={PHASE_LABELS[phase] || phase.toUpperCase()} />
            {parentsInPhase.map(parent => (
              phaseGroups[phase][parent].map(act => (
                <ActivityRow
                  key={act.activity_id}
                  activity={act}
                  entries={entriesByActivity[act.activity_id] || []}
                  forceExpanded={expandAll}
                />
              ))
            ))}
          </div>
        );
      })}

      {projectLevel.after.length > 0 && <SectionHeader label="PROJECT-LEVEL" />}
      {projectLevel.after.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
        />
      ))}
    </div>
  );
}

function SectionHeader({ label }) {
  return (
    <div style={{
      fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5,
      marginTop: 16, marginBottom: 6, fontWeight: 600,
    }}>
      ═══ {label} ═══
    </div>
  );
}
```

- [ ] **Step 2: Stub ActivityRow.jsx so the body renders without errors**

Create the minimal stub at `Claude/tools/paintscope/src/components/tracker/ActivityRow.jsx`:

```jsx
import { ELEMENT_PARENT_LABELS } from '../../tracker/element-parents.js';

export default function ActivityRow({ activity, entries }) {
  const phaseSuffix = activity.element_parent.startsWith('project_') ? '' : ` ${capitalize(activity.phase)}`;
  const elementLabel = ELEMENT_PARENT_LABELS[activity.element_parent] || activity.element_parent;
  return (
    <div style={{ padding: '4px 8px', fontSize: 12, fontFamily: 'monospace' }}>
      ▶ <strong>{elementLabel}{phaseSuffix}</strong>: {activity.activity_name} &nbsp;
      <span style={{ color: 'var(--text-muted)' }}>
        {entries.length} entries, est {activity.estimated_hours.toFixed(1)}h
      </span>
    </div>
  );
}
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
```

- [ ] **Step 3: Smoke check**

Reload preview. Tracker tab should now show the Element-Phase grouped tree with all activities listed in stub form. Verify section headers (PROJECT-LEVEL, PREP, PRIME, FINISH, etc.) appear in the right order.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/tracker/TrackerBody.jsx Claude/tools/paintscope/src/components/tracker/ActivityRow.jsx
git commit -m "feat(paintscope): add TrackerBody Element-Phase pivot tree (Tracker MVP)"
```

---

## Task 13: `ActivityRow` — drilldown + Log Time trigger

**Files:**
- Replace: `Claude/tools/paintscope/src/components/tracker/ActivityRow.jsx` (replaces stub from Task 12)

- [ ] **Step 1: Replace the stub**

Replace `Claude/tools/paintscope/src/components/tracker/ActivityRow.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { ELEMENT_PARENT_LABELS } from '../../tracker/element-parents.js';
import { computeActivityCompletion, computeRoomCompletion, sumLoggedHours } from '../../tracker/rollup.js';
import LogTimeForm from './LogTimeForm.jsx';

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function pctColor(pct) {
  if (pct >= 100) return '#5d5';
  if (pct >= 50)  return '#82aaff';
  if (pct > 0)    return '#f1c40f';
  return 'var(--text-muted)';
}

export default function ActivityRow({ activity, entries, forceExpanded }) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [logFormOpen, setLogFormOpen] = useState(false);

  useEffect(() => { setLocalExpanded(forceExpanded); }, [forceExpanded]);

  const expanded = localExpanded;
  const isProjectLevel = activity.element_parent.startsWith('project_');
  const phaseSuffix = isProjectLevel ? '' : ` ${capitalize(activity.phase)}`;
  const elementLabel = ELEMENT_PARENT_LABELS[activity.element_parent] || activity.element_parent;
  const rowTitle = isProjectLevel ? elementLabel : `${elementLabel}${phaseSuffix} — ${activity.activity_name}`;

  const loggedHours = sumLoggedHours(entries);
  const activityPct = computeActivityCompletion(activity, entries);

  return (
    <div style={{ margin: '4px 0' }}>
      <div
        onClick={() => setLocalExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
          fontSize: 12, fontFamily: 'monospace', cursor: 'pointer',
          background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
          borderRadius: 3,
        }}
      >
        <span style={{ color: 'var(--text-muted)', width: 12 }}>{expanded ? '▼' : '▶'}</span>
        <strong style={{ flex: 1 }}>{rowTitle}</strong>
        <span style={{ color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
          {loggedHours.toFixed(1)}h / {activity.estimated_hours.toFixed(1)}h
        </span>
        <span style={{ color: pctColor(activityPct), minWidth: 50, textAlign: 'right', fontWeight: 600 }}>
          {activityPct.toFixed(0)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setLogFormOpen(true); }}
          style={{
            background: 'var(--accent, #82aaff)', color: 'var(--bg, #0f0f0f)',
            border: 'none', padding: '2px 8px', borderRadius: 3,
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >+ Log</button>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 32, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          {activity.rooms.length === 0 ? (
            <div style={{ padding: '4px 0', fontStyle: 'italic' }}>
              (project-level activity — no per-room breakdown)
            </div>
          ) : (
            activity.rooms.map(room => {
              const pct = computeRoomCompletion(room.room_id, entries);
              const complete = pct >= 100;
              return (
                <div key={room.room_id} style={{ padding: '2px 0', display: 'flex', gap: 8 }}>
                  <span style={{ color: complete ? '#5d5' : 'var(--text-muted)', width: 12 }}>
                    {complete ? '✓' : '○'}
                  </span>
                  <span style={{ flex: 1, color: complete ? 'var(--text)' : 'var(--text-muted)' }}>
                    {room.room_label}
                  </span>
                  <span style={{ color: pctColor(pct), minWidth: 50, textAlign: 'right' }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {logFormOpen && (
        <LogTimeForm
          activity={activity}
          entries={entries}
          onClose={() => setLogFormOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Stub LogTimeForm.jsx so the row renders without errors**

Create `Claude/tools/paintscope/src/components/tracker/LogTimeForm.jsx` stub:

```jsx
export default function LogTimeForm({ activity, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', padding: 20, borderRadius: 6,
          maxWidth: 480, width: '90%', color: 'var(--text)', fontSize: 12,
        }}
      >
        LogTimeForm stub for {activity.activity_name} — Task 14 wires this.
        <button onClick={onClose} style={{ marginLeft: 12 }}>Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke check**

Reload preview. Click an activity row in the Tracker tab. Should expand to show rooms with progress %. Click `+ Log` — stub modal should open.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/tracker/ActivityRow.jsx Claude/tools/paintscope/src/components/tracker/LogTimeForm.jsx
git commit -m "feat(paintscope): add ActivityRow drilldown + room progress (Tracker MVP)"
```

---

## Task 14: `LogTimeForm` — full implementation

**Files:**
- Replace: `Claude/tools/paintscope/src/components/tracker/LogTimeForm.jsx` (replaces stub from Task 13)

- [ ] **Step 1: Replace the stub**

Replace `Claude/tools/paintscope/src/components/tracker/LogTimeForm.jsx`:

```jsx
import { useState, useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { computeRoomCompletion } from '../../tracker/rollup.js';

const VIRTUAL_PARENTS = ['project_setup', 'project_protection', 'project_cleanup'];

export default function LogTimeForm({ activity, entries, onClose }) {
  const { state, dispatch, projectId } = useProject();
  const { snapshot } = useTrackerSnapshot(projectId);
  const { save: saveEntry } = useTimeEntries(projectId);

  const isProjectLevel = VIRTUAL_PARENTS.includes(activity.element_parent);
  const defaultMode = isProjectLevel ? 'project' : 'rooms';

  const today = new Date().toISOString().slice(0, 10);
  const [worker, setWorker] = useState('');
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState('');
  const [mode, setMode] = useState(defaultMode);
  const [notes, setNotes] = useState('');
  const [projectPct, setProjectPct] = useState('');
  const [roomProgress, setRoomProgress] = useState(() => {
    const init = {};
    for (const room of activity.rooms) {
      init[room.room_id] = { complete: false, pct: '' };
    }
    return init;
  });
  const [allRoomsChecked, setAllRoomsChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const roster = state.project?.tracker_roster || [];
  const previousRoomPcts = useMemo(() => {
    const map = {};
    for (const room of activity.rooms) {
      map[room.room_id] = computeRoomCompletion(room.room_id, entries);
    }
    return map;
  }, [activity.rooms, entries]);

  const toggleAllRooms = (checked) => {
    setAllRoomsChecked(checked);
    if (checked) {
      const next = {};
      for (const room of activity.rooms) {
        next[room.room_id] = { complete: true, pct: 100 };
      }
      setRoomProgress(next);
    }
  };

  const toggleRoomComplete = (roomId, checked) => {
    setRoomProgress(prev => ({
      ...prev,
      [roomId]: { complete: checked, pct: checked ? 100 : (prev[roomId]?.pct ?? '') },
    }));
    if (!checked) setAllRoomsChecked(false);
  };

  const setRoomPct = (roomId, val) => {
    const num = val === '' ? '' : Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    setRoomProgress(prev => ({
      ...prev,
      [roomId]: { complete: num === 100, pct: num },
    }));
    if (num !== 100) setAllRoomsChecked(false);
  };

  const handleSave = async () => {
    setError(null);
    const h = parseFloat(hours);
    if (!isFinite(h) || h <= 0) { setError('Hours must be a positive number.'); return; }
    if (!worker.trim()) { setError('Worker name required.'); return; }
    if (mode === 'project') {
      const p = parseInt(projectPct, 10);
      if (!isFinite(p) || p < 0 || p > 100) { setError('Project completion % must be 0-100.'); return; }
    }
    if (!snapshot) { setError('Missing snapshot — cannot save entry.'); return; }

    setSaving(true);
    try {
      const base = {
        id: `entry_${Date.now()}`,
        project_id: projectId,
        snapshot_id: snapshot.snapshot_id,
        activity_id: activity.activity_id,
        worker_name: worker.trim(),
        date,
        hours: h,
        notes: notes.trim(),
        created_at: new Date().toISOString(),
        mode,
      };
      const entry = mode === 'project'
        ? { ...base, project_completion_pct: parseInt(projectPct, 10) }
        : (() => {
            const room_progress = {};
            for (const [roomId, val] of Object.entries(roomProgress)) {
              if (val.pct === '' || val.pct == null) continue; // skip unset = no change
              room_progress[roomId] = { complete: !!val.complete, pct: Number(val.pct) };
            }
            return { ...base, room_progress };
          })();

      await saveEntry(entry);
      dispatch({ type: 'APPEND_ROSTER_NAME', payload: worker.trim() });
      onClose();
    } catch (err) {
      setError(err?.message || String(err));
      setSaving(false);
    }
  };

  return (
    <div
      onClick={() => !saving && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #1f1f1f)', color: 'var(--text)',
          border: '1px solid var(--border, #333)', borderLeft: '2px solid var(--accent)',
          padding: 16, width: 360, height: '100vh', overflowY: 'auto',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: 'var(--accent)' }}>
            {activity.activity_name}
          </h3>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            est {activity.estimated_hours.toFixed(1)}h
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6, fontSize: 11, marginBottom: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Worker</span>
          <input
            value={worker}
            list="tracker-roster"
            onChange={(e) => setWorker(e.target.value)}
            placeholder="Name"
            style={inputStyle()}
          />
          <datalist id="tracker-roster">
            {roster.map(n => <option key={n} value={n} />)}
          </datalist>
          <span style={{ color: 'var(--text-muted)' }}>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle()} />
          <span style={{ color: 'var(--text-muted)' }}>Hours</span>
          <input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0.0" style={inputStyle()} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 8 }}>Mode:</span>
          <button
            onClick={() => setMode('project')}
            style={modeBtn(mode === 'project')}
          >Project-wide</button>
          <button
            onClick={() => setMode('rooms')}
            disabled={activity.rooms.length === 0}
            style={modeBtn(mode === 'rooms')}
          >Per-room</button>
        </div>

        {mode === 'project' && (
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6, fontSize: 11, marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Completion</span>
            <input type="number" min="0" max="100" value={projectPct} onChange={(e) => setProjectPct(e.target.value)} placeholder="0-100" style={inputStyle()} />
          </div>
        )}

        {mode === 'rooms' && activity.rooms.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 6 }}>
              ═══ ROOM PROGRESS ═══
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 600 }}>
              <input type="checkbox" checked={allRoomsChecked} onChange={(e) => toggleAllRooms(e.target.checked)} />
              All rooms
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>(bulk-set 100%)</span>
            </label>
            {activity.rooms.map(room => (
              <div key={room.room_id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={!!roomProgress[room.room_id]?.complete}
                  onChange={(e) => toggleRoomComplete(room.room_id, e.target.checked)}
                />
                <span style={{ flex: 1 }}>
                  {room.room_label}
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 6 }}>
                    (was {previousRoomPcts[room.room_id]}%)
                  </span>
                </span>
                <input
                  type="number"
                  min="0" max="100"
                  value={roomProgress[room.room_id]?.pct ?? ''}
                  onChange={(e) => setRoomPct(room.room_id, e.target.value)}
                  placeholder="—"
                  style={{ ...inputStyle(), width: 56, textAlign: 'right' }}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6, fontSize: 11, marginBottom: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" style={inputStyle()} />
        </div>

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 12 }}>❌ {error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => !saving && onClose()} disabled={saving} style={cancelBtn(saving)}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={saveBtn(saving)}>
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

function inputStyle() {
  return {
    background: 'var(--bg-input, #161616)', color: 'var(--text)',
    border: '1px solid var(--border, #333)', padding: '3px 6px',
    borderRadius: 3, fontSize: 11,
  };
}

function modeBtn(active) {
  return {
    background: active ? 'var(--accent, #82aaff)' : 'transparent',
    color: active ? 'var(--bg, #0f0f0f)' : 'var(--text)',
    border: '1px solid var(--border, #333)',
    padding: '3px 8px', marginRight: 6, borderRadius: 3,
    fontSize: 11, cursor: 'pointer', fontWeight: active ? 600 : 400,
  };
}

function cancelBtn(disabled) {
  return {
    background: 'transparent', border: '1px solid var(--border, #333)',
    color: 'var(--text)', padding: '6px 14px', borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11,
  };
}

function saveBtn(disabled) {
  return {
    background: disabled ? 'var(--bg-input)' : 'var(--accent, #82aaff)',
    color: disabled ? 'var(--text-muted)' : 'var(--bg, #0f0f0f)',
    border: 'none', padding: '6px 14px', borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600,
  };
}
```

- [ ] **Step 2: Smoke check the happy path**

Reload preview. Tracker tab → click an activity → expand → click `+ Log` → form opens. Fill in: worker "Test User", hours 2, mode Per-room, check one room → 100%, Save. Form closes. Activity row should update: logged hours = 2.0, % updated. Worker name appears in roster (verified via preview_eval against `state.project.tracker_roster`).

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/tracker/LogTimeForm.jsx
git commit -m "feat(paintscope): add LogTimeForm with per-room + project modes (Tracker MVP)"
```

---

## Task 15: `LegacyEntriesPanel` — full implementation

**Files:**
- Replace: `Claude/tools/paintscope/src/components/tracker/LegacyEntriesPanel.jsx` (replaces stub from Task 11)

- [ ] **Step 1: Replace the stub**

Replace `Claude/tools/paintscope/src/components/tracker/LegacyEntriesPanel.jsx`:

```jsx
import { useState } from 'react';

export default function LegacyEntriesPanel({ entries }) {
  const [expanded, setExpanded] = useState(false);
  const total = (entries || []).reduce((s, e) => s + (e.hours || 0), 0);

  if (!entries || entries.length === 0) return null;

  return (
    <div style={{
      border: '1px dashed var(--border)', borderRadius: 4,
      padding: 12, background: 'rgba(255,255,255,0.02)',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', userSelect: 'none' }}
      >
        {expanded ? '▼' : '▶'} Legacy entries ({entries.length}) — pre-snapshot time logs &nbsp;
        <span style={{ color: 'var(--text)' }}>{total.toFixed(1)}h total</span>
      </div>

      {expanded && (
        <table style={{ width: '100%', marginTop: 8, fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th style={cellStyle()}>Date</th>
              <th style={cellStyle()}>Room</th>
              <th style={cellStyle()}>Substrate</th>
              <th style={cellStyle()}>Phase</th>
              <th style={cellStyle()}>Hours</th>
              <th style={cellStyle()}>%</th>
              <th style={cellStyle()}>Worker</th>
              <th style={cellStyle()}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries
              .slice()
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              .map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cellStyle()}>{e.date || '—'}</td>
                  <td style={cellStyle()}>{e.room_id || '—'}</td>
                  <td style={cellStyle()}>{e.substrate_type || '—'}</td>
                  <td style={cellStyle()}>{e.task_category || '—'}</td>
                  <td style={{ ...cellStyle(), fontFamily: 'monospace' }}>{e.hours}</td>
                  <td style={{ ...cellStyle(), fontFamily: 'monospace' }}>{e.completion_pct ?? '—'}%</td>
                  <td style={cellStyle()}>{e.worker_name || '—'}</td>
                  <td style={cellStyle()}>{e.notes || ''}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function cellStyle() {
  return { padding: '4px 8px', textAlign: 'left' };
}
```

- [ ] **Step 2: Smoke check**

Inject a legacy entry into IDB via preview_eval:
```js
(() => {
  return new Promise((resolve) => {
    const req = indexedDB.open('paintfactor');
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(['time_entries'], 'readwrite');
      const store = tx.objectStore('time_entries');
      const entry = {
        id: 'legacy_test_1',
        project_id: 'proj_1778779702274_cbqt',  // replace with your active project id
        date: '2026-01-15',
        room_id: 'room_x',
        substrate_type: 'baseboard',
        task_category: 'prep',
        hours: 2.5,
        completion_pct: 75,
        worker_name: 'Old Worker',
        notes: 'Legacy entry test',
      };
      const put = store.put(entry);
      put.onsuccess = () => { db.close(); resolve('injected'); };
    };
  });
})()
```

Then reload preview. Tracker tab should show the Legacy entries panel at the bottom. Expand it — should see the row.

Cleanup after smoke:
```js
(() => {
  return new Promise((resolve) => {
    const req = indexedDB.open('paintfactor');
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(['time_entries'], 'readwrite');
      tx.objectStore('time_entries').delete('legacy_test_1').onsuccess = () => { db.close(); resolve('deleted'); };
    };
  });
})()
```

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/tracker/LegacyEntriesPanel.jsx
git commit -m "feat(paintscope): add LegacyEntriesPanel with full table view (Tracker MVP)"
```

---

## Task 16: `RosterEditor` modal

**Files:**
- Create: `Claude/tools/paintscope/src/components/tracker/RosterEditor.jsx`
- Modify: `Claude/tools/paintscope/src/components/tracker/TrackerView.jsx` (add button to open it)
- Modify: `Claude/tools/paintscope/src/state/reducer.js` (add `REMOVE_ROSTER_NAME` action)

- [ ] **Step 1: Add the reducer action**

In `reducer.js`, add near the existing `APPEND_ROSTER_NAME` case:

```js
case 'REMOVE_ROSTER_NAME': {
  if (typeof payload !== 'string') return state;
  const roster = state.project.tracker_roster || [];
  const next = roster.filter(n => n !== payload);
  if (next.length === roster.length) return state;
  return { ...state, project: { ...state.project, tracker_roster: next } };
}
```

- [ ] **Step 2: Create the modal**

Create `Claude/tools/paintscope/src/components/tracker/RosterEditor.jsx`:

```jsx
import { useState } from 'react';
import { useProject } from '../../hooks/useProject';

export default function RosterEditor({ onClose }) {
  const { state, dispatch } = useProject();
  const roster = state.project?.tracker_roster || [];
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    dispatch({ type: 'APPEND_ROSTER_NAME', payload: newName.trim() });
    setNewName('');
  };

  const handleRemove = (name) => {
    dispatch({ type: 'REMOVE_ROSTER_NAME', payload: name });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #1f1f1f)', color: 'var(--text)',
          border: '1px solid var(--border, #333)', borderRadius: 6,
          padding: 20, maxWidth: 360, width: '90%',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Worker Roster</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="New worker name"
            style={{ flex: 1, background: 'var(--bg-input, #161616)', color: 'var(--text)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 3, fontSize: 12 }}
          />
          <button onClick={handleAdd} style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '4px 12px', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Add</button>
        </div>

        {roster.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
            No workers yet. Add names here or they'll auto-append when you save time entries.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {roster.map(name => (
              <li key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                <span>{name}</span>
                <button
                  onClick={() => handleRemove(name)}
                  style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 11 }}
                >Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the trigger button in TrackerView**

In `TrackerView.jsx`, add the button to the header row + open-state. At the top of the file add:

```jsx
import RosterEditor from './RosterEditor.jsx';
```

Inside the component function, add:

```jsx
const [rosterOpen, setRosterOpen] = useState(false);
```

And add the import for useState at the top alongside useMemo:

```jsx
import { useState, useMemo } from 'react';
```

In the header row JSX (where the status is shown), add a small button next to it:

```jsx
<button
  onClick={() => setRosterOpen(true)}
  style={{
    fontSize: 10, padding: '2px 6px', marginLeft: 8,
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-muted)', borderRadius: 3, cursor: 'pointer',
  }}
>Edit Roster</button>
```

At the bottom of the return JSX (after `<TrackerBody />`):

```jsx
{rosterOpen && <RosterEditor onClose={() => setRosterOpen(false)} />}
```

- [ ] **Step 4: Smoke check**

Reload preview. Tracker tab → click "Edit Roster" → modal opens. Add a name → it appears in list. Remove → it disappears. Verify the new name shows up in LogTimeForm's autocomplete datalist.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/tracker/RosterEditor.jsx Claude/tools/paintscope/src/components/tracker/TrackerView.jsx Claude/tools/paintscope/src/state/reducer.js
git commit -m "feat(paintscope): add RosterEditor modal + REMOVE_ROSTER_NAME action (Tracker MVP)"
```

---

## Task 17: End-to-end manual smoke (the six scenarios from the spec)

No file changes. Run each scenario end-to-end in the dev server. Document anything that doesn't behave as expected. Mark complete only when all six pass.

- [ ] **Step 1: Scenario 1 — Empty state for new project**

  - Setup: Create a fresh project (Projects tab → + New). Add a room with geometry so the estimate has substrates. Tracker tab → should show empty-state ("This project doesn't have a tracker snapshot yet").

- [ ] **Step 2: Scenario 2 — First snapshot via status transition**

  - Setup: Same project as Scenario 1.
  - Action: Go to Setup tab → change status dropdown to `in-progress` → confirm modal opens → click "Snapshot & Activate".
  - Expected: Status updates. Tracker tab shows full Element-Phase tree with activities + estimated hours.

- [ ] **Step 3: Scenario 3 — Log time, per-room mode**

  - Action: In Tracker tab, click an activity row → expand → `+ Log` → fill: worker "Tester", hours 2, mode Per-room, check one room → 100%, Save.
  - Expected: Form closes. Activity row updates with 2.0h logged, room shows ✓ + 100%. Activity completion % reflects the room's contribution (weighted by estimated_hours).

- [ ] **Step 4: Scenario 4 — Log time, project-wide mode**

  - Action: Click `+ Log` on the same activity → toggle mode to Project-wide → set Completion to 75 → Save.
  - Expected: Activity completion % = 75 (project-wide overrides per-room math). Per-room view still shows the prior room data.

- [ ] **Step 5: Scenario 5 — Re-snapshot after estimate change**

  - Setup: Existing snapshot from Scenarios 2-4. Go to Scope, add a new substrate (e.g., enable cabinets) so the estimate has new activities.
  - Action: Setup → flip status to `approved` (or any non-in-progress) → flip back to `in-progress` → re-snapshot confirm modal → Re-snapshot.
  - Expected: Tracker tab shows the new activities. Existing entries from Scenario 3 + 4 still appear on their original activities (entries are tied via `snapshot_id` but render against current snapshot's activities if `activity_id` matches).

- [ ] **Step 6: Scenario 6 — Legacy entry quarantine**

  - Inject a legacy entry via preview_eval (use the snippet from Task 15 Step 2; substitute your active project id).
  - Reload preview, navigate to Tracker tab.
  - Expected: Legacy entries panel at the bottom shows the injected entry. The main tree does NOT show it. Cleanup with the delete snippet.

- [ ] **Step 7: Roster autopopulate**

  - After Scenario 3's "Tester" entry was saved, click "Edit Roster" in TrackerView. Verify "Tester" appears in the list.

- [ ] **Step 8: Final test sweep**

```bash
cd Claude/tools/paintscope && npx vitest run
```

Expected: all tests pass (existing 73 + 8 Task-1 reducer tests + Task-5 element-parents tests + Task-6 build-snapshot tests + Task-7 rollup tests).

- [ ] **Step 9: No final commit needed**

All commits happened incrementally. The branch is ready for finishing-a-development-branch.

---

## Self-review checklist (for the implementing engineer)

After all tasks pass:

- [ ] Reducer tests (Task 1) + helper tests (Tasks 5, 6, 7) all pass via Vitest
- [ ] Existing 73 Vitest tests still pass
- [ ] No console errors in dev server during normal tracker use
- [ ] `tracker_snapshots` IDB store exists post-reload (verified via Task 2 Step 4)
- [ ] Status dropdown round-trips: estimate → approved → in-progress (snapshots) → completed
- [ ] Re-snapshot preserves entries tied to original activity_ids
- [ ] Legacy entries (`_legacy: true`) stay in the Legacy panel and never leak into the main tree
- [ ] LogTimeForm respects both modes; "All rooms" bulk-set works
- [ ] Activity completion rollup matches expected math (project mode wins, otherwise weighted average)
- [ ] No old `TimeTrackerView` / `TimeEntryForm` / `TimeEntrySummary` references anywhere in the codebase

## Phase 2+ notes (not in scope)

When picking up post-MVP:
- "Removed activities" panel for entries whose original activity is gone after re-snapshot
- Gantt rendering — derive per-activity actual_start/actual_end from entry dates; render as timeline (client portal consumer)
- Analytics dashboard — estimated-vs-actual rate confidence per activity, requires `employees` table
- P4P bonus calc — once `employees` + `bid_hours` / `p4p_target_hours` are in scope
- Inline entry editing (MVP supports create + delete only)
- Real auth / employees / RBAC — platform Phase 5

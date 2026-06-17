# Inline Rate Editing Phase A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `t.baseRate` cells in the Estimate view editable for tasks with a flat `rate_per_hour`. Edits persist into per-project state and flow to the engine via the existing `overlayMap` mechanism so estimate hours recompute live.

**Architecture:** Per-project rate-override map `state.project.rate_overrides` (keyed by `task_id`, shape `{ rate_per_hour, ts }`). Engine wiring extends `useEstimateScenario`'s existing `projectOverlayMap` builder. New `<RateCell>` component handles render-side eligibility check + edit UX. Stale overrides pruned on state load against the current bundle's `tasks` table.

**Tech Stack:** React 19, useReducer + Context, Vitest 3 for unit tests, no TypeScript, custom CSS via variables.css. PaintScope worktree under `Claude/tools/paintscope/`.

**Spec reference:** `Claude/docs/superpowers/specs/2026-05-15-inline-rate-editing-phase-a-design.md`

---

## Working directory + dev server

All file paths below are relative to:
`C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha`

Dev server is already running on port 5183 via `mcp__Claude_Preview__preview_start` ("paintscope" config in `.claude/launch.json`). Vite HMR will pick up edits live.

Vitest commands run from `Claude/tools/paintscope/`:
```
cd Claude/tools/paintscope && npx vitest run <path>
```

## File map

| File | Action |
|---|---|
| `Claude/tools/paintscope/src/state/initial-state.js` | Modify — add `rate_overrides: {}` to project initial state |
| `Claude/tools/paintscope/src/state/reducer.js` | Modify — add `SET_RATE_OVERRIDE` + `CLEAR_RATE_OVERRIDE` cases |
| `Claude/tools/paintscope/src/state/migrations.js` | Modify — backfill `rate_overrides` in `migrateInline`; add `pruneStaleRateOverrides` helper |
| `Claude/tools/paintscope/src/state/persistence.js` | Modify — call `pruneStaleRateOverrides` with bundle's `tasks` table in `loadFromStorage` |
| `Claude/tools/paintscope/src/state/__tests__/rate-overrides-reducer.test.js` | Create — vitest unit tests for new reducer cases |
| `Claude/tools/paintscope/src/state/__tests__/rate-overrides-migrations.test.js` | Create — vitest unit tests for `pruneStaleRateOverrides` |
| `Claude/tools/paintscope/src/hooks/useEstimateScenario.js` | Modify — merge `state.project.rate_overrides` into `projectOverlayMap` |
| `Claude/tools/paintscope/src/components/estimate/RateCell.jsx` | Create — editable rate cell component |
| `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx` | Modify — replace 4 `<td>{t.baseRate}</td>` render sites with `<RateCell>` |

---

## Task 1: State shape — add `rate_overrides` to project

**Files:**
- Modify: `Claude/tools/paintscope/src/state/initial-state.js`

- [ ] **Step 1: Find the project initial state**

Run: `grep -n "default_complexity" Claude/tools/paintscope/src/state/initial-state.js`
Expected: line ~246 showing `default_complexity: 'STD', default_application_method: 'spray_backroll',`

- [ ] **Step 2: Add `rate_overrides` to the project object**

In `initial-state.js`, find the project initializer block (the object literal whose properties include `default_complexity` around line 246). Add `rate_overrides: {},` as a new property on the same object. Place it after `default_application_method` for readability. Example:

```js
default_complexity: 'STD',
default_application_method: 'spray_backroll',
rate_overrides: {},
```

- [ ] **Step 3: Verify the edit**

Run: `grep -n "rate_overrides" Claude/tools/paintscope/src/state/initial-state.js`
Expected: one match showing `rate_overrides: {},`

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/state/initial-state.js
git commit -m "feat(paintscope): add project.rate_overrides to initial state (Phase A rate editing)"
```

---

## Task 2: Reducer — `SET_RATE_OVERRIDE` (TDD)

**Files:**
- Create: `Claude/tools/paintscope/src/state/__tests__/rate-overrides-reducer.test.js`
- Modify: `Claude/tools/paintscope/src/state/reducer.js`

- [ ] **Step 1: Write the failing tests**

Create `Claude/tools/paintscope/src/state/__tests__/rate-overrides-reducer.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reducer } from '../reducer.js';

function makeState(rateOverrides = {}) {
  return {
    rooms: [],
    project: {
      name: 'test',
      rate_overrides: rateOverrides,
    },
    ui: {},
  };
}

describe('reducer SET_RATE_OVERRIDE', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T12:00:00Z'));
  });

  it('sets a new override entry with rate_per_hour and ts', () => {
    const state = makeState({});
    const action = { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF', rate_per_hour: 95 } };
    const next = reducer(state, action);
    expect(next.project.rate_overrides.TSK_BRUSH_COAT_LF).toEqual({
      rate_per_hour: 95,
      ts: new Date('2026-05-16T12:00:00Z').getTime(),
    });
  });

  it('overwrites an existing override and updates ts', () => {
    const state = makeState({ TSK_BRUSH_COAT_LF: { rate_per_hour: 80, ts: 1000 } });
    const action = { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF', rate_per_hour: 95 } };
    const next = reducer(state, action);
    expect(next.project.rate_overrides.TSK_BRUSH_COAT_LF.rate_per_hour).toBe(95);
    expect(next.project.rate_overrides.TSK_BRUSH_COAT_LF.ts).toBeGreaterThan(1000);
  });

  it('treats zero or null rate_per_hour as a clear', () => {
    const state = makeState({ TSK_BRUSH_COAT_LF: { rate_per_hour: 80, ts: 1000 } });
    const next1 = reducer(state, { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF', rate_per_hour: 0 } });
    expect(next1.project.rate_overrides.TSK_BRUSH_COAT_LF).toBeUndefined();

    const next2 = reducer(state, { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF', rate_per_hour: null } });
    expect(next2.project.rate_overrides.TSK_BRUSH_COAT_LF).toBeUndefined();
  });

  it('preserves other overrides when setting one', () => {
    const state = makeState({
      TSK_A: { rate_per_hour: 80, ts: 1000 },
      TSK_B: { rate_per_hour: 50, ts: 1000 },
    });
    const next = reducer(state, { type: 'SET_RATE_OVERRIDE', payload: { task_id: 'TSK_C', rate_per_hour: 30 } });
    expect(Object.keys(next.project.rate_overrides).sort()).toEqual(['TSK_A', 'TSK_B', 'TSK_C']);
    expect(next.project.rate_overrides.TSK_A.rate_per_hour).toBe(80);
    expect(next.project.rate_overrides.TSK_B.rate_per_hour).toBe(50);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/state/__tests__/rate-overrides-reducer.test.js`
Expected: 4 tests FAIL (action type not yet handled — reducer returns state unchanged or matches no case).

- [ ] **Step 3: Implement the reducer case**

In `Claude/tools/paintscope/src/state/reducer.js`, find the `switch (type) {` block around line 33. Add a new case anywhere in the switch (recommend placing near other `SET_PROJECT*` cases). Add this case:

```js
case 'SET_RATE_OVERRIDE': {
  const { task_id, rate_per_hour } = payload || {};
  if (!task_id) return state;
  const cur = state.project.rate_overrides || {};
  if (rate_per_hour == null || rate_per_hour <= 0) {
    const next = { ...cur };
    delete next[task_id];
    return { ...state, project: { ...state.project, rate_overrides: next } };
  }
  return {
    ...state,
    project: {
      ...state.project,
      rate_overrides: {
        ...cur,
        [task_id]: { rate_per_hour, ts: Date.now() },
      },
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/state/__tests__/rate-overrides-reducer.test.js`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/state/reducer.js Claude/tools/paintscope/src/state/__tests__/rate-overrides-reducer.test.js
git commit -m "feat(paintscope): add SET_RATE_OVERRIDE reducer action (Phase A rate editing)"
```

---

## Task 3: Reducer — `CLEAR_RATE_OVERRIDE` (TDD)

**Files:**
- Modify: `Claude/tools/paintscope/src/state/__tests__/rate-overrides-reducer.test.js` (append)
- Modify: `Claude/tools/paintscope/src/state/reducer.js`

- [ ] **Step 1: Append failing tests**

Append to `rate-overrides-reducer.test.js` (after the `SET_RATE_OVERRIDE` describe block):

```js
describe('reducer CLEAR_RATE_OVERRIDE', () => {
  it('removes an existing override entry', () => {
    const state = makeState({
      TSK_BRUSH_COAT_LF: { rate_per_hour: 80, ts: 1000 },
      TSK_OTHER: { rate_per_hour: 50, ts: 1000 },
    });
    const next = reducer(state, { type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: 'TSK_BRUSH_COAT_LF' } });
    expect(next.project.rate_overrides.TSK_BRUSH_COAT_LF).toBeUndefined();
    expect(next.project.rate_overrides.TSK_OTHER).toBeDefined();
  });

  it('is a no-op when the task_id has no override', () => {
    const state = makeState({ TSK_A: { rate_per_hour: 80, ts: 1000 } });
    const next = reducer(state, { type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: 'TSK_DOES_NOT_EXIST' } });
    expect(next.project.rate_overrides.TSK_A.rate_per_hour).toBe(80);
  });

  it('handles missing payload.task_id gracefully', () => {
    const state = makeState({ TSK_A: { rate_per_hour: 80, ts: 1000 } });
    const next = reducer(state, { type: 'CLEAR_RATE_OVERRIDE', payload: {} });
    expect(next).toEqual(state);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/state/__tests__/rate-overrides-reducer.test.js`
Expected: 3 new tests FAIL, 4 previous tests still PASS.

- [ ] **Step 3: Implement the reducer case**

In `reducer.js`, immediately after the `SET_RATE_OVERRIDE` case from Task 2, add:

```js
case 'CLEAR_RATE_OVERRIDE': {
  const { task_id } = payload || {};
  if (!task_id) return state;
  const cur = state.project.rate_overrides || {};
  if (!cur[task_id]) return state;
  const next = { ...cur };
  delete next[task_id];
  return { ...state, project: { ...state.project, rate_overrides: next } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/state/__tests__/rate-overrides-reducer.test.js`
Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/state/reducer.js Claude/tools/paintscope/src/state/__tests__/rate-overrides-reducer.test.js
git commit -m "feat(paintscope): add CLEAR_RATE_OVERRIDE reducer action (Phase A rate editing)"
```

---

## Task 4: Migration backfill — ensure `rate_overrides` exists on load

**Files:**
- Modify: `Claude/tools/paintscope/src/state/migrations.js`

- [ ] **Step 1: Find migrateInline**

Run: `grep -n "export function migrateInline" Claude/tools/paintscope/src/state/migrations.js`
Expected: one match showing the function signature.

- [ ] **Step 2: Add backfill block**

Inside `migrateInline(parsed)` (just before its `return parsed;` at the end of the function — or before the existing closing braces if there's no explicit return; review the function and append the backfill at the end before the final `return parsed`):

```js
// Phase A rate editing: backfill empty rate_overrides map if the project predates this feature.
if (parsed.project && !parsed.project.rate_overrides) {
  parsed.project.rate_overrides = {};
}
```

- [ ] **Step 3: Smoke-verify via dev server**

The dev server is running on port 5183. Use the preview MCP eval to confirm a freshly-loaded project state has `rate_overrides` defined:

```js
JSON.parse(localStorage.getItem('paintscope_state')).project.rate_overrides
```

Expected: `{}` (empty object) — or an existing override map if there's stored state from prior testing.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/state/migrations.js
git commit -m "feat(paintscope): backfill project.rate_overrides on load (Phase A rate editing)"
```

---

## Task 5: Prune helper — `pruneStaleRateOverrides` (TDD)

**Files:**
- Create: `Claude/tools/paintscope/src/state/__tests__/rate-overrides-migrations.test.js`
- Modify: `Claude/tools/paintscope/src/state/migrations.js`

- [ ] **Step 1: Write the failing tests**

Create `Claude/tools/paintscope/src/state/__tests__/rate-overrides-migrations.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pruneStaleRateOverrides } from '../migrations.js';

function makeTasks(tasks) {
  return tasks;
}

describe('pruneStaleRateOverrides', () => {
  it('keeps overrides for tasks that still exist and use rate_per_hour', () => {
    const tasks = makeTasks({
      TSK_A: { task_id: 'TSK_A', rate_per_hour: 80 },
    });
    const state = { project: { rate_overrides: { TSK_A: { rate_per_hour: 95, ts: 1000 } } } };
    const result = pruneStaleRateOverrides(state, tasks);
    expect(result.project.rate_overrides.TSK_A).toEqual({ rate_per_hour: 95, ts: 1000 });
    expect(result._lastRateOverridePruneReport).toBeUndefined();
  });

  it('drops overrides for tasks not in the bundle (archived/missing)', () => {
    const tasks = makeTasks({});
    const state = { project: { rate_overrides: { TSK_ARCHIVED: { rate_per_hour: 95, ts: 1000 } } } };
    const result = pruneStaleRateOverrides(state, tasks);
    expect(result.project.rate_overrides.TSK_ARCHIVED).toBeUndefined();
    expect(result._lastRateOverridePruneReport.dropped).toEqual([
      { task_id: 'TSK_ARCHIVED', reason: 'task archived/missing' },
    ]);
  });

  it('drops overrides for tasks that no longer use flat rate_per_hour', () => {
    const tasks = makeTasks({
      TSK_TIER: { task_id: 'TSK_TIER', rates_by_tier: { QT3: 80, QT4: 75, QT5: 70 } },
      TSK_FIXED: { task_id: 'TSK_FIXED', fixed_minutes: 5 },
      TSK_RATES: { task_id: 'TSK_RATES', rates: [{ rate_per_hour: 80 }] },
      TSK_COAT: { task_id: 'TSK_COAT', rates_by_coat: { '1': 80, '2': 65 } },
    });
    const state = {
      project: {
        rate_overrides: {
          TSK_TIER: { rate_per_hour: 95, ts: 1000 },
          TSK_FIXED: { rate_per_hour: 10, ts: 1000 },
          TSK_RATES: { rate_per_hour: 90, ts: 1000 },
          TSK_COAT: { rate_per_hour: 85, ts: 1000 },
        },
      },
    };
    const result = pruneStaleRateOverrides(state, tasks);
    expect(result.project.rate_overrides).toEqual({});
    expect(result._lastRateOverridePruneReport.dropped.length).toBe(4);
    expect(result._lastRateOverridePruneReport.dropped.every(d => d.reason === 'task no longer uses flat rate_per_hour')).toBe(true);
  });

  it('is a no-op when rate_overrides is empty or missing', () => {
    const tasks = makeTasks({ TSK_A: { task_id: 'TSK_A', rate_per_hour: 80 } });
    const result1 = pruneStaleRateOverrides({ project: { rate_overrides: {} } }, tasks);
    expect(result1.project.rate_overrides).toEqual({});
    expect(result1._lastRateOverridePruneReport).toBeUndefined();

    const result2 = pruneStaleRateOverrides({ project: {} }, tasks);
    expect(result2).toEqual({ project: {} });
  });

  it('does not mutate the input state', () => {
    const tasks = makeTasks({});
    const state = { project: { rate_overrides: { TSK_GONE: { rate_per_hour: 95, ts: 1000 } } } };
    const snapshot = JSON.stringify(state);
    pruneStaleRateOverrides(state, tasks);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/state/__tests__/rate-overrides-migrations.test.js`
Expected: ALL tests FAIL with "pruneStaleRateOverrides is not a function" or import error (the function doesn't exist yet).

- [ ] **Step 3: Implement the prune helper**

In `Claude/tools/paintscope/src/state/migrations.js`, add a new exported function (place after `migrateInline`, near the bottom of the file):

```js
/**
 * Prune rate overrides for tasks that have been archived, renamed, or shape-shifted
 * (e.g., a task that used to have flat rate_per_hour now uses rates_by_tier).
 * Pure function — returns a new state object; never mutates input.
 *
 * @param {object} state - The state object (must have state.project)
 * @param {object} tasks - The bundle's tasks table (task_id -> canonical task)
 * @returns {object} - State with pruned rate_overrides + optional _lastRateOverridePruneReport
 */
export function pruneStaleRateOverrides(state, tasks) {
  if (!state || !state.project) return state;
  const overrides = state.project.rate_overrides;
  if (!overrides || Object.keys(overrides).length === 0) return state;

  const pruned = {};
  const dropped = [];
  for (const [task_id, ov] of Object.entries(overrides)) {
    const canonical = tasks && tasks[task_id];
    if (!canonical) {
      dropped.push({ task_id, reason: 'task archived/missing' });
      continue;
    }
    const ineligible = (
      typeof canonical.rate_per_hour !== 'number' ||
      canonical.rates ||
      canonical.rates_by_tier ||
      canonical.rates_by_coat ||
      canonical.fixed_minutes != null
    );
    if (ineligible) {
      dropped.push({ task_id, reason: 'task no longer uses flat rate_per_hour' });
      continue;
    }
    pruned[task_id] = ov;
  }

  if (dropped.length === 0) {
    return state;
  }
  return {
    ...state,
    project: { ...state.project, rate_overrides: pruned },
    _lastRateOverridePruneReport: { dropped, ts: Date.now() },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/state/__tests__/rate-overrides-migrations.test.js`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/state/migrations.js Claude/tools/paintscope/src/state/__tests__/rate-overrides-migrations.test.js
git commit -m "feat(paintscope): add pruneStaleRateOverrides helper + tests (Phase A rate editing)"
```

---

## Task 6: Wire prune into `loadFromStorage`

**Files:**
- Modify: `Claude/tools/paintscope/src/state/persistence.js`

- [ ] **Step 1: Read current persistence.js**

Run: `cat Claude/tools/paintscope/src/state/persistence.js | head -30`
Expected: shows `STORAGE_KEY = 'paintscope_state'` and `loadFromStorage(init)` function that calls `migrateV02toV03` and `migrateInline`.

- [ ] **Step 2: Import the prune helper + bundle tasks**

At the top of `persistence.js`, update the imports to include `pruneStaleRateOverrides` from migrations and the `tasks` table from the bundle:

```js
import { migrateV02toV03, migrateInline, pruneStaleRateOverrides } from './migrations';
import { tasks as bundleTasks } from '../data/scenario-bundle.gen';
```

- [ ] **Step 3: Call prune after the existing migrations**

In `loadFromStorage`, after the `migrateInline` call (right before the `return { ...parsed, ui: ... }` line), add:

```js
parsed = pruneStaleRateOverrides(parsed, bundleTasks);
```

The block should now look like:

```js
if (parsed.project && parsed.rooms) {
  parsed = migrateV02toV03(parsed);
  parsed = migrateInline(parsed);
  parsed = pruneStaleRateOverrides(parsed, bundleTasks);
  return { ...parsed, ui: parsed.ui || init.ui };
}
```

- [ ] **Step 4: Smoke-verify on the dev server**

The dev server should HMR-reload. Manually inject a stale override via the preview eval, force a reload, and confirm it's pruned + the report is in state.

Run via preview_eval (you'll get the latest serverId from `preview_list`):

```js
(() => {
  const s = JSON.parse(localStorage.getItem('paintscope_state'));
  s.project.rate_overrides = { TSK_DOES_NOT_EXIST: { rate_per_hour: 100, ts: Date.now() } };
  localStorage.setItem('paintscope_state', JSON.stringify(s));
  return 'injected';
})()
```

Then reload the page:

```js
window.location.reload()
```

Then check console logs are clean and the override is gone:

```js
(() => {
  const s = JSON.parse(localStorage.getItem('paintscope_state'));
  return { rate_overrides: s.project.rate_overrides, hadStale: s.project.rate_overrides?.TSK_DOES_NOT_EXIST };
})()
```

Expected: `rate_overrides` is `{}`, `hadStale` is `undefined`. The state-level `_lastRateOverridePruneReport` should be populated (won't be in the stored JSON yet since saveToStorage hasn't fired, but it's in memory).

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/state/persistence.js
git commit -m "feat(paintscope): wire pruneStaleRateOverrides into loadFromStorage (Phase A rate editing)"
```

---

## Task 7: Engine wiring — extend `projectOverlayMap` (TDD)

**Files:**
- Modify: `Claude/tools/paintscope/src/hooks/useEstimateScenario.js`

- [ ] **Step 1: Read the existing projectOverlayMap builder**

Run: `grep -n "projectOverlayMap" Claude/tools/paintscope/src/hooks/useEstimateScenario.js`
Expected: lines around 85-100 building the map from `protection_heuristics`, and line ~124 passing it to the engine.

- [ ] **Step 2: Add rate-override merge after the existing block**

In `useEstimateScenario.js`, find the existing block that ends with:

```js
setRate('TSK_PREP_HVAC_VENT_REINSTALL',    ph.hvac_remove_reinstall_rate);
```

(Around line 100.) Immediately after that line, add:

```js
// Phase A: merge user-edited rate overrides (state.project.rate_overrides) into
// the overlayMap. User overrides win on collision with protection_heuristics
// rates — most recent intent wins.
const userOverrides = state?.project?.rate_overrides || {};
for (const [taskId, ov] of Object.entries(userOverrides)) {
  if (ov?.rate_per_hour != null && ov.rate_per_hour > 0) {
    projectOverlayMap[taskId] = { rate_per_hour: ov.rate_per_hour };
  }
}
```

- [ ] **Step 3: Smoke-verify via dev server**

The dev server will HMR. Use preview_eval to inject an override on an actually-firing task and see hours change. First find an active task with `rate_per_hour` (any room's brush task in the estimate):

```js
(() => {
  const s = JSON.parse(localStorage.getItem('paintscope_state'));
  // Set a clearly visible override
  s.project.rate_overrides = { TSK_BRUSH_COAT_LF: { rate_per_hour: 1, ts: Date.now() } };
  localStorage.setItem('paintscope_state', JSON.stringify(s));
  return 'set rate to 1 LF/hr (very slow — should make brush coat tasks balloon)';
})()
```

Reload, navigate to the Estimate tab, and confirm any tasks using `TSK_BRUSH_COAT_LF` now show wildly inflated hours. Then clear:

```js
(() => {
  const s = JSON.parse(localStorage.getItem('paintscope_state'));
  s.project.rate_overrides = {};
  localStorage.setItem('paintscope_state', JSON.stringify(s));
  return 'cleared';
})()
```

Reload and confirm hours snap back to canonical.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/hooks/useEstimateScenario.js
git commit -m "feat(paintscope): merge state.project.rate_overrides into projectOverlayMap (Phase A rate editing)"
```

---

## Task 8: Create the `<RateCell>` component

**Files:**
- Create: `Claude/tools/paintscope/src/components/estimate/RateCell.jsx`

- [ ] **Step 1: Create the component file**

Create `Claude/tools/paintscope/src/components/estimate/RateCell.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';
import { tasks as bundleTasks } from '../../data/scenario-bundle.gen';

/**
 * Editable rate cell for the Estimate view.
 *
 * Replaces `<td>{t.baseRate}</td>` render sites. Looks up the canonical task
 * from the bundle to determine if this task is editable (flat rate_per_hour only).
 *
 * Props:
 *  - taskId:     string — used to look up canonical and read/write override
 *  - baseRate:   string|number — engine-resolved current rate to display when not eligible/editing
 *  - isFixed:    boolean — fixed-minute task; never editable (engine renders em-dash separately)
 *  - override:   { rate_per_hour, ts } | undefined — current override entry from state
 *  - dispatch:   reducer dispatch function
 */
export default function RateCell({ taskId, baseRate, isFixed, override, dispatch }) {
  const canonical = taskId ? bundleTasks[taskId] : null;
  const isEditable = (
    !isFixed &&
    canonical &&
    typeof canonical.rate_per_hour === 'number' &&
    !canonical.rates &&
    !canonical.rates_by_tier &&
    !canonical.rates_by_coat &&
    canonical.fixed_minutes == null
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Fixed-minute or no canonical: render the existing display (em-dash, etc.)
  if (isFixed || !canonical) {
    return (
      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{baseRate}</td>
    );
  }

  // Not eligible: render static value with explanatory tooltip
  if (!isEditable) {
    return (
      <td
        style={{ textAlign: 'right', color: 'var(--text-muted)' }}
        title="Tier or coat-keyed task — edit in Authoring → Tasks"
      >
        {baseRate}
      </td>
    );
  }

  const hasOverride = override && override.rate_per_hour != null;
  const displayRate = hasOverride ? override.rate_per_hour : (canonical.rate_per_hour);
  const canonicalRate = canonical.rate_per_hour;

  const commit = (raw) => {
    setEditing(false);
    if (raw === '' || raw == null) {
      // Empty = clear
      if (hasOverride) {
        dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
      }
      return;
    }
    const n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) {
      // Invalid input — treat as clear
      if (hasOverride) {
        dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
      }
      return;
    }
    if (n === canonicalRate) {
      // Matches canonical — clear the override so we don't carry a no-op entry
      if (hasOverride) {
        dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
      }
      return;
    }
    dispatch({ type: 'SET_RATE_OVERRIDE', payload: { task_id: taskId, rate_per_hour: n } });
  };

  const revert = (e) => {
    e.stopPropagation();
    dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
  };

  if (editing) {
    return (
      <td style={{ textAlign: 'right', padding: 0 }}>
        <input
          ref={inputRef}
          type="number"
          step="any"
          min="0"
          defaultValue={displayRate}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(e.target.value); }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          }}
          onChange={e => setDraft(e.target.value)}
          style={{
            width: '100%',
            textAlign: 'right',
            background: 'var(--bg-input, #1f1f1f)',
            color: 'var(--text)',
            border: '1px solid var(--accent, #82aaff)',
            padding: '2px 4px',
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={() => { setDraft(String(displayRate)); setEditing(true); }}
      title={hasOverride ? `Canonical: ${canonicalRate}. Click to edit. Click ↺ to revert.` : `Canonical: ${canonicalRate}. Click to edit.`}
      style={{
        textAlign: 'right',
        cursor: 'pointer',
        color: hasOverride ? 'var(--accent, #82aaff)' : 'var(--text-muted)',
        fontStyle: hasOverride ? 'italic' : 'normal',
        userSelect: 'none',
      }}
    >
      {displayRate}
      {hasOverride && (
        <span
          onClick={revert}
          title="Revert to canonical rate"
          style={{ marginLeft: 4, fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          ↺
        </span>
      )}
    </td>
  );
}
```

- [ ] **Step 2: Verify file syntax**

Run: `node --check Claude/tools/paintscope/src/components/estimate/RateCell.jsx` (skip if Node refuses JSX) OR rely on the dev server's HMR error reporting (next step).

- [ ] **Step 3: Smoke check via dev server**

Just open the file via dev server. Since it's not wired into EstimateView yet, it won't render — but Vite will still parse and report syntax errors. Check the preview console for errors:

```js
// preview_console_logs level=error
```

Expected: no parse errors from `RateCell.jsx`.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/RateCell.jsx
git commit -m "feat(paintscope): add RateCell component (Phase A rate editing)"
```

---

## Task 9: Wire `<RateCell>` into spec-row task table

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx`

- [ ] **Step 1: Import RateCell + read state/dispatch**

In `EstimateView.jsx`, near the existing imports at the top, add:

```js
import RateCell from './RateCell.jsx';
```

The component already destructures `state` and `dispatch` from `useProject()` (see `const { state, dispatch } = useProject();` at the top of the component function — confirm with `grep -n "useProject" Claude/tools/paintscope/src/components/estimate/EstimateView.jsx`).

- [ ] **Step 2: Locate the spec-row baseRate cell**

Run: `grep -n "t.baseRate" Claude/tools/paintscope/src/components/estimate/EstimateView.jsx`
Expected: 4 matches at approximate lines 686, 780, 820, 881.

- [ ] **Step 3: Replace the spec-row cell (line ~881)**

Find this line in the spec-row task render (look for the `<tr key={i} ...>` block inside the spec list mapping; the cell is inside that row):

```jsx
<td style={{textAlign:'right',color:'var(--text-muted)'}}>{t.baseRate}</td>
```

Replace with:

```jsx
<RateCell taskId={t.taskId} baseRate={t.baseRate} isFixed={t.isFixed} override={state.project.rate_overrides?.[t.taskId]} dispatch={dispatch} />
```

- [ ] **Step 4: Smoke test in browser**

Open the dev server, navigate to the Estimate tab on a room with active spec tasks (e.g., walls or trim). Click on a rate cell — an input should appear. Type a new number, press Enter. Hours should recompute live. The cell should now show the value in accent color with a ↺ revert glyph. Click ↺ to restore canonical.

If any tasks render as "[number]" without the editable cell behavior, it's because they're not eligible (likely have `rates_by_tier`). Hover should show the canonical-tooltip.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/EstimateView.jsx
git commit -m "feat(paintscope): wire RateCell into spec-row task tables (Phase A rate editing)"
```

---

## Task 10: Wire `<RateCell>` into protection tables

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx`

- [ ] **Step 1: Replace room-protection cell (around line 686)**

Find the room-protection task row block (`{rp.tasks.map((t, i) => (...))}`). Replace its baseRate cell:

```jsx
<td style={{textAlign:'right',color:'var(--text-muted)'}}>{t.baseRate}</td>
```

with:

```jsx
<RateCell taskId={t.taskId} baseRate={t.baseRate} isFixed={t.isFixed} override={state.project.rate_overrides?.[t.taskId]} dispatch={dispatch} />
```

- [ ] **Step 2: Replace fixture-protection cell (around line 780)**

Find the fixture-protection task row block (`{fp.tasks.map((t, i) => (...))}`). Replace its baseRate cell with the same `<RateCell ...>` pattern.

- [ ] **Step 3: Replace project-protection rollup cell (around line 820)**

Find the project-protection task row block (the one with `projectProtection.tasks.sort(...).map(...)`). The cell shows `Math.round((t.quantity || 0) * 100) / 100` and includes `{t.baseRate || '—'}`. Replace the baseRate `<td>` with `<RateCell ...>`. **Note:** the existing render path uses `{t.baseRate || '—'}` to render em-dash when baseRate is empty; RateCell already handles fixed tasks. Keep `isFixed` accurate by reading the canonical, but the `t.isFixed` field from the aggregator should be populated.

- [ ] **Step 4: Smoke test all three tables**

Open the Estimate tab. For each of:
- A room with fixture protection (e.g., a bathroom with cabinets/vanity)
- A project with multiple rooms (to make the Project Protection card show aggregated tasks)

Click on the baseRate cell in each table type. Confirm:
- Edit works (input appears, Enter commits)
- Override applies to ALL line items using that task (project-protection card is the proof — one edit, all rooms' line items update)
- ↺ revert restores canonical

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/EstimateView.jsx
git commit -m "feat(paintscope): wire RateCell into protection task tables (Phase A rate editing)"
```

---

## Task 11: Warn-band UI for prune report (optional polish)

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx`

- [ ] **Step 1: Add the banner JSX**

Near the top of the EstimateView render (inside the outer `<div>` but before the room cards), add a dismissible banner gated on `state._lastRateOverridePruneReport`:

```jsx
{state._lastRateOverridePruneReport && state._lastRateOverridePruneReport.dropped?.length > 0 && (
  <div style={{
    background: 'var(--warning-bg, rgba(241, 196, 15, 0.1))',
    border: '1px solid var(--warning, #f1c40f)',
    borderRadius: 4,
    padding: 12,
    margin: '0 0 12px',
    fontSize: 12,
    color: 'var(--text-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  }}>
    <div>
      <strong style={{ color: 'var(--warning, #f1c40f)' }}>
        {state._lastRateOverridePruneReport.dropped.length} rate override{state._lastRateOverridePruneReport.dropped.length === 1 ? '' : 's'} dropped:
      </strong>{' '}
      {state._lastRateOverridePruneReport.dropped.map(d => `${d.task_id} (${d.reason})`).join(', ')}
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
        These tasks have been archived, renamed, or now use tier-specific rates. Re-tune via Authoring or new task IDs if needed.
      </div>
    </div>
    <button
      onClick={() => dispatch({ type: 'CLEAR_PRUNE_REPORT' })}
      style={{
        background: 'transparent', border: 'none', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: 14, padding: 4,
      }}
      title="Dismiss"
    >
      ×
    </button>
  </div>
)}
```

- [ ] **Step 2: Add the dismiss reducer case**

In `reducer.js`, add this case near the rate-override cases:

```js
case 'CLEAR_PRUNE_REPORT': {
  const next = { ...state };
  delete next._lastRateOverridePruneReport;
  return next;
}
```

- [ ] **Step 3: Smoke test**

Inject a stale override via preview_eval (see Task 6 Step 4), reload, navigate to Estimate. Confirm:
- Banner appears with the dropped task_id
- Clicking × dismisses it (state._lastRateOverridePruneReport is removed; banner doesn't return)

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/EstimateView.jsx Claude/tools/paintscope/src/state/reducer.js
git commit -m "feat(paintscope): warn-band for dropped rate overrides + dismiss action (Phase A rate editing)"
```

---

## Task 12: End-to-end verification + final commit

- [ ] **Step 1: Full regression test sweep**

Run the existing test suite from the paintscope directory:

```bash
cd Claude/tools/paintscope && npx vitest run
```

Expected: all existing tests pass; new tests from Tasks 2, 3, 5 pass.

- [ ] **Step 2: Manual end-to-end test**

In the running dev server:

1. **Eligibility:** Open Estimate. Visually confirm rate cells on `TSK_BRUSH_COAT_LF` / `TSK_INSPECT_COATING_LF` / `TSK_INSPECT_COATING_SF` (flat-rate tasks) are clickable; cells on any tier-keyed tasks (look for ones that hover-show "Tier or coat-keyed task" tooltip) are read-only.

2. **Edit + persistence:** Edit a rate, observe hours change. Reload page. Confirm override survives + cell still shows accent + ↺.

3. **Revert:** Click ↺. Confirm cell returns to muted style, hours snap back to canonical.

4. **Multi-room aggregation:** On a project with ≥2 rooms that have the same task (e.g., both rooms use baseboard), edit the rate in one row. Confirm ALL rows for that task in all rooms reflect the new rate (since the override is task_id-keyed project-wide).

5. **Orphan prune:** Inject a non-existent task_id override via preview_eval (see Task 6). Reload. Confirm:
   - Override entry removed from state.project.rate_overrides
   - Warn-band shows "1 rate override dropped: TSK_DOES_NOT_EXIST (task archived/missing)"
   - Clicking × dismisses it

6. **Diagnostic view bonus:** Switch to the Estimate → Diagnostic tab. Find a task you've overridden in the spec list. Confirm its `base rate` column shows the override value (engine returns `source: 'overlay'` which the diagnostic picks up for free).

- [ ] **Step 3: Update Notion with completion**

(Optional — only if syncing Notion incrementally for this work.) Add an entry to the main backlog page commit log table:

| Commit | Subject |
|---|---|
| `<final-hash>` | feat(paintscope): Phase A inline rate editing |

- [ ] **Step 4: No final commit needed**

All commits happened incrementally per task. The branch is now ready for either:
- Continued work into Phase B (save-to-library promote button)
- Merge / push to origin

---

## Self-review checklist (for the implementing engineer)

After all tasks pass:

- [ ] All 12 new test cases in `rate-overrides-reducer.test.js` and `rate-overrides-migrations.test.js` pass
- [ ] Existing vitest suite still passes
- [ ] Dev server console clean — no warnings about missing imports, undefined state, etc.
- [ ] Rate cell edits flow through the engine (verified by manual hour-comparison before/after edit)
- [ ] Override entries persist across page reload
- [ ] Override entries survive project export + reimport (test by exporting JSON via the Estimate export button, clearing localStorage, importing)
- [ ] Stale overrides prune cleanly with warn-band UX on next load
- [ ] No engine code changed — `overlayMap` mechanism handles everything from the existing wiring
- [ ] No bundle regen needed — `scenario-bundle.gen.js` is untouched

## Phase B / C notes

Not in scope here. When picking up Phase B:
- Add a "Save to library" button per overridden row → calls existing `publishTask()` path with the new rate
- Audit-stamp `_meta.last_calibrated_at` / `_meta.last_calibrated_from` in the published task JSON
- Reconcile with the Authoring Drafts pipeline (alert if a draft already exists for the same task)

Phase C will need a dedicated "Rate Optimization" view — separate plan when the time comes.

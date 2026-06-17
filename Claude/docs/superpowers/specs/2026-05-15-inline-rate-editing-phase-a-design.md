# Inline Rate Editing — Phase A (Session-Only Calibration)

**Date:** 2026-05-15
**Status:** Design Approved
**Scope:** PaintScope Estimate view — make `t.baseRate` cells editable for tasks with a flat `rate_per_hour`; persist edits to project state; flow through to the engine via the existing `overlayMap` mechanism.
**Backlog source:** Memory note `project_editable_rates_in_lab.md` (parked 2026-05-03). User-driven request 2026-05-15 to enable in-estimate rate optimization without modifying canonical task JSONs.

---

## Problem

Today, when an estimator notices that an estimate's hours for a task look off (e.g., "this baseboard finish line should be 1.2h, but it's showing 0.9h"), there's no fast way to test a corrected rate. The only path is:

1. Leave the estimate
2. Open Authoring → Tasks
3. Find the task
4. Edit `rate_per_hour`
5. Save as draft
6. Publish (writes canonical JSON, regens bundle)
7. Return to the estimate to see the result

That's a 7-step round-trip with global side effects, for what should be an iterative calibration loop. Estimators tune rates *while looking at the impact on a specific project*, not in a separate authoring screen detached from the project context.

## Goal

In the Estimate view, every cell that currently displays `t.baseRate` becomes editable for eligible tasks. Edits write to a per-project rate override map in state. The existing engine `overlayMap` (priority 0 in `resolveTaskRate`) absorbs the overrides at runtime, so the estimate recomputes live. Canonical task JSONs and the bundle are untouched.

Phase A produces an iterative calibration loop scoped to one project. Phase B (separate spec, not in scope here) will add "Save to library" — promotion of a project's override into a published task draft.

## Out of Scope

- **Save to library** — that's Phase B
- **Tier-specific edits** (`rates_by_tier`): read-only fallthrough with tooltip pointing at Authoring
- **Coat-specific edits** (`rates_by_coat`): same
- **Fixed-minute edits** (`fixed_minutes`): same
- **Per-rate-row edits** within `rates[]` arrays: same
- **Cross-project shared overrides** — each project has its own map
- **Editing in `EstimateDiagnostic.jsx`** — read-only is fine; the diagnostic will *display* overridden rates correctly because the engine returns `source: 'overlay'` already
- **Legacy engine** (`run-estimate.js`) — uses a different key format. Per memory, Scenario Engine is the default since commit `961e0b4` (2026-05-01); legacy is deprecated. Phase A targets scenario engine only.
- **Authoring drafts collision UX** — Phase B will surface merge logic if needed; Phase A treats overlay (project) and drafts (global) as independent channels

## Verified Findings

Read the codebase before designing. The following facts are ratified:

### Engine — `overlayMap` mechanism

`run-estimate-scenario.js:572-580` (`resolveTaskRate`):
- Priority 0 — short-circuits all canonical lookups
- Keyed by `task_id` (flat — not `${specFamilyId}::${task_id}` like the legacy engine)
- Shape: `{ [task_id]: { rate_per_hour: N } }` for flat rate, or `{ [task_id]: { fixed_minutes: N } }` for fixed
- Returns `source: 'overlay'` so diagnostic and any other consumer can label it

`useEstimateScenario.js:81-100` already builds a `projectOverlayMap` and passes it to the engine. Currently populated from `state.project.protection_heuristics.{outlet_mask_rate, hvac_mask_rate, ...}`. Extending it to merge a user-driven rate-override map is a one-block addition.

### State — persistence

`state/persistence.js`: single localStorage key `paintscope_state`, full state JSON via `loadFromStorage` / `saveToStorage`. Per-project rate overrides go *inside* the project object (`state.project.rate_overrides`) and persist with the project automatically.

### Bundle — task introspection

`scenario-bundle.gen.js` exports `tasks` table. Each entry has the canonical fields the UI needs to check eligibility (`rate_per_hour`, optionally `rates`, `rates_by_tier`, `rates_by_coat`, `fixed_minutes`).

### UI — render points

`EstimateView.jsx` has 4 `t.baseRate` render points:
- Line 881 — spec rows (per-substrate task tables)
- Line 686 — room protection table
- Line 780 — fixture protection table
- Line 820 — project protection table

All four become editable in Phase A.

## Design Overview

Three pieces:

1. **State** — add `rate_overrides: { [task_id]: { rate_per_hour, ts } }` to the project object. Two reducer actions for set / clear.
2. **Engine wiring** — extend the `projectOverlayMap` builder in `useEstimateScenario.js` to merge `state.project.rate_overrides` after the protection_heuristics block. User overrides win on collision.
3. **UI** — new `<RateCell>` component replaces the 4 `<td>{t.baseRate}</td>` sites. Reads canonical task from the bundle for eligibility; renders an input when eligible, static value otherwise. Overridden cells render in accent color with a revert glyph.

Validation pass on state load prunes orphaned overrides (tasks that have been archived, renamed, or shape-shifted since the override was set).

## Section 1: Eligibility Rule

A rate cell is editable iff the canonical task has:
- A scalar numeric `rate_per_hour` field
- AND lacks `rates` (variant array), `rates_by_tier`, `rates_by_coat`, `fixed_minutes`
- AND exists in the current bundle (not archived/missing)

Pseudocode:
```js
function isEditable(taskId, canonicalTask) {
  if (!canonicalTask) return false;
  if (typeof canonicalTask.rate_per_hour !== 'number') return false;
  if (canonicalTask.rates) return false;
  if (canonicalTask.rates_by_tier) return false;
  if (canonicalTask.rates_by_coat) return false;
  if (canonicalTask.fixed_minutes != null) return false;
  return true;
}
```

If not editable, render the static value (no special styling) with a hover title:
> "Tier/coat-keyed task — edit in Authoring → Tasks."

## Section 2: State Shape

In `state/initial-state.js`, extend the project object:
```js
project: {
  // ... existing fields
  rate_overrides: {},
}
```

Per-entry shape:
```js
state.project.rate_overrides = {
  "TSK_INSPECT_COATING_LF": { rate_per_hour: 750, ts: 1721234567890 },
  "TSK_BRUSH_COAT_LF":      { rate_per_hour: 95,  ts: 1721234568901 },
}
```

`ts` is the timestamp of the last edit. Phase B will surface this as provenance ("you tuned this 3 hours ago"). Phase A just records and ignores.

Empty / missing entry → no override; engine uses canonical.

### Reducer actions

`state/reducer.js` — two new actions:

```js
case 'SET_RATE_OVERRIDE': {
  const { task_id, rate_per_hour } = action.payload;
  if (rate_per_hour == null || rate_per_hour <= 0) {
    // Treat as clear
    const next = { ...state.project.rate_overrides };
    delete next[task_id];
    return { ...state, project: { ...state.project, rate_overrides: next }};
  }
  return {
    ...state,
    project: {
      ...state.project,
      rate_overrides: {
        ...state.project.rate_overrides,
        [task_id]: { rate_per_hour, ts: Date.now() },
      },
    },
  };
}

case 'CLEAR_RATE_OVERRIDE': {
  const { task_id } = action.payload;
  const next = { ...state.project.rate_overrides };
  delete next[task_id];
  return { ...state, project: { ...state.project, rate_overrides: next }};
}
```

## Section 3: Engine Wiring

In `useEstimateScenario.js:81-100`, after the existing protection_heuristics `setRate(...)` block, append:

```js
// Phase A inline rate edits (state.project.rate_overrides)
// Edits here win over protection_heuristics rates (user's most recent intent).
const userOverrides = state?.project?.rate_overrides || {};
for (const [taskId, ov] of Object.entries(userOverrides)) {
  if (ov?.rate_per_hour != null && ov.rate_per_hour > 0) {
    projectOverlayMap[taskId] = { rate_per_hour: ov.rate_per_hour };
  }
}
```

No engine changes. No bundle changes. The overlay is already wired through `runEstimateScenario` via `useEstimateScenario`.

## Section 4: UI — `<RateCell>` Component

New file: `components/estimate/RateCell.jsx`. Renders an editable rate cell.

Behavior:
- On render: look up canonical task in bundle's `tasks` table; check eligibility
- If not eligible: render `<td>{t.baseRate}</td>` (existing behavior) with the tooltip from §1
- If eligible and no override: render `<td><input>` styled to look like a static cell — clicking activates edit mode
- If eligible and has override: render in accent color (matches the protection-heuristics override convention from W-22 / W-24) with a small "↺" revert glyph on the right
- On Enter / blur: dispatch `SET_RATE_OVERRIDE`
- On Escape: revert edit state, restore the previous value
- On "↺" click: dispatch `CLEAR_RATE_OVERRIDE`

API:
```jsx
<RateCell
  task={t}           // resolved task with .taskId, .baseRate, .isFixed
  bundle={bundle}    // for canonical lookup
  override={state.project.rate_overrides[t.taskId]}
  dispatch={dispatch}
/>
```

Visual states (matches existing PaintScope conventions):
- **Default (no override, eligible):** muted text, subtle border-bottom on hover indicating editability
- **Override active:** accent color (`var(--accent)`), italic, revert glyph
- **Not eligible:** muted gray, no border-bottom, tooltip on hover
- **Fixed-minute task:** em-dash display (existing behavior unchanged)

Replace the 4 `<td>{t.baseRate}</td>` render points in `EstimateView.jsx` with `<RateCell ... />`.

## Section 5: Validation Pass — Orphan Cleanup

On state load (and on bundle import time, if the bundle hot-reloads in dev):

```js
// state/migrations.js — runs after standard migrations
function pruneStaleRateOverrides(state, bundle) {
  const overrides = state.project?.rate_overrides;
  if (!overrides) return state;
  const tasks = bundle?.tasks || {};
  const pruned = {};
  const dropped = [];
  for (const [taskId, ov] of Object.entries(overrides)) {
    const canonical = tasks[taskId];
    if (!canonical) {
      dropped.push({ taskId, reason: 'task archived/missing' });
      continue;
    }
    if (typeof canonical.rate_per_hour !== 'number' ||
        canonical.rates || canonical.rates_by_tier ||
        canonical.rates_by_coat || canonical.fixed_minutes != null) {
      dropped.push({ taskId, reason: 'task no longer uses flat rate_per_hour' });
      continue;
    }
    pruned[taskId] = ov;
  }
  if (dropped.length > 0) {
    console.warn('[PaintScope] Dropped stale rate overrides:', dropped);
    // Store for the UI to render a one-time warn-band
    state._lastRateOverridePruneReport = { dropped, ts: Date.now() };
  }
  return {
    ...state,
    project: { ...state.project, rate_overrides: pruned },
    _lastRateOverridePruneReport: state._lastRateOverridePruneReport,
  };
}
```

The UI optionally renders a dismissible warn-band ("5 rate overrides were dropped: TSK_BLT_INSPECT_COAT (task archived) …") that reads from `state._lastRateOverridePruneReport`. This surfaces silently-lost calibration work so the user can re-do it on the new keeper.

## Section 6: Keeper-Migration Carry-Over (deferred — recommended for future migration scripts)

When a future keeper migration archives a task in favor of a universal keeper (the pattern seen in commits `204fa60`, `45b9d54`, `da8e9b4` this session), the migration script should include a one-line state-level carry-over:

```js
// In the migration helper that ships with each keeper-migration commit:
const aliases = {
  'TSK_BLT_INSPECT_COAT':       'TSK_INSPECT_COATING_SF',
  'TSK_CLSH_INSPECT':           'TSK_INSPECT_COATING_LF',
  // ... per-migration list
};
// Pseudocode for the carry-over runtime:
const ov = state.project.rate_overrides;
for (const [oldId, newId] of Object.entries(aliases)) {
  if (ov[oldId] && !ov[newId]) {
    ov[newId] = ov[oldId];
  }
  delete ov[oldId];
}
```

Phase A doesn't implement this — it just makes the validation pass log the drops. The carry-over is a follow-on enhancement (Phase A.5 if/when needed).

## Testing

Manual verification using the local dev server + a project with calibratable tasks:

1. **Eligibility detection** — open the estimate, confirm rate cells on tasks with flat `rate_per_hour` are visually editable; tasks with `rates_by_tier` are read-only with the tooltip
2. **Edit + persistence** — change a rate, observe the estimate recompute live with new hours; reload page, confirm the override persists
3. **Visual states** — override cell shows accent color + revert glyph; reverting restores canonical and removes the entry from `state.project.rate_overrides`
4. **Diagnostic view** — open Diagnostic, confirm the overridden task's "base rate" column shows the new value (engine returns `source: 'overlay'` so diagnostic picks it up for free)
5. **Project export/import** — export project JSON; confirm `rate_overrides` is in the export; import on a clean state, confirm overrides come along
6. **Orphan cleanup** — manually inject a stale entry (`state.project.rate_overrides.TSK_DOES_NOT_EXIST = { rate_per_hour: 100 }`), reload, confirm console warning fires and the entry is pruned from state
7. **Multi-task aggregation** — confirm an override on a task that fires in N rooms (e.g., `TSK_INSPECT_COATING_SF`) applies to ALL N occurrences uniformly

No new unit tests; the engine path is already exercised by phase0-diff and the protection probes (both of which use `overlayMap` for protection_heuristics today).

## File-Level Change Inventory

| File | Change | ~LOC |
|---|---|---|
| `state/initial-state.js` | Add `rate_overrides: {}` to project shape | 2 |
| `state/reducer.js` | `SET_RATE_OVERRIDE` + `CLEAR_RATE_OVERRIDE` actions | ~25 |
| `state/migrations.js` | Backfill empty `rate_overrides` if missing; `pruneStaleRateOverrides` pass | ~40 |
| `hooks/useEstimateScenario.js` | Merge `project.rate_overrides` into `projectOverlayMap` | ~10 |
| `components/estimate/EstimateView.jsx` | Replace 4 `<td>{t.baseRate}</td>` sites with `<RateCell>`; optional warn-band for prune report | ~30 (replace) + ~25 (warn-band) |
| `components/estimate/RateCell.jsx` *(new)* | Editable cell component | ~110 |

**Total**: ~240 LOC across 6 files. No engine changes, no bundle changes.

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Task IDs change (keeper migrations) | High (routine work) | Validation pass with warn-band on load; future migration scripts can opt into alias carry-over |
| Task shape changes (flat → tier-keyed) | Medium (architecture maturing) | Same validation pass treats this as orphan |
| User edits same task in inline + Drafts | Low | Phase A treats them as independent channels; Phase B will reconcile |
| Project export carries overrides across customers | Low | Acceptable for now; Phase C can add a "include overrides on export?" prompt if needed |
| Bundle hot-reload mid-session changes eligibility | Low | Eligibility check happens at render time, not load time — naturally re-evaluates |

## Phase B / C teaser (not in scope here)

- **Phase B** — "Save to library" button per override → creates a task draft (via existing `publishTask()` path) → writes canonical JSON. Audit field on the task JSON (`_meta.last_calibrated_at`, `_meta.last_calibrated_from`). Conflict handling with the Drafts pipeline.
- **Phase C** — Dedicated "Rate Optimization" view: project-wide override summary, delta against canonical (hours, dollars), batch-promote with review.

Both phases are designed downstream — Phase A keeps the override surface simple so they can layer cleanly.

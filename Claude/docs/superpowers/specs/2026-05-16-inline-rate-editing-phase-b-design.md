# Inline Rate Editing — Phase B (Save to Library)

**Date:** 2026-05-16
**Status:** Design Approved
**Scope:** PaintScope Estimate view — add a "Save to library" button per overridden rate cell. On confirmation, publishes the override as the new canonical rate (writes the task JSON to disk, regenerates the scenario bundle) and clears the project-level override entry.
**Phase A reference:** `Claude/docs/superpowers/specs/2026-05-15-inline-rate-editing-phase-a-design.md`

---

## Problem

Phase A (shipped) lets estimators tune `rate_per_hour` values inline in the Estimate view. Edits live in `state.project.rate_overrides` and ride the engine's `overlayMap` so estimate hours recompute live. But the calibration is trapped in one project — there's no path to promote a tuned rate into the canonical library so future projects benefit.

The only existing promote path is the manual one: leave the Estimate, open Authoring → Tasks, find the task, copy the override value in, save a draft, publish. Same 7-step round-trip Phase A was meant to eliminate.

## Goal

When a rate cell shows an override (Phase A accent color + ↺ revert glyph), add a second glyph — "💾" save — that promotes the override into the canonical library in one click + one confirm. Reuses the existing `publishTask()` pipeline (writes `Claude/tasks/TSK_*.json`, regenerates the scenario bundle, flips the draft status to `published`).

After successful publish:
- `state.project.rate_overrides[task_id]` is removed (`CLEAR_RATE_OVERRIDE`).
- Vite HMR reloads the regenerated bundle.
- The cell renders the new value in muted style (canonical) — visual confirmation that promotion succeeded.

## Out of Scope

- **Per-tier (`rates_by_tier`) edits** — Phase A intentionally blocks these from being overridden; Phase B inherits that constraint. Tier-keyed tasks remain authored only in Authoring → Tasks.
- **Coat-keyed (`rates_by_coat`) edits** — same.
- **Fixed-minute (`fixed_minutes`) edits** — same.
- **Per-rate-row edits inside `rates[]` arrays** — same.
- **Bulk promote** — "publish all overrides" is Phase C territory, not Phase B. One save click promotes one task.
- **Multi-user collision handling** — single-user system today (`mowrereric@gmail.com` only). No locking, no merge conflict UI beyond the single-draft-per-task case.
- **Authoring-side merge UI** — if a pending non-published draft exists for the same task, this spec uses a confirm-and-overwrite modal (see §3). A richer merge view (show both, pick winning fields) is future work.
- **Rate-history view** — `_meta.last_calibrated_at` and `_meta.last_calibrated_from` get written, but no UI consumes them yet. Surfaces in a future "Calibration history" panel.
- **React component unit tests** — the project has no React testing infrastructure (no jsdom, no Testing Library). Modal behavior is verified manually in the browser preview. Pure helper functions extracted from the modal get Vitest coverage (see §6).

## Verified Findings

### Existing publish pipeline

`src/authoring/publish.js`:
- `publishTask(draft)` POSTs `{ kind: 'task', payload }` to `/__authoring/publish` (dev-only Vite endpoint).
- Endpoint writes the payload to `Claude/tasks/<task_id>.json` and regenerates `Claude/tools/paintscope/src/data/scenario-bundle.gen.js`.
- On success, `publishTask` calls `saveTaskDraft({ ...draft, status: 'published' })` to flip the IDB record's status — keeping IDB as the audit log.

### Draft storage

`src/data/authoring-db.js`:
- `task_drafts` IndexedDB store, keyed by `task_id`.
- Per-record metadata: `status: 'draft' | 'published' | 'local_override'`, `created_at`, `updated_at`, `created_by`, `visibility`.
- `saveTaskDraft(record)` upserts and stamps `updated_at`. New records get `created_at` + `status: 'draft'`.

### Drafts hook

`src/hooks/useTaskDrafts.js`:
- `useTaskDrafts()` returns `{ drafts, loading, save, load, remove, refresh }`.
- `drafts` is the live list of all task-draft records (any status). Conflict detection filters to `status !== 'published'`.

### Canonical task shape

`Claude/tasks/TSK_*.json`:
```json
{
  "task_id": "TSK_BRUSH_COAT_LF",
  "name": "Brush Coat (LF)",
  "uom": "LF",
  "skill_level": "experienced",
  "rate_per_hour": 80
}
```
Flat object. No `_meta` block today. Phase B introduces `_meta` as a passthrough field — schema-tolerant since the bundle generator ignores unknown top-level fields when building the in-memory tasks table.

### Project identity

`state.project.name` carries the user-set project name (default `"Untitled Project"`). For `project_id`, the relevant value is the active IDB `projects` store record id (`proj_TIMESTAMP_HASH`), passed in via `ProjectProvider`'s `projectId` prop and exposed on the `useProject()` context.

## Design Overview

Three pieces:

1. **Pure helpers** — `buildPublishedTaskPayload()` and `findConflictingDraft()` extracted from modal logic. Vitest-tested.
2. **Modal component** — `RateOverridePublishModal.jsx`. Renders when the user clicks the save glyph. Owns conflict detection, confirm UX, publish call, error display.
3. **RateCell wiring** — adds the save glyph next to the existing ↺ revert glyph. Glyph only renders when there's an active override. Click opens the modal scoped to that one cell.

Modal placement: **local** (one popup per cell, lazily mounted on click). Centralized parent state was considered and rejected — cells already carry all the data the modal needs (`taskId`, `override`, canonical lookup), and only one modal can ever be visible at a time anyway.

Bundle regen + cleanup happens server-side; the React app picks up the new bundle via Vite HMR. The modal's only post-publish job is to dispatch `CLEAR_RATE_OVERRIDE` and close itself.

## Section 1: Component Architecture

### `RateOverridePublishModal.jsx` (new)

Self-contained modal. Lazily rendered by RateCell when the save glyph is clicked.

Props:
```js
{
  taskId: string,           // e.g., 'TSK_BRUSH_COAT_LF'
  override: { rate_per_hour, ts },  // current override entry
  projectId: string | null, // active IDB project record id; null when on a fresh state
  projectName: string,      // state.project.name
  onClose: () => void,      // dispatched after success or cancel
  dispatch: ReducerDispatch // for CLEAR_RATE_OVERRIDE on success
}
```

Internal state:
- `publishing: boolean` — flag during the in-flight fetch
- `error: string | null` — last error message (network, server, missing canonical)

Hook dependencies:
- `useTaskDrafts()` — for conflict detection against pending drafts

Canonical lookup happens on render via direct import: `import { tasks as bundleTasks } from '../../data/scenario-bundle.gen'`. Stable since the modal lifetime is short.

### Pure helpers (new module: `RateOverridePublishHelpers.js`)

Lifted out of the modal so they can be unit-tested without React.

```js
/**
 * Build the JSON payload that publishTask() will write to disk.
 * Preserves all canonical fields, replaces rate_per_hour, stamps _meta.
 *
 * @param canonical       The bundleTasks[taskId] record (must have rate_per_hour).
 * @param newRate         The override's rate_per_hour value (number).
 * @param projectContext  { projectId, projectName }. previous_rate is derived
 *                        from canonical.rate_per_hour inside the helper — callers
 *                        do not pass it.
 */
export function buildPublishedTaskPayload(canonical, newRate, projectContext) {
  // returns { ...canonical, rate_per_hour: newRate, _meta: { ...canonical._meta, last_calibrated_at, last_calibrated_from } }
}

/**
 * Find a non-published draft for a task, or null.
 */
export function findConflictingDraft(taskId, drafts) {
  // returns drafts.find(d => d.task_id === taskId && d.status !== 'published') || null
}
```

### `RateCell.jsx` (modify)

Add a second glyph after the existing ↺. Renders only when `hasOverride` is true. Click opens the modal.

```jsx
{hasOverride && (
  <>
    <span onClick={revert} title="Revert to canonical rate">↺</span>
    <span onClick={openPublishModal} title="Save to library">💾</span>
  </>
)}
{publishModalOpen && (
  <RateOverridePublishModal
    taskId={taskId}
    override={override}
    projectId={projectId}
    projectName={projectName}
    dispatch={dispatch}
    onClose={() => setPublishModalOpen(false)}
  />
)}
```

### `EstimateView.jsx` (modify)

Read `projectId` from `useProject()` context (currently destructures only `{ state, dispatch }`). Pass `projectId` + `state.project.name` through to every `<RateCell>` invocation (4 sites).

## Section 2: Data Flow

```
[User clicks 💾 in RateCell]
        ↓
[setPublishModalOpen(true) — modal mounts]
        ↓
[Modal looks up canonical via bundleTasks[taskId]]
[Modal looks up pending draft via useTaskDrafts]
        ↓
[Render: rate delta, conflict warning (if any), buttons]
        ↓
[User clicks Cancel] → onClose() → modal unmounts. Override unchanged.
[User clicks Publish] ↓
        ↓
[setPublishing(true), disable buttons]
        ↓
[payload = buildPublishedTaskPayload(canonical, override.rate_per_hour, { projectId, projectName })]
[draft = { ...payload, id: taskId, kind: 'task', status: 'draft' }]
        ↓
[await publishTask(draft)]
        ↓
   ┌─ success ─┐               ┌─ failure ─┐
   ↓           ↓               ↓           ↓
[dispatch CLEAR_RATE_OVERRIDE] [setError(err.message), setPublishing(false)]
[onClose()]                    [modal stays open with red error inline]
        ↓
[Vite HMR reloads bundle.gen.js]
[Cell re-renders with canonical = new rate, muted style]
```

## Section 3: Modal UX

### Layout

```
┌──────────────────────────────────────────────────┐
│  Publish rate to library                        ×│
├──────────────────────────────────────────────────┤
│  TSK_BRUSH_COAT_LF — Brush Coat (LF)             │
│                                                  │
│  Previous rate:    80 LF/hr                      │
│  New rate:         95 LF/hr   (+18.75%)          │
│                                                  │
│  ⚠️ A pending draft for this task already        │  (conflict-only)
│     exists with rate 88. Publishing will         │
│     overwrite it.                                │
│                                                  │
│  This writes Claude/tasks/TSK_BRUSH_COAT_LF.json │
│  and regenerates the scenario bundle.            │
│                                                  │
│  [red error text if last publish failed]         │  (error-only)
│                                                  │
│              [ Cancel ]   [ Publish ]            │
└──────────────────────────────────────────────────┘
```

### Styling notes

- Matches existing PaintScope dark theme (`var(--bg-card)` background, `var(--text)` foreground, `var(--accent)` for Publish button).
- Conflict block: `var(--warning-bg)` background, `var(--warning)` border — same vocabulary as the prune-report banner.
- Error text: red (`#e74c3c`-ish, or whatever the existing error pattern uses).
- Modal: 480px max-width, centered, with a dim overlay over the rest of the page (`rgba(0,0,0,0.5)`).
- Focus trap: when the modal opens, focus moves to the Publish button. Tab cycles between Cancel ↔ Publish ↔ close button.
- Keyboard: `Enter` = Publish (when not disabled), `Escape` = Cancel.

### Copy

- **Title:** "Publish rate to library"
- **Task line:** `<task_id> — <task name>`
- **Delta row:** `Previous: <X> <uom>/hr`, `New: <Y> <uom>/hr (+/-<%>)`. Percentage rounded to 2 decimals.
- **Conflict warning:** "A pending draft for this task already exists with rate `<draft.rate_per_hour>`. Publishing will overwrite it."
- **Plumbing note:** "This writes `Claude/tasks/<task_id>.json` and regenerates the scenario bundle."
- **Error pattern:** raw message from `Error.message` (publishTask throws with the server's error string), prefixed with "❌ Publish failed: ".
- **Buttons:** "Cancel" and "Publish". Publish button shows "Publishing..." with disabled state during the in-flight call.

### Edge-case copy

- **Canonical missing** (task archived since override was set): hide delta/plumbing rows. Show inline error: "This task is no longer in the bundle. Revert the override or contact authoring."  Publish button disabled.
- **Override matches canonical** (defensive — RateCell strips no-ops): "New rate matches canonical — nothing to publish." Publish button disabled. Cancel button only.

## Section 4: Audit Stamp (`_meta`)

Written onto the published task JSON. Schema:

```json
{
  "_meta": {
    "last_calibrated_at": "2026-05-16T19:45:00.000Z",
    "last_calibrated_from": {
      "project_id": "proj_1778779702274_cbqt",
      "project_name": "McLeod",
      "previous_rate": 80
    }
  }
}
```

`project_id` may be `null` if there's no active IDB project (fresh state, localStorage-only path). `project_name` defaults to `"Untitled Project"`. `previous_rate` is the canonical's `rate_per_hour` *as it existed before this publish* — pulled from the in-memory `bundleTasks[taskId]` at modal-open time.

Preserves any existing `_meta` block on the canonical (merges, doesn't overwrite). If a prior `last_calibrated_at` exists, it's replaced. No history array — Phase C scope.

## Section 5: Error Handling

| Scenario | Behavior |
|----------|----------|
| Network failure (fetch throws) | Modal stays open, red error: "❌ Publish failed: <error.message>". Override preserved. Buttons re-enabled. User can retry or cancel. |
| Server error (5xx, file system locked, regen failed) | Same as network failure. Server's error message flows through. |
| Canonical task missing from bundle (archived) | Modal shows the missing-task message + disables Publish on open. User cancels; override stays so they can manually revert it. |
| Override matches canonical | Publish disabled on open. Cancel only. (Defensive — Phase A reducer should prevent this, but render-time check is cheap insurance.) |
| Double-click Publish | First click disables the button. Second click is a no-op. |
| Modal unmounted mid-publish (user navigates away) | Fetch completes on the server. Override stays in localStorage/IDB (CLEAR_RATE_OVERRIDE dispatch was skipped). On next reload, the override will harmlessly re-apply over the now-matching canonical (engine just overlays "rate_per_hour: 95" over a canonical of 95 — same result). User can revert it manually. Self-heals; no data loss. |
| Conflict (pending draft exists) | Warning block shows in modal. Confirm + overwrite — the publish call writes both the IDB draft (status: published) and the canonical JSON. Existing draft's body fields beyond `rate_per_hour` are NOT preserved — this is a rate calibration, not a full task edit. Phase A scope. |

## Section 6: Testing Plan

### Vitest unit tests (new file: `src/components/estimate/__tests__/rate-override-publish-helpers.test.js`)

**`buildPublishedTaskPayload`:**
- Preserves all canonical fields (task_id, name, uom, skill_level)
- Replaces `rate_per_hour` with new value
- Adds `_meta.last_calibrated_at` as a valid ISO timestamp
- Adds `_meta.last_calibrated_from` with project_id, project_name, previous_rate
- Merges with existing `_meta` if canonical already has one (replaces matching keys, preserves others)
- Handles null projectId gracefully

**`findConflictingDraft`:**
- Returns the matching draft when status is 'draft'
- Returns null when matching draft has status 'published'
- Returns null when no draft matches the task_id
- Returns null when drafts array is empty
- Handles undefined/null drafts argument

### Manual browser smoke (no automation)

1. **Happy path:** override a rate, click 💾, see modal with correct delta, click Publish. Expect: file appears at `Claude/tasks/TSK_*.json` with new rate + `_meta` block. Cell renders muted (canonical now matches override that was just cleared).

2. **Conflict path:** inject a fake pending draft via `preview_eval` into `task_drafts` IDB store. Click 💾 on the same task's cell. Expect: yellow conflict block shows in modal. Publish overwrites the draft.

3. **Cancel path:** click 💾, click Cancel. Expect: modal closes, override unchanged, no file written.

4. **Error path:** temporarily stop the dev server's authoring endpoint (or edit publish.js to throw). Click Publish. Expect: red error in modal, override preserved, button re-enabled.

5. **Missing-canonical path:** archive a task that has an active override (rename its file). Reload. Expect: prune-report banner shows (override dropped). No 💾 button — the override is gone.

6. **Multiple cells:** override two different tasks. Publish one. Expect: only that task's override clears; the other remains with its accent + ↺ + 💾 glyphs.

## File-Level Change Inventory

| File | Change | ~LOC |
|---|---|---|
| `src/components/estimate/RateOverridePublishModal.jsx` *(new)* | Modal component | ~180 |
| `src/components/estimate/RateOverridePublishHelpers.js` *(new)* | Pure helpers (`buildPublishedTaskPayload`, `findConflictingDraft`) | ~40 |
| `src/components/estimate/__tests__/rate-override-publish-helpers.test.js` *(new)* | Vitest unit tests | ~120 |
| `src/components/estimate/RateCell.jsx` | Add 💾 glyph + modal mount; accept `projectId` + `projectName` props | ~25 |
| `src/components/estimate/EstimateView.jsx` | Pull `projectId` from `useProject()`; pass `projectId` + `projectName` to all 4 RateCell sites | ~10 |

**Total**: ~375 LOC across 5 files. No engine changes, no state-shape changes (we lean on Phase A's `rate_overrides` + `CLEAR_RATE_OVERRIDE`), no migration plumbing.

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `publishTask` endpoint is dev-only — won't work in production. | Certain | Phase B is for the local-dev calibration loop. PaintScope's production deploy (Netlify) doesn't have the authoring endpoint mounted. The save button should be hidden when the endpoint isn't available — check at modal-open time via a HEAD or trivial GET; otherwise hide the 💾 glyph entirely in prod. **Open question — see §Open Questions below.** |
| Stale canonical lookup during modal lifetime | Low | Bundle imports are static; HMR can replace the module mid-flight. Modal re-reads bundleTasks on render so a mid-modal HMR will pick up the latest. |
| Conflict overwrite loses draft body fields | Medium | Acceptable for Phase B — rate calibration is the only use case. If users start editing other fields in drafts, Phase C will need a real merge UI. |
| User edits an `_meta` block by hand on disk between override and publish | Negligible | Last-write-wins. Acceptable for single-user, single-machine workflow. |
| Override clear races with bundle HMR | Low (single React batch handles it) | If a flicker shows, optimization is to clear override AFTER HMR settles. Phase A overlay handling is idempotent so the brief overlap is invisible. |

## Open Questions

1. **Production deploy:** the 💾 glyph relies on the dev-only `/__authoring/publish` endpoint. On the deployed Netlify build, this endpoint doesn't exist. We need to either:
   - Hide the 💾 button when the endpoint is absent (probe on mount), OR
   - Show the button but route to a "Save not available in production" tooltip.

   **Recommendation:** hide it. The whole Save-to-library flow is a dev-only calibration tool; surfacing it in prod is misleading. Implementation: check `import.meta.env.DEV` at the RateCell render site — if false, don't render the 💾 glyph at all. This is consistent with PaintScope's "edit in dev, deploy canonical" pattern.

   **Status:** locked to "hide via `import.meta.env.DEV`". Will be implemented in the RateCell modification step.

## Phase C Teaser (not in scope)

- Bulk "Publish all overrides" button in the Estimate header — one click promotes every active override in the project.
- Rate-history panel: surface `_meta.last_calibrated_at` / `last_calibrated_from` as a sortable list. "Tasks calibrated this week", "tasks recently changed by project X".
- Merge-aware draft handling: when there's a pending draft with non-rate fields edited, show both and let the user pick which fields win.
- Multi-user provenance: add `edited_by` to the audit stamp once RBAC exists.

# QT Builder — Phase 2b: Ladder Editing Design

- **Date:** 2026-06-18
- **Status:** Approved (brainstormed)
- **Builds on:** `2026-06-18-quality-tier-builder-design.md` (the feature spec) and the Phase 2a read-only ladder.
- **Branch:** `feature/qt-builder`

## 1. Summary

Make the read-only tier ladder **editable**. The user clicks ladder cells to set which quality tiers a task fires at, and adds tasks from the canonical library to a tier-and-up. Every edit compiles to `applies_when.quality_tier` on the task's module entry, saves as a **module draft** (live immediately via the existing overlay), and publishes through the existing Drafts flow. No engine changes — Phase 1 + the existing `applies_when` mechanics already support everything.

## 2. The editing model (single mechanism)

`applies_when.quality_tier` on a module's task entry is the **set of tiers that task fires at** (the engine checks `ctx.quality_tier ∈ list`). Because the gate is evaluated against `ctx.quality_tier` at resolution time, it works identically for both scenario-authoring patterns (one multi-tier scenario; separate per-tier scenario files), so there is one editing path.

- **No separate remove/delete action.** "Remove from a tier" = exclude that tier from the set. Dropping a task from QT2 only → `["QT3","QT4","QT5"]`; from QT2 and QT3 → `["QT4","QT5"]`. Each cell is independent (no forced cascade).
- **Empty set = entry removed.** Toggling a task off at *every* served tier drops its entry from the module draft (clean undo, including "I added that by mistake").

## 3. Interactions

Only **served** tiers are editable; `na` columns stay read-only.

**3.1 Toggle a cell.** Click flips whether the row's task fires at that tier. Cell visuals remain `fires`/`added`/`skip` (relative to the QT3 baseline). Edited rows show a "draft" badge.

**3.2 Add task.** Each phase group carries an "+ Add task to <phase>" affordance that opens the existing canonical **Task picker** (`TaskPicker.jsx`, searchable/filterable). The selected task is added as a new entry to that phase's module in the tier's scenario, gated to **the clicked tier and up** (ascending default); the user can then toggle individual tier cells. Adds an *existing* canonical task only — creating brand-new tasks stays in the Task editor.

**3.3 Blast-radius note.** When an edited module is referenced by more than one scenario, show "affects N scenarios" (reusing the authoring tab's module-usage derivation) so the reach is visible before publishing.

**3.4 Save / publish.** Edits accumulate as module drafts and are live in estimates immediately via the overlay; a save/publish control reuses the existing Drafts publish flow to write the module JSON.

## 4. Compile semantics

**Toggle → `applies_when.quality_tier`** (pure function, unit-tested):
1. Desired tier set = the served tiers whose cells are ON for that row.
2. Resolve the task's home module entry(ies): the module(s) in the served tiers' scenarios whose `tasks[]` reference this `task_ref` (typically one shared module). For each:
   - **Preserve** any non-tier keys already in `entry.applies_when` (e.g. `application_method`).
   - If desired set ⊇ all served tiers → **remove** the `quality_tier` key (ungated for this scenario's tiers). If `applies_when` becomes empty, drop it.
   - Else → write `entry.applies_when.quality_tier = [desired tiers]` (sorted).
   - If desired set is **empty** → remove the entry from the module's `tasks[]`.
3. Save each touched module as a module draft (`useModuleDrafts().save({ id, payload, status:'draft' })`).

**Add → module entry:**
- Target module = the chosen phase's module in the clicked tier's scenario. If that phase has exactly one module → unambiguous; if multiple → the UI asks which.
- Append `{ task_ref, applies_when: { quality_tier: [pickedTier..top served] } }` to that module's `tasks[]`; save as a module draft.

## 5. Architecture & components

- **`qt-builder/edit-tier-ladder.js`** (new, pure, unit-tested) — the compile functions: `setTierMembership(bundle, drafts, { task_id, moduleIds, desiredTiers, servedTiers })` and `addTaskToPhase(bundle, drafts, { task_ref, scenarioId, phase, fromTier, servedTiers, moduleId? })`, each returning the module-draft payload(s) to save. No React, no IO.
- **`qt-builder/derive-tier-ladder.js`** (extend) — record per row the `(scenarioId, moduleId)` home(s) of each task so the component can call the compile functions; also adopt the deferred 2a refactor (return phase-grouped rows so the grouping rule lives in one tested place).
- **`QTBuilder.jsx`** (extend) — wire cell `onClick` → `setTierMembership` → `save`; add the per-phase add affordance + Task picker; render draft badges + blast-radius note + a publish control. Stays thin; logic lives in the pure modules. Rename local `state`/`setState` → `fromState`/`setFromState`.
- **Reuse:** `useModuleDrafts`, `TaskPicker.jsx`, the module-usage derivation, the Drafts publish flow — all already exist.

## 6. Testing

- **Unit (the crux):** `edit-tier-ladder.js` — toggling produces the right `applies_when.quality_tier` (subset, full→remove-key, empty→remove-entry, non-tier-key preservation); add produces the right gated entry; both for multi-tier and per-tier-file fixtures (extend the Phase 2a fixtures).
- **Build + live browser:** `npx vite build`; then drive the running app — toggle a cell, confirm the draft badge + that the ladder re-derives correctly from the draft overlay; add a task; confirm console clean.

## 7. Scope / non-goals (this sub-phase)

- **In:** per-cell tier toggle, add-task-from-library, draft save + publish, blast-radius note, the two 2a refactors.
- **Out (later sub-phases):** per-tier coats/interstage rows (2c), opt-in per-tier rate editor + modifier-override strip (2d), per-tier materials (2e), creating brand-new canonical tasks, finer per-(method×state) module scoping (forking) — only if real cross-contamination shows up.

## 8. Open implementation details (resolved in the plan)

- Multi-module tasks (a `task_ref` appearing in more than one module across served tiers) — the compile edits every home entry; the plan pins the exact iteration.
- Exact "remove key when full" vs "write explicit list" threshold uses **all served tiers** as the baseline (a tier the scenario doesn't serve is irrelevant to the gate).

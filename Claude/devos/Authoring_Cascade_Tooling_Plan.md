# Authoring Cascade Tooling Plan

**Status:** PROPOSED — execute AFTER `Task_Consolidation_Workflow.md` produces a smaller, cleaner canonical bundle
**Created:** 2026-05-04
**Purpose:** Add three pieces of tooling on top of the reverse-lookups + filters that have already shipped, so the user can refactor task IDs, bulk-edit rates and display names, and ship changes without manual archaeology. Goal is to make the architecture's reference-graph actually exercisable before going to production.

**Pre-production calibration:** PaintScope is in development only — no live customer data, no time tracker history, no migration burden on existing project state. See `memory/project_paintscope_pre_production.md`. Drop any reflex toward backward-compat aliases or deprecation cycles; rip and replace, run smoke, ship.

## Prerequisites — already shipped (2026-05-04)

The following pieces existed only as plans when this doc was first drafted; they have since been built and verified end-to-end. New session can assume them present:

- **Task → module reverse lookup** (`TaskUsagePanel`) — inside TaskEditor
- **Module → scenario reverse lookup** (`ModuleUsagePanel`) — inside ModuleEditor
- **Domain filter** (interior / exterior / shared / unused) on TaskList + ModuleList
- **Activity-family filter** on TaskList — backed by ACTIVITY_RULES dictionary at `Claude/tools/paintscope/src/data/activity-rules.js`
- **Spec-family filter** on TaskList + ModuleList — derived from scenario_id pattern
- **Phase filter** on TaskList — transitively derived from referencing modules
- **Archive workflow** (Archive button on canonical entries; Archive tab with Restore; archive folder excluded from bundle generator naturally)
- **Bundle regen button** — top-right of Authoring header, shells out to `build-scenario-bundle.mjs` with HMR re-import
- **Pre-production calibration memory note** — see above

These are the foundation the cascade tooling builds on. Phase 2 (Rename) reuses TaskUsagePanel; Phase 3 (Bulk Transforms) reuses the activity rules dictionary as selection vocabulary and the regen button as the publish step.

---

## Context

The task → module → scenario architecture was designed so that references are cheap: modules use `task_ref: "TSK_X"` to point at canonical tasks, scenarios hold module IDs in a `modules[]` array. Update the canonical task → it cascades for free to every module via reference resolution, then to every scenario via module lookup. **For most updates this already works** (rate changes, label tweaks, additive field changes).

Three operations break the automatic cascade and force manual work:

1. **Renaming a task ID.** `task_ref` strings in modules go stale. Currently requires hand-editing every module.
2. **Bulk transforms.** "Set the rate for all vacuum tasks to 1500 SF/hr" requires manually trawling 250+ tasks for the ones that match. The activity layer in the lab is the natural selection vocabulary but isn't wired up to anything that mutates rates.
3. **Structural changes that could break dependents.** Removing a field, changing a phase, altering coat config — references stay intact but downstream behavior may break. Smoke exists but isn't a publish gate.

This plan adds tooling for all three. The reverse-lookup work shipped 2026-05-04 (`ModuleUsagePanel.jsx`, integrated in `ModuleEditor.jsx`) is the foundational "find references" piece that the rename tool reuses.

### Architectural assumptions (verify before coding)

| Assumption | Why it matters |
|---|---|
| `findTaskUsage(taskId, modules)` already exists in `TaskUsagePanel.jsx` and returns `[{module_id, overrides, ...}]` | Reused by rename tool's preview |
| Scenarios reference modules as bare ID strings in `scenario.modules[]` | Module rename — out of scope here, but useful to know |
| Draft overlay system writes per-entity drafts to IndexedDB, then publishes to JSON files in `Claude/modules/` and `Claude/scenarios/` | Rename + bulk both write through this same flow |
| Smoke tests live in `Claude/scripts/smoke-scope-tree.mjs` and use synthetic specResults — they're already engine-portable, just need to be importable from browser | Smoke-on-publish hinges on this |
| ACTIVITY_RULES dictionary is currently inline in `Claude/tools/paintscope/src/engine/scope-tree.js` | Bulk transforms will be the second consumer, triggering the data-file split per `memory/project_activity_rules_dictionary.md` |

---

## Phase 1: Smoke-on-Publish (build first)

**File touches:**
- New: `Claude/tools/paintscope/src/engine/smoke-runner.js` — browser-importable smoke harness
- Modified: `Claude/tools/paintscope/src/components/authoring/DraftsView.jsx` (or wherever publish is wired) — invoke smoke before commit, block on failure
- Modified: `Claude/scripts/smoke-scope-tree.mjs` — keep as-is for CLI, but its synthetic-data + assertion logic gets imported from `smoke-runner.js`

**Why first:** every subsequent feature gets validated by it. Lower risk to ship the gate before the things being gated.

**UI shape:**
- On clicking "Publish" in DraftsView, kick off `runSmoke()`.
- If pass: green check, proceed with publish.
- If fail: list of failed assertions in a panel, abort publish, leave drafts intact for further editing.
- A "Run smoke now" button next to publish (manual trigger, doesn't commit).

**Implementation notes:**
- Smoke currently uses node `fs` to read JSON; replace with synthetic data inlined in the runner. The existing assertions are already pure functions over tree shape.
- Assertion list returned as `{name, passed, message}` objects so UI can render the failures.
- Future: extend smoke with assertions that check the *current* canonical bundle (e.g., "every task referenced by a module exists", "no orphan modules") — useful for catching rename-induced breakage.

**Out of scope this phase:**
- Network/integration tests (no backend to test against).
- Performance regressions (smoke is correctness only).

**Acceptance:**
- Publish a clean draft → smoke runs → pass → JSON written.
- Publish a draft that breaks invariants → smoke runs → fail → publish blocked → failed assertions shown.

---

## Phase 2: Rename-with-Cascade (build second)

**File touches:**
- New: `Claude/tools/paintscope/src/engine/rename-cascade.js` — pure function: given (oldId, newId, bundle), return the set of drafts to write
- New: `Claude/tools/paintscope/src/components/authoring/RenameTaskModal.jsx` — preview + confirm modal
- Modified: `Claude/tools/paintscope/src/components/authoring/TaskEditor.jsx` — add "Rename…" button next to the task_id field

**Scope:** task ID rename only. Module rename and scenario rename are mechanically similar but out of scope this phase.

**UI shape:**
- "Rename…" button in TaskEditor near `task_id`.
- Modal shows: current ID, input for new ID, validation (TSK_ prefix, uppercase + underscores only, doesn't already exist).
- Live preview: "This task is referenced by **N modules** in **M scenarios**. The rename will:
  - Update `task_ref` in N modules (saved as drafts)
  - Rename the canonical task in `Claude/tasks/...` (saved as draft)
  - Scenarios update for free via module reference"
- "Cancel" leaves nothing changed. "Confirm rename" writes drafts and closes.
- After confirm, user reviews drafts in DraftsView and publishes (smoke runs as part of publish per Phase 1).

**Implementation notes:**
- `renameTaskCascade(oldId, newId, bundle)` returns:
  ```
  {
    taskDraft: {...task with new id},
    moduleDrafts: [{module_id, ...module with task_ref rewritten}],
    deletes: [oldTaskId]
  }
  ```
- Reuses `findTaskUsage(oldId, modules)` from `TaskUsagePanel.jsx`.
- Each modified module saved as a draft via existing draft system — no special path.
- The canonical task's draft contains the new ID; the publish step handles delete-old-add-new in `Claude/tasks/`.

**Validation:**
- New ID format: `/^TSK_[A-Z0-9_]+$/`
- New ID doesn't already exist in `bundle.tasks`.
- No module override on the renamed task references the OLD ID anywhere else (sanity check).

**Out of scope:**
- Multi-task rename in a single operation (do them one at a time, smoke validates).
- Module rename, scenario rename (later phases if needed).

**Acceptance:**
- Rename `TSK_DUST_WIPE` → `TSK_DUST_WIPE_SURFACE`. Confirm preview shows correct module count. Publish. Smoke passes. Bundle now has the new ID; modules have rewritten `task_ref`; scenarios unchanged but resolve correctly.

---

## Phase 3: Bulk Transforms (build third)

**File touches:**
- New: `Claude/tools/paintscope/src/components/authoring/BulkRateEditor.jsx` — selection + transform + preview UI
- New: `Claude/tools/paintscope/src/data/activity-rules.js` — moved from `scope-tree.js` per `memory/project_activity_rules_dictionary.md`. Bulk editor is the second consumer that triggers the split.
- Modified: `Claude/tools/paintscope/src/components/authoring/TaskList.jsx` — add "Bulk Edit Rates…" button + selection state
- Modified: `Claude/tools/paintscope/src/engine/scope-tree.js` — import ACTIVITY_RULES from new data file

**Why third:** depends on activity rules being usable as a selection vocabulary. The cleanest moment to split the rules into their own data file is when there's a second consumer that needs them.

**UI shape:**
- TaskList tab gets a "Bulk Edit…" button.
- Click → BulkRateEditor opens.
- **Selection** (any combination):
  - Manual checkboxes in TaskList rows
  - Filter by phase (`prep`, `apply`, etc.)
  - Filter by activity rule pattern ("Caulk", "Vacuum Dust", "Fill Fasteners" — populated from ACTIVITY_RULES dictionary)
  - Regex on `taskId`
- **Transform** (one):
  - Set rate to N
  - Multiply rate by X
  - Add N to rate
  - Set fixed_minutes to N
  - **Set display name** (with optional template substitution like `${activity}` or literal text — the consolidation pass will leave display names somewhat irregular among survivors, this is the cleanup pass)
  - **Set skill_level** (small enum dropdown)
- **Preview:** table showing `taskId | old rate | new rate | Δ` for every selected task. Bottom: estimated total hour/$ delta for the active project.
- **Commit:** writes one task draft per modified task. User reviews in DraftsView, publishes through Phase 1's smoke gate.

**Implementation notes:**
- Selection produces a `Set<taskId>`. Transform is a pure function `(rate) => newRate`.
- Preview computes against `canonicalBundle.tasks` directly — no engine pivot needed.
- Active-project impact computation: re-run `useEstimateScenario` against a hypothetical bundle with the transforms applied, diff totals. Could be expensive on large projects — make it opt-in or async.
- "Cancel" leaves nothing committed. "Apply as drafts" writes them.

**Out of scope:**
- Bulk edit on `phase`, `crew_size`, `modifier_eligibility` — possible follow-on but lower-frequency than rate / skill / name.
- Bulk edit on module entries (override-only edits — same shape but different table).
- History/audit log of bulk operations beyond the existing draft history.

**Acceptance:**
- Filter to all tasks matching `Vacuum` activity rule. Apply "set rate to 1500 SF/hr". Preview shows expected diff. Commit. Drafts written. Publish through smoke. New estimates reflect the change.

---

## Recommended Execution Order

1. **Phase 1: Smoke-on-Publish** (smallest, foundational)
2. **Phase 2: Rename-with-Cascade** (small, well-bounded, immediate user value)
3. **Phase 3: Bulk Transforms** (largest, also the workflow you do most)

Each phase ships independently. After Phase 1, every subsequent change is gated by smoke. After Phase 2, the rename workflow is live and the user can start a naming-cleanup pass. Phase 3 is the heaviest and can be deferred if Phase 2 + activity-rule grouping in the lab is enough day-to-day.

---

## Out of Scope (entire plan)

- **Module rename / scenario rename.** Mechanically similar but separate implementations; defer until needed.
- **Saved-project migration / backward-compat aliases.** Not applicable — see pre-production calibration above.
- **Concurrent-edit safety.** Single user, no contention.
- **Undo/redo of bulk operations.** Existing draft-discard flow handles rollback before publish; post-publish is a fresh edit cycle.
- **Time-tracker integration.** Time tracker doesn't exist yet.
- **Customer-facing UX changes.** All three features are admin-only behind the existing `paintscope.admin = '1'` localStorage gate.
- **Performance optimization on bulk preview.** Defer until measured slowness.

---

## First Move on the New Session

**Do NOT start this plan until `Task_Consolidation_Workflow.md` has produced a meaningfully smaller catalog.** Doing cascade tooling first means rename + bulk transforms have to grapple with a messy bundle that consolidation would have cleaned up. The merge log (`Claude/_merge_log.jsonl`) is the signal — once the user says "consolidation is done enough, let's ship the cascade tooling," start here.

1. Read this plan in full.
2. Read the merge log to understand the current shape of the catalog (how many entries collapsed, what the keepers look like).
3. Verify the architectural assumptions table — re-check `findTaskUsage`, `scenario.modules[]`, the draft overlay flow's publish path, the smoke harness shape. Most of these are already in place (see Prerequisites section above) but worth a sanity check.
4. Start Phase 1: port smoke-scope-tree.mjs assertions into a browser-importable `smoke-runner.js`. Don't touch the CLI version yet — keep both paths running until Phase 1 is verified.
5. Run the existing smoke (`node Claude/scripts/smoke-scope-tree.mjs`) before AND after the port to confirm nothing regressed in the CLI path.
6. Once Phase 1 ships and you've published one draft through the smoke gate successfully, move to Phase 2.

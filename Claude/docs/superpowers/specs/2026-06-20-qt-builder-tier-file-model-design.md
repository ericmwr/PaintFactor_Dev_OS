# QT Builder Rebuild — File-Naming Quality-Tier Model — Design Spec

- **Date:** 2026-06-20
- **Status:** Draft (awaiting spec review)
- **Author:** Eric, with Claude
- **Supersedes (editing surfaces):** the `applies_when.quality_tier` ladder editor (Phase 2b), the per-tier rate UI + `rates_by_tier` (2d), the `FAC_QT`-by-tier override map (2d), and the per-tier materials grid + `material_systems_by_tier` map (2f). **Keeps** the Phase 2e role-aware materials *engine*, the finder, the per-tier resolution, and the React chassis.
- **Branch:** `feature/qt-builder-rebuild` (off `main` @ `d98f607`). `main` is the working fallback. The `feature/qt-builder-phase2f` branch is shelved (its one durable idea — role-aware emission — is already on `main` via 2e).
- **Related:** `project_qt_builder_rewrite` (memory)

---

## 1. Summary

Rebuild the QT Builder around a single principle: **a quality tier is a file identity expressed by naming convention, never an `applies_when` condition.** Selecting a tier resolves the file(s) named for that tier and reads their tasks straight off — no per-tier conditions are evaluated, and no per-tier "maps" live on shared entities.

The builder becomes a **vantage + fork tool**: it shows the full **Scenario → Module → Task** hierarchy with the quality tiers as columns, and lets you author a tier by **forking on demand** (clone the baseline scenario, fork a shared module to a tier-named copy) and then **adding/deleting existing tasks** in that forked module. No new tasks are ever created; tier differences in task composition live in modules, and rate/trait differences live in modifiers.

**This needs zero estimate-engine changes.** It is an authoring-tool rebuild + a naming convention + a data cleanup (delete `applies_when.quality_tier`).

## 2. Motivation

The current builder models a tier as a *condition*: toggling a task per tier compiles to `applies_when.quality_tier` on a (usually shared) module's task entry. That is the "matrix of hard-coded `applies_when` tied to modules and scenarios" we are deliberately leaving — it is opaque, and because modules are shared (the arch finish module is referenced by **16** scenarios), editing one tier silently reaches every scenario that shares the module.

The wanted model is the opposite: explicit, named, self-describing files. There is **always a concrete scenario or module to look at that says exactly what it is for** — it's all in the name and the file. Pick QT4 → you get QT4's scenario → its modules → their tasks → a flat, calculable list.

## 3. Goals / Non-goals

**Goals**
- Vantage view: Scenario → Module → Task, quality tiers as columns, scoped by Substrate × Method × From-state.
- Author a tier by fork-on-demand: clone baseline scenario → tier scenario; fork shared module → tier-named module; add/delete **existing** tasks in the forked module.
- Tier = file (naming convention) at the scenario and module levels. Tasks are never tier-specific.
- Rate/trait differences per tier via **modifiers**, not per-task rates.
- Delete `applies_when.quality_tier` everywhere (obsolete).
- No estimate-engine changes.

**Non-goals**
- **New tasks / task variants.** Tasks are reused as-is from the existing library. Ever.
- **Per-tier maps on shared entities** (`rates_by_tier`, `material_systems_by_tier`, `modifier_overrides.FAC_QT`-by-tier). Retired in favor of file-native storage.
- Changing the estimate engine, the matcher, or the scenario/module/task file formats (beyond removing the now-unused `quality_tier` key from `applies_when`).
- Materials-per-tier and rates-via-modifiers authoring UI — **deferred to later phases** (§12). Phase 1 keeps the engine reading materials/modifiers as it does today.

## 4. The model — "a tier is a file"

| Entity | Tier-specific? | How |
|---|---|---|
| **Task** (`TSK_*`) | **Never** | Shared library, reused as-is. |
| **Module** (`MOD_*`) | **On demand** | Shared/tier-agnostic by default; forked to `MOD_…_QT<n>` only when a tier needs a different task set. |
| **Scenario** (`SCN_*`) | **Per tier** | A baseline serves all tiers; forks (`SCN_…_QT<n>`) override a tier. |

- **Task composition per tier** → which tasks a (possibly forked) module contains.
- **Module composition per tier** → which modules a (possibly forked) scenario lists.
- **Rate/trait per tier** → modifiers carried by the tier's scenario.
- **No `applies_when.quality_tier`** — deleted; tier selection happens by file resolution, not condition.

## 5. Naming convention & resolution

**Naming**
- **Baseline scenario:** omit the tier segment, e.g. `SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE`. Its `matches` carries **no** `quality_tier` key.
- **Tier fork (scenario):** add the tier segment, e.g. `SCN_ARCH_ELEMENT_NC_QT4_BRUSH_FROM_BARE`, with `matches.quality_tier: "QT4"` (or `["QT4"]`).
- **Tier fork (module):** append `_QT<n>` to the base module id, e.g. `MOD_APPLY_ARCH_ELEMENT_FINISH` → `MOD_APPLY_ARCH_ELEMENT_FINISH_QT4`.

**Resolution (verified against [scenario-matcher.js](../../tools/paintscope/src/engine/scenario-matcher.js)).** `scenarioMatches` requires every key in `matches{}` to be satisfied by ctx and ranks winners by **specificity = number of match keys**. Therefore:

- A **baseline** (no `quality_tier`, *N* keys) matches **every** tier at specificity *N*.
- A **fork** (adds `quality_tier`, *N+1* keys) matches **only its tier**, at specificity *N+1* — so it **wins** for that tier; the baseline serves the rest.
- **Forking is additive:** creating `SCN_…_QT4` never edits the baseline. **Deleting** a fork reverts that tier to the baseline automatically (the baseline is the only remaining match). No ties, no fallback logic, **no matcher change.**

Module resolution is unchanged: a scenario's `modules[]` is a flat list of ids; a forked `_QT4` module is a normal module referenced by the QT4 scenario.

## 6. Engine: zero changes (and why)

- **Scenario selection** already resolves per-tier files via `findBestMatch` (§5).
- **Module walk** ([run-estimate-scenario.js:789](../../tools/paintscope/src/engine/run-estimate-scenario.js)) runs every module id in the resolved scenario's list — a forked `_QT4` module is just another id. No gating needed.
- **Tasks** are evaluated as today; removing `quality_tier` from `applies_when` simply means the engine stops seeing a key it no longer needs (`evaluateAppliesWhen` treats an absent key as no constraint).
- **Modifiers & materials** are read from the resolved scenario as today (file-native per-tier storage is just "the QT4 scenario carries its own values").

So the estimate path is untouched. All work is in the authoring tool, the naming convention, and the data cleanup.

## 7. Builder UX

Single screen, replacing the current `qt` tab. Regions:

**7.1 Finder** — `Substrate` / `Method` / `From state` (+ coating) selects. Reused from today.

**7.2 Vantage grid (Scenario → Module → Task × tiers).** Columns: QT2 / QT3 / QT4 / QT5 (only tiers the family serves; baseline marks the unforked default). Rows nest:
- **Scenario row** (per tier column: which scenario serves it — baseline vs a `_QT<n>` fork, shown by id).
- **Module rows** grouped under the scenario, each showing per tier whether the tier uses the **shared** module or a **forked** `_QT<n>` copy.
- **Task rows** nested under each module, showing per tier whether the task is **present** in that tier's (possibly forked) module — a plain present/absent readout, *not* a condition.

The grid is a true overhead view: every cell points at a concrete file you can name.

**7.3 Two levels of per-tier editing.** Forking ensures every edit lands only on the target tier — the first time a tier diverges, the builder **clones** the baseline → `SCN_…_QT<n>` (additive; baseline untouched). Within that tier's scenario you edit at **two distinct levels**:

- **Module composition (scenario level)** — *add / remove / reorder whole modules* in the tier's `modules[]`. This is how a higher tier gains work: append an existing module (extra sanding, extra inspection) or extra coat repeats so QT5 runs **more modules** than QT3. Only that tier's scenario changes; the baseline and other tiers are untouched. Added modules are drawn from the existing 713-module library (or a fork); nothing needs inventing for the common case. (Coats are a sub-case — repeated apply modules.)
- **Task composition (module level)** — when an existing module needs a *different task set* for this tier, the builder **forks** it → `MOD_…_QT<n>`, swaps the reference in the tier scenario's `modules[]`, and lets you **add / delete existing tasks** in the fork (existing-task picker; no task creation). The shared module is untouched for the 15 other scenarios that use it.

A "revert tier to baseline" affordance deletes the tier's scenario fork (and any modules only it used), reclaiming the baseline.

**7.4 Save flow.** Reuses the existing draft → live-overlay → publish pipeline (scenario/module drafts; publish writes `Claude/{scenarios,modules}/*.json`). Forking creates **new** draft records (new ids); the existing clone/publish machinery (`ScenarioList` clone, `publishScenario`, module publish) already supports creating new entities.

## 8. Fork mechanics (precise)

`forkScenarioForTier(bundle, sel, tier) → { scenarioId, created }`
- Resolve the governing scenario S for (sel, tier).
- If `S.matches.quality_tier` already pins exactly `tier` → already dedicated; return S.
- Else clone S → S′: new id with the `_QT<tier>` segment, `matches.quality_tier = tier`, identical `modules`/`coat_counts`/`modifiers`/`material_systems`. Save S′ as a scenario draft. Baseline S is **not** modified. Return S′.

`forkModuleForTier(scenarioDraft, moduleId, tier) → { moduleId, created }`
- If `moduleId` already ends in `_QT<tier>` → already forked; return it.
- Else clone module `M` → `M′`: id = `${moduleId}_QT<tier>`, identical `phase`/`tasks`. Save M′ as a module draft. In `scenarioDraft.modules`, replace the first occurrence of `moduleId` with `M′` (preserve order + any repeats). Return M′.

**Scenario-level module composition** (the tier scenario must already be forked — caller ensures via `forkScenarioForTier`):
- `addModuleToTier(scenarioDraft, moduleId, index?) → scenarioDraft` — insert `moduleId` into the tier scenario's `modules[]` (append by default, or at `index`; repeats allowed for coats). The module is an existing library module or a fork.
- `removeModuleFromTier(scenarioDraft, moduleId)` — remove one occurrence from the list.
- `moveModule(scenarioDraft, from, to)` — reorder (order = phase/work sequence). (The existing `ScenarioEditor` already implements pick/remove/move over `scenario.modules`; reuse its logic.)

**Module-level task composition:**
- `addTask(moduleDraft, taskId)` / `removeTask(moduleDraft, taskId)` — append/remove a `{ task_ref }` entry (no `applies_when.quality_tier`). Existing-task picker only.

All pure/immutable; callers persist via the draft hooks. These live in new `qt-builder/` compile modules (mirroring the existing per-phase modules), replacing `edit-tier-ladder.js`.

## 9. What is kept / superseded

**Kept (model-independent, already on `main`/this branch):**
- Phase 2e role-aware materials **engine** (`material-system-roles.js` with `buildRoleBySystemId`/`resolveSpecSystems`/`classifySystemRole`, role-aware `computeMaterialEstimates`).
- The finder (`derive-tier-ladder.js`'s `listSubstrates`/`listDimensions`), per-tier resolution via `findBestMatch`, the React chassis.

**Available to cherry-pick from the shelved 2f branch when a later phase needs them** (not on this branch): `spec-for-scenario.js` (scenario→`spec_family_id`) and `deriveDefaultSheen` — both relevant to Phase 3 (materials), neither needed for Phase 1.

**Superseded / retired:**
- `edit-tier-ladder.js` (applies_when gating) → replaced by §8 fork mechanics.
- `tier-rates.js` + `rates_by_tier` editing (2d) → rates become modifier-driven (Phase 2).
- `tier-qt-factor.js`'s `FAC_QT`-by-tier map (2d) → per-tier modifiers live on the tier's scenario.
- `tier-materials.js` + `material_systems_by_tier` + `buildScenarioMaterialOverrides` (2f) → per-tier materials live on the tier's scenario (Phase 3).
- The `feature/qt-builder-phase2f` branch → shelved, not merged.

## 10. Migration & cleanup

- **Delete `applies_when.quality_tier`** from all module task entries (~40 of 713 modules reference a QT internally). Where a gated task was tier-specific, convert by moving it into the appropriate tier's forked module (or dropping it if it was a no-op). This is the one data migration in Phase 1; it is scriptable (scan modules, strip the key, report tasks that were tier-gated for manual placement).
- **Existing per-tier-file families** (arch/baseboard/cabinet/drywall already author tiers as separate files): designate the QT3 file as the baseline by **stripping its `quality_tier`** (it becomes the catch-all), keeping QT4/QT5 as forks. Consequence to validate: tiers that previously had **no** file (e.g. QT2 for arch → "na") now inherit the baseline. This is arguably more correct (a QT2 job uses the baseline rather than going unestimated) but it changes those estimates — flag in verification. This conversion may be staged after the Phase 1 builder lands (the builder works with both eager and baseline-less data; the matcher handles both).
- PaintScope is pre-production — no backward-compat aliases; drafts/overlay/publish handle the new entities.

## 11. Testing & verification

- **Unit (new `qt-builder/` compile modules):** `forkScenarioForTier` (already-dedicated → no-op; baseline → additive clone, baseline untouched); `forkModuleForTier` (already-forked → no-op; shared → clone + reference swap preserving order/repeats); `addTask`/`removeTask` (immutable, no `applies_when`). Resolution: a baseline (no `quality_tier`) + a QT4 fork resolves QT4→fork, QT3→baseline, and deleting the fork reverts QT4→baseline.
- **Engine/parity:** the existing scenario + material suites stay green (engine untouched). A family converted to baseline + forks produces identical estimates for its forked tiers; QT2-inherits-baseline is the one intentional delta — assert it explicitly.
- **Migration test:** stripping `applies_when.quality_tier` from a fixture module leaves estimates unchanged for the tier whose tasks all fired anyway, and the gated-task report lists what needs manual placement.
- **Manual (live-verify):** McLeod at `localhost:5173` with admin. Open the rebuilt builder, fork a tier, fork a module, add/delete an existing task, confirm the vantage grid reflects it, the draft banner shows, and the estimate changes for that tier only; 0 console errors.

## 12. Phasing

1. **Core (this spec's focus):** naming convention + vantage grid (Scenario→Module→Task × tiers) + fork-on-demand (clone scenario / fork module / add-delete existing tasks) + delete `applies_when.quality_tier` gating + the gated-task migration report. Engine untouched.
2. **Rates → modifiers:** retire `rates_by_tier`; express per-tier rate differences via modifiers carried on the tier's scenario; surface modifier editing in the builder.
3. **Materials file-native:** per-tier scenario carries its own `material_systems`; retire `material_systems_by_tier` + `buildScenarioMaterialOverrides`; the engine resolves materials from the active scenario (keeping the 2e role-aware emission).

## 13. Out of scope / future

- Per-substrate-tier divergence in a single project (the estimate resolves each substrate at the project tier as today).
- Bulk migration of every eager per-tier family to baseline + forks (staged; the builder works with both).
- Any change to the task library, the matcher, or the estimate engine beyond removing the unused `applies_when.quality_tier` key.

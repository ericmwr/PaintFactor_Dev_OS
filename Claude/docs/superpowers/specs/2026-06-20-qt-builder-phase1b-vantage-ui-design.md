# QT Builder Phase 1b — Vantage Grid UI — Design Spec

- **Date:** 2026-06-20
- **Status:** Draft (awaiting spec review)
- **Author:** Eric, with Claude
- **Builds on:** `2026-06-20-qt-builder-tier-file-model-design.md` (the model), Phase 1a (`tier-files.js` — the pure fork/edit ops).
- **Branch:** `feature/qt-builder-rebuild` (off `main` @ `d98f607`).

---

## 1. Summary

The user-facing builder for the file-naming tier model: a **vantage grid** that lays out the full **Scenario → Module → Task** hierarchy for one Substrate × Method × From-state, with the quality tiers (QT2–QT5) as columns, and edits a tier by **implicit fork-on-edit** driving the Phase 1a `tier-files.js` operations. Replaces the current `QTBuilder.jsx` (the `applies_when.quality_tier` tier-ladder). **Zero engine changes.**

## 2. Goals / Non-goals

**Goals**
- A read-and-edit vantage grid: **Phase → Module → Task** rows, tier columns, scoped by Substrate/Method/From-state (the finder, reused).
- Per (module/task, tier) **cell state**: `shared` (inherited from baseline) / `forked` (this tier's own module copy) / `added` (present here, not at baseline) / `absent` / `na`.
- **Implicit fork-on-edit**: editing a tier still served by the baseline auto-forks its scenario (and a shared module, when a task edit targets one), then applies the change. A draft banner notes the fork; a "revert to baseline" link undoes it.
- Edit affordances in-grid: `+ task` (per module), `+ module` (per phase), `×` (remove), and a per-tier coats stepper (`×N`) on repeatable modules.
- All edits flow through the existing draft → overlay → publish pipeline; new forks are new drafts.

**Non-goals (Phase 1b)**
- The `applies_when.quality_tier` deletion + migration (Phase 1c).
- Rates-via-modifiers and materials-file-native authoring (Phases 2, 3).
- The eager→baseline conversion of existing families (staged).
- Any engine/matcher change.

## 3. View-model — `qt-builder/derive-vantage.js` (pure)

`deriveVantage(bundle, sel) → ViewModel`. Resolves the per-tier scenario via `findBestMatch` (reused) over the **overlaid** bundle (canonical + active drafts), then builds:

```
{
  tiers: string[],                 // QT_BUCKETS (QT2..QT5)
  served: string[],                // tiers with a resolved scenario
  scenarioByTier: { [tier]: scenarioId | null },
  isForkByTier:   { [tier]: boolean },   // true when the tier has its OWN pinned scenario (not the baseline);
                                         // a false (baseline-served) tier is marked "baseline" in the UI
  phaseGroups: [
    { phase: string,
      modules: [
        { baseModuleId: string, name: string,
          cells: { [tier]: { moduleId: string|null, count: number, state: 'shared'|'forked'|'added'|'absent'|'na' } },
          tasks: [ { task_ref: string, name: string, cells: { [tier]: 'present'|'added'|'absent'|'na' } } ]
        }
      ]
    }
  ]
}
```

- **Module alignment across tiers (the core logic):** modules are grouped by their **base id** — `moduleId` with any `_QT[2-5]` token stripped (reuse `tier-files.tierId`'s strip rule). So a tier's `MOD_X_QT5` and another tier's shared `MOD_X` align in **one row** under `baseModuleId = MOD_X`, with each tier's `cells[tier].moduleId` recording which concrete id that tier uses.
- **`count`** = how many times the base module appears in that tier's `scenario.modules` (coats). Displayed as `×N` when > 1.
- **Ordering:** modules in first-appearance (structural) order across the served scenarios, grouped by `phase` via `PHASE_ORDER` (from `data/constants.js`); tasks in their order within the module. Phase comes from `bundle.modules[id].phase`.

## 4. Cell state classification

The **reference scenario** for the `added` comparison = the baseline scenario (the resolved scenario whose `scenarioTierPin === null`); if every served tier is pinned (an eager family with no baseline), it's the lowest served tier's scenario. (`added` is computed against this scenario, not a single "baseline tier" — several tiers can be baseline-served.)

- **Module cell** (`cells[tier].state`):
  - `na` — tier not served.
  - `absent` — the base module is in no form (`MOD_X` nor `MOD_X_QT<tier>`) in this tier's scenario.
  - present, then: `added` if the base module is absent in the **reference scenario**; else `forked` if this tier uses a `_QT<tier>` id; else `shared`.
- **Task cell** (`cells[tier]`): tasks are never tier-specific, so no `forked` — `na` / `absent` / `added` (present here, absent in the reference scenario) / `present`. (A shared task inside a forked module stays `present`/neutral — the divergence is shown on the module row, not by recoloring unchanged tasks.)

## 5. Component — `QTBuilder.jsx` (rewrite)

Replaces the current tier-ladder component (the `qt` tab in `AuthoringView.jsx`; tab id/label unchanged). Regions:

- **5.1 Finder** — `Substrate` / `Method` / `From state` (+ coating) selects via `listSubstrates`/`listDimensions` (reused from `derive-tier-ladder.js`).
- **5.2 Legend + draft banner** — shared / forked / added / absent; the existing "N drafts — live in estimates now" banner.
- **5.3 Vantage grid** — `grid-template-columns: <label> repeat(tiers)`, phase-band rows (`grid-column: 1/-1`), module rows, nested task rows. Cells render per §4: neutral check (`shared`/`present`), blue fork pill (`forked`), blue `+` (`added`), `·` (`absent`), `—` (`na`). A forked tier column is marked in the header.
- **5.4 Edit affordances** (inline): per-module `+ task`, per-phase `+ module`, per-cell `×` (remove a task/module at that tier), a per-tier coats `×N` stepper on repeatable apply/finish modules, and a per-forked-tier "revert to baseline" link.

Reads from the overlaid bundle (`mergeScenarioDrafts`/`mergeModuleDrafts` over `scenario-bundle.gen.js`) so edits are live. `busy`/`busyRef` guards as in the current component.

## 6. Edit flow — implicit fork-on-edit

Each handler is a short sequence over the Phase 1a `tier-files.js` ops, persisting via `useScenarioDrafts`/`useModuleDrafts`. `ensureScenarioFork(T)` and `ensureModuleFork(scnDraft, moduleId, T)` are the shared preludes.

- **`ensureScenarioFork(T)`** — if `scenarioByTier[T]` is the baseline (not pinned to T), `forkScenarioForTier(baselineScenario, T)` → save scenario draft; return the (now tier-pinned) scenario draft. Else return the existing T scenario.
- **`ensureModuleFork(scnDraft, moduleId, T)`** — if `moduleId` is shared (no `_QT<T>`), `forkModuleForTier(scnDraft, moduleId, sourceModule, T)` → save the new module draft + the ref-swapped scenario draft; return the forked module id + draft. Else return the existing fork.
- **`+ task`** at (module, T): `ensureScenarioFork(T)` → `ensureModuleFork(…)` → `addTask(moduleDraft, taskId)` → save module draft. (Task picked via the existing `TaskPicker`.)
- **`×` task** at (module, T): same fork preludes → `removeTask`.
- **`+ module`** at (phase, T): `ensureScenarioFork(T)` → `addModuleToTier(scnDraft, moduleId)` → save scenario draft. (Module picked via the existing `ModulePicker`, optionally filtered to the phase.)
- **`×` module** at (module, T): `ensureScenarioFork(T)` → `removeModuleFromTier`.
- **Coats `×N`** on a module at T: `ensureScenarioFork(T)` → `addModuleToTier`/`removeModuleFromTier` of the same id to reach N occurrences (so "QT5 = 3 coats" = the apply module appearing 3× in QT5's scenario).
- **Revert tier T**: delete the T scenario draft (and any `_QT<T>` module drafts referenced only by it), reclaiming baseline.

A genuinely shared module is **never** edited in place — the fork preludes guarantee edits land only on the target tier's own files.

## 7. Reuse / persistence / cleanup

- **Reuse:** `findBestMatch`, `listSubstrates`/`listDimensions`, `ModulePicker`, `TaskPicker`, `useScenarioDrafts`, `useModuleDrafts`, `mergeScenarioDrafts`/`mergeModuleDrafts`, the draft banner, the publish pipeline.
- **Persistence:** forks are new draft records (new ids) — the existing clone/publish machinery already creates new entities.
- **Dead-code cleanup (in 1b):** the rewrite stops importing the gating-era compile modules — `edit-tier-ladder.js`, `tier-coats.js`, `tier-rates.js`, `tier-qt-factor.js`, and `deriveTierLadder` (the `listSubstrates`/`listDimensions` helpers are kept/relocated). Delete the now-dead modules + their tests in a final cleanup commit so the tree carries no orphaned gating code.

## 8. Testing

- **Unit (`derive-vantage.test.js`):** on synthetic overlaid bundles — module alignment (a `_QT5` fork aligns under its base id with a shared lower tier); state classification (`shared`/`forked`/`added`/`absent`/`na`, incl. the baseline-tier reference and the eager-family fallback); `count`/coats; phase grouping + order; `isForkByTier`.
- **Engine/parity:** full suite stays green (engine untouched; `derive-vantage` is read-only).
- **Manual (live-verify):** McLeod at `localhost:5173`, admin on. Open the rebuilt builder on arch element / brush / from bare: confirm the grid renders Phase→Module→Task × tiers; `+ module`/`+ task` on a baseline tier auto-forks (draft banner appears, cell turns blue), a coats stepper changes `×N`, revert reclaims baseline, and the estimate for that tier changes; 0 console errors.

## 9. Files

- **Create** `tools/paintscope/src/components/authoring/qt-builder/derive-vantage.js` + `__tests__/derive-vantage.test.js`.
- **Rewrite** `tools/paintscope/src/components/authoring/QTBuilder.jsx`.
- **Delete (cleanup)** `qt-builder/edit-tier-ladder.js`, `tier-coats.js`, `tier-rates.js`, `tier-qt-factor.js` (+ their tests) and `deriveTierLadder` from `derive-tier-ladder.js` (keeping the finder helpers). 2a–2e engine fields they wrote (`coat_counts_by_tier`, `modifier_overrides`, `rates_by_tier`) are inert without their UI and are left for the Phase 1c/2 cleanups.

## 10. Out of scope / future

- `applies_when.quality_tier` deletion + migration report (Phase 1c).
- Rates-via-modifiers (Phase 2), materials-file-native (Phase 3).
- Eager→baseline conversion of existing per-tier-file families (staged).
- Side-by-side multi-substrate views; bulk fork operations.

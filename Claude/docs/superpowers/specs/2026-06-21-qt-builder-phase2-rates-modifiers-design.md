# QT Builder Phase 2 — Per-tier Rates as Modifiers — Design Spec

- **Date:** 2026-06-21
- **Status:** Approved (design); awaiting spec review
- **Author:** Eric, with Claude
- **Branch:** `feature/qt-builder-rebuild` (off `main` @ `d98f607`, latest `af95652f`). NOT pushed.
- **Supersedes:** the retired Phase 2d rate UI — `tier-rates.js` (`rates_by_tier`) + `tier-qt-factor.js` (`modifier_overrides.FAC_QT` per-tier map), both deleted in Phase 1b‑2b. This is the file‑naming‑model replacement; do NOT resurrect those modules.
- **Implements:** Phase 2 of `2026-06-20-qt-builder-tier-file-model-design.md` (§12.2, "Rates → modifiers").
- **Related (memory):** `project_qt_builder_rewrite`, `feedback_qt_rates`, `feedback_qt_rate_model`, `project_paintscope_pre_production`, `feedback_paintscope_main_checkout`.

---

## 1. Summary

Let the QT Builder express a quality tier's **rate difference** as a **single `FAC_QT` time‑multiplier carried on that tier's forked scenario**, deviating from the global default. The baseline rate (the task's `rate_per_hour`, refined via on‑the‑fly estimate edits) never moves; only the per‑tier multiplier does.

This is a rate difference because `hours = quantity × effectiveTotal ÷ baseRate`, and `effectiveTotal` includes the `qt` factor — multiplying a tier's `qt` by 1.65 is mathematically identical to running that tier's work at `baseRate ÷ 1.65`. We tune the multiplier, not the rate.

The lever is **scenario‑level and per (substrate × method × from‑state)**: one knob per tier column. Edits **fork on demand** (clone the baseline scenario → `SCN_…_QT<n>`), exactly like the existing task/module grid edits, and write `modifier_overrides.FAC_QT[tier]` on the fork. **QT3 is a locked `×1.00` anchor** — never written — which makes "QT3 byte‑identical" a structural guarantee rather than a test‑and‑hope.

**Zero estimate‑engine changes. Zero scenario/module data‑file changes.** Phase 2 is pure authoring‑tool code (new pure modules + tests + one grid row). Estimates stay byte‑identical for every tier until a user opts in and publishes a draft.

## 2. Motivation & current state

After the QT3‑baseline collapse (`1d27d6a9`) and Phase 1c (`d6a7e801`), every scenario family is a single editable **QT3 baseline** (no `matches.quality_tier`) plus **on‑demand per‑tier forks**; there is **zero `applies_when.quality_tier`** anywhere. QT2/QT4/QT5 currently estimate as *QT3 structure × the global `FAC_QT`* until authored.

The vantage grid (Phase 1b‑2b) already authors the two **structural** levers per tier: module composition (add/remove/reorder modules) and task composition (fork a module, add/remove tasks). What it cannot yet express is the **speed** lever — "the same work is done more slowly/carefully at a higher tier." Today that is governed only by the **global** `FAC_QT` table, applied uniformly to every substrate. Phase 2 lets an estimator deviate from that global default per substrate, per tier (e.g. "for cabinets, QT5 is `×1.65`, not the global `×1.50`").

Why a multiplier and not a typed rate: the lever is scenario‑level (the user's chosen grain), and a single scenario mixes tasks at very different base rates (150 SF/hr apply, 20 SF/hr detail). There is no one "rate" to type for a scenario, so the lever is a multiplier. Non‑uniform differences are expressed structurally in the grid, not here. This matches the locked rate model (`feedback_qt_rates`: QT scaling is a **time modifier**, never `rates_by_tier`; `feedback_qt_rate_model`: single baseline rate at QT3 + modifier).

## 3. Goals / Non‑goals

**Goals**
- A "QT time multiplier" row in the vantage grid: per‑tier columns, QT3 anchor, QT2/QT4/QT5 editable.
- Editing a tier's multiplier forks that tier's scenario (fork‑on‑edit) and writes `modifier_overrides.FAC_QT[tier]`.
- Default (un‑overridden) value = the global `FAC_QT` factor for that tier.
- Clear an override (surgical) and revert a whole tier (existing path) both behave coherently.
- Zero engine changes; zero committed data‑file changes; QT3 byte‑identical by construction.

**Non‑goals**
- Per‑module or per‑task multiplier granularity (decided: scenario‑level only). The engine still *supports* `task.fac_qt_override`, but Phase 2 does not write it.
- Non‑QT modifier overrides (height / texture / complexity / condition / trade‑level) — deferred.
- `rates_by_tier` / per‑task rate authoring — retired by the pivot; not reintroduced.
- Materials per tier — Phase 3.
- Making legacy multi‑tier **array** families editable — still read‑only here, same guard as the grid today.
- QT1 — reserved/unused (`QT_BUCKETS` excludes it).

## 4. The model — a multiplier on the tier's file

| Tier | In the multiplier row | Storage |
|---|---|---|
| **QT3** | Locked `×1.00` anchor, read‑only. Its speed *is* the task baseline rate. | Never written. |
| **QT2 / QT4 / QT5** | Editable. Default = global `FAC_QT` (`×0.80 / ×1.30 / ×1.50`). | `scenario.modifier_overrides.FAC_QT[tier]` on the **forked** `SCN_…_QT<n>`. |

- **Default‑from‑global is a display seed**, not a stored value. An un‑overridden tier carries nothing; the engine falls through to the global `FAC_QT` exactly as today. Only an explicit override writes a file value.
- **One tier key per fork.** The QT5 fork carries `modifier_overrides: { FAC_QT: { QT5: 1.65 } }` — single‑tier, file‑native. (Contrast 2d, which accumulated multiple tier keys on one shared scenario.)
- **QT3 anchor is structural safety.** Because QT3 always resolves to the baseline (which is never forked or written by this feature) and the anchor cell is read‑only, no QT3 estimate can move from Phase 2.

## 5. Engine — zero changes (and why)

- **Override resolution exists.** `resolveFactor(bundle, modId, ctxValue, modifierOverrides)` (run-estimate-scenario.js:316) returns `modifierOverrides[modId][ctxValue]` when numeric, else the global `getFactor`. It is already threaded for `FAC_QT` at run-estimate-scenario.js:343, with `scenario.modifier_overrides` passed at the two `computeScenarioModifierStack` call sites (lines 832, 853).
- **Per‑tier file resolution exists.** `findBestMatch` already selects the QT5 fork (specificity *N+1*) for a QT5 job and the baseline (*N*) for the rest. A fork created only for a multiplier has the same `modules` as the baseline; it just carries the override.
- **No double‑count (a 2d simplification).** 2d paired `rates_by_tier` with `modifier_eligibility.qt:false` so the multiplier and the per‑tier rate wouldn't stack. Here the override **replaces** the global `FAC_QT` for that tier; `qt` is applied exactly once. No `modifier_eligibility` writes. Tasks already `qt:false` (e.g. fixed‑rate sanding) keep `qt = 1.0` and correctly ignore the multiplier.
- **Engine test already present.** `engine/__tests__/qt-builder-engine.test.js` covers the `modifier_overrides` path; Phase 2 extends it with a forked‑scenario delta case (§9.2).

## 6. Safety property — the byte‑identical gate

Phase 2 changes **no** `scenarios/*.json` or `modules/*.json` and does **not** regenerate `scenario-bundle.gen.js`. It adds only authoring‑tool JS + tests + a grid row. Therefore:

1. With no user edits, **every tier's estimate is byte‑identical to pre‑change** — there are no new files for the engine to read.
2. QT3 can **never** move from this feature (anchor never written; QT3 always → baseline).
3. A change appears only when a user authors an override **and publishes the draft** from the Drafts tab (the normal draft → overlay → publish pipeline). Until publish, overrides live as IndexedDB scenario drafts and affect only that browser's live preview.

The gate is thus satisfied by construction and confirmed by unit/engine tests + a no‑edit parity run (§9).

## 7. Code architecture (reuses the Phase 1a/1b spine)

All edits autosave as **scenario drafts** (no module drafts — a multiplier never forks a module). Persistence reuses `useScenarioDrafts`, the `mergedBundle` overlay, the `busy`/`busyRef` guards, and the draft banner already in `QTBuilder.jsx`.

### 7.1 `qt-builder/tier-files.js` — add two pure scenario ops

- `setScenarioQtFactor(scenario, tier, value) → scenario` — immutable; sets `modifier_overrides.FAC_QT[tier] = value`, creating the nested objects via spreads. Returns a new scenario (same ref on a true no‑op).
- `clearScenarioQtFactor(scenario, tier) → scenario` — immutable; removes `modifier_overrides.FAC_QT[tier]`; prunes an emptied `FAC_QT` and an emptied `modifier_overrides`. Same ref when the key was absent.

These join the existing copy‑on‑write ops (`forkScenarioForTier`, `addModuleToTier`, …); no `applies_when.quality_tier` is involved.

### 7.2 `qt-builder/vantage-edits.js` — add two plan functions

- `planSetQtFactor(bundle, sel, tier, value) → { scenario }`
  1. Guard: non‑finite or `value ≤ 0` → `{}` (ignore). `tier === ANCHOR` (QT3) → `{}` (defensive; the UI also locks it).
  2. `scn = ensureScenarioForTier(bundle, sel, tier)` — forks the baseline to `SCN_…_QT<n>` if the tier is still baseline‑served (reuses the existing helper).
  3. Return `{ scenario: setScenarioQtFactor(scn, tier, value) }`.

- `planClearQtFactor(bundle, sel, tier) → { scenario } | { deleteScenarioId, deleteModuleIds } | {}`
  1. `gov = resolveTierScenario(bundle, sel, tier)`. If `scenarioTierPin(gov) !== tier` → not forked → `{}` (nothing to clear; tier already uses the global default).
  2. `thinned = clearScenarioQtFactor(gov, tier)`.
  3. **Auto‑reclaim baseline** when clearing removed the fork's last divergence: find the baseline via `bundle.scenarios.find(s => s.scenario_id === baseId(gov.scenario_id))` (`scenarios` is an array; `modules` is an object map); if found and `thinned` now equals it — `modules` arrays deep‑equal (ids, order, repeats) **and** `thinned.modifier_overrides` empty/absent — return `{ deleteScenarioId: gov.scenario_id, deleteModuleIds: [] }` (an equal‑to‑baseline fork references no `_QT` modules). The persist path already deletes the scenario draft.
  4. Otherwise (structural divergence remains, or no baseline found) return `{ scenario: thinned }` — keep the fork, just without the override. (No‑baseline‑found is a defensive fallback that prefers a harmless thin fork over orphaning the tier.)

Whole‑tier reset stays the **existing** `planRevertTier` (the forked‑header "revert" link), which deletes the fork and its `_QT` modules — clearing structure *and* multiplier in one action. Per‑cell clear is the surgical complement.

### 7.3 `qt-builder/derive-vantage.js` — add `multiplierRow` to the view‑model

- Import `getFactor` from `engine/modifier-registry.js`; define `const ANCHOR_TIER = 'QT3'`.
- After `scnByTier` is built, for each tier:
  - QT3 → `{ value: 1.0, isOverride: false, isAnchor: true, served: !!scnByTier.QT3 }`.
  - else `ov = scnByTier[t]?.modifier_overrides?.FAC_QT?.[t]`; `{ value: typeof ov === 'number' ? ov : getFactor(bundle, 'FAC_QT', t), isOverride: typeof ov === 'number', isAnchor: false, served: !!scnByTier[t] }`.
- Return `multiplierRow` in the vm object (no second resolution pass — reuses the existing per‑tier `findBestMatch` loop).

### 7.4 `components/authoring/QTBuilder.jsx` — render the row

- A single `<tr>` at the **top of `<tbody>`**, before the phase groups, with a left label "QT time multiplier" and one cell per tier. It is scenario‑level, so it sits above the phase/module/task structure.
- **QT3 cell:** `×1.00` muted + lock affordance, read‑only (locked regardless of `tierEditable`).
- **QT2/4/5 cell, served & editable** (`tierEditable(t)` — excludes unserved and array‑pattern tiers):
  - Not overridden: the default (`×1.50`) muted, with a small inline number input (or click‑to‑edit) seeded to the default.
  - Overridden: amber `×1.65` + `def ×1.50` for reference + a clear `×`, mirroring the grid's forked‑tier amber convention.
  - **Commit on blur / Enter** (not per keystroke) → `run(() => planSetQtFactor(mergedBundle, sel, t, parsed))`; reject non‑numeric/≤0. Clear → `run(() => planClearQtFactor(mergedBundle, sel, t))`.
- **Unserved / array‑pattern tier:** `—` (consistent with existing cells).
- Reuses `busy` to disable inputs during an in‑flight save.

## 8. Files & tests

**New tests**
- `qt-builder/__tests__/` cases added to existing suites (or a small new file per module, matching the current layout).

**Edit**
- `qt-builder/tier-files.js` (+ `set/clearScenarioQtFactor`)
- `qt-builder/vantage-edits.js` (+ `planSetQtFactor`, `planClearQtFactor`)
- `qt-builder/derive-vantage.js` (+ `multiplierRow`)
- `components/authoring/QTBuilder.jsx` (multiplier row)
- `engine/__tests__/qt-builder-engine.test.js` (forked‑scenario `FAC_QT` delta case)

## 9. Verification

### 9.1 Unit (TDD, vitest)
- `tier-files`: `setScenarioQtFactor` writes the nested override immutably + preserves other `modifier_overrides`; `clearScenarioQtFactor` removes the key and prunes emptied objects; both no‑op to the same ref when appropriate.
- `vantage-edits`: `planSetQtFactor` forks a baseline tier then writes the override (baseline untouched); rejects `value ≤ 0` and the anchor tier; `planClearQtFactor` thins a fork that still diverges structurally, **and** returns `deleteScenarioId` when clearing the last divergence makes the fork equal baseline; no‑op when the tier was never forked.
- `derive-vantage`: `multiplierRow` reports anchor (QT3 → 1.0, isAnchor), default (un‑overridden → global value, isOverride=false), and override (overridden → file value, isOverride=true); unserved → served=false.
- All existing **268** stay green.

### 9.2 Engine
- Extend `qt-builder-engine.test.js`: a forked scenario carrying `modifier_overrides.FAC_QT.QT5 = X` yields QT5 hours scaled by `X` (vs the global) for qt‑eligible tasks, leaves `qt:false` tasks unchanged, and leaves the QT3/baseline estimate unaffected.

### 9.3 Build
- `npx vite build` clean (≈249 modules, 0 errors).

### 9.4 Live (McLeod, `localhost:5173`, `localStorage.setItem('paintscope.admin','1')`, Authoring → QT Builder)
1. Pick a collapsed‑baseline substrate (e.g. Cabinets / Closet). The multiplier row shows QT3 `×1.00` locked, QT2/4/5 at their global defaults.
2. Set QT5 `×1.65` → header flips QT5 to "forked", draft banner appears, the QT5 estimate rises (qt‑eligible tasks only); QT3 unchanged.
3. Clear the QT5 override (×) on an otherwise‑unforked tier → fork is reclaimed, QT5 returns to the global default, banner clears.
4. On a QT5 that *also* has a structural edit: clearing the multiplier keeps the structural fork; the whole‑tier "revert" removes everything.
5. 0 console errors throughout.

### 9.5 Parity
- A no‑edit estimate run is byte‑identical to pre‑change for all tiers (trivially true — no data files change). Confirm via the existing real‑engine parity harness used in the collapse/1c gates.

## 10. Edge cases & invariants

- **QT3 anchor is inviolable.** Locked in the UI and guarded in `planSetQtFactor`; QT3 always resolves to the unforked baseline.
- **`value ≤ 0` / non‑finite rejected** — a multiplier must be positive (it divides the rate).
- **Thin fork is estimate‑neutral.** A fork with baseline‑equal `modules` and no `modifier_overrides` resolves to the same hours as the baseline; auto‑reclaim (§7.2.3) removes it for tidiness but correctness does not depend on it.
- **Array‑pattern multi‑tier families** remain read‑only in this row (same `isArrayTierByTier` guard as the grid), so a multiplier can't create a silent inert draft.
- **Composability.** A scenario can carry both structural edits (modules/tasks via the grid) and a `FAC_QT` override; each plan reads the current merged scenario and returns a new payload, so they compose.
- **Publish required for a real estimate change.** Until the scenario draft is published, the override affects only the local overlay preview (pre‑production; no migration plumbing — `project_paintscope_pre_production`).

## 11. Out of scope / future
- Per‑module / per‑task multiplier granularity.
- Non‑QT modifier overrides (height/texture/complexity/condition/trade).
- Phase 3 — materials file‑native per tier (`material_systems` on the tier's scenario; the engine `material-system-roles.js` already supports per‑(tier, role) overrides).
- Bulk conversion of legacy eager per‑tier‑file families to baseline + forks (staged).
- A read‑out of the resulting effective rates per task at each tier (a possible later UX aid; the lever stays a multiplier).

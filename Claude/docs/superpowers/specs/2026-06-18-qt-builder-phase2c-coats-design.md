# QT Builder — Phase 2c: Per-Tier Coats + Interstage Design

- **Date:** 2026-06-18
- **Status:** Approved (brainstormed)
- **Builds on:** the feature spec + Phase 2a/2b (read-only ladder + task editing).
- **Branch:** `feature/qt-builder`

## 1. Summary

Add per-tier **finish-coat counts** (and a derived **interstage-rounds** readout) to the ladder, editable with a stepper. Coats are stored as **repeated apply/finish modules** in a scenario's `modules[]` (the engine counts invocations); `coat_counts` is ignored metadata, and only ~20 stain scenarios use the field-driven `dynamic_coats` form. So Phase 2c edits the **module repetition directly** rather than converting to `dynamic_coats` (which is risky and can't cleanly express multi-module-per-coat scenarios). This is low-risk and uses the existing engine unchanged.

## 2. The coats reality (why this approach)

- The engine counts coats by counting how many times an apply/finish-phase module appears in `scenario.modules[]` (`run-estimate-scenario.js:798`: only `phase ∈ {apply, finish}` bumps `coatNumber`).
- `coat_counts` is **not read** by the engine — metadata only.
- ~97% of paint scenarios hardcode repetition; only stain uses `dynamic_coats`. Paint scenarios never set `ctx.finish_coats`.
- **Consequence:** per-tier coats = editing the repetition. For **per-tier-file substrates** (cabinet, closet, drywall — separate scenario per QT) each tier edits its own scenario → **true per-tier coats**. For **multi-tier scenarios** (arch, most trim — one scenario for QT3–5) the `modules[]` is shared, so a coats edit moves all their served tiers together (per-tier variation there is deferred — it would need the risky `dynamic_coats` path).

## 3. Concepts: coat units

A **coat-bearing module** has `phase ∈ {apply, finish}`. A **coat unit** is a maximal contiguous run of coat-bearing modules in `modules[]`. **Finish coats = the number of coat-unit runs.** Examples:
- Cabinet `[…, PRIME, FINISH, INTERSTAGE, FINISH, …]` → two `[FINISH]` runs → **2 coats** (PRIME is `prime` phase, breaks the run; INTERSTAGE breaks between).
- Drywall `[…, CUTIN_C, CUTIN_T, WALL_ROLL, CUTIN_C, CUTIN_T, WALL_ROLL, …]` → two `[CUTIN_C, CUTIN_T, WALL_ROLL]` runs → **2 coats** (multi-module unit).
- The **between-coat interstage** = the modules sitting between two consecutive runs (cabinet: `MOD_INTERSTAGE_CABINET`; drywall: none — back-to-back).

## 4. Reading coats (display)

`deriveTierCoats(bundle, sel)` resolves the governing scenario per served tier (same matcher path as the ladder) and returns, per tier: `{ scenarioId, finishCoats (run count), interstageRounds (count of interstage modules between runs) }`. The component renders two readouts under the ladder (or as pinned rows): **Finish coats** and **Interstage rounds**, per tier. `na` tiers show `—`. Interstage rounds is the *actual* between-coat interstage count (which equals coats − 1 for scenarios that interleave interstage, 0 for back-to-back ones) — not a forced `coats − 1`.

## 5. Editing coats (stepper)

A `– N +` stepper per served tier on **finish coats**, compiling via the pure `setFinishCoats(scenario, modulesById, targetCount)`:
- **+1**: append a copy of `[interstageBetween…, lastCoatUnit…]` after the last run (interstage = whatever sits between the existing last two runs; empty if back-to-back or if only one coat exists today).
- **−1**: remove the trailing run(s) and the interstage that precedes each.
- Generic over single- and multi-module coat units. Minimum 1 coat (stepper won't go below 1).
- Saves the edited scenario as a **scenario draft** (`useScenarioDrafts().save({ id: scenario_id, payload, status:'draft' })`) → live via the overlay → publish from the Drafts tab.
- **Per-tier-file substrate** → edits that tier's scenario (true per-tier). **Multi-tier scenario** → edits the shared scenario (all its served tiers move); the stepper is labeled to make that clear (e.g. a "shared across QT3–5" hint).

## 6. Architecture & components

- **`qt-builder/edit-tier-coats.js`** (new, pure, unit-tested): `coatUnits(scenario, modulesById) → { runs, count, lastUnit, interstageBetween }`; `setFinishCoats(scenario, modulesById, targetCount) → scenario` (immutable; no-op if target == current or < 1 or no coat units). A `mergeScenarioDrafts(canonicalScenarios, drafts) → scenarios` helper (scenarios is an array — overlay active drafts by `scenario_id`: replace matching, append new; mirrors `overlay-loader.js`).
- **`qt-builder/derive-tier-ladder.js`** (extend) or a sibling: `deriveTierCoats(bundle, sel)` → per-tier coat counts using `coatUnits`.
- **`QTBuilder.jsx`** (extend): merge scenario drafts (`useScenarioDrafts`) into the bundle alongside the existing module-draft merge, so coats AND task edits both show live; render the coats/interstage readouts + steppers; wire steppers → `setFinishCoats` → save scenario draft, guarded by the existing `busyRef`.
- **Reuse:** the `useScenarioDrafts` hook and the scenario publish path already exist (parallel to the module ones used in 2b).

## 7. Testing

- **Unit (crux):** `edit-tier-coats.js` — `coatUnits` run detection (single-module, multi-module, prime-not-counted, interstage-between); `setFinishCoats` +1/−1 for cabinet-style (with interstage) and drywall-style (back-to-back), min-1 clamp, no-mutation, no-op cases; `mergeScenarioDrafts` active-vs-published overlay on the scenarios array.
- **Build + live browser:** step coats up/down on a per-tier-file substrate (cabinet) → confirm the scenario draft's `modules[]` gained/lost a coat unit and the readout updates; confirm a multi-tier substrate steps uniformly. Console clean.

## 8. Scope / non-goals (this sub-phase)

- **In:** per-tier finish-coat display + stepper editing via module repetition; interstage-rounds readout; scenario drafts; the multi-tier "uniform/shared" labeling.
- **Out (later):** prime-coat editing; an interstage-module picker (we reuse the scenario's own or none); per-tier coat *variation* on multi-tier scenarios (needs `dynamic_coats`); editing the *contents* of interstage modules (that's task editing, already in 2b). 2d (per-tier rate + modifier-override UI) and 2e (materials) remain separate.

## 9. Open implementation details (resolved in the plan)

- Coat-bearing phase set is `{apply, finish}` (matches the engine's coat-counting gate). Confirm against real drywall cut-in module phases when wiring.
- Multi-tier "shared" detection: a scenario is multi-tier when its `matches.quality_tier` covers more than one served tier (so one stepper edit affects multiple ladder columns) — label accordingly.
- `mergeScenarioDrafts` must mirror `overlay-loader.js`'s scenario handling (index canonical by `scenario_id`, replace, append new draft scenarios).

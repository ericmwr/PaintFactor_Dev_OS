# QT Builder Phase 2d — Per-tier Rates + FAC_QT Overrides — Design Spec

- **Date:** 2026-06-19
- **Status:** Approved (design); awaiting spec review
- **Author:** Eric, with Claude
- **Builds on:** `2026-06-18-quality-tier-builder-design.md` (master), phases 2a/2b/2c
- **Related:** `project_qt_builder_rewrite` (memory), `feedback_qt_rate_model` (memory)

---

## 1. Summary

Phase 2d adds the two **opt-in** editing surfaces the master design reserved as
explicit levers on top of the structure-first ladder:

1. **Per-tier rate** — expand a task row to author `rates_by_tier { QT3, QT4, QT5 }`,
   saved as a **task draft**.
2. **FAC_QT per-tier override** — adjust the QT time-multiplier for the current
   substrate scenario, saved as a **scenario draft**.

Plus two deferred polish fixes folded in: **stable row ordering** when a baseline
task is toggled off, and **visually disabling the steppers/inputs during the
in-flight save**.

**No engine changes.** Both engine features already ship and are unit-tested
(`engine/__tests__/qt-builder-engine.test.js`): `rates_by_tier` at
`run-estimate-scenario.js` `resolveTaskRate` priority 3, and `modifier_overrides`
via `resolveFactor` with precedence task `fac_qt_override` → scenario
`modifier_overrides` → global `getFactor`. Phase 2d is purely a pure-compile
module + `QTBuilder.jsx` extension, following the 2a–2c pattern (draft → overlay →
publish).

## 2. Key decisions (from brainstorming, 2026-06-19)

1. **Per-tier rate seed = today's effective rate.** Each tier box seeds with
   `round(baseRate ÷ FAC_QT[tier])`, so opting in and saving unchanged reproduces
   today's estimate; the user then tweaks the tiers they care about.
2. **Per-tier rate auto-disables FAC_QT for that task.** `rates_by_tier` and the
   FAC_QT multiplier must never both apply (double-count). Opting in writes a
   task-level `modifier_eligibility: { qt: false }` alongside `rates_by_tier`.
   This is the established convention (`MOD_INTERSTAGE_SAND` qt:false +
   `TSK_LIGHT_SAND_BETWEEN_COATS_WALL` rates_by_tier), now applied surgically at
   task grain.
3. **Override scope = FAC_QT only.** The override surface adjusts only the QT
   time-multiplier per tier. Other static modifiers (height/texture/complexity/
   condition) and trade-level modifiers are out of scope for v1.
4. **FAC_QT override is a grid row, not a separate strip.** Because FAC_QT is
   tier-keyed, it renders as a "QT time multiplier" row alongside the existing
   "Finish coats" / "Interstage rounds" rows — more consistent than the separate
   modifier-picker strip the master design §7.7 sketched (that sketch assumed
   multiple modifier types).
5. **Per-tier rate editing is scalar-rate only in v1.** Editable when the task
   has a scalar `rate_per_hour` baseline or an existing `rates_by_tier`. Tasks
   with `rates[]` / `rates_by_coat` / `fixed_minutes` show a disabled editor with
   a note, to avoid corrupting those rate shapes.

### 2.1 Correction to master-design §14

Master §14 says: "Tasks that opt out of QT (`modifier_eligibility.qt === false`)
still appear but their per-tier rate column is inert." Phase 2d **reverses** that:
a qt-off task is the *natural home* for per-tier rates (explicit per-tier rates
replace the multiplier). The per-tier rate editor is therefore active for
qt-eligible scalar-rate tasks (and flips them qt-off on opt-in) and for tasks
already qt-off with `rates_by_tier`. It is inert only for non-scalar rate shapes
(decision 5), not for qt-off tasks.

## 3. Per-tier rate editor

### 3.1 Engine contract (existing, no change)

`resolveTaskRate` priority 3: `rates_by_tier[ctx.quality_tier]` → effective rate;
**a tier absent from the map returns null = task skips that tier.** Downstream,
`total = qt × height × texture × condition × overhead × dynamic` multiplies the
rate, and `qt` is neutralized only when `modifier_eligibility.qt === false`
(`resolveEligibility` shallow-merges module + task, task wins).

### 3.2 Compile module — `qt-builder/tier-rates.js` (new, pure/immutable)

- `mergeTaskDrafts(canonicalTasks, drafts)` — object-map merge keyed by task_id,
  active drafts (`draft` | `local_override`) win. Mirrors `mergeModuleDrafts`
  (tasks are an object map in the bundle, like modules).
- `effectiveTierRates(task, firingTiers, bundle)` → `{ editable, reason, byTier }`:
  - `editable=false` (with `reason`) when the task lacks both a scalar
    `rate_per_hour` and an existing `rates_by_tier` (complex shape).
  - `byTier[tier]` = existing `rates_by_tier[tier]` if present, else
    `round(rate_per_hour ÷ getFactor(bundle,'FAC_QT',tier))`. Computed for each
    firing tier. This is both the editor seed and the source for unedited tiers
    in `setTierRate`.
  - **Missing-tier fallback:** if a firing tier has neither an existing entry nor
    a scalar `rate_per_hour` to derive from (a task with partial `rates_by_tier`),
    carry forward the nearest authored tier's rate. This guarantees `byTier`
    covers every firing tier, so `setTierRate` never writes a partial map that
    silently drops a firing tier.
- `setTierRate(task, editTier, value, firingTiers, bundle)` → new task payload:
  1. Start from the task's current `rates_by_tier` if present, else seed every
     firing tier from `effectiveTierRates`.
  2. Set `editTier = value`; ensure every firing tier has a numeric value (full
     map — protects the absent-tier-skips edge).
  3. Set `modifier_eligibility = { ...(task.modifier_eligibility||{}), qt:false }`.
  - Immutable; returns the same reference unchanged on a no-op.

"Reset" is **not** a compile function — the component calls
`useTaskDrafts().remove(task_id)` to drop the draft and revert to canonical
exactly (covers both "was flat rate" and "canonical already had rates_by_tier").

### 3.3 UI

Per master §7.5. Each task row carries an expand affordance (▸/▾). Expanding
renders an inline sub-row beneath the task, with a number input under each
**firing** tier column (skipped/`na` tiers show no input). Inputs seed from
`effectiveTierRates().byTier`. On change → `setTierRate` → `saveTask`. A tier
whose rate is authored (draft present) shows an **amber pill** in its ladder
cell. The expander shows a **Reset** action (drop draft) and, when not editable,
a disabled state with the `reason` note. The existing per-row `shared ×N` badge
already warns that `rates_by_tier` is global to the canonical task.

## 4. FAC_QT per-tier override

### 4.1 Engine contract (existing, no change)

`resolveFactor(bundle,'FAC_QT',tier, scenario.modifier_overrides)` returns
`modifier_overrides.FAC_QT[tier]` when numeric, else the global factor.
Threaded into `computeScenarioModifierStack` at both call sites.

### 4.2 Compile module — `qt-builder/tier-qt-factor.js` (new, pure/immutable)

- `deriveTierQtFactors(bundle, sel)` → per served tier
  `{ scenarioId, value, isOverride }`: resolve the governing scenario per tier
  via `findBestMatch` (same as `deriveTierCoats`), then
  `value = modifier_overrides.FAC_QT[tier] ?? getFactor(bundle,'FAC_QT',tier)`.
- `setQtFactor(scenario, tier, value)` → new scenario payload with
  `modifier_overrides.FAC_QT[tier] = value` (creates nested objects immutably).
- `clearQtFactor(scenario, tier)` → removes that tier's key; prunes empty
  `FAC_QT` / `modifier_overrides` objects.
- Reuses `mergeScenarioDrafts` from `tier-coats.js` (scenario drafts already
  merged into `mergedBundle.scenarios`); `setQtFactor`/`setFinishCoats` compose
  because both read the current merged scenario and return a new payload.

### 4.3 UI

A **"QT time multiplier"** row in the grid, directly under "Interstage rounds".
Each served-tier cell shows the effective `×value` (e.g. `×1.30`). Editing a cell
(small inline input) → `setQtFactor` on that tier's governing scenario →
`saveScenario`. An overridden cell shows a pill (`×1.8 · def ×1.5`) and a clear
(×) affordance → `clearQtFactor`. Unserved tiers render `—`.

### 4.4 Per-tier-file vs multi-tier routing

`deriveTierQtFactors` resolves a scenario per tier. In the multi-tier pattern all
tiers share one scenario, so all FAC_QT overrides accumulate in that scenario's
`modifier_overrides.FAC_QT`. In the per-tier-file pattern, `FAC_QT[QT5]` lands on
the QT5 scenario. Both correct with no special-casing.

## 5. Polish

### 5.1 Stable row ordering on toggle (`derive-tier-ladder.js`)

Today row order = `info.order`, where `info` is taken from the first tier in
`collectOrder` whose **tier-filtered** task walk contains the task. Toggling a
task off the baseline tier changes which tier first contributes it, so the row
jumps. Fix: derive row order from an **unfiltered structural walk** — iterate the
served scenarios' `modules` in order and each module's `tasks` entries
(ignoring `applies_when`), assigning a stable first-seen index per task_id. Cell
states keep using the per-tier filtered sets; only ordering changes source. A
task entry's position in `mod.tasks` does not change when its
`applies_when.quality_tier` is narrowed, so order is stable across toggles. (When
a task is toggled fully off it drops to an empty set and the entry is removed, so
the row disappears — not a reorder.)

### 5.2 Disable steppers/inputs during save (`QTBuilder.jsx`)

Add a `busy` `useState` set true at the start of each async save handler and
false in `finally`, alongside the existing `busyRef` re-entrancy guard (kept,
because state updates lag rapid clicks). While `busy`: disable the coat steppers,
QT-multiplier inputs, and per-tier rate inputs, and dim them (reduced opacity /
`cursor:not-allowed`). Cell toggles already guard on `busyRef`.

## 6. Files & tests

**New**
- `tools/paintscope/src/components/authoring/qt-builder/tier-rates.js`
- `tools/paintscope/src/components/authoring/qt-builder/tier-qt-factor.js`
- `qt-builder/__tests__/tier-rates.test.js`
- `qt-builder/__tests__/tier-qt-factor.test.js`

**Edit**
- `qt-builder/derive-tier-ladder.js` (structural-order fix)
- `qt-builder/__tests__/derive-tier-ladder.test.js` (add toggle-stability case)
- `components/authoring/QTBuilder.jsx` (wire `useTaskDrafts`, merge task drafts,
  expandable rate rows, QT-multiplier row, `busy` state)

**Test coverage (TDD, vitest)**
- `tier-rates`: merge; `effectiveTierRates` seed math (`baseRate/FAC_QT`),
  editable=false for fixed/rates[]/rates_by_coat; `setTierRate` writes full firing
  map + `qt:false`, preserves other eligibility keys, immutability, no-op identity.
- `tier-qt-factor`: `deriveTierQtFactors` value/isOverride per tier (override and
  default), null for unserved; `setQtFactor` nested-immutable write; `clearQtFactor`
  prune; per-tier-file routing (override lands on the right scenario).
- `derive-tier-ladder`: toggling a baseline task off keeps its row position.
- All existing 208 tests stay green.

## 7. Verification

- `npx vite build` (≈246 modules, clean).
- Live at `localhost:5173`/`5183`, admin mode
  (`localStorage.setItem('paintscope.admin','1')`), McLeod test project:
  1. Expand a Cabinets/Drywall task → confirm seed = today's effective rate →
     bump QT5 → estimate moves, draft banner shows live.
  2. Set a FAC_QT override (e.g. QT5 ×1.8) → estimate scales for qt-eligible
     tasks; the per-tier-rate task is unaffected (qt off).
  3. Toggle a baseline task off → row holds position.
  4. During a save, steppers/inputs dim and reject input.
- Parity check: an all-baseline ladder (no edits) yields byte-identical estimates
  vs pre-change.

## 8. Edge cases & invariants

- **Absent firing tier in `rates_by_tier` ⇒ skip.** `setTierRate` always writes
  the full firing map, so opt-in never silently drops a tier.
- **qt-off is task-scoped.** Task-level `modifier_eligibility.qt:false` overrides
  only QT for that task; module height/texture/complexity still apply (shallow
  merge, task wins).
- **Reset = drop draft**, restoring canonical exactly (flat-rate or pre-existing
  `rates_by_tier`).
- **FAC_QT override does not affect per-tier-rate tasks** (their qt is off) — by
  design; the multiplier row governs the remaining qt-eligible tasks.
- **Composability**: coats, QT-factor, and (separately) rate edits on the same
  scenario/task compose because each compile reads the current merged artifact.
- **Pre-production**: no migration plumbing; drafts publish via the existing
  Drafts tab.

## 9. Out of scope (future)

- Non-QT modifier overrides (height/texture/complexity/condition) — deferred.
- Per-tier materials (`material_systems_by_tier`) — Phase 2e.
- Per-tier rate editing for `rates[]` / `rates_by_coat` / `fixed_minutes` shapes.
- Bulk "apply this per-tier rate across all scenarios referencing the task."

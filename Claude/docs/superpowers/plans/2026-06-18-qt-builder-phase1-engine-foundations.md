# QT Builder — Phase 1: Engine Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the scenario engine two new per-scenario fields — `coat_counts_by_tier` (per-tier coat counts that also drive interstage rounds) and `modifier_overrides` (scenario-scoped modifier-value overrides) — so the Quality Tier Builder UI (a later phase) has an engine that honors structure-driven tiers.

**Architecture:** Both changes are additive and localized to `engine/run-estimate-scenario.js`. Per-tier coats: after the scenario is matched, overlay the active tier's coat counts onto a shallow copy of `ctx` before module expansion — because the existing `dynamic_coats` expansion and the `coat_lt_ctx` interstage gate both read `ctx[<coatField>]`, this single overlay makes both coats and interstage rounds (coats − 1) vary per tier. Modifier overrides: a small `resolveFactor()` wrapper consults the scenario's override map before the global `getFactor()`, threaded through `computeScenarioModifierStack`.

**Tech Stack:** Plain JS (no TypeScript), React app, Vitest for tests. Engine modules under `tools/paintscope/src/engine/`.

## Global Constraints

- **Pre-production:** no migration plumbing or backward-compat aliases needed; new scenario fields are optional and absent fields preserve current behavior.
- **No TypeScript** — plain `.js`/`.jsx` only.
- **Tests:** Vitest. Run from `Claude/tools/paintscope/`. Engine tests live in `src/engine/__tests__/`.
- **Branch:** all work on `feature/qt-builder` (already created off `main`).
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Precedence rule (modifier resolution):** task-level `fac_qt_override` > scenario-level `modifier_overrides` > global `FAC_*.factors`. Verbatim from spec §8.4.
- **Coat-field invariant:** `coat_counts_by_tier[tier]` keys are the same ctx coat-field names the scenario's `dynamic_coats` references (e.g. `finish_coats`, `stain_coats`). A tier missing from the map leaves `ctx` unchanged for that tier.

**Scope note — this is Phase 1 of the QT Builder feature.** Deferred to later plans: the builder UI (navigation, tier ladder, add/remove tasks, coats steppers, per-tier rate editor, modifier-override strip, materials section); the lazy conversion of hardcoded multi-coat scenarios to the `dynamic_coats` form (spec §10.1/§18.2); the independent per-tier interstage-rounds override (spec §8.3 — the rare decouple-from-coats−1 case, which needs explicit-insertion logic best designed with its UI); and the per-tier materials resolver (spec §10.3 — needs a data-flow trace through `material-estimates.js`). Tasks already supported with **zero** engine change (tier-gated tasks via `applies_when.quality_tier`, per-tier rates via `rates_by_tier`) are intentionally not touched here.

---

### Task 1: Per-tier coat counts (`coat_counts_by_tier`) drive coats + interstage rounds

**Files:**
- Modify: `tools/paintscope/src/engine/run-estimate-scenario.js` (inside `runScenarioEstimate`, after the no-scenario guard at line 726, before `resolveScenarioModifiers` at line 731)
- Test: `tools/paintscope/src/engine/__tests__/qt-builder-engine.test.js` (create)

**Interfaces:**
- Consumes: `runScenarioEstimate({ scenarioBundle, ctx, roomQty, roomIndex, roomLabel })` — existing entry point. Result shape: `{ scenarioId, tasks: [{ taskId, phase, ... }], warnings, ... }`. The dynamic-coats expander (lines 754–784) reads rep count from `ctx[config.field]`; the `coat_lt_ctx` gate (line 511) reads the same field.
- Produces: the engine honors a new optional scenario field `coat_counts_by_tier: { [tier: string]: { [coatField: string]: number } }`. When present, the active tier's entry is overlaid onto a copy of `ctx` before module expansion, so apply-module repetition and interstage interleaving both reflect the per-tier count.

- [ ] **Step 1: Write the failing test**

Create `tools/paintscope/src/engine/__tests__/qt-builder-engine.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { runScenarioEstimate } from '../run-estimate-scenario.js';

// Synthetic bundle: one apply module repeated via dynamic_coats with an
// interstage module interleaved between coats. coat_counts_by_tier sets the
// per-tier coat count via the ctx field `finish_coats`.
function makeCoatBundle() {
  return {
    modules: {
      MOD_APPLY: { module_id: 'MOD_APPLY', phase: 'finish', tasks: [{ task_ref: 'TSK_APPLY' }], modifier_eligibility: {} },
      MOD_INTER: { module_id: 'MOD_INTER', phase: 'interstage', tasks: [{ task_ref: 'TSK_INTER' }], modifier_eligibility: {} },
    },
    scenarios: [{
      scenario_id: 'SCN_COAT',
      matches: { paintable_item: 'test' },
      modules: ['MOD_APPLY'],
      dynamic_coats: { MOD_APPLY: { field: 'finish_coats', interstage: 'MOD_INTER' } },
      coat_counts_by_tier: { QT3: { finish_coats: 2 }, QT5: { finish_coats: 3 } },
    }],
    modifiers: {},
    tasks: {
      TSK_APPLY: { task_id: 'TSK_APPLY', name: 'Apply', ps_key: 'PS_TEST.X', uom: 'SF', skill_level: 'experienced', rate_per_hour: 100 },
      TSK_INTER: { task_id: 'TSK_INTER', name: 'Interstage', ps_key: 'PS_TEST.X', uom: 'SF', skill_level: 'experienced', rate_per_hour: 200 },
    },
  };
}

function ctxFor(tier) {
  return {
    paintable_item: 'test', quality_tier: tier, application_method: 'brush',
    substrate_state: null, complexity: 'STD', height_band: 'STD', surface_texture: 'smooth',
    pass_group_id: null, pass_group_substrates: null, pass_type: null,
  };
}

function counts(result) {
  return {
    apply: result.tasks.filter(t => t.taskId === 'TSK_APPLY').length,
    inter: result.tasks.filter(t => t.taskId === 'TSK_INTER').length,
  };
}

describe('coat_counts_by_tier', () => {
  const roomQty = () => new Map([['PS_TEST.X', { value: 100, uom: 'SF' }]]);

  it('QT3 → 2 coats and 1 interstage round', () => {
    const r = runScenarioEstimate({ scenarioBundle: makeCoatBundle(), ctx: ctxFor('QT3'), roomQty: roomQty(), roomIndex: 0, roomLabel: 'R1' });
    expect(counts(r)).toEqual({ apply: 2, inter: 1 });
  });

  it('QT5 → 3 coats and 2 interstage rounds (one knob drives both)', () => {
    const r = runScenarioEstimate({ scenarioBundle: makeCoatBundle(), ctx: ctxFor('QT5'), roomQty: roomQty(), roomIndex: 0, roomLabel: 'R1' });
    expect(counts(r)).toEqual({ apply: 3, inter: 2 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `Claude/tools/paintscope/`): `npx vitest run src/engine/__tests__/qt-builder-engine.test.js`
Expected: FAIL — both cases get `{ apply: 0, inter: 0 }`, because `ctx.finish_coats` is undefined (nothing reads `coat_counts_by_tier` yet) so the dynamic-coats expander produces 0 reps.

- [ ] **Step 3: Write the minimal implementation**

In `tools/paintscope/src/engine/run-estimate-scenario.js`, immediately after the no-scenario guard (the `if (!scenario) { ... return ... }` block ending at line 726) and before the `const scenarioModifiers = resolveScenarioModifiers(...)` line (731), insert:

```javascript
  // Per-tier coat counts: when the scenario declares coat_counts_by_tier,
  // overlay the active tier's coat-field values onto a COPY of ctx (never the
  // caller's object — avoids leakage across scenarios in a chain). The
  // dynamic_coats expander (below) and the coat_lt_ctx interstage gate both
  // read ctx[<coatField>], so this single overlay makes coats AND interstage
  // rounds (coats - 1) vary per tier from one scenario. Fields use the same
  // names the scenario's dynamic_coats references (e.g. finish_coats).
  if (scenario.coat_counts_by_tier) {
    const tierCoats = scenario.coat_counts_by_tier[ctx.quality_tier];
    if (tierCoats && typeof tierCoats === 'object') {
      const overrides = {};
      for (const [field, n] of Object.entries(tierCoats)) {
        if (typeof n === 'number' && Number.isFinite(n) && n >= 0) overrides[field] = n;
      }
      if (Object.keys(overrides).length > 0) ctx = { ...ctx, ...overrides };
    }
  }
```

(Reassigning the `ctx` parameter to a shallow copy is intentional: all downstream reads in this function see the per-tier values; the caller's `ctx` is untouched.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/qt-builder-engine.test.js`
Expected: PASS — QT3 `{ apply: 2, inter: 1 }`, QT5 `{ apply: 3, inter: 2 }`.

- [ ] **Step 5: Run the full engine suite to confirm no regression**

Run: `npx vitest run src/engine`
Expected: PASS — all existing engine tests still green (the new field is opt-in; absent `coat_counts_by_tier` changes nothing).

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/engine/run-estimate-scenario.js tools/paintscope/src/engine/__tests__/qt-builder-engine.test.js
git commit -m "feat(engine): per-tier coat counts (coat_counts_by_tier) drive coats + interstage

A scenario may declare coat_counts_by_tier; the active tier's coat-field
values overlay a copy of ctx before module expansion, so dynamic_coats
repetition and the coat_lt_ctx interstage gate both vary per tier. Opt-in:
absent field preserves current behavior.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Scenario-scoped modifier overrides (`modifier_overrides`)

**Files:**
- Modify: `tools/paintscope/src/engine/run-estimate-scenario.js` (add `resolveFactor` helper above `computeScenarioModifierStack` at line 310; extend that function's signature and its factor lookups; thread `scenario.modifier_overrides` at the two call sites, lines 800 and 821)
- Test: `tools/paintscope/src/engine/__tests__/qt-builder-engine.test.js` (append a describe block)

**Interfaces:**
- Consumes: `computeScenarioModifierStack(module, ctx, scenarioModifiers = null, bundle = null, task = null)` — existing exported signature; returns `{ qt, height, texture, condition, complexity, overhead, material, total, ... }`. `getFactor(bundle, modId, ctxValue)` from `modifier-registry.js`.
- Produces: a 6th parameter `modifierOverrides = null` on `computeScenarioModifierStack`; a new optional scenario field `modifier_overrides: { [modId: string]: { [ctxValue: string]: number } }`. A `resolveFactor(bundle, modId, ctxValue, modifierOverrides)` helper that returns the override when present (numeric) else `getFactor(...)`. Precedence: task `fac_qt_override` > scenario `modifier_overrides` > global.

- [ ] **Step 1: Write the failing test**

Append to `tools/paintscope/src/engine/__tests__/qt-builder-engine.test.js`:

```javascript
import { computeScenarioModifierStack } from '../run-estimate-scenario.js';

describe('scenario-scoped modifier_overrides', () => {
  const bundle = { modifiers: { FAC_QT: { factors: { QT3: 1.0, QT5: 1.5 }, default: 'QT3' } } };
  const moduleEl = { modifier_eligibility: { qt: true } };
  const ctx = { quality_tier: 'QT5', height_band: 'STD', surface_texture: 'smooth', complexity: 'STD', substrate_condition: 'fair' };

  it('uses the global FAC_QT factor when no override is given', () => {
    const stack = computeScenarioModifierStack(moduleEl, ctx, null, bundle);
    expect(stack.qt).toBe(1.5);
  });

  it('uses the scenario override over the global factor', () => {
    const stack = computeScenarioModifierStack(moduleEl, ctx, null, bundle, null, { FAC_QT: { QT5: 1.8 } });
    expect(stack.qt).toBe(1.8);
  });

  it('task fac_qt_override still wins over the scenario override (precedence)', () => {
    const task = { fac_qt_override: { QT5: 2.0 } };
    const stack = computeScenarioModifierStack(moduleEl, ctx, null, bundle, task, { FAC_QT: { QT5: 1.8 } });
    expect(stack.qt).toBe(2.0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/qt-builder-engine.test.js`
Expected: FAIL — the override case returns `1.5` (6th arg ignored; `modifier_overrides` not consulted). The first and third cases already pass.

- [ ] **Step 3: Add the `resolveFactor` helper**

In `tools/paintscope/src/engine/run-estimate-scenario.js`, directly above `export function computeScenarioModifierStack` (line 310), insert:

```javascript
/**
 * Factor lookup with scenario-scoped override. If modifierOverrides[modId]
 * defines a numeric value for ctxValue, it wins over the global FAC_* table.
 * Lets the Quality Tier Builder bump e.g. FAC_QT's QT5 multiplier for a single
 * substrate scenario without editing the global modifier.
 */
function resolveFactor(bundle, modId, ctxValue, modifierOverrides) {
  if (modifierOverrides && modifierOverrides[modId]) {
    const ov = modifierOverrides[modId][ctxValue];
    if (typeof ov === 'number') return ov;
  }
  return getFactor(bundle, modId, ctxValue);
}
```

- [ ] **Step 4: Extend the signature and route factor lookups through `resolveFactor`**

Change the signature (line 310) from:

```javascript
export function computeScenarioModifierStack(module, ctx, scenarioModifiers = null, bundle = null, task = null) {
```
to:
```javascript
export function computeScenarioModifierStack(module, ctx, scenarioModifiers = null, bundle = null, task = null, modifierOverrides = null) {
```

Then replace the QT resolution block (the `else` branch at line 329) and the five subsequent factor lookups so each `getFactor(bundle, …)` becomes `resolveFactor(bundle, …, modifierOverrides)`. The resulting block (lines ~319–372) reads:

```javascript
  let qt;
  if (eligibility.qt === false) {
    qt = 1.0;
  } else {
    const taskOverride = task && task.fac_qt_override
      ? task.fac_qt_override[ctx.quality_tier]
      : undefined;
    if (typeof taskOverride === 'number') {
      qt = taskOverride;
    } else {
      qt = bundle ? resolveFactor(bundle, 'FAC_QT', ctx.quality_tier, modifierOverrides) : (QT_MODIFIERS[ctx.quality_tier] ?? 1.0);
    }
  }

  const hasExtAccess = scenarioModifiers && scenarioModifiers.FAC_EXT_ACCESS != null;
  const height = eligibility.height !== false
    ? (hasExtAccess ? 1.0 : (bundle ? resolveFactor(bundle, 'FAC_HEIGHT', ctx.height_band || 'STD', modifierOverrides) : (HEIGHT_MODIFIERS[ctx.height_band || 'STD'] ?? 1.0)))
    : 1.0;

  const texture = eligibility.texture === true
    ? (bundle ? resolveFactor(bundle, 'FAC_TEXTURE', ctx.surface_texture || 'smooth', modifierOverrides) : (TEXTURE_MODIFIERS[ctx.surface_texture || 'smooth'] ?? 1.0))
    : 1.0;

  const complexity = eligibility.complexity !== false
    ? (bundle ? resolveFactor(bundle, 'FAC_COMPLEXITY', (ctx.complexity || 'STD').toUpperCase(), modifierOverrides) : (COMPLEXITY_MODIFIERS[(ctx.complexity || 'STD').toUpperCase()] ?? 1.0))
    : 1.0;

  const condition = eligibility.condition !== false
    ? (bundle ? resolveFactor(bundle, 'FAC_CONDITION', ctx.substrate_condition || 'fair', modifierOverrides) : (CONDITION_MODIFIERS[ctx.substrate_condition || 'fair'] ?? 1.0))
    : 1.0;

  const surface_orientation = deriveSurfaceOrientation(task, eligibility);
  const overhead = eligibility.overhead === true
    ? (bundle ? resolveFactor(bundle, 'TRADE_OVERHEAD', surface_orientation, modifierOverrides) : (surface_orientation === 'CEILING' ? 1.25 : 1.0))
    : 1.0;

  const material_type = deriveMaterialType(eligibility, ctx, task);
  const material = eligibility.material === true
    ? (bundle ? resolveFactor(bundle, 'TRADE_MATERIAL', material_type, modifierOverrides) : (material_type === 'WB_PRIMER' ? 1.25 : material_type === 'OB_PRIMER' ? 1.47 : material_type === 'OB_FINISH' ? 1.176 : 1.0))
    : 1.0;
```

(Only the `getFactor(bundle, …)` calls changed to `resolveFactor(bundle, …, modifierOverrides)`; comments and the rest of the function are unchanged.)

- [ ] **Step 5: Thread `scenario.modifier_overrides` at the two call sites**

In `runScenarioEstimate`'s module-walk loop, line 800, change:
```javascript
    const modStack = computeScenarioModifierStack(mod, ctx, scenarioModifiers, scenarioBundle);
```
to:
```javascript
    const modStack = computeScenarioModifierStack(mod, ctx, scenarioModifiers, scenarioBundle, null, scenario.modifier_overrides);
```

And line 821, change:
```javascript
        ? computeScenarioModifierStack(mod, ctx, scenarioModifiers, scenarioBundle, task)
```
to:
```javascript
        ? computeScenarioModifierStack(mod, ctx, scenarioModifiers, scenarioBundle, task, scenario.modifier_overrides)
```

(`scenario` is the matched scenario in scope from line 722; `scenario.modifier_overrides` is `undefined` when unset, which `resolveFactor` treats as no override.)

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/qt-builder-engine.test.js`
Expected: PASS — all three modifier-override cases green (global 1.5, override 1.8, task-precedence 2.0), plus Task 1's coat cases.

- [ ] **Step 7: Run the full engine suite to confirm no regression**

Run: `npx vitest run src/engine`
Expected: PASS — overrides are opt-in; `resolveFactor` with no overrides is identical to `getFactor`.

- [ ] **Step 8: Commit**

```bash
git add tools/paintscope/src/engine/run-estimate-scenario.js tools/paintscope/src/engine/__tests__/qt-builder-engine.test.js
git commit -m "feat(engine): scenario-scoped modifier_overrides

computeScenarioModifierStack gains a modifierOverrides arg; a resolveFactor
wrapper consults scenario.modifier_overrides[modId][ctxValue] before the
global FAC_* table. Precedence: task fac_qt_override > scenario override >
global. Threaded from runScenarioEstimate via scenario.modifier_overrides.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Phase 1 scope):**
- Per-tier coats (spec §8.3, §10.1) → Task 1. ✓
- Interstage rounds = coats − 1, auto (spec §6 decision, §14) → Task 1 (falls out of the coat overlay; proven by the `inter` count assertions). ✓
- Scenario-scoped modifier overrides (spec §8.4, §10.2) → Task 2, with precedence task > scenario > global. ✓
- Tier-gated tasks / per-tier rates → no engine change needed (spec §8.1/§8.2); correctly out of scope. ✓
- Independent interstage-rounds override, hardcoded-scenario conversion, materials resolver, all UI → explicitly deferred in the Scope note. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — every step shows complete code and exact run commands. ✓

**Type/name consistency:** `coat_counts_by_tier`, `modifier_overrides`, `resolveFactor`, `modifierOverrides`, and result field `taskId` are used identically in the implementation and tests. `computeScenarioModifierStack`'s 6-arg signature matches every call site and the Task 2 tests. ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-qt-builder-phase1-engine-foundations.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.

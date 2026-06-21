# QT Builder Phase 2 — Per-tier Rates as Modifiers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the QT Builder express a tier's rate difference as a single scenario-level `FAC_QT` time-multiplier on that tier's forked scenario, edited from a "QT time multiplier" row in the vantage grid.

**Architecture:** Pure authoring-tool code, zero engine changes. Two new copy-on-write scenario ops (`tier-files.js`), two new fork-on-edit plan functions (`vantage-edits.js`), a `multiplierRow` view-model field (`derive-vantage.js`), and one grid row (`QTBuilder.jsx`). Edits autosave as scenario drafts via the existing `useScenarioDrafts` overlay. The engine already reads `scenario.modifier_overrides.FAC_QT[tier]` over the global table (`resolveFactor`, run-estimate-scenario.js:316/343); a new end-to-end test locks that contract.

**Tech Stack:** React 19 + Vite 7, plain JS (no TypeScript), Vitest. Pure functions tested in isolation; the JSX row verified by build + live-verify.

## Global Constraints

_Every task implicitly includes these (verbatim from the spec):_

- **Branch:** `feature/qt-builder-rebuild`. Do NOT merge or push to origin without asking.
- **Edit in the MAIN checkout** at `C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope/` — ignore CLAUDE.md's elastic-galileo worktree rule.
- **QT3 stays byte-identical:** QT3 is the locked `×1.00` anchor; the anchor is NEVER written. No code path may write `FAC_QT.QT3`.
- **Zero engine changes** (only a test is added to `engine/__tests__/`). **Zero committed scenario/module JSON changes** — the feature writes IndexedDB drafts only; the committed `scenario-bundle.gen.js` is untouched, so estimates stay byte-identical until a user publishes a draft.
- **Never write** `applies_when.quality_tier` or `rates_by_tier` — both retired by the file-naming pivot.
- **Tiers:** `QT2, QT3, QT4, QT5` (`QT_BUCKETS`). QT3 is the anchor; QT2/QT4/QT5 are editable.
- **TDD, frequent commits.** All work runs from `C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope`. The existing **268** tests must stay green; `npx vite build` must stay clean (0 errors).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/components/authoring/qt-builder/tier-files.js` | Pure copy-on-write authoring ops for the tier-file model | **Add** `setScenarioQtFactor`, `clearScenarioQtFactor` |
| `src/components/authoring/qt-builder/vantage-edits.js` | Fork-on-edit plan orchestration (returns draft payloads) | **Add** `planSetQtFactor`, `planClearQtFactor` |
| `src/components/authoring/qt-builder/derive-vantage.js` | Pure vantage-grid view-model | **Add** `multiplierRow` to the returned vm |
| `src/components/authoring/QTBuilder.jsx` | The builder component | **Add** the "QT time multiplier" grid row |
| `src/engine/__tests__/qt-builder-engine.test.js` | Engine contract tests | **Add** an end-to-end forked-scenario override case |
| `…/qt-builder/__tests__/{tier-files,vantage-edits,derive-vantage}.test.js` | Unit tests | **Add** cases for the new functions |

**Task order (dependencies):** Task 1 (ops) → Task 2 (plans, uses Task 1) → Task 3 (view-model, independent) → Task 4 (engine contract, independent) → Task 5 (UI, uses Tasks 1–3).

---

### Task 1: Pure scenario ops — `setScenarioQtFactor` / `clearScenarioQtFactor`

**Files:**
- Modify: `src/components/authoring/qt-builder/tier-files.js` (append two exports)
- Test: `src/components/authoring/qt-builder/__tests__/tier-files.test.js` (append a describe block)

**Interfaces:**
- Produces:
  - `setScenarioQtFactor(scenario, tier, value) → scenario` — immutable; sets `modifier_overrides.FAC_QT[tier] = value`, creating nested objects via spreads; returns the same ref when the value is already equal.
  - `clearScenarioQtFactor(scenario, tier) → scenario` — immutable; removes `modifier_overrides.FAC_QT[tier]`, prunes an emptied `FAC_QT` and an emptied `modifier_overrides`; returns the same ref when the key was absent.

- [ ] **Step 1: Write the failing tests** — append to `__tests__/tier-files.test.js`:

```js
import { setScenarioQtFactor, clearScenarioQtFactor } from '../tier-files.js';

describe('setScenarioQtFactor', () => {
  it('writes a nested FAC_QT override immutably, source untouched', () => {
    const scn = { scenario_id: 'SCN_B_QT5', matches: { quality_tier: 'QT5' }, modules: ['A'] };
    const out = setScenarioQtFactor(scn, 'QT5', 1.8);
    expect(out.modifier_overrides).toEqual({ FAC_QT: { QT5: 1.8 } });
    expect(out).not.toBe(scn);
    expect(scn.modifier_overrides).toBeUndefined();        // source pristine
  });
  it('preserves other modifier_overrides and other FAC_QT tiers', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_HEIGHT: { STEP: 1.2 }, FAC_QT: { QT4: 1.3 } } };
    const out = setScenarioQtFactor(scn, 'QT5', 1.8);
    expect(out.modifier_overrides).toEqual({ FAC_HEIGHT: { STEP: 1.2 }, FAC_QT: { QT4: 1.3, QT5: 1.8 } });
  });
  it('is a no-op (same ref) when the value is already set', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_QT: { QT5: 1.8 } } };
    expect(setScenarioQtFactor(scn, 'QT5', 1.8)).toBe(scn);
  });
});

describe('clearScenarioQtFactor', () => {
  it('removes the tier key and prunes emptied FAC_QT + modifier_overrides', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_QT: { QT5: 1.8 } } };
    const out = clearScenarioQtFactor(scn, 'QT5');
    expect(out.modifier_overrides).toBeUndefined();
    expect(scn.modifier_overrides).toEqual({ FAC_QT: { QT5: 1.8 } });   // source pristine
  });
  it('keeps sibling FAC_QT tiers and sibling modifiers', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_HEIGHT: { STEP: 1.2 }, FAC_QT: { QT4: 1.3, QT5: 1.8 } } };
    const out = clearScenarioQtFactor(scn, 'QT5');
    expect(out.modifier_overrides).toEqual({ FAC_HEIGHT: { STEP: 1.2 }, FAC_QT: { QT4: 1.3 } });
  });
  it('is a no-op (same ref) when the tier key is absent', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_QT: { QT4: 1.3 } } };
    expect(clearScenarioQtFactor(scn, 'QT5')).toBe(scn);
    expect(clearScenarioQtFactor({ scenario_id: 'S' }, 'QT5')).toEqual({ scenario_id: 'S' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: FAIL — `setScenarioQtFactor is not a function` (import is undefined).

- [ ] **Step 3: Implement** — append to `src/components/authoring/qt-builder/tier-files.js`:

```js
// Set scenario.modifier_overrides.FAC_QT[tier] = value (immutable, nested
// create). The per-tier QT time multiplier lives on the tier's own (forked)
// scenario; the engine's resolveFactor reads it over the global FAC_QT table.
// Same ref on a true no-op. NEVER called for the QT3 anchor (caller-gated).
export function setScenarioQtFactor(scenario, tier, value) {
  const cur = scenario && scenario.modifier_overrides && scenario.modifier_overrides.FAC_QT
    ? scenario.modifier_overrides.FAC_QT[tier] : undefined;
  if (cur === value) return scenario;
  const modifier_overrides = { ...(scenario.modifier_overrides || {}) };
  modifier_overrides.FAC_QT = { ...(modifier_overrides.FAC_QT || {}), [tier]: value };
  return { ...scenario, modifier_overrides };
}

// Remove scenario.modifier_overrides.FAC_QT[tier]; prune an emptied FAC_QT and
// an emptied modifier_overrides. Same ref when the key was absent.
export function clearScenarioQtFactor(scenario, tier) {
  const facqt = scenario && scenario.modifier_overrides && scenario.modifier_overrides.FAC_QT;
  if (!facqt || !(tier in facqt)) return scenario;
  const nextFacqt = { ...facqt };
  delete nextFacqt[tier];
  const modifier_overrides = { ...scenario.modifier_overrides };
  if (Object.keys(nextFacqt).length === 0) delete modifier_overrides.FAC_QT;
  else modifier_overrides.FAC_QT = nextFacqt;
  const next = { ...scenario };
  if (Object.keys(modifier_overrides).length === 0) delete next.modifier_overrides;
  else next.modifier_overrides = modifier_overrides;
  return next;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: PASS (all tier-files cases green).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npx vitest run`
Expected: PASS — 268 prior + 6 new = **274**.

- [ ] **Step 6: Commit**

```bash
git add src/components/authoring/qt-builder/tier-files.js src/components/authoring/qt-builder/__tests__/tier-files.test.js
git commit -m "feat(qt-builder): set/clearScenarioQtFactor pure ops (Phase 2 Task 1)"
```

---

### Task 2: Fork-on-edit plans — `planSetQtFactor` / `planClearQtFactor`

**Files:**
- Modify: `src/components/authoring/qt-builder/vantage-edits.js`
- Test: `src/components/authoring/qt-builder/__tests__/vantage-edits.test.js` (append a describe block)

**Interfaces:**
- Consumes: `setScenarioQtFactor`, `clearScenarioQtFactor` (Task 1); existing module-local `ensureScenarioForTier`, `resolveTierScenario`, `baseId`; imported `scenarioTierPin`.
- Produces:
  - `planSetQtFactor(bundle, sel, tier, value) → { scenario } | {}` — `{}` for the QT3 anchor or `value ≤ 0` / non-finite; else forks the tier's baseline scenario (if needed) and returns the fork carrying `FAC_QT[tier] = value`.
  - `planClearQtFactor(bundle, sel, tier) → { scenario } | { deleteScenarioId, deleteModuleIds } | {}` — `{}` when the tier is baseline-served; returns `{ deleteScenarioId, deleteModuleIds: [] }` when clearing leaves the fork equal to its baseline (auto-reclaim); else `{ scenario }` (override removed, structure kept).

- [ ] **Step 1: Write the failing tests** — append to `__tests__/vantage-edits.test.js` (the file already defines `bundle()` and `sel`):

```js
import { planSetQtFactor, planClearQtFactor } from '../vantage-edits.js';

describe('planSetQtFactor', () => {
  it('forks the baseline tier scenario and writes FAC_QT[tier]; baseline untouched', () => {
    const b = bundle();
    const { scenario } = planSetQtFactor(b, sel, 'QT5', 1.8);
    expect(scenario.scenario_id).toBe('SCN_B_QT5');
    expect(scenario.matches.quality_tier).toBe('QT5');
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY']);       // same modules as baseline
    expect(scenario.modifier_overrides).toEqual({ FAC_QT: { QT5: 1.8 } });
    expect(b.scenarios[0].matches.quality_tier).toBeUndefined();       // baseline pristine
  });
  it('writes onto an already-forked tier without re-forking (preserves structure)', () => {
    const b = bundle();
    b.scenarios.push({ scenario_id: 'SCN_B_QT5', matches: { ...sel, quality_tier: 'QT5' }, modules: ['MOD_PREP', 'MOD_APPLY', 'MOD_GLAZE'] });
    b.modules.MOD_GLAZE = { module_id: 'MOD_GLAZE', phase: 'finish', name: 'Glaze', tasks: [] };
    const { scenario } = planSetQtFactor(b, sel, 'QT5', 1.65);
    expect(scenario.scenario_id).toBe('SCN_B_QT5');
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY', 'MOD_GLAZE']);   // structural fork kept
    expect(scenario.modifier_overrides).toEqual({ FAC_QT: { QT5: 1.65 } });
  });
  it('returns {} for the QT3 anchor and for non-positive / non-finite values', () => {
    expect(planSetQtFactor(bundle(), sel, 'QT3', 1.5)).toEqual({});
    expect(planSetQtFactor(bundle(), sel, 'QT5', 0)).toEqual({});
    expect(planSetQtFactor(bundle(), sel, 'QT5', -1)).toEqual({});
    expect(planSetQtFactor(bundle(), sel, 'QT5', NaN)).toEqual({});
  });
});

describe('planClearQtFactor', () => {
  it('auto-reclaims the baseline when the override was the fork\'s only divergence', () => {
    const b = bundle();
    b.scenarios.push({ scenario_id: 'SCN_B_QT5', matches: { ...sel, quality_tier: 'QT5' }, modules: ['MOD_PREP', 'MOD_APPLY'], modifier_overrides: { FAC_QT: { QT5: 1.8 } } });
    expect(planClearQtFactor(b, sel, 'QT5')).toEqual({ deleteScenarioId: 'SCN_B_QT5', deleteModuleIds: [] });
  });
  it('keeps a structurally-diverged fork, dropping only the override', () => {
    const b = bundle();
    b.scenarios.push({ scenario_id: 'SCN_B_QT5', matches: { ...sel, quality_tier: 'QT5' }, modules: ['MOD_PREP', 'MOD_APPLY', 'MOD_GLAZE'], modifier_overrides: { FAC_QT: { QT5: 1.8 } } });
    b.modules.MOD_GLAZE = { module_id: 'MOD_GLAZE', phase: 'finish', name: 'Glaze', tasks: [] };
    const out = planClearQtFactor(b, sel, 'QT5');
    expect(out.scenario.scenario_id).toBe('SCN_B_QT5');
    expect(out.scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY', 'MOD_GLAZE']);
    expect(out.scenario.modifier_overrides).toBeUndefined();
    expect(out.deleteScenarioId).toBeUndefined();
  });
  it('returns {} when the tier is served by the baseline (no fork to clear)', () => {
    expect(planClearQtFactor(bundle(), sel, 'QT5')).toEqual({});
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`
Expected: FAIL — `planSetQtFactor is not a function`.

- [ ] **Step 3: Implement** — in `src/components/authoring/qt-builder/vantage-edits.js`:

First extend the tier-files import (it currently imports `scenarioTierPin, forkScenarioForTier, …`). Add the two new ops:

```js
import {
  scenarioTierPin, forkScenarioForTier, forkModuleForTier,
  addTask, removeTask, addModuleToTier, removeModuleFromTier,
  setScenarioQtFactor, clearScenarioQtFactor,
} from './tier-files.js';
```

Then append at the end of the file:

```js
const ANCHOR_TIER = 'QT3';

function sameModules(a, b) {
  const x = a || [], y = b || [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

// Set the per-tier QT time multiplier on the tier's scenario (fork-on-edit).
// {} for the QT3 anchor or a non-positive / non-finite value.
export function planSetQtFactor(bundle, sel, tier, value) {
  if (tier === ANCHOR_TIER) return {};
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return {};
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  return { scenario: setScenarioQtFactor(scn, tier, value) };
}

// Clear the per-tier multiplier. No-op when the tier is baseline-served. When
// clearing removes the fork's last divergence (modules == baseline, no other
// modifier_overrides), reclaim the baseline by deleting the fork; otherwise
// keep the thinned fork (structural edits intact).
export function planClearQtFactor(bundle, sel, tier) {
  const gov = resolveTierScenario(bundle, sel, tier);
  if (!gov || scenarioTierPin(gov) !== tier) return {};
  const thinned = clearScenarioQtFactor(gov, tier);
  const baseline = (bundle.scenarios || []).find(s => s.scenario_id === baseId(gov.scenario_id));
  if (baseline && !thinned.modifier_overrides && sameModules(thinned.modules, baseline.modules)) {
    return { deleteScenarioId: gov.scenario_id, deleteModuleIds: [] };
  }
  return { scenario: thinned };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npx vitest run`
Expected: PASS — **280** (274 + 6 new).

- [ ] **Step 6: Commit**

```bash
git add src/components/authoring/qt-builder/vantage-edits.js src/components/authoring/qt-builder/__tests__/vantage-edits.test.js
git commit -m "feat(qt-builder): planSet/ClearQtFactor fork-on-edit plans (Phase 2 Task 2)"
```

---

### Task 3: View-model — `multiplierRow`

**Files:**
- Modify: `src/components/authoring/qt-builder/derive-vantage.js`
- Test: `src/components/authoring/qt-builder/__tests__/derive-vantage.test.js` (append a describe block)

**Interfaces:**
- Consumes: `getFactor(bundle, 'FAC_QT', tier)` from `engine/modifier-registry.js`.
- Produces: `deriveVantage(...)` returns an additional `multiplierRow` map: per tier `{ value, def, isOverride, isAnchor, served }`. QT3 → `{ value: 1.0, def: 1.0, isOverride: false, isAnchor: true, served }`. Others → `value = scnByTier[t].modifier_overrides?.FAC_QT?.[t] ?? getFactor(bundle,'FAC_QT',t)`, `def = getFactor(bundle,'FAC_QT',t)`, `isOverride = (override is numeric)`.

- [ ] **Step 1: Write the failing tests** — append to `__tests__/derive-vantage.test.js` (reuses the file's `bundle()` and `sel`):

```js
describe('deriveVantage multiplierRow', () => {
  it('reports the QT3 anchor and global defaults for un-overridden tiers', () => {
    const v = deriveVantage(bundle(), sel);
    expect(v.multiplierRow.QT3).toEqual({ value: 1.0, def: 1.0, isOverride: false, isAnchor: true, served: true });
    // FALLBACK FAC_QT (no modifiers in the fixture): QT2 0.80, QT4 1.30, QT5 1.50
    expect(v.multiplierRow.QT4).toEqual({ value: 1.3, def: 1.3, isOverride: false, isAnchor: false, served: true });
    expect(v.multiplierRow.QT5).toEqual({ value: 1.5, def: 1.5, isOverride: false, isAnchor: false, served: true });
  });
  it('reports an override value + flag from the fork\'s modifier_overrides', () => {
    const b = bundle();
    b.scenarios[1].modifier_overrides = { FAC_QT: { QT5: 1.8 } };   // SCN_B_QT5
    const v = deriveVantage(b, sel);
    expect(v.multiplierRow.QT5).toEqual({ value: 1.8, def: 1.5, isOverride: true, isAnchor: false, served: true });
  });
  it('marks an unserved tier served:false (default value still reported)', () => {
    const b = {
      scenarios: [{ scenario_id: 'SCN_3', matches: { ...sel, quality_tier: 'QT3' }, modules: ['MOD_A'] }],
      modules: { MOD_A: { phase: 'apply', name: 'A', tasks: [{ task_ref: 'T' }] } },
      tasks: { T: { name: 'T' } },
    };
    const v = deriveVantage(b, sel);
    expect(v.multiplierRow.QT4.served).toBe(false);
    expect(v.multiplierRow.QT4.value).toBe(1.3);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`
Expected: FAIL — `Cannot read properties of undefined (reading 'QT3')` (`multiplierRow` not yet returned).

- [ ] **Step 3: Implement** — in `src/components/authoring/qt-builder/derive-vantage.js`:

Add the import after the existing `scenarioTierPin` import (line ~10):

```js
import { getFactor } from '../../../engine/modifier-registry.js';
```

Then, immediately before the final `return { tiers, served, ... }` (line ~153), build the row (uses `tiers`, `scnByTier`, `bundle` — all in scope):

```js
  const ANCHOR_TIER = 'QT3';
  const multiplierRow = {};
  for (const t of tiers) {
    const def = getFactor(bundle, 'FAC_QT', t);
    if (t === ANCHOR_TIER) {
      multiplierRow[t] = { value: 1.0, def: 1.0, isOverride: false, isAnchor: true, served: !!scnByTier[t] };
      continue;
    }
    const scn = scnByTier[t];
    const ov = scn && scn.modifier_overrides && scn.modifier_overrides.FAC_QT
      ? scn.modifier_overrides.FAC_QT[t] : undefined;
    multiplierRow[t] = {
      value: typeof ov === 'number' ? ov : def,
      def,
      isOverride: typeof ov === 'number',
      isAnchor: false,
      served: !!scn,
    };
  }
```

Add `multiplierRow` to the returned object:

```js
  return { tiers, served, scenarioByTier, isForkByTier, isArrayTierByTier, multiplierRow, phaseGroups };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npx vitest run`
Expected: PASS — **283** (280 + 3 new).

- [ ] **Step 6: Commit**

```bash
git add src/components/authoring/qt-builder/derive-vantage.js src/components/authoring/qt-builder/__tests__/derive-vantage.test.js
git commit -m "feat(qt-builder): multiplierRow view-model (Phase 2 Task 3)"
```

---

### Task 4: Engine contract — forked-scenario override scales hours end-to-end

**Files:**
- Test: `src/engine/__tests__/qt-builder-engine.test.js` (append a describe block)

**Interfaces:**
- Consumes: `runScenarioEstimate` (already imported in the file). No engine source changes — this characterizes the existing `modifier_overrides.FAC_QT` contract through the full hours pipeline (`findMatchingScenario` selects the QT5 fork by specificity; `resolveFactor` applies the override).

- [ ] **Step 1: Write the test** — append to `src/engine/__tests__/qt-builder-engine.test.js`:

```js
describe('forked-scenario FAC_QT override (end-to-end hours)', () => {
  // Baseline (no quality_tier → serves QT3) + a QT5 fork carrying a FAC_QT
  // override. One qt-eligible apply task; height/complexity/condition/texture
  // are disabled so `total` is exactly `qt` and hours read straight off it.
  function bundle() {
    return {
      modules: {
        MOD_A: { module_id: 'MOD_A', phase: 'finish', tasks: [{ task_ref: 'TSK_A' }],
          modifier_eligibility: { qt: true, height: false, complexity: false, condition: false } },
      },
      scenarios: [
        { scenario_id: 'SCN_B', matches: { paintable_item: 'test' }, modules: ['MOD_A'] },
        { scenario_id: 'SCN_B_QT5', matches: { paintable_item: 'test', quality_tier: 'QT5' },
          modules: ['MOD_A'], modifier_overrides: { FAC_QT: { QT5: 1.8 } } },
      ],
      modifiers: { FAC_QT: { factors: { QT3: 1.0, QT5: 1.5 }, default: 'QT3' } },
      tasks: { TSK_A: { task_id: 'TSK_A', name: 'Apply', ps_key: 'PS_TEST.X', uom: 'SF', skill_level: 'experienced', rate_per_hour: 100 } },
    };
  }
  const ctx = (tier) => ({
    paintable_item: 'test', quality_tier: tier, application_method: 'brush',
    substrate_state: null, complexity: 'STD', height_band: 'STD', surface_texture: 'smooth',
    substrate_condition: 'fair', pass_group_id: null, pass_group_substrates: null, pass_type: null,
  });
  const roomQty = () => new Map([['PS_TEST.X', { value: 100, uom: 'SF' }]]);
  const hours = (r) => r.tasks.filter(t => t.taskId === 'TSK_A').reduce((s, t) => s + t.hours, 0);

  it('QT3 resolves the baseline at ×1.00 → 1.0 h (unaffected by the QT5 fork)', () => {
    const r = runScenarioEstimate({ scenarioBundle: bundle(), ctx: ctx('QT3'), roomQty: roomQty(), roomIndex: 0, roomLabel: 'R1' });
    expect(hours(r)).toBeCloseTo(1.0, 5);
  });
  it('QT5 resolves the fork and applies the ×1.8 override (not the global ×1.5) → 1.8 h', () => {
    const r = runScenarioEstimate({ scenarioBundle: bundle(), ctx: ctx('QT5'), roomQty: roomQty(), roomIndex: 0, roomLabel: 'R1' });
    expect(hours(r)).toBeCloseTo(1.8, 5);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/engine/__tests__/qt-builder-engine.test.js`
Expected: **PASS** on first run. This is a characterization/contract test — the engine already implements the override path, so these lock the behavior the UI depends on. If it FAILS, the design's zero-engine-change premise is broken — STOP and investigate before continuing.

- [ ] **Step 3: Run the full suite (no regressions)**

Run: `npx vitest run`
Expected: PASS — **285** (283 + 2 new).

- [ ] **Step 4: Commit**

```bash
git add src/engine/__tests__/qt-builder-engine.test.js
git commit -m "test(qt-builder): forked-scenario FAC_QT override end-to-end hours (Phase 2 Task 4)"
```

---

### Task 5: UI — the "QT time multiplier" grid row

**Files:**
- Modify: `src/components/authoring/QTBuilder.jsx`

**Interfaces:**
- Consumes: `planSetQtFactor`, `planClearQtFactor` (Task 2); `vm.multiplierRow` (Task 3); existing `run`, `busy`, `tierEditable`, `isServed`, `mergedBundle`, `sel`, `tiers`, and styles (`cellStyle`, `inputStyle`, `mutedGlyph`, `removeBtn`).
- Produces: a single `<tr>` at the top of `<tbody>` rendering the per-tier multiplier; QT3 locked, QT2/4/5 editable; commits on blur/Enter.

- [ ] **Step 1: Extend the vantage-edits import** — in `QTBuilder.jsx` (the block at lines ~14–17):

```jsx
import {
  planAddTask, planRemoveTask, planAddModule,
  planRemoveModule, planSetCoats, planRevertTier,
  planSetQtFactor, planClearQtFactor,
} from './qt-builder/vantage-edits.js';
```

- [ ] **Step 2: Add the commit handler** — in `QTBuilder.jsx`, next to `pickTask` / `pickModule` (after line ~110):

```jsx
  function commitMultiplier(tier, raw) {
    const m = vm?.multiplierRow?.[tier];
    if (!m) return;
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v <= 0 || v === m.value) return;   // ignore invalid / unchanged
    run(() => planSetQtFactor(mergedBundle, sel, tier, v));
  }
```

- [ ] **Step 3: Render the row** — in `QTBuilder.jsx`, inside `<tbody>`, immediately BEFORE `{vm.phaseGroups.map(group => (` (line ~184):

```jsx
              {/* QT time multiplier — scenario-level, per tier */}
              <tr style={{ borderTop: '1px solid var(--border)', background: 'rgba(130,170,255,0.05)' }}>
                <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                  <b style={{ fontSize: 11 }}>QT time multiplier</b>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 10 }}>speed vs QT3 baseline</span>
                </td>
                {tiers.map(t => {
                  const m = vm.multiplierRow[t];
                  if (!m || !m.served) return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                  if (m.isAnchor) return (
                    <td key={t} style={cellStyle}>
                      <span style={{ color: 'var(--text-muted)' }} title="QT3 is the baseline anchor (×1.00). Edit QT3 speed via the task rate, not here.">×1.00 🔒</span>
                    </td>
                  );
                  if (!tierEditable(t)) return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                  return (
                    <td key={t} style={cellStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>×</span>
                        <input
                          key={`${t}:${m.value}`}
                          type="number" step="0.05" min="0.05"
                          defaultValue={m.value}
                          disabled={busy}
                          title={m.isOverride ? `Override (global default ×${m.def})` : `Set an override (global default ×${m.def})`}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          onBlur={e => commitMultiplier(t, e.currentTarget.value)}
                          style={{ ...inputStyle, width: 54, textAlign: 'center',
                            borderColor: m.isOverride ? 'var(--accent, #82aaff)' : 'var(--border)',
                            color: m.isOverride ? 'var(--accent, #82aaff)' : 'var(--text)' }}
                        />
                        {m.isOverride && (
                          <button title={`Clear override → global ×${m.def}`} disabled={busy}
                            onClick={() => run(() => planClearQtFactor(mergedBundle, sel, t))}
                            style={removeBtn}>×</button>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
```

- [ ] **Step 4: Build to verify it compiles cleanly**

Run: `npx vite build`
Expected: `✓ built` with 0 errors (≈249 modules; the pre-existing chunk-size warning is benign).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npx vitest run`
Expected: PASS — **285** (unchanged; the row has no unit test, consistent with the rest of `QTBuilder.jsx`).

- [ ] **Step 6: Commit**

```bash
git add src/components/authoring/QTBuilder.jsx
git commit -m "feat(qt-builder): QT time multiplier grid row (Phase 2 Task 5)"
```

---

## Phase verification (after all tasks land)

Run by the main agent / user — not a task:

1. **Suite + build:** `npx vitest run` (**285**, green) and `npx vite build` (clean).
2. **Live-verify** — `npm run dev` → `localhost:5173`, `localStorage.setItem('paintscope.admin','1')`, McLeod project, Authoring → QT Builder:
   - Pick a collapsed-baseline substrate (e.g. Cabinets / Closet). The multiplier row shows QT3 `×1.00 🔒`, QT2/QT4/QT5 at global defaults (×0.80 / ×1.30 / ×1.50).
   - Set QT5 `×1.65` → QT5 header flips to "forked", draft banner appears, the QT5 estimate rises (qt-eligible tasks only); QT3 unchanged.
   - Clear the QT5 override (×) on an otherwise-unforked tier → fork reclaimed, value returns to ×1.50, banner clears.
   - On a QT5 that also has a structural edit: clearing the multiplier keeps the structural fork; the header "revert" removes everything.
   - 0 console errors.
3. **Parity:** a no-edit estimate run is byte-identical to pre-change for all tiers (trivially — no committed data files changed).

Do NOT merge or push without asking.

---

## Self-Review

**1. Spec coverage:**
- §4 model (FAC_QT on forked scenario, QT3 anchor, default-from-global) → Tasks 1–3, 5. ✓
- §5 engine zero-change + no double-count → Task 4 (contract test); no engine source touched. ✓
- §6 safety (no data-file changes; byte-identical until publish) → Global Constraints + Phase verification §3. ✓
- §7.1 ops → Task 1. §7.2 plans incl. auto-reclaim → Task 2. §7.3 multiplierRow → Task 3. §7.4 UX row → Task 5. ✓
- §9 verification (unit, engine, build, live, parity) → per-task Steps + Phase verification. ✓
- §10 invariants (anchor inviolable, value≤0 rejected, thin-fork neutral, array read-only, composability, publish-required) → covered by Task 2 guards + tests and Task 5 `tierEditable` gating. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows complete code. ✓

**3. Type consistency:** `setScenarioQtFactor`/`clearScenarioQtFactor` (Task 1) are imported and called identically in Task 2. `planSetQtFactor`/`planClearQtFactor` (Task 2) are imported and called identically in Task 5. `multiplierRow` cell shape `{ value, def, isOverride, isAnchor, served }` (Task 3) matches the fields read in Task 5 (`m.value`, `m.def`, `m.isOverride`, `m.isAnchor`, `m.served`). Test counts chain 268 → 274 → 280 → 283 → 285. ✓

# QT Builder Stain Authoring (P2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the QT Builder to surface and author the decomposed per-phase stain scenarios (stain / sealer / clear) — per-tier coats, method-filtered tasks, and per-tier materials — the same way it authors paint.

**Architecture:** Pure QT Builder tool code. A new **Phase** finder control resolves one decomposed stain scenario per tier (matched on `coating_phase`); the existing Method + From-state controls are reused and re-wired to stain's `application_method_stain`/`_clear` task gates and the state chain. The coat stepper writes the scenario's `coat_counts[field]` scalar (the Phase-1 engine already reads it); the Materials grid offers a canonical-by-role menu. No engine, scenario-JSON, or materials-data changes — paint stays byte-identical.

**Tech Stack:** React 19 (no TS), Vite 7, vitest. Pure ES modules under `tools/paintscope/src/components/authoring/qt-builder/` + `QTBuilder.jsx`.

## Global Constraints

- Edit in the **MAIN checkout** (`C:\Eric_AI_Playground\Claude Code Uni\Claude`). Ignore `tools/paintscope/CLAUDE.md`'s worktree rule.
- Branch **`feature/qt-builder-stain`** (already created off `feature/stain-decomposition` @ `7cf11b6e`). **Do NOT merge/push without asking.**
- **Estimates must stay byte-identical.** All changes are tool-only (QT Builder authoring UI — NOT imported by the engine estimate path), so the canonical-bundle estimate is provably unaffected until a user *publishes* a draft. **Primary gate = file-scope:** `git diff --name-only feature/stain-decomposition..HEAD` must list ONLY `tools/paintscope/src/components/authoring/QTBuilder.jsx`, `…/qt-builder/*`, their `__tests__`, and `docs/`. No `engine/`, `scenarios/`, `modules/`, or `data/scenario-*.js`. **Belt-and-suspenders snapshot:** `parity-estimate.mjs` (see Task 7) on a fixed project state, before vs after = identical. (The `.superpowers/sdd/parity/parity-main.json` baseline is gitignored and absent in this tree — capture a before-snapshot at execution start instead.)
- All work runs from `tools/paintscope/`: `npx vitest run` (baseline **622** must stay green + new tests), `npx vite build` (clean), live-verify at localhost:5173.
- **No engine / scenario-JSON / materials-data changes.** Only `QTBuilder.jsx` + `qt-builder/*` + their `__tests__`.
- Convention: plain JSX/JS, custom CSS vars, vitest `describe/it/expect`, synthetic-bundle test fixtures (see existing `qt-builder/__tests__/*`).
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File map

| File | Responsibility | Change |
|---|---|---|
| `qt-builder/derive-tier-ladder.js` | finder dimensions | + `listStainPhases`, `stainPhaseInfo` (phases, per-phase default state + methods) |
| `qt-builder/derive-vantage.js` | grid view-model | ctx-spread; `GATE_KEYS` += stain/clear method keys; coat-scalar cells (`coatField`, count from `coat_counts`) |
| `qt-builder/tier-files.js` | pure tier ops | + `setScenarioCoatCount` |
| `qt-builder/vantage-edits.js` | edit orchestration | ctx-spread in `resolveTierScenario`; + `planSetStainCoats` |
| `qt-builder/derive-materials.js` | materials view-model | ctx-spread; decomposed-phase single-role + canonical-by-role menu |
| `QTBuilder.jsx` | component | Phase control, stain `sel`, guard, coat-stepper routing, method/state reuse |

Tasks 1–5 are pure modules (full TDD). Task 6 is the React integration (build + live-verify). Tasks 7–9 are gates/verification.

---

### Task 1: Stain finder dimensions

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`

**Interfaces:**
- Produces: `listStainPhases(bundle, paintable_item) -> string[]` (subset of `['stain','sealer','clear']`, chain order). `stainPhaseInfo(bundle, paintable_item, phase) -> { defaultState: string, methods: string[], methodKey: string }`.

- [ ] **Step 1: Write the failing test** — append to `derive-tier-ladder.test.js`:

```js
import { listStainPhases, stainPhaseInfo } from '../derive-tier-ladder.js';

// Decomposed stain family fixture (door_casing shape): 3 phases, state chain,
// apply modules carry method-variant tasks gated on the stain/clear method key.
function stainBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_DC_STAIN', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_BARE'], coating_phase: 'stain' },
        modules: ['MOD_PREP', 'MOD_APPLY_STAIN'],
        dynamic_coats: { MOD_APPLY_STAIN: { field: 'stain_coats', interstage: 'MOD_IS' } } },
      { scenario_id: 'SCN_DC_SEALER', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_STAINED'], coating_phase: 'sealer' },
        modules: ['MOD_APPLY_SEALER'],
        dynamic_coats: { MOD_APPLY_SEALER: { field: 'sealer_coats', interstage: 'MOD_IS' } } },
      { scenario_id: 'SCN_DC_SEALER_BARE', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_BARE'], coating_phase: 'sealer' },
        modules: ['MOD_APPLY_SEALER'],
        dynamic_coats: { MOD_APPLY_SEALER: { field: 'sealer_coats', interstage: 'MOD_IS' } } },
      { scenario_id: 'SCN_DC_CLEAR', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_STAINED', 'SS_SEALED'], coating_phase: 'clear' },
        modules: ['MOD_APPLY_CLEAR'],
        dynamic_coats: { MOD_APPLY_CLEAR: { field: 'clear_coats', interstage: 'MOD_IS' } } },
    ],
    modules: {
      MOD_PREP: { module_id: 'MOD_PREP', phase: 'prep', tasks: [{ task_ref: 'TSK_SAND' }] },
      MOD_APPLY_STAIN: { module_id: 'MOD_APPLY_STAIN', phase: 'apply', tasks: [
        { task_ref: 'TSK_STAIN_BRUSH', applies_when: { application_method_stain: ['brush'] } },
        { task_ref: 'TSK_STAIN_ROLL', applies_when: { application_method_stain: ['roll'] } },
        { task_ref: 'TSK_STAIN_SPRAY', applies_when: { application_method_stain: ['spray'] } },
      ] },
      MOD_APPLY_SEALER: { module_id: 'MOD_APPLY_SEALER', phase: 'finish', tasks: [
        { task_ref: 'TSK_SEALER_BRUSH', applies_when: { application_method_clear: ['brush'] } },
        { task_ref: 'TSK_SEALER_SPRAY', applies_when: { application_method_clear: ['spray'] } },
      ] },
      MOD_APPLY_CLEAR: { module_id: 'MOD_APPLY_CLEAR', phase: 'finish', tasks: [
        { task_ref: 'TSK_CLEAR_BRUSH', applies_when: { application_method_clear: ['brush'] } },
        { task_ref: 'TSK_CLEAR_SPRAY', applies_when: { application_method_clear: ['spray'] } },
      ] },
    },
    tasks: {}, modifiers: {},
  };
}

describe('listStainPhases / stainPhaseInfo', () => {
  it('lists phases in chain order, empty for paint items', () => {
    expect(listStainPhases(stainBundle(), 'int_dc')).toEqual(['stain', 'sealer', 'clear']);
    expect(listStainPhases(perTierFilesBundle(), 'cab')).toEqual([]);
  });
  it('derives stain phase: default state bare, methods brush/roll/spray', () => {
    const info = stainPhaseInfo(stainBundle(), 'int_dc', 'stain');
    expect(info.defaultState).toBe('SS_BARE');
    expect(info.methodKey).toBe('application_method_stain');
    expect(info.methods).toEqual(['brush', 'roll', 'spray']);
  });
  it('derives sealer phase: default state stained (not bare), clear method key', () => {
    const info = stainPhaseInfo(stainBundle(), 'int_dc', 'sealer');
    expect(info.defaultState).toBe('SS_STAINED');
    expect(info.methodKey).toBe('application_method_clear');
    expect(info.methods).toEqual(['brush', 'spray']);
  });
  it('derives clear phase: default state stained, clear method key', () => {
    const info = stainPhaseInfo(stainBundle(), 'int_dc', 'clear');
    expect(info.defaultState).toBe('SS_STAINED');
    expect(info.methods).toEqual(['brush', 'spray']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`
Expected: FAIL — `listStainPhases is not a function`.

- [ ] **Step 3: Implement** — append to `derive-tier-ladder.js` (after `listDimensions`):

```js
const STAIN_PHASE_ORDER = ['stain', 'sealer', 'clear'];
const STAIN_METHOD_KEY = { stain: 'application_method_stain', sealer: 'application_method_clear', clear: 'application_method_clear' };
// Defensive fallback if a family's apply tasks carry no method-keyed applies_when.
const STAIN_METHOD_FALLBACK = { application_method_stain: ['brush', 'roll', 'spray'], application_method_clear: ['brush', 'spray'] };

// Distinct coating_phase values for an item, in chain order. Empty for paint.
export function listStainPhases(bundle, paintable_item) {
  const set = new Set();
  for (const s of bundle.scenarios || []) {
    if (s.matches?.paintable_item !== paintable_item) continue;
    const cp = s.matches?.coating_phase;
    if (cp) set.add(cp);
  }
  return STAIN_PHASE_ORDER.filter(p => set.has(p));
}

// For one (item, phase): the default stained-chain input state + the method
// options (from the phase's apply-module tasks) + the ctx method key.
export function stainPhaseInfo(bundle, paintable_item, phase) {
  const scns = (bundle.scenarios || []).filter(
    s => s.matches?.paintable_item === paintable_item && s.matches?.coating_phase === phase
  );
  const states = new Set();
  for (const s of scns) {
    const st = s.matches?.substrate_state;
    (Array.isArray(st) ? st : st ? [st] : []).forEach(x => x && states.add(x));
  }
  const defaultState = phase === 'stain'
    ? (states.has('SS_BARE') ? 'SS_BARE' : [...states][0] || '')
    : ([...states].find(x => x !== 'SS_BARE') || [...states][0] || '');

  const methodKey = STAIN_METHOD_KEY[phase] || 'application_method_clear';
  const methods = [];
  const seen = new Set();
  for (const s of scns) {
    for (const modId of Object.keys(s.dynamic_coats || {})) {
      const mod = bundle.modules?.[modId];
      for (const t of (mod?.tasks || [])) {
        const v = t.applies_when?.[methodKey];
        (Array.isArray(v) ? v : v ? [v] : []).forEach(x => { if (x && !seen.has(x)) { seen.add(x); methods.push(x); } });
      }
    }
  }
  return { defaultState, methods: methods.length ? methods : STAIN_METHOD_FALLBACK[methodKey].slice(), methodKey };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`
Expected: PASS (all 5 tests in the file).

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js
git commit -m "feat(stain): listStainPhases + stainPhaseInfo finder dims

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: derive-vantage — stain rendering (ctx, method filter, coat-scalar cells)

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/derive-vantage.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-vantage-stain.test.js` (new)

**Interfaces:**
- Consumes: `sel` may now carry `coating_phase`, `application_method_stain`, `application_method_clear`.
- Produces: module cell shape gains optional `coatField: string`; when present, `count` is the scenario's `coat_counts[field]`. `deriveVantage(bundle, sel)` return shape otherwise unchanged.

- [ ] **Step 1: Write the failing test** — create `__tests__/derive-vantage-stain.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { deriveVantage } from '../derive-vantage.js';

// Minimal decomposed stain bundle: one baseline stain scenario (no quality_tier).
function stainBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_DC_STAIN', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_BARE'], coating_phase: 'stain' },
        modules: ['MOD_APPLY_STAIN'],
        dynamic_coats: { MOD_APPLY_STAIN: { field: 'stain_coats', interstage: 'MOD_IS' } },
        coat_counts: { stain_coats: 2 } },
    ],
    modules: {
      MOD_APPLY_STAIN: { module_id: 'MOD_APPLY_STAIN', phase: 'apply', name: 'Stain', tasks: [
        { task_ref: 'TSK_STAIN_BRUSH', applies_when: { application_method_stain: ['brush'] } },
        { task_ref: 'TSK_STAIN_SPRAY', applies_when: { application_method_stain: ['spray'] } },
      ] },
    },
    tasks: { TSK_STAIN_BRUSH: { name: 'Brush' }, TSK_STAIN_SPRAY: { name: 'Spray' } },
    modifiers: {},
  };
}
const sel = { paintable_item: 'int_dc', substrate_state: 'SS_BARE', coating_phase: 'stain', application_method_stain: 'brush' };

describe('deriveVantage — stain', () => {
  it('resolves the decomposed stain scenario via coating_phase', () => {
    const vm = deriveVantage(stainBundle(), sel);
    expect(vm.served).toContain('QT3');
    expect(vm.phaseGroups.length).toBeGreaterThan(0);
  });
  it('reads coat count from coat_counts (scalar), exposes coatField', () => {
    const vm = deriveVantage(stainBundle(), sel);
    const applyRow = vm.phaseGroups.flatMap(g => g.modules).find(m => m.baseModuleId === 'MOD_APPLY_STAIN');
    expect(applyRow.cells.QT3.count).toBe(2);
    expect(applyRow.cells.QT3.coatField).toBe('stain_coats');
  });
  it('filters apply tasks by the selected stain method', () => {
    const vm = deriveVantage(stainBundle(), sel);
    const applyRow = vm.phaseGroups.flatMap(g => g.modules).find(m => m.baseModuleId === 'MOD_APPLY_STAIN');
    const taskRefs = applyRow.tasks.map(t => t.task_ref);
    expect(taskRefs).toContain('TSK_STAIN_BRUSH');
    expect(taskRefs).not.toContain('TSK_STAIN_SPRAY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/derive-vantage-stain.test.js`
Expected: FAIL — `coatField` undefined / spray task present / no match (coating_phase not in ctx).

- [ ] **Step 3a: Extend `GATE_KEYS`** in `derive-vantage.js` (line 13):

```js
const GATE_KEYS = ['application_method', 'substrate_state', 'application_method_stain', 'application_method_clear']; // NOT quality_tier — tier = file
```

- [ ] **Step 3b: ctx-spread** in `deriveVantage` — replace the hardcoded ctx (currently lines 74-77):

```js
    const ctx = { ...sel, quality_tier: tier };
```

- [ ] **Step 3c: coat-scalar cells** in `deriveVantage` — in the `moduleRows` cells loop, replace the cell assignment for a present module (currently `cells[t] = { moduleId: e.actualId, count: e.count, state };` at ~line 136) with:

```js
      const dc = scnByTier[t].dynamic_coats?.[e.actualId];
      if (dc && dc.field) {
        const cnt = scnByTier[t].coat_counts?.[dc.field];
        cells[t] = { moduleId: e.actualId, count: Number.isFinite(cnt) ? cnt : 1, state, coatField: dc.field };
      } else {
        cells[t] = { moduleId: e.actualId, count: e.count, state };
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/derive-vantage-stain.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite (guard paint regressions)**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — 622 prior + the new stain tests (existing derive-vantage tests still green confirms the ctx-spread/GATE_KEYS changes are paint-safe).

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/derive-vantage.js tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-vantage-stain.test.js
git commit -m "feat(stain): derive-vantage coating_phase ctx + method filter + coat_counts cells

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: tier-files — setScenarioCoatCount

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/tier-files.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files-coats.test.js` (new)

**Interfaces:**
- Produces: `setScenarioCoatCount(scenario, field, n) -> scenario` — immutable; clones `coat_counts`, sets `[field]=n`; same ref on no-op.

- [ ] **Step 1: Write the failing test** — create `__tests__/tier-files-coats.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { setScenarioCoatCount } from '../tier-files.js';

describe('setScenarioCoatCount', () => {
  it('sets the field immutably, cloning coat_counts', () => {
    const scn = { scenario_id: 'S', coat_counts: { stain_coats: 1 }, material_systems: ['SYS_STAIN_OIL'] };
    const next = setScenarioCoatCount(scn, 'stain_coats', 2);
    expect(next).not.toBe(scn);
    expect(next.coat_counts).not.toBe(scn.coat_counts);
    expect(next.coat_counts.stain_coats).toBe(2);
    expect(scn.coat_counts.stain_coats).toBe(1);           // source untouched
    expect(next.material_systems).toBe(scn.material_systems); // other fields shared
  });
  it('creates coat_counts when absent', () => {
    const next = setScenarioCoatCount({ scenario_id: 'S' }, 'clear_coats', 3);
    expect(next.coat_counts).toEqual({ clear_coats: 3 });
  });
  it('returns same ref on no-op', () => {
    const scn = { coat_counts: { stain_coats: 2 } };
    expect(setScenarioCoatCount(scn, 'stain_coats', 2)).toBe(scn);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files-coats.test.js`
Expected: FAIL — `setScenarioCoatCount is not a function`.

- [ ] **Step 3: Implement** — append to `tier-files.js`:

```js
// Set scenario.coat_counts[field] = n (immutable, clones coat_counts). The
// per-phase stain coat scalar; the engine reads it via the dynamic_coats
// fallback ctx[field] ?? coat_counts[field] ?? 1. Same ref on a true no-op.
export function setScenarioCoatCount(scenario, field, n) {
  const cur = scenario && scenario.coat_counts ? scenario.coat_counts[field] : undefined;
  if (cur === n) return scenario;
  const coat_counts = { ...(scenario.coat_counts || {}), [field]: n };
  return { ...scenario, coat_counts };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files-coats.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/tier-files.js tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files-coats.test.js
git commit -m "feat(stain): tier-files setScenarioCoatCount

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: vantage-edits — planSetStainCoats + ctx-spread

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits-stain.test.js` (new)

**Interfaces:**
- Consumes: `setScenarioCoatCount` (Task 3); `ensureScenarioForTier`, `resolveTierScenario` (existing).
- Produces: `planSetStainCoats(bundle, sel, tier, field, n) -> { scenario } | {}` — forks the tier (incl. QT3), writes `coat_counts[field]=n`, clamped to the role's range.

- [ ] **Step 1: Write the failing test** — create `__tests__/vantage-edits-stain.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { planSetStainCoats } from '../vantage-edits.js';

function stainBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_DC_STAIN', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_BARE'], coating_phase: 'stain' },
        modules: ['MOD_APPLY_STAIN'],
        dynamic_coats: { MOD_APPLY_STAIN: { field: 'stain_coats', interstage: 'MOD_IS' } },
        coat_counts: { stain_coats: 1 } },
    ],
    modules: { MOD_APPLY_STAIN: { module_id: 'MOD_APPLY_STAIN', phase: 'apply', tasks: [] } },
    tasks: {}, modifiers: {},
  };
}
const sel = { paintable_item: 'int_dc', substrate_state: 'SS_BARE', coating_phase: 'stain', application_method_stain: 'brush' };

describe('planSetStainCoats', () => {
  it('forks the tier and writes the coat scalar', () => {
    const { scenario } = planSetStainCoats(stainBundle(), sel, 'QT4', 'stain_coats', 2);
    expect(scenario.matches.quality_tier).toBe('QT4');
    expect(scenario.coat_counts.stain_coats).toBe(2);
  });
  it('forks QT3 in place of the baseline (matching paint coats)', () => {
    const { scenario } = planSetStainCoats(stainBundle(), sel, 'QT3', 'stain_coats', 2);
    expect(scenario.matches.quality_tier).toBe('QT3');
    expect(scenario.coat_counts.stain_coats).toBe(2);
  });
  it('clamps to the field range (stain 1..2)', () => {
    expect(planSetStainCoats(stainBundle(), sel, 'QT5', 'stain_coats', 9).scenario.coat_counts.stain_coats).toBe(2);
    expect(planSetStainCoats(stainBundle(), sel, 'QT5', 'stain_coats', 0).scenario.coat_counts.stain_coats).toBe(1);
  });
  it('returns {} when no scenario governs the tier', () => {
    expect(planSetStainCoats({ scenarios: [], modules: {}, tasks: {} }, sel, 'QT4', 'stain_coats', 2)).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits-stain.test.js`
Expected: FAIL — `planSetStainCoats is not a function`.

- [ ] **Step 3a: ctx-spread** in `vantage-edits.js` — replace the hardcoded ctx in `resolveTierScenario` (currently lines 20-23) with:

```js
  const ctx = { ...sel, quality_tier: tier };
```

- [ ] **Step 3b: Add the import** — extend the `tier-files.js` import block (lines 8-13) to include `setScenarioCoatCount`:

```js
import {
  scenarioTierPin, forkScenarioForTier, forkModuleForTier,
  addTask, removeTask, addModuleToTier, removeModuleFromTier,
  setScenarioQtFactor, clearScenarioQtFactor,
  setScenarioMaterial, clearScenarioMaterial,
  setScenarioCoatCount,
} from './tier-files.js';
```

- [ ] **Step 3c: Implement `planSetStainCoats`** — append to `vantage-edits.js`:

```js
// Per-field stain coat ranges (enums.js: stain 1-2, sealer 0-2, clear 1-3).
const STAIN_COAT_RANGE = { stain_coats: [1, 2], sealer_coats: [0, 2], clear_coats: [1, 3] };

// Set a stain phase-file's coat scalar (fork-on-edit, incl. QT3 — matching the
// paint coat stepper). Writes scenario.coat_counts[field]; clamps to the range.
export function planSetStainCoats(bundle, sel, tier, field, n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return {};
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  const [lo, hi] = STAIN_COAT_RANGE[field] || [1, 9];
  const clamped = Math.max(lo, Math.min(hi, Math.round(n)));
  return { scenario: setScenarioCoatCount(scn, field, clamped) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits-stain.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full suite**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — existing vantage-edits tests still green (the ctx-spread is byte-identical for paint sel).

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits-stain.test.js
git commit -m "feat(stain): vantage-edits planSetStainCoats + coating_phase ctx

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: derive-materials — decomposed phase role + canonical-by-role menu

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/derive-materials.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-materials-stain.test.js` (new)

**Interfaces:**
- Consumes: a resolved scenario whose `matches.coating_phase` ∈ {stain,sealer,clear} and whose `material_systems` holds one real system.
- Produces: for such a scenario, `byTier[t]` has `roles: [phase]`, `candidatesByRole[phase]` = the canonical menu for that role, `resolvedByRole[phase]` = the array's system.

- [ ] **Step 1: Write the failing test** — create `__tests__/derive-materials-stain.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { deriveMaterials } from '../derive-materials.js';

// Real specForScenarioMatches maps int_door_casing + coating_phase -> SF_DOOR_CASING_NC_{STAIN,SEALER,CLEAR}.
function stainBundle(systems = ['SYS_STAIN_OIL']) {
  return {
    scenarios: [
      { scenario_id: 'SCN_DC_STAIN',
        matches: { paintable_item: 'int_door_casing', substrate_state: ['SS_BARE'], coating_phase: 'stain' },
        modules: [], material_systems: systems },
    ],
    modules: {}, tasks: {},
  };
}
const stainSel = { paintable_item: 'int_door_casing', substrate_state: 'SS_BARE', coating_phase: 'stain', application_method_stain: 'brush' };

describe('deriveMaterials — decomposed stain', () => {
  it('renders one role (the phase) with the canonical menu', () => {
    const vm = deriveMaterials(stainBundle(), stainBundle(), stainSel);
    expect(vm.materialRoles).toEqual(['stain']);
    const q3 = vm.byTier.QT3;
    expect(q3.specId).toBe('SF_DOOR_CASING_NC_STAIN');
    expect(q3.resolvedByRole.stain).toBe('SYS_STAIN_OIL');
    const ids = q3.candidatesByRole.stain.map(c => c.id).sort();
    expect(ids).toEqual(['SYS_STAIN_GEL', 'SYS_STAIN_OIL', 'SYS_STAIN_OIL_MOD', 'SYS_STAIN_WB']);
  });
  it('flags an override when the resolved stain system differs from canonical', () => {
    const vm = deriveMaterials(stainBundle(['SYS_STAIN_GEL']), stainBundle(['SYS_STAIN_OIL']), stainSel);
    expect(vm.byTier.QT3.isOverrideByRole.stain).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/derive-materials-stain.test.js`
Expected: FAIL — `materialRoles` is `[]` (no `coating_phase` in ctx → no scenario resolves) or role mis-typed as paint.

- [ ] **Step 3a: ctx-spread** in `derive-materials.js` — replace `ctxFor` (lines 23-28):

```js
function ctxFor(sel, tier) {
  return { ...sel, quality_tier: tier };
}
```

- [ ] **Step 3b: Add the canonical menu constant** — after `NAME_BY_SYSTEM_ID` (line 21):

```js
// Canonical interior-stain menu by role: every distinct MATERIAL_SYSTEM whose
// role (product_role-driven) is stain/sealer/clear. Family-agnostic — stain
// systems are universal, unlike paint finishes. Built once.
const CANONICAL_STAIN_BY_ROLE = (() => {
  const out = { stain: [], sealer: [], clear: [] };
  const seen = new Set();
  for (const ms of MATERIAL_SYSTEMS) {
    if (seen.has(ms.id)) continue;
    const role = classifySystemRole(ms.id, ROLE_BY_SYSTEM_ID);
    if (role === 'stain' || role === 'sealer' || role === 'clear') {
      seen.add(ms.id);
      out[role].push({ id: ms.id, name: ms.name || ms.id });
    }
  }
  return out;
})();
```

- [ ] **Step 3c: Branch on `coating_phase`** in `deriveMaterials` — inside the `for (const tier of tiers)` loop, immediately after `const specId = specForScenarioMatches(scenario.matches); if (!specId) { byTier[tier] = null; continue; }` (lines 51-52), insert:

```js
    const phase = scenario.matches?.coating_phase;
    if (phase && CANONICAL_STAIN_BY_ROLE[phase]) {
      const role = phase;
      const candidates = CANONICAL_STAIN_BY_ROLE[role].slice();
      const resolved = (scenario.material_systems || [])[0] || null;
      if (resolved && !candidates.some(c => c.id === resolved)) {
        candidates.push({ id: resolved, name: NAME_BY_SYSTEM_ID[resolved] || resolved });
      }
      const { scenario: canon } = findBestMatch(canonicalBundle, ctxFor(sel, tier));
      const canonResolved = (canon && canon.material_systems || [])[0] || null;
      const isForkPinned = scenarioTierPin(scenario) === tier;
      const diverges = (resolved || null) !== (canonResolved || null);
      byTier[tier] = {
        scenarioId: scenario.scenario_id, specId,
        candidatesByRole: { [role]: candidates },
        resolvedByRole: resolved ? { [role]: resolved } : {},
        isOverrideByRole: { [role]: diverges && (tier === ANCHOR_TIER || isForkPinned) },
        roles: [role],
      };
      served.push(tier);
      continue;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/derive-materials-stain.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite (paint materials unchanged)**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — existing `derive-materials.test.js` (paint cabinet) still green; new stain tests pass.

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/derive-materials.js tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-materials-stain.test.js
git commit -m "feat(stain): derive-materials decomposed-phase role + canonical-by-role menu

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: QTBuilder.jsx — Phase control, stain sel, guard, coat-stepper routing

**Files:**
- Modify: `tools/paintscope/src/components/authoring/QTBuilder.jsx`

**Interfaces:**
- Consumes: `listStainPhases`, `stainPhaseInfo` (Task 1); `planSetStainCoats` (Task 4); cell `coatField` (Task 2).

No new unit test (the pure logic is covered by Tasks 1–5; the component is verified by build + live-verify in Task 7). Each step is a focused edit; build after.

- [ ] **Step 1: Import the stain helpers** — extend the imports:

```jsx
import { listSubstrates, listDimensions, listStainPhases, stainPhaseInfo } from './qt-builder/derive-tier-ladder.js';
```
and add `planSetStainCoats` to the `vantage-edits.js` import block.

- [ ] **Step 2: Derive stain finder state** — after the existing `effCoating` block (line 50), add:

```jsx
  const stainPhases = useMemo(() => listStainPhases(bundle, substrate), [substrate]);
  const isStain = stainPhases.length > 0;
  const [phase, setPhase] = useState('');
  const effPhase = stainPhases.includes(phase) ? phase : (stainPhases[0] || '');
  const phaseInfo = useMemo(
    () => (isStain && effPhase ? stainPhaseInfo(bundle, substrate, effPhase) : null),
    [substrate, effPhase, isStain]
  );
  const stainState = phaseInfo ? (dims.states.includes(fromState) ? fromState : phaseInfo.defaultState) : '';
  const stainMethods = phaseInfo?.methods || [];
  const stainMethod = stainMethods.includes(method) ? method : (stainMethods[0] || '');
```

- [ ] **Step 3: Build `sel` per item type** — replace the `sel` line (line 62):

```jsx
  const sel = isStain
    ? { paintable_item: substrate, coating_phase: effPhase, substrate_state: stainState,
        [phaseInfo?.methodKey || 'application_method_clear']: stainMethod }
    : { paintable_item: substrate, application_method: effMethod, substrate_state: effState, coating_type: effCoating };
```

- [ ] **Step 4: Update the `vm` + `materials` guards** — replace the readiness checks (lines 64-72) so stain requires phase + state, paint unchanged:

```jsx
  const ready = isStain ? (substrate && effPhase && stainState) : (substrate && effMethod && effState);
  const vm = useMemo(() => (ready ? deriveVantage(mergedBundle, sel) : null),
    [mergedBundle, ready, substrate, effMethod, effState, effCoating, effPhase, stainState, stainMethod]);
  const materials = useMemo(() => (ready ? deriveMaterials(mergedBundle, bundle, sel) : null),
    [mergedBundle, ready, substrate, effMethod, effState, effCoating, effPhase, stainState, stainMethod]);
```

- [ ] **Step 5: Render the Phase / Method / From-state finder for stain** — replace the Method + From-state + Coating finder labels (lines 137-153) so stain shows Phase + reused Method/From-state, paint shows the existing controls:

```jsx
        {isStain ? (
          <>
            <label style={labelStyle}>Phase
              <select value={effPhase} onChange={e => setPhase(e.target.value)} style={{ ...inputStyle, width: 130 }}>
                {stainPhases.map(p => <option key={p} value={p}>{humanize(p)}</option>)}
              </select>
            </label>
            <label style={labelStyle}>From state
              <select value={stainState} onChange={e => setFromState(e.target.value)} style={{ ...inputStyle, width: 150 }}>
                {dims.states.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Method
              <select value={stainMethod} onChange={e => setMethod(e.target.value)} style={{ ...inputStyle, width: 150 }}>
                {stainMethods.map(m => <option key={m} value={m}>{humanize(m)}</option>)}
              </select>
            </label>
          </>
        ) : (
          <>
            <label style={labelStyle}>Method
              <select value={effMethod} onChange={e => setMethod(e.target.value)} style={{ ...inputStyle, width: 150 }}>
                {dims.methods.map(m => <option key={m} value={m}>{humanize(m)}</option>)}
              </select>
            </label>
            <label style={labelStyle}>From state
              <select value={effState} onChange={e => setFromState(e.target.value)} style={{ ...inputStyle, width: 150 }}>
                {dims.states.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
              </select>
            </label>
            {dims.coatings.length > 1 && (
              <label style={labelStyle}>Coating
                <select value={effCoating} onChange={e => setCoating(e.target.value)} style={{ ...inputStyle, width: 130 }}>
                  {dims.coatings.map(c => <option key={c} value={c}>{humanize(c)}</option>)}
                </select>
              </label>
            )}
          </>
        )}
```
(The Substrate `<select>` at lines 132-136 stays as the first finder control, unchanged, before this block.)

- [ ] **Step 6: Route the coat stepper to the scalar writer for stain** — in the module-cell render, replace the `±` stepper branch (the `repeatable && editable` block, lines 271-278). When the cell has `coatField`, the stepper calls `planSetStainCoats`; otherwise the existing module-repetition `planSetCoats`. Also suppress the module-level `×` remove for coat-scalar cells (the stepper + tier "revert" cover edits):

```jsx
                                {repeatable && editable ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <button style={{ ...stepBtn, opacity: busy || c.count <= (c.coatField === 'sealer_coats' ? 0 : 1) ? 0.4 : 1 }}
                                      disabled={busy || c.count <= (c.coatField === 'sealer_coats' ? 0 : 1)} title="Fewer coats"
                                      onClick={() => run(() => c.coatField
                                        ? planSetStainCoats(mergedBundle, sel, t, c.coatField, c.count - 1)
                                        : planSetCoats(mergedBundle, sel, t, row.baseModuleId, c.count - 1))}>−</button>
                                    <b style={{ color }} title={c.state}>×{c.count}</b>
                                    <button style={{ ...stepBtn, opacity: busy ? 0.4 : 1 }} disabled={busy} title="More coats"
                                      onClick={() => run(() => c.coatField
                                        ? planSetStainCoats(mergedBundle, sel, t, c.coatField, c.count + 1)
                                        : planSetCoats(mergedBundle, sel, t, row.baseModuleId, c.count + 1))}>+</button>
                                  </span>
                                ) : (
                                  <b style={{ color }} title={c.state}>✓{c.count > 1 ? `×${c.count}` : ''}</b>
                                )}
                                {editable && !c.coatField && (
                                  <button title={repeatable && c.count > 1 ? 'Remove one coat at this tier' : 'Remove this module at this tier'}
                                    disabled={busy}
                                    onClick={() => run(() => planRemoveModule(mergedBundle, sel, t, row.baseModuleId))}
                                    style={removeBtn}>×</button>
                                )}
```

- [ ] **Step 7: Build to verify the component compiles**

Run: `cd tools/paintscope && npx vite build`
Expected: `✓ built` with no errors (the pre-existing chunk-size warning is fine).

- [ ] **Step 8: Commit**

```bash
git add tools/paintscope/src/components/authoring/QTBuilder.jsx
git commit -m "feat(stain): QTBuilder Phase control + stain sel + coat-stepper routing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Pilot end-to-end — gates + live-verify (door_casing)

**Files:** none (verification).

- [ ] **Step 1: Full suite green**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — 622 prior + all new stain tests; 0 failures.

- [ ] **Step 2: Build clean**

Run: `cd tools/paintscope && npx vite build`
Expected: `✓ built`, no errors.

- [ ] **Step 3: Parity — file-scope gate (decisive) + optional snapshot**

File-scope (primary): `git diff --name-only feature/stain-decomposition..HEAD`
Expected: only `…/authoring/QTBuilder.jsx`, `…/authoring/qt-builder/*`, their `__tests__/*`, and `docs/*`. **Any `engine/`, `scenarios/`, `modules/`, or `data/scenario-*.js` path is a regression** — the estimate engine must be untouched.

Optional snapshot (belt-and-suspenders, if a project-state JSON is available — e.g. export the loaded McLeod project from the app, or reuse a Phase-1 capture):
- On the base (before any P2 code): `git stash` or check out `feature/stain-decomposition`, then `cd tools/paintscope && npx vite-node scripts/parity-estimate.mjs -- <state.json> /tmp/parity-before.json`.
- On the P2 tip: `npx vite-node scripts/parity-estimate.mjs -- <state.json> /tmp/parity-after.json`.
- `diff /tmp/parity-before.json /tmp/parity-after.json` → **empty** (identical `grandTotalHours` + per-spec). Tool-only changes ⇒ no canonical-estimate change.

- [ ] **Step 4: Live-verify the pilot** — `cd tools/paintscope && npm run dev` (vite dev server; note the printed port, typically 5173). In the app, open the QT Builder (authoring → `qt` tab). Using Playwright MCP (or manually):
  - Select Substrate = **Int Door Casing**. Confirm the finder shows **Phase** (Stain/Sealer/Clear) + From state + Method (Brush+Wipe / Roll+Wipe / Spray+Wipe), and the grid renders (prep + apply + interstage modules), not "Pick a substrate…".
  - Confirm the **apply** module row shows a `×N` coat stepper (not a disabled `✓`), and the Materials section shows one **Stain** row with the canonical menu (Oil / Oil-Modified / WB / Gel).
  - Click `+` on the QT4 apply coat cell → confirm it becomes `×2`, the QT4 header shows **forked · revert**, and a draft banner appears.
  - In Materials, change the QT5 Stain system → confirm the accent border + "override · default" appears.
  - Switch **Phase = Clear**, From-state defaults to Stained, Method shows Brush/Spray; confirm the Clear apply stepper + a **Clear** materials row (Poly-Oil / Poly-WB / Lacquer).
  - Confirm **0 console errors** throughout.

- [ ] **Step 5: Verify the estimate moves** — in a test project with a stained `int_door_casing` (McLeod, or add one), confirm the published QT4 coat fork / material override changes that substrate's hours/materials in the estimate (drafts are live via overlay). Revert the drafts after (or leave for review).

- [ ] **Step 6: Commit** (verification notes only, if any artifact changed; otherwise skip). No code change expected here.

---

### Task 8: Generalize across flat decomposed families

**Files:** none (verification; fix only if a defect surfaces).

- [ ] **Step 1: Spot-check two more families** in the running app: select **Int Baseboard** (LF trim) and **Int Wood Wall** (SF feature wood). For each: Phase = Stain → grid + Materials render; the per-phase **From-state default** lands on a valid state (grid is non-empty, not "No scenario matched"); switch to Sealer + Clear and confirm each resolves.
- [ ] **Step 2: If a family yields an empty grid** for a default (phase, state), inspect its scenarios' `matches.substrate_state` and confirm `stainPhaseInfo`'s default-state rule picks a matched state; adjust the rule in `derive-tier-ladder.js` + add a regression test in `derive-tier-ladder.test.js` if needed, then re-run `npx vitest run`.
- [ ] **Step 3: Commit** any fix:

```bash
git add tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js
git commit -m "fix(stain): default-state derivation for <family>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Stairs — verify + record the deferral

**Files:** the spec (record), possibly memory.

- [ ] **Step 1: Check whether stair stain scenarios carry `coating_phase`** — run, from `Claude/`:

```bash
ls scenarios | grep -iE "STAIR.*(STAIN|SEALER|CLEAR)"
```
and inspect one (e.g. `cat scenarios/<file>.json`) for a `coating_phase` key and the `paintable_item` value (`int_stair_railing` / `int_stair_riser` vs component tokens).

- [ ] **Step 2: Decide + record.** If stair stain scenarios DO carry `coating_phase` and a stable `paintable_item`, note that they should work through the generic wiring (verify one in the app). If they are component-expanded (no per-phase `coating_phase` scenarios, or per-component `paintable_item`), record in the design spec §7.3 + the `project_stain_model_qt_builder` memory that stair stain authoring is a scoped follow-up (the flat-family pilot is unaffected). Do not force stair handling into this branch.
- [ ] **Step 3: Commit** the doc/spec note:

```bash
git add docs/superpowers/specs/2026-06-23-qt-builder-stain-authoring-design.md
git commit -m "docs(stain): record stair stain authoring follow-up scope

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review notes (for the executor)

- **Parity is the hard gate.** The ctx-spread (`{...sel, quality_tier}`) and the `GATE_KEYS` additions are the only changes that touch the paint path; both are behavior-preserving for paint `sel` (it carries exactly the old keys; paint tasks don't declare the stain/clear method keys). Run parity after Task 2 and again at Task 7.
- **Coat-scalar detection** is gated strictly on `scenario.dynamic_coats[actualId]`; paint scenarios have no `dynamic_coats`, so their cells keep module-repetition counts.
- **Role classification** for materials relies on `product_role` (verified present on all 9 canonical systems), so set/clear replace rather than append without baseRole threading. If a future canonical system lacks `product_role`, add it to the data or thread `baseRole='stain'`.
- **Fork-on-edit incl. QT3** for coats matches the existing paint coat stepper (`ensureScenarioForTier`); reverting is the tier-header "revert" link (`planRevertTier` deletes the fork; stain forks carry no `_QT` module ids → `deleteModuleIds` empty).

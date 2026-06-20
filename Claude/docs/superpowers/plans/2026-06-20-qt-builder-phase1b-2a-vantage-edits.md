# QT Builder Phase 1b-2a — Vantage Edit Orchestration (`vantage-edits.js`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure implicit-fork edit orchestration — `planAddTask` / `planRemoveTask` / `planAddModule` / `planRemoveModule` / `planSetCoats` / `planRevertTier` — that compose the Phase 1a `tier-files` ops over the overlaid bundle and return the draft writes (and deletes) the `QTBuilder` component will persist.

**Architecture:** One new pure module, `qt-builder/vantage-edits.js`. Each `plan*` function resolves the governing scenario for a tier (`findBestMatch`), ensures the scenario is forked to that tier (copy-on-write), ensures a shared module is forked when a task edit targets it, applies the 1a op, and returns `{ scenario?, module? }` draft payloads (or `{ deleteScenarioId, deleteModuleIds }` for revert). No React, no IndexedDB, no mutation — so the fork-on-edit sequencing is unit-testable. Implements §6 of the Phase 1b spec.

**Tech Stack:** Plain JS/ESM (no TypeScript), Vitest.

## Global Constraints

- **No TypeScript.** Plain `.js`, matching `qt-builder/*.js`.
- **Pure / read-only.** No mutation of `bundle`/`sel`; resolve via `findBestMatch`; compose the Phase 1a `tier-files` ops (which are themselves immutable). Return draft payloads + delete ids; never persist here.
- **Implicit fork is copy-on-write.** `ensureScenarioForTier` forks the governing scenario to a tier-pinned draft only when it's still the baseline (`forkScenarioForTier`); a task edit on a shared module forks that module (`forkModuleForTier`). The baseline and shared originals are never touched.
- **No `applies_when.quality_tier`.** Task adds go through `tier-files.addTask` (plain `{ task_ref }`).
- **Module alignment by base id** — `moduleId` with any `_QT[2-5]` token stripped — to find a tier scenario's actual module for a `baseModuleId`.
- **Coats = module repeats** in the tier scenario's `modules[]` (no module fork for coats).
- Run tests: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`.

## File Structure

- **Create** `tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js`.
- **Create** `tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`.

Exports: `planAddTask`, `planRemoveTask`, `planAddModule`, `planRemoveModule`, `planSetCoats`, `planRevertTier`.

A shared test fixture (used by all tasks) — a baseline scenario serving all tiers + the modules it needs:

```js
function bundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_B',
        matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' },
        modules: ['MOD_PREP', 'MOD_APPLY'] },
    ],
    modules: {
      MOD_PREP:  { module_id: 'MOD_PREP',  phase: 'prep',  name: 'Prep',  tasks: [{ task_ref: 'T_SAND' }] },
      MOD_APPLY: { module_id: 'MOD_APPLY', phase: 'apply', name: 'Apply', tasks: [{ task_ref: 'T_COAT' }] },
    },
    tasks: { T_SAND: { name: 'Sand' }, T_COAT: { name: 'Coat' }, T_EXTRA: { name: 'Extra' } },
  };
}
const sel = { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' };
```

---

### Task 1: helpers + `planAddTask` / `planRemoveTask`

**Files:**
- Create: `tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`

**Interfaces:**
- Consumes: `findBestMatch` (engine/scenario-matcher); from `./tier-files.js`: `scenarioTierPin`, `forkScenarioForTier`, `forkModuleForTier`, `addTask`, `removeTask`, `addModuleToTier`, `removeModuleFromTier`.
- Produces:
  - `planAddTask(bundle, sel, tier, baseModuleId, taskId) → { scenario?, module? }`
  - `planRemoveTask(bundle, sel, tier, baseModuleId, taskId) → { scenario?, module? }`
  - (empty `{}` when the edit can't be located.)

- [ ] **Step 1: Write the failing test** — create `__tests__/vantage-edits.test.js` with the fixture above, then:

```js
import { describe, it, expect } from 'vitest';
import { planAddTask, planRemoveTask } from '../vantage-edits.js';

describe('planAddTask', () => {
  it('forks the baseline scenario AND the shared module, swaps the ref, adds the task — sources untouched', () => {
    const b = bundle();
    const { scenario, module } = planAddTask(b, sel, 'QT5', 'MOD_APPLY', 'T_EXTRA');
    expect(scenario.scenario_id).toBe('SCN_B_QT5');
    expect(scenario.matches.quality_tier).toBe('QT5');
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY_QT5']);     // shared module ref swapped to the fork
    expect(module.module_id).toBe('MOD_APPLY_QT5');
    expect(module.tasks.map(t => t.task_ref)).toEqual(['T_COAT', 'T_EXTRA']);
    expect(module.tasks[1].applies_when).toBeUndefined();               // no applies_when.quality_tier
    expect(b.scenarios[0].matches.quality_tier).toBeUndefined();        // baseline untouched
    expect(b.modules.MOD_APPLY.tasks).toEqual([{ task_ref: 'T_COAT' }]); // shared module untouched
  });
});

describe('planRemoveTask', () => {
  it('forks scenario + module and removes the task from the fork', () => {
    const b = bundle();
    const { scenario, module } = planRemoveTask(b, sel, 'QT5', 'MOD_APPLY', 'T_COAT');
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY_QT5']);
    expect(module.module_id).toBe('MOD_APPLY_QT5');
    expect(module.tasks).toEqual([]);
  });
  it('returns {} when the base module is not in the tier scenario', () => {
    expect(planRemoveTask(bundle(), sel, 'QT5', 'MOD_NOPE', 'T')).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`
Expected: FAIL — cannot import from non-existent `vantage-edits.js`.

- [ ] **Step 3: Create `vantage-edits.js` with the helpers + the two task-edit plans:**

```js
// Pure implicit-fork edit orchestration for the QT Builder vantage grid. Each
// plan* function composes the Phase 1a tier-files ops over the OVERLAID bundle
// and returns the draft writes (and deletes) the component should persist — so
// the fork-on-edit sequencing is testable apart from React/IndexedDB. Reads
// only; never mutates the bundle.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import {
  scenarioTierPin, forkScenarioForTier, forkModuleForTier,
  addTask, removeTask, addModuleToTier, removeModuleFromTier,
} from './tier-files.js';

function baseId(id) { return id.replace(/_QT[2-5](?=_|$)/g, ''); }

function resolveTierScenario(bundle, sel, tier) {
  const ctx = {
    paintable_item: sel.paintable_item, application_method: sel.application_method,
    substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
  };
  return findBestMatch(bundle, ctx).scenario || null;
}

// Governing scenario for `tier`, forked to its own file if still the baseline.
function ensureScenarioForTier(bundle, sel, tier) {
  const gov = resolveTierScenario(bundle, sel, tier);
  if (!gov) return null;
  return forkScenarioForTier(gov, tier).scenario;
}

// The actual module id in scenario.modules whose base id is baseModuleId.
function actualModuleId(scenario, baseModuleId) {
  return (scenario.modules || []).find(id => baseId(id) === baseModuleId) || null;
}

function planTaskEdit(bundle, sel, tier, baseModuleId, taskId, op) {
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  const modId = actualModuleId(scn, baseModuleId);
  if (!modId) return {};
  const source = bundle.modules?.[modId];
  if (!source) return {};
  const { scenario, module } = forkModuleForTier(scn, modId, source, tier);
  return { scenario, module: op(module, taskId) };
}

export function planAddTask(bundle, sel, tier, baseModuleId, taskId) {
  return planTaskEdit(bundle, sel, tier, baseModuleId, taskId, addTask);
}

export function planRemoveTask(bundle, sel, tier, baseModuleId, taskId) {
  return planTaskEdit(bundle, sel, tier, baseModuleId, taskId, removeTask);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits.test.js
git commit -m "feat(qt-builder): vantage-edits task plans (implicit scenario+module fork, add/remove task)"
```

---

### Task 2: module composition — `planAddModule` / `planRemoveModule` / `planSetCoats`

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`

**Interfaces:**
- Produces (each forks the scenario if needed, returns `{ scenario }`; `{}` when unlocatable):
  - `planAddModule(bundle, sel, tier, moduleId) → { scenario? }`
  - `planRemoveModule(bundle, sel, tier, baseModuleId) → { scenario? }`
  - `planSetCoats(bundle, sel, tier, baseModuleId, n) → { scenario? }`

- [ ] **Step 1: Write the failing test** — append to `vantage-edits.test.js`:

```js
import { planAddModule, planRemoveModule, planSetCoats } from '../vantage-edits.js';

describe('planAddModule / planRemoveModule', () => {
  it('forks the scenario and appends a whole module at the tier', () => {
    const { scenario } = planAddModule(bundle(), sel, 'QT5', 'MOD_GLAZE');
    expect(scenario.scenario_id).toBe('SCN_B_QT5');
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY', 'MOD_GLAZE']);
  });
  it('forks the scenario and removes a module at the tier', () => {
    const { scenario } = planRemoveModule(bundle(), sel, 'QT5', 'MOD_PREP');
    expect(scenario.modules).toEqual(['MOD_APPLY']);
  });
});

describe('planSetCoats', () => {
  it('repeats the module to reach N (coats up)', () => {
    const { scenario } = planSetCoats(bundle(), sel, 'QT5', 'MOD_APPLY', 3);
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY', 'MOD_APPLY', 'MOD_APPLY']);
  });
  it('removes repeats to reach N (coats down)', () => {
    const b = bundle();
    b.scenarios[0].modules = ['MOD_PREP', 'MOD_APPLY', 'MOD_APPLY', 'MOD_APPLY'];
    const { scenario } = planSetCoats(b, sel, 'QT5', 'MOD_APPLY', 1);
    expect(scenario.modules).toEqual(['MOD_PREP', 'MOD_APPLY']);
  });
  it('returns {} for n < 1', () => {
    expect(planSetCoats(bundle(), sel, 'QT5', 'MOD_APPLY', 0)).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`
Expected: FAIL — the three functions are not exported.

- [ ] **Step 3: Add the three functions to `vantage-edits.js`:**

```js
export function planAddModule(bundle, sel, tier, moduleId) {
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  return { scenario: addModuleToTier(scn, moduleId) };
}

export function planRemoveModule(bundle, sel, tier, baseModuleId) {
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  const modId = actualModuleId(scn, baseModuleId);
  if (!modId) return {};
  return { scenario: removeModuleFromTier(scn, modId) };
}

export function planSetCoats(bundle, sel, tier, baseModuleId, n) {
  if (!Number.isInteger(n) || n < 1) return {};
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  const modId = actualModuleId(scn, baseModuleId);
  if (!modId) return {};
  let scenario = scn;
  let count = (scenario.modules || []).filter(id => baseId(id) === baseModuleId).length;
  while (count < n) { scenario = addModuleToTier(scenario, modId); count++; }
  while (count > n) { scenario = removeModuleFromTier(scenario, modId); count--; }
  return { scenario };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits.test.js
git commit -m "feat(qt-builder): vantage-edits module plans (add/remove module, set coats via repeats)"
```

---

### Task 3: `planRevertTier` + composition smoke

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`

**Interfaces:**
- Produces: `planRevertTier(bundle, sel, tier) → { deleteScenarioId?, deleteModuleIds? }` — the tier's own scenario id + its `_QT` module ids to delete (reclaiming baseline). `{}` when the tier is baseline-served (nothing to revert).

- [ ] **Step 1: Write the failing test** — append to `vantage-edits.test.js`:

```js
import { planRevertTier } from '../vantage-edits.js';

describe('planRevertTier', () => {
  it('returns the fork scenario id + its _QT module ids to delete', () => {
    const b = bundle();
    b.scenarios.push({ scenario_id: 'SCN_B_QT5', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT5' }, modules: ['MOD_PREP', 'MOD_APPLY_QT5'] });
    b.modules.MOD_APPLY_QT5 = { module_id: 'MOD_APPLY_QT5', phase: 'apply', name: 'Apply QT5', tasks: [] };
    expect(planRevertTier(b, sel, 'QT5')).toEqual({ deleteScenarioId: 'SCN_B_QT5', deleteModuleIds: ['MOD_APPLY_QT5'] });
  });
  it('returns {} when the tier is served by the baseline (nothing to revert)', () => {
    expect(planRevertTier(bundle(), sel, 'QT5')).toEqual({});
  });
});

describe('composition smoke', () => {
  it('add-task then revert names the same fork files; baseline stays pristine', () => {
    const b = bundle();
    const add = planAddTask(b, sel, 'QT4', 'MOD_APPLY', 'T_EXTRA');
    expect(add.scenario.scenario_id).toBe('SCN_B_QT4');
    expect(add.module.module_id).toBe('MOD_APPLY_QT4');
    // Simulate those drafts now overlaying the bundle, then revert.
    const b2 = { ...b, scenarios: [...b.scenarios, add.scenario], modules: { ...b.modules, [add.module.module_id]: add.module } };
    expect(planRevertTier(b2, sel, 'QT4')).toEqual({ deleteScenarioId: 'SCN_B_QT4', deleteModuleIds: ['MOD_APPLY_QT4'] });
    expect(b.scenarios[0].matches.quality_tier).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js`
Expected: FAIL — `planRevertTier` not exported.

- [ ] **Step 3: Add `planRevertTier` to `vantage-edits.js`:**

```js
// The tier's own scenario + its forked (_QT) modules to delete, reverting the
// tier to the baseline. {} when the tier is baseline-served (not forked). A
// _QT<tier> module is exclusive to this tier's scenario, so deleting it is safe.
export function planRevertTier(bundle, sel, tier) {
  const gov = resolveTierScenario(bundle, sel, tier);
  if (!gov || scenarioTierPin(gov) !== tier) return {};
  const deleteModuleIds = (gov.modules || []).filter(id => baseId(id) !== id);
  return { deleteScenarioId: gov.scenario_id, deleteModuleIds };
}
```

- [ ] **Step 4: Run the focused test + the full suite**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/vantage-edits.test.js && npx vitest run`
Expected: PASS (vantage-edits green; full suite at the prior count + the new tests; `vantage-edits.js` is not yet imported elsewhere).

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/vantage-edits.js tools/paintscope/src/components/authoring/qt-builder/__tests__/vantage-edits.test.js
git commit -m "feat(qt-builder): vantage-edits planRevertTier + composition smoke"
```

---

## Self-Review

**Spec coverage (Phase 1b §6):**
- `ensureScenarioFork` (copy-on-write scenario fork) → `ensureScenarioForTier` helper, exercised by every plan. ✓
- `ensureModuleFork` (fork a shared module on task edit) → `planTaskEdit` via `forkModuleForTier`; Task 1 asserts the ref swap + the shared module untouched. ✓
- `+ task` / `× task` → `planAddTask`/`planRemoveTask` (Task 1). ✓
- `+ module` / `× module` → `planAddModule`/`planRemoveModule` (Task 2). ✓
- Coats `×N` as module repeats → `planSetCoats` (Task 2, up + down). ✓
- Revert tier → `planRevertTier` returning the scenario + `_QT` module deletes (Task 3). ✓
- A genuinely shared module is never edited in place → Task 1 asserts `b.modules.MOD_APPLY` untouched; the fork preludes guarantee it. ✓
- No `applies_when.quality_tier` → `addTask` (1a) writes plain `{ task_ref }`; Task 1 asserts `applies_when` undefined. ✓

**Out of 1b-2a (next plan, 1b-2b):** the `QTBuilder.jsx` rewrite (render the `deriveVantage` view-model + wire these plans to `saveScenario`/`saveModule`/`remove` + `ModulePicker`/`TaskPicker` + the draft banner), and deleting the dead gating-era compile modules.

**Placeholder scan:** none — complete code + commands + expected output in every step.

**Type consistency:** every `plan*` returns `{ scenario?, module? }` (edits) or `{ deleteScenarioId?, deleteModuleIds? }` (revert); the tests destructure exactly those. `forkScenarioForTier`→`{scenario,created}` and `forkModuleForTier`→`{scenario,module,created}` (from 1a) are consumed with the right shapes. `actualModuleId`/`baseId`/`resolveTierScenario`/`ensureScenarioForTier` signatures match their call sites.

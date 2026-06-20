# QT Builder Phase 1a — Fork/Edit Authoring Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, copy-on-write authoring operations for the file-naming quality-tier model — fork a scenario/module per tier, add/remove/reorder modules, add/remove existing tasks — with zero `applies_when.quality_tier` and zero engine changes.

**Architecture:** One new pure compile module, `qt-builder/tier-files.js`. Every function takes plain scenario/module payloads and returns NEW payloads (immutable; same reference on a no-op), exactly like the sibling `tier-qt-factor.js`/`tier-coats.js`. The UI (Phase 1b) and the gating cleanup (Phase 1c) are separate plans that consume this core. Implements §8 of the design spec.

**Tech Stack:** Plain JS/ESM (no TypeScript), Vitest. PaintScope scenario/module authoring.

## Global Constraints

- **No TypeScript, no Tailwind.** Plain `.js`, matching `tools/paintscope/src/components/authoring/qt-builder/*.js`.
- **Pure & immutable.** Never mutate inputs; return the SAME reference on a no-op (mirror `tier-qt-factor.js`).
- **A tier is a file identity.** Tier-pinned entities set `matches.quality_tier` (scenarios) or carry a `_QT<n>` id suffix (modules). The baseline scenario has **no** `quality_tier` in `matches`.
- **NEVER write `applies_when.quality_tier`.** Task entries added are plain `{ task_ref }`. (This core replaces `edit-tier-ladder.js`, which did the opposite.)
- **Existing tasks only.** No task creation anywhere.
- **Forking is additive / copy-on-write.** `forkScenarioForTier` clones the baseline into a new tier-pinned payload; it never mutates the baseline. `forkModuleForTier` clones the shared module and swaps the reference in the (already-forked) scenario's `modules[]`.
- **Entity shapes** (verbatim from the data): a scenario is `{ scenario_id, name, domain, context, matches:{…}, modules:[<id strings>], coat_counts, protection_zones, material_systems, modifiers, output_state }`; a module is `{ module_id, name, phase, intent, tasks:[{ task_ref, applies_when? }], modifier_eligibility, doctrine }`.
- Run tests from the app dir: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`.

## File Structure

- **Create** `tools/paintscope/src/components/authoring/qt-builder/tier-files.js` — all Phase-1a operations.
- **Create** `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js` — unit tests.

Exports: `tierId`, `scenarioTierPin`, `forkScenarioForTier`, `forkModuleForTier`, `addModuleToTier`, `removeModuleFromTier`, `moveModule`, `addTask`, `removeTask`.

---

### Task 1: ID helpers + `forkScenarioForTier`

**Files:**
- Create: `tools/paintscope/src/components/authoring/qt-builder/tier-files.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js`

**Interfaces:**
- Produces:
  - `tierId(baseId: string, tier: string) → string` — strip any existing `_QT<n>` token, append `_QT<n>` for `tier`.
  - `scenarioTierPin(scenario) → tier|null` — the single tier this scenario pins via `matches.quality_tier`, or null (baseline / multi-tier).
  - `forkScenarioForTier(scenario, tier) → { scenario, created: boolean }` — clone the scenario into a tier-pinned payload (new id, `matches.quality_tier = tier`); `created:false` + same ref when it already pins exactly `tier`.

- [ ] **Step 1: Write the failing test** — create `__tests__/tier-files.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { tierId, scenarioTierPin, forkScenarioForTier } from '../tier-files.js';

describe('tierId', () => {
  it('appends _QT<n> to a baseline id', () => {
    expect(tierId('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE', 'QT4')).toBe('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE_QT4');
    expect(tierId('MOD_APPLY_ARCH_ELEMENT_FINISH', 'QT4')).toBe('MOD_APPLY_ARCH_ELEMENT_FINISH_QT4');
  });
  it('replaces an existing _QT token (mid-id or suffix), idempotent for same tier', () => {
    expect(tierId('SCN_ARCH_ELEMENT_NC_QT3_BRUSH_FROM_BARE', 'QT4')).toBe('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE_QT4');
    expect(tierId('MOD_X_QT4', 'QT4')).toBe('MOD_X_QT4');
    expect(tierId('MOD_X_QT4', 'QT5')).toBe('MOD_X_QT5');
  });
});

describe('scenarioTierPin', () => {
  it('returns null for a baseline (no quality_tier)', () => {
    expect(scenarioTierPin({ matches: { paintable_item: 'x' } })).toBeNull();
    expect(scenarioTierPin({})).toBeNull();
  });
  it('returns the single pinned tier (string or 1-element array)', () => {
    expect(scenarioTierPin({ matches: { quality_tier: 'QT4' } })).toBe('QT4');
    expect(scenarioTierPin({ matches: { quality_tier: ['QT4'] } })).toBe('QT4');
  });
  it('returns null for a multi-tier match', () => {
    expect(scenarioTierPin({ matches: { quality_tier: ['QT3', 'QT4'] } })).toBeNull();
  });
});

describe('forkScenarioForTier', () => {
  it('clones a baseline into a tier-pinned fork without mutating the baseline', () => {
    const base = { scenario_id: 'SCN_B', name: 'B', matches: { paintable_item: 'x' }, modules: ['A', 'B'] };
    const { scenario, created } = forkScenarioForTier(base, 'QT4');
    expect(created).toBe(true);
    expect(scenario.scenario_id).toBe('SCN_B_QT4');
    expect(scenario.matches).toEqual({ paintable_item: 'x', quality_tier: 'QT4' });
    expect(scenario.modules).toEqual(['A', 'B']);
    expect(scenario.modules).not.toBe(base.modules);      // cloned array
    expect(base.matches.quality_tier).toBeUndefined();    // baseline untouched
  });
  it('is a no-op (same ref, created false) when already pinned to that tier', () => {
    const s = { scenario_id: 'SCN_B_QT4', matches: { quality_tier: 'QT4' }, modules: [] };
    const r = forkScenarioForTier(s, 'QT4');
    expect(r.created).toBe(false);
    expect(r.scenario).toBe(s);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: FAIL — cannot import from non-existent `tier-files.js`.

- [ ] **Step 3: Create `tier-files.js` with the helpers + `forkScenarioForTier`:**

```js
// Pure, copy-on-write authoring ops for the file-naming quality-tier model.
// Tier = file identity: a baseline scenario (no matches.quality_tier) serves all
// tiers; forks add matches.quality_tier and win by matcher specificity. Modules
// fork to MOD_..._QT<n> when a tier needs a different task set. No
// applies_when.quality_tier is ever written. All immutable; callers save results
// as scenario / module drafts. Replaces edit-tier-ladder.js.

// Strip any existing _QT<n> token (mid-id or suffix), then append _QT<n>.
export function tierId(baseId, tier) {
  const n = String(tier).replace(/^QT/, '');
  return baseId.replace(/_QT[2-5](?=_|$)/g, '') + '_QT' + n;
}

// The single tier this scenario pins via matches.quality_tier, or null
// (baseline = no quality_tier; multi-tier array = null).
export function scenarioTierPin(scenario) {
  const qt = scenario && scenario.matches && scenario.matches.quality_tier;
  if (qt == null) return null;
  const arr = Array.isArray(qt) ? qt : [qt];
  return arr.length === 1 ? arr[0] : null;
}

// Clone a scenario into a tier-pinned fork (new id, matches.quality_tier=tier).
// Additive: never mutates the source. No-op (same ref) if already pinned to tier.
export function forkScenarioForTier(scenario, tier) {
  if (!scenario || scenarioTierPin(scenario) === tier) return { scenario, created: false };
  const scenario_id = tierId(scenario.scenario_id, tier);
  const fork = {
    ...scenario,
    scenario_id,
    matches: { ...(scenario.matches || {}), quality_tier: tier },
    modules: [...(scenario.modules || [])],
  };
  return { scenario: fork, created: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/tier-files.js tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js
git commit -m "feat(qt-builder): tier-files id helpers + forkScenarioForTier (file-naming model)"
```

---

### Task 2: `forkModuleForTier`

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/tier-files.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js`

**Interfaces:**
- Consumes: `tierId` (Task 1).
- Produces: `forkModuleForTier(scenario, moduleId, sourceModule, tier) → { scenario, module, created }` — clone `sourceModule` into a `_QT<tier>` copy, swap the first occurrence of `moduleId` in `scenario.modules` to the fork id. No-op (`created:false`, same refs) when `moduleId` already pins that tier.

- [ ] **Step 1: Write the failing test** — append to `tier-files.test.js`:

```js
import { forkModuleForTier } from '../tier-files.js';

describe('forkModuleForTier', () => {
  const scn = { scenario_id: 'SCN_B_QT4', matches: { quality_tier: 'QT4' }, modules: ['MOD_X', 'MOD_Y'] };
  const src = { module_id: 'MOD_X', phase: 'apply', tasks: [{ task_ref: 'T1' }, { task_ref: 'T2' }] };

  it('clones the module to a tier id and swaps the scenario reference', () => {
    const { scenario, module, created } = forkModuleForTier(scn, 'MOD_X', src, 'QT4');
    expect(created).toBe(true);
    expect(module.module_id).toBe('MOD_X_QT4');
    expect(module.phase).toBe('apply');
    expect(module.tasks).toEqual([{ task_ref: 'T1' }, { task_ref: 'T2' }]);
    expect(scenario.modules).toEqual(['MOD_X_QT4', 'MOD_Y']);   // first occurrence swapped, order kept
  });
  it('does not mutate the source scenario or module', () => {
    forkModuleForTier(scn, 'MOD_X', src, 'QT4');
    expect(scn.modules).toEqual(['MOD_X', 'MOD_Y']);
    expect(src.module_id).toBe('MOD_X');
    expect(src.tasks).toEqual([{ task_ref: 'T1' }, { task_ref: 'T2' }]);
  });
  it('is a no-op when the module already pins that tier', () => {
    const s2 = { ...scn, modules: ['MOD_X_QT4', 'MOD_Y'] };
    const src2 = { module_id: 'MOD_X_QT4', phase: 'apply', tasks: [] };
    const r = forkModuleForTier(s2, 'MOD_X_QT4', src2, 'QT4');
    expect(r.created).toBe(false);
    expect(r.scenario).toBe(s2);
    expect(r.module).toBe(src2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: FAIL — `forkModuleForTier` not exported.

- [ ] **Step 3: Add `forkModuleForTier` to `tier-files.js`:**

```js
// Clone a shared module into a tier copy (MOD_..._QT<n>) and swap the first
// occurrence of moduleId in scenario.modules to the fork. Additive: source
// scenario/module untouched. No-op when moduleId already pins that tier.
export function forkModuleForTier(scenario, moduleId, sourceModule, tier) {
  const forkedId = tierId(moduleId, tier);
  if (forkedId === moduleId) return { scenario, module: sourceModule, created: false };
  const module = {
    ...sourceModule,
    module_id: forkedId,
    tasks: (sourceModule.tasks || []).map(t => ({ ...t })),
  };
  const modules = [...(scenario.modules || [])];
  const i = modules.indexOf(moduleId);
  if (i !== -1) modules[i] = forkedId;
  return { scenario: { ...scenario, modules }, module, created: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/tier-files.js tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js
git commit -m "feat(qt-builder): forkModuleForTier (clone shared module + swap scenario ref)"
```

---

### Task 3: Module composition — `addModuleToTier` / `removeModuleFromTier` / `moveModule`

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/tier-files.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js`

**Interfaces:**
- Produces (all return a NEW scenario; same ref on no-op):
  - `addModuleToTier(scenario, moduleId, index?) → scenario` — insert `moduleId` into `modules[]` (append if `index` omitted/out of range; repeats allowed).
  - `removeModuleFromTier(scenario, moduleId) → scenario` — remove the first occurrence.
  - `moveModule(scenario, from, to) → scenario` — reorder.

- [ ] **Step 1: Write the failing test** — append to `tier-files.test.js`:

```js
import { addModuleToTier, removeModuleFromTier, moveModule } from '../tier-files.js';

describe('module composition', () => {
  const scn = { scenario_id: 'S', modules: ['A', 'B', 'C'] };

  it('appends a module by default and inserts at an index', () => {
    expect(addModuleToTier(scn, 'D').modules).toEqual(['A', 'B', 'C', 'D']);
    expect(addModuleToTier(scn, 'D', 1).modules).toEqual(['A', 'D', 'B', 'C']);
    expect(scn.modules).toEqual(['A', 'B', 'C']);          // unmutated
  });
  it('allows repeats (for coats)', () => {
    expect(addModuleToTier(scn, 'B').modules).toEqual(['A', 'B', 'C', 'B']);
  });
  it('removes the first occurrence; no-op (same ref) when absent', () => {
    expect(removeModuleFromTier(scn, 'B').modules).toEqual(['A', 'C']);
    expect(removeModuleFromTier(scn, 'Z')).toBe(scn);
  });
  it('reorders; no-op (same ref) for out-of-range or equal indices', () => {
    expect(moveModule(scn, 0, 2).modules).toEqual(['B', 'C', 'A']);
    expect(moveModule(scn, 1, 1)).toBe(scn);
    expect(moveModule(scn, 0, 9)).toBe(scn);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: FAIL — the three functions are not exported.

- [ ] **Step 3: Add the three functions to `tier-files.js`:**

```js
// Insert a module id into the tier scenario's modules[] (append by default, or
// at index; repeats allowed for coats). Always returns a new scenario.
export function addModuleToTier(scenario, moduleId, index) {
  const modules = [...(scenario.modules || [])];
  if (index == null || index < 0 || index > modules.length) modules.push(moduleId);
  else modules.splice(index, 0, moduleId);
  return { ...scenario, modules };
}

// Remove the first occurrence of moduleId; same ref when absent.
export function removeModuleFromTier(scenario, moduleId) {
  const modules = [...(scenario.modules || [])];
  const i = modules.indexOf(moduleId);
  if (i === -1) return scenario;
  modules.splice(i, 1);
  return { ...scenario, modules };
}

// Reorder modules[] from index → to; same ref on no-op / out-of-range.
export function moveModule(scenario, from, to) {
  const modules = [...(scenario.modules || [])];
  if (from < 0 || from >= modules.length || to < 0 || to >= modules.length || from === to) return scenario;
  const [m] = modules.splice(from, 1);
  modules.splice(to, 0, m);
  return { ...scenario, modules };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/tier-files.js tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js
git commit -m "feat(qt-builder): per-tier module composition (add/remove/reorder modules)"
```

---

### Task 4: Task composition — `addTask` / `removeTask`

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/tier-files.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js`

**Interfaces:**
- Produces (new module; same ref on no-op):
  - `addTask(module, taskId) → module` — append `{ task_ref: taskId }` (no `applies_when`); dedup by `task_ref`.
  - `removeTask(module, taskId) → module` — remove entries whose `task_ref === taskId`.

- [ ] **Step 1: Write the failing test** — append to `tier-files.test.js`:

```js
import { addTask, removeTask } from '../tier-files.js';

describe('task composition', () => {
  const mod = { module_id: 'MOD_X_QT4', phase: 'apply', tasks: [{ task_ref: 'T1' }] };

  it('appends a plain { task_ref } with NO applies_when', () => {
    const out = addTask(mod, 'T2');
    expect(out.tasks).toEqual([{ task_ref: 'T1' }, { task_ref: 'T2' }]);
    expect(out.tasks[1].applies_when).toBeUndefined();
    expect(mod.tasks).toEqual([{ task_ref: 'T1' }]);       // unmutated
  });
  it('dedups by task_ref (same ref on no-op)', () => {
    expect(addTask(mod, 'T1')).toBe(mod);
  });
  it('removes by task_ref; same ref when absent', () => {
    expect(removeTask(mod, 'T1').tasks).toEqual([]);
    expect(removeTask(mod, 'Z')).toBe(mod);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: FAIL — `addTask`/`removeTask` not exported.

- [ ] **Step 3: Add the two functions to `tier-files.js`:**

```js
// Append an existing task as a plain { task_ref } entry — NEVER with
// applies_when.quality_tier. Dedup by task_ref (same ref on no-op).
export function addTask(module, taskId) {
  const tasks = module.tasks || [];
  if (tasks.some(t => t && t.task_ref === taskId)) return module;
  return { ...module, tasks: [...tasks, { task_ref: taskId }] };
}

// Remove every entry whose task_ref matches; same ref when none matched.
export function removeTask(module, taskId) {
  const tasks = module.tasks || [];
  const next = tasks.filter(t => !(t && t.task_ref === taskId));
  if (next.length === tasks.length) return module;
  return { ...module, tasks: next };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/tier-files.js tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js
git commit -m "feat(qt-builder): per-tier task composition (add/remove existing tasks, no applies_when)"
```

---

### Task 5: Composition smoke — the full fork→edit flow at the data level

**Files:**
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js`

**Interfaces:**
- Consumes: all Task 1–4 exports. (No new production code — this proves the ops compose into the authoring flow the UI will drive, and that sources stay pristine.)

- [ ] **Step 1: Write the test** — append to `tier-files.test.js`:

```js
import { forkScenarioForTier as fS, forkModuleForTier as fM, addModuleToTier as aM, addTask as aT } from '../tier-files.js';

describe('fork→edit composition smoke', () => {
  it('forks a baseline to QT5, forks a module, adds a task, and adds a whole module — sources untouched', () => {
    const baseline = { scenario_id: 'SCN_BASE', matches: { paintable_item: 'x', application_method: 'brush' }, modules: ['MOD_PREP', 'MOD_APPLY'] };
    const applyMod = { module_id: 'MOD_APPLY', phase: 'apply', tasks: [{ task_ref: 'T_COAT' }] };

    // 1) QT5 needs its own scenario.
    const { scenario: s1, created: c1 } = fS(baseline, 'QT5');
    expect(c1).toBe(true);
    expect(s1.matches.quality_tier).toBe('QT5');

    // 2) QT5's apply module needs an extra task → fork it + swap the ref.
    const { scenario: s2, module: m2 } = fM(s1, 'MOD_APPLY', applyMod, 'QT5');
    expect(s2.modules).toEqual(['MOD_PREP', 'MOD_APPLY_QT5']);
    const m3 = aT(m2, 'T_EXTRA_SAND');
    expect(m3.tasks.map(t => t.task_ref)).toEqual(['T_COAT', 'T_EXTRA_SAND']);

    // 3) QT5 also needs a whole extra module the baseline lacks.
    const s3 = aM(s2, 'MOD_INSPECT');
    expect(s3.modules).toEqual(['MOD_PREP', 'MOD_APPLY_QT5', 'MOD_INSPECT']);

    // Sources are pristine — baseline and the shared module never changed.
    expect(baseline.matches.quality_tier).toBeUndefined();
    expect(baseline.modules).toEqual(['MOD_PREP', 'MOD_APPLY']);
    expect(applyMod.tasks).toEqual([{ task_ref: 'T_COAT' }]);
  });
});
```

- [ ] **Step 2: Run the test — expect PASS** (it composes already-built functions).

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/tier-files.test.js`
Expected: PASS (all tier-files tests green).

- [ ] **Step 3: Run the full suite to confirm no regressions** (this task adds only a test; the new module is not yet imported anywhere else).

Run: `cd "tools/paintscope" && npx vitest run`
Expected: PASS (baseline count + the new tier-files tests).

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-files.test.js
git commit -m "test(qt-builder): fork→edit composition smoke (sources pristine, drafts correct)"
```

---

## Self-Review

**Spec coverage (§8 of the design):**
- `forkScenarioForTier` → Task 1. ✓
- `forkModuleForTier` → Task 2. ✓
- `addModuleToTier` / `removeModuleFromTier` / `moveModule` (scenario-level module composition) → Task 3. ✓
- `addTask` / `removeTask` (existing-task, no `applies_when.quality_tier`) → Task 4. ✓
- Copy-on-write / additive / immutability → asserted in every task + the Task 5 smoke (sources pristine). ✓
- Helpers `tierId` (naming convention) + `scenarioTierPin` → Task 1. ✓

**Out of Phase 1a (correctly deferred):** the vantage-data derivation + grid UI (Phase 1b), the `applies_when.quality_tier` deletion + migration report (Phase 1c), draft persistence/merge wiring (1b — these pure ops are consumed there). No engine changes anywhere.

**Placeholder scan:** none — every step has complete code, commands, expected output.

**Type consistency:** `forkScenarioForTier` returns `{scenario, created}`; `forkModuleForTier` returns `{scenario, module, created}`; the module/task ops return a bare payload. The Task 5 smoke consumes those exact shapes (`{scenario, created}` destructured, `{scenario, module}` destructured). `tierId`/`scenarioTierPin` signatures match their callers in `forkScenarioForTier`/`forkModuleForTier`.

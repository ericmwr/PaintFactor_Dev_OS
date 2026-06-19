# QT Builder Phase 2d — Per-tier Rates + FAC_QT Overrides — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two opt-in editing surfaces to the QT Builder — per-tier task rates (`rates_by_tier`, task drafts) and per-tier FAC_QT overrides (`modifier_overrides.FAC_QT`, scenario drafts) — plus two polish fixes (stable row order on toggle; disable inputs during save).

**Architecture:** Two new pure/immutable compile modules under `qt-builder/` produce draft payloads the engine already honors (no engine changes). `QTBuilder.jsx` wires them through the existing draft → overlay pattern. Per-tier rates auto-disable FAC_QT for the task (task-level `modifier_eligibility.qt=false`) to avoid double-counting.

**Tech Stack:** React 19 (no TypeScript, inline styles), Vite 7, Vitest 3, idb. PaintScope app under `C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope/`.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-06-19-qt-builder-phase2d-rates-modifiers-design.md`. Every task implicitly inherits its decisions.
- **No engine changes.** `rates_by_tier` and `modifier_overrides` are already implemented + tested.
- **Immutability:** all compile helpers return a new object (or the same reference on a no-op); never mutate inputs.
- **Tiers:** `QT_BUCKETS = ['QT2','QT3','QT4','QT5']` from `src/data/quality-tier.js`.
- **Draft shape:** save calls take `{ id, payload, status: 'draft' }` (the db stamps `updated_at`). Active = `status ∈ {draft, local_override}`.
- **rates_by_tier sharp edge:** a firing tier absent from the map makes the task **skip** that tier — always write a full map over firing tiers.
- **rates_by_tier ⟂ FAC_QT:** never both. Writing `rates_by_tier` must also set task `modifier_eligibility.qt=false`.
- **Commands** (run from `tools/paintscope/`): tests `npx vitest run [path]`; build `npx vite build`; dev `npm run dev`.
- **Working dir for git:** repo root is `C:/Eric_AI_Playground/Claude Code Uni/`; files live under `Claude/`. Stage only Phase 2d paths — never `git add -A` (the tree has unrelated uncommitted work).
- **Branch:** `feature/qt-builder-phase2d` (already created off `main` @ 1e38143). Do NOT push or merge.
- **Commit style:** `feat(qt-builder): …` / `fix(qt-builder): …`, with trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

All file paths below are relative to `tools/paintscope/src/` unless noted.

---

### Task 1: `tier-rates.js` compile module (per-tier rates)

**Files:**
- Create: `components/authoring/qt-builder/tier-rates.js`
- Test: `components/authoring/qt-builder/__tests__/tier-rates.test.js`

**Interfaces:**
- Consumes: `getFactor(bundle, 'FAC_QT', tier)` from `engine/modifier-registry.js`; `QT_BUCKETS` from `data/quality-tier.js`.
- Produces:
  - `mergeTaskDrafts(canonicalTasks: object, drafts: array) → object` (task-id-keyed map, active drafts win).
  - `rateEditable(task) → { editable: boolean, reason: string }`.
  - `effectiveTierRates(task, firingTiers: string[], bundle) → { editable, reason, byTier: { [tier]: number } }` (covers every firing tier).
  - `setTierRate(task, editTier, value: number, firingTiers: string[], bundle) → task` (new payload with full `rates_by_tier` over firing tiers + `modifier_eligibility.qt=false`; same ref on no-op).

- [ ] **Step 1: Write the failing test**

Create `components/authoring/qt-builder/__tests__/tier-rates.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { mergeTaskDrafts, rateEditable, effectiveTierRates, setTierRate } from '../tier-rates.js';

// FAC_QT fallback factors: QT2 0.80, QT3 1.00, QT4 1.30, QT5 1.50.
const bundle = { modifiers: {} };
const flat = () => ({ task_id: 'TSK_A', name: 'A', uom: 'SF', rate_per_hour: 600 });

describe('mergeTaskDrafts', () => {
  it('overlays active drafts by id, skips published', () => {
    const canon = { TSK_A: { task_id: 'TSK_A', rate_per_hour: 600 } };
    const drafts = [
      { id: 'TSK_A', status: 'draft', payload: { task_id: 'TSK_A', rate_per_hour: 600, rates_by_tier: { QT3: 600 } } },
      { id: 'TSK_B', status: 'published', payload: { task_id: 'TSK_B' } },
    ];
    const out = mergeTaskDrafts(canon, drafts);
    expect(out.TSK_A.rates_by_tier).toEqual({ QT3: 600 });
    expect(out.TSK_B).toBeUndefined();
  });
});

describe('rateEditable', () => {
  it('editable for scalar rate_per_hour', () => { expect(rateEditable(flat()).editable).toBe(true); });
  it('editable for existing rates_by_tier', () => { expect(rateEditable({ rates_by_tier: { QT4: 600 } }).editable).toBe(true); });
  it('not editable for rates[] / rates_by_coat / fixed_minutes', () => {
    expect(rateEditable({ rates: [{ rate_per_hour: 1 }] }).editable).toBe(false);
    expect(rateEditable({ rates_by_coat: { 1: 1 } }).editable).toBe(false);
    expect(rateEditable({ fixed_minutes: 30 }).editable).toBe(false);
  });
});

describe('effectiveTierRates', () => {
  it('seeds each firing tier with baseRate / FAC_QT[tier]', () => {
    const r = effectiveTierRates(flat(), ['QT3', 'QT4', 'QT5'], bundle);
    expect(r.byTier).toEqual({ QT3: 600, QT4: 462, QT5: 400 }); // 600/1, 600/1.3≈462, 600/1.5=400
  });
  it('prefers an existing rates_by_tier entry over the seed', () => {
    const t = { rate_per_hour: 600, rates_by_tier: { QT5: 420 } };
    const r = effectiveTierRates(t, ['QT4', 'QT5'], bundle);
    expect(r.byTier).toEqual({ QT4: 462, QT5: 420 });
  });
  it('carries the nearest authored tier forward when no base exists (missing-tier fallback)', () => {
    const t = { rates_by_tier: { QT4: 600 } };
    const r = effectiveTierRates(t, ['QT4', 'QT5'], bundle);
    expect(r.byTier).toEqual({ QT4: 600, QT5: 600 });
  });
});

describe('setTierRate', () => {
  it('writes a full firing map and disables FAC_QT for the task', () => {
    const out = setTierRate(flat(), 'QT5', 380, ['QT3', 'QT4', 'QT5'], bundle);
    expect(out.rates_by_tier).toEqual({ QT3: 600, QT4: 462, QT5: 380 });
    expect(out.modifier_eligibility).toEqual({ qt: false });
  });
  it('preserves other eligibility keys (shallow merge)', () => {
    const t = { ...flat(), modifier_eligibility: { height: true, texture: true } };
    const out = setTierRate(t, 'QT4', 500, ['QT3', 'QT4'], bundle);
    expect(out.modifier_eligibility).toEqual({ height: true, texture: true, qt: false });
  });
  it('does not mutate the input and no-ops on bad value', () => {
    const t = flat();
    expect(setTierRate(t, 'QT3', 0, ['QT3'], bundle)).toBe(t);
    setTierRate(t, 'QT3', 500, ['QT3'], bundle);
    expect(t.rates_by_tier).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/authoring/qt-builder/__tests__/tier-rates.test.js`
Expected: FAIL — cannot resolve `../tier-rates.js`.

- [ ] **Step 3: Write the implementation**

Create `components/authoring/qt-builder/tier-rates.js`:

```js
// Per-tier rate authoring for the QT Builder. A task's rates_by_tier map sets an
// explicit production rate per quality tier; the engine reads it at
// resolveTaskRate priority 3 (a tier absent from the map = the task SKIPS that
// tier). An explicit per-tier rate and the FAC_QT multiplier would double-count,
// so opting a task in also writes task-level modifier_eligibility.qt=false
// (shallow over the module — kills only QT, preserves height/texture/complexity).
// All helpers are immutable so callers can save the result as a task draft.

import { getFactor } from '../../../engine/modifier-registry.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';

const ACTIVE_DRAFT = new Set(['draft', 'local_override']);

export function mergeTaskDrafts(canonicalTasks, drafts) {
  const out = { ...(canonicalTasks || {}) };
  for (const d of drafts || []) {
    if (d && d.payload && ACTIVE_DRAFT.has(d.status)) out[d.id] = d.payload;
  }
  return out;
}

// Per-tier rate editing is supported for a scalar rate_per_hour baseline or an
// existing rates_by_tier map. rates[]/rates_by_coat/fixed_minutes shapes are out
// of scope for v1 (editing them here could corrupt the shape).
export function rateEditable(task) {
  if (!task) return { editable: false, reason: 'No task' };
  if (Array.isArray(task.rates)) return { editable: false, reason: 'Variant rates — edit in Task editor' };
  if (task.rates_by_coat) return { editable: false, reason: 'Per-coat rates — edit in Task editor' };
  if (task.rates_by_tier && typeof task.rates_by_tier === 'object') return { editable: true, reason: '' };
  if (typeof task.rate_per_hour === 'number' && task.rate_per_hour > 0) return { editable: true, reason: '' };
  if (typeof task.fixed_minutes === 'number') return { editable: false, reason: 'Fixed-minutes task — no rate' };
  return { editable: false, reason: 'No scalar rate to seed from' };
}

// Seed/current per-tier rate for each firing tier. An existing rates_by_tier
// entry wins; otherwise baseRate / FAC_QT[tier] reproduces today's effective
// rate (estimate-neutral opt-in). Missing-tier fallback carries the nearest
// authored tier forward (then back) so byTier covers every firing tier.
export function effectiveTierRates(task, firingTiers, bundle) {
  const { editable, reason } = rateEditable(task);
  const byTier = {};
  if (!editable || !Array.isArray(firingTiers)) return { editable, reason, byTier };
  const existing = task.rates_by_tier && typeof task.rates_by_tier === 'object' ? task.rates_by_tier : null;
  const base = typeof task.rate_per_hour === 'number' && task.rate_per_hour > 0 ? task.rate_per_hour : null;
  for (const tier of firingTiers) {
    if (existing && typeof existing[tier] === 'number') { byTier[tier] = existing[tier]; continue; }
    if (base != null) {
      const f = getFactor(bundle, 'FAC_QT', tier) || 1;
      byTier[tier] = Math.round(base / f);
    }
  }
  const ordered = QT_BUCKETS.filter(t => firingTiers.includes(t));
  for (let i = 0, last = null; i < ordered.length; i++) {
    const t = ordered[i];
    if (byTier[t] != null) last = byTier[t]; else if (last != null) byTier[t] = last;
  }
  for (let i = ordered.length - 1, next = null; i >= 0; i--) {
    const t = ordered[i];
    if (byTier[t] != null) next = byTier[t]; else if (next != null) byTier[t] = next;
  }
  return { editable, reason, byTier };
}

// Write a full rates_by_tier map over firingTiers (edited tier = value, others
// kept from current/seed) and neutralize FAC_QT for the task. Immutable;
// returns the same task on a no-op.
export function setTierRate(task, editTier, value, firingTiers, bundle) {
  if (!task || !Array.isArray(firingTiers) || !firingTiers.includes(editTier)) return task;
  if (!Number.isFinite(value) || value <= 0) return task;
  const { editable, byTier } = effectiveTierRates(task, firingTiers, bundle);
  if (!editable) return task;
  const merged = { ...byTier, [editTier]: Math.round(value) };
  const rates_by_tier = {};
  for (const tier of firingTiers) if (typeof merged[tier] === 'number') rates_by_tier[tier] = merged[tier];
  const modifier_eligibility = { ...(task.modifier_eligibility || {}), qt: false };
  return { ...task, rates_by_tier, modifier_eligibility };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/authoring/qt-builder/__tests__/tier-rates.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/authoring/qt-builder/tier-rates.js Claude/tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-rates.test.js
git commit -m "feat(qt-builder): per-tier rate compile module (rates_by_tier + qt-off)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `tier-qt-factor.js` compile module (FAC_QT overrides)

**Files:**
- Create: `components/authoring/qt-builder/tier-qt-factor.js`
- Test: `components/authoring/qt-builder/__tests__/tier-qt-factor.test.js`

**Interfaces:**
- Consumes: `findBestMatch(bundle, ctx)` from `engine/scenario-matcher.js`; `getFactor` from `engine/modifier-registry.js`; `QT_BUCKETS`.
- Produces:
  - `deriveTierQtFactors(bundle, sel) → { [tier]: { scenarioId, value: number, isOverride: boolean } | null }`.
  - `setQtFactor(scenario, tier, value: number) → scenario` (sets `modifier_overrides.FAC_QT[tier]`; same ref on no-op).
  - `clearQtFactor(scenario, tier) → scenario` (removes that tier's override; prunes empty objects).

- [ ] **Step 1: Write the failing test**

Create `components/authoring/qt-builder/__tests__/tier-qt-factor.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { deriveTierQtFactors, setQtFactor, clearQtFactor } from '../tier-qt-factor.js';

// One multi-tier scenario serving QT3-5, with a QT5 FAC_QT override.
function multiTier() {
  return {
    modifiers: {}, modules: {},
    scenarios: [{
      scenario_id: 'SCN_M',
      matches: { paintable_item: 'w', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' },
      modules: [],
      modifier_overrides: { FAC_QT: { QT5: 1.8 } },
    }],
  };
}
// Per-tier-file: QT3 and QT5 scenarios; override belongs on the QT5 file.
function perTierFile() {
  return {
    modifiers: {}, modules: {},
    scenarios: [
      { scenario_id: 'SCN_QT3', matches: { paintable_item: 'c', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT3', coating_type: 'paint' }, modules: [] },
      { scenario_id: 'SCN_QT5', matches: { paintable_item: 'c', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT5', coating_type: 'paint' }, modules: [], modifier_overrides: { FAC_QT: { QT5: 2.0 } } },
    ],
  };
}
const selM = { paintable_item: 'w', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' };
const selP = { paintable_item: 'c', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' };

describe('deriveTierQtFactors', () => {
  it('reports override value+flag for the overridden tier, global default elsewhere', () => {
    const f = deriveTierQtFactors(multiTier(), selM);
    expect(f.QT2).toBeNull();
    expect(f.QT3).toEqual({ scenarioId: 'SCN_M', value: 1.0, isOverride: false });
    expect(f.QT5).toEqual({ scenarioId: 'SCN_M', value: 1.8, isOverride: true });
  });
  it('routes per-tier-file: the QT5 override resolves against the QT5 scenario', () => {
    const f = deriveTierQtFactors(perTierFile(), selP);
    expect(f.QT3).toEqual({ scenarioId: 'SCN_QT3', value: 1.0, isOverride: false });
    expect(f.QT5).toEqual({ scenarioId: 'SCN_QT5', value: 2.0, isOverride: true });
  });
});

describe('setQtFactor / clearQtFactor', () => {
  it('sets a nested override immutably', () => {
    const scn = { scenario_id: 'S' };
    const out = setQtFactor(scn, 'QT4', 1.4);
    expect(out.modifier_overrides).toEqual({ FAC_QT: { QT4: 1.4 } });
    expect(scn.modifier_overrides).toBeUndefined();
  });
  it('merges with an existing FAC_QT map', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_QT: { QT5: 1.8 } } };
    expect(setQtFactor(scn, 'QT4', 1.4).modifier_overrides.FAC_QT).toEqual({ QT4: 1.4, QT5: 1.8 });
  });
  it('clears one tier and prunes empty objects', () => {
    const scn = { scenario_id: 'S', modifier_overrides: { FAC_QT: { QT5: 1.8 } } };
    expect(clearQtFactor(scn, 'QT5').modifier_overrides).toBeUndefined();
  });
  it('clear is a no-op when the tier has no override', () => {
    const scn = { scenario_id: 'S' };
    expect(clearQtFactor(scn, 'QT5')).toBe(scn);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/authoring/qt-builder/__tests__/tier-qt-factor.test.js`
Expected: FAIL — cannot resolve `../tier-qt-factor.js`.

- [ ] **Step 3: Write the implementation**

Create `components/authoring/qt-builder/tier-qt-factor.js`:

```js
// Per-tier FAC_QT override authoring for the QT Builder. Writes
// scenario.modifier_overrides.FAC_QT[tier]; the engine reads it via resolveFactor
// (a scenario override beats the global FAC_QT table). The governing scenario is
// resolved PER tier (findBestMatch), so an override lands on the file that serves
// that tier under both the multi-tier and per-tier-file scenario patterns.
// Immutable; callers save the result as a scenario draft. mergeScenarioDrafts is
// reused from tier-coats.js.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { getFactor } from '../../../engine/modifier-registry.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';

export function deriveTierQtFactors(bundle, sel) {
  const out = {};
  for (const tier of QT_BUCKETS) {
    const ctx = {
      paintable_item: sel.paintable_item, application_method: sel.application_method,
      substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
    };
    const { scenario } = findBestMatch(bundle, ctx);
    if (!scenario) { out[tier] = null; continue; }
    const ov = scenario.modifier_overrides?.FAC_QT?.[tier];
    out[tier] = {
      scenarioId: scenario.scenario_id,
      value: typeof ov === 'number' ? ov : getFactor(bundle, 'FAC_QT', tier),
      isOverride: typeof ov === 'number',
    };
  }
  return out;
}

export function setQtFactor(scenario, tier, value) {
  if (!scenario || !Number.isFinite(value) || value <= 0) return scenario;
  const mo = scenario.modifier_overrides || {};
  const fq = mo.FAC_QT || {};
  return { ...scenario, modifier_overrides: { ...mo, FAC_QT: { ...fq, [tier]: value } } };
}

export function clearQtFactor(scenario, tier) {
  const fq = scenario?.modifier_overrides?.FAC_QT;
  if (!fq || !(tier in fq)) return scenario;
  const nextFq = { ...fq };
  delete nextFq[tier];
  const mo = { ...scenario.modifier_overrides };
  if (Object.keys(nextFq).length === 0) delete mo.FAC_QT; else mo.FAC_QT = nextFq;
  const next = { ...scenario, modifier_overrides: mo };
  if (Object.keys(mo).length === 0) delete next.modifier_overrides;
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/authoring/qt-builder/__tests__/tier-qt-factor.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/authoring/qt-builder/tier-qt-factor.js Claude/tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-qt-factor.test.js
git commit -m "feat(qt-builder): per-tier FAC_QT override compile module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Stable row order on toggle (`derive-tier-ladder.js`)

**Files:**
- Modify: `components/authoring/qt-builder/derive-tier-ladder.js`
- Test: `components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`

**Interfaces:**
- `deriveTierLadder(bundle, sel)` return shape is unchanged (`{ tiers, served, baseline, rows, groups, warnings }`); only row ordering becomes stable. Row order is now derived from an unfiltered structural walk of the served scenarios' module/task lists (baseline first).

- [ ] **Step 1: Write the failing test**

Append to `components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`:

```js
// A baseline task explicitly toggled off at QT3 (applies_when narrowed to
// QT4/QT5) must keep its structural position (entry 0 in the module), not jump
// below its sibling. Pre-fix, order was sourced from the first tier whose
// filtered walk contained the task, so this returned ['TSK_Y','TSK_X'].
function toggledOffBaselineBundle() {
  return {
    scenarios: [{
      scenario_id: 'SCN_T', domain: 'interior',
      matches: { paintable_item: 'w', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' },
      modules: ['MOD_P'],
    }],
    modules: {
      MOD_P: { module_id: 'MOD_P', phase: 'prep', tasks: [
        { task_ref: 'TSK_X', applies_when: { quality_tier: ['QT4', 'QT5'] } },
        { task_ref: 'TSK_Y' },
      ] },
    },
    tasks: { TSK_X: { task_id: 'TSK_X', name: 'X' }, TSK_Y: { task_id: 'TSK_Y', name: 'Y' } },
    modifiers: {},
  };
}

describe('deriveTierLadder — stable row order on toggle', () => {
  it('keeps a baseline task toggled off at QT3 in its structural position', () => {
    const l = deriveTierLadder(toggledOffBaselineBundle(), { paintable_item: 'w', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(l.rows.map(r => r.task_id)).toEqual(['TSK_X', 'TSK_Y']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`
Expected: FAIL — the new case returns `['TSK_Y','TSK_X']`; existing cases still pass.

- [ ] **Step 3: Apply the fix**

In `derive-tier-ladder.js`, **keep the scenario** on each `perTier` entry. Replace:

```js
    const { scenario, tasks, warnings: w } = tierTaskSet(bundle, ctx);
    for (const msg of w) warnings.push(`${tier}: ${msg}`);
    perTier[tier] = scenario ? { scenarioId: scenario.scenario_id, tasks } : null;
```

with:

```js
    const { scenario, tasks, warnings: w } = tierTaskSet(bundle, ctx);
    for (const msg of w) warnings.push(`${tier}: ${msg}`);
    perTier[tier] = scenario ? { scenarioId: scenario.scenario_id, scenario, tasks } : null;
```

Then replace the row-build + sort block (the `const rows = …map(…)` through `rows.forEach(r => { delete r._order; });`):

```js
  const rows = [...taskInfo.entries()].map(([id, info]) => {
    const inBaseline = baseline ? perTier[baseline].tasks.has(id) : false;
    const cells = {};
    for (const t of tiers) {
      const pt = perTier[t];
      if (!pt) { cells[t] = 'na'; continue; }
      cells[t] = pt.tasks.has(id) ? (inBaseline ? 'fires' : 'added') : 'skip';
    }
    return { task_id: id, name: info.name, phase: info.phase, moduleIds: [...moduleIdsByTask.get(id)].sort(), _order: info.order };
  });

  rows.sort((a, b) => {
    const pa = PHASE_ORDER.indexOf(a.phase); const pb = PHASE_ORDER.indexOf(b.phase);
    const pai = pa === -1 ? PHASE_ORDER.length : pa;
    const pbi = pb === -1 ? PHASE_ORDER.length : pb;
    if (pai !== pbi) return pai - pbi;
    return a._order - b._order;
  });
  rows.forEach(r => { delete r._order; });
```

with:

```js
  // Stable row order from an UNFILTERED structural walk of the served scenarios'
  // module/task lists (baseline first). A task entry's index in mod.tasks does
  // not change when its applies_when is narrowed, so toggling a baseline task off
  // never reorders its row.
  const structuralOrder = new Map();
  let sidx = 0;
  for (const t of collectOrder) {
    const pt = perTier[t];
    if (!pt || !pt.scenario) continue;
    for (const modId of pt.scenario.modules || []) {
      const mod = bundle.modules?.[modId];
      if (!mod || !Array.isArray(mod.tasks)) continue;
      for (const entry of mod.tasks) {
        const ref = entry?.task_ref;
        if (ref && !structuralOrder.has(ref)) structuralOrder.set(ref, sidx++);
      }
    }
  }

  const rows = [...taskInfo.entries()].map(([id, info]) => {
    const inBaseline = baseline ? perTier[baseline].tasks.has(id) : false;
    const cells = {};
    for (const t of tiers) {
      const pt = perTier[t];
      if (!pt) { cells[t] = 'na'; continue; }
      cells[t] = pt.tasks.has(id) ? (inBaseline ? 'fires' : 'added') : 'skip';
    }
    return { task_id: id, name: info.name, phase: info.phase, moduleIds: [...moduleIdsByTask.get(id)].sort(), cells };
  });

  rows.sort((a, b) => {
    const pa = PHASE_ORDER.indexOf(a.phase); const pb = PHASE_ORDER.indexOf(b.phase);
    const pai = pa === -1 ? PHASE_ORDER.length : pa;
    const pbi = pb === -1 ? PHASE_ORDER.length : pb;
    if (pai !== pbi) return pai - pbi;
    const oa = structuralOrder.has(a.task_id) ? structuralOrder.get(a.task_id) : Infinity;
    const ob = structuralOrder.has(b.task_id) ? structuralOrder.get(b.task_id) : Infinity;
    return oa - ob;
  });
```

(Note: the original `map` returned `cells` — keep that. The only deltas are: the `cells` object is still built; `_order` is removed; sort uses `structuralOrder`.)

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`
Expected: PASS — the new case returns `['TSK_X','TSK_Y']`; all pre-existing cases (`['TSK_CLEAN','TSK_DETAIL_SAND','TSK_COAT']`, groups, moduleIds) still pass.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js Claude/tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js
git commit -m "fix(qt-builder): stable row order via unfiltered structural walk

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `QTBuilder.jsx` integration (rate editor, QT-multiplier row, busy state)

**Files:**
- Modify: `components/authoring/QTBuilder.jsx`

**Interfaces:**
- Consumes: `mergeTaskDrafts, effectiveTierRates, setTierRate, rateEditable` (Task 1); `deriveTierQtFactors, setQtFactor, clearQtFactor` (Task 2); `useTaskDrafts` (`hooks/useTaskDrafts.js`).
- Deliverable: app builds clean and renders the QT-multiplier row + expandable per-tier rate editors. (UI task — verified by build here, live in Task 5; matches the 2a–2c verification pattern.)

- [ ] **Step 1: Add imports**

After the existing `import { mergeScenarioDrafts, setFinishCoats, deriveTierCoats } from './qt-builder/tier-coats.js';` line, add:

```js
import { mergeTaskDrafts, effectiveTierRates, setTierRate, rateEditable } from './qt-builder/tier-rates.js';
import { deriveTierQtFactors, setQtFactor, clearQtFactor } from './qt-builder/tier-qt-factor.js';
```

After `import { useScenarioDrafts } from '../../hooks/useScenarioDrafts.js';`, add:

```js
import { useTaskDrafts } from '../../hooks/useTaskDrafts.js';
```

- [ ] **Step 2: Wire the task-drafts hook + merge tasks into the bundle**

After `const { drafts: scenarioDrafts, save: saveScenario } = useScenarioDrafts();`, add:

```js
  const { drafts: taskDrafts, save: saveTask, remove: removeTask } = useTaskDrafts();
```

Replace the `mergedBundle` memo with:

```js
  const mergedBundle = useMemo(
    () => ({
      ...bundle,
      modules: mergeModuleDrafts(bundle.modules, moduleDrafts),
      scenarios: mergeScenarioDrafts(bundle.scenarios, scenarioDrafts),
      tasks: mergeTaskDrafts(bundle.tasks, taskDrafts),
    }),
    [moduleDrafts, scenarioDrafts, taskDrafts]
  );
```

- [ ] **Step 3: Add the QT-factor memo, busy + expanded state, and update draft count**

After the `tierCoats` memo, add:

```js
  const tierQtFactors = useMemo(() => {
    if (!ladder) return {};
    return deriveTierQtFactors(mergedBundle, sel);
  }, [mergedBundle, ladder, substrate, effMethod, effState, effCoating]);

  const [expanded, setExpanded] = useState(null); // task_id whose rate editor is open
```

Replace:

```js
  const activeDraftCount = moduleDrafts.filter(isActive).length + scenarioDrafts.filter(isActive).length;
  const busyRef = useRef(false);
```

with:

```js
  const activeDraftCount = moduleDrafts.filter(isActive).length + scenarioDrafts.filter(isActive).length + taskDrafts.filter(isActive).length;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
```

- [ ] **Step 4: Gate the async handlers with the `busy` flag and add new handlers**

Replace `toggleCell`, `changeCoats`, and `addTask` so each flips `busy` (keep the `busyRef` guard), and append the rate + QT-factor handlers. Replace the whole block from `async function toggleCell` through the end of `async function addTask`:

```js
  async function toggleCell(row, tier) {
    if (!served.includes(tier) || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const firing = new Set(served.filter(t => row.cells[t] === 'fires' || row.cells[t] === 'added'));
      if (firing.has(tier)) firing.delete(tier); else firing.add(tier);
      const desired = [...firing];
      for (const moduleId of row.moduleIds) {
        const mod = mergedBundle.modules[moduleId];
        if (!mod) continue;
        const updated = setTierMembership(mod, row.task_id, desired, served);
        if (updated !== mod) await saveModule({ id: moduleId, payload: updated, status: 'draft' });
      }
    } catch (e) { console.error('QT Builder: toggle failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function changeCoats(tier, newCount) {
    if (busyRef.current || newCount < 1) return;
    const tc = tierCoats[tier];
    if (!tc) return;
    const scn = mergedBundle.scenarios.find(s => s.scenario_id === tc.scenarioId);
    if (!scn) return;
    busyRef.current = true; setBusy(true);
    try {
      const updated = setFinishCoats(scn, mergedBundle.modules, newCount);
      if (updated !== scn) await saveScenario({ id: scn.scenario_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: coats change failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function firingTiersFor(row) {
    return served.filter(t => row.cells[t] === 'fires' || row.cells[t] === 'added');
  }

  async function changeRate(row, tier, value) {
    if (busyRef.current) return;
    const task = mergedBundle.tasks[row.task_id];
    if (!task) return;
    busyRef.current = true; setBusy(true);
    try {
      const updated = setTierRate(task, tier, value, firingTiersFor(row), mergedBundle);
      if (updated !== task) await saveTask({ id: row.task_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: rate change failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function resetRate(row) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await removeTask(row.task_id); }
    catch (e) { console.error('QT Builder: rate reset failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function changeQtFactor(tier, value) {
    if (busyRef.current) return;
    const qf = tierQtFactors[tier];
    if (!qf) return;
    const scn = mergedBundle.scenarios.find(s => s.scenario_id === qf.scenarioId);
    if (!scn) return;
    busyRef.current = true; setBusy(true);
    try {
      const updated = setQtFactor(scn, tier, value);
      if (updated !== scn) await saveScenario({ id: scn.scenario_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: QT factor change failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function clearQt(tier) {
    if (busyRef.current) return;
    const qf = tierQtFactors[tier];
    if (!qf) return;
    const scn = mergedBundle.scenarios.find(s => s.scenario_id === qf.scenarioId);
    if (!scn) return;
    busyRef.current = true; setBusy(true);
    try {
      const updated = clearQtFactor(scn, tier);
      if (updated !== scn) await saveScenario({ id: scn.scenario_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: QT factor clear failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }
```

(The `const [picker, setPicker] = useState(null);` line and `addTask` stay as-is; only add `setBusy` to `addTask` the same way — set `busyRef.current = true; setBusy(true);` at the start and `busyRef.current = false; setBusy(false); setPicker(null);` in `finally`.)

- [ ] **Step 5: Disable the coat steppers while busy**

In the Finish-coats row, replace the two stepper buttons:

```js
                        <button style={stepBtn} disabled={tc.finishCoats <= 1} onClick={() => changeCoats(t, tc.finishCoats - 1)}>−</button>
                        <b>{tc.finishCoats}</b>
                        <button style={stepBtn} onClick={() => changeCoats(t, tc.finishCoats + 1)}>+</button>
```

with:

```js
                        <button style={{ ...stepBtn, opacity: busy ? 0.4 : 1 }} disabled={busy || tc.finishCoats <= 1} onClick={() => changeCoats(t, tc.finishCoats - 1)}>−</button>
                        <b>{tc.finishCoats}</b>
                        <button style={{ ...stepBtn, opacity: busy ? 0.4 : 1 }} disabled={busy} onClick={() => changeCoats(t, tc.finishCoats + 1)}>+</button>
```

- [ ] **Step 6: Add the "QT time multiplier" row**

Immediately after the Interstage-rounds `</tr>` (the row ending `{tiers.map(t => <td key={t} style={coatsCellStyle}>{tierCoats[t] ? tierCoats[t].interstageRounds : '—'}</td>)}`), insert:

```js
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }} title="Per-tier FAC_QT time multiplier for this substrate scenario">QT time multiplier</td>
                {tiers.map(t => {
                  const qf = tierQtFactors[t];
                  if (!qf) return <td key={t} style={coatsCellStyle}><span style={{ color: 'var(--text-muted)' }}>—</span></td>;
                  return (
                    <td key={t} style={coatsCellStyle}>
                      <input type="number" step="0.05" min="0.1"
                        key={`qf:${t}:${qf.value}:${qf.isOverride}`} defaultValue={qf.value} disabled={busy}
                        onBlur={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v) && v > 0 && v !== qf.value) changeQtFactor(t, v); }}
                        style={{ ...qtInput, opacity: busy ? 0.5 : 1 }} />
                      {qf.isOverride && (
                        <div style={{ fontSize: 8, color: 'var(--accent, #82aaff)' }}>
                          override <span onClick={() => !busy && clearQt(t)} title="Revert to global FAC_QT" style={{ cursor: 'pointer', textDecoration: 'underline' }}>×</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
```

- [ ] **Step 7: Add the expand toggle, amber rate pill, and expandable rate sub-row**

Replace the entire task-row `group.rows.map(r => { … })` body (from `const shared = …` through the closing `);` of the returned `<tr>`) with:

```js
                  {group.rows.map(r => {
                    const shared = Math.max(1, ...r.moduleIds.map(m => scenarioRefCount.get(m) || 1));
                    const task = mergedBundle.tasks[r.task_id];
                    const ed = rateEditable(task);
                    const isOpen = expanded === r.task_id;
                    const firing = firingTiersFor(r);
                    const seed = isOpen ? effectiveTierRates(task, firing, mergedBundle) : null;
                    return (
                      <Fragment key={r.task_id}>
                      <tr style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                          <button onClick={() => ed.editable && setExpanded(isOpen ? null : r.task_id)}
                                  disabled={!ed.editable} title={ed.editable ? 'Per-tier rate' : ed.reason}
                                  style={{ ...expandBtn, cursor: ed.editable ? 'pointer' : 'default', opacity: ed.editable ? 1 : 0.25 }}>
                            {isOpen ? '▾' : '▸'}
                          </button>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.task_id}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{r.name}</span>
                          {shared > 1 && <span style={sharedBadge} title={`Edits to this task's module affect ${shared} scenario(s) that reference it, including this view.`}>shared ×{shared}</span>}
                        </td>
                        {tiers.map(t => {
                          const c = CELL[r.cells[t]] || CELL.na;
                          const editable = served.includes(t);
                          const hasRate = task?.rates_by_tier?.[t] != null;
                          return (
                            <td key={t}
                                onClick={editable && !busy ? () => toggleCell(r, t) : undefined}
                                title={editable ? 'Click to toggle this tier' : 'Tier not served'}
                                style={{ textAlign: 'center', padding: '6px 8px', color: c.color, fontWeight: r.cells[t] === 'added' ? 600 : 400, cursor: editable && !busy ? 'pointer' : 'default', userSelect: 'none' }}>
                              {c.icon}
                              {hasRate && <span style={ratePill} title={`Per-tier rate set at ${t}`}>$</span>}
                            </td>
                          );
                        })}
                      </tr>
                      {isOpen && (
                        <tr style={{ background: 'rgba(130,170,255,0.05)' }}>
                          <td style={{ padding: '4px 10px 8px 30px', fontSize: 10, color: 'var(--text-muted)' }}>
                            per-tier rate ({task.uom || 'unit'}/hr) · FAC_QT off for this task
                            {task.rates_by_tier && <span onClick={() => !busy && resetRate(r)} title="Drop the draft, revert to canonical" style={{ marginLeft: 8, cursor: 'pointer', textDecoration: 'underline' }}>reset</span>}
                          </td>
                          {tiers.map(t => {
                            if (!firing.includes(t)) return <td key={t} style={coatsCellStyle}><span style={{ color: 'var(--text-muted)' }}>—</span></td>;
                            return (
                              <td key={t} style={coatsCellStyle}>
                                <input type="number" step="1" min="1"
                                  key={`rate:${r.task_id}:${t}:${seed.byTier[t]}`} defaultValue={seed.byTier[t]} disabled={busy}
                                  onBlur={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v) && v > 0 && v !== seed.byTier[t]) changeRate(r, t, v); }}
                                  style={{ ...qtInput, opacity: busy ? 0.5 : 1 }} />
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
```

(The `<Fragment>` is already imported at the top of the file. The "+ Add task" row that follows in the existing JSX stays unchanged.)

- [ ] **Step 8: Add the new styles**

At the end of the file (after `const stepBtn = …`), add:

```js
const qtInput = { width: 50, padding: '2px 4px', fontSize: 10, textAlign: 'center', background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const ratePill = { marginLeft: 4, fontSize: 8, color: 'var(--accent, #82aaff)', verticalAlign: 'super' };
const expandBtn = { fontSize: 10, lineHeight: 1, marginRight: 6, padding: '0 4px', background: 'transparent', color: 'var(--text-muted)', border: 'none' };
```

- [ ] **Step 9: Build to verify it compiles**

Run: `npx vite build`
Expected: build succeeds (~246 modules), no errors.

- [ ] **Step 10: Commit**

```bash
git add Claude/tools/paintscope/src/components/authoring/QTBuilder.jsx
git commit -m "feat(qt-builder): per-tier rate editor + QT-multiplier row + busy lock

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Full verification (unit gate + live + parity)

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run (from `tools/paintscope/`): `npx vitest run`
Expected: PASS — prior 208 + new `tier-rates` / `tier-qt-factor` / order cases (≈ 221+ total), 0 failures.

- [ ] **Step 2: Parity sanity (all-baseline ladder is estimate-neutral)**

Confirm no estimate drift from an untouched ladder: the new fields only take effect when a draft is written, and `derive-tier-ladder` cells are unchanged. The full `npx vitest run` green (Step 1) — including the existing engine/parity suites — is the gate. If a dedicated parity script is present in repo docs, run it and confirm unchanged totals.

- [ ] **Step 3: Live-verify in the running app**

Run: `npm run dev` (from `tools/paintscope/`). Open the printed URL (`localhost:5173`, or `5183` if taken). In the browser console: `localStorage.setItem('paintscope.admin','1')` then reload. Load the **McLeod** test project. Open **Authoring → QT builder**.

Verify:
1. Pick a substrate with a scalar-rate task (e.g. Drywall walls or Cabinets). Expand a task (▸) → the per-tier boxes show today's effective rate (QT3 = base, QT4 ≈ base/1.3, QT5 = base/1.5). The expander is dimmed/disabled for fixed-minutes or variant-rate tasks.
2. Change QT5's rate → an amber `$` pill appears in the QT5 cell, the draft banner increments, and the estimate for that task at QT5 moves. **reset** clears it back.
3. Edit the **QT time multiplier** row (e.g. QT5 → 1.8) → "override ×" appears, the estimate scales for qt-eligible tasks at QT5, and the per-tier-rate task from step 2 is unaffected (its qt is off). Clear (×) reverts.
4. Toggle a baseline task off at QT3 → its row holds position (no jump).
5. During a save the steppers / QT inputs / rate inputs dim and reject input.

- [ ] **Step 4: Report**

Summarize what was verified (with the McLeod estimate deltas observed) and the final `npx vitest run` count. Do NOT push or merge — await user instruction.

---

## Self-Review

**Spec coverage:**
- §3 per-tier rate (seed, qt-off, full-map, scope guard, missing-tier fallback, shared badge, amber pill, reset) → Tasks 1 + 4. ✓
- §4 FAC_QT override (derive/set/clear, per-tier-file routing, grid row) → Tasks 2 + 4. ✓
- §5.1 stable row order → Task 3. ✓
- §5.2 disable during save (`busy`) → Task 4 (steps 3–7). ✓
- §6 files & tests → Tasks 1–4 create/modify exactly those paths. ✓
- §7 verification → Task 5. ✓
- §8 invariants (absent-tier-skip, task-scoped qt-off, reset=drop-draft, override⟂rate-task, composability) → covered by Task 1/2 tests + Task 5 live checks. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has expected output. ✓

**Type consistency:** `mergeTaskDrafts`/`effectiveTierRates`/`setTierRate`/`rateEditable` and `deriveTierQtFactors`/`setQtFactor`/`clearQtFactor` names + signatures match between the compile modules (Tasks 1/2) and their callers in `QTBuilder.jsx` (Task 4). Draft saves use `{ id, payload, status:'draft' }` throughout. `firingTiersFor(row)` is defined once and reused. ✓

# QT Builder Phase 1b-1 — Vantage View-Model (`derive-vantage.js`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure `deriveVantage(bundle, sel)` view-model that lays out the Scenario → Module → Task hierarchy with quality tiers as columns — aligning forked `MOD_…_QT<n>` modules under their shared base id and classifying every cell as shared / forked / added / absent / na.

**Architecture:** One new pure module, `qt-builder/derive-vantage.js`, consumed later by the `QTBuilder.jsx` rewrite (Phase 1b-2). It resolves the per-tier scenario via `findBestMatch` (reused) over the overlaid bundle and produces a render-ready view-model. No mutation, no engine changes. Implements §3–4 of the Phase 1b spec.

**Tech Stack:** Plain JS/ESM (no TypeScript), Vitest.

## Global Constraints

- **No TypeScript.** Plain `.js`, matching the sibling `qt-builder/*.js`.
- **Pure / read-only.** No mutation of `bundle`/`sel`; no engine calls beyond `findBestMatch`.
- **Tier = file.** `quality_tier` is resolved by matching, never by reading `applies_when.quality_tier`. Task visibility is gated only by `application_method` + `substrate_state` (the selection), never by tier.
- **Module alignment** is by **base id** — `moduleId` with any `_QT[2-5]` token (mid-id or suffix) stripped — so a `_QT5` fork and a shared base share one row.
- **Reference scenario** for the `added` classification = the resolved scenario with `scenarioTierPin === null` (the baseline); if none (an eager all-pinned family), the lowest served tier's scenario.
- **Cell states** — module: `shared` / `forked` / `added` / `absent` / `na`; task: `present` / `added` / `absent` / `na` (tasks never `forked`).
- Constants: `QT_BUCKETS = ['QT2','QT3','QT4','QT5']`; `PHASE_ORDER = ['setup','prep','prime','apply','interstage','finish','cleanup']`.
- Run tests: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`.

## File Structure

- **Create** `tools/paintscope/src/components/authoring/qt-builder/derive-vantage.js` — `deriveVantage(bundle, sel)`.
- **Create** `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`.

---

### Task 1: `deriveVantage` — full view-model

**Files:**
- Create: `tools/paintscope/src/components/authoring/qt-builder/derive-vantage.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`

**Interfaces:**
- Consumes: `findBestMatch` (engine/scenario-matcher), `scenarioTierPin` (qt-builder/tier-files), `QT_BUCKETS`, `PHASE_ORDER`.
- Produces: `deriveVantage(bundle, sel) → { tiers, served, scenarioByTier, isForkByTier, phaseGroups }` (shapes per spec §3).

- [ ] **Step 1: Write the failing test** — create `__tests__/derive-vantage.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { deriveVantage } from '../derive-vantage.js';

// Baseline (no quality_tier → serves all tiers) + a QT5 fork that: forks the
// apply module (MOD_APPLY → MOD_APPLY_QT5) with an extra task, repeats it (coats),
// and adds a whole finish module the baseline lacks.
function bundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_B',
        matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' },
        modules: ['MOD_PREP', 'MOD_APPLY'] },
      { scenario_id: 'SCN_B_QT5',
        matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT5' },
        modules: ['MOD_PREP', 'MOD_APPLY_QT5', 'MOD_APPLY_QT5', 'MOD_GLAZE'] },
    ],
    modules: {
      MOD_PREP:      { phase: 'prep',   name: 'Prep',      tasks: [{ task_ref: 'T_SAND' }] },
      MOD_APPLY:     { phase: 'apply',  name: 'Apply',     tasks: [{ task_ref: 'T_COAT' }] },
      MOD_APPLY_QT5: { phase: 'apply',  name: 'Apply QT5', tasks: [{ task_ref: 'T_COAT' }, { task_ref: 'T_EXTRA' }] },
      MOD_GLAZE:     { phase: 'finish', name: 'Glaze',     tasks: [{ task_ref: 'T_GLAZE' }] },
    },
    tasks: { T_SAND: { name: 'Sand' }, T_COAT: { name: 'Coat' }, T_EXTRA: { name: 'Extra' }, T_GLAZE: { name: 'Glaze coat' } },
  };
}
const sel = { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' };

describe('deriveVantage', () => {
  const v = deriveVantage(bundle(), sel);
  const mod = (b) => v.phaseGroups.flatMap(g => g.modules).find(m => m.baseModuleId === b);

  it('resolves the scenario per tier and flags the fork', () => {
    expect(v.served).toEqual(['QT2', 'QT3', 'QT4', 'QT5']);
    expect(v.scenarioByTier).toEqual({ QT2: 'SCN_B', QT3: 'SCN_B', QT4: 'SCN_B', QT5: 'SCN_B_QT5' });
    expect(v.isForkByTier).toEqual({ QT2: false, QT3: false, QT4: false, QT5: true });
  });

  it('orders phase groups by PHASE_ORDER', () => {
    expect(v.phaseGroups.map(g => g.phase)).toEqual(['prep', 'apply', 'finish']);
  });

  it('classifies a shared module as shared on every tier', () => {
    const m = mod('MOD_PREP');
    expect(m.cells.QT3.state).toBe('shared');
    expect(m.cells.QT5.state).toBe('shared');
  });

  it('classifies a forked module: shared on baseline tiers, forked + coat count on the fork', () => {
    const m = mod('MOD_APPLY');
    expect(m.cells.QT3).toEqual({ moduleId: 'MOD_APPLY', count: 1, state: 'shared' });
    expect(m.cells.QT5).toEqual({ moduleId: 'MOD_APPLY_QT5', count: 2, state: 'forked' });
  });

  it('classifies a whole added module as added only on the fork, absent elsewhere', () => {
    const m = mod('MOD_GLAZE');
    expect(m.cells.QT3.state).toBe('absent');
    expect(m.cells.QT5).toEqual({ moduleId: 'MOD_GLAZE', count: 1, state: 'added' });
  });

  it('classifies tasks: shared task present everywhere, extra task added only on the fork', () => {
    const m = mod('MOD_APPLY');
    const coat = m.tasks.find(t => t.task_ref === 'T_COAT');
    const extra = m.tasks.find(t => t.task_ref === 'T_EXTRA');
    expect(coat.cells).toEqual({ QT2: 'present', QT3: 'present', QT4: 'present', QT5: 'present' });
    expect(extra.cells).toEqual({ QT2: 'absent', QT3: 'absent', QT4: 'absent', QT5: 'added' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`
Expected: FAIL — cannot import from non-existent `derive-vantage.js`.

- [ ] **Step 3: Create `derive-vantage.js`:**

```js
// Pure view-model for the QT Builder vantage grid. Resolves the governing
// scenario per tier (findBestMatch) over the overlaid bundle and lays out the
// Scenario → Module → Task hierarchy with the quality tiers as columns. A
// forked MOD_..._QT<n> aligns under its shared base id so the fork and its
// baseline share one row. No mutation; no engine calls beyond findBestMatch.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';
import { PHASE_ORDER } from '../../../data/constants.js';
import { scenarioTierPin } from './tier-files.js';

const GATE_KEYS = ['application_method', 'substrate_state']; // NOT quality_tier — tier = file

function baseId(id) { return id.replace(/_QT[2-5](?=_|$)/g, ''); }

function taskApplies(appliesWhen, sel) {
  if (!appliesWhen || typeof appliesWhen !== 'object') return true;
  for (const key of GATE_KEYS) {
    if (!(key in appliesWhen)) continue;
    const allowed = appliesWhen[key];
    const arr = Array.isArray(allowed) ? allowed : [allowed];
    if (!arr.includes(sel[key])) return false;
  }
  return true;
}

function taskRowsFor(b, perTier, scnByTier, tiers, served, bundle, refScn, sel) {
  const tierTaskSet = {};
  for (const t of served) {
    const e = perTier[t].get(b);
    const mod = e ? bundle.modules?.[e.actualId] : null;
    const set = new Set();
    for (const entry of (mod?.tasks || [])) {
      if (entry?.task_ref && taskApplies(entry.applies_when, sel)) set.add(entry.task_ref);
    }
    tierTaskSet[t] = set;
  }
  const refActual = refScn ? (refScn.modules || []).find(id => baseId(id) === b) : null;
  const refMod = refActual ? bundle.modules?.[refActual] : null;
  const refTasks = new Set();
  for (const entry of (refMod?.tasks || [])) {
    if (entry?.task_ref && taskApplies(entry.applies_when, sel)) refTasks.add(entry.task_ref);
  }

  const order = [];
  const seen = new Set();
  const sources = [refMod, ...served.map(t => { const e = perTier[t].get(b); return e ? bundle.modules?.[e.actualId] : null; })];
  for (const mod of sources) {
    for (const entry of (mod?.tasks || [])) {
      const ref = entry?.task_ref;
      if (ref && taskApplies(entry.applies_when, sel) && !seen.has(ref)) { seen.add(ref); order.push(ref); }
    }
  }
  return order.map(ref => {
    const name = bundle.tasks?.[ref]?.name || ref;
    const cells = {};
    for (const t of tiers) {
      if (!scnByTier[t]) cells[t] = 'na';
      else if (!tierTaskSet[t]?.has(ref)) cells[t] = 'absent';
      else if (!refTasks.has(ref)) cells[t] = 'added';
      else cells[t] = 'present';
    }
    return { task_ref: ref, name, cells };
  });
}

export function deriveVantage(bundle, sel) {
  const tiers = [...QT_BUCKETS];

  const scenarioByTier = {};
  const scnByTier = {};
  for (const tier of tiers) {
    const ctx = {
      paintable_item: sel.paintable_item, application_method: sel.application_method,
      substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
    };
    const { scenario } = findBestMatch(bundle, ctx);
    scnByTier[tier] = scenario || null;
    scenarioByTier[tier] = scenario ? scenario.scenario_id : null;
  }
  const served = tiers.filter(t => scnByTier[t]);
  const isForkByTier = {};
  for (const t of tiers) isForkByTier[t] = !!(scnByTier[t] && scenarioTierPin(scnByTier[t]) === t);

  let refScn = served.map(t => scnByTier[t]).find(s => scenarioTierPin(s) === null) || null;
  if (!refScn && served.length) refScn = scnByTier[served[0]];
  const refBaseIds = new Set((refScn?.modules || []).map(baseId));

  const perTier = {};
  for (const t of served) {
    const m = new Map();
    for (const modId of scnByTier[t].modules || []) {
      const b = baseId(modId);
      const cur = m.get(b);
      if (cur) cur.count++; else m.set(b, { actualId: modId, count: 1 });
    }
    perTier[t] = m;
  }

  const order = [];
  const seen = new Set();
  for (const s of [refScn, ...served.map(t => scnByTier[t])]) {
    if (!s) continue;
    for (const modId of s.modules || []) {
      const b = baseId(modId);
      if (!seen.has(b)) { seen.add(b); order.push(b); }
    }
  }

  const moduleRows = order.map(b => {
    let modObj = null;
    for (const t of served) { const e = perTier[t].get(b); if (e) { modObj = bundle.modules?.[e.actualId]; break; } }
    const phase = modObj?.phase || 'apply';
    const name = modObj?.name || b;
    const cells = {};
    for (const t of tiers) {
      if (!scnByTier[t]) { cells[t] = { moduleId: null, count: 0, state: 'na' }; continue; }
      const e = perTier[t].get(b);
      if (!e) { cells[t] = { moduleId: null, count: 0, state: 'absent' }; continue; }
      let state;
      if (!refBaseIds.has(b)) state = 'added';
      else if (e.actualId !== b) state = 'forked';
      else state = 'shared';
      cells[t] = { moduleId: e.actualId, count: e.count, state };
    }
    const tasks = taskRowsFor(b, perTier, scnByTier, tiers, served, bundle, refScn, sel);
    return { baseModuleId: b, name, phase, cells, tasks };
  });

  const byPhase = new Map();
  for (const r of moduleRows) {
    if (!byPhase.has(r.phase)) byPhase.set(r.phase, []);
    byPhase.get(r.phase).push(r);
  }
  const phaseGroups = [...byPhase.keys()]
    .sort((a, c) => {
      const ia = PHASE_ORDER.indexOf(a), ic = PHASE_ORDER.indexOf(c);
      return (ia === -1 ? PHASE_ORDER.length : ia) - (ic === -1 ? PHASE_ORDER.length : ic);
    })
    .map(phase => ({ phase, modules: byPhase.get(phase) }));

  return { tiers, served, scenarioByTier, isForkByTier, phaseGroups };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`
Expected: PASS (6 assertions).

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/derive-vantage.js tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-vantage.test.js
git commit -m "feat(qt-builder): deriveVantage view-model (Scenario>Module>Task x tiers, base-id alignment + states)"
```

---

### Task 2: Edge cases — unserved tiers, eager families, method gating

**Files:**
- Modify: `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`

**Interfaces:**
- Consumes: `deriveVantage` (Task 1). No production change — these tests pin the `na` state, the no-baseline (eager-family) reference fallback, and method-gated task visibility, then the full suite confirms no regressions.

- [ ] **Step 1: Write the tests** — append to `derive-vantage.test.js`:

```js
describe('deriveVantage edge cases', () => {
  it('marks unserved tiers as na (a single QT3-only scenario)', () => {
    const b = {
      scenarios: [{ scenario_id: 'SCN_3', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT3' }, modules: ['MOD_A'] }],
      modules: { MOD_A: { phase: 'apply', name: 'A', tasks: [{ task_ref: 'T' }] } },
      tasks: { T: { name: 'T' } },
    };
    const v = deriveVantage(b, sel);
    expect(v.served).toEqual(['QT3']);
    const m = v.phaseGroups[0].modules[0];
    expect(m.cells.QT2.state).toBe('na');
    expect(m.cells.QT4.state).toBe('na');
    expect(m.tasks[0].cells).toEqual({ QT2: 'na', QT3: 'present', QT4: 'na', QT5: 'na' });
  });

  it('uses the lowest served tier as reference when no baseline scenario exists (eager family)', () => {
    // QT3 and QT5 are both pinned (no quality_tier-less baseline). QT5 has an extra module.
    const b = {
      scenarios: [
        { scenario_id: 'SCN_3', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT3' }, modules: ['MOD_A'] },
        { scenario_id: 'SCN_5', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT5' }, modules: ['MOD_A', 'MOD_B'] },
      ],
      modules: { MOD_A: { phase: 'apply', name: 'A', tasks: [] }, MOD_B: { phase: 'finish', name: 'B', tasks: [] } },
      tasks: {},
    };
    const v = deriveVantage(b, sel);
    expect(v.isForkByTier).toEqual({ QT2: false, QT3: true, QT4: false, QT5: true });
    const mB = v.phaseGroups.flatMap(g => g.modules).find(m => m.baseModuleId === 'MOD_B');
    expect(mB.cells.QT5.state).toBe('added');  // absent in the QT3 reference
  });

  it('hides tasks gated to the other application_method', () => {
    const b = {
      scenarios: [{ scenario_id: 'SCN_B', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' }, modules: ['MOD_A'] }],
      modules: { MOD_A: { phase: 'apply', name: 'A', tasks: [
        { task_ref: 'T_BRUSH', applies_when: { application_method: ['brush'] } },
        { task_ref: 'T_SPRAY', applies_when: { application_method: ['spray'] } },
      ] } },
      tasks: { T_BRUSH: { name: 'Brush' }, T_SPRAY: { name: 'Spray' } },
    };
    const v = deriveVantage(b, sel);  // sel.application_method = 'brush'
    const refs = v.phaseGroups[0].modules[0].tasks.map(t => t.task_ref);
    expect(refs).toEqual(['T_BRUSH']);
  });
});
```

- [ ] **Step 2: Run the new tests — expect PASS** (they exercise existing `deriveVantage` behavior).

Run: `cd "tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/derive-vantage.test.js`
Expected: PASS (Task 1 + the 3 edge cases).

- [ ] **Step 3: Run the full suite to confirm no regressions.**

Run: `cd "tools/paintscope" && npx vitest run`
Expected: PASS (prior count + the new derive-vantage tests; `derive-vantage.js` is not yet imported elsewhere).

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-vantage.test.js
git commit -m "test(qt-builder): deriveVantage edge cases (na tiers, eager-family reference, method gating)"
```

---

## Self-Review

**Spec coverage (Phase 1b §3–4):**
- View-model shape `{ tiers, served, scenarioByTier, isForkByTier, phaseGroups }` → Task 1 (asserted). ✓
- Module alignment by base id (`_QT5` fork under shared base) → Task 1 `MOD_APPLY` case. ✓
- Module states shared/forked/added/absent/na → Task 1 (`MOD_PREP`/`MOD_APPLY`/`MOD_GLAZE`) + Task 2 (`na`). ✓
- Coat count (`×N`) → Task 1 (`MOD_APPLY_QT5` repeated → `count: 2`). ✓
- Task states present/added/absent/na + method/state gating (no quality_tier) → Task 1 (`T_COAT`/`T_EXTRA`) + Task 2 (na, method gating). ✓
- Reference scenario = baseline, else lowest served → Task 1 (baseline) + Task 2 (eager fallback). ✓
- Phase grouping via `PHASE_ORDER` → Task 1 (`['prep','apply','finish']`). ✓

**Out of 1b-1 (next plan, 1b-2):** the `QTBuilder.jsx` rewrite (consuming this view-model), the implicit-fork edit handlers, and the dead-code cleanup.

**Placeholder scan:** none — complete code + commands + expected output in every step.

**Type consistency:** `deriveVantage` returns the exact shape Task 1 asserts and Task 2 reads (`v.served`, `v.isForkByTier`, `v.phaseGroups[].modules[].cells[tier].state`, `.tasks[].cells[tier]`). `scenarioTierPin` (from 1a) and `findBestMatch` signatures match their call sites.

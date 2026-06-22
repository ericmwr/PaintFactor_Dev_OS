# QT Builder Phase 3a — Materials Engine Cutover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `computeMaterialEstimates` select each substrate's material systems from its governing scenario's `material_systems` array (retiring the catalog-matcher *selection*), gated by a parity-analysis checkpoint; the existing product-resolution layer (`resolveProduct`) is reused unchanged.

**Architecture:** Thread the representative fired scenario per spec family (from `perInputResults`) into the material pass; use its `SYS_*` array (grouped by role) as the selection instead of the matcher; keep `resolveProduct` (primary coverage/price) + DB-profile fallback + gallon math intact; add a coats by-id tolerance for array systems lacking an own-family product row. A dry-run parity script categorizes every selection delta before the cutover commits.

**Tech Stack:** plain JS (no TS), Vitest. Node `.mjs` for the parity script. Engine modules under `Claude/tools/paintscope/src/engine/`.

## Global Constraints

_Every task implicitly includes these (verbatim from the spec):_

- **Branch:** `feature/qt-builder-rebuild`. Do NOT merge or push to origin without asking.
- **Edit in the MAIN checkout** at `C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope/` — ignore CLAUDE.md's elastic-galileo worktree rule.
- **Hours byte-identical** — Phase 3 touches only the materials path; never the hours walk.
- **No scenario/module JSON changed by the feature** — engine + test code only (the parity report may recommend data fixes, applied as their own reviewed step).
- **Reuse the product layer** — do NOT modify `product-resolver.js`, `ResolvedProductsView.jsx`, or `brand-tier-map.js`. Selection feeds them cleaner `SYS_*`.
- **System selection = the governing scenario's `material_systems` array** (grouped by role). Empty array → no material lines. The matcher's `defaultSheen`/`specStates` selection inputs are removed (dead after the cutover), not left inert.
- **Representative grain** — one representative fired scenario per spec family at the project tier (first fired); per-fired-scenario grain is out.
- **TDD, frequent commits.** All work runs from `C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope`. Existing **285** tests stay green; `npx vite build` stays clean.
- **The cutover (Task 4) commits only after the Task 3 parity report is reviewed** (the checkpoint).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/engine/spec-for-scenario.js` | scenario `matches` → `spec_family_id` | **Create** (port from 2f) |
| `src/engine/context-adapter.js` | spec↔paintable-item maps | **Modify** — `export` `SPEC_TO_PAINTABLE_ITEM` |
| `src/engine/material-estimates.js` | interior material gallons | **Modify** — `resolveCoats` tolerance (Task 2); selection-from-array (Task 4) |
| `src/engine/scenario-estimate.js` | estimate orchestration | **Modify** — build + pass the `specId → {scenarioId, systems}` map (Task 4) |
| `Claude/scripts/phase3-materials-parity.mjs` | dry-run parity analysis | **Create** (Task 3) |
| `Claude/devos/reports/phase3-materials-parity.md` | the checkpoint report | **Generated** (Task 3) |

**Task order:** 1 (port, foundational) → 2 (coats tolerance) → 3 (parity dry-run + **checkpoint**) → 4 (cutover, gated on the checkpoint).

---

### Task 1: Port `spec-for-scenario.js`

**Files:**
- Create: `src/engine/spec-for-scenario.js`
- Modify: `src/engine/context-adapter.js` (export `SPEC_TO_PAINTABLE_ITEM`)
- Test: `src/engine/__tests__/spec-for-scenario.test.js`

**Interfaces:**
- Consumes: `SPEC_TO_PAINTABLE_ITEM` (context-adapter.js, now exported), `SPEC_ROLE` (data/scenario-maps.js, already exported).
- Produces: `specForScenarioMatches(matches) → spec_family_id | null`.

- [ ] **Step 1: Export the map** — in `src/engine/context-adapter.js`, change the declaration at line ~139 from `const SPEC_TO_PAINTABLE_ITEM = {` to `export const SPEC_TO_PAINTABLE_ITEM = {`. (Leave its internal uses unchanged — a local `const` becoming `export const` keeps all in-file references working.)

- [ ] **Step 2: Write the failing test** — create `src/engine/__tests__/spec-for-scenario.test.js`. It drives the real bundle so it needs no hardcoded map:

```js
import { describe, it, expect } from 'vitest';
import bundle from '../../data/scenario-bundle.gen.js';
import { specForScenarioMatches } from '../spec-for-scenario.js';

const matchesOf = (id) => bundle.scenarios.find(s => s.scenario_id === id)?.matches;

describe('specForScenarioMatches', () => {
  it('maps a single-spec paintable_item (cabinet) to its family', () => {
    expect(specForScenarioMatches(matchesOf('SCN_CABINET_NC_QT3_BRUSH_FROM_BARE'))).toBe('SF_CABINET_NC_PAINT');
  });
  it('disambiguates drywall wall vs ceiling by matches.surface', () => {
    const wall = bundle.scenarios.find(s => /DRYWALL_WALL/.test(s.scenario_id) && (s.matches?.surface === 'wall'));
    const ceil = bundle.scenarios.find(s => /DRYWALL_CEILING/.test(s.scenario_id) && (s.matches?.surface === 'ceiling'));
    if (wall) expect(specForScenarioMatches(wall.matches)).toContain('WALL');
    if (ceil) expect(specForScenarioMatches(ceil.matches)).toContain('CEILING');
  });
  it('returns null for unknown / missing matches', () => {
    expect(specForScenarioMatches(null)).toBeNull();
    expect(specForScenarioMatches({ paintable_item: 'nonesuch_xyz' })).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/spec-for-scenario.test.js`
Expected: FAIL — `Failed to resolve import "../spec-for-scenario.js"` (file not created yet).

- [ ] **Step 4: Create the module** — `src/engine/spec-for-scenario.js` (ported verbatim from the shelved `feature/qt-builder-phase2f` branch):

```js
// Resolve a scenario's spec_family_id from its `matches`. Canonical scenario→spec
// bridge shared by the estimate material path (scenario-estimate.js) and the
// QT-Builder Materials authoring UI (derive-materials.js). It must live in the
// engine layer because material system ids are SHARED across spec families
// (e.g. SYS_FF_PREMIUM belongs to 11 families), so a material selection cannot be
// attributed to a family by its system-id value — only the scenario's own
// paintable_item (+ surface/state) disambiguates.

import { SPEC_TO_PAINTABLE_ITEM } from './context-adapter.js';
import { SPEC_ROLE } from '../data/scenario-maps.js';

// paintable_item -> [specId...] (inverse of SPEC_TO_PAINTABLE_ITEM).
const SPECS_BY_PAINTABLE_ITEM = {};
for (const [specId, pi] of Object.entries(SPEC_TO_PAINTABLE_ITEM)) {
  (SPECS_BY_PAINTABLE_ITEM[pi] = SPECS_BY_PAINTABLE_ITEM[pi] || []).push(specId);
}

// 1:1 for most paintable items; multi-spec ones (drywall: wall/ceiling ×
// prime/finish) disambiguate by matches.surface and matches.substrate_state
// (SS_BARE → PRIME spec; SS_PRIMED* → FINISH spec). Returns null when unknown.
export function specForScenarioMatches(matches) {
  if (!matches) return null;
  const all = SPECS_BY_PAINTABLE_ITEM[matches.paintable_item] || [];
  if (all.length <= 1) return all[0] || null;
  let cands = all;
  if (matches.surface === 'wall') cands = cands.filter(id => id.includes('WALL'));
  else if (matches.surface === 'ceiling') cands = cands.filter(id => id.includes('CEILING'));
  const states = Array.isArray(matches.substrate_state)
    ? matches.substrate_state
    : (matches.substrate_state ? [matches.substrate_state] : []);
  const wantsPrime = states.some(s => s === 'SS_BARE');
  const wantsFinish = states.some(s => /^SS_PRIMED/.test(s));
  if (wantsPrime && !wantsFinish) cands = cands.filter(id => SPEC_ROLE[id] === 'PRIME' || id.includes('PRIME'));
  else if (wantsFinish && !wantsPrime) cands = cands.filter(id => SPEC_ROLE[id] === 'FINISH' || id.includes('FINISH'));
  return cands[0] || null;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/spec-for-scenario.test.js`
Expected: PASS.

- [ ] **Step 6: Run the full suite (no regressions)**

Run: `npx vitest run`
Expected: PASS — 285 prior + 3 new = **288**.

- [ ] **Step 7: Commit**

```bash
git add src/engine/spec-for-scenario.js src/engine/context-adapter.js src/engine/__tests__/spec-for-scenario.test.js
git commit -m "feat(qt-builder): port spec-for-scenario.js (Phase 3a Task 1)"
```

---

### Task 2: Coats by-id tolerance (`resolveCoats`)

**Files:**
- Modify: `src/engine/material-estimates.js` (add a pure `resolveCoats` helper + a by-id product index)
- Test: `src/engine/__tests__/material-coats-tolerance.test.js`

**Interfaces:**
- Produces: `resolveCoats(systemId, specId, productsBySystem, productsBySystemId, role) → { coats, resolvedBy }` where `resolvedBy ∈ {'own-family','cross-family','default'}`. Default coats = 1 (matches today's behavior when no product row is found).

- [ ] **Step 1: Write the failing test** — create `src/engine/__tests__/material-coats-tolerance.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { resolveCoats } from '../material-estimates.js';

const productsBySystem = { 'SF_CABINET_NC_PAINT::SYS_FF_STANDARD_ACRYLIC': [{ product_role: 'finish', coats_required: 2 }] };
const productsBySystemId = { SYS_FF_STANDARD_ACRYLIC: [{ product_role: 'finish', coats_required: 2 }] };

describe('resolveCoats', () => {
  it('uses the own-family product row when present', () => {
    expect(resolveCoats('SYS_FF_STANDARD_ACRYLIC', 'SF_CABINET_NC_PAINT', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 2, resolvedBy: 'own-family' });
  });
  it('falls back by id across families when the active family lacks a row (closet)', () => {
    expect(resolveCoats('SYS_FF_STANDARD_ACRYLIC', 'SF_CLOSET_SHELF_NC', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 2, resolvedBy: 'cross-family' });
  });
  it('defaults to 1 coat when no row exists anywhere', () => {
    expect(resolveCoats('SYS_GHOST', 'SF_X', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 1, resolvedBy: 'default' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/material-coats-tolerance.test.js`
Expected: FAIL — `resolveCoats is not a function` (not exported yet).

- [ ] **Step 3: Implement** — in `src/engine/material-estimates.js`, add the exported helper near the top-level (after the imports, before `computeMaterialEstimates`):

```js
// Resolve coats for a system, tolerant of array systems that lack a product row
// under the active spec family (e.g. closet references SYS_FF_STANDARD_ACRYLIC,
// whose products live under the cabinet/arch families). own-family → cross-family
// by id → default 1. `resolvedBy` is for the parity report.
export function resolveCoats(systemId, specId, productsBySystem, productsBySystemId, role) {
  let products = productsBySystem[specId + '::' + systemId];
  let resolvedBy = 'own-family';
  if (!products || products.length === 0) {
    products = productsBySystemId[systemId];
    resolvedBy = (products && products.length) ? 'cross-family' : 'default';
  }
  let coats = 1;
  if (products && products.length > 0) {
    const prod = products.find(p => (p.product_role || '').includes(role)) || products[0];
    if (prod.coats_required) coats = prod.coats_required;
  }
  return { coats, resolvedBy };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/material-coats-tolerance.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npx vitest run`
Expected: PASS — **291** (288 + 3 new). `resolveCoats` is added but not yet wired into the loop, so existing material output is unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/engine/material-estimates.js src/engine/__tests__/material-coats-tolerance.test.js
git commit -m "feat(qt-builder): resolveCoats by-id tolerance helper (Phase 3a Task 2)"
```

---

### Task 3: Parity dry-run + report (CHECKPOINT)

**Files:**
- Create: `Claude/scripts/phase3-materials-parity.mjs`
- Generated: `Claude/devos/reports/phase3-materials-parity.md`

**Interfaces:**
- Consumes: `bundle`, `MATERIAL_SYSTEMS`, `MATERIAL_SYSTEM_PRODUCTS`, `buildRoleBySystemId`/`classifySystemRole`/`resolveSpecSystems` (material-system-roles.js), `specForScenarioMatches` (Task 1), `scenarioTierPin` (qt-builder/tier-files.js).
- Produces: a categorized markdown report. **No engine change** — it simulates the cutover's *selection* and diffs it against the matcher.

- [ ] **Step 1: Write the script** — create `Claude/scripts/phase3-materials-parity.mjs`. Paths are relative to repo root; run with `node`:

```js
// Dry-run parity: for every non-protection scenario, compare today's MATCHER
// system selection vs the Phase-3 ARRAY selection (scenario.material_systems),
// per role. Selection-level only (hours unaffected). Writes a categorized report.
import { writeFileSync } from 'node:fs';
import bundle from '../tools/paintscope/src/data/scenario-bundle.gen.js';
import { MATERIAL_SYSTEMS, MATERIAL_SYSTEM_PRODUCTS } from '../tools/paintscope/src/data/scenario-rate-data.js';
import { buildRoleBySystemId, classifySystemRole, resolveSpecSystems } from '../tools/paintscope/src/engine/material-system-roles.js';
import { specForScenarioMatches } from '../tools/paintscope/src/engine/spec-for-scenario.js';
import { scenarioTierPin } from '../tools/paintscope/src/components/authoring/qt-builder/tier-files.js';

const roleBySystemId = buildRoleBySystemId(MATERIAL_SYSTEM_PRODUCTS);
const systemsBySpec = {};
for (const ms of MATERIAL_SYSTEMS) (systemsBySpec[ms.spec_family_id] = systemsBySpec[ms.spec_family_id] || []).push(ms);
const sheenFor = (id) => id.includes('CEILING') || id.includes('PRIME') ? 'flat'
  : (/(TRIM|DOOR|CABINET|WINDOW)/.test(id) ? 'semi-gloss' : 'eggshell');

const cats = { correction: [], regression: [], changed: [], identical: 0, skippedNoSpec: [] };

for (const scn of bundle.scenarios) {
  const arr = scn.material_systems || [];
  if (arr.length === 0) continue;                         // protection scenarios — no materials
  const specId = specForScenarioMatches(scn.matches);
  if (!specId) { cats.skippedNoSpec.push(scn.scenario_id); continue; }
  const tier = scenarioTierPin(scn) || (bundle?.modifiers?.FAC_QT?.default) || 'QT3';
  const isStain = specId.includes('STAIN');

  // ARRAY selection: group the scenario array by role (one per role).
  const arrayByRole = {};
  for (const id of arr) { const r = classifySystemRole(id, roleBySystemId, isStain ? 'stain' : 'finish'); if (!(r in arrayByRole)) arrayByRole[r] = id; }

  // MATCHER selection: today's resolveSpecSystems over the full family catalog.
  const states = Array.isArray(scn.matches?.substrate_state) ? scn.matches.substrate_state : (scn.matches?.substrate_state ? [scn.matches.substrate_state] : []);
  const matched = resolveSpecSystems({ specSystems: systemsBySpec[specId] || [], roleBySystemId, isStain, defaultQT: tier, defaultSheen: sheenFor(specId), specStates: states, specOverride: null });
  const matcherByRole = {}; for (const { system, role } of matched) matcherByRole[role] = system ? system.id : null;

  const roles = [...new Set([...Object.keys(arrayByRole), ...Object.keys(matcherByRole)])];
  let anyDiff = false;
  for (const role of roles) {
    const a = arrayByRole[role] || null, m = matcherByRole[role] || null;
    if (a === m) continue;
    anyDiff = true;
    const row = { scenario: scn.scenario_id, specId, tier, role, matcher: m, array: a };
    if (m == null && a != null) cats.correction.push(row);       // array adds a role the matcher missed
    else if (a == null && m != null) cats.regression.push(row);  // array DROPS a role the matcher had
    else cats.changed.push(row);                                  // different system, same role
  }
  if (!anyDiff) cats.identical++;
}

const lines = [];
lines.push('# Phase 3 Materials Parity — matcher selection vs scenario-array selection', '');
lines.push(`Scenarios with materials compared. Identical: **${cats.identical}**. ` +
  `Corrections: **${cats.correction.length}**. Regressions: **${cats.regression.length}**. ` +
  `Changed-system: **${cats.changed.length}**. No-spec(skipped): **${cats.skippedNoSpec.length}**.`, '');
lines.push('Hours are unaffected (selection-level change only).', '');
for (const [title, rows] of [['REGRESSIONS (array drops a role — must pre-fix the array)', cats.regression], ['CORRECTIONS (array adds a role — accepted)', cats.correction], ['CHANGED SYSTEM (same role, different system — accepted, review)', cats.changed]]) {
  lines.push(`## ${title} (${rows.length})`);
  for (const r of rows) lines.push(`- ${r.scenario} [${r.specId} ${r.tier} ${r.role}] matcher=${r.matcher} array=${r.array}`);
  lines.push('');
}
if (cats.skippedNoSpec.length) { lines.push('## NO SPEC RESOLVED (skipped — investigate)'); for (const s of cats.skippedNoSpec) lines.push(`- ${s}`); lines.push(''); }
writeFileSync(new URL('../devos/reports/phase3-materials-parity.md', import.meta.url), lines.join('\n'));
console.log(`identical=${cats.identical} corrections=${cats.correction.length} regressions=${cats.regression.length} changed=${cats.changed.length} noSpec=${cats.skippedNoSpec.length}`);
```

- [ ] **Step 2: Run the script**

Run (from `Claude/`): `node scripts/phase3-materials-parity.mjs`
Expected: prints the counts and writes `Claude/devos/reports/phase3-materials-parity.md`. Closet scenarios should appear under **CORRECTIONS** (array adds `finish`). **REGRESSIONS should be empty or small** — each is a scenario whose array omits a role the matcher emitted.

- [ ] **Step 3: CHECKPOINT — review the report before proceeding**

Read `Claude/devos/reports/phase3-materials-parity.md`. Present the controller/human with: the counts, the full REGRESSIONS list (these block — the cutover would drop a material line; they need a data pre-fix or confirmation they're intentional), a sample of CORRECTIONS and CHANGED-SYSTEM rows, and any NO-SPEC scenarios. **Do not start Task 4 until the report is reviewed and REGRESSIONS are resolved** (pre-fixed as a separate reviewed data step, or explicitly accepted).

- [ ] **Step 4: Commit the script + report**

```bash
git add scripts/phase3-materials-parity.mjs devos/reports/phase3-materials-parity.md
git commit -m "test(qt-builder): Phase 3 materials parity dry-run + report (Phase 3a Task 3)"
```

---

### Task 4: Cutover — select from the scenario array

**Files:**
- Modify: `src/engine/scenario-estimate.js` (build + pass the `specId → {scenarioId, systems}` map)
- Modify: `src/engine/material-estimates.js` (select from the array; use `resolveCoats`; drop dead matcher-selection)
- Test: `src/engine/__tests__/material-array-selection.test.js`

**Interfaces:**
- Consumes: `resolveCoats` (Task 2); `perInputResults[].{specId,scenarioId}` + `bundle.scenarios[].material_systems`; `resolveProduct` (unchanged).
- Produces: `computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials)` where `scenarioMaterials = { [specId]: { scenarioId, systems: string[] } }` (representative per spec). When a specId is present in `scenarioMaterials`, its `systems` array drives selection; absent/empty → no material lines for that spec.

- [ ] **Step 1: Write the failing test** — create `src/engine/__tests__/material-array-selection.test.js`. It calls `computeMaterialEstimates` directly with a minimal state + the new 4th arg:

```js
import { describe, it, expect } from 'vitest';
import { computeMaterialEstimates } from '../material-estimates.js';

// Minimal state: one room, cabinet spec activated, with a quantity for the spec's PS key.
function fixture(systems) {
  const state = { project: { default_quality_tier: 'QT3' }, rooms: [{ substrates: {} }] };
  const roomLookups = new Map([[0, { qty: new Map([['PS_SURFACE_SF.CABINET_FRAME', { value: 200, uom: 'SF' }]]) }]]);
  const specResults = [{ specId: 'SF_CABINET_NC_PAINT', domain: 'interior',
    tasks: [{ psKey: 'PS_SURFACE_SF.CABINET_FRAME' }] }];
  const scenarioMaterials = { SF_CABINET_NC_PAINT: { scenarioId: 'SCN_X', systems } };
  return computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
}

describe('computeMaterialEstimates — array selection', () => {
  it('emits a line per role from the scenario array (primer + finish)', () => {
    const est = fixture(['SYS_PRIMER_WOOD_ACRYLIC', 'SYS_FF_STANDARD_ACRYLIC']);
    const roles = est.filter(e => e.specFamilyId === 'SF_CABINET_NC_PAINT').map(e => e.productRole).sort();
    expect(roles).toEqual(['finish', 'primer']);
  });
  it('emits no lines when the array is empty', () => {
    const est = fixture([]);
    expect(est.filter(e => e.specFamilyId === 'SF_CABINET_NC_PAINT')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/material-array-selection.test.js`
Expected: FAIL — the current selection ignores the 4th arg's `systems`, so it emits the matcher's pick (roles may match by luck for cabinet, but the empty-array case fails: the matcher still emits lines). Confirm at least the empty-array assertion fails.

- [ ] **Step 3: Implement the cutover.**

**3a.** In `src/engine/scenario-estimate.js`, build the map from `perInputResults` and pass it. Replace the call at line ~204:

```js
    // Representative fired scenario per spec family → its material_systems (Phase 3).
    const scenarioMaterials = {};
    for (const pr of perInputResults) {
      if (pr.domain === 'exterior') continue;
      if (scenarioMaterials[pr.specId]) continue;            // first fired = representative
      const scn = bundle.scenarios.find(s => s.scenario_id === pr.scenarioId);
      if (scn) scenarioMaterials[pr.specId] = { scenarioId: pr.scenarioId, systems: scn.material_systems || [] };
    }

    const intSpecResults = specResults.filter(sr => sr.domain !== 'exterior');
    let materialEstimates = [];
    try {
      materialEstimates = computeMaterialEstimates(state, roomLookups, intSpecResults, scenarioMaterials);
    } catch (matErr) {
```

(`perInputResults` items carry `specId`, `scenarioId`, and a `ctx`; the `domain` guard mirrors the existing `intSpecResults` filter — exterior keeps its own `computeExteriorMaterialEstimates` path.)

**3b.** In `src/engine/material-estimates.js`, change the signature and the selection. Rename the 4th param and add a by-id product index:

```js
export function computeMaterialEstimates(state, roomLookups, specResults = [], scenarioMaterials = {}) {
```

After `productsBySystem` is built (~line 132), add the by-id index:

```js
  // system_id -> material_system_products across ALL families (coats tolerance).
  const productsBySystemId = {};
  MATERIAL_SYSTEM_PRODUCTS.forEach(msp => {
    (productsBySystemId[msp.system_id] = productsBySystemId[msp.system_id] || []).push(msp);
  });
```

Replace the selection block (today's lines ~181-199: the `defaultSheen`/`specStates`/`resolveSpecSystems` matcher pick) with array selection:

```js
    // System selection comes from the governing scenario's material_systems array
    // (Phase 3), grouped by role — NOT the catalog matcher. Absent/empty → no lines.
    const isStainSpec = specId.includes('STAIN');
    const sysEntry = scenarioMaterials[specId];
    const systemIds = (sysEntry && sysEntry.systems) || [];
    const seenRoles = new Set();
    const matchedSystems = [];
    for (const sysId of systemIds) {
      const role = classifySystemRole(sysId, roleBySystemId, isStainSpec ? 'stain' : 'finish');
      if (seenRoles.has(role)) continue;                       // one system per role (representative)
      seenRoles.add(role);
      const system = (systemsBySpec[specId] || []).find(s => s.id === sysId) || { id: sysId, name: sysId };
      matchedSystems.push({ system, role });
    }
    if (matchedSystems.length === 0) return; // empty array → no materials for this spec
```

Then in the emit loop, replace the inline coats computation (today's ~lines 203-211) with the helper:

```js
      // Get coats (own-family → by-id tolerance → default).
      const { coats } = matchedSystem
        ? resolveCoats(matchedSystem.id, specId, productsBySystem, productsBySystemId, role)
        : { coats: 1 };
```

Leave the coverage-profile lookup, `resolveProduct` call, gallon math, and `estimates.push(...)` shape unchanged. Remove the now-dead `defaultSheen`/`repRoom`/`specStates`/`resolveSubstrateStateForSpec` selection lines and the unused `resolveSpecSystems` import if nothing else uses it (keep `classifySystemRole`, `buildRoleBySystemId`).

- [ ] **Step 4: Run the new test to verify it passes**

Run: `npx vitest run src/engine/__tests__/material-array-selection.test.js`
Expected: PASS (primer+finish from the array; empty array → no lines).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS — the prior **291** stay green plus 2 new = **293**. If `material-estimates.test.js` (the golden) shifts, reconcile against the Task 3 report: a diff that matches a reported correction is expected — update the golden to the corrected values; a diff NOT in the report is a bug — stop and investigate.

- [ ] **Step 6: Verify the cutover matches the parity report**

Run (from `Claude/`): `node scripts/phase3-materials-parity.mjs` again and confirm counts are unchanged from Task 3 (the selection logic the script simulates now matches the engine). Spot-check closet in a live build (Step 7).

- [ ] **Step 7: Build**

Run: `npx vite build`
Expected: `✓ built`, 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/engine/scenario-estimate.js src/engine/material-estimates.js src/engine/__tests__/material-array-selection.test.js
git commit -m "feat(qt-builder): select materials from the scenario array (Phase 3a Task 4)"
```

---

## Phase 3a verification (after all tasks)

- `npx vitest run` = **293** green; `npx vite build` clean.
- The parity report has **zero unresolved regressions**; corrections/changed-system rows were reviewed and accepted.
- Live (McLeod, `localhost:5183`/`5173`): the estimate's materials reflect each substrate's scenario array; **closet now shows a finish line**; the Materials tab (`ResolvedProductsView`) still resolves real products; 0 console errors.
- Hours unchanged from before Phase 3a (the materials path is independent; confirm a quick estimate's total hours are identical).

Do NOT merge or push. Phase 3b (the per-tier authoring UI) is planned after this checkpoint passes.

---

## Self-Review

**1. Spec coverage:** §5.1 thread map → Task 4 Step 3a. §5.2 array selection + quantity-scoping-unchanged → Task 4 Step 3b. §5.3 coats tolerance → Task 2 + wired Task 4. §6.5 spec-for-scenario port → Task 1. §8.2 parity report/checkpoint → Task 3. §8.3 build/live-verify → Phase verification. §9 hours-untouched/empty-arrays → Task 4 tests + verification. (Authoring UI §6.1-6.4 and `derive-materials` §6.3 are Phase 3b — out of this plan by design.) ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows complete code; the parity script is complete. ✓

**3. Type consistency:** `resolveCoats(systemId, specId, productsBySystem, productsBySystemId, role) → {coats,resolvedBy}` defined Task 2, used Task 4 Step 3b. `scenarioMaterials = {[specId]:{scenarioId,systems}}` produced Task 4 Step 3a, consumed Step 3b. `specForScenarioMatches(matches)` Task 1, used by the Task 3 script. Test-count chain 285 → 288 → 291 → (script, +0) → 293. ✓

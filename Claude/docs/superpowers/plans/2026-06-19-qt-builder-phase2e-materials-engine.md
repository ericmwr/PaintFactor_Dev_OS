# QT Builder Phase 2e — Role-Aware Material Resolution (engine) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the interior material estimator role-aware — resolve a primer system and a finish system separately per spec (emit a line per role), selected by a unified `applies_when` matcher, with forward-compatible per-(tier,role) override support.

**Architecture:** A new pure module `material-system-roles.js` holds the selection logic (classify role, match a system, resolve one system per role). `material-estimates.js` calls it in place of its inline single-match block, computing the spec's substrate state via the existing `resolveSubstrateStateForSpec` and accepting an optional `scenarioMaterialOverrides` param (default `{}`; real assembly is Phase 2f). No UI, no engine changes outside materials; hours estimates untouched.

**Tech Stack:** Plain ESM JS, Vitest 3. PaintScope under `C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope/`.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-06-19-qt-builder-phase2e-materials-engine-design.md`. Inherits its decisions.
- **Engine-only.** No UI, no compile module for the builder, **no `scenario-estimate.js` change** (caller-side override assembly is Phase 2f). Only `material-estimates.js` + a new pure module + their tests.
- **Pure module:** `material-system-roles.js` does no I/O; all inputs passed explicitly; functions return new values, never mutate inputs.
- **Role source:** a system's role = its product's `product_role` (via `MATERIAL_SYSTEM_PRODUCTS`); id-pattern only as fallback.
- **Unified matcher:** a system matches when every `applies_when` constraint it declares matches — `quality_tier`∋`defaultQT`, `finish_sheen`∋`defaultSheen`, `substrate_state`∩`specStates`≠∅. Undeclared constraints don't disqualify. Substrate sub-type is NOT matched in v1.
- **Override:** consumed at `defaultQT` only; `scenarioMaterialOverrides` defaults `{}` so existing callers are unchanged; exercised with **synthetic** maps in 2e.
- **Golden delta:** the only change to `material-estimates.test.js` is the two `*_PRIME` entries' `role` flipping `"finish"`→`"primer"`; gallons and psKey identical.
- **Commands** (from `tools/paintscope/`): tests `npx vitest run [path]`; build `npx vite build`; dev `npm run dev`.
- **Git:** repo root `C:/Eric_AI_Playground/Claude Code Uni/`; files under `Claude/`. Stage only Phase 2e paths — never `git add -A`. Branch `feature/qt-builder-phase2e` (already created off main @ 2c5ea43). Do NOT push or merge.
- **Commit trailer:** `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

All paths below are relative to `tools/paintscope/src/` unless noted.

---

### Task 1: `material-system-roles.js` pure selection module

**Files:**
- Create: `engine/material-system-roles.js`
- Test: `engine/__tests__/material-system-roles.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `buildRoleBySystemId(products: array) → { [system_id]: product_role }`.
  - `classifySystemRole(systemId: string, roleBySystemId: object, baseRole = 'finish') → role: string`.
  - `systemMatches(system, { defaultQT, defaultSheen, specStates }) → boolean`.
  - `resolveSpecSystems({ specSystems, roleBySystemId, isStain, defaultQT, defaultSheen, specStates, specOverride }) → Array<{ system, role }>` (one entry per role present, primer before finish / stain→sealer→clear order).

- [ ] **Step 1: Write the failing test**

Create `engine/__tests__/material-system-roles.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildRoleBySystemId, classifySystemRole, systemMatches, resolveSpecSystems } from '../material-system-roles.js';

const PRODUCTS = [
  { system_id: 'SYS_PRIMER_BARE', product_role: 'primer' },
  { system_id: 'SYS_FF_QT3', product_role: 'finish' },
  { system_id: 'SYS_FF_QT4', product_role: 'finish' },
];
const ROLE = buildRoleBySystemId(PRODUCTS);

// paint family: one state-keyed primer + two QT-keyed finishes
const paint = () => ([
  { id: 'SYS_PRIMER_BARE', applies_when: { substrate: 'softwood', substrate_state: 'SS_BARE' } },
  { id: 'SYS_FF_QT3', applies_when: { quality_tier: ['QT3'] } },
  { id: 'SYS_FF_QT4', applies_when: { quality_tier: ['QT4'] } },
]);
// QT-keyed primer family (a PRIME spec): all primer role, ordered QT4 then QT3
const qtPrimer = () => ([
  { id: 'SYS_P_QT4', applies_when: { quality_tier: ['QT4'] } },
  { id: 'SYS_P_QT3', applies_when: { quality_tier: ['QT3'] } },
]);
const qtPrimerRole = { SYS_P_QT4: 'primer', SYS_P_QT3: 'primer' };

describe('buildRoleBySystemId', () => {
  it('maps system_id to product_role', () => {
    expect(buildRoleBySystemId(PRODUCTS)).toEqual({ SYS_PRIMER_BARE: 'primer', SYS_FF_QT3: 'finish', SYS_FF_QT4: 'finish' });
  });
});

describe('classifySystemRole', () => {
  it('prefers product_role', () => { expect(classifySystemRole('SYS_FF_QT3', ROLE)).toBe('finish'); });
  it('falls back to id pattern then baseRole', () => {
    expect(classifySystemRole('SYS_FOO_PRIMER_X', {})).toBe('primer');
    expect(classifySystemRole('SYS_X_SEALER', {})).toBe('sealer');
    expect(classifySystemRole('SYS_X_CLEAR', {})).toBe('clear');
    expect(classifySystemRole('SYS_UNKNOWN', {}, 'stain')).toBe('stain');
    expect(classifySystemRole('SYS_UNKNOWN', {})).toBe('finish');
  });
});

describe('systemMatches', () => {
  const ctx = { defaultQT: 'QT3', defaultSheen: 'satin', specStates: ['SS_BARE'] };
  it('passes when declared constraints match', () => {
    expect(systemMatches({ applies_when: { quality_tier: ['QT3'] } }, ctx)).toBe(true);
    expect(systemMatches({ applies_when: { substrate_state: 'SS_BARE' } }, ctx)).toBe(true);
    expect(systemMatches({ applies_when: {} }, ctx)).toBe(true);
  });
  it('fails on a declared mismatch', () => {
    expect(systemMatches({ applies_when: { quality_tier: ['QT5'] } }, ctx)).toBe(false);
    expect(systemMatches({ applies_when: { substrate_state: 'SS_PRIMED' } }, ctx)).toBe(false);
  });
  it('does not disqualify on state when specStates is empty', () => {
    expect(systemMatches({ applies_when: { substrate_state: 'SS_BARE' } }, { defaultQT: 'QT3', defaultSheen: 'satin', specStates: [] })).toBe(true);
  });
});

describe('resolveSpecSystems', () => {
  const base = { roleBySystemId: ROLE, isStain: false, defaultQT: 'QT3', defaultSheen: 'satin', specStates: ['SS_BARE'] };
  it('emits primer (state-matched) + finish (QT-matched), primer first', () => {
    const out = resolveSpecSystems({ ...base, specSystems: paint() });
    expect(out.map(o => [o.role, o.system.id])).toEqual([['primer', 'SYS_PRIMER_BARE'], ['finish', 'SYS_FF_QT3']]);
  });
  it('selects a QT-keyed primer by tier, order-independent (not candidates[0])', () => {
    const out = resolveSpecSystems({ ...base, roleBySystemId: qtPrimerRole, specSystems: qtPrimer() });
    expect(out).toEqual([{ role: 'primer', system: { id: 'SYS_P_QT3', applies_when: { quality_tier: ['QT3'] } } }]);
  });
  it('honors a same-role override and ignores an off-family override', () => {
    const pinned = resolveSpecSystems({ ...base, specSystems: paint(), specOverride: { finish: 'SYS_FF_QT4' } });
    expect(pinned.find(o => o.role === 'finish').system.id).toBe('SYS_FF_QT4');
    const ignored = resolveSpecSystems({ ...base, specSystems: paint(), specOverride: { finish: 'SYS_NOT_IN_FAMILY' } });
    expect(ignored.find(o => o.role === 'finish').system.id).toBe('SYS_FF_QT3'); // falls back to default
  });
  it('falls back to first candidate when nothing matches', () => {
    const out = resolveSpecSystems({ ...base, defaultQT: 'QT5', specSystems: paint() });
    expect(out.find(o => o.role === 'finish').system.id).toBe('SYS_FF_QT3'); // no QT5 finish → first finish
  });
  it('resolves stain roles first-per-role and honors override', () => {
    const stainSystems = [
      { id: 'SYS_STAIN_A', applies_when: {} }, { id: 'SYS_STAIN_B', applies_when: {} },
      { id: 'SYS_SEALER', applies_when: {} }, { id: 'SYS_CLEAR', applies_when: {} },
    ];
    const roleMap = { SYS_STAIN_A: 'stain', SYS_STAIN_B: 'stain', SYS_SEALER: 'sealer', SYS_CLEAR: 'clear' };
    const out = resolveSpecSystems({ specSystems: stainSystems, roleBySystemId: roleMap, isStain: true, defaultQT: 'QT3', defaultSheen: 'satin', specStates: [], specOverride: { stain: 'SYS_STAIN_B' } });
    expect(out.map(o => [o.role, o.system.id])).toEqual([['stain', 'SYS_STAIN_B'], ['sealer', 'SYS_SEALER'], ['clear', 'SYS_CLEAR']]);
  });
  it('emits finish-only for a family with no primer systems', () => {
    const out = resolveSpecSystems({ ...base, specSystems: [{ id: 'SYS_FF_QT3', applies_when: { quality_tier: ['QT3'] } }] });
    expect(out.map(o => o.role)).toEqual(['finish']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run engine/__tests__/material-system-roles.test.js`
Expected: FAIL — cannot resolve `../material-system-roles.js`.

- [ ] **Step 3: Write the implementation**

Create `engine/material-system-roles.js`:

```js
// Pure, role-aware material-system selection. Each MATERIAL_SYSTEM is a
// single-product coating system; its role is its product's product_role
// (primer/finish for paint; stain/sealer/clear for stain). A paint family may
// hold primers (substrate/state- or QT-keyed) AND finishes (QT-keyed); a stain
// family holds stain/sealer/clear. For each role present, selection is:
//   override (if it names a same-role system) > first system whose declared
//   applies_when constraints all match the active context > first of that role.
// No I/O — all inputs explicit; nothing mutated.

const PAINT_ROLES = ['primer', 'finish'];
const STAIN_ROLES = ['stain', 'sealer', 'clear'];

function parseAw(aw) {
  if (!aw) return {};
  if (typeof aw === 'string') { try { return JSON.parse(aw); } catch { return {}; } }
  return aw;
}
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

// system_id -> product_role, from MATERIAL_SYSTEM_PRODUCTS (first wins).
export function buildRoleBySystemId(products) {
  const out = {};
  for (const p of products || []) {
    if (p && p.system_id && p.product_role && !(p.system_id in out)) out[p.system_id] = p.product_role;
  }
  return out;
}

// Role for a system: product_role wins; id-pattern fallback; else baseRole.
export function classifySystemRole(systemId, roleBySystemId, baseRole = 'finish') {
  const r = roleBySystemId && roleBySystemId[systemId];
  if (r) return r;
  if (/PRIMER/.test(systemId)) return 'primer';
  if (/SEALER/.test(systemId)) return 'sealer';
  if (/CLEAR|POLY|LACQUER/.test(systemId)) return 'clear';
  return baseRole;
}

// True when every applies_when constraint the system declares matches the ctx.
// Undeclared constraints don't disqualify. Substrate sub-type ignored in v1.
export function systemMatches(system, { defaultQT, defaultSheen, specStates = [] }) {
  const aw = parseAw(system.applies_when);
  if (aw.quality_tier && !arr(aw.quality_tier).includes(defaultQT)) return false;
  if (aw.finish_sheen && !arr(aw.finish_sheen).includes(defaultSheen)) return false;
  if (aw.substrate_state && specStates.length > 0) {
    if (!arr(aw.substrate_state).some(s => specStates.includes(s))) return false;
  }
  return true;
}

// Resolve one { system, role } per role present in the family.
export function resolveSpecSystems({ specSystems, roleBySystemId, isStain, defaultQT, defaultSheen, specStates = [], specOverride = null }) {
  const roleOrder = isStain ? STAIN_ROLES : PAINT_ROLES;
  const baseRole = isStain ? 'stain' : 'finish';
  const byRole = {};
  for (const ms of specSystems || []) {
    const role = classifySystemRole(ms.id, roleBySystemId, baseRole);
    (byRole[role] = byRole[role] || []).push(ms);
  }
  const out = [];
  for (const role of roleOrder) {
    const candidates = byRole[role];
    if (!candidates || candidates.length === 0) continue;
    let system = null;
    const ovId = specOverride && specOverride[role];
    if (ovId) system = candidates.find(s => s.id === ovId) || null;
    if (!system) system = candidates.find(s => systemMatches(s, { defaultQT, defaultSheen, specStates })) || candidates[0];
    out.push({ system, role });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run engine/__tests__/material-system-roles.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/engine/material-system-roles.js Claude/tools/paintscope/src/engine/__tests__/material-system-roles.test.js
git commit -m "feat(materials): role-aware material-system selection module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Integrate role-aware resolution into `material-estimates.js`

**Files:**
- Modify: `engine/material-estimates.js` (imports; signature; `roleBySystemId` build; replace the inline match block ~184-227)
- Test: `engine/__tests__/material-estimates.test.js` (golden EXPECTED role update)

**Interfaces:**
- Consumes: `resolveSpecSystems`, `buildRoleBySystemId` (Task 1); `resolveSubstrateStateForSpec` (`scenario-compatibility.js`, already exports it).
- Produces: `computeMaterialEstimates(state, roomLookups, specResults = [], scenarioMaterialOverrides = {})` — new optional 4th arg; emits one estimate per resolved {system, role}, role from `product_role`.

- [ ] **Step 1: Update the golden test EXPECTED (write the failing expectation first)**

In `engine/__tests__/material-estimates.test.js`, the two `*_PRIME` entries must become `role: "primer"`. Replace the `EXPECTED` array's two PRIME objects:

```js
  {
    "spec": "SF_DRYWALL_CEILING_NC_PRIME",
    "role": "primer",
    "gal": 1,
    "psKey": "PS_SURFACE_SF.CEILING_FIELD"
  },
```
(the `SF_DRYWALL_CEILING_NC_PRIME` entry) and
```js
  {
    "spec": "SF_DRYWALL_WALL_NC_PRIME",
    "role": "primer",
    "gal": 2,
    "psKey": "PS_SURFACE_SF.WALL_FIELD"
  }
```
(the `SF_DRYWALL_WALL_NC_PRIME` entry). Leave the two `*_FINISH` entries (`role: "finish"`) and all `gal`/`psKey` values unchanged.

- [ ] **Step 2: Run the golden test to verify it now fails**

Run: `npx vitest run engine/__tests__/material-estimates.test.js`
Expected: FAIL — current code emits `role: "finish"` for the PRIME specs, so `got` still has `"finish"` where EXPECTED now says `"primer"`.

- [ ] **Step 3: Add imports**

In `engine/material-estimates.js`, extend the `scenario-compatibility.js` import (currently `import { isSpecStateCompatible } from './scenario-compatibility.js';`):

```js
import { isSpecStateCompatible, resolveSubstrateStateForSpec } from './scenario-compatibility.js';
```

And add (near the other engine imports, after the `product-resolver` import):

```js
import { buildRoleBySystemId, resolveSpecSystems } from './material-system-roles.js';
```

- [ ] **Step 4: Add the 4th param and build `roleBySystemId` once**

Change the signature:

```js
export function computeMaterialEstimates(state, roomLookups, specResults = [], scenarioMaterialOverrides = {}) {
```

After the `productsBySystem` map is built (the block ending `productsBySystem[key].push(msp); });`), add:

```js
  // system_id -> product_role, so material selection is role-aware (primer vs finish).
  const roleBySystemId = buildRoleBySystemId(MATERIAL_SYSTEM_PRODUCTS);
```

- [ ] **Step 5: Replace the inline single-match block with the role-aware resolver**

Replace this exact block (the "Determine which systems to resolve" comment through the close of the `else` that builds `matchedSystems`):

```js
    // Determine which systems to resolve for this spec.
    // Stain/clear specs need multiple systems (stain + sealer + clear coat).
    // Paint specs need one system matched by QT + sheen.
    const isStainSpec = specId.includes('STAIN');
    let matchedSystems = [];

    if (isStainSpec) {
      // Stain specs: match ALL systems whose coating_type applies
      // For stain_clear projects: stain + sealer + clear coat
      // For stain_only: just stain
      // For clear_only: sealer + clear coat
      // Pick first system per role (stain, sealer, clear)
      const seenRoles = new Set();
      specSystems.forEach(ms => {
        const aw = typeof ms.applies_when === 'string' ? JSON.parse(ms.applies_when) : (ms.applies_when || {});
        // Determine role from system ID
        let role = 'stain';
        if (ms.id.includes('SEALER')) role = 'sealer';
        else if (ms.id.includes('CLEAR') || ms.id.includes('POLY') || ms.id.includes('LACQUER')) role = 'clear';
        if (!seenRoles.has(role)) {
          seenRoles.add(role);
          matchedSystems.push({ system: ms, role });
        }
      });
    } else {
      // Paint/prime specs: match one system by QT + sheen
      let matchedSystem = null;
      specSystems.forEach(ms => {
        if (ms.applies_when) {
          const aw = typeof ms.applies_when === 'string' ? JSON.parse(ms.applies_when) : ms.applies_when;
          const qtMatch = !aw.quality_tier || aw.quality_tier.includes(defaultQT);
          const sheenMatch = !aw.finish_sheen || aw.finish_sheen.includes(defaultSheen);
          if (qtMatch && sheenMatch && !matchedSystem) {
            matchedSystem = ms;
          }
        }
      });
      if (!matchedSystem && specSystems.length > 0) {
        matchedSystem = specSystems[0];
      }
      if (matchedSystem) {
        matchedSystems.push({ system: matchedSystem, role: 'finish' });
      }
    }
```

with:

```js
    // Role-aware resolution: a primer system (substrate/state- or QT-keyed) and a
    // finish system (QT-keyed) are resolved separately and emitted as their own
    // lines; stain specs resolve stain/sealer/clear. Role comes from product_role.
    // A per-(tier,role) override pins a system at the active defaultQT.
    const isStainSpec = specId.includes('STAIN');
    const repRoom = rooms.find(r => isSpecStateCompatible(specId, r)) || null;
    const specStates = repRoom ? resolveSubstrateStateForSpec(specId, repRoom) : [];
    const specOverride = (scenarioMaterialOverrides[specId] && scenarioMaterialOverrides[specId][defaultQT]) || null;
    const matchedSystems = resolveSpecSystems({
      specSystems, roleBySystemId, isStain: isStainSpec,
      defaultQT, defaultSheen, specStates, specOverride,
    });
```

(The downstream `matchedSystems.forEach(({ system: matchedSystem, role }) => { … })` emit loop is unchanged — it already reads `coats` from the matched system's products and pushes `productRole: role`.)

- [ ] **Step 6: Run the golden test to verify it passes**

Run: `npx vitest run engine/__tests__/material-estimates.test.js`
Expected: PASS — PRIME specs now emit `role: "primer"` with identical `gal`/`psKey`; FINISH specs unchanged.

- [ ] **Step 7: Run the full suite (no regressions)**

Run: `npx vitest run`
Expected: PASS — all suites green (Task 1 module tests + updated golden + existing engine/scenario suites; hours untouched).

- [ ] **Step 8: Commit**

```bash
git add Claude/tools/paintscope/src/engine/material-estimates.js Claude/tools/paintscope/src/engine/__tests__/material-estimates.test.js
git commit -m "feat(materials): role-aware primer/finish resolution + override param

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Full verification (unit gate + build + live)

**Files:** none (verification only).

- [ ] **Step 1: Full unit suite**

Run (from `tools/paintscope/`): `npx vitest run`
Expected: PASS — prior suite + new `material-system-roles` cases + updated golden; 0 failures.

- [ ] **Step 2: Build**

Run: `npx vite build`
Expected: build succeeds (~248 modules; only the pre-existing chunk/dynamic-import warnings).

- [ ] **Step 3: Live-verify on McLeod**

Run: `npm run dev`. Open the printed URL (`localhost:5173`/`5183`). In console: `localStorage.setItem('paintscope.admin','1')`, reload, load the **McLeod** project. Open the **Materials** view.

Verify:
1. Interior paint substrates that have substrate-keyed primers (e.g. an arch element / built-in / wood wall in a bare state, if present in McLeod) now show a **primer** line in addition to the **finish** line.
2. A drywall PRIME line is labeled **primer** (was finish); its gallons match the prior value.
3. **Hours** totals are unchanged vs before the change (materials-only change).
4. No new console errors.

If McLeod lacks a primer-bearing interior substrate, note that the primer-line behavior is covered by the Task 1 unit tests + the golden role correction, and report what was observable.

- [ ] **Step 4: Report**

Summarize: final `npx vitest run` count, build result, and the live observations (primer lines now present; drywall prime relabeled; hours unchanged). Do NOT push or merge — await user instruction.

---

## Self-Review

**Spec coverage:**
- §1/§6 role-aware resolution (primer + finish per role, unified matcher) → Task 1 (`resolveSpecSystems`/`systemMatches`) + Task 2 (integration). ✓
- §4 role classification via `product_role` → Task 1 (`buildRoleBySystemId`/`classifySystemRole`). ✓
- §5/§8 override consumed at `defaultQT`, param default `{}`, callers unchanged, synthetic tests → Task 1 (`specOverride` cases) + Task 2 (param, `specOverride` wiring). ✓
- §6 `specStates` via `resolveSubstrateStateForSpec` on first compatible room → Task 2 Step 5. ✓
- §9 golden delta (2 PRIME roles → primer, gallons identical) → Task 2 Steps 1-2,6. ✓
- §3 non-goals (no UI, no `scenario-estimate.js`, single `defaultQT`, sub-type not matched) → honored; no task touches them. ✓

**Placeholder scan:** none — every step has exact code/commands and expected output.

**Type consistency:** `buildRoleBySystemId`, `classifySystemRole`, `systemMatches`, `resolveSpecSystems` signatures match between Task 1 and the Task 2 call site; `resolveSpecSystems` returns `Array<{system, role}>` which the existing emit loop already destructures as `{ system: matchedSystem, role }`. The 4th param name `scenarioMaterialOverrides` is consistent throughout.

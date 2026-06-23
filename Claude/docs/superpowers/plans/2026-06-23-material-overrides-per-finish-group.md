# Per-Item Material Overrides (P3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project-level + per-finish-group material overrides (paint primer/finish + stain stain/sealer/clear) for both **products** and **coats**, with a new Materials Overrides panel and a resolved-trio chip strip on the substrate panel.

**Architecture:** Pure resolver helpers layer (`engine/material-overrides.js`) → state field added to `project.material_overrides` (extends the existing `{system, manual}` namespace with new `byRole`+`byFinishGroup` keys) → engine rekeys `scenarioMaterials` from `{specId}` to `{specId|finish_group}` and partitions quantities the same way → new project-level Materials Overrides panel + read-only substrate-panel chip strip consume the same resolver. Hours path untouched.

**Tech Stack:** React 19 (no TS), Vite 7, vitest. Pure ES modules under `tools/paintscope/src/`.

## Global Constraints

- Edit in the **MAIN checkout** (`C:\Eric_AI_Playground\Claude Code Uni\Claude`). Ignore `tools/paintscope/CLAUDE.md`'s worktree rule.
- Branch **`feature/p3-material-overrides`** off `feature/qt-builder-stain` @ `5934c722` (P2 + spec; PR #8 still open and P2 not yet merged). **Do NOT merge/push without asking.**
- **Hours estimates byte-identical.** No `engine/scenario-estimate.js` change touches the hours path. Verify via the existing `tools/paintscope/scripts/parity-estimate.mjs` (captures `grandTotalHours` + perSpec hours).
- **Materials byte-identical when no overrides set.** Empty `byRole`/`byFinishGroup` must produce identical material output to today. This is the migration safety guarantee.
- Reuse the existing `project.material_overrides` namespace: **add** `byRole`+`byFinishGroup` keys; **do NOT modify or delete** the existing `system` (per-spec-family override for Materials tab) or `manual` (manual line adds) keys.
- All work runs from `tools/paintscope/`: `npx vitest run` (P2 baseline **638** stays green + new tests), `npx vite build` (clean), live-verify at localhost:5173+.
- Plain JSX/JS, custom CSS vars, vitest `describe/it/expect`, synthetic-bundle test fixtures (follow existing `engine/__tests__/*` style).
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File map

| File | Responsibility | Change |
|---|---|---|
| `engine/material-overrides.js` | pure resolver helpers | **NEW** — `resolveSystem`, `resolveCoats` |
| `state/initial-state.js` | project shape | `material_overrides` gains `byRole: {}, byFinishGroup: {}` |
| `state/migrations.js` | backfill | add `byRole` + `byFinishGroup` to existing `material_overrides` |
| `engine/scenario-estimate.js` | scenarioMaterials build | rekey `{specId}` → `{specId|finish_group}`; first-fired-per-pair wins |
| `engine/material-estimates.js` | computeMaterialEstimates | iterate per-key; `buildSpecScopedQty` gains `finishGroup`; apply override via resolveSystem/resolveCoats |
| `components/setup/MaterialsOverridesPanel.jsx` | UI | **NEW** — paint + stain sub-tables; auto-discovered finish-group rows; canonical-by-role dropdowns |
| `components/setup/ProjectSetup.jsx` | wire panel | mount the new panel as a section/subview |
| `components/room-editor/SubstrateDetailPanel.jsx` | chip strip | small read-only resolved-trio strip at end of Coating Phases |

Tests created alongside: `engine/__tests__/material-overrides.test.js` (Task 1), `state/__tests__/material-overrides-migrations.test.js` (Task 2), `engine/__tests__/material-overrides-integration.test.js` (Task 3).

---

### Task 1: Pure resolver helpers (`material-overrides.js`)

**Files:**
- Create: `tools/paintscope/src/engine/material-overrides.js`
- Test: `tools/paintscope/src/engine/__tests__/material-overrides.test.js`

**Interfaces:**
- Produces:
  - `resolveSystem(role: string, finishGroup: string|null, overrides: object, scenarioSystem: string|null) -> string|null`
  - `resolveCoats(role: string, finishGroup: string|null, overrides: object, scenarioCoats: number) -> number`

  Both functions read `overrides.byFinishGroup[finishGroup]?.[<role>_system|<role>_coats]` first, fall back to `overrides.byRole?.[<role>_system|<role>_coats]`, then to the passed `scenarioSystem`/`scenarioCoats`. `overrides` may be null/undefined; nullish keys fall through.

- [ ] **Step 1: Write the failing test** — create `engine/__tests__/material-overrides.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { resolveSystem, resolveCoats } from '../material-overrides.js';

describe('resolveSystem', () => {
  it('falls through to scenarioSystem when overrides is null/empty', () => {
    expect(resolveSystem('clear', 'D', null, 'SYS_FILE')).toBe('SYS_FILE');
    expect(resolveSystem('clear', 'D', {}, 'SYS_FILE')).toBe('SYS_FILE');
    expect(resolveSystem('clear', 'D', { byRole: {}, byFinishGroup: {} }, 'SYS_FILE')).toBe('SYS_FILE');
  });
  it('uses project default (byRole) when finish-group has no entry', () => {
    const o = { byRole: { clear_system: 'SYS_PROJECT' }, byFinishGroup: {} };
    expect(resolveSystem('clear', 'D', o, 'SYS_FILE')).toBe('SYS_PROJECT');
  });
  it('finish-group overrides project default', () => {
    const o = {
      byRole: { clear_system: 'SYS_PROJECT' },
      byFinishGroup: { D: { clear_system: 'SYS_GROUP' } },
    };
    expect(resolveSystem('clear', 'D', o, 'SYS_FILE')).toBe('SYS_GROUP');
    // Different group falls through to project default
    expect(resolveSystem('clear', 'E', o, 'SYS_FILE')).toBe('SYS_PROJECT');
  });
  it('null override at a layer falls through (does not block)', () => {
    const o = {
      byRole: { clear_system: 'SYS_PROJECT' },
      byFinishGroup: { D: { clear_system: null } },  // explicit null = no override
    };
    expect(resolveSystem('clear', 'D', o, 'SYS_FILE')).toBe('SYS_PROJECT');
  });
  it('handles null finishGroup gracefully (no group → only project default + file)', () => {
    const o = { byRole: { clear_system: 'SYS_PROJECT' }, byFinishGroup: { D: { clear_system: 'SYS_GROUP' } } };
    expect(resolveSystem('clear', null, o, 'SYS_FILE')).toBe('SYS_PROJECT');
  });
  it('works the same for paint roles (primer / finish)', () => {
    const o = { byRole: { primer_system: 'SYS_PROJECT_PRIMER' }, byFinishGroup: { C: { finish_system: 'SYS_GROUP_FINISH' } } };
    expect(resolveSystem('primer', 'C', o, 'SYS_FILE_PRIMER')).toBe('SYS_PROJECT_PRIMER');
    expect(resolveSystem('finish', 'C', o, 'SYS_FILE_FINISH')).toBe('SYS_GROUP_FINISH');
  });
});

describe('resolveCoats', () => {
  it('falls through to scenarioCoats when no overrides', () => {
    expect(resolveCoats('clear', 'D', null, 2)).toBe(2);
    expect(resolveCoats('clear', 'D', { byRole: {}, byFinishGroup: {} }, 2)).toBe(2);
  });
  it('layers byFinishGroup > byRole > scenarioCoats', () => {
    const o = {
      byRole: { clear_coats: 2 },
      byFinishGroup: { D: { clear_coats: 3 } },
    };
    expect(resolveCoats('clear', 'D', o, 1)).toBe(3);
    expect(resolveCoats('clear', 'E', o, 1)).toBe(2);
    expect(resolveCoats('clear', null, o, 1)).toBe(2);
  });
  it('handles 0 as a valid coat count (sealer can be 0)', () => {
    const o = { byRole: { sealer_coats: 0 }, byFinishGroup: {} };
    expect(resolveCoats('sealer', 'D', o, 1)).toBe(0);
  });
  it('null override falls through (not 0, not undefined-as-zero)', () => {
    const o = { byRole: {}, byFinishGroup: { D: { clear_coats: null } } };
    expect(resolveCoats('clear', 'D', o, 2)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/paintscope && npx vitest run src/engine/__tests__/material-overrides.test.js`
Expected: FAIL — `resolveSystem is not a function`.

- [ ] **Step 3: Implement** — create `engine/material-overrides.js`:

```js
// Pure layered resolvers for project-level material overrides (P3).
// Layering for a given (role, finishGroup):
//   1. overrides.byFinishGroup[finishGroup]?.[<role>_<kind>]   (finest)
//   2. overrides.byRole?.[<role>_<kind>]                       (project-wide)
//   3. fall-through (scenario file value)
// Nullish (null/undefined) at any layer falls through. `0` is a valid value
// (sealer can be authored as 0 coats); use `?? ` not `||`.
//
// `kind` is 'system' or 'coats'. Field naming is `<role>_<kind>` —
// e.g. 'clear_system', 'finish_coats'. Works for paint (primer, finish)
// and stain (stain, sealer, clear) roles uniformly.

function pick(overrides, finishGroup, key) {
  const fg = overrides?.byFinishGroup?.[finishGroup]?.[key];
  if (fg != null) return fg;
  const def = overrides?.byRole?.[key];
  if (def != null) return def;
  return undefined;
}

export function resolveSystem(role, finishGroup, overrides, scenarioSystem) {
  const v = pick(overrides, finishGroup, `${role}_system`);
  return v !== undefined ? v : scenarioSystem;
}

export function resolveCoats(role, finishGroup, overrides, scenarioCoats) {
  const v = pick(overrides, finishGroup, `${role}_coats`);
  return v !== undefined ? v : scenarioCoats;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/paintscope && npx vitest run src/engine/__tests__/material-overrides.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: Run the full suite (regression gate)**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — P2 baseline 638 + 10 new = 648.

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/engine/material-overrides.js tools/paintscope/src/engine/__tests__/material-overrides.test.js
git commit -m "feat(materials): pure resolveSystem + resolveCoats override helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: State default + migration

**Files:**
- Modify: `tools/paintscope/src/state/initial-state.js:261`
- Modify: `tools/paintscope/src/state/migrations.js:327-334` (extend the existing material_overrides backfill block)
- Test: `tools/paintscope/src/state/__tests__/material-overrides-migrations.test.js` (new)

**Interfaces:**
- Produces: `project.material_overrides` shape gains two keys:
  - `byRole: { <role>_system?: string|null, <role>_coats?: number|null }` (sparse — only set fields override)
  - `byFinishGroup: { [groupId: string]: { ...same sparse shape... } }`
  Roles ∈ {primer, finish, stain, sealer, clear}. Existing `system` and `manual` keys preserved.

- [ ] **Step 1: Write the failing migration test** — create `state/__tests__/material-overrides-migrations.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { migrateInline } from '../migrations.js';
import { createProject } from '../initial-state.js';

describe('material_overrides — byRole / byFinishGroup backfill', () => {
  it('createProject seeds material_overrides with byRole and byFinishGroup empties', () => {
    const p = createProject();
    expect(p.material_overrides).toEqual({ system: {}, manual: [], byRole: {}, byFinishGroup: {} });
  });
  it('migrates an old project missing material_overrides entirely', () => {
    const state = { project: { name: 'X' }, rooms: [] };
    migrateInline(state);
    expect(state.project.material_overrides).toBeDefined();
    expect(state.project.material_overrides.system).toEqual({});
    expect(Array.isArray(state.project.material_overrides.manual)).toBe(true);
    expect(state.project.material_overrides.byRole).toEqual({});
    expect(state.project.material_overrides.byFinishGroup).toEqual({});
  });
  it('migrates an old project with material_overrides but no byRole/byFinishGroup', () => {
    const state = { project: { name: 'X', material_overrides: { system: { SF_X: 'SYS_X' }, manual: [{ id: 'm1' }] } }, rooms: [] };
    migrateInline(state);
    expect(state.project.material_overrides.system).toEqual({ SF_X: 'SYS_X' });  // preserved
    expect(state.project.material_overrides.manual).toEqual([{ id: 'm1' }]);     // preserved
    expect(state.project.material_overrides.byRole).toEqual({});                  // added
    expect(state.project.material_overrides.byFinishGroup).toEqual({});           // added
  });
  it('does not overwrite existing byRole / byFinishGroup values on re-migration', () => {
    const state = { project: { material_overrides: { system: {}, manual: [], byRole: { clear_system: 'SYS_X' }, byFinishGroup: { D: { stain_coats: 2 } } } }, rooms: [] };
    migrateInline(state);
    expect(state.project.material_overrides.byRole).toEqual({ clear_system: 'SYS_X' });
    expect(state.project.material_overrides.byFinishGroup).toEqual({ D: { stain_coats: 2 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/paintscope && npx vitest run src/state/__tests__/material-overrides-migrations.test.js`
Expected: FAIL — `material_overrides.byRole` undefined.

- [ ] **Step 3: Update `state/initial-state.js`** — find the project material_overrides seed (currently line 261):

```js
    material_overrides: { system: {}, manual: [] },
```

Replace with:

```js
    material_overrides: { system: {}, manual: [], byRole: {}, byFinishGroup: {} },
```

- [ ] **Step 4: Update `state/migrations.js`** — find the existing backfill block (around lines 327-334):

```js
  if (parsed.project) {
    if (parsed.project.default_brand === undefined) parsed.project.default_brand = null;
    if (!parsed.project.material_overrides) parsed.project.material_overrides = { system: {}, manual: [] };
    // Materials MVP: manual was previously an object map (unused); convert to array.
    if (parsed.project.material_overrides && !Array.isArray(parsed.project.material_overrides.manual)) {
      parsed.project.material_overrides.manual = [];
    }
  }
```

Replace with (additive — keep existing lines, add the two new backfills):

```js
  if (parsed.project) {
    if (parsed.project.default_brand === undefined) parsed.project.default_brand = null;
    if (!parsed.project.material_overrides) parsed.project.material_overrides = { system: {}, manual: [], byRole: {}, byFinishGroup: {} };
    // Materials MVP: manual was previously an object map (unused); convert to array.
    if (parsed.project.material_overrides && !Array.isArray(parsed.project.material_overrides.manual)) {
      parsed.project.material_overrides.manual = [];
    }
    // P3: backfill byRole + byFinishGroup on projects that predate per-finish-group overrides.
    if (!parsed.project.material_overrides.byRole) parsed.project.material_overrides.byRole = {};
    if (!parsed.project.material_overrides.byFinishGroup) parsed.project.material_overrides.byFinishGroup = {};
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd tools/paintscope && npx vitest run src/state/__tests__/material-overrides-migrations.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full suite**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — 648 + 4 new = 652 (no regressions).

- [ ] **Step 7: Commit**

```bash
git add tools/paintscope/src/state/initial-state.js tools/paintscope/src/state/migrations.js tools/paintscope/src/state/__tests__/material-overrides-migrations.test.js
git commit -m "feat(materials): state default + migration for byRole/byFinishGroup

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Engine integration — rekey, partition, apply overrides

**Files:**
- Modify: `tools/paintscope/src/engine/scenario-estimate.js:204-220` (rekey `scenarioMaterials`)
- Modify: `tools/paintscope/src/engine/material-estimates.js:120-141` (`buildSpecScopedQty` gains `finishGroup` param)
- Modify: `tools/paintscope/src/engine/material-estimates.js:200-260` (iterate per-key; apply override in matchedSystems loop)
- Test: `tools/paintscope/src/engine/__tests__/material-overrides-integration.test.js` (new)

**Interfaces:**
- Consumes: `resolveSystem`, `resolveCoats` (Task 1); `project.material_overrides.byRole`/`byFinishGroup` (Task 2).
- Produces: a `scenarioMaterials` entry per `(specId, finish_group)`; each `computeMaterialEstimates` line carries `finishGroup` on its `sysEntry`. Existing line shape (productRole, productId, gallons, etc.) unchanged.

- [ ] **Step 1: Write the failing integration test** — create `engine/__tests__/material-overrides-integration.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { computeMaterialEstimates } from '../material-estimates.js';

// Minimal fixture: 2 door casings in different finish_groups, both stained.
// Same spec family fires twice with different finish_group ctx values.
function fixture({ projectOverrides = { system: {}, manual: [], byRole: {}, byFinishGroup: {} } } = {}) {
  const state = {
    project: { quality_tier: 'QT3', default_brand: null, default_complexity: 'STD', material_overrides: projectOverrides },
    rooms: [
      { id: 'R1', substrates: {
        int_door_casing: { painting: true, stain_on: true, sealer_on: false, clear_on: true, finish_group: 'D' },
      } },
      { id: 'R2', substrates: {
        int_door_casing: { painting: true, stain_on: true, sealer_on: false, clear_on: true, finish_group: 'E' },
      } },
    ],
  };
  const roomLookups = new Map([
    [0, { qty: new Map([['PS_SURFACE_LF.DOOR_CASING', { value: 30, unit: 'LF' }]]) }],
    [1, { qty: new Map([['PS_SURFACE_LF.DOOR_CASING', { value: 50, unit: 'LF' }]]) }],
  ]);
  const specResults = [
    { specId: 'SF_DOOR_CASING_NC_STAIN', domain: 'interior', roomIndex: 0,
      tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }] },
    { specId: 'SF_DOOR_CASING_NC_STAIN', domain: 'interior', roomIndex: 1,
      tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }] },
    { specId: 'SF_DOOR_CASING_NC_CLEAR', domain: 'interior', roomIndex: 0,
      tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }] },
    { specId: 'SF_DOOR_CASING_NC_CLEAR', domain: 'interior', roomIndex: 1,
      tasks: [{ psKey: 'PS_SURFACE_LF.DOOR_CASING' }] },
  ];
  // The rekey by Task 3 means scenarioMaterials is keyed `${specId}|${finish_group}`.
  // Same scenario shape per group (only the system + coats differ via override).
  const scenarioMaterials = {
    'SF_DOOR_CASING_NC_STAIN|D': { specId: 'SF_DOOR_CASING_NC_STAIN', finishGroup: 'D', scenarioId: 'SCN_DC_STAIN',
      systems: ['SYS_STAIN_OIL'], coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 1 } },
    'SF_DOOR_CASING_NC_STAIN|E': { specId: 'SF_DOOR_CASING_NC_STAIN', finishGroup: 'E', scenarioId: 'SCN_DC_STAIN',
      systems: ['SYS_STAIN_OIL'], coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 1 } },
    'SF_DOOR_CASING_NC_CLEAR|D': { specId: 'SF_DOOR_CASING_NC_CLEAR', finishGroup: 'D', scenarioId: 'SCN_DC_CLEAR',
      systems: ['SYS_CLEAR_POLY_WB'], coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 2 } },
    'SF_DOOR_CASING_NC_CLEAR|E': { specId: 'SF_DOOR_CASING_NC_CLEAR', finishGroup: 'E', scenarioId: 'SCN_DC_CLEAR',
      systems: ['SYS_CLEAR_POLY_WB'], coats: { stain_coats: 1, sealer_coats: 1, clear_coats: 2 } },
  };
  return computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
}

describe('material overrides — per-finish-group integration', () => {
  it('emits one clear line per finish_group when no overrides set (partitioned by group, totals byte-equivalent to today)', () => {
    const est = fixture();
    const clearLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && e.productRole === 'clear');
    expect(clearLines.length).toBe(2);
    // Both groups still resolve to SYS_CLEAR_POLY_WB (scenario file pick)
    const productIds = clearLines.map(l => l.system?.id || l.systemId).sort();
    expect(productIds).toEqual(['SYS_CLEAR_POLY_WB', 'SYS_CLEAR_POLY_WB']);
    // Surface totals: 30 LF (group D) + 50 LF (group E) = 80 LF total (matches pre-P3 single line)
    const totalSF = clearLines.reduce((a, b) => a + (b.surfaceSF ?? b.specSF ?? 0), 0);
    expect(totalSF).toBeCloseTo(80, 1);
  });

  it('applies a finish-group override only to the matching group', () => {
    const est = fixture({ projectOverrides: {
      system: {}, manual: [], byRole: {},
      byFinishGroup: { D: { clear_system: 'SYS_CLEAR_LACQUER' } },
    }});
    const clearLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && e.productRole === 'clear');
    expect(clearLines.length).toBe(2);
    const byGroup = Object.fromEntries(clearLines.map(l => [l.finishGroup, l.system?.id || l.systemId]));
    expect(byGroup.D).toBe('SYS_CLEAR_LACQUER');   // overridden
    expect(byGroup.E).toBe('SYS_CLEAR_POLY_WB');   // file default
  });

  it('project default (byRole) applies to all groups when finish-group has no override', () => {
    const est = fixture({ projectOverrides: {
      system: {}, manual: [], byFinishGroup: {},
      byRole: { clear_system: 'SYS_CLEAR_LACQUER' },
    }});
    const clearLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && e.productRole === 'clear');
    expect(clearLines.every(l => (l.system?.id || l.systemId) === 'SYS_CLEAR_LACQUER')).toBe(true);
  });

  it('finish-group override beats project default for the same role', () => {
    const est = fixture({ projectOverrides: {
      system: {}, manual: [],
      byRole: { clear_system: 'SYS_CLEAR_LACQUER' },
      byFinishGroup: { D: { clear_system: 'SYS_CLEAR_POLY_OIL' } },
    }});
    const clearLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && e.productRole === 'clear');
    const byGroup = Object.fromEntries(clearLines.map(l => [l.finishGroup, l.system?.id || l.systemId]));
    expect(byGroup.D).toBe('SYS_CLEAR_POLY_OIL');     // finish-group wins
    expect(byGroup.E).toBe('SYS_CLEAR_LACQUER');      // project default
  });

  it('coats override (byFinishGroup) moves stain-role gallons for that group only', () => {
    // Same fixture but stain override: group D = 2 stain coats, group E = file default (1)
    const est = fixture({ projectOverrides: {
      system: {}, manual: [], byRole: {},
      byFinishGroup: { D: { stain_coats: 2 } },
    }});
    const stainLines = est.filter(e => e.specFamilyId === 'SF_DOOR_CASING_NC_STAIN' && e.productRole === 'stain');
    expect(stainLines.length).toBe(2);
    const byGroup = Object.fromEntries(stainLines.map(l => [l.finishGroup, l.gallons]));
    // Group D should have ~2x gallons of group E (same SF: D=30, E=50; D has 2 coats, E has 1)
    // Ratio = (30 * 2) / (50 * 1) = 1.2x — D should be 60 SF-coats, E should be 50 SF-coats
    expect(byGroup.D / 60).toBeCloseTo(byGroup.E / 50, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/paintscope && npx vitest run src/engine/__tests__/material-overrides-integration.test.js`
Expected: FAIL — `clearLines.length === 1` (today, scenarioMaterials collapses to 1 entry per specId; the test expects 2).

- [ ] **Step 3a: Rekey `scenarioMaterials`** in `engine/scenario-estimate.js` — find the block at lines 204-220:

```js
    const scenarioMaterials = {};
    for (const pr of perInputResults) {
      if (isExteriorRoomIndex(pr.roomIndex)) continue;
      if (scenarioMaterials[pr.specId]) continue;            // first fired = representative
      const scn = bundle.scenarios.find(s => s.scenario_id === pr.scenarioId);
      if (!scn) continue;
      const cc = scn.coat_counts || {};
      const ctx = pr.ctx || {};
      scenarioMaterials[pr.specId] = {
        scenarioId: pr.scenarioId,
        systems: scn.material_systems || [],
        coats: {
          stain_coats:  ctx.stain_coats  ?? cc.stain_coats  ?? 1,
          sealer_coats: ctx.sealer_coats ?? cc.sealer_coats ?? 1,
          clear_coats:  ctx.clear_coats  ?? cc.clear_coats  ?? 1,
        },
      };
    }
```

Replace with:

```js
    const scenarioMaterials = {};
    for (const pr of perInputResults) {
      if (isExteriorRoomIndex(pr.roomIndex)) continue;
      const fg = pr.ctx?.finish_group ?? null;
      // P3: key by (specId, finish_group) so two finish groups within the same
      // spec family produce two material lines that can carry different
      // products + coats. First fired per (specId, fg) pair wins.
      const key = `${pr.specId}|${fg ?? '__none__'}`;
      if (scenarioMaterials[key]) continue;
      const scn = bundle.scenarios.find(s => s.scenario_id === pr.scenarioId);
      if (!scn) continue;
      const cc = scn.coat_counts || {};
      const ctx = pr.ctx || {};
      scenarioMaterials[key] = {
        specId: pr.specId,
        finishGroup: fg,
        scenarioId: pr.scenarioId,
        systems: scn.material_systems || [],
        coats: {
          stain_coats:  ctx.stain_coats  ?? cc.stain_coats  ?? 1,
          sealer_coats: ctx.sealer_coats ?? cc.sealer_coats ?? 1,
          clear_coats:  ctx.clear_coats  ?? cc.clear_coats  ?? 1,
        },
      };
    }
```

- [ ] **Step 3b: Extend `buildSpecScopedQty` to partition by finishGroup** in `engine/material-estimates.js` — find the function (lines 120-141):

```js
  function buildSpecScopedQty(specId) {
    const scoped = new Map();
    rooms.forEach((room, ri) => {
      // Substrate state compatibility (e.g. trim prime spec only counts bare_wood rooms)
      if (!isSpecStateCompatible(specId, room)) return;
      // Painting toggle guard for substrates that have one (doors, windows, casings)
      const primarySub = SPEC_SUBSTRATE_MAP[specId];
      if (primarySub) {
        const subConfig = (room.substrates || {})[primarySub];
        if (subConfig && subConfig.painting === false) return;
      }
      const roomLookup = roomLookups.get(ri);
      const roomQty = roomLookup?.qty || roomLookup;
      if (!roomQty) return;
      roomQty.forEach((val, key) => {
        const existing = scoped.get(key);
        if (existing) existing.value += val.value;
        else scoped.set(key, { ...val });
      });
    });
    return scoped;
  }
```

Replace with (gains a `finishGroup` parameter; filters rooms whose primary substrate's finish_group matches; `null`/`undefined` means "match any" for backward-compat):

```js
  // P3: `finishGroup` partitions quantities. When set, only sums contributions from
  // rooms whose primary substrate for this spec carries the matching finish_group.
  // When null/undefined, sums all rooms (backward-compat).
  function buildSpecScopedQty(specId, finishGroup) {
    const scoped = new Map();
    rooms.forEach((room, ri) => {
      if (!isSpecStateCompatible(specId, room)) return;
      const primarySub = SPEC_SUBSTRATE_MAP[specId];
      const subConfig = primarySub ? (room.substrates || {})[primarySub] : null;
      if (subConfig && subConfig.painting === false) return;
      // P3 partition: only count rooms whose substrate's finish_group matches.
      // If finishGroup is null/undefined, accept everything (legacy behavior).
      if (finishGroup !== undefined && finishGroup !== null) {
        const rowFg = subConfig?.finish_group ?? null;
        if (rowFg !== finishGroup) return;
      }
      const roomLookup = roomLookups.get(ri);
      const roomQty = roomLookup?.qty || roomLookup;
      if (!roomQty) return;
      roomQty.forEach((val, key) => {
        const existing = scoped.get(key);
        if (existing) existing.value += val.value;
        else scoped.set(key, { ...val });
      });
    });
    return scoped;
  }
```

- [ ] **Step 3c: Update the per-spec outer loop to iterate per (specId, finishGroup) and apply overrides** in `engine/material-estimates.js` — find the per-spec loop start (around line 200 — the loop that uses `scopedQty` from `buildSpecScopedQty(specId)`). Today the outer iteration is by `activatedSpecs`. Change it to iterate `scenarioMaterials` entries (which are already `(specId, fg)` keyed). Also import the resolver helpers at the top.

Top of file — add to the existing imports:

```js
import { resolveSystem, resolveCoats as resolveOverrideCoats } from './material-overrides.js';
```

(Use the alias `resolveOverrideCoats` to avoid collision with the existing local `resolveCoats(prod, ...)` paint helper.)

Find the per-spec iteration that calls `buildSpecScopedQty(specId)` (a few lines after line 200, inside an `activatedSpecs.forEach(...)` or equivalent). Replace the outer iteration body so it iterates `scenarioMaterials` entries instead:

```js
  // P3: iterate per (specId, finishGroup) pair. Each entry is one materials line group.
  Object.entries(scenarioMaterials).forEach(([key, sysEntry]) => {
    const { specId, finishGroup } = sysEntry;
    if (!activatedSpecs.has(specId)) return;
    const scopedQty = buildSpecScopedQty(specId, finishGroup);
    // ... existing surface-area aggregation logic continues unchanged using scopedQty ...
    // (specSF computation, matchedKey selection, surfaceKeys loop — all unchanged)
```

⚠ **Important:** the existing per-spec loop body (lines ~200-310) does the surface-area aggregation, matchedSystems building, profile lookup, and emission. Keep ALL of that body unchanged; only the **outer iteration** changes (from `activatedSpecs.forEach(specId => { ...; const scopedQty = buildSpecScopedQty(specId); ... })` to `Object.entries(scenarioMaterials).forEach(([key, sysEntry]) => { ...; const scopedQty = buildSpecScopedQty(sysEntry.specId, sysEntry.finishGroup); ... })`).

The existing code inside the loop already does `const sysEntry = scenarioMaterials[specId];` (line 219); now `sysEntry` comes from the outer iteration instead. **Remove the inner `const sysEntry = scenarioMaterials[specId];` line** to avoid the redeclaration.

- [ ] **Step 3d: Apply the system + coats override in the matchedSystems loop** — inside the loop that emits one estimate per matched system (around lines 233-243), the matchedSystem id and the coats need to pass through the resolver. Find:

```js
    matchedSystems.forEach(({ system: matchedSystem, role }) => {
      // Get coats: stain/sealer/clear roles track the scenario's per-phase coat
      // count (so gallons follow tier coats); paint roles keep resolveCoats.
      let coats;
      if (STAIN_GALLON_ROLES.has(role)) {
        coats = sysEntry?.coats?.[ROLE_TO_COAT_FIELD[role]] ?? 1;
      } else {
        coats = matchedSystem
          ? resolveCoats(matchedSystem.id, specId, productsBySystem, productsBySystemId, role).coats
          : 1;
      }
```

Replace with:

```js
    matchedSystems.forEach(({ system: matchedSystem, role }) => {
      // P3: project-level override applies first (replaces matchedSystem id when set).
      const overrideSystemId = resolveSystem(role, sysEntry.finishGroup, project.material_overrides, matchedSystem ? matchedSystem.id : null);
      if (matchedSystem && overrideSystemId && overrideSystemId !== matchedSystem.id) {
        matchedSystem = MATERIAL_SYSTEMS.find(s => s.id === overrideSystemId) || { id: overrideSystemId, name: overrideSystemId };
      } else if (!matchedSystem && overrideSystemId) {
        matchedSystem = MATERIAL_SYSTEMS.find(s => s.id === overrideSystemId) || { id: overrideSystemId, name: overrideSystemId };
      }

      // Get base coats: stain/sealer/clear roles track scenarioMaterials.coats;
      // paint roles keep the existing resolveCoats(prod) path.
      let baseCoats;
      if (STAIN_GALLON_ROLES.has(role)) {
        baseCoats = sysEntry?.coats?.[ROLE_TO_COAT_FIELD[role]] ?? 1;
      } else {
        baseCoats = matchedSystem
          ? resolveCoats(matchedSystem.id, specId, productsBySystem, productsBySystemId, role).coats
          : 1;
      }
      // P3: layer the override on top (works uniformly for stain + paint roles).
      let coats = resolveOverrideCoats(role, sysEntry.finishGroup, project.material_overrides, baseCoats);
```

- [ ] **Step 3e: Stamp `finishGroup` onto the emitted estimate line** — the test asserts `l.finishGroup`. Find the estimate emission (search for `estimates.push({` inside the matchedSystems loop). Add `finishGroup: sysEntry.finishGroup,` to the pushed object's payload.

- [ ] **Step 4: Run integration test to verify it passes**

Run: `cd tools/paintscope && npx vitest run src/engine/__tests__/material-overrides-integration.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full suite (regression gate — this is the big one)**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — 652 + 5 new = 657. Pay special attention to existing material-estimates / stain-material-coats / material-array-selection tests; if any fail because the line shape now carries `finishGroup`, that's expected and the test fixture's expectations may need a one-line update (don't change behavior — just acknowledge the added field if a test asserts shape exhaustively).

- [ ] **Step 6: Build check**

Run: `cd tools/paintscope && npx vite build`
Expected: `✓ built` (the pre-existing chunk-size warning is fine).

- [ ] **Step 7: Paint coats verification (risk #1)** — append one more test to `material-overrides-integration.test.js` (a paint case proves the override flows through paint's `resolveCoats(prod)` baseline path):

```js
describe('paint coats override (risk #1 verification)', () => {
  it('byRole.finish_coats overrides paint finish gallons', () => {
    // Stand up a minimal cabinet-paint fixture (paint side; primer + finish roles).
    const state = {
      project: { quality_tier: 'QT3', default_brand: null, default_complexity: 'STD',
        material_overrides: { system: {}, manual: [], byRole: { finish_coats: 3 }, byFinishGroup: {} } },
      rooms: [{ id: 'R1', substrates: { cabinet: { painting: true, finish_group: 'C' } } }],
    };
    const roomLookups = new Map([[0, { qty: new Map([['PS_SURFACE_SF.CABINET_FRAME', { value: 100, unit: 'SF' }]]) }]]);
    const specResults = [{ specId: 'SF_CABINET_NC_PAINT', domain: 'interior', roomIndex: 0,
      tasks: [{ psKey: 'PS_SURFACE_SF.CABINET_FRAME' }] }];
    const scenarioMaterials = {
      'SF_CABINET_NC_PAINT|C': { specId: 'SF_CABINET_NC_PAINT', finishGroup: 'C', scenarioId: 'SCN_CAB',
        systems: ['SYS_PRIMER_WOOD_ACRYLIC', 'SYS_FF_STANDARD_ACRYLIC'] },
    };
    const { computeMaterialEstimates } = await import('../material-estimates.js');
    const est = computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterials);
    const finishLine = est.find(e => e.specFamilyId === 'SF_CABINET_NC_PAINT' && e.productRole === 'finish');
    expect(finishLine).toBeDefined();
    // Without override, paint would use product.coats_required (typically 1 or 2).
    // With override = 3, gallons should reflect 3 coats. We assert the override
    // value flowed into the math by comparing to a no-override baseline.
    const baselineState = { ...state, project: { ...state.project, material_overrides: { system: {}, manual: [], byRole: {}, byFinishGroup: {} } } };
    const baselineEst = computeMaterialEstimates(baselineState, roomLookups, specResults, scenarioMaterials);
    const baselineFinish = baselineEst.find(e => e.specFamilyId === 'SF_CABINET_NC_PAINT' && e.productRole === 'finish');
    expect(finishLine.gallons).toBeGreaterThan(baselineFinish.gallons);  // override → more coats → more gallons
  });
});
```

Run: `cd tools/paintscope && npx vitest run src/engine/__tests__/material-overrides-integration.test.js`
Expected: PASS. **If the assertion `expect(finishLine.gallons).toBeGreaterThan(baselineFinish.gallons)` fails**, that's the risk #1 manifesting — paint's coat path didn't pick up the override. Trace `resolveOverrideCoats`'s effect inside the paint branch (`STAIN_GALLON_ROLES.has(role)` === false): `baseCoats` should be the `resolveCoats(prod).coats` result, then the override should layer on top. If `baseCoats` is something fixed like product's `coats_required`, confirm the override variable `coats` (not `baseCoats`) is what flows into the gallon math downstream — search for `* coats` in the file and confirm it uses the post-override `coats`.

- [ ] **Step 8: Commit**

```bash
git add tools/paintscope/src/engine/scenario-estimate.js tools/paintscope/src/engine/material-estimates.js tools/paintscope/src/engine/__tests__/material-overrides-integration.test.js
git commit -m "feat(materials): engine rekey + partition + override application

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Materials Overrides panel UI + setup wiring

**Files:**
- Create: `tools/paintscope/src/components/setup/MaterialsOverridesPanel.jsx`
- Modify: `tools/paintscope/src/components/setup/ProjectSetup.jsx` (mount the panel)

**Interfaces:**
- Consumes: `state.project.material_overrides.byRole` / `.byFinishGroup` (read); dispatches `SET_PROJECT` action to write (existing action — see existing `material_overrides` writes in `state/reducer.js`).
- Produces: a self-contained panel rendering the Paint + Stain sub-tables.

No unit test for this task (component-level visual UI; gate = build clean + live-verify in Task 6).

- [ ] **Step 1: Skeleton the panel** — create `components/setup/MaterialsOverridesPanel.jsx`:

```jsx
// Project-level material overrides (P3). Two sub-tables (paint + stain).
// Rows = Project default + one row per in-use finish_group. Cell value reads
// from project.material_overrides.{byRole, byFinishGroup}; edits dispatch
// SET_PROJECT to update the corresponding sparse entry. The engine consumes
// these via resolveSystem / resolveCoats (engine/material-overrides.js).

import { useMemo } from 'react';
import { useAppState } from '../../hooks/useAppState.js';   // adjust import to whichever hook the codebase uses; if state comes via context/props, accept (state, dispatch) as props
import Select from '../shared/Select';
import { MATERIAL_SYSTEMS, MATERIAL_SYSTEM_PRODUCTS } from '../../data/scenario-rate-data.js';
import { buildRoleBySystemId, classifySystemRole } from '../../engine/material-system-roles.js';

const PAINT_ROLES = ['primer', 'finish'];
const STAIN_ROLES = ['stain', 'sealer', 'clear'];
const COAT_RANGE = {
  primer_coats: [0, 3], finish_coats: [1, 3],
  stain_coats: [1, 2], sealer_coats: [0, 2], clear_coats: [1, 3],
};

const ROLE_BY_SYSTEM_ID = buildRoleBySystemId(MATERIAL_SYSTEM_PRODUCTS);
// Canonical-by-role menu: dedupe MATERIAL_SYSTEMS by id, group by role.
// Built once at module load.
const MENU_BY_ROLE = (() => {
  const out = { primer: [], finish: [], stain: [], sealer: [], clear: [] };
  const seen = new Set();
  for (const ms of MATERIAL_SYSTEMS) {
    if (seen.has(ms.id)) continue;
    seen.add(ms.id);
    const role = classifySystemRole(ms.id, ROLE_BY_SYSTEM_ID);
    if (role && out[role]) out[role].push({ id: ms.id, name: ms.name || ms.id });
  }
  return out;
})();

function discoverFinishGroups(rooms) {
  const paint = new Set();
  const stain = new Set();
  for (const room of rooms || []) {
    for (const sub of Object.values(room.substrates || {})) {
      const fg = sub?.finish_group;
      if (!fg) continue;
      const isStainSub = !!(sub.stain_on || sub.sealer_on || sub.clear_on);
      if (isStainSub) stain.add(fg);
      else paint.add(fg);
    }
  }
  return { paint: [...paint].sort(), stain: [...stain].sort() };
}

function getCell(overrides, fg, key) {
  if (fg === '__default__') return overrides?.byRole?.[key] ?? null;
  return overrides?.byFinishGroup?.[fg]?.[key] ?? null;
}

function buildSet(overrides, fg, key, value) {
  // Returns the updated overrides object. value === null clears the entry.
  const next = { ...overrides, byRole: { ...(overrides.byRole || {}) }, byFinishGroup: { ...(overrides.byFinishGroup || {}) } };
  if (fg === '__default__') {
    if (value === null) delete next.byRole[key];
    else next.byRole[key] = value;
  } else {
    const groupEntry = { ...(next.byFinishGroup[fg] || {}) };
    if (value === null) delete groupEntry[key];
    else groupEntry[key] = value;
    if (Object.keys(groupEntry).length === 0) delete next.byFinishGroup[fg];
    else next.byFinishGroup[fg] = groupEntry;
  }
  return next;
}

function Cell({ overrides, fg, role, kind, dispatch, project, isInherited }) {
  const key = `${role}_${kind}`;
  const value = getCell(overrides, fg, key);
  const isOverride = value !== null && value !== undefined;

  const onChange = (newVal) => {
    const next = buildSet(overrides, fg, key, newVal);
    dispatch({ type: 'SET_PROJECT', payload: { field: 'material_overrides', value: next } });
  };

  if (kind === 'system') {
    const menu = MENU_BY_ROLE[role] || [];
    const options = [{ value: '', label: isInherited ? '— default —' : '— inherit —' }, ...menu.map(s => ({ value: s.id, label: s.name }))];
    return (
      <td style={cellStyle}>
        <Select
          options={options}
          value={value || ''}
          onChange={v => onChange(v || null)}
          style={{ borderColor: isOverride ? 'var(--accent, #82aaff)' : 'var(--border)' }}
        />
        {isOverride && (
          <div style={{ fontSize: 9, color: 'var(--accent, #82aaff)' }}>
            override <span onClick={() => onChange(null)} style={revertLink}>default</span>
          </div>
        )}
      </td>
    );
  }
  // coats kind
  const [lo, hi] = COAT_RANGE[key] || [0, 9];
  const coatOptions = [{ value: '', label: isInherited ? '— default —' : '— inherit —' }];
  for (let n = lo; n <= hi; n++) coatOptions.push({ value: String(n), label: String(n) });
  return (
    <td style={cellStyle}>
      <Select
        options={coatOptions}
        value={value == null ? '' : String(value)}
        onChange={v => onChange(v === '' ? null : Number(v))}
        style={{ borderColor: isOverride ? 'var(--accent, #82aaff)' : 'var(--border)' }}
      />
      {isOverride && (
        <div style={{ fontSize: 9, color: 'var(--accent, #82aaff)' }}>
          override <span onClick={() => onChange(null)} style={revertLink}>default</span>
        </div>
      )}
    </td>
  );
}

function SubTable({ title, roles, rows, overrides, dispatch, project }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, marginBottom: 8 }}>{title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
            <th style={thStyle}>Row</th>
            {roles.map(r => <th key={`${r}_system`} style={thStyle}>{r.charAt(0).toUpperCase() + r.slice(1)} System</th>)}
            {roles.map(r => <th key={`${r}_coats`} style={thStyle}>{r.charAt(0).toUpperCase() + r.slice(1)} Coats</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 10px', textAlign: 'left' }}>{row.label}</td>
              {roles.map(r => <Cell key={`${row.id}_${r}_system`} overrides={overrides} fg={row.id} role={r} kind="system" dispatch={dispatch} project={project} isInherited={row.id !== '__default__'} />)}
              {roles.map(r => <Cell key={`${row.id}_${r}_coats`} overrides={overrides} fg={row.id} role={r} kind="coats" dispatch={dispatch} project={project} isInherited={row.id !== '__default__'} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MaterialsOverridesPanel({ state, dispatch }) {
  const project = state.project;
  const overrides = project.material_overrides || { byRole: {}, byFinishGroup: {} };
  const { paint, stain } = useMemo(() => discoverFinishGroups(state.rooms), [state.rooms]);

  const paintRows = [{ id: '__default__', label: 'Project default' }, ...paint.map(fg => ({ id: fg, label: `Group ${fg}` }))];
  const stainRows = [{ id: '__default__', label: 'Project default' }, ...stain.map(fg => ({ id: fg, label: `Group ${fg}` }))];

  return (
    <div className="panel-section" style={{ padding: 16 }}>
      <div className="section-title" style={{ marginBottom: 12 }}>Materials Overrides</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
        Override material products and coats project-wide, or per finish group. Empty = use the tier's authored default.
      </div>
      <SubTable title="Paint Materials"  roles={PAINT_ROLES} rows={paintRows} overrides={overrides} dispatch={dispatch} project={project} />
      <SubTable title="Stain Materials"  roles={STAIN_ROLES} rows={stainRows} overrides={overrides} dispatch={dispatch} project={project} />
    </div>
  );
}

const thStyle = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };
const cellStyle = { padding: '4px 6px', textAlign: 'center' };
const revertLink = { cursor: 'pointer', textDecoration: 'underline' };
```

⚠ **`useAppState` import:** Check `ProjectSetup.jsx` (the next file) for how state/dispatch are passed in — if it's via props rather than a custom hook, accept `{state, dispatch}` as props (already what this skeleton does) and remove the unused `useAppState` import. If the codebase uses a context hook, swap to that. **Do not invent a hook that doesn't exist.**

- [ ] **Step 2: Wire panel into `ProjectSetup.jsx`** — read the file first; mount the panel as a new section/subview matching the file's existing pattern. If `ProjectSetup` is a single-page form, add the panel at the bottom. If it has tabs, add a new "Materials" tab.

Concrete wire (assuming a single-page form):

```jsx
// Add to imports at top of ProjectSetup.jsx:
import MaterialsOverridesPanel from './MaterialsOverridesPanel.jsx';

// Add to the rendered JSX, near the bottom of the form (before the closing tag):
<MaterialsOverridesPanel state={state} dispatch={dispatch} />
```

(If `ProjectSetup` accesses state via context, pass the context's `state`/`dispatch` accordingly.)

- [ ] **Step 3: Build check**

Run: `cd tools/paintscope && npx vite build`
Expected: `✓ built`, no errors.

- [ ] **Step 4: Full suite (no regressions from new UI module)**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — 657 (unchanged; no new tests for the UI itself, gated by live-verify in Task 6).

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/setup/MaterialsOverridesPanel.jsx tools/paintscope/src/components/setup/ProjectSetup.jsx
git commit -m "feat(materials): project Materials Overrides panel UI + setup wiring

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Substrate panel resolved-trio chip strip

**Files:**
- Modify: `tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx` (add a small chip strip at the end of the Coating Phases section)

**Interfaces:**
- Consumes: `resolveSystem` (Task 1); `state.project.material_overrides`; the substrate's `finish_group`.
- Produces: a small read-only display showing the resolved per-role system label per substrate, with a link to the Materials Overrides panel.

No unit test (cosmetic; live-verify in Task 6).

- [ ] **Step 1: Add the chip strip** — open `components/room-editor/SubstrateDetailPanel.jsx`. The Coating Phases section closes after the per-phase coat dropdowns (around line 330, right before its closing `</div>`). Add the chip strip just before that closing div.

Add to imports at the top of the file:

```jsx
import { resolveSystem } from '../../engine/material-overrides.js';
import { MATERIAL_SYSTEMS } from '../../data/scenario-rate-data.js';
```

Inside the Coating Phases section (after the existing dropdowns, before its closing `</div>`), add (the JSX assumes `project` is already in scope — it's passed as a prop on the component signature at line 20):

```jsx
{(config.stain_on || config.sealer_on || config.clear_on) && (() => {
  const overrides = project?.material_overrides;
  const fg = config.finish_group || null;
  const nameById = Object.fromEntries(MATERIAL_SYSTEMS.map(s => [s.id, s.name || s.id]));
  const roleLabels = [
    config.stain_on  ? { role: 'stain',  scenarioPick: null } : null,
    config.sealer_on ? { role: 'sealer', scenarioPick: null } : null,
    config.clear_on  ? { role: 'clear',  scenarioPick: null } : null,
  ].filter(Boolean);
  const chips = roleLabels.map(({ role }) => {
    const resolved = resolveSystem(role, fg, overrides, null);  // null scenarioPick: chip strip only shows OVERRIDES, not file defaults
    const label = resolved ? (nameById[resolved] || resolved) : '— tier default —';
    const sourceTag = overrides?.byFinishGroup?.[fg]?.[`${role}_system`] ? ` (override · group ${fg})`
      : overrides?.byRole?.[`${role}_system`] ? ' (project override)'
      : '';
    return `${role.charAt(0).toUpperCase() + role.slice(1)} · ${label}${sourceTag}`;
  });
  return (
    <div style={{ marginTop: 10, padding: '6px 10px', fontSize: 10, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: 3 }}>
      Resolved materials: {chips.join('   ·   ')}
      <span style={{ marginLeft: 10, fontStyle: 'italic' }}>change in Materials Overrides panel</span>
    </div>
  );
})()}
```

(Paint substrates can get an analogous strip showing Primer / Finish — defer adding it to keep the scope tight; can be added in a follow-up if Eric wants paint-side parity here.)

- [ ] **Step 2: Build check**

Run: `cd tools/paintscope && npx vite build`
Expected: `✓ built`, no errors.

- [ ] **Step 3: Full suite**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — 657 (unchanged).

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx
git commit -m "feat(materials): resolved-trio chip strip on substrate panel (stain)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Live-verify + parity gate

**Files:** none (verification only).

- [ ] **Step 1: File-scope parity check**

Run: `git diff --name-only feature/qt-builder-stain..HEAD`
Expected: only files listed in the File Map above (engine/material-overrides.js, engine/material-estimates.js, engine/scenario-estimate.js, state/initial-state.js, state/migrations.js, components/setup/*, components/room-editor/SubstrateDetailPanel.jsx) + their `__tests__/*`. Any other path is a regression — investigate before continuing.

- [ ] **Step 2: Full suite green**

Run: `cd tools/paintscope && npx vitest run`
Expected: PASS — 657 tests; 0 failures.

- [ ] **Step 3: Build clean**

Run: `cd tools/paintscope && npx vite build`
Expected: `✓ built`, no errors.

- [ ] **Step 4: Hours parity (the strict gate — the spec promises hours are byte-identical)**

Pick a saved project state JSON (export from the app, e.g. a McLeod project, or reuse a Phase-1 capture). On the BASE branch (P3's parent, `feature/qt-builder-stain`):

```bash
git stash
git checkout feature/qt-builder-stain
cd tools/paintscope && npx vite-node scripts/parity-estimate.mjs -- /path/to/state.json /tmp/parity-before.json
```

On the P3 tip:

```bash
git checkout feature/p3-material-overrides
git stash pop  # if you stashed
cd tools/paintscope && npx vite-node scripts/parity-estimate.mjs -- /path/to/state.json /tmp/parity-after.json
diff /tmp/parity-before.json /tmp/parity-after.json
```

Expected: **empty diff.** The parity script captures `grandTotalHours` + perSpec hours; both must be identical. P3 changed only materials code, but the rekey could theoretically perturb the hours path if any wiring was missed — this is the gate.

- [ ] **Step 5: Materials byte-identical with no overrides set**

In the running app on the P3 tip, load a real test project (no overrides set), view the Materials estimate, and compare to the same view on the base branch (use a screenshot or export). Material lines may split by finish_group (one entry per group instead of one combined), but **total gallons per role per spec must match**. If totals don't match, the partitioning or first-fired-per-pair logic has a bug.

- [ ] **Step 6: Live-verify the new feature** — `cd tools/paintscope && npm run dev -- --port 5183 --strictPort`. In the app:
  - Open project setup → confirm the new **Materials Overrides** panel renders, with Project default row only initially (no in-use finish_groups beyond defaults).
  - In a stained-trim project (e.g. one with int_door_casing on bare wood + clear_on), confirm the Stain sub-table appears.
  - Set the **Project default** Clear System to a different system (e.g. Lacquer). Confirm:
    - The chip strip on the substrate panel updates to show the new product with "(project override)" tag.
    - The Materials estimate output reflects the new product across all stained substrates.
  - Assign a substrate to a different finish_group (e.g. E) in the substrate panel. Confirm:
    - A new Group E row appears in the Stain sub-table.
    - Set a different Clear System for Group E. Confirm only that substrate's chip strip updates with "(override · group E)" tag.
    - Materials estimate shows two clear lines (one per group) with different products.
  - Confirm **0 console errors** throughout.

- [ ] **Step 7: Commit verification notes if needed** (no code change expected here)

---

## Self-review notes (for the executor)

- **Hours path is the strict gate.** Step 4 of Task 6 is the canary. If hours parity fails, the rekey or partitioning leaked into a hours code path — bisect by reverting the engine changes from Task 3 incrementally.
- **Materials line-item structure CHANGES** when substrates span multiple finish_groups (one line per group instead of one combined). Total gallons are preserved. Communicate this to Eric during live-verify if a downstream consumer (summary view, work order export) shows duplicate-looking lines.
- **Risk #1 (paint coats)** is verified by Step 7 of Task 3. If the assertion fails, paint's `resolveCoats(prod)` baseline path runs but the override doesn't layer on top — confirm the variable name in the matchedSystems loop after the override block is `coats` (post-override), not `baseCoats`, where the gallon math reads it.
- **`useAppState` import in Task 4 Step 1** is a placeholder; verify the codebase's actual state-access pattern before committing the panel skeleton. ProjectSetup.jsx is the reference for how state flows into setup-tree components.
- **Auto-discovery in `MaterialsOverridesPanel`** distinguishes paint vs stain rows by `(stain_on || sealer_on || clear_on)`. Substrates that are "paint" (none of those flags) go in the Paint table only. Substrates with both flags (rare but legal) get rows in both.

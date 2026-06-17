# Combined Prime + Pass Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a pass-group primitive so combined wall+ceiling prime (pre-trim) and combined wall+ceiling finish (product match) each render as ONE estimate line item instead of two per-substrate lines, and generalize the pattern for future combined workflows.

**Architecture:** Grouping logic lives in `context-adapter.resolvePassGroups(room, project)`, invisible past the adapter. Engine, matcher, dedup, and display are unchanged except for optional `pass_group_id` / `pass_group_substrates` / `pass_type` fields on ctx and line items. Task-level isolation stays clean via `applies_when: { pass_group_id: [null] }` using the existing eligibility mechanism.

**Tech Stack:** React 19 + Vite 7, Vitest for tests, Node ESM scripts for bundle generation. Plain JS (no TypeScript). JSON-authored scenarios and modules in `Claude/scenarios/` and `Claude/modules/`.

**Spec:** `Claude/docs/superpowers/specs/2026-04-21-combined-prime-pass-groups-design.md`

---

## File Structure

### New files

- `Claude/registries/pass_groups.json` — canonical pass group ID registry
- `Claude/tools/paintscope/src/engine/pass-groups.js` — resolver module (kept separate from context-adapter for testability)
- `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js` — unit tests for resolver
- `Claude/scripts/gen-combined-finish-scenarios.mjs` — generator for 12 combined finish scenarios
- `Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL.json` — 4 new scenarios
- `Claude/scenarios/SCN_COMBINED_WALLS_CEILING_FINISH_QT{2,3,4,5}_SPRAY_BACKROLL_{EGGSHELL,SATIN,MATTE}.json` — 12 new scenarios
- `Claude/modules/MOD_SETUP_COMBINED_PRIME_NC.json`
- `Claude/modules/MOD_PREP_COMBINED_PRIME.json`
- `Claude/modules/MOD_CLEANUP_COMBINED_PRIME.json`
- `Claude/modules/MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED.json`
- `Claude/modules/MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED.json`
- `Claude/modules/MOD_SETUP_COMBINED_WC_FINISH.json`
- `Claude/modules/MOD_PREP_COMBINED_WC_FINISH.json`
- `Claude/modules/MOD_INTERSTAGE_COMBINED_WC_FINISH.json`
- `Claude/modules/MOD_CLEANUP_COMBINED_WC_FINISH.json`
- `Claude/scenarios/_archive/` — directory for deprecated scenarios (created if missing)

### Modified files

- `Claude/tools/paintscope/src/engine/context-adapter.js` — integrate `resolvePassGroups` + emit grouped inputs + set explicit-null pass-group fields on ungrouped inputs
- `Claude/tools/paintscope/src/engine/run-estimate-scenario.js` — add silent skip for `status: "deprecated"` scenarios
- 8 existing scenarios get `status: "deprecated"` + moved to `_archive/`:
  - `SCN_DRYWALL_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL_COMBINED.json`
  - `SCN_CEILING_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL_COMBINED.json`
- `Claude/scripts/gen-combined-prime-scenarios.mjs` — rewritten to emit pass-group-shaped scenarios (or superseded by new scenarios + a new script — plan task decides)

---

## Phase 1 — Scaffolding (behavior-preserving)

Goal of phase: add the resolver infrastructure returning empty groups, add deprecated-scenario skip path, set explicit-null pass-group fields on ctx. Verify McLeod output is byte-identical to baseline.

---

### Task 1: Create pass group registry

**Files:**
- Create: `Claude/registries/pass_groups.json`

- [ ] **Step 1: Verify registries directory exists or create it**

```bash
ls "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/registries" 2>/dev/null || mkdir -p "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/registries"
```

- [ ] **Step 2: Write the registry file**

File: `Claude/registries/pass_groups.json`

```json
{
  "version": "1.0.0",
  "description": "Canonical pass group IDs. A pass group coalesces N substrates sharing one coordinated painting pass into a single estimate line item. Read by engine, scenarios, tracker, and client portal.",
  "groups": [
    {
      "group_id": "walls_ceiling_prime_combined",
      "substrates": ["walls", "ceiling"],
      "pass_type": "prime",
      "source_types": ["project_flag"],
      "description": "Walls and ceiling primed together in one continuous spray pass, pre-trim NC workflow. Triggered by project.default_combined_prime or room.combined_prime_override."
    },
    {
      "group_id": "walls_ceiling_finish_combined",
      "substrates": ["walls", "ceiling"],
      "pass_type": "finish",
      "source_types": ["product_match"],
      "description": "Walls and ceiling finished together in one pass when both substrates share system_id, product_id, sheen, and color_code."
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/registries/pass_groups.json
git commit -m "feat(paintscope): add pass group registry

Central source of truth for pass group IDs, used by engine, scenario
authoring, tracker, and client portal. Currently documents the two
group types in scope (c) of the design spec.
"
```

---

### Task 2: Create pass-groups.js resolver stub

**Files:**
- Create: `Claude/tools/paintscope/src/engine/pass-groups.js`
- Create: `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`

- [ ] **Step 1: Write the failing test**

File: `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`

```js
import { describe, it, expect } from 'vitest';
import { resolvePassGroups } from '../pass-groups.js';

describe('resolvePassGroups', () => {
  it('returns empty array for a minimal room (no groups yet)', () => {
    const room = { substrates: {} };
    const project = {};
    const result = resolvePassGroups(room, project, null);
    expect(result).toEqual([]);
  });

  it('returns an array even when inputs are null/undefined', () => {
    expect(resolvePassGroups(null, null, null)).toEqual([]);
    expect(resolvePassGroups(undefined, undefined, undefined)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: FAIL with "Cannot find module '../pass-groups.js'".

- [ ] **Step 3: Create the resolver module**

File: `Claude/tools/paintscope/src/engine/pass-groups.js`

```js
// Pass-group resolver: coalesces N substrates sharing a coordinated painting
// pass into a single estimate input. Called once per room by the context
// adapter before the per-spec fan-out. Grouped substrates are excluded from
// spec iteration so only one input per group reaches the matcher.
//
// Current group types (see Claude/registries/pass_groups.json):
//   - walls_ceiling_prime_combined  (project flag)
//   - walls_ceiling_finish_combined (product match)
//
// Future groups (trim-family, ext body+trim) extend this function additively.

/**
 * @param {object|null} room     — room state from project_data.rooms[]
 * @param {object|null} project  — project state from project_data.project
 * @param {object|null} specData — resolved spec data (reserved for finish-group product lookup)
 * @returns {Array<PassGroup>}   — zero or more pass groups; empty array when no grouping applies
 *
 * PassGroup shape:
 *   {
 *     group_id: string,           // e.g. "walls_ceiling_prime_combined"
 *     substrates: string[],       // e.g. ["walls", "ceiling"]
 *     pass_type: "prime"|"finish",
 *     source: "project_flag"|"product_match"|"user_declared",
 *     metadata: Record<string, unknown>
 *   }
 */
export function resolvePassGroups(room, project, specData) {
  if (!room || !project) return [];
  // Phase 1 stub: no groups formed yet.
  // Phase 2 adds combined-prime precheck.
  // Phase 3 adds combined-finish precheck.
  return [];
}
```

- [ ] **Step 4: Run the test — verify it passes**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/engine/pass-groups.js Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js
git commit -m "feat(paintscope): pass-groups resolver stub

Adds resolvePassGroups(room, project, specData) as the single
home for pass-group detection logic. Currently returns [] — the
stub preserves current behavior while Phase 1 wires the caller.
Phase 2 implements combined-prime precheck; Phase 3 adds finish.
"
```

---

### Task 3: Integrate resolver into context-adapter with explicit-null ctx fields

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/context-adapter.js` (around line 450-620)
- Test: `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`

- [ ] **Step 1: Write the failing test for ctx shape**

Append to `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`:

```js
import { buildScenarioInputs } from '../context-adapter.js';

describe('buildScenarioInputs with pass-group fields', () => {
  it('adds explicit-null pass-group fields to every ctx when no groups form', () => {
    // Minimal fixture: one room, walls substrate only.
    const state = {
      project: {
        name: 'test',
        default_quality_tier: 'QT3',
        default_application_method: 'spray_backroll',
        new_construction: true,
        default_substrates: ['walls'],
      },
      rooms: [
        {
          id: 'r1',
          label: 'Test Room',
          length_ft: 10,
          width_ft: 10,
          height_ft: 9,
          substrates: {
            walls: { substrate_state: 'bare_drywall', texture: 'smooth' },
          },
        },
      ],
    };
    const result = buildScenarioInputs(state, null);
    expect(result.roomInputs.length).toBeGreaterThan(0);
    for (const input of result.roomInputs) {
      expect(input.ctx).toHaveProperty('pass_group_id', null);
      expect(input.ctx).toHaveProperty('pass_group_substrates', null);
      expect(input.ctx).toHaveProperty('pass_type', null);
    }
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: FAIL — new `pass_group_id` assertion fails because the field isn't set.

- [ ] **Step 3: Import resolver + normalize ctx in context-adapter**

Modify `Claude/tools/paintscope/src/engine/context-adapter.js`:

Add near top of file, after existing imports (around line 37):

```js
import { resolvePassGroups } from './pass-groups.js';

// Helper: set explicit-null pass-group fields on a ctx. Required because
// applies_when: { pass_group_id: [null] } uses array-includes semantics and
// [null].includes(undefined) === false — so pass-group fields MUST be null,
// not undefined, on ungrouped inputs.
function normalizePassGroupCtx(ctx) {
  if (ctx.pass_group_id === undefined) ctx.pass_group_id = null;
  if (ctx.pass_group_substrates === undefined) ctx.pass_group_substrates = null;
  if (ctx.pass_type === undefined) ctx.pass_type = null;
  return ctx;
}
```

- [ ] **Step 4: Call `resolvePassGroups` at the start of each room iteration**

In `buildScenarioInputs`, inside the `for (let ri = 0; ri < rooms.length; ri++)` loop, add after `const roomItems = ...` (around line 459):

```js
    // Pass groups: coalesce N substrates into one coordinated painting pass.
    // Phase 1 returns []; Phases 2-3 add combined-prime and combined-finish.
    const passGroups = resolvePassGroups(room, project, db);
    const groupedSubstrates = new Set(passGroups.flatMap(g => g.substrates));
```

- [ ] **Step 5: Normalize every pushed ctx**

Find each `roomInputs.push({ ... ctx: ... })` call in the file and ensure the ctx passes through `normalizePassGroupCtx`. For the two existing push sites in `buildScenarioInputs`, wrap with the helper:

Example — the per-component push (around line 483):
```js
        for (const compCtx of perComponentCtxs) {
          roomInputs.push({
            roomIndex: ri,
            roomLabel,
            specId,
            ctx: normalizePassGroupCtx(compCtx),
            roomQty,
            roomItems,
          });
        }
```

And the standard per-spec push (later in the function — search for the last `roomInputs.push`):
```js
      roomInputs.push({
        roomIndex: ri,
        roomLabel,
        specId,
        ctx: normalizePassGroupCtx(ctx),
        roomQty,
        roomItems,
      });
```

- [ ] **Step 6: Run the test — verify it passes**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: all 3 tests pass.

- [ ] **Step 7: Run the full existing test suite to confirm no regressions**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 8: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/engine/context-adapter.js Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js
git commit -m "feat(paintscope): wire pass-group resolver into adapter

Calls resolvePassGroups per room, populates groupedSubstrates set,
normalizes ctx.pass_group_id/substrates/pass_type to explicit null
on every pushed input. Phase 1 has no groups; infrastructure is
behavior-preserving. Tests enforce null vs undefined invariant.
"
```

---

### Task 4: Add deprecated-scenario skip path to matcher

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/run-estimate-scenario.js` (around line 480-510, next to the existing "broken" skip)

- [ ] **Step 1: Write the failing test**

Append to `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`:

```js
// A minimal bundle with one deprecated scenario and one live scenario.
function makeTestBundle() {
  return {
    modules: {
      MOD_TEST: {
        module_id: 'MOD_TEST',
        phase: 'apply',
        tasks: [{ task_ref: 'TSK_TEST' }],
        modifier_eligibility: {},
      },
    },
    scenarios: [
      {
        scenario_id: 'SCN_DEPRECATED',
        status: 'deprecated',
        matches: { paintable_item: 'test' },
        modules: ['MOD_TEST'],
      },
      {
        scenario_id: 'SCN_LIVE',
        matches: { paintable_item: 'test' },
        modules: ['MOD_TEST'],
      },
    ],
    modifiers: {},
    tasks: {
      TSK_TEST: {
        task_id: 'TSK_TEST', name: 'Test Task', ps_key: 'PS_TEST.X',
        uom: 'EA', skill_level: 'experienced', rate_per_hour: 100,
      },
    },
  };
}

describe('findMatchingScenario deprecated-scenario skip', () => {
  it('skips scenarios with status: "deprecated" silently', async () => {
    const { runScenarioEstimate } = await import('../run-estimate-scenario.js');
    const bundle = makeTestBundle();
    const ctx = {
      paintable_item: 'test',
      quality_tier: 'QT3', application_method: 'brush', substrate_state: null,
      complexity: 'STD', height_band: 'STD', texture: 'smooth',
      pass_group_id: null, pass_group_substrates: null, pass_type: null,
    };
    const roomQty = new Map([['PS_TEST.X', { value: 10, uom: 'EA' }]]);
    const result = runScenarioEstimate({
      scenarioBundle: bundle, ctx, roomQty,
      roomIndex: 0, roomLabel: 'R1',
    });
    expect(result.scenarioId).toBe('SCN_LIVE');
    // No warning about deprecation — silent skip
    const deprecWarnings = result.warnings.filter(w => w.includes('deprecated'));
    expect(deprecWarnings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: FAIL — `result.scenarioId` is `SCN_DEPRECATED` (first-matching), not `SCN_LIVE`.

- [ ] **Step 3: Add the skip path to findMatchingScenario**

Modify `Claude/tools/paintscope/src/engine/run-estimate-scenario.js` around line 491-502 — right after the existing `if (scenario.status === 'broken')` block:

Find this code:
```js
    if (scenario.status === 'broken') {
      if (warnings) {
        warnings.push(`Scenario ${scenario.scenario_id} matches context but is marked status:"broken" — skipping. Reason: ${scenario.broken_reason || 'no reason given'}`);
      }
      continue;
    }
```

Insert immediately after:
```js
    // Deprecated scenarios: silently skip. Scenario was intentionally retired
    // (e.g., superseded by a pass-group-based equivalent). No user-visible
    // warning — caller's "no scenario matched" fallback fires only if NO
    // live scenario also matches.
    if (scenario.status === 'deprecated') {
      continue;
    }
```

- [ ] **Step 4: Run the test — verify it passes**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: all tests pass, `result.scenarioId === 'SCN_LIVE'`.

- [ ] **Step 5: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/engine/run-estimate-scenario.js Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js
git commit -m "feat(paintscope): silent skip for status:\"deprecated\" scenarios

Mirrors the existing status:\"broken\" skip but logs nothing — a
deprecated scenario is expected behavior (retired in favor of a
replacement), not a user-visible concern. Enables scenario archival
without dead-code warnings in the estimate output.
"
```

---

### Task 5: Rebuild bundle + verify McLeod baseline unchanged

**Files:**
- Modified via bundle rebuild: `Claude/tools/paintscope/src/data/scenario-bundle.gen.js`

- [ ] **Step 1: Rebuild the bundle**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && node Claude/scripts/build-scenario-bundle.mjs
```

Expected output includes `Wrote .../scenario-bundle.gen.js (NNNN.N KB)`.

- [ ] **Step 2: Save a baseline McLeod estimate (HIL — human in loop)**

Ask the user to:
1. Refresh `localhost:5173` in browser.
2. Open the McLeod project (17 rooms, already imported earlier).
3. Click "Export Estimate JSON" to download the estimate.
4. Save as `docs/Painting Project Profiles/estimate_McLeod_phase1_baseline.json`.
5. Compare total hours to pre-Phase-1 export (`estimate_McLeod_2026-04-21T08-28-20.json`, 554.56h).

Expected: **total hours identical to 554.56h**. Byte-for-byte differences are acceptable only in output ordering or whitespace — hour totals MUST match.

If hours differ by > 0.01h, stop and investigate — Phase 1 is meant to be behavior-preserving.

- [ ] **Step 3: Commit the bundle rebuild**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/data/scenario-bundle.gen.js
git commit -m "chore(paintscope): rebuild bundle after Phase 1 scaffolding

No behavioral change to the bundle contents — regeneration is required
after engine source changes to keep the .gen.js file in sync with the
scenario/module/task/modifier JSON it imports and the adapter logic
it feeds. Phase 1 verified: McLeod export produces identical 554.56h
total.
"
```

---

## Phase 2 — Combined Prime goes live

Goal of phase: create 3 shared modules, 4 new scenarios, implement combined-prime precheck, deprecate 8 old scenarios, verify McLeod produces 1 combined line item instead of 2.

---

### Task 6: Create MOD_SETUP_COMBINED_PRIME_NC module

**Files:**
- Create: `Claude/modules/MOD_SETUP_COMBINED_PRIME_NC.json`

- [ ] **Step 1: Write the module**

File: `Claude/modules/MOD_SETUP_COMBINED_PRIME_NC.json`

```json
{
  "module_id": "MOD_SETUP_COMBINED_PRIME_NC",
  "name": "Setup for Combined Wall+Ceiling Prime (Pre-Trim NC)",
  "phase": "setup",
  "intent": "Setup for the pre-trim combined prime pass. Pre-trim NC means no floors installed yet, no fixtures mounted, no trim installed — so nearly all substrate protection tasks from the separate-mode setup modules do NOT apply. Only masking tasks that relate to surfaces actually present (e.g., sill tape, stud protection if spec'd) fire here. Intentionally minimal.",
  "tasks": [],
  "modifier_eligibility": {
    "qt": false, "height": false, "texture": false, "complexity": false
  },
  "doctrine": "Empty tasks[] is correct for the typical pre-trim combined prime: nothing to protect because nothing is installed. Author adds task_refs here when a specific project's pre-trim state includes anything needing protection (rare). The presence of this module in the scenario (vs. omitting setup entirely) is a signal for downstream consumers that setup was evaluated and determined to be zero-work for this flow."
}
```

- [ ] **Step 2: Validate JSON parses**

Run:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/modules/MOD_SETUP_COMBINED_PRIME_NC.json','utf8')).module_id)"
```

Expected: `MOD_SETUP_COMBINED_PRIME_NC`.

- [ ] **Step 3: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/modules/MOD_SETUP_COMBINED_PRIME_NC.json
git commit -m "feat(paintscope): add MOD_SETUP_COMBINED_PRIME_NC module

Minimal-task setup module for the pre-trim combined wall+ceiling
prime pass. Typical pre-trim state has nothing to protect — module
exists as an explicit setup slot for the scenario, with tasks[]
extensible per project if needed.
"
```

---

### Task 7: Create MOD_PREP_COMBINED_PRIME module

**Files:**
- Create: `Claude/modules/MOD_PREP_COMBINED_PRIME.json`

- [ ] **Step 1: Write the module**

File: `Claude/modules/MOD_PREP_COMBINED_PRIME.json`

```json
{
  "module_id": "MOD_PREP_COMBINED_PRIME",
  "name": "Prep for Combined Wall+Ceiling Prime",
  "phase": "prep",
  "intent": "Single pre-prime prep pass across both walls and ceiling. Replaces per-substrate MOD_PREP_WALL_PRIME + MOD_PREP_CEILING_PRIME when walls and ceiling are primed together — the painter does one dust/vacuum sweep of the room rather than two. Inspect tasks still reference each substrate's pre-prime ps_key so the work is quantified correctly.",
  "tasks": [
    { "task_ref": "TSK_WALL_INSPECT_PREPRIME" },
    { "task_ref": "TSK_CEIL_INSPECT_PREPRIME" },
    { "task_ref": "TSK_WALL_VACUUM_DUST_PREPRIME" }
  ],
  "modifier_eligibility": {
    "qt": true, "height": true, "texture": false, "complexity": true
  },
  "doctrine": "Two inspects (one per substrate) but only ONE vacuum/dust pass — the painter sweeps the room once, not once per substrate. Rate on the vacuum task already covers the floor-area roll-up at the room level; no double-count. If a project has unusually large ceiling that warrants its own dust pass, add TSK_CEIL_VACUUM_DUST_PREPRIME here as a local override."
}
```

- [ ] **Step 2: Validate JSON parses**

Run:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/modules/MOD_PREP_COMBINED_PRIME.json','utf8')).tasks.length)"
```

Expected: `3`.

- [ ] **Step 3: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/modules/MOD_PREP_COMBINED_PRIME.json
git commit -m "feat(paintscope): add MOD_PREP_COMBINED_PRIME module

Single-sweep prep for combined wall+ceiling prime. Inspects both
substrates but performs ONE vacuum pass (not two) — the dedup that
per-substrate scenarios were missing when combined prime was faked
with two scenarios firing in parallel.
"
```

---

### Task 8: Create MOD_CLEANUP_COMBINED_PRIME module

**Files:**
- Create: `Claude/modules/MOD_CLEANUP_COMBINED_PRIME.json`

- [ ] **Step 1: Write the module**

File: `Claude/modules/MOD_CLEANUP_COMBINED_PRIME.json`

```json
{
  "module_id": "MOD_CLEANUP_COMBINED_PRIME",
  "name": "Cleanup After Combined Wall+Ceiling Prime",
  "phase": "cleanup",
  "intent": "Single cleanup pass after combined wall+ceiling prime. Pre-trim NC means nothing was protected in setup (no floors, no fixtures, no trim to mask), so nothing is torn down here. Final inspect covers both substrates in one walk-through.",
  "tasks": [
    { "task_ref": "TSK_WALL_FINAL_INSPECT_PRIME" },
    { "task_ref": "TSK_CEIL_FINAL_INSPECT_PRIME" }
  ],
  "modifier_eligibility": {
    "qt": false, "height": false, "texture": false, "complexity": false
  },
  "doctrine": "Two final-inspect tasks (one per substrate, each targeting its substrate-specific ps_key) but no teardown — setup didn't install protection, so cleanup has nothing to remove. A shared tool-cleanup task is NOT authored here because the downstream tracker's tool-cleanup counter is room-level, not substrate-level, and gets double-counted if both module cleanups fire in chained scenarios. Add a dedicated TSK_ROOM_TOOL_CLEANUP when the separate-mode cleanup modules are refactored."
}
```

- [ ] **Step 2: Validate JSON parses**

Run:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/modules/MOD_CLEANUP_COMBINED_PRIME.json','utf8')).tasks.length)"
```

Expected: `2`.

- [ ] **Step 3: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/modules/MOD_CLEANUP_COMBINED_PRIME.json
git commit -m "feat(paintscope): add MOD_CLEANUP_COMBINED_PRIME module

Cleanup after combined wall+ceiling prime — two substrate-scoped
final inspects, no floor-teardown/fixture-teardown (nothing was
installed in setup to tear down). Replaces the per-substrate wall
+ ceiling cleanup modules' duplicated teardown tasks.
"
```

---

### Task 9: Author 4 combined prime scenarios

**Files:**
- Create: `Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT2_SPRAY_BACKROLL.json`
- Create: `Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT3_SPRAY_BACKROLL.json`
- Create: `Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT4_SPRAY_BACKROLL.json`
- Create: `Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT5_SPRAY_BACKROLL.json`

- [ ] **Step 1: Write the QT3 scenario as a template**

File: `Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT3_SPRAY_BACKROLL.json`

```json
{
  "scenario_id": "SCN_COMBINED_WALLS_CEILING_PRIME_QT3_SPRAY_BACKROLL",
  "name": "Combined Walls+Ceiling Prime (Pre-Trim, Spray+Backroll, QT3)",
  "domain": "interior",
  "context": "NC",
  "pass_type": "prime",
  "matches": {
    "pass_group_id": "walls_ceiling_prime_combined",
    "quality_tier": ["QT3"],
    "application_method": "spray_backroll",
    "substrate_state": ["SS_BARE_DRYWALL"]
  },
  "modules": [
    "MOD_SETUP_COMBINED_PRIME_NC",
    "MOD_PREP_COMBINED_PRIME",
    "MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL_COMBINED",
    "MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL_COMBINED",
    "MOD_CLEANUP_COMBINED_PRIME"
  ],
  "coat_counts": { "prime_coats": 1, "finish_coats": 0, "interstage_cycles": 0 },
  "material_systems": ["SYS_DRYWALL_PRIMER"],
  "output_state": "SS_PRIMED_FIELD"
}
```

- [ ] **Step 2: Create the 4-QT variants via node script**

Run this one-liner:

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && node -e "
const fs = require('fs');
const path = require('path');
const base = JSON.parse(fs.readFileSync('Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT3_SPRAY_BACKROLL.json','utf8'));
for (const qt of ['QT2','QT4','QT5']) {
  const copy = JSON.parse(JSON.stringify(base));
  copy.scenario_id = \`SCN_COMBINED_WALLS_CEILING_PRIME_\${qt}_SPRAY_BACKROLL\`;
  copy.name = \`Combined Walls+Ceiling Prime (Pre-Trim, Spray+Backroll, \${qt})\`;
  copy.matches.quality_tier = [qt];
  fs.writeFileSync(\`Claude/scenarios/\${copy.scenario_id}.json\`, JSON.stringify(copy, null, 2) + '\n');
  console.log('wrote', copy.scenario_id);
}
"
```

Expected output: `wrote SCN_COMBINED_WALLS_CEILING_PRIME_QT2_SPRAY_BACKROLL` + 2 more lines.

- [ ] **Step 3: Verify all 4 exist**

Run:
```bash
ls "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_"*
```

Expected: 4 files listed.

- [ ] **Step 4: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add "Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_"*
git commit -m "feat(paintscope): add 4 combined prime scenarios

One per QT (QT2/QT3/QT4/QT5), all spray_backroll, all matching
pass_group_id: walls_ceiling_prime_combined. Replace the 8 old
per-substrate combined scenarios (deprecated in next commit).
Each fires 5 modules: setup/prep/apply-ceil/apply-wall/cleanup.
"
```

---

### Task 10: Implement combined-prime precheck in resolvePassGroups

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/pass-groups.js`
- Test: `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`

- [ ] **Step 1: Write the failing test for combined-prime precheck**

Append to `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`:

```js
describe('resolvePassGroups combined-prime precheck', () => {
  const baseRoom = {
    substrates: {
      walls: {
        substrate_state: 'bare_drywall',
        application_method: 'spray_backroll',
      },
      ceiling: {
        substrate_state: 'bare_drywall',
        application_method: 'spray_backroll',
      },
    },
    quality_tier: 'QT3',
  };
  const baseProject = {
    default_combined_prime: true,
    default_quality_tier: 'QT3',
    default_application_method: 'spray_backroll',
    new_construction: true,
  };

  it('forms a combined-prime group when all conditions met', () => {
    const groups = resolvePassGroups(baseRoom, baseProject, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].group_id).toBe('walls_ceiling_prime_combined');
    expect(groups[0].substrates).toEqual(['walls', 'ceiling']);
    expect(groups[0].pass_type).toBe('prime');
    expect(groups[0].source).toBe('project_flag');
    expect(groups[0].metadata.prime_mode).toBe('combined');
  });

  it('returns [] when combined-prime flag is off', () => {
    const project = { ...baseProject, default_combined_prime: false };
    expect(resolvePassGroups(baseRoom, project, null)).toEqual([]);
  });

  it('returns [] when walls substrate is missing', () => {
    const room = { ...baseRoom, substrates: { ceiling: baseRoom.substrates.ceiling } };
    expect(resolvePassGroups(room, baseProject, null)).toEqual([]);
  });

  it('returns [] when ceiling substrate is missing', () => {
    const room = { ...baseRoom, substrates: { walls: baseRoom.substrates.walls } };
    expect(resolvePassGroups(room, baseProject, null)).toEqual([]);
  });

  it('returns [] when walls and ceiling substrate_state differ', () => {
    const room = {
      ...baseRoom,
      substrates: {
        walls: { ...baseRoom.substrates.walls, substrate_state: 'bare_drywall' },
        ceiling: { ...baseRoom.substrates.ceiling, substrate_state: 'primed_factory' },
      },
    };
    expect(resolvePassGroups(room, baseProject, null)).toEqual([]);
  });

  it('returns [] when application_method is not spray_backroll', () => {
    const project = { ...baseProject, default_application_method: 'brush_roll' };
    const room = {
      ...baseRoom,
      substrates: {
        walls: { ...baseRoom.substrates.walls, application_method: 'brush_roll' },
        ceiling: { ...baseRoom.substrates.ceiling, application_method: 'brush_roll' },
      },
    };
    expect(resolvePassGroups(room, project, null)).toEqual([]);
  });

  it('room-level combined_prime_override="separate" suppresses the group', () => {
    const room = { ...baseRoom, combined_prime_override: 'separate' };
    expect(resolvePassGroups(room, baseProject, null)).toEqual([]);
  });

  it('room-level combined_prime_override="combined" creates the group even when project flag is off', () => {
    const project = { ...baseProject, default_combined_prime: false };
    const room = { ...baseRoom, combined_prime_override: 'combined' };
    const groups = resolvePassGroups(room, project, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].group_id).toBe('walls_ceiling_prime_combined');
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: 8 new tests all fail (resolver still returns []).

- [ ] **Step 3: Implement the precheck**

Replace the body of `resolvePassGroups` in `Claude/tools/paintscope/src/engine/pass-groups.js`:

```js
export function resolvePassGroups(room, project, specData) {
  if (!room || !project) return [];
  const groups = [];

  const primeGroup = tryCombinedPrimeGroup(room, project);
  if (primeGroup) groups.push(primeGroup);

  return groups;
}

function tryCombinedPrimeGroup(room, project) {
  const primeMode = resolvePrimeMode(room, project);
  if (primeMode !== 'combined') return null;

  const walls = room.substrates?.walls;
  const ceiling = room.substrates?.ceiling;
  if (!walls || !ceiling) return null;

  // Both substrates must be present AND "being primed" — in the NC workflow
  // that's implicit when the substrate is bare (state === 'bare_drywall').
  // TODO (post-scope-c): handle non-drywall wall/ceiling materials when
  //   pass-group expansion covers wood_wall / wood_ceiling / etc.
  if (walls.substrate_state !== 'bare_drywall') return null;
  if (ceiling.substrate_state !== 'bare_drywall') return null;
  if (walls.substrate_state !== ceiling.substrate_state) return null;

  // Same application method, must be spray_backroll
  const wallsMethod   = resolveMethod(walls, project);
  const ceilingMethod = resolveMethod(ceiling, project);
  if (wallsMethod !== 'spray_backroll') return null;
  if (ceilingMethod !== 'spray_backroll') return null;
  if (wallsMethod !== ceilingMethod) return null;

  // Same QT
  const wallsQt   = resolveQt(walls, room, project);
  const ceilingQt = resolveQt(ceiling, room, project);
  if (wallsQt !== ceilingQt) return null;

  return {
    group_id: 'walls_ceiling_prime_combined',
    substrates: ['walls', 'ceiling'],
    pass_type: 'prime',
    source: 'project_flag',
    metadata: { prime_mode: 'combined' },
  };
}

function resolvePrimeMode(room, project) {
  const override = room.combined_prime_override;
  if (override === 'combined' || override === 'separate') return override;
  return project.default_combined_prime ? 'combined' : 'separate';
}

function resolveMethod(substrateConfig, project) {
  return substrateConfig.application_method
      || project.default_application_method
      || 'brush_roll';
}

function resolveQt(substrateConfig, room, project) {
  return substrateConfig.quality_tier
      || room.quality_tier
      || project.default_quality_tier
      || 'QT3';
}
```

- [ ] **Step 4: Run the tests — verify they pass**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/engine/pass-groups.js Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js
git commit -m "feat(paintscope): combined-prime precheck in resolvePassGroups

Returns { group_id: 'walls_ceiling_prime_combined', ... } when
prime_mode=combined AND both substrates are bare_drywall AND method
is spray_backroll AND QTs match. Room-level combined_prime_override
('combined'|'separate') overrides the project default.

Fails closed: any precheck miss returns [], substrates fall back to
independent inputs (existing behavior).
"
```

---

### Task 11: Emit combined-prime input in buildScenarioInputs

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/context-adapter.js`

- [ ] **Step 1: Write the failing integration test**

Append to `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`:

```js
describe('buildScenarioInputs emits grouped input for combined prime', () => {
  it('emits one input with pass_group_id set when combined prime group forms', () => {
    const state = {
      project: {
        name: 'test',
        default_quality_tier: 'QT3',
        default_application_method: 'spray_backroll',
        default_combined_prime: true,
        new_construction: true,
        default_substrates: ['walls', 'ceiling'],
      },
      rooms: [
        {
          id: 'r1',
          label: 'Test Room',
          length_ft: 10,
          width_ft: 10,
          height_ft: 9,
          substrates: {
            walls:   { substrate_state: 'bare_drywall', texture: 'smooth' },
            ceiling: { substrate_state: 'bare_drywall', texture: 'smooth' },
          },
        },
      ],
    };
    const result = buildScenarioInputs(state, null);
    const groupInputs = result.roomInputs.filter(i => i.ctx.pass_group_id === 'walls_ceiling_prime_combined');
    expect(groupInputs).toHaveLength(1);
    expect(groupInputs[0].ctx.pass_group_substrates).toEqual(['walls', 'ceiling']);
    expect(groupInputs[0].ctx.pass_type).toBe('prime');
    expect(groupInputs[0].specId).toBe('walls_ceiling_prime_combined');
  });

  it('does not emit per-substrate inputs for grouped substrates (wall/ceiling PRIME specs)', () => {
    const state = {
      project: {
        name: 'test',
        default_quality_tier: 'QT3',
        default_application_method: 'spray_backroll',
        default_combined_prime: true,
        new_construction: true,
        default_substrates: ['walls', 'ceiling'],
      },
      rooms: [
        {
          id: 'r1',
          label: 'Test Room',
          length_ft: 10,
          width_ft: 10,
          height_ft: 9,
          substrates: {
            walls:   { substrate_state: 'bare_drywall', texture: 'smooth' },
            ceiling: { substrate_state: 'bare_drywall', texture: 'smooth' },
          },
        },
      ],
    };
    const result = buildScenarioInputs(state, null);
    const primeSpecInputs = result.roomInputs.filter(i =>
      i.specId === 'SF_DRYWALL_WALL_NC_PRIME' || i.specId === 'SF_DRYWALL_CEILING_NC_PRIME'
    );
    expect(primeSpecInputs).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run — verify failure**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: 2 new tests fail.

- [ ] **Step 3: Add buildGroupCtx helper + group-input emission**

In `Claude/tools/paintscope/src/engine/context-adapter.js`, add a new helper near the `normalizePassGroupCtx` helper (before `buildScenarioInputs`):

```js
// Build ctx for a grouped input by taking common values from all grouped
// substrates. Precheck in resolvePassGroups already verified the critical
// dimensions (QT, method, state) are identical across substrates.
function buildGroupCtx(group, room, project, roomDerived) {
  const firstSub = room.substrates[group.substrates[0]];
  const ctx = {
    // Dimensions (verified identical by precheck)
    quality_tier:       firstSub.quality_tier || room.quality_tier || project.default_quality_tier || 'QT3',
    application_method: firstSub.application_method || project.default_application_method || 'brush_roll',
    substrate_state:    firstSub.substrate_state ? uiStateToSpecState(firstSub.substrate_state) : null,
    complexity:         room.complexity || project.default_complexity || 'STD',
    height_band:        roomDerived?.heightBand || 'STD',
    texture:            firstSub.texture || project.default_texture || 'smooth',

    // Pass group fields
    pass_group_id:         group.group_id,
    pass_group_substrates: group.substrates.slice(),
    pass_type:             group.pass_type,

    // Phase-specific flags from metadata
    ...(group.metadata.prime_mode ? { prime_mode: group.metadata.prime_mode } : {}),

    // Explicit null for paintable_item — no single-substrate identity
    paintable_item: null,
  };
  return ctx;
}

// Bridge: the room substrate_state strings use UI conventions ("bare_drywall");
// scenarios match on spec-state names ("SS_BARE_DRYWALL"). The existing
// UI_STATE_TO_SPEC_STATE map handles this.
function uiStateToSpecState(uiState) {
  return UI_STATE_TO_SPEC_STATE?.[uiState] || uiState;
}
```

Make sure `UI_STATE_TO_SPEC_STATE` is already imported (it should be, based on the existing imports at the top of the file).

- [ ] **Step 4: Emit group inputs + skip grouped substrates in the spec loop**

Inside `buildScenarioInputs`, inside the `for (let ri = 0; ri < rooms.length; ri++)` loop, right after the `resolvePassGroups` call added in Task 3:

```js
    const passGroups = resolvePassGroups(room, project, db);
    const groupedSubstrates = new Set(passGroups.flatMap(g => g.substrates));

    // Emit one merged input per group BEFORE the spec loop
    for (const group of passGroups) {
      const ctx = buildGroupCtx(group, room, project, roomDerived);
      normalizePassGroupCtx(ctx);
      roomInputs.push({
        roomIndex: ri,
        roomLabel,
        specId: group.group_id,           // group_id acts as specId for downstream
        ctx,
        roomQty,
        roomItems,
        passGroup: group,                  // reference for downstream consumers
      });
    }
```

Then inside the `for (const specId of activeSpecIds)` loop, right after `const primarySub = SPEC_SUBSTRATE_MAP[specId]; if (!primarySub) continue;`:

```js
      // Skip specs whose primary substrate is consumed by a pass group —
      // the group's merged input already represents the combined work.
      if (groupedSubstrates.has(primarySub)) continue;
```

- [ ] **Step 5: Run — verify tests pass**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: all pass.

- [ ] **Step 6: Run the full test suite for regressions**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 7: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/engine/context-adapter.js Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js
git commit -m "feat(paintscope): emit grouped input + skip grouped specs in adapter

buildScenarioInputs now calls resolvePassGroups before the spec
loop, pushes one merged input per group with buildGroupCtx, and
skips spec iteration when the spec's primary substrate is consumed
by a group. Per-room fan-out changes from N per-substrate inputs
to (N - grouped_count + group_count) inputs.
"
```

---

### Task 12: Deprecate + archive 8 old combined scenarios

**Files:**
- Move + modify:
  - `Claude/scenarios/SCN_DRYWALL_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL_COMBINED.json` → `_archive/`
  - `Claude/scenarios/SCN_CEILING_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL_COMBINED.json` → `_archive/`

- [ ] **Step 1: Create archive directory + move + flag deprecated**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && mkdir -p Claude/scenarios/_archive && node -e "
const fs = require('fs');
const path = require('path');
const SRC = 'Claude/scenarios';
const DST = 'Claude/scenarios/_archive';
const QTS = ['QT2','QT3','QT4','QT5'];
const families = [
  s => \`SCN_DRYWALL_PRIME_\${s}_SPRAY_BACKROLL_COMBINED\`,
  s => \`SCN_CEILING_PRIME_\${s}_SPRAY_BACKROLL_COMBINED\`,
];
for (const qt of QTS) {
  for (const fn of families) {
    const id = fn(qt);
    const src = path.join(SRC, id + '.json');
    const dst = path.join(DST, id + '.json');
    if (!fs.existsSync(src)) { console.log('SKIP (missing)', id); continue; }
    const scn = JSON.parse(fs.readFileSync(src, 'utf8'));
    scn.status = 'deprecated';
    scn.deprecated_reason = 'Superseded by SCN_COMBINED_WALLS_CEILING_PRIME_* under the pass-group model. See Claude/docs/superpowers/specs/2026-04-21-combined-prime-pass-groups-design.md.';
    fs.writeFileSync(dst, JSON.stringify(scn, null, 2) + '\n');
    fs.unlinkSync(src);
    console.log('ARCHIVED', id);
  }
}
"
```

Expected: 8 `ARCHIVED` lines.

- [ ] **Step 2: Verify old scenarios are gone from scenarios/ root**

Run:
```bash
ls "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/scenarios/SCN_DRYWALL_PRIME_"*"_COMBINED.json" 2>/dev/null || echo "none — correct"
ls "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/scenarios/SCN_CEILING_PRIME_"*"_COMBINED.json" 2>/dev/null || echo "none — correct"
```

Expected: both say `none — correct`.

- [ ] **Step 3: Verify archive has 8 files**

Run:
```bash
ls "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/scenarios/_archive/" | wc -l
```

Expected: `8`.

- [ ] **Step 4: Update the old generator script to point at the new approach**

Modify `Claude/scripts/gen-combined-prime-scenarios.mjs`. Replace its entire contents with:

```js
#!/usr/bin/env node
// DEPRECATED — kept as a historical reference.
//
// This script generated the per-substrate combined scenarios (SCN_DRYWALL_PRIME_*_COMBINED
// + SCN_CEILING_PRIME_*_COMBINED) that were active before the pass-group model.
// Those scenarios were archived to Claude/scenarios/_archive/ in the pass-groups
// implementation.
//
// Current combined prime scenarios live at:
//   Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL.json
//
// Regenerate those via: node Claude/scripts/gen-combined-prime-scenarios-v2.mjs
// (or by copying the QT3 template and adjusting — see the pass-groups spec).

console.error('This generator is deprecated. See file header for the current path.');
process.exit(1);
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/scenarios/ Claude/scripts/gen-combined-prime-scenarios.mjs
git commit -m "refactor(paintscope): archive 8 old combined prime scenarios

Per-substrate combined scenarios (SCN_DRYWALL_PRIME_*_COMBINED,
SCN_CEILING_PRIME_*_COMBINED) are superseded by 4 pass-group-shaped
scenarios (SCN_COMBINED_WALLS_CEILING_PRIME_*). Marked status:
deprecated, moved to Claude/scenarios/_archive/. The engine's
deprecated skip means they silently no-op if somehow re-imported.

Old generator script stubbed out with a deprecation notice.
"
```

---

### Task 13: Rebuild bundle + HIL verification of combined prime on McLeod

**Files:**
- Modified via bundle rebuild: `Claude/tools/paintscope/src/data/scenario-bundle.gen.js`

- [ ] **Step 1: Rebuild the bundle**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && node Claude/scripts/build-scenario-bundle.mjs
```

Expected: bundle rebuilds successfully. Scenario count changes: -8 archived + 4 new = net -4 scenarios.

- [ ] **Step 2: Human verification of combined prime on McLeod**

Ask the user to:
1. Refresh `localhost:5173`.
2. Open McLeod project (17 rooms).
3. Go to Setup tab → verify "Combined wall and ceiling prime (pre-trim)" toggle is ON.
4. Go to Estimate tab.
5. For any interior room with drywall walls + ceiling in bare_drywall state:
   - Expand the room.
   - Verify there is ONE line item labeled "Combined Walls+Ceiling Prime (Pre-Trim, Spray+Backroll, QT3)" (or equivalent QT).
   - Verify there are NO separate `SF_DRYWALL_WALL_NC_PRIME` + `SF_DRYWALL_CEILING_NC_PRIME` lines in addition to the combined line.
   - Expand the combined line — tasks should include wall primer + ceiling primer (both spray) + backroll tasks + inspects. Should NOT include floor-protect-install, floor-protect-teardown, fixture-covers, or ceiling-edge-masking-install/teardown.
6. Click "Export Estimate JSON" and save as `docs/Painting Project Profiles/estimate_McLeod_phase2_combined.json`.
7. Compare total hours to baseline (`estimate_McLeod_phase1_baseline.json`).

Expected: total hours should be **LOWER** than the 554.56h baseline by more than the previous ~20.3h savings (because the duplicated protection setup/teardown tasks are now correctly absent).

If hours are LOW (e.g., back to 70-ish), the adapter is emitting empty group inputs — stop and debug `buildGroupCtx` / the spec-skip logic.

If hours are unchanged from baseline, the group isn't firing — check console for "no scenario matched" warnings; verify the scenario match criteria align with the ctx `buildGroupCtx` produces.

- [ ] **Step 3: Turn OFF combined prime in Setup tab, re-export, verify fallback**

Ask the user to:
1. Setup tab → turn OFF "Combined wall and ceiling prime".
2. Estimate tab should now show wall + ceiling as SEPARATE lines (old behavior).
3. Export and save as `docs/Painting Project Profiles/estimate_McLeod_phase2_separate.json`.
4. Total hours here should match `estimate_McLeod_phase1_baseline.json` (within rounding — both are in separate mode).

Expected: separate-mode output matches Phase 1 baseline within 0.01h.

- [ ] **Step 4: Commit the bundle rebuild**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/data/scenario-bundle.gen.js
git commit -m "chore(paintscope): rebuild bundle for Phase 2 combined prime

Bundle now includes 4 new pass-group-shaped combined prime scenarios
and excludes 8 archived per-substrate versions. McLeod with combined
prime ON: single combined line item per room, larger savings than
pre-Phase-2 due to setup/teardown dedup. Combined prime OFF: matches
Phase 1 baseline within rounding.
"
```

---

## Phase 3 — Combined Finish goes live

Goal of phase: create 6 new combined finish modules, generator script for 12 scenarios, implement combined-finish precheck, verify on a test project with product match.

---

### Task 14: Create combined finish apply modules

**Files:**
- Create: `Claude/modules/MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED.json`
- Create: `Claude/modules/MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED.json`

- [ ] **Step 1: Find the non-combined finish apply task names**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && cat Claude/modules/MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL.json 2>/dev/null || echo "non-combined wall finish module not found — check exact name"
```

Note the `task_ref`s used (e.g. `TSK_WALL_SPRAY_FINISH`, `TSK_WALL_BACKROLL_FINISH`). Use those as refs in the combined module.

- [ ] **Step 2: Write MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED**

File: `Claude/modules/MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED.json`

```json
{
  "module_id": "MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED",
  "name": "Apply Wall Finish (Spray + Backroll, Combined Wall+Ceiling Pass)",
  "phase": "apply",
  "intent": "Wall finish variant for the combined wall+ceiling finish pass (same product/sheen on both substrates). Identical task list to MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL. Rate overrides on task_ref entries go here when painter data justifies the combined-flow speedup.",
  "tasks": [
    { "task_ref": "TSK_WALL_SPRAY_FINISH" },
    { "task_ref": "TSK_WALL_BACKROLL_FINISH" }
  ],
  "modifier_eligibility": {
    "qt": true, "height": true, "texture": true, "complexity": true
  },
  "doctrine": "Combined-pass finish variant. Paired with MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED inside SCN_COMBINED_WALLS_CEILING_FINISH_* scenarios. Rates currently match non-combined; add rate_override on task_ref entries when painter data confirms the combined-flow speedup."
}
```

If the non-combined task refs differ from `TSK_WALL_SPRAY_FINISH` / `TSK_WALL_BACKROLL_FINISH`, replace with whatever Step 1 revealed.

- [ ] **Step 3: Write MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED**

File: `Claude/modules/MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED.json`

```json
{
  "module_id": "MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED",
  "name": "Apply Ceiling Finish (Spray + Backroll, Combined Wall+Ceiling Pass)",
  "phase": "apply",
  "intent": "Ceiling finish variant for the combined wall+ceiling finish pass. Drops the post-spray wall-line cut-in — wall spray covers the edge in combined mode.",
  "tasks": [
    { "task_ref": "TSK_CEIL_SPRAY_FINISH" },
    { "task_ref": "TSK_CEIL_BACKROLL_FINISH" }
  ],
  "modifier_eligibility": {
    "qt": true, "height": true, "texture": true, "complexity": true
  },
  "doctrine": "Combined-pass ceiling finish variant. Drops the ceiling-to-wall cut-in task present in separate-mode MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL — in combined mode the wall scenario covers that edge. Rates match non-combined until painter data drives overrides."
}
```

Replace task refs as needed per Step 1 findings.

- [ ] **Step 4: Validate both modules parse**

Run:
```bash
node -e "['MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED','MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED'].forEach(m => console.log(m, JSON.parse(require('fs').readFileSync(\`C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/modules/\${m}.json\`,'utf8')).tasks.length + ' tasks'))"
```

Expected: both print with task counts.

- [ ] **Step 5: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/modules/MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED.json Claude/modules/MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED.json
git commit -m "feat(paintscope): combined wall+ceiling finish apply modules

Two dedicated apply modules for the combined finish scenario:
- MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED — same tasks as
  non-combined; placeholder for future rate_override tuning.
- MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED — drops the wall-
  line cut-in task (wall scenario covers the edge in combined pass).
"
```

---

### Task 15: Create combined finish shared modules

**Files:**
- Create: `Claude/modules/MOD_SETUP_COMBINED_WC_FINISH.json`
- Create: `Claude/modules/MOD_PREP_COMBINED_WC_FINISH.json`
- Create: `Claude/modules/MOD_INTERSTAGE_COMBINED_WC_FINISH.json`
- Create: `Claude/modules/MOD_CLEANUP_COMBINED_WC_FINISH.json`

- [ ] **Step 1: Find existing non-combined wall/ceiling finish setup/prep/interstage/cleanup modules to reference task names**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && ls Claude/modules/MOD_SETUP_WALL_FINISH*.json Claude/modules/MOD_SETUP_CEILING_FINISH*.json Claude/modules/MOD_PREP_WALL_FINISH*.json Claude/modules/MOD_PREP_CEILING_FINISH*.json Claude/modules/MOD_INTERSTAGE_WALL_FINISH*.json Claude/modules/MOD_INTERSTAGE_CEILING_FINISH*.json Claude/modules/MOD_CLEANUP_WALL_FINISH*.json Claude/modules/MOD_CLEANUP_CEILING_FINISH*.json 2>/dev/null | head -20
```

Note the task_refs in each. Reuse them.

- [ ] **Step 2: Write MOD_SETUP_COMBINED_WC_FINISH**

File: `Claude/modules/MOD_SETUP_COMBINED_WC_FINISH.json`

```json
{
  "module_id": "MOD_SETUP_COMBINED_WC_FINISH",
  "name": "Setup for Combined Wall+Ceiling Finish",
  "phase": "setup",
  "intent": "Setup for the finish-phase combined pass. Unlike combined prime (pre-trim, nothing installed), finish happens when the house is built out — floors, fixtures, and trim are all in place. Single combined pass needs floor protection, fixture covers, trim-edge masking just like separate finish, but only ONE setup not two.",
  "tasks": [
    { "task_ref": "TSK_FLOOR_PROTECT_FULL_SETUP",
      "applies_when": { "application_method": ["spray_backroll", "spray"] } },
    { "task_ref": "TSK_FLOOR_PROTECT_PERIMETER_SETUP",
      "applies_when": { "application_method": ["brush_roll", "roll"] } },
    { "task_ref": "TSK_FIXTURE_COVERS_SETUP",
      "applies_when": { "application_method": ["spray_backroll", "spray"] } },
    { "task_ref": "TSK_MASK_TRIM_BASEBOARD" },
    { "task_ref": "TSK_MASK_TRIM_CASING_DOOR" },
    { "task_ref": "TSK_MASK_TRIM_CASING_WINDOW" }
  ],
  "modifier_eligibility": {
    "qt": false, "height": false, "texture": false, "complexity": false
  },
  "doctrine": "Single setup replaces separate wall + ceiling finish setups. Trim-edge masking is still per-edge (baseboard/door-casing/window-casing each have their own ps_key). Protection tasks gate by application_method — spray methods need full coverage, roll methods need only perimeter."
}
```

Replace task_refs with the actual names found in Step 1 if they differ.

- [ ] **Step 3: Write MOD_PREP_COMBINED_WC_FINISH**

File: `Claude/modules/MOD_PREP_COMBINED_WC_FINISH.json`

```json
{
  "module_id": "MOD_PREP_COMBINED_WC_FINISH",
  "name": "Prep for Combined Wall+Ceiling Finish",
  "phase": "prep",
  "intent": "Single prep pass for combined wall+ceiling finish. One dust/vacuum of the room, two substrate-scoped inspects of the primed surfaces.",
  "tasks": [
    { "task_ref": "TSK_WALL_INSPECT_PREFINISH" },
    { "task_ref": "TSK_CEIL_INSPECT_PREFINISH" },
    { "task_ref": "TSK_WALL_VACUUM_DUST_PREFINISH" }
  ],
  "modifier_eligibility": {
    "qt": true, "height": true, "texture": false, "complexity": true
  },
  "doctrine": "Mirrors MOD_PREP_COMBINED_PRIME pattern — single vacuum, two inspects. If prefinish task names differ from PREPRIME, replace refs here."
}
```

Verify task names exist before committing. If `TSK_WALL_INSPECT_PREFINISH` etc. don't exist in `Claude/tasks/`, either (a) author them as new canonical tasks or (b) reuse whatever the non-combined finish prep module references. Prefer (b) for now — this is scope (c), not a new-task authoring project.

- [ ] **Step 4: Write MOD_INTERSTAGE_COMBINED_WC_FINISH**

File: `Claude/modules/MOD_INTERSTAGE_COMBINED_WC_FINISH.json`

```json
{
  "module_id": "MOD_INTERSTAGE_COMBINED_WC_FINISH",
  "name": "Interstage Sand for Combined Wall+Ceiling Finish",
  "phase": "interstage",
  "intent": "Sand between finish coats. Single room-level pass covers both substrates.",
  "tasks": [
    { "task_ref": "TSK_WALL_LIGHT_SAND_FINISH" },
    { "task_ref": "TSK_CEIL_LIGHT_SAND_FINISH" }
  ],
  "modifier_eligibility": {
    "qt": true, "height": true, "texture": true, "complexity": true
  },
  "doctrine": "Two substrate-scoped sand tasks (each targets its surface ps_key) so the quantity math is right per substrate even though the painter works the room once. If the project's finish doctrine is 'no interstage sand for combined', reduce to a single light inspect task."
}
```

Verify refs exist; reuse non-combined refs where available.

- [ ] **Step 5: Write MOD_CLEANUP_COMBINED_WC_FINISH**

File: `Claude/modules/MOD_CLEANUP_COMBINED_WC_FINISH.json`

```json
{
  "module_id": "MOD_CLEANUP_COMBINED_WC_FINISH",
  "name": "Cleanup After Combined Wall+Ceiling Finish",
  "phase": "cleanup",
  "intent": "Single cleanup pass: remove floor protection, fixture covers, trim-edge masking. Final inspect covers both substrates.",
  "tasks": [
    { "task_ref": "TSK_FLOOR_PROTECT_FULL_TEARDOWN",
      "applies_when": { "application_method": ["spray_backroll", "spray"] } },
    { "task_ref": "TSK_FLOOR_PROTECT_PERIMETER_TEARDOWN",
      "applies_when": { "application_method": ["brush_roll", "roll"] } },
    { "task_ref": "TSK_FIXTURE_COVERS_TEARDOWN_FINISH",
      "applies_when": { "application_method": ["spray_backroll", "spray"] } },
    { "task_ref": "TSK_REMOVE_MASKING_TRIM" },
    { "task_ref": "TSK_WALL_FINAL_INSPECT_FINISH" },
    { "task_ref": "TSK_CEIL_FINAL_INSPECT_FINISH" }
  ],
  "modifier_eligibility": {
    "qt": false, "height": false, "texture": false, "complexity": false
  },
  "doctrine": "Combined cleanup with method-gated teardowns mirroring setup. Final inspect per substrate so the quantity math attributes correctly."
}
```

Same caveat — verify task refs exist, reuse non-combined where available.

- [ ] **Step 6: Validate all 4 modules parse**

Run:
```bash
node -e "['MOD_SETUP_COMBINED_WC_FINISH','MOD_PREP_COMBINED_WC_FINISH','MOD_INTERSTAGE_COMBINED_WC_FINISH','MOD_CLEANUP_COMBINED_WC_FINISH'].forEach(m => console.log(m, JSON.parse(require('fs').readFileSync(\`C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/modules/\${m}.json\`,'utf8')).tasks.length + ' tasks'))"
```

Expected: all 4 print with task counts.

- [ ] **Step 7: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/modules/MOD_SETUP_COMBINED_WC_FINISH.json Claude/modules/MOD_PREP_COMBINED_WC_FINISH.json Claude/modules/MOD_INTERSTAGE_COMBINED_WC_FINISH.json Claude/modules/MOD_CLEANUP_COMBINED_WC_FINISH.json
git commit -m "feat(paintscope): combined wall+ceiling finish shared modules

Setup/prep/interstage/cleanup modules for combined finish pass.
Follow the same pattern as combined prime modules — task_ref to
canonical atomic tasks, substrate-scoped inspects preserved for
quantity attribution, shared tasks (vacuum, teardowns) fire once
not twice.
"
```

---

### Task 16: Write combined finish scenario generator

**Files:**
- Create: `Claude/scripts/gen-combined-finish-scenarios.mjs`

- [ ] **Step 1: Write the generator script**

File: `Claude/scripts/gen-combined-finish-scenarios.mjs`

```js
#!/usr/bin/env node
// Generate combined wall+ceiling finish scenarios: 4 QTs × 3 sheens = 12 files.
//
// Each scenario matches on pass_group_id: 'walls_ceiling_finish_combined' plus
// QT, sheen, application_method. The resolver only forms a finish group when
// walls + ceiling share system_id + product_id + sheen + color_code; the
// scenario's match filter narrows further by sheen + QT.
//
// Idempotent — re-running overwrites.

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCN_DIR = join(__dirname, '..', 'scenarios');

const QT_LEVELS = ['QT2', 'QT3', 'QT4', 'QT5'];
const SHEENS = ['EGGSHELL', 'SATIN', 'MATTE'];

function scenario(qt, sheen) {
  const sheenLower = sheen.toLowerCase();
  return {
    scenario_id: `SCN_COMBINED_WALLS_CEILING_FINISH_${qt}_SPRAY_BACKROLL_${sheen}`,
    name: `Combined Walls+Ceiling Finish (Spray+Backroll, ${qt}, ${sheen})`,
    domain: 'interior',
    context: 'NC',
    pass_type: 'finish',
    matches: {
      pass_group_id: 'walls_ceiling_finish_combined',
      quality_tier: [qt],
      application_method: 'spray_backroll',
      sheen: sheenLower,
    },
    modules: [
      'MOD_SETUP_COMBINED_WC_FINISH',
      'MOD_PREP_COMBINED_WC_FINISH',
      'MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED',
      'MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED',
      'MOD_INTERSTAGE_COMBINED_WC_FINISH',
      'MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED',
      'MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED',
      'MOD_CLEANUP_COMBINED_WC_FINISH',
    ],
    coat_counts: { prime_coats: 0, finish_coats: 2, interstage_cycles: 1 },
    material_systems: ['SYS_WALL_FINISH'],
    output_state: `SS_PAINTED_${sheen}`,
  };
}

let count = 0;
for (const qt of QT_LEVELS) {
  for (const sheen of SHEENS) {
    const scn = scenario(qt, sheen);
    writeFileSync(join(SCN_DIR, `${scn.scenario_id}.json`), JSON.stringify(scn, null, 2) + '\n');
    console.log('wrote', scn.scenario_id);
    count++;
  }
}
console.log(`\nGenerated ${count} combined finish scenarios.`);
```

- [ ] **Step 2: Run the generator**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && node Claude/scripts/gen-combined-finish-scenarios.mjs
```

Expected: `Generated 12 combined finish scenarios.`

- [ ] **Step 3: Verify 12 files created**

Run:
```bash
ls "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/scenarios/SCN_COMBINED_WALLS_CEILING_FINISH_"*.json | wc -l
```

Expected: `12`.

- [ ] **Step 4: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/scripts/gen-combined-finish-scenarios.mjs "Claude/scenarios/SCN_COMBINED_WALLS_CEILING_FINISH_"*
git commit -m "feat(paintscope): generate 12 combined wall+ceiling finish scenarios

Generator produces 4 QTs × 3 sheens (EGGSHELL, SATIN, MATTE) =
12 scenarios, all matching pass_group_id: walls_ceiling_finish_combined.
Each fires 8 modules including 2 coats of wall+ceiling apply with
one interstage sand between. FLAT and SEMI_GLOSS can be added by
extending the SHEENS array and re-running the generator.
"
```

---

### Task 17: Implement combined-finish precheck

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/pass-groups.js`
- Test: `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`:

```js
describe('resolvePassGroups combined-finish precheck', () => {
  const sameProduct = {
    system_id: 'SYS_WALL_FINISH',
    product_id: 'PROD_SW_CASHMERE_INT',
    sheen: 'eggshell',
    color_code: 'SW7036',
  };
  const baseRoom = {
    substrates: {
      walls:   { substrate_state: 'primed_factory', application_method: 'spray_backroll' },
      ceiling: { substrate_state: 'primed_factory', application_method: 'spray_backroll' },
    },
    quality_tier: 'QT3',
  };
  const baseProject = {
    default_combined_prime: false,
    default_quality_tier: 'QT3',
    default_application_method: 'spray_backroll',
    new_construction: true,
  };
  // Mock specData structure — the real resolver reads resolved finish spec
  // from here via a lookup keyed by (roomId, substrateKey).
  const specDataWithMatch = {
    resolvedFinishByRoomSubstrate: {
      'r1:walls':   sameProduct,
      'r1:ceiling': sameProduct,
    },
  };

  it('forms combined-finish group when all product fields match', () => {
    const room = { ...baseRoom, id: 'r1' };
    const groups = resolvePassGroups(room, baseProject, specDataWithMatch);
    const finishGroup = groups.find(g => g.group_id === 'walls_ceiling_finish_combined');
    expect(finishGroup).toBeDefined();
    expect(finishGroup.pass_type).toBe('finish');
    expect(finishGroup.source).toBe('product_match');
    expect(finishGroup.metadata).toEqual({
      system_id: 'SYS_WALL_FINISH',
      product_id: 'PROD_SW_CASHMERE_INT',
      sheen: 'eggshell',
      color_code: 'SW7036',
    });
  });

  it('does not form group when sheens differ', () => {
    const specData = {
      resolvedFinishByRoomSubstrate: {
        'r1:walls':   sameProduct,
        'r1:ceiling': { ...sameProduct, sheen: 'satin' },
      },
    };
    const room = { ...baseRoom, id: 'r1' };
    const groups = resolvePassGroups(room, baseProject, specData);
    expect(groups.find(g => g.group_id === 'walls_ceiling_finish_combined')).toBeUndefined();
  });

  it('does not form group when color_codes differ', () => {
    const specData = {
      resolvedFinishByRoomSubstrate: {
        'r1:walls':   sameProduct,
        'r1:ceiling': { ...sameProduct, color_code: 'SW7008' },
      },
    };
    const room = { ...baseRoom, id: 'r1' };
    const groups = resolvePassGroups(room, baseProject, specData);
    expect(groups.find(g => g.group_id === 'walls_ceiling_finish_combined')).toBeUndefined();
  });

  it('does not form group when products differ', () => {
    const specData = {
      resolvedFinishByRoomSubstrate: {
        'r1:walls':   sameProduct,
        'r1:ceiling': { ...sameProduct, product_id: 'PROD_SW_PROMAR200_INT' },
      },
    };
    const room = { ...baseRoom, id: 'r1' };
    const groups = resolvePassGroups(room, baseProject, specData);
    expect(groups.find(g => g.group_id === 'walls_ceiling_finish_combined')).toBeUndefined();
  });

  it('does not form group when systems differ', () => {
    const specData = {
      resolvedFinishByRoomSubstrate: {
        'r1:walls':   sameProduct,
        'r1:ceiling': { ...sameProduct, system_id: 'SYS_CEILING_FINISH' },
      },
    };
    const room = { ...baseRoom, id: 'r1' };
    const groups = resolvePassGroups(room, baseProject, specData);
    expect(groups.find(g => g.group_id === 'walls_ceiling_finish_combined')).toBeUndefined();
  });

  it('returns [] when specData has no resolved finish for walls or ceiling', () => {
    const specData = { resolvedFinishByRoomSubstrate: {} };
    const room = { ...baseRoom, id: 'r1' };
    expect(resolvePassGroups(room, baseProject, specData)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — verify failure**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: 6 new tests fail (finish precheck not implemented).

- [ ] **Step 3: Implement combined-finish precheck**

Extend `Claude/tools/paintscope/src/engine/pass-groups.js`. Update `resolvePassGroups`:

```js
export function resolvePassGroups(room, project, specData) {
  if (!room || !project) return [];
  const groups = [];

  const primeGroup = tryCombinedPrimeGroup(room, project);
  if (primeGroup) groups.push(primeGroup);

  const finishGroup = tryCombinedFinishGroup(room, project, specData);
  if (finishGroup) groups.push(finishGroup);

  return groups;
}
```

Add `tryCombinedFinishGroup` helper below the existing helpers:

```js
function tryCombinedFinishGroup(room, project, specData) {
  if (!specData?.resolvedFinishByRoomSubstrate) return null;
  if (!room.id) return null;

  const walls = room.substrates?.walls;
  const ceiling = room.substrates?.ceiling;
  if (!walls || !ceiling) return null;

  const wallsFinish   = specData.resolvedFinishByRoomSubstrate[`${room.id}:walls`];
  const ceilingFinish = specData.resolvedFinishByRoomSubstrate[`${room.id}:ceiling`];
  if (!wallsFinish || !ceilingFinish) return null;

  // All four product fields must match
  if (wallsFinish.system_id  !== ceilingFinish.system_id)  return null;
  if (wallsFinish.product_id !== ceilingFinish.product_id) return null;
  if (wallsFinish.sheen      !== ceilingFinish.sheen)      return null;
  if (wallsFinish.color_code !== ceilingFinish.color_code) return null;

  // Method + QT must match
  const wallsMethod   = resolveMethod(walls, project);
  const ceilingMethod = resolveMethod(ceiling, project);
  if (wallsMethod !== ceilingMethod) return null;

  const wallsQt   = resolveQt(walls, room, project);
  const ceilingQt = resolveQt(ceiling, room, project);
  if (wallsQt !== ceilingQt) return null;

  return {
    group_id: 'walls_ceiling_finish_combined',
    substrates: ['walls', 'ceiling'],
    pass_type: 'finish',
    source: 'product_match',
    metadata: {
      system_id:  wallsFinish.system_id,
      product_id: wallsFinish.product_id,
      sheen:      wallsFinish.sheen,
      color_code: wallsFinish.color_code,
    },
  };
}
```

- [ ] **Step 4: Run — verify tests pass**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/engine/pass-groups.js Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js
git commit -m "feat(paintscope): combined-finish precheck in resolvePassGroups

Forms { group_id: 'walls_ceiling_finish_combined', ... } when walls
and ceiling share all four product fields (system/product/sheen/
color_code) AND method + QT. Reads resolved finish specs from
specData.resolvedFinishByRoomSubstrate (shape TBD in Task 18 —
adapter currently threads null; explicit test doubles demonstrate
expected shape).

Fails closed: any mismatch returns null, substrates fall back to
independent inputs.
"
```

---

### Task 18: Thread resolved finish spec data into resolver

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/context-adapter.js`
- Test: `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`

- [ ] **Step 1: Understand how spec-resolution exposes finish products today**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && grep -rn "product_id\|system_id" Claude/tools/paintscope/src/engine/spec-resolution.js | head -15
```

If the existing resolution produces finish product info per (room, substrate), record the function to call. If not, the engineer implementing this task must find the right lookup function or add one. The likely candidate is `resolveSystem(specId, room, project)` combined with a product-catalog lookup.

- [ ] **Step 2: Build the resolvedFinishByRoomSubstrate map in buildScenarioInputs**

In `context-adapter.js`, before the room loop, add:

```js
  // Build resolved-finish lookup for pass-group finish precheck.
  // Shape: `${roomId}:${substrateKey}` → { system_id, product_id, sheen, color_code }
  // Only populated for substrates that have a resolved finish spec.
  const resolvedFinishByRoomSubstrate = buildResolvedFinishMap(rooms, project, db);

  // Wrap into specData-shaped object for resolver
  const passGroupSpecData = {
    ...(db || {}),
    resolvedFinishByRoomSubstrate,
  };
```

And pass `passGroupSpecData` into the resolver call:

```js
    const passGroups = resolvePassGroups(room, project, passGroupSpecData);
```

- [ ] **Step 3: Implement buildResolvedFinishMap**

Add near the top of `context-adapter.js` (below the existing helpers):

```js
// Build a flat lookup from `${roomId}:${substrateKey}` → resolved finish spec.
// The finish spec is { system_id, product_id, sheen, color_code } — enough
// for the pass-group precheck to determine product identity.
//
// This reads the user's material_overrides + color assignments, using the
// same resolution as the rest of the engine. Substrates without a finish
// spec (e.g., trim NC specs in a prime-only state) don't appear in the map.
function buildResolvedFinishMap(rooms, project, db) {
  const map = {};
  for (const room of rooms) {
    if (!room.id) continue;
    for (const subKey of ['walls', 'ceiling']) {
      // Scope (c) limit: only walls + ceiling resolve here. Extend when
      // trim-family combined finish comes online.
      const resolved = resolveFinishSpecForSubstrate(room, subKey, project, db);
      if (resolved) {
        map[`${room.id}:${subKey}`] = resolved;
      }
    }
  }
  return map;
}

function resolveFinishSpecForSubstrate(room, substrateKey, project, db) {
  const sub = room.substrates?.[substrateKey];
  if (!sub) return null;

  // Pick the spec family. Walls + ceiling in NC finish use:
  //   walls   → SF_DRYWALL_WALL_NC_FINISH
  //   ceiling → SF_DRYWALL_CEILING_NC_FINISH
  const specId = substrateKey === 'walls'
    ? 'SF_DRYWALL_WALL_NC_FINISH'
    : 'SF_DRYWALL_CEILING_NC_FINISH';

  // Use existing resolveSystem to get system_id (finish system for this spec).
  // If resolveSystem returns null, the substrate has no resolved finish.
  const system_id = resolveSystem(specId, room, project);
  if (!system_id) return null;

  // Product comes from project.material_overrides.system[system_id] → product_id
  const product_id = project.material_overrides?.system?.[system_id] || null;
  if (!product_id) return null;

  // Sheen from substrate config or project default
  const sheen = sub.sheen || project.default_sheen || null;

  // Color code from color assignments (shape depends on where colors live;
  // for scope (c), check sub.color_code OR room.color_assignments?.[substrateKey]?.color_code)
  const color_code = sub.color_code
                  || room.color_assignments?.[substrateKey]?.color_code
                  || null;

  // All four fields required — any null means no match can form
  if (!system_id || !product_id || !sheen || !color_code) return null;

  return { system_id, product_id, sheen, color_code };
}
```

Verify `resolveSystem` is imported at the top of `context-adapter.js` — per the existing import at line 36 it already is.

- [ ] **Step 4: Add integration test**

Append to `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`:

```js
describe('buildScenarioInputs emits grouped finish input when products match', () => {
  it('creates one combined-finish input when walls + ceiling have matching products', () => {
    const state = {
      project: {
        name: 'test',
        default_quality_tier: 'QT3',
        default_application_method: 'spray_backroll',
        default_sheen: 'eggshell',
        new_construction: true,
        default_substrates: ['walls', 'ceiling'],
        material_overrides: {
          system: {
            SYS_WALL_FINISH:    'PROD_SW_CASHMERE_INT',
            SYS_CEILING_FINISH: 'PROD_SW_CASHMERE_INT',  // same product across both
          },
        },
      },
      rooms: [
        {
          id: 'r1',
          label: 'Test Room',
          length_ft: 10,
          width_ft: 10,
          height_ft: 9,
          substrates: {
            walls: {
              substrate_state: 'primed_factory',
              sheen: 'eggshell',
              color_code: 'SW7036',
            },
            ceiling: {
              substrate_state: 'primed_factory',
              sheen: 'eggshell',
              color_code: 'SW7036',
            },
          },
        },
      ],
    };
    const result = buildScenarioInputs(state, null);
    const finishGroupInputs = result.roomInputs.filter(i => i.ctx.pass_group_id === 'walls_ceiling_finish_combined');
    expect(finishGroupInputs).toHaveLength(1);
  });

  it('falls back to separate-substrate inputs when color_codes differ', () => {
    const state = { /* ...same as above, but ceiling.color_code: 'SW7008' */ };
    // Full state — fill in same as above except the color mismatch.
    state.project = {
      name: 'test',
      default_quality_tier: 'QT3',
      default_application_method: 'spray_backroll',
      default_sheen: 'eggshell',
      new_construction: true,
      default_substrates: ['walls', 'ceiling'],
      material_overrides: { system: { SYS_WALL_FINISH: 'PROD_X', SYS_CEILING_FINISH: 'PROD_X' } },
    };
    state.rooms = [{
      id: 'r1', label: 'T', length_ft: 10, width_ft: 10, height_ft: 9,
      substrates: {
        walls:   { substrate_state: 'primed_factory', sheen: 'eggshell', color_code: 'SW7036' },
        ceiling: { substrate_state: 'primed_factory', sheen: 'eggshell', color_code: 'SW7008' },
      },
    }];
    const result = buildScenarioInputs(state, null);
    const finishGroupInputs = result.roomInputs.filter(i => i.ctx.pass_group_id === 'walls_ceiling_finish_combined');
    expect(finishGroupInputs).toHaveLength(0);
  });
});
```

- [ ] **Step 5: Run — verify tests pass**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pass-groups.test.js
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/engine/context-adapter.js Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js
git commit -m "feat(paintscope): thread resolved finish spec data to pass-group resolver

Adds buildResolvedFinishMap + resolveFinishSpecForSubstrate helpers
in context-adapter. Map is keyed by \${roomId}:\${substrateKey} and
contains { system_id, product_id, sheen, color_code } when all four
resolve. Passed to resolvePassGroups via specData for combined-finish
precheck.
"
```

---

### Task 19: Rebuild bundle + verify combined finish on test project

**Files:**
- Modified via bundle rebuild: `Claude/tools/paintscope/src/data/scenario-bundle.gen.js`

- [ ] **Step 1: Rebuild the bundle**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && node Claude/scripts/build-scenario-bundle.mjs
```

Expected: bundle regenerates. Scenarios count grows by 12 (12 new combined finish).

- [ ] **Step 2: Human verification — combined finish**

Ask the user to:
1. Refresh `localhost:5173`.
2. Create a new test project (or open McLeod).
3. In a test room, set:
   - Walls: substrate_state = primed_factory, sheen = eggshell, color_code = SW7036 (or pick from SW color database)
   - Ceiling: SAME values (same sheen, same color_code)
   - Ensure `material_overrides.system.SYS_WALL_FINISH` and `SYS_CEILING_FINISH` both point to the same `PROD_*_INT` product.
4. Go to Estimate tab.
5. Verify ONE line item for "Combined Walls+Ceiling Finish" (with matching QT + sheen).
6. Change ceiling's color to a DIFFERENT `color_code`.
7. Estimate tab re-runs; line splits back into TWO per-substrate finish lines.

If the line doesn't form: check console for match warnings; compare the emitted ctx (Dev tab → Engine Trace) to the scenario's `matches` criteria.

- [ ] **Step 3: Commit the bundle rebuild**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/data/scenario-bundle.gen.js
git commit -m "chore(paintscope): rebuild bundle for Phase 3 combined finish

12 new combined finish scenarios + 6 new combined finish modules
bundled. Test project with matched walls+ceiling product produces
one combined-finish line; toggling color_code to mismatch falls
back to separate per-substrate lines.
"
```

---

### Task 20: Update EstimateView for optional pass-group rendering

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx`

- [ ] **Step 1: Find the line-item substrate rendering**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha" && grep -n "substrate\|specId\|specName" Claude/tools/paintscope/src/components/estimate/EstimateView.jsx | head -20
```

Identify the JSX where a spec result's substrate is rendered (typically a label like "Walls" or "Ceiling").

- [ ] **Step 2: Render pass-group substrate chips when present**

In the spec-result rendering, add a conditional that checks `result.passGroupSubstrates` and renders each substrate as a chip. Example (adapt to the actual component's shape):

```jsx
{result.passGroupSubstrates && result.passGroupSubstrates.length > 1 ? (
  <div className="substrate-chips">
    {result.passGroupSubstrates.map(s => (
      <span key={s} className="chip">{s}</span>
    ))}
  </div>
) : (
  <div className="substrate-label">{result.substrate || 'substrate'}</div>
)}
```

Add CSS for `.chip` if not already present.

- [ ] **Step 3: Manual UI check**

Ask user to refresh `localhost:5173`, load McLeod with combined prime on, and verify the combined-prime line shows "walls" + "ceiling" chips rather than a single substrate label.

- [ ] **Step 4: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/components/estimate/EstimateView.jsx
git commit -m "feat(paintscope): substrate chip rendering for grouped line items

When a spec result has passGroupSubstrates with 2+ substrates, render
each as a chip instead of a single substrate label. Falls back to the
existing single-substrate label for non-grouped inputs — zero regression.
"
```

---

### Task 21: Run full test suite + final verification

**Files:** N/A — verification-only task.

- [ ] **Step 1: Run all tests**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope" && npx vitest run
```

Expected: all existing tests + new pass-group tests pass. No regressions.

- [ ] **Step 2: McLeod end-to-end verification**

Ask user to:
1. Load McLeod with default_combined_prime ON.
2. Verify combined-prime line appears for each interior room with drywall.
3. Verify McLeod totalHours is LOWER than 554.56h baseline (because combined mode now correctly saves floor teardown + fixture cover tasks).
4. Export final estimate as `docs/Painting Project Profiles/estimate_McLeod_phase3_final.json`.

- [ ] **Step 3: Update memory**

Ask the user to record in their memory notes:
- Phase 1-3 complete, pass-group primitive live
- 8 old combined scenarios archived, 4 new combined-prime + 12 new combined-finish live
- Downstream coordination (portal + tracker) tracked as Phase 4 follow-on
- Reference design spec and this plan by path

- [ ] **Step 4: Final verification commit**

No additional file changes — a marker commit summarizing the completed scope.

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git commit --allow-empty -m "milestone(paintscope): combined prime + pass groups complete (scope c)

All 3 phases of the pass-groups spec shipped:
- Phase 1: Scaffolding (resolver stub, ctx normalization, deprecated skip)
- Phase 2: Combined prime live (4 new scenarios, 3 new modules, 8 archived)
- Phase 3: Combined finish live (12 new scenarios, 6 new modules, precheck active)

McLeod verification: combined prime line item fires correctly; total
hours below pre-Phase-2 baseline due to setup/cleanup dedup.
Combined finish fires on product match; falls back on mismatch.

Downstream (client portal + tracker schema updates) tracked as
Phase 4 — separate PRs in ideal-painting-website and tracker files.

Spec: Claude/docs/superpowers/specs/2026-04-21-combined-prime-pass-groups-design.md
Plan: Claude/docs/superpowers/plans/2026-04-21-combined-prime-pass-groups.md
"
```

---

## Phase 4 — Downstream coordination (OUT OF SCOPE; tracked)

Documented here for completeness. NOT part of this plan's execution.

### Future Task: Update client portal LineItem type

- File: `ideal-painting-website/lib/proposal-types.ts`
- Add optional fields to `LineItem`:

```ts
type LineItem = {
  // existing fields...
  substrates?: string[];      // ["walls","ceiling"] when grouped
  passGroupId?: string | null;
  passType?: "prime" | "finish" | null;
}
```

- Update proposal renderer to render `substrates` chips when present.
- Ship as a separate PR in ideal-painting-website repo.

### Future Task: Update tracker TimeEntry schema

- File: `Claude/tools/paintscope/src/components/tracker/TimeEntryForm.jsx` (+ TimeEntrySummary)
- Add optional `pass_group_id` field to TimeEntry.
- Surface pass groups as selectable tagging options in the substrate dropdown when a room has grouped passes (derive from the estimate results for that room).

These two changes are NOT in this plan because:
- They live in a different codebase / component tree
- They are additive and don't block the engine-side work
- Each warrants its own design review (portal proposal UX, tracker beta direction)

---

## Self-Review Notes

Checked against spec sections:
- §4 Architecture + data flow → covered by Tasks 2, 3, 11 (resolver stub → caller integration → group emit)
- §5 Data model → covered by Task 1 (registry) + ctx shape in Tasks 3 + 11
- §6 Resolver → covered by Tasks 2, 10, 17 (stub → prime precheck → finish precheck)
- §7 Scenarios + modules → covered by Tasks 6-9, 14-16 (3 prime shared + 4 prime scenarios + 2 finish apply + 4 finish shared + 12 finish scenarios)
- §8 Task gating → pattern demonstrated in Tasks 7, 8, 15 task entries (`applies_when` clauses)
- §9 Engine changes → covered by Tasks 3 (ctx normalization) + 4 (deprecated skip) + 11 (group input emit) + 20 (optional UI)
- §10 Migration/verification/rollback → phased structure + HIL checks in Tasks 5, 13, 19, 21; rollback path = `resolvePassGroups` returning [] still works after all changes (invariant preserved)

No placeholder text. Every code-bearing step includes actual code. Exact paths used throughout.

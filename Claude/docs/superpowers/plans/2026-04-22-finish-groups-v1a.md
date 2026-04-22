# Finish Groups V1a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an item-level `finish_group` field to every paintable item plus a dynamic pass-group resolver that pools same-group items in a room into one coordinated pass — shared setup/interstage/cleanup (dedup to one), per-member prep, pooled apply. Walls/ceiling UX unchanged.

**Architecture:** Extends the shipped pass-groups primitive. A new `finish_group_assignment` pass-group type is resolved per-room by a new function `resolveItemAssignmentGroups(room, project, priorGroups)`. Adapter emits one group-level input (with shared-modules-only scenario) AND per-member inputs (with `pass_group_id` set so their setup/interstage/cleanup tasks gate off via `applies_when: { pass_group_id: [null] }`). Per-substrate prep + apply fires normally on member inputs.

**Tech Stack:** React 19 + Vite 7, Vitest for tests, Node ESM scripts for bundle generation. Plain JS (no TypeScript). JSON-authored scenarios and modules in `Claude/scenarios/` and `Claude/modules/`.

**Spec:** [Claude/docs/superpowers/specs/2026-04-22-finish-groups-v1a-design.md](../specs/2026-04-22-finish-groups-v1a-design.md)

**Realistic effort:** ~6–8 days. (Spec estimated 3–4; the task-level `applies_when` gate surgery on per-substrate finish modules is the delta.)

---

## File Structure

### New files

- `Claude/scenarios/SCN_COMBINED_FINISH_GROUP_V1A.json` — generic shared scenario matched by group-level inputs
- `Claude/modules/MOD_SETUP_FINISH_GROUP.json` — shared setup module
- `Claude/modules/MOD_INTERSTAGE_FINISH_GROUP.json` — shared interstage module
- `Claude/modules/MOD_CLEANUP_FINISH_GROUP.json` — shared cleanup module
- `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js` — unit + integration tests for resolver, dedup, seeding

### Modified files

- `Claude/registries/pass_groups.json` — add `finish_group_assignment` entry
- `Claude/tools/paintscope/src/engine/pass-groups.js` — add `resolveItemAssignmentGroups`; extend `resolvePassGroups` to invoke it after pre-authored checks
- `Claude/tools/paintscope/src/engine/context-adapter.js` — emit group-level input per finish group; set `pass_group_id` on per-member inputs for grouped substrates; precedence rule defers to pre-authored groups
- `Claude/tools/paintscope/src/state/initial-state.js` — `createSubstrateConfig` seeds `finish_group` from `coating_type` deterministically
- `Claude/tools/paintscope/src/state/migrations.js` — v1.7 migration seeds `finish_group` on existing saved rooms
- `Claude/tools/paintscope/src/state/reducer.js` — `SET_SUBSTRATE` re-seeds `finish_group` on `coating_type` flip (only when still at previous default)
- `Claude/tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx` — finish_group `<select>` below coating_type (hidden for walls/ceiling)
- `Claude/tools/paintscope/src/components/room-editor/RoomEditor.jsx` — summary badge in header showing active groups + member counts
- Per-substrate finish-phase MODULES for trim-family substrates — add `applies_when: { pass_group_id: [null] }` on setup/interstage/cleanup TASKS (scope defined in Phase 8)
- `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js` — extend with precedence + integration cases

### Out of scope for this plan

- Rate bumps on combined apply (V2, needs painter data)
- Edge/boundary cut-in or masking cost between adjacent items in different groups (V2)
- Color phase transition cost (V2)
- Accent walls (requires walls-substrate splitting — orthogonal refactor)
- Dynamic palette (V2 UX extension)
- Named groups (V2)
- Project-wide group registry + material rollup (V2)
- Group consistency normalization (V2 extension to mismatch safeguard)
- Applies_when gates on NON-trim substrates (builtins, stairway components, wood_wall, wood_ceiling, wainscoting, beams, columns, mantels) — V1a ships with a known limitation that putting these in a finish_group produces double-counted setup/interstage/cleanup; flagged as V1b work

---

## Phase 0 — Branch and setup

### Task 0: Confirm branch state

- [ ] **Step 1: Verify current branch and clean tree**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git status
git rev-parse --abbrev-ref HEAD
```

Expected: branch `claude/cranky-saha`, working tree clean (or only the committed spec).

- [ ] **Step 2: Create a checkpoint branch reference**

```bash
git tag pre-finish-groups-v1a
```

Expected: tag created. If the work needs to be abandoned, `git reset --hard pre-finish-groups-v1a` restores the pre-V1a state.

---

## Phase 1 — Data model: field, defaults, migration

Goal of phase: `finish_group` exists on every paintable item's config, gets seeded deterministically on item-add, and migrates cleanly on existing saved rooms.

---

### Task 1: Helper for coating_type → finish_group default

**Files:**
- Modify: `Claude/tools/paintscope/src/state/initial-state.js`

- [ ] **Step 1: Write the failing test**

File: `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`

```js
import { describe, it, expect } from 'vitest';
import { defaultFinishGroupForCoatingType, createSubstrateConfig } from '../../state/initial-state.js';

describe('defaultFinishGroupForCoatingType', () => {
  it('returns C for paint', () => {
    expect(defaultFinishGroupForCoatingType('paint')).toBe('C');
  });
  it('returns D for stain_clear, stain_only, clear_only', () => {
    expect(defaultFinishGroupForCoatingType('stain_clear')).toBe('D');
    expect(defaultFinishGroupForCoatingType('stain_only')).toBe('D');
    expect(defaultFinishGroupForCoatingType('clear_only')).toBe('D');
  });
  it('returns C for null or unknown', () => {
    expect(defaultFinishGroupForCoatingType(null)).toBe('C');
    expect(defaultFinishGroupForCoatingType(undefined)).toBe('C');
    expect(defaultFinishGroupForCoatingType('weird_value')).toBe('C');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope"
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: FAIL with "defaultFinishGroupForCoatingType is not exported".

- [ ] **Step 3: Implement the helper**

Add to `Claude/tools/paintscope/src/state/initial-state.js` near the top (after the existing `genId` / `bumpNextId` helpers, before `createOpening`):

```js
// ============================================================
// FINISH GROUP default seeding
// ============================================================
// V1a palette reserves A/B for walls/ceiling (toggle-driven); non-wall/ceiling
// items get seeded to C (paint package) or D (stain/clear package) based on
// coating_type. Unknown/null coating_type falls back to C.
const STAIN_LIKE_COATING_TYPES = new Set(['stain_clear', 'stain_only', 'clear_only']);

export function defaultFinishGroupForCoatingType(coatingType) {
  if (STAIN_LIKE_COATING_TYPES.has(coatingType)) return 'D';
  return 'C';
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/state/initial-state.js Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "feat(paintscope): defaultFinishGroupForCoatingType helper"
```

---

### Task 2: Seed finish_group in createSubstrateConfig

**Files:**
- Modify: `Claude/tools/paintscope/src/state/initial-state.js` (function `createSubstrateConfig` around line 58)

- [ ] **Step 1: Write the failing test**

Append to `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`:

```js
describe('createSubstrateConfig seeds finish_group', () => {
  it('paint items default to C (baseboard, coating_type=paint)', () => {
    const cfg = createSubstrateConfig('baseboard');
    expect(cfg.finish_group).toBe('C');
  });
  it('stain_clear items default to D', () => {
    const cfg = createSubstrateConfig('door_frames', { coating_type: 'stain_clear', substrate_state: 'bare_wood' });
    expect(cfg.finish_group).toBe('D');
  });
  it('walls and ceiling do NOT carry finish_group through createSubstrateConfig (driven externally)', () => {
    const walls = createSubstrateConfig('walls');
    const ceiling = createSubstrateConfig('ceiling');
    expect(walls.finish_group).toBeUndefined();
    expect(ceiling.finish_group).toBeUndefined();
  });
  it('explicit override in overrides wins over auto-seed', () => {
    const cfg = createSubstrateConfig('baseboard', { finish_group: 'E' });
    expect(cfg.finish_group).toBe('E');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: FAIL — `finish_group` is `undefined` on baseboard config.

- [ ] **Step 3: Patch createSubstrateConfig**

In `Claude/tools/paintscope/src/state/initial-state.js`, inside `createSubstrateConfig`, AFTER the wood-substrate defaults block (around where `config.system` is inferred), BEFORE `return config`:

```js
  // V1a: seed finish_group for non-wall/ceiling substrates. Walls and ceiling
  // are driven by the combined-finish toggle (written by the adapter / selector
  // layer), not by this factory. Fixed set of IDs is the simplest guard.
  const FINISH_GROUP_EXCLUDED = new Set(['walls', 'ceiling']);
  if (!FINISH_GROUP_EXCLUDED.has(substrateId)) {
    if (config.finish_group === undefined) {
      config.finish_group = defaultFinishGroupForCoatingType(config.coating_type);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS (7 tests total: 3 from Task 1 + 4 from Task 2).

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/state/initial-state.js Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "feat(paintscope): createSubstrateConfig seeds finish_group from coating_type"
```

---

### Task 3: Migration v1.7 — seed finish_group on existing rooms

**Files:**
- Modify: `Claude/tools/paintscope/src/state/migrations.js`

- [ ] **Step 1: Write the failing test**

Append to `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`:

```js
import { migrateInline } from '../../state/migrations.js';

describe('v1.7 migration — finish_group seeding', () => {
  it('seeds finish_group on existing non-wall/ceiling substrates based on coating_type', () => {
    const state = {
      rooms: [{
        id: 'room_1', label: 'R',
        substrates: {
          walls:        { substrate_state: 'bare_drywall' },
          ceiling:      { substrate_state: 'bare_drywall' },
          baseboard:    { substrate_state: 'factory_primed', coating_type: 'paint' },
          door_frames:  { substrate_state: 'bare_wood', coating_type: 'stain_clear' },
        },
        closets: [], openings: [], extra_walls: [], wall_deductions: [],
      }],
      project: {},
      colors: {},
      exterior: { defaults: {} },
    };
    const out = migrateInline(state);
    expect(out.rooms[0].substrates.baseboard.finish_group).toBe('C');
    expect(out.rooms[0].substrates.door_frames.finish_group).toBe('D');
    // walls/ceiling never get finish_group via this migration (driven externally)
    expect(out.rooms[0].substrates.walls.finish_group).toBeUndefined();
    expect(out.rooms[0].substrates.ceiling.finish_group).toBeUndefined();
  });

  it('does NOT overwrite existing finish_group values', () => {
    const state = {
      rooms: [{
        id: 'room_1', label: 'R',
        substrates: {
          baseboard: { substrate_state: 'factory_primed', coating_type: 'paint', finish_group: 'E' },
        },
        closets: [], openings: [], extra_walls: [], wall_deductions: [],
      }],
      project: {},
      colors: {},
      exterior: { defaults: {} },
    };
    const out = migrateInline(state);
    expect(out.rooms[0].substrates.baseboard.finish_group).toBe('E');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: FAIL — baseboard.finish_group is `undefined`.

- [ ] **Step 3: Add v1.7 block to migrateInline**

In `Claude/tools/paintscope/src/state/migrations.js`, add this block INSIDE `migrateInline(parsed)` AFTER the v1.3 stairway migration and BEFORE the v1.0 "Initialize colors state" block (around line 263):

```js
  // v1.7: Seed finish_group on existing non-wall/ceiling substrates based on
  // coating_type. Walls/ceiling are driven by the combined-finish toggle
  // (see context-adapter + resolver) and never get this field via migration.
  const FINISH_GROUP_EXCLUDED = new Set(['walls', 'ceiling']);
  for (const room of parsed.rooms || []) {
    for (const [id, sub] of Object.entries(room.substrates || {})) {
      if (FINISH_GROUP_EXCLUDED.has(id)) continue;
      if (sub.finish_group !== undefined) continue; // don't clobber
      const ct = sub.coating_type;
      if (ct === 'stain_clear' || ct === 'stain_only' || ct === 'clear_only') {
        sub.finish_group = 'D';
      } else {
        sub.finish_group = 'C';
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/state/migrations.js Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "feat(paintscope): v1.7 migration seeds finish_group on existing rooms"
```

---

## Phase 2 — Reducer: coating_type re-seed with manual override preservation

Goal of phase: when the user flips `coating_type`, `finish_group` auto-reseeds to the new default — but ONLY if it's still at the previous coating_type's default. Manual overrides persist.

---

### Task 4: Re-seed logic in SET_SUBSTRATE

**Files:**
- Modify: `Claude/tools/paintscope/src/state/reducer.js` (around line 158 where `SET_SUBSTRATE` handles coating_type side effects)

- [ ] **Step 1: Write the failing test**

Append to `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`:

```js
import { paintScopeReducer } from '../../state/reducer.js';

describe('SET_SUBSTRATE coating_type flip re-seeds finish_group', () => {
  function baseState() {
    return {
      rooms: [{
        id: 'room_1', label: 'R',
        substrates: {
          door_frames: { substrate_state: 'bare_wood', coating_type: 'paint', finish_group: 'C' },
        },
      }],
      project: { default_quality_tier: 'QT3' },
    };
  }

  it('paint (C) → stain_clear reseeds to D', () => {
    const s = baseState();
    const out = paintScopeReducer(s, {
      type: 'SET_SUBSTRATE',
      payload: { roomId: 'room_1', substrateId: 'door_frames', field: 'coating_type', value: 'stain_clear' },
    });
    expect(out.rooms[0].substrates.door_frames.finish_group).toBe('D');
  });

  it('stain_clear (D) → paint reseeds to C', () => {
    const s = baseState();
    s.rooms[0].substrates.door_frames.coating_type = 'stain_clear';
    s.rooms[0].substrates.door_frames.finish_group = 'D';
    const out = paintScopeReducer(s, {
      type: 'SET_SUBSTRATE',
      payload: { roomId: 'room_1', substrateId: 'door_frames', field: 'coating_type', value: 'paint' },
    });
    expect(out.rooms[0].substrates.door_frames.finish_group).toBe('C');
  });

  it('manual override (E) is preserved across coating_type flip', () => {
    const s = baseState();
    s.rooms[0].substrates.door_frames.finish_group = 'E';
    const out = paintScopeReducer(s, {
      type: 'SET_SUBSTRATE',
      payload: { roomId: 'room_1', substrateId: 'door_frames', field: 'coating_type', value: 'stain_clear' },
    });
    expect(out.rooms[0].substrates.door_frames.finish_group).toBe('E');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: FAIL — finish_group remains at its original value after coating_type flip.

- [ ] **Step 3: Patch SET_SUBSTRATE**

In `Claude/tools/paintscope/src/state/reducer.js`, find the existing block in `SET_SUBSTRATE`:

```js
        // When coating_type changes to stain/clear, set coat count defaults from current QT
        if (field === 'coating_type' && value !== 'paint') {
          const qt = updated.quality_tier || state.project.default_quality_tier || 'QT3';
          const d = COAT_DEFAULTS[qt] || COAT_DEFAULTS.QT3;
          updated = { ...updated, ...d };
        }
```

IMMEDIATELY AFTER that block, add:

```js
        // V1a: re-seed finish_group when coating_type flips, but preserve
        // manual overrides. Re-seeds only if current finish_group matches the
        // previous coating_type's default (i.e., the user hasn't manually
        // picked E/F/etc.).
        if (field === 'coating_type') {
          const STAIN_LIKE = new Set(['stain_clear', 'stain_only', 'clear_only']);
          const prevDefault = STAIN_LIKE.has(r.substrates[substrateId].coating_type) ? 'D' : 'C';
          const newDefault  = STAIN_LIKE.has(value) ? 'D' : 'C';
          if (updated.finish_group === prevDefault) {
            updated.finish_group = newDefault;
          }
        }
```

Note: reference `r.substrates[substrateId].coating_type` (the PREVIOUS value before spread) to correctly detect the prior default.

- [ ] **Step 4: Verify reducer export**

Check that the reducer is exported as `paintScopeReducer`. If named differently in the file, update the test import accordingly.

```bash
grep -n "export" Claude/tools/paintscope/src/state/reducer.js | head -5
```

Expected: find the export line, note the name, adjust import in test file if needed.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS (all finish-group tests).

- [ ] **Step 6: Commit**

```bash
git add Claude/tools/paintscope/src/state/reducer.js Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "feat(paintscope): reducer re-seeds finish_group on coating_type flip, preserves manual override"
```

---

## Phase 3 — UI: SubstrateDetailPanel dropdown + RoomEditor summary badge

### Task 5: Add Finish Group `<select>` to SubstrateDetailPanel

**Files:**
- Modify: `Claude/tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx`

- [ ] **Step 1: Add the select component below coating_type**

Find the `<div>` containing the Coating Type select (around line 148-155). IMMEDIATELY AFTER that closing `</div>` (still within the same `form-grid`), add:

```jsx
            {/* V1a: Finish Group — non-wall/ceiling only. A/B reserved for
                walls/ceiling (driven by the combined-finish toggle). */}
            {!['walls', 'ceiling'].includes(substrateId) && config.finish_group !== undefined && (
              <div>
                <div className="field-label" title="Groups items that share a finish pass. Items in the same group get one coordinated setup/cleanup.">
                  Finish Group
                </div>
                <Select
                  options={[
                    { value: 'C', label: 'C' },
                    { value: 'D', label: 'D' },
                    { value: 'E', label: 'E' },
                    { value: 'F', label: 'F' },
                  ]}
                  value={config.finish_group}
                  onChange={v => setSub('finish_group', v)}
                />
              </div>
            )}
```

Placement note: this renders inside the main `form-grid` that also holds Substrate State, Quality Tier, System, Application Method, Texture. It should appear among those fields. If the grid layout looks awkward with an odd number of cells, that's acceptable — the existing grid is `1fr 1fr` and gracefully handles varying cell counts.

- [ ] **Step 2: Start the dev server**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude/tools/paintscope"
npm run dev -- --port 5177
```

Let the dev server start. You should see Vite output with a local URL.

- [ ] **Step 3: Manual verification — use preview tools**

Use `preview_start` (if not already) and navigate to the running dev server. Add a baseboard to a test room, click it to focus, and verify:
- Finish Group dropdown appears below Coating Type
- Default value is `C`
- Changing to `D`/`E`/`F` persists

Use `preview_snapshot` and `preview_click` to drive the interactions. Take a `preview_screenshot` for evidence.

- [ ] **Step 4: Verify walls/ceiling do NOT show the dropdown**

In the preview, add walls + ceiling to the room and focus each. Confirm no Finish Group dropdown appears. Screenshot for evidence.

- [ ] **Step 5: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx
git commit -m "feat(paintscope): Finish Group dropdown in SubstrateDetailPanel"
```

---

### Task 6: Room summary badge in RoomEditor header

**Files:**
- Modify: `Claude/tools/paintscope/src/components/room-editor/RoomEditor.jsx`

- [ ] **Step 1: Compute group-membership summary**

In `Claude/tools/paintscope/src/components/room-editor/RoomEditor.jsx`, inside the `RoomEditor` component function, AFTER the existing tab badge counts (around line 48, after `fixtureCount`), add:

```jsx
  // Finish group membership summary — non-wall/ceiling items grouped by finish_group.
  const finishGroupSummary = (() => {
    const counts = new Map();
    for (const [id, cfg] of Object.entries(subs)) {
      if (id === 'walls' || id === 'ceiling') continue;
      if (!cfg || !cfg.finish_group) continue;
      counts.set(cfg.finish_group, (counts.get(cfg.finish_group) || 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  })();
```

- [ ] **Step 2: Add the badge rendering**

Find the `<div>` that renders the quick stats bar (around line 78-80, the div that wraps `<RoomQuickStats>` and the camera button). IMMEDIATELY AFTER that closing `</div>` (the one that contains RoomQuickStats), BEFORE the tab bar renders, add:

```jsx
      {/* V1a: Finish group summary badge */}
      {finishGroupSummary.length > 0 && (
        <div style={{
          padding: '4px 12px',
          background: 'var(--surface-muted, #f5f5f5)',
          fontSize: 11,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border, #e0e0e0)',
          borderBottom: '1px solid var(--border, #e0e0e0)',
        }}>
          Finish groups:{' '}
          {finishGroupSummary.map(([group, count], i) => (
            <span key={group} style={{ marginRight: 10 }}>
              <strong>{group}</strong> ({count} {count === 1 ? 'item — singleton' : 'items'})
              {i < finishGroupSummary.length - 1 ? ' ·' : ''}
            </span>
          ))}
        </div>
      )}
```

- [ ] **Step 3: Manual verification**

Dev server should still be running (or restart with `npm run dev -- --port 5177`). In the preview:
- Add a room
- Add 3 trim items (baseboard, crown, door_casing) — all should default to `C`
- Verify the badge shows `Finish groups: C (3 items)`
- Move door_casing to `D` via the dropdown
- Verify the badge updates to `C (2 items) · D (1 item — singleton)`

Screenshot for evidence.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/room-editor/RoomEditor.jsx
git commit -m "feat(paintscope): finish group summary badge in RoomEditor header"
```

---

## Phase 4 — Registry + Resolver

### Task 7: Add finish_group_assignment registry entry

**Files:**
- Modify: `Claude/registries/pass_groups.json`

- [ ] **Step 1: Open the registry**

```bash
cat Claude/registries/pass_groups.json
```

Note the existing array shape — an array of `{ group_id, substrates, pass_type, source_types, description }` objects.

- [ ] **Step 2: Add the new entry**

Replace the full contents of `Claude/registries/pass_groups.json` with:

```json
{
  "version": "1.1.0",
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
      "source_types": ["project_flag"],
      "description": "Walls and ceiling finished together in one spray pass. Triggered by project.default_combined_wc_finish or room.combined_wc_finish_override — estimator's consultation call that both substrates will receive the same finish paint. Requires primed substrate state + spray_backroll + matching QT."
    },
    {
      "group_id": "finish_group_assignment",
      "substrates": null,
      "pass_type": "finish",
      "source_types": ["item_assignment"],
      "description": "Dynamic finish group pooling. Engine pools items in a room sharing a finish_group value (A\u2013F, excluding walls/ceiling which are owned by the walls_ceiling_finish_combined group). Trigger: any room containing \u22652 non-wall/ceiling items with the same non-null finish_group. Shared setup/interstage/cleanup dedup to one instance per group; per-member prep and apply fire per-substrate."
    }
  ]
}
```

- [ ] **Step 3: Verify JSON validity**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('Claude/registries/pass_groups.json','utf8')).groups.length)"
```

Expected: `3`.

- [ ] **Step 4: Commit**

```bash
git add Claude/registries/pass_groups.json
git commit -m "feat(paintscope): pass_groups registry v1.1.0 adds finish_group_assignment"
```

---

### Task 8: Implement resolveItemAssignmentGroups

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/pass-groups.js`

- [ ] **Step 1: Write the failing tests**

Append to `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`:

```js
import { resolvePassGroups } from '../pass-groups.js';

describe('resolveItemAssignmentGroups', () => {
  function baseRoom(substrates) {
    return { substrates };
  }

  it('emits a group when 2+ items share finish_group C', () => {
    const room = baseRoom({
      baseboard:   { finish_group: 'C', coating_type: 'paint' },
      door_casing: { finish_group: 'C', coating_type: 'paint' },
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    expect(fgGroups).toHaveLength(1);
    expect(fgGroups[0].substrates.sort()).toEqual(['baseboard', 'door_casing']);
    expect(fgGroups[0].pass_type).toBe('finish');
    expect(fgGroups[0].metadata?.finish_group).toBe('C');
  });

  it('emits TWO groups when items split across C and D', () => {
    const room = baseRoom({
      baseboard:   { finish_group: 'C', coating_type: 'paint' },
      door_casing: { finish_group: 'C', coating_type: 'paint' },
      door_frames: { finish_group: 'D', coating_type: 'stain_clear' },
      window_jamb: { finish_group: 'D', coating_type: 'stain_clear' },
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    expect(fgGroups).toHaveLength(2);
    const cGroup = fgGroups.find(g => g.metadata.finish_group === 'C');
    const dGroup = fgGroups.find(g => g.metadata.finish_group === 'D');
    expect(cGroup.substrates.sort()).toEqual(['baseboard', 'door_casing']);
    expect(dGroup.substrates.sort()).toEqual(['door_frames', 'window_jamb']);
  });

  it('SKIPS singletons (group with only 1 member)', () => {
    const room = baseRoom({
      baseboard:   { finish_group: 'C', coating_type: 'paint' },
      door_casing: { finish_group: 'C', coating_type: 'paint' },
      door_frames: { finish_group: 'D', coating_type: 'stain_clear' },  // singleton
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    expect(fgGroups).toHaveLength(1);
    expect(fgGroups[0].metadata.finish_group).toBe('C');
  });

  it('EXCLUDES walls and ceiling from item-assignment grouping', () => {
    const room = baseRoom({
      walls:       { finish_group: 'A' },
      ceiling:     { finish_group: 'A' },
      baseboard:   { finish_group: 'A', coating_type: 'paint' },
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    // baseboard in A with no other non-wall/ceiling members = singleton, skipped
    expect(fgGroups).toHaveLength(0);
  });

  it('IGNORES items with null or undefined finish_group', () => {
    const room = baseRoom({
      baseboard:   { finish_group: null, coating_type: 'paint' },
      door_casing: { coating_type: 'paint' },  // no finish_group at all
      crown:       { finish_group: 'C', coating_type: 'paint' },
    });
    const groups = resolvePassGroups(room, {}, null);
    const fgGroups = groups.filter(g => g.group_id === 'finish_group_assignment');
    expect(fgGroups).toHaveLength(0);  // only crown has C; singleton
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: FAIL — `resolveItemAssignmentGroups` is not wired into `resolvePassGroups`.

- [ ] **Step 3: Implement resolveItemAssignmentGroups and wire it in**

Open `Claude/tools/paintscope/src/engine/pass-groups.js`. Add the new function AFTER `tryCombinedPrimeGroup` and BEFORE `resolvePrimeMode` (or anywhere at the bottom — pick a spot consistent with existing style):

```js
// Substrates that are never eligible for dynamic item-assignment grouping.
// Walls and ceiling are owned by walls_ceiling_*_combined groups (pre-authored
// pass-groups handle their finish behavior).
const ITEM_ASSIGNMENT_EXCLUDED = new Set(['walls', 'ceiling']);

/**
 * Dynamic pass-group resolution from per-item finish_group values.
 *
 * Collects all non-wall/ceiling substrates in a room by their finish_group,
 * emits one PassGroup per value that has >=2 members. Singletons are skipped.
 *
 * @param {object} room
 * @param {string[]} excludedSubstrates — substrates already claimed by a prior
 *   pass-group (precedence); these are skipped to preserve the "each substrate
 *   in at most one group" invariant.
 * @returns {Array<PassGroup>}
 */
function resolveItemAssignmentGroups(room, excludedSubstrates) {
  if (!room?.substrates) return [];
  const byGroup = new Map();
  for (const [id, cfg] of Object.entries(room.substrates)) {
    if (ITEM_ASSIGNMENT_EXCLUDED.has(id)) continue;
    if (excludedSubstrates?.has(id)) continue;
    const fg = cfg?.finish_group;
    if (!fg) continue;
    if (!byGroup.has(fg)) byGroup.set(fg, []);
    byGroup.get(fg).push(id);
  }
  const groups = [];
  for (const [fg, substrates] of byGroup.entries()) {
    if (substrates.length < 2) continue; // singleton skip
    groups.push({
      group_id: 'finish_group_assignment',
      substrates: substrates.slice().sort(),
      pass_type: 'finish',
      source: 'item_assignment',
      metadata: { finish_group: fg },
    });
  }
  return groups;
}
```

Update `resolvePassGroups` to invoke it after the pre-authored checks:

```js
export function resolvePassGroups(room, project, specData) {
  if (!room || !project) return [];
  const groups = [];

  const primeGroup = tryCombinedPrimeGroup(room, project);
  if (primeGroup) groups.push(primeGroup);

  const finishGroup = tryCombinedFinishGroup(room, project);
  if (finishGroup) groups.push(finishGroup);

  // Track substrates already claimed by pre-authored groups so the dynamic
  // resolver doesn't double-claim them. Walls/ceiling are excluded by default
  // but this defensive collection covers any future pre-authored groups that
  // target other substrates.
  const claimed = new Set();
  for (const g of groups) {
    for (const s of g.substrates) claimed.add(s);
  }

  const itemGroups = resolveItemAssignmentGroups(room, claimed);
  groups.push(...itemGroups);

  return groups;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS (all tests).

- [ ] **Step 5: Run full test suite to ensure no regressions**

```bash
npx vitest run
```

Expected: all tests PASS. If any fail, investigate whether they're pass-groups related and fix.

- [ ] **Step 6: Commit**

```bash
git add Claude/tools/paintscope/src/engine/pass-groups.js Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "feat(paintscope): resolveItemAssignmentGroups dynamic resolver"
```

---

### Task 9: Precedence test — pre-authored + dynamic coexistence

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`

- [ ] **Step 1: Write the precedence test**

Append to the test file:

```js
describe('resolvePassGroups precedence — pre-authored vs dynamic', () => {
  it('both pre-authored walls_ceiling_finish_combined AND dynamic finish_group fire when applicable', () => {
    const room = {
      combined_wc_finish_override: 'combined',
      substrates: {
        walls:       { substrate_state: 'bare_drywall', application_method: 'spray_backroll', quality_tier: 'QT3' },
        ceiling:     { substrate_state: 'bare_drywall', application_method: 'spray_backroll', quality_tier: 'QT3' },
        baseboard:   { finish_group: 'C', coating_type: 'paint' },
        door_casing: { finish_group: 'C', coating_type: 'paint' },
        crown:       { finish_group: 'C', coating_type: 'paint' },
      },
    };
    const project = { default_combined_wc_finish: true };
    const groups = resolvePassGroups(room, project, null);

    const wc = groups.find(g => g.group_id === 'walls_ceiling_finish_combined');
    const fg = groups.find(g => g.group_id === 'finish_group_assignment');

    expect(wc).toBeDefined();
    expect(wc.substrates.sort()).toEqual(['ceiling', 'walls']);

    expect(fg).toBeDefined();
    expect(fg.substrates.sort()).toEqual(['baseboard', 'crown', 'door_casing']);
    // Walls and ceiling must NOT appear in the dynamic group
    expect(fg.substrates).not.toContain('walls');
    expect(fg.substrates).not.toContain('ceiling');
  });
});
```

- [ ] **Step 2: Run and expect PASS**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS (precedence already handled by the `claimed` Set in Task 8).

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "test(paintscope): precedence test — pre-authored and dynamic coexist"
```

---

## Phase 5 — Context adapter integration

Goal of phase: adapter emits group-level input per finish_group pass-group AND sets `pass_group_id` on per-member inputs for grouped substrates (so their setup/interstage/cleanup tasks gate off via applies_when in Phase 7).

---

### Task 10: Adapter emits pass_group_id on per-member inputs

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/context-adapter.js`

- [ ] **Step 1: Locate the per-substrate spec iteration loop**

Open `Claude/tools/paintscope/src/engine/context-adapter.js`. Find the main room loop where `roomInputs` is built — specifically the block that iterates per-substrate specs and pushes `{ roomIndex, roomLabel, specId, ctx, roomQty, roomItems }` (near line 716).

Find the pre-existing logic that exits early for substrates claimed by a pass group (the one that handles walls_ceiling_*_combined). It should look similar to:

```js
// Skip substrates already claimed by a pass group (their finish is
// handled by the combined scenario, not the per-substrate scenario).
if (groupedSubstrates.has(substrateKey)) continue;
```

- [ ] **Step 2: Modify behavior to set pass_group_id on members (NOT skip them)**

The V1a approach differs from combined-prime: finish_group MEMBERS still run their per-substrate scenarios (for prep + apply), but with `pass_group_id` set so their setup/interstage/cleanup tasks gate off. Only the group-level shared scenario handles setup/interstage/cleanup.

Locate where `groupedSubstrates` is built from `passGroups`. Currently it likely collects ALL group substrates into one Set. Change the logic to distinguish:
- Substrates in a `walls_ceiling_*` pass-group → SKIP per-substrate emit (existing behavior)
- Substrates in a `finish_group_assignment` pass-group → DO emit per-substrate, but ADD pass_group_id + pass_group_substrates + pass_type to their ctx

Replace (or add near) the existing groupedSubstrates construction with:

```js
    // Pre-authored pass-groups (walls_ceiling_*) suppress per-substrate
    // firing entirely. Dynamic finish_group_assignment members DO still fire
    // per-substrate (for prep + apply) but with pass_group_id set so their
    // setup/interstage/cleanup tasks gate off via applies_when.
    const suppressedSubstrates = new Set();
    const memberToGroup = new Map(); // substrateKey -> PassGroup
    for (const pg of passGroups) {
      if (pg.group_id === 'finish_group_assignment') {
        for (const s of pg.substrates) memberToGroup.set(s, pg);
      } else {
        for (const s of pg.substrates) suppressedSubstrates.add(s);
      }
    }
```

Then, in the per-substrate iteration, use `suppressedSubstrates` (not `groupedSubstrates`) to decide skip, and use `memberToGroup` to decorate the ctx:

```js
      if (suppressedSubstrates.has(substrateKey)) continue;

      // ... existing ctx construction ...

      // V1a: if this substrate is a finish_group_assignment member, thread
      // pass-group context so gate-based tasks (setup/interstage/cleanup)
      // skip for this input.
      const memberGroup = memberToGroup.get(substrateKey);
      if (memberGroup) {
        ctx.pass_group_id = memberGroup.group_id;
        ctx.pass_group_substrates = memberGroup.substrates.slice();
        ctx.pass_type = memberGroup.pass_type;
        ctx.finish_group = memberGroup.metadata.finish_group;
      }
```

Note: the existing `normalizePassGroupCtx(ctx)` call at push time will correctly pass through the set values (only fills in nulls for undefined).

If the existing `groupedSubstrates` variable is still referenced elsewhere in the function, rename it consistently to `suppressedSubstrates` or update references as needed.

- [ ] **Step 3: Write integration test**

Append to `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`:

```js
import { buildScenarioInputs } from '../context-adapter.js';

describe('adapter integration — finish_group threading', () => {
  it('per-member inputs receive pass_group_id=finish_group_assignment and finish_group value', () => {
    const state = {
      rooms: [{
        id: 'room_1', label: 'R',
        length_ft: 12, width_ft: 10, height_ft: 8,
        substrates: {
          walls:       { substrate_state: 'bare_drywall', application_method: 'spray_backroll' },
          ceiling:     { substrate_state: 'bare_drywall', application_method: 'spray_backroll' },
          baseboard:   { substrate_state: 'factory_primed', coating_type: 'paint', finish_group: 'C' },
          door_casing: { substrate_state: 'factory_primed', coating_type: 'paint', finish_group: 'C', painting: true },
        },
        closets: [], openings: [], extra_walls: [], wall_deductions: [], fixtures: {},
      }],
      project: { default_quality_tier: 'QT3', default_combined_wc_finish: false },
      colors: {},
      exterior: { defaults: {} },
      ui: {},
    };
    const db = { specFamilies: [] }; // minimal stub

    const out = buildScenarioInputs(state, db);
    const memberInputs = out.roomInputs.filter(i =>
      i.ctx.pass_group_id === 'finish_group_assignment'
    );
    // Both trim members should carry pass-group context
    expect(memberInputs.length).toBeGreaterThanOrEqual(2);
    for (const mi of memberInputs) {
      expect(mi.ctx.finish_group).toBe('C');
      expect(mi.ctx.pass_group_substrates.sort()).toEqual(['baseboard', 'door_casing']);
    }
  });
});
```

Note: `buildScenarioInputs` requires a valid db — use a minimal stub or mock. If the integration test proves too heavy, gate it or convert to a unit-level test of the adapter's group-threading helper. Plan budget for 30 min debugging integration plumbing.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS. Debug failures by inspecting adapter output.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/engine/context-adapter.js Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "feat(paintscope): adapter threads pass_group_id on finish_group members"
```

---

### Task 11: Adapter emits group-level input per finish_group pass-group

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/context-adapter.js`

- [ ] **Step 1: Build helper for item-assignment group ctx**

In `Claude/tools/paintscope/src/engine/context-adapter.js`, NEAR the existing `buildGroupCtx` function (around line 53), add a new helper:

```js
// Build ctx for a finish_group_assignment GROUP-LEVEL input. The group-level
// input matches the generic SCN_COMBINED_FINISH_GROUP_V1A scenario which fires
// shared setup/interstage/cleanup modules once per group.
//
// Unlike walls+ceiling (which have homogeneous substrate dimensions), finish
// groups can contain heterogeneous members (different QTs, methods, substrate
// states). The group-level ctx uses representative values from the first
// member; per-member ctxs retain their own dimensions.
function buildItemGroupCtx(group, room, project, roomDerived) {
  const firstSubKey = group.substrates[0];
  const firstSub = room.substrates[firstSubKey];
  const ctx = {
    quality_tier:       firstSub?.quality_tier || room.quality_tier || project.default_quality_tier || 'QT3',
    application_method: firstSub?.application_method || project.default_application_method || 'brush',
    substrate_state:    null, // no single state for a mixed group
    complexity:         room.complexity || project.default_complexity || 'STD',
    height_band:        roomDerived?.heightBand || 'STD',
    texture:            null,
    pass_group_id:         group.group_id,
    pass_group_substrates: group.substrates.slice(),
    pass_type:             group.pass_type,
    finish_group:          group.metadata.finish_group,
    paintable_item:        null,
    sheen:                 firstSub?.sheen || project.default_sheen || 'satin',
    coating_type:          firstSub?.coating_type || 'paint',
  };
  return ctx;
}
```

- [ ] **Step 2: Emit group-level input in the room loop**

Find the block in the main room loop where `passGroups` is iterated to emit group-level inputs for walls+ceiling (look for existing `buildGroupCtx` usage and the `roomInputs.push(...)` that uses it — around the pre-authored group emission point). IMMEDIATELY AFTER that block, add:

```js
    // V1a: emit group-level inputs for finish_group_assignment pass-groups.
    // These match SCN_COMBINED_FINISH_GROUP_V1A which fires shared
    // setup/interstage/cleanup modules. Per-member inputs (emitted in the
    // substrate loop below) carry pass_group_id so their own
    // setup/interstage/cleanup tasks skip via applies_when.
    for (const pg of passGroups) {
      if (pg.group_id !== 'finish_group_assignment') continue;
      const groupCtx = buildItemGroupCtx(pg, room, project, roomDerived);
      roomInputs.push({
        roomIndex: ri,
        roomLabel,
        specId: null, // no per-substrate spec — scenario matches on pass_group_id
        ctx: normalizePassGroupCtx(groupCtx),
        roomQty,
        roomItems,
      });
    }
```

- [ ] **Step 3: Test**

Extend the integration test in `finish-group.test.js`:

```js
describe('adapter emits group-level input for finish_group_assignment', () => {
  it('one input per finish group with pass_group_id set and null paintable_item', () => {
    const state = {
      rooms: [{
        id: 'room_1', label: 'R',
        length_ft: 12, width_ft: 10, height_ft: 8,
        substrates: {
          baseboard:   { substrate_state: 'factory_primed', coating_type: 'paint', finish_group: 'C' },
          door_casing: { substrate_state: 'factory_primed', coating_type: 'paint', finish_group: 'C', painting: true },
          door_frames: { substrate_state: 'bare_wood', coating_type: 'stain_clear', finish_group: 'D' },
          window_jamb: { substrate_state: 'bare_wood', coating_type: 'stain_clear', finish_group: 'D' },
        },
        closets: [], openings: [], extra_walls: [], wall_deductions: [], fixtures: {},
      }],
      project: { default_quality_tier: 'QT3' },
      colors: {},
      exterior: { defaults: {} },
      ui: {},
    };
    const db = { specFamilies: [] };
    const out = buildScenarioInputs(state, db);
    const groupInputs = out.roomInputs.filter(i =>
      i.ctx.pass_group_id === 'finish_group_assignment' && i.ctx.paintable_item === null
    );
    expect(groupInputs).toHaveLength(2); // one for C, one for D
    const cInput = groupInputs.find(i => i.ctx.finish_group === 'C');
    const dInput = groupInputs.find(i => i.ctx.finish_group === 'D');
    expect(cInput.ctx.pass_group_substrates.sort()).toEqual(['baseboard', 'door_casing']);
    expect(dInput.ctx.pass_group_substrates.sort()).toEqual(['door_frames', 'window_jamb']);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/engine/context-adapter.js Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "feat(paintscope): adapter emits group-level input per finish_group"
```

---

## Phase 6 — Shared scenario + modules

Goal of phase: create the generic `SCN_COMBINED_FINISH_GROUP_V1A` scenario and the 3 shared modules it references. This is what the group-level input matches.

---

### Task 12: Author MOD_SETUP_FINISH_GROUP module

**Files:**
- Create: `Claude/modules/MOD_SETUP_FINISH_GROUP.json`

- [ ] **Step 1: Review an existing setup module for structure**

```bash
ls Claude/modules/MOD_SETUP*.json | head -5
cat Claude/modules/MOD_SETUP_COMBINED_WC_FINISH.json 2>/dev/null | head -30
```

Note the JSON shape: `module_id`, `phase`, `tasks` (array of `{ task_ref, ... }`), `modifier_eligibility` object.

- [ ] **Step 2: Write the module**

Create `Claude/modules/MOD_SETUP_FINISH_GROUP.json`:

```json
{
  "module_id": "MOD_SETUP_FINISH_GROUP",
  "name": "Shared Setup — Finish Group",
  "phase": "setup",
  "description": "Shared setup tasks for a finish group pass: floor protection install, fixture covers, mask perimeter. Fires once per group regardless of member count.",
  "tasks": [
    { "task_ref": "TSK_SETUP_FLOOR_PROTECT_INSTALL" },
    { "task_ref": "TSK_SETUP_FIXTURE_COVERS_INSTALL" },
    { "task_ref": "TSK_SETUP_MASK_PERIMETER_BASE" }
  ],
  "modifier_eligibility": {
    "FAC_HEIGHT": true,
    "FAC_ROOM_COMPLEXITY": true
  }
}
```

Verify each `task_ref` exists in `Claude/tasks/`:

```bash
ls Claude/tasks/TSK_SETUP_FLOOR_PROTECT_INSTALL.json Claude/tasks/TSK_SETUP_FIXTURE_COVERS_INSTALL.json Claude/tasks/TSK_SETUP_MASK_PERIMETER_BASE.json 2>&1
```

If any don't exist, substitute the closest equivalent from `Claude/tasks/` that matches "setup + floor protect" / "setup + fixture covers" / "setup + mask perimeter" semantics. Update the task_ref values to the actual filenames (without `.json` extension).

- [ ] **Step 3: Commit**

```bash
git add Claude/modules/MOD_SETUP_FINISH_GROUP.json
git commit -m "feat(paintscope): MOD_SETUP_FINISH_GROUP shared setup module"
```

---

### Task 13: Author MOD_INTERSTAGE_FINISH_GROUP module

**Files:**
- Create: `Claude/modules/MOD_INTERSTAGE_FINISH_GROUP.json`

- [ ] **Step 1: Write the module**

Create `Claude/modules/MOD_INTERSTAGE_FINISH_GROUP.json`:

```json
{
  "module_id": "MOD_INTERSTAGE_FINISH_GROUP",
  "name": "Shared Interstage — Finish Group",
  "phase": "interstage",
  "description": "Shared between-coat tasks: drying/curing hold + light inspection. Fires once per group.",
  "tasks": [
    { "task_ref": "TSK_INTERSTAGE_INSPECT" }
  ],
  "modifier_eligibility": {}
}
```

Verify `TSK_INTERSTAGE_INSPECT` exists. If not, substitute closest equivalent (`TSK_INTERSTAGE_DRY_HOLD` or similar).

- [ ] **Step 2: Commit**

```bash
git add Claude/modules/MOD_INTERSTAGE_FINISH_GROUP.json
git commit -m "feat(paintscope): MOD_INTERSTAGE_FINISH_GROUP shared interstage module"
```

---

### Task 14: Author MOD_CLEANUP_FINISH_GROUP module

**Files:**
- Create: `Claude/modules/MOD_CLEANUP_FINISH_GROUP.json`

- [ ] **Step 1: Write the module**

Create `Claude/modules/MOD_CLEANUP_FINISH_GROUP.json`:

```json
{
  "module_id": "MOD_CLEANUP_FINISH_GROUP",
  "name": "Shared Cleanup — Finish Group",
  "phase": "cleanup",
  "description": "Shared cleanup tasks for a finish group pass: equipment teardown, protection removal, trash out. Fires once per group.",
  "tasks": [
    { "task_ref": "TSK_CLEANUP_EQUIPMENT_TEARDOWN" },
    { "task_ref": "TSK_CLEANUP_PROTECTION_REMOVE" },
    { "task_ref": "TSK_CLEANUP_TRASH_OUT" }
  ],
  "modifier_eligibility": {
    "FAC_ROOM_COMPLEXITY": true
  }
}
```

Verify each task_ref. Substitute closest equivalents if any are missing.

- [ ] **Step 2: Commit**

```bash
git add Claude/modules/MOD_CLEANUP_FINISH_GROUP.json
git commit -m "feat(paintscope): MOD_CLEANUP_FINISH_GROUP shared cleanup module"
```

---

### Task 15: Author SCN_COMBINED_FINISH_GROUP_V1A scenario

**Files:**
- Create: `Claude/scenarios/SCN_COMBINED_FINISH_GROUP_V1A.json`

- [ ] **Step 1: Write the scenario**

Create `Claude/scenarios/SCN_COMBINED_FINISH_GROUP_V1A.json`:

```json
{
  "scenario_id": "SCN_COMBINED_FINISH_GROUP_V1A",
  "name": "Generic Combined Finish Group (V1a) — shared tasks",
  "domain": "interior",
  "context": "NC",
  "pass_type": "finish",
  "matches": {
    "pass_group_id": "finish_group_assignment"
  },
  "modules": [
    "MOD_SETUP_FINISH_GROUP",
    "MOD_INTERSTAGE_FINISH_GROUP",
    "MOD_CLEANUP_FINISH_GROUP"
  ],
  "coat_counts": {
    "prime_coats": 0,
    "finish_coats": 0,
    "interstage_cycles": 1
  },
  "material_systems": [],
  "output_state": "SS_PAINTED_FINISH_GROUP"
}
```

Note: no apply module — apply fires through per-member inputs matching their per-substrate scenarios.

- [ ] **Step 2: Verify scenario loads in bundle**

Regenerate the scenario bundle:

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
node Claude/scripts/generate-scenario-bundle.mjs 2>&1 | tail -10
```

Look for the new scenario in the generated bundle. Expected: no errors; scenario count +1 from prior build.

If the generate script uses a different name, run `ls Claude/scripts/ | grep -i bundle` to find it.

- [ ] **Step 3: Commit**

```bash
git add Claude/scenarios/SCN_COMBINED_FINISH_GROUP_V1A.json Claude/tools/paintscope/src/data/scenario-bundle.js
git commit -m "feat(paintscope): SCN_COMBINED_FINISH_GROUP_V1A shared scenario + bundle rebuild"
```

---

## Phase 7 — Applies_when gates on per-substrate finish modules

Goal of phase: per-substrate finish-phase setup/interstage/cleanup tasks skip when the substrate's input carries `pass_group_id`. Scoped to trim-family substrates for V1a; non-trim substrates are flagged as V1b.

**V1a trim-family substrate scope:** `baseboard`, `crown`, `door_casing`, `door_frame`, `window_casing`, `window_jamb`, `chair_rail`, `shoe_mold`, `wainscot_cap`, `picture_rail`, `window_stool`, `window_apron`, `shadow_box`, `panel_mold`.

---

### Task 16: Find finish-phase setup/interstage/cleanup tasks in trim modules

**Files:**
- Read-only: `Claude/modules/MOD_*_FINISH_*.json` and related

- [ ] **Step 1: List candidate modules**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
ls Claude/modules/ | grep -E "MOD_(SETUP|INTERSTAGE|CLEANUP)_" | sort
```

Capture the list.

- [ ] **Step 2: Identify which are trim-family finish-phase**

Cross-reference by reading each scenario in `Claude/scenarios/` that matches trim-family `paintable_item` values (`baseboard`, `crown`, `door_casing`, `door_frame`, `window_casing`, `window_jamb`, `trim`, etc.) and noting which setup/interstage/cleanup modules they reference.

```bash
for scn in Claude/scenarios/SCN_TRIM_*.json Claude/scenarios/SCN_BASEBOARD_*.json Claude/scenarios/SCN_CROWN_*.json Claude/scenarios/SCN_DOOR_FRAME_*.json Claude/scenarios/SCN_DOOR_CASING_*.json Claude/scenarios/SCN_WINDOW_CASING_*.json Claude/scenarios/SCN_WINDOW_JAMB_*.json; do
  [ -f "$scn" ] && echo "=== $scn ===" && grep -oE '"MOD_[A-Z_]+"' "$scn" | sort -u
done 2>&1 | tee /tmp/trim-modules.txt
```

Build the list of unique modules referenced. Save to a scratch note.

- [ ] **Step 3: Commit exploration notes if any**

If the list is substantial, write a short note:

```bash
echo "Trim-family finish-phase modules needing gates:" > /tmp/finish-gate-targets.txt
grep -oE 'MOD_[A-Z_]+' /tmp/trim-modules.txt | sort -u >> /tmp/finish-gate-targets.txt
```

(No commit needed — this is exploration only. Proceed to Task 17 with the target list in hand.)

---

### Task 17: Add applies_when gates to trim setup/interstage/cleanup tasks

**Files:**
- Modify: each trim-family finish-phase setup/interstage/cleanup MODULE JSON file identified in Task 16

- [ ] **Step 1: For each target module, add gate to each task**

Example — if `MOD_SETUP_BASEBOARD_FINISH.json` has:

```json
{
  "module_id": "MOD_SETUP_BASEBOARD_FINISH",
  "phase": "setup",
  "tasks": [
    { "task_ref": "TSK_SETUP_FLOOR_PROTECT_INSTALL" },
    { "task_ref": "TSK_SETUP_MASK_BASEBOARD_EDGE" }
  ]
}
```

Transform to:

```json
{
  "module_id": "MOD_SETUP_BASEBOARD_FINISH",
  "phase": "setup",
  "tasks": [
    { "task_ref": "TSK_SETUP_FLOOR_PROTECT_INSTALL", "applies_when": { "pass_group_id": [null] } },
    { "task_ref": "TSK_SETUP_MASK_BASEBOARD_EDGE", "applies_when": { "pass_group_id": [null] } }
  ]
}
```

The `applies_when: { pass_group_id: [null] }` gate uses the existing eligibility mechanism (already wired for combined-prime). When a substrate is a finish_group member, its ctx has `pass_group_id: 'finish_group_assignment'`, so the gate fails and the task skips.

Repeat for each target module (expected ~15–25 modules based on trim-family coverage).

- [ ] **Step 2: Regenerate scenario bundle**

```bash
node Claude/scripts/generate-scenario-bundle.mjs 2>&1 | tail -10
```

Expected: bundle rebuilds, no errors.

- [ ] **Step 3: Run the full test suite**

```bash
cd Claude/tools/paintscope
npx vitest run
```

Expected: all tests PASS. If regression-test suites (pass-groups, cabinet smoke, stair smoke, closet smoke) fail, investigate whether the gate inadvertently affects non-finish-group scenarios. The gate should be transparent when `pass_group_id` is `null` (which it is for ungrouped inputs per `normalizePassGroupCtx`).

- [ ] **Step 4: Commit**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git add Claude/modules/ Claude/tools/paintscope/src/data/scenario-bundle.js
git commit -m "feat(paintscope): applies_when gates on trim-family finish setup/interstage/cleanup"
```

---

## Phase 8 — Mismatch warning

### Task 18: Log coating_type / application_method mismatch in group

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/pass-groups.js`

- [ ] **Step 1: Write the failing test**

Append to `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`:

```js
describe('mismatch warning', () => {
  it('warns when a group has mixed coating_type', () => {
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);
    try {
      const room = {
        substrates: {
          baseboard:   { finish_group: 'C', coating_type: 'paint', application_method: 'spray' },
          door_frames: { finish_group: 'C', coating_type: 'stain_clear', application_method: 'spray' },
        },
      };
      resolvePassGroups(room, {}, null);
      expect(warnings.some(w => /mixed coating_type/.test(w))).toBe(true);
    } finally {
      console.warn = origWarn;
    }
  });

  it('warns when a group has mixed application_method', () => {
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);
    try {
      const room = {
        substrates: {
          baseboard:   { finish_group: 'C', coating_type: 'paint', application_method: 'brush' },
          door_casing: { finish_group: 'C', coating_type: 'paint', application_method: 'spray' },
        },
      };
      resolvePassGroups(room, {}, null);
      expect(warnings.some(w => /mixed application_method/.test(w))).toBe(true);
    } finally {
      console.warn = origWarn;
    }
  });

  it('does NOT warn when group members agree', () => {
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);
    try {
      const room = {
        substrates: {
          baseboard:   { finish_group: 'C', coating_type: 'paint', application_method: 'spray' },
          door_casing: { finish_group: 'C', coating_type: 'paint', application_method: 'spray' },
        },
      };
      resolvePassGroups(room, {}, null);
      expect(warnings.filter(w => /mixed/.test(w))).toEqual([]);
    } finally {
      console.warn = origWarn;
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: FAIL — no warning emitted.

- [ ] **Step 3: Add mismatch check in resolveItemAssignmentGroups**

Modify `resolveItemAssignmentGroups` in `Claude/tools/paintscope/src/engine/pass-groups.js`. At the point where `substrates.length < 2` skip happens, ADD a mismatch check that runs ONLY for groups with >=2 members:

```js
  const groups = [];
  for (const [fg, substrates] of byGroup.entries()) {
    if (substrates.length < 2) continue; // singleton skip

    // V1a: warn (but still pool) on coating_type / application_method mismatches.
    const coatingTypes = new Set();
    const methods = new Set();
    for (const s of substrates) {
      const cfg = room.substrates[s];
      coatingTypes.add(cfg?.coating_type || 'paint');
      if (cfg?.application_method) methods.add(cfg.application_method);
    }
    if (coatingTypes.size > 1) {
      console.warn(`[finish-group] Warning: group ${fg} has mixed coating_type (${[...coatingTypes].join(', ')}) — likely authoring mistake; pooling anyway.`);
    }
    if (methods.size > 1) {
      console.warn(`[finish-group] Warning: group ${fg} has mixed application_method (${[...methods].join(', ')}) — likely authoring mistake; pooling anyway.`);
    }

    groups.push({
      group_id: 'finish_group_assignment',
      substrates: substrates.slice().sort(),
      pass_type: 'finish',
      source: 'item_assignment',
      metadata: { finish_group: fg },
    });
  }
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run src/engine/__tests__/finish-group.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/engine/pass-groups.js Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js
git commit -m "feat(paintscope): finish-group mismatch warning for coating_type and application_method"
```

---

## Phase 9 — HIL verification

### Task 19: McLeod regression — baseline stays at 507.43h

**Files:**
- Read-only: McLeod project fixture

- [ ] **Step 1: Identify the McLeod project fixture**

```bash
find Claude/tools/paintscope/test-projects/ -iname "*mcleod*" -type d 2>&1 | head -5
```

Or check `Claude/tools/paintscope/src/data/` for an embedded fixture.

- [ ] **Step 2: Run the estimate**

Start dev server, load McLeod project (or run the estimate via a test harness if one exists). Export the estimate and note the total hours.

Expected total: 507.43h (the baseline documented in `project_module_architecture_next_session.md`).

- [ ] **Step 3: If hours differ, investigate**

If the total has changed, walk back through the changes:
- Did the mismatch warning itself affect pooling? (No — it's a console log only.)
- Did the applies_when gates in Task 17 affect a McLeod substrate that's not in a finish group? (They shouldn't — `pass_group_id` is `null` for ungrouped members.)
- Is the new SCN_COMBINED_FINISH_GROUP_V1A firing on rooms that don't have finish groups? (It shouldn't — its `matches.pass_group_id` is `finish_group_assignment` which is only set when a group exists.)

Iterate: find root cause, fix, re-test.

- [ ] **Step 4: Record baseline confirmation**

Write a one-line note in the HIL log (create file `Claude/docs/superpowers/hil/2026-04-22-finish-groups-v1a-hil.md` if not existing):

```markdown
## McLeod regression

- **Before V1a changes:** 507.43h
- **After V1a changes:** <record>
- **Expected:** 507.43h (no finish groups active in McLeod — 0 trim items with manual finish_group assignments yet)
- **Status:** ✅ MATCHES / ❌ DIVERGES (<delta> — <reason>)
```

- [ ] **Step 5: Commit HIL log**

```bash
git add Claude/docs/superpowers/hil/2026-04-22-finish-groups-v1a-hil.md
git commit -m "docs(paintscope): HIL log — McLeod regression baseline for finish groups V1a"
```

---

### Task 20: Stain-package scenario — manual test

**Files:**
- Create: `Claude/tools/paintscope/test-projects/coverage-kit/room-19-stain-package.json` (or add to existing fixture)

- [ ] **Step 1: Create a stain-package room fixture**

Add a new test room (or modify an existing coverage-kit room) that contains:
- door_frames with coating_type=stain_clear, finish_group=D
- stairway (or mantel/beam if present in the schema) with coating_type=stain_clear, finish_group=D
- Plus a few paint-finish trim items (baseboard, crown) with finish_group=C for contrast

If adding to the coverage kit, follow the existing pattern in `Claude/tools/paintscope/test-projects/coverage-kit/`.

- [ ] **Step 2: Run estimate in dev server**

Start dev server, load the fixture, navigate to the estimate. Observe:
- Finish group summary badge shows `C (2 items) · D (2 items)`
- Estimate has 2 finish-group line items (one for C, one for D) with shared setup/interstage/cleanup
- Per-member prep + apply tasks visible under each group line item
- Total hours: should be LOWER than a non-grouped equivalent because setup/interstage/cleanup now dedup. Quantify the savings.

Screenshot for evidence. Use `preview_screenshot` and `preview_snapshot`.

- [ ] **Step 3: Record in HIL log**

Append to the HIL log:

```markdown
## Stain-package smoke test

- **Fixture:** room-19-stain-package (describe what's in it)
- **Group C (paint):** baseboard + crown — X hours total
- **Group D (stain):** door_frames + mantel — Y hours total
- **Without finish_group (hypothetical per-substrate):** Z hours total
- **Savings from grouping:** (Z - X - Y) hours
- **Status:** ✅ Shared setup/interstage/cleanup appear once per group / ❌ <describe issue>
```

- [ ] **Step 4: Commit fixture + log update**

```bash
git add Claude/tools/paintscope/test-projects/ Claude/docs/superpowers/hil/2026-04-22-finish-groups-v1a-hil.md
git commit -m "test(paintscope): stain-package fixture + HIL verification for finish groups V1a"
```

---

## Phase 10 — Bundle rebuild + final smoke

### Task 21: Rebuild scenario bundle for Phase 7 gate changes

**Files:**
- Regenerate: `Claude/tools/paintscope/src/data/scenario-bundle.js`

- [ ] **Step 1: Run the bundle generator**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
node Claude/scripts/generate-scenario-bundle.mjs 2>&1 | tail -20
```

Expected: bundle regenerates cleanly. Capture the scenario + module counts from the output.

- [ ] **Step 2: Run the full Vitest suite**

```bash
cd Claude/tools/paintscope
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 3: Commit any residual bundle diffs**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha"
git status
git diff Claude/tools/paintscope/src/data/scenario-bundle.js | head -20
git add Claude/tools/paintscope/src/data/scenario-bundle.js
git commit -m "chore(paintscope): final bundle rebuild for finish groups V1a"
```

(Skip if no diff — the bundle is already committed in Task 15 / Task 17.)

---

### Task 22: Memory doc update

**Files:**
- Modify: `C:/Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_module_architecture_next_session.md`

- [ ] **Step 1: Update the next-session doc**

Append a new section to the memory file:

```markdown
## 2026-04-22 — Finish Groups V1a shipped

- Spec: `Claude/docs/superpowers/specs/2026-04-22-finish-groups-v1a-design.md`
- Plan: `Claude/docs/superpowers/plans/2026-04-22-finish-groups-v1a.md`
- Status: implementation complete, McLeod baseline preserved at 507.43h, stain-package smoke passing
- Palette: fixed 4 user-visible slots (C/D/E/F); A/B reserved for walls/ceiling (data-only, toggle-driven)
- Architecturally unified (field on every item incl. walls/ceiling); visually parallel (UI dropdown non-wall/ceiling only)
- Trim-family substrates (14) have applies_when gates for setup/interstage/cleanup dedup
- Known V1a limitation: non-trim substrates (builtins, stairway, wood_wall, wood_ceiling, wainscoting, beams, columns, mantels) lack the gates — putting them in a finish_group double-counts setup/interstage/cleanup. Documented, V1b work.

### What's next after V1a

A. Extend gates to non-trim substrates (V1b, ~1-2 days)
B. Rate bumps on combined apply — needs painter data
C. Edge/boundary cut-in or masking cost between adjacent items in different groups (adjacency table — door_casing↔door_frame is the primary pair)
D. Color phase transition cost (flat modifier)
E. Project-wide group registry + Colors tab + Materials section binding
F. Accent walls (requires walls-substrate splitting — separate architecture)
```

- [ ] **Step 2: No commit**

Memory files live in the user's home, not the repo — no git action. Just save the file.

---

## Self-Review Checklist

Run this yourself after writing all tasks.

**Spec coverage:**
- [ ] §3 "in scope" bullets all have tasks (field, palette, defaults, seeding, migration, registry entry, resolver, adapter, UI dropdown, summary badge, mismatch warning, singleton skip, tests, HIL)
- [ ] §5 data model table (walls/ceiling finish_group driven by toggle) — threaded through Task 3 migration skip, Task 2 createSubstrateConfig skip, and Task 10 excluded-substrates logic
- [ ] §6 default seeding rule (paint→C, stain_clear→D, re-seed only from prev default) — Tasks 1, 2, 4
- [ ] §7 UI (dropdown below coating_type for non-wall/ceiling + room summary badge) — Tasks 5, 6
- [ ] §8 phase-aware pooling (setup/interstage/cleanup dedup, prep per member, apply pool) — Tasks 7 (registry), 8 (resolver), 10-11 (adapter), 12-15 (shared scenario/modules), 17 (gates)
- [ ] §9 mismatch safeguard — Task 18
- [ ] §10 pre-authored coexistence — Task 9 precedence test, Task 10 precedence in adapter
- [ ] §11 testing strategy — unit tests across Tasks 1-18; HIL in Tasks 19-20

**Placeholder scan:**
- [ ] No "TBD", "TODO", "implement later", "similar to task N", "add appropriate error handling" in any task
- [ ] Every step has the actual content an engineer needs (exact file paths, complete code, exact commands)

**Type / name consistency:**
- [ ] `defaultFinishGroupForCoatingType` (helper name) used consistently across Tasks 1, 2, 3
- [ ] `finish_group_assignment` (group_id) used consistently across Tasks 7, 8, 9, 10, 11, 15
- [ ] `MOD_SETUP_FINISH_GROUP` / `MOD_INTERSTAGE_FINISH_GROUP` / `MOD_CLEANUP_FINISH_GROUP` module IDs match across Tasks 12-15
- [ ] `SCN_COMBINED_FINISH_GROUP_V1A` scenario ID used consistently across Tasks 15 and 10-11 (matching scenario)

---

## Execution Handoff

Plan complete and saved to [Claude/docs/superpowers/plans/2026-04-22-finish-groups-v1a.md](../plans/2026-04-22-finish-groups-v1a.md). Two execution options:

**1. Subagent-Driven (recommended for a plan this size)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for the module/JSON authoring tasks (Phases 6 and 7) where scope is well-defined per task.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Best if you want to be more hands-on with the engine and adapter changes in Phases 4–5, which have more integration surface and benefit from closer feedback.

Which approach?

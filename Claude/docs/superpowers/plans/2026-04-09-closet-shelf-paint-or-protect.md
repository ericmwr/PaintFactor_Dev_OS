# Closet Shelving — Paint or Protect Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-closet paint vs. don't-paint toggle for shelving. When set to don't-paint, the engine suppresses the SF_CLOSET_SHELF_NC paint spec, adds masking setup/teardown tasks, and adds an obstruction time penalty to closet wall/ceiling/baseboard work.

**Architecture:** Mirror two existing patterns: (1) the `.painting` flag on doors/windows/casing — substrate stays present for geometry, a boolean controls paint-spec activation — and (2) the `fixture-protection.js` resolver pattern — emit standalone setup/teardown/obstruction task entries that get merged into the room's task list at the end of the estimate pipeline. New data table for per-shelving-type defaults, new resolver file in the engine, surgical UI extension in ClosetsTab.

**Tech Stack:** React 19, plain JSX, useReducer state management, Vite HMR for live reload (port 5177)

**Spec:** `Claude/docs/superpowers/specs/2026-04-09-closet-shelf-paint-or-protect-design.md`

**Notes:**
- Per project instruction (2026-04-09), edits go in the main checkout, NOT the elastic-galileo worktree.
- Per the spec, no new unit tests in this pass — verification is via `npx vite build` after each task plus a final manual browser walkthrough at the end.
- Dev server: `cd Claude/tools/paintscope && npm run dev -- --port 5177` then open `localhost:5177`.

---

### Task 1: Create the closet shelving protection data file

**Files:**
- Create: `Claude/tools/paintscope/src/data/closet-shelving-protection.js`

- [ ] **Step 1: Create the new data file**

Create `Claude/tools/paintscope/src/data/closet-shelving-protection.js` with this content:

```js
// ============================================================
// CLOSET SHELVING PROTECTION DATA TABLE (v1.0)
//
// Per-shelving-type defaults for masking + obstruction rates
// when a closet's shelving is NOT being painted but is in the
// closet during paint work on walls/ceiling/baseboard.
//
// Consumed by engine/closet-shelf-protection.js — same shape
// as data/fixture-protection.js (rates are DRAFT, calibrate later).
// ============================================================

export const SHELVING_PROTECTION_DEFAULTS = {
  wire_shelving: {
    defaultLevel: 'item_mask',
    setup_min_per_lf: 0.5,
    teardown_min_per_lf: 0.25,
    obstruction_min_per_lf: 0.3,
  },
  wood_shelving: {
    defaultLevel: 'partial_cover',
    setup_min_per_lf: 1.5,
    teardown_min_per_lf: 0.5,
    obstruction_min_per_lf: 1.0,
  },
  builtin_system: {
    defaultLevel: 'full_cover',
    setup_min_per_lf: 2.5,
    teardown_min_per_lf: 1.0,
    obstruction_min_per_lf: 2.0,
  },
};

export const PROTECTION_LEVELS = ['item_mask', 'partial_cover', 'full_cover'];

export const PROTECTION_LEVEL_LABELS = {
  item_mask:     'Item Mask',
  partial_cover: 'Partial Cover',
  full_cover:    'Full Cover',
};

// Multipliers applied to setup + teardown only.
// Obstruction is intrinsic to the shelving's physical bulk
// and does not scale with how thoroughly the painter wraps it.
export const PROTECTION_LEVEL_MULTIPLIERS = {
  item_mask:     0.5,
  partial_cover: 1.0,
  full_cover:    1.5,
};

/**
 * Resolve the effective protection level for a closet:
 * user override if set, else the shelving type's default.
 * Returns null if shelving_type is 'none' or unknown.
 */
export function resolveProtectionLevel(closet) {
  if (!closet || closet.shelving_type === 'none') return null;
  if (closet.protection_level) return closet.protection_level;
  return SHELVING_PROTECTION_DEFAULTS[closet.shelving_type]?.defaultLevel || null;
}

/**
 * Pretty-print the shelving type for task names.
 */
export function labelForShelvingType(type) {
  switch (type) {
    case 'wire_shelving':  return 'Wire Shelving';
    case 'wood_shelving':  return 'Wood Shelving';
    case 'builtin_system': return 'Built-In System';
    default: return 'Shelving';
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: Build succeeds with no errors. The new file will not be referenced yet but should not break anything.

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/data/closet-shelving-protection.js
git commit -m "feat(paintscope): add closet shelving protection data table"
```

---

### Task 2: Add `paint_shelving` and `protection_level` fields to closet factory

**Files:**
- Modify: `Claude/tools/paintscope/src/state/initial-state.js:28-41`

- [ ] **Step 1: Replace the createCloset function**

Find this block (lines 28-41):

```js
export function createCloset(overrides={}) {
  return {
    id: genId('closet'),
    label: 'Closet',
    length_ft: 0,
    width_ft: 0,
    // height inherited from parent room — not stored here
    shelving_type: 'none',
    shelving_lf: 0,
    // Only contains keys the user explicitly overrides; absent = inherit from parent room
    substrate_overrides: {},
    ...overrides,
  };
}
```

Replace with:

```js
export function createCloset(overrides={}) {
  return {
    id: genId('closet'),
    label: 'Closet',
    length_ft: 0,
    width_ft: 0,
    // height inherited from parent room — not stored here
    shelving_type: 'none',
    shelving_lf: 0,
    // Paint/protect toggle for shelving — only meaningful when shelving_type !== 'none'
    paint_shelving: true,
    // Protection level override — null = use shelving type's default
    // Values: 'item_mask' | 'partial_cover' | 'full_cover'
    protection_level: null,
    // Only contains keys the user explicitly overrides; absent = inherit from parent room
    substrate_overrides: {},
    ...overrides,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/state/initial-state.js
git commit -m "feat(paintscope): add paint_shelving and protection_level to createCloset"
```

---

### Task 3: Add migration step for existing closets in localStorage

**Files:**
- Modify: `Claude/tools/paintscope/src/state/migrations.js:113-138` (the `migrateInline` function)

- [ ] **Step 1: Add closet field migration inside migrateInline**

In `migrateInline()`, locate the `parsed.rooms.forEach(r => { ... })` block that starts around line 114 and runs through line 138. Find the line that initializes the closets array:

```js
    // Initialize closets array
    if (!r.closets) r.closets = [];
```

Immediately after that line, add:

```js
    // v1.5: Closet shelving paint-or-protect toggle.
    // Existing closets default to paint_shelving=true (preserves prior behavior).
    (r.closets || []).forEach(c => {
      if (c.paint_shelving === undefined) c.paint_shelving = true;
      if (c.protection_level === undefined) c.protection_level = null;
    });
```

- [ ] **Step 2: Verify build**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/state/migrations.js
git commit -m "feat(paintscope): migrate existing closets to paint_shelving=true"
```

---

### Task 4: Gate the paint surface key on `paint_shelving` in quantity-lookups

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/quantity-lookups.js:307-310`

- [ ] **Step 1: Wrap the existing emit in a paint_shelving check**

Find this block (lines 307-310):

```js
      // Closet shelving
      if (closet.shelving_type !== 'none' && cd.shelving_lf > 0) {
        addClosetQ('PS_SURFACE_LF.CLOSET_SHELF', 'LF', cd.shelving_lf);
      }
```

Replace with:

```js
      // Closet shelving — emit paint surface key only when paint_shelving is true.
      // When paint_shelving is false, masking + obstruction is handled by
      // resolveClosetShelfProtection() in the run-estimate pipeline.
      if (closet.shelving_type !== 'none' && cd.shelving_lf > 0) {
        if (closet.paint_shelving !== false) {
          addClosetQ('PS_SURFACE_LF.CLOSET_SHELF', 'LF', cd.shelving_lf);
        }
      }
```

- [ ] **Step 2: Verify build**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/engine/quantity-lookups.js
git commit -m "feat(paintscope): gate CLOSET_SHELF paint key on paint_shelving flag"
```

---

### Task 5: Create the closet shelf protection resolver

**Files:**
- Create: `Claude/tools/paintscope/src/engine/closet-shelf-protection.js`

- [ ] **Step 1: Create the new resolver file**

Create `Claude/tools/paintscope/src/engine/closet-shelf-protection.js` with this content:

```js
import {
  SHELVING_PROTECTION_DEFAULTS,
  PROTECTION_LEVEL_MULTIPLIERS,
  resolveProtectionLevel,
  labelForShelvingType,
} from '../data/closet-shelving-protection.js';

/**
 * Resolve closet shelf protection tasks for all rooms.
 *
 * For each closet where:
 *   - shelving_type !== 'none'
 *   - shelving_lf > 0
 *   - paint_shelving === false
 *
 * Emits up to three task entries:
 *   1. setup    — masking setup time
 *   2. cleanup  — masking teardown time
 *   3. apply    — obstruction modifier (only if any closet-relevant
 *                 substrate is active in the parent room)
 *
 * Mirrors the shape of resolveRoomFixtureProtection() so that
 * run-estimate.js can merge the result the same way.
 *
 * Returns: { [roomIndex]: { tasks: [...], totalHours } }
 */
export function resolveClosetShelfProtection(rooms) {
  const result = {};

  rooms.forEach((room, ri) => {
    const subs = room.substrates || {};
    const closetRelevantActive = !!subs.walls || !!subs.ceiling || !!subs.baseboard;

    const tasks = [];

    (room.closets || []).forEach((closet) => {
      if (closet.shelving_type === 'none') return;
      const lf = parseFloat(closet.shelving_lf) || 0;
      if (lf <= 0) return;
      if (closet.paint_shelving !== false) return; // painting → no protection here

      const def = SHELVING_PROTECTION_DEFAULTS[closet.shelving_type];
      if (!def) return;

      const level = resolveProtectionLevel(closet);
      const levelMult = PROTECTION_LEVEL_MULTIPLIERS[level] ?? 1.0;
      const typeLabel = labelForShelvingType(closet.shelving_type);

      const setupHrs    = round3(lf * def.setup_min_per_lf    * levelMult / 60);
      const teardownHrs = round3(lf * def.teardown_min_per_lf * levelMult / 60);
      const obstructHrs = round3(lf * def.obstruction_min_per_lf / 60);

      if (setupHrs > 0) {
        tasks.push({
          taskId: `__CSP_${closet.id}_SETUP__`,
          taskName: `Mask ${typeLabel} (${closet.label})`,
          phase: 'setup',
          hours: setupHrs,
          isFixed: false,
          baseRate: `${def.setup_min_per_lf}m/LF \u00d7 ${levelMult}`,
          quantity: lf,
          uom: 'LF',
          isClosetShelfProtection: true,
          closetId: closet.id,
          shelvingType: closet.shelving_type,
          protectionLevel: level,
          mechanism: 'task',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }

      if (teardownHrs > 0) {
        tasks.push({
          taskId: `__CSP_${closet.id}_TEARDOWN__`,
          taskName: `Remove ${typeLabel} Masking (${closet.label})`,
          phase: 'cleanup',
          hours: teardownHrs,
          isFixed: false,
          baseRate: `${def.teardown_min_per_lf}m/LF \u00d7 ${levelMult}`,
          quantity: lf,
          uom: 'LF',
          isClosetShelfProtection: true,
          closetId: closet.id,
          shelvingType: closet.shelving_type,
          protectionLevel: level,
          mechanism: 'task',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }

      if (obstructHrs > 0 && closetRelevantActive) {
        tasks.push({
          taskId: `__CSP_${closet.id}_OBSTRUCTION__`,
          taskName: `Shelf Obstruction \u2014 ${closet.label}`,
          phase: 'apply',
          hours: obstructHrs,
          isFixed: false,
          baseRate: `${def.obstruction_min_per_lf}m/LF`,
          quantity: lf,
          uom: 'LF',
          isClosetShelfProtection: true,
          closetId: closet.id,
          shelvingType: closet.shelving_type,
          protectionLevel: level,
          mechanism: 'modifier',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }
    });

    if (tasks.length > 0) {
      result[ri] = {
        tasks,
        totalHours: round3(tasks.reduce((s, t) => s + t.hours, 0)),
      };
    }
  });

  return result;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}
```

- [ ] **Step 2: Verify build**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: Build succeeds with no errors. The resolver is not yet wired into run-estimate.js, but the file should parse and import its data dependencies cleanly.

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/engine/closet-shelf-protection.js
git commit -m "feat(paintscope): add closet shelf protection resolver"
```

---

### Task 6: Wire the resolver into run-estimate.js

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/run-estimate.js:11` (import)
- Modify: `Claude/tools/paintscope/src/engine/run-estimate.js:779` (call)
- Modify: `Claude/tools/paintscope/src/engine/run-estimate.js:790` (grand total)
- Modify: `Claude/tools/paintscope/src/engine/run-estimate.js:915` (return value)

- [ ] **Step 1: Add the import**

Find line 11:

```js
import { resolveRoomFixtureProtection } from './fixture-protection.js';
```

Add immediately after it (becomes line 12):

```js
import { resolveClosetShelfProtection } from './closet-shelf-protection.js';
```

- [ ] **Step 2: Call the resolver after fixtureProtection**

Find this block (around line 778-779):

```js
  // Room-level fixture protection (bathroom fixtures × active painting contexts)
  const fixtureProtection = resolveRoomFixtureProtection(rooms, roomSpecMethods);
```

Add immediately after it:

```js
  // Closet shelf protection (unpainted shelves: masking + obstruction)
  const closetShelfProtection = resolveClosetShelfProtection(rooms);
```

- [ ] **Step 3: Add closetShelfProtection hours to grand total**

Find this block (around line 790):

```js
  Object.values(fixtureProtection).forEach(fp => { grandTotalHours += fp.totalHours; });
```

Add immediately after it:

```js
  Object.values(closetShelfProtection).forEach(cp => { grandTotalHours += cp.totalHours; });
```

- [ ] **Step 4: Add closetShelfProtection to the return value**

Find this block (around line 912-925):

```js
  return {
    specResults,
    roomProtection,
    fixtureProtection,
    exteriorProtection,
    closetHoursByRoom,
```

Replace with:

```js
  return {
    specResults,
    roomProtection,
    fixtureProtection,
    closetShelfProtection,
    exteriorProtection,
    closetHoursByRoom,
```

- [ ] **Step 5: Verify build**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add Claude/tools/paintscope/src/engine/run-estimate.js
git commit -m "feat(paintscope): wire closet shelf protection into run-estimate pipeline"
```

---

### Task 7: Add paint/protect toggle and protection level dropdown to ClosetsTab

**Files:**
- Modify: `Claude/tools/paintscope/src/components/room-editor/tabs/ClosetsTab.jsx:1-3` (imports)
- Modify: `Claude/tools/paintscope/src/components/room-editor/tabs/ClosetsTab.jsx:175-202` (Shelving section)

- [ ] **Step 1: Add the new imports**

Find lines 1-3:

```jsx
import { useState, useMemo } from 'react';
import { CLOSET_SHELVING_TYPES } from '../../../state/initial-state';
import { deriveCloset } from '../../../engine/derive-room';
```

Replace with:

```jsx
import { useState, useMemo } from 'react';
import { CLOSET_SHELVING_TYPES } from '../../../state/initial-state';
import { deriveCloset } from '../../../engine/derive-room';
import {
  SHELVING_PROTECTION_DEFAULTS,
  PROTECTION_LEVELS,
  PROTECTION_LEVEL_LABELS,
  PROTECTION_LEVEL_MULTIPLIERS,
  resolveProtectionLevel,
} from '../../../data/closet-shelving-protection';
```

- [ ] **Step 2: Replace the Shelving / Built-In section**

Find this block (lines 175-202):

```jsx
                {/* Shelving */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 8 }}>
                  <div className="field-label" style={{ marginBottom: 4 }}>Shelving / Built-In</div>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <select
                        value={focused.shelving_type}
                        onChange={e => setCl(focused.id, 'shelving_type', e.target.value)}
                        style={{ width: '100%' }}
                      >
                        {CLOSET_SHELVING_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    {focused.shelving_type !== 'none' && (
                      <div>
                        <div className="field-label">Shelving LF</div>
                        <input
                          type="number" min="0" max="200" step="1"
                          value={focused.shelving_lf || ''}
                          onChange={e => setCl(focused.id, 'shelving_lf', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                </div>
```

Replace with:

```jsx
                {/* Shelving */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 8 }}>
                  <div className="field-label" style={{ marginBottom: 4 }}>Shelving / Built-In</div>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <select
                        value={focused.shelving_type}
                        onChange={e => {
                          const newType = e.target.value;
                          setCl(focused.id, 'shelving_type', newType);
                          // Reset toggle + override when going back to 'none'
                          if (newType === 'none') {
                            setCl(focused.id, 'paint_shelving', true);
                            setCl(focused.id, 'protection_level', null);
                          }
                        }}
                        style={{ width: '100%' }}
                      >
                        {CLOSET_SHELVING_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    {focused.shelving_type !== 'none' && (
                      <div>
                        <div className="field-label">Shelving LF</div>
                        <input
                          type="number" min="0" max="200" step="1"
                          value={focused.shelving_lf || ''}
                          onChange={e => setCl(focused.id, 'shelving_lf', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  {/* Paint / Don't paint toggle (only when type !== 'none') */}
                  {focused.shelving_type !== 'none' && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`paint_shelving_${focused.id}`}
                          checked={focused.paint_shelving !== false}
                          onChange={() => setCl(focused.id, 'paint_shelving', true)}
                        />
                        Paint shelving
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`paint_shelving_${focused.id}`}
                          checked={focused.paint_shelving === false}
                          onChange={() => setCl(focused.id, 'paint_shelving', false)}
                        />
                        Don't paint (mask + protect)
                      </label>
                    </div>
                  )}

                  {/* Protection level dropdown + derived mask time (only when not painting) */}
                  {focused.shelving_type !== 'none' && focused.paint_shelving === false && (() => {
                    const def = SHELVING_PROTECTION_DEFAULTS[focused.shelving_type];
                    const effectiveLevel = resolveProtectionLevel(focused);
                    const isOverridden = !!focused.protection_level;
                    const lf = parseFloat(focused.shelving_lf) || 0;
                    const levelMult = PROTECTION_LEVEL_MULTIPLIERS[effectiveLevel] ?? 1.0;
                    const setupHrs    = def ? lf * def.setup_min_per_lf    * levelMult / 60 : 0;
                    const teardownHrs = def ? lf * def.teardown_min_per_lf * levelMult / 60 : 0;
                    const totalMaskHrs = Math.round((setupHrs + teardownHrs) * 100) / 100;
                    return (
                      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
                        <div>
                          <div className="field-label">Protection level</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select
                              value={effectiveLevel || ''}
                              onChange={e => {
                                const v = e.target.value;
                                const defaultForType = def?.defaultLevel || null;
                                // If user picks the type's default, clear the override
                                setCl(focused.id, 'protection_level', v === defaultForType ? null : v);
                              }}
                              style={{ width: '100%' }}
                            >
                              {PROTECTION_LEVELS.map(lvl => (
                                <option key={lvl} value={lvl}>{PROTECTION_LEVEL_LABELS[lvl]}</option>
                              ))}
                            </select>
                            {isOverridden ? (
                              <span
                                className="override-toggle manual"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setCl(focused.id, 'protection_level', null)}
                                title="Reset to type default"
                              >
                                override
                              </span>
                            ) : (
                              <span className="auto-tag">default</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="field-label">Est. mask time</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>
                            ~{totalMaskHrs} hrs
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
```

- [ ] **Step 3: Verify build**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/room-editor/tabs/ClosetsTab.jsx
git commit -m "feat(paintscope): add paint/protect toggle and level override to ClosetsTab"
```

---

### Task 8: Manual browser verification

**Files:** None (manual verification only)

- [ ] **Step 1: Start the dev server**

Run in a terminal:

```bash
cd "Claude/tools/paintscope" && npm run dev -- --port 5177
```

Open `http://localhost:5177` in a browser.

- [ ] **Step 2: Test default behavior preserved**

In the running app:
1. Add a new room (or select an existing one with walls + baseboard active)
2. Go to the **Closets** tab
3. Click **+ Add Closet**
4. Set Length=4, Width=4 (closet should derive geometry)
5. Set shelving type to **Wood/Melamine Shelving**
6. Set Shelving LF to 20
7. Confirm the new toggle defaults to **Paint shelving** (radio is checked)
8. Open browser DevTools → Console, then trigger an estimate by visiting the **Estimate** view
9. Confirm `SF_CLOSET_SHELF_NC_v1` appears in the spec list with paint tasks
10. Note the total hours (we'll compare in step 3)

Expected: Same behavior as before this work (paint spec fires, paint tasks appear).

- [ ] **Step 3: Toggle to don't-paint and verify protection tasks**

1. Return to the Closets tab, focus the same closet
2. Click the **Don't paint (mask + protect)** radio
3. Confirm the **Protection level** dropdown appears, defaulting to **Partial Cover** with a "(default)" tag
4. Confirm the **Est. mask time** displays approximately `~0.67 hrs` (20 × 1.5 × 1.0 / 60 + 20 × 0.5 × 1.0 / 60 = 0.5 + 0.167 = 0.667)
5. Visit the **Estimate** view
6. Confirm `SF_CLOSET_SHELF_NC_v1` no longer appears (no paint tasks for shelves)
7. In the engine result (open DevTools console and inspect the latest estimate result, OR check the protection section of the Estimate view), look for three new entries on this room:
   - `Mask Wood Shelving (Closet)` — phase setup, ~0.5 hrs
   - `Remove Wood Shelving Masking (Closet)` — phase cleanup, ~0.17 hrs
   - `Shelf Obstruction — Closet` — phase apply, ~0.33 hrs (only if walls/ceiling/baseboard active in the parent room)
8. Confirm the room's grand total hours increased by approximately 1.0 hr (0.5 + 0.17 + 0.33) compared to step 2

- [ ] **Step 4: Test built-in system rates and override**

1. Change shelving type to **Built-In Closet System**
2. Confirm the protection level dropdown's default switches to **Full Cover**
3. Confirm Est. mask time recomputes (should be ~1.75 hrs: 20 × 2.5 × 1.5 / 60 + 20 × 1.0 × 1.5 / 60 = 1.25 + 0.5 = 1.75 hrs)
4. Pick **Item Mask** from the dropdown
5. Confirm the tag flips from "(default)" to "(override)"
6. Confirm Est. mask time drops to roughly 0.58 hrs (the 0.5/1.5 ratio of the previous value: 1.75 × 0.5/1.5 ≈ 0.58)
7. Check the Estimate view: the obstruction task should still show ~0.67 hrs (20 × 2.0 / 60), unchanged by the level override

- [ ] **Step 5: Test override reset**

1. Click the "override" pill next to the dropdown to reset to default
2. Confirm dropdown returns to **Full Cover** and tag flips back to "(default)"
3. Confirm Est. mask time returns to ~1.75 hrs

- [ ] **Step 6: Test type='none' reset**

1. Change shelving type back to **No Shelving**
2. Confirm the toggle, protection dropdown, and shelving LF input all disappear
3. Open DevTools console and run: `JSON.parse(localStorage.getItem('paintscope_state')).rooms.find(r => r.closets?.length).closets[0]`
4. Confirm `paint_shelving === true` and `protection_level === null` (the reset side-effect fired)
5. Visit Estimate view and confirm no closet shelf paint tasks AND no closet shelf protection tasks for this closet

- [ ] **Step 7: Test migration of existing localStorage**

1. With DevTools open: in the Application tab, find `paintscope_state` in Local Storage
2. Copy the value to a scratchpad
3. Open the JSON, find a closet inside `rooms[*].closets`, and DELETE both the `paint_shelving` and `protection_level` fields from it (simulating a closet saved before this change)
4. Paste the modified JSON back into Local Storage
5. Reload the page
6. Open DevTools console and run: `JSON.parse(localStorage.getItem('paintscope_state')).rooms.find(r => r.closets?.length).closets[0]`
7. Confirm `paint_shelving === true` and `protection_level === null` (migration restored them)

- [ ] **Step 8: Final commit (only if you found and fixed any bugs)**

If any bugs surfaced during manual verification, fix them, rebuild, and commit each fix as a separate commit. Otherwise no commit needed for this task.

```bash
# Only if you fixed something:
git add <fixed files>
git commit -m "fix(paintscope): <describe the bug>"
```

---

## Done

After Task 8 passes all checks, the feature is complete. The branch will have ~7 commits (one per task, plus any verification fixes). All work is on `main` per project preference.

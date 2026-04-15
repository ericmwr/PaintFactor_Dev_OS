# Closet Shelving — Paint or Protect Toggle

**Date:** 2026-04-09
**Status:** Design Approved
**Scope:** PaintScope Closets Tab — closet shelving / built-in section

---

## Problem

In the Closets tab's detail panel, the Shelving / Built-In section currently has a `shelving_type` dropdown (none / wire / wood / built-in system) and a `shelving_lf` input. Whenever a non-`none` type is selected, the engine assumes the shelving will be painted: it emits `PS_SURFACE_LF.CLOSET_SHELF`, which activates the `SF_CLOSET_SHELF_NC_v1` paint spec.

Real estimates often need the opposite: shelving is **present in the closet** but **not in scope to paint**. In that case the painter still has to:
1. **Mask / cover** the shelves to protect them while painting walls, ceiling, and baseboard
2. **Work around** the shelves while painting those surfaces, which slows the work down

There is no way to express this today. The only options are "shelves get painted (full spec activates)" or "no shelves at all (shelving_type=none, no protection, no slowdown)".

## Goal

Add a per-closet **paint vs. don't-paint** toggle for shelving. When toggled to don't-paint, the engine suppresses the paint spec, adds masking setup/teardown tasks, and adds an obstruction time penalty to other paint work happening in the closet.

## Design Overview

Three pieces:

1. **Data model** — extend the closet object with `paint_shelving` and `protection_level` fields, plus a per-shelving-type defaults table for masking and obstruction rates.
2. **Engine** — gate the existing paint-spec activation on `paint_shelving`, and add a new resolver (`closet-shelf-protection.js`) that follows the existing `fixture-protection.js` pattern to emit setup, teardown, and obstruction tasks.
3. **UI** — extend the Shelving / Built-In section in `ClosetsTab.jsx` with the toggle and an optional protection-level override dropdown.

The closest existing analogues in the codebase, both followed here:
- The **`.painting` flag** on doors/windows/casing — substrate stays present for geometry, a boolean controls spec activation
- The **`fixture-protection.js`** engine — emits standalone setup/teardown/obstruction task entries that get merged into a room's task list at the end of the estimate pipeline

## Section 1: Data Model

### Closet object additions

In `state/initial-state.js`, `createCloset()`:

```js
export function createCloset(overrides={}) {
  return {
    id: genId('closet'),
    label: 'Closet',
    length_ft: 0,
    width_ft: 0,
    shelving_type: 'none',
    shelving_lf: 0,
    paint_shelving: true,        // NEW — default true; meaningful only when shelving_type !== 'none'
    protection_level: null,      // NEW — null = use type default; or 'item_mask' | 'partial_cover' | 'full_cover'
    substrate_overrides: {},
    ...overrides,
  };
}
```

### Per-type defaults table

New file `data/closet-shelving-protection.js`:

```js
// Draft rates — calibrated later, same approach as bathroom fixture rates.
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

// Multipliers applied to setup + teardown only (not obstruction —
// obstruction is intrinsic to the shelving's physical bulk and
// does not scale with how thoroughly the painter wraps it).
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
```

### Migration

In `state/migrations.js`, add a migration step that loops `state.rooms[*].closets[*]` and sets `paint_shelving = true` if undefined. `protection_level` left undefined (null) on existing closets — they get the type default. Bump schema version accordingly. This preserves current behavior on load: every existing closet keeps painting its shelving as before.

## Section 2: Engine Processing

### Quantity-lookups change

In `engine/quantity-lookups.js`, the closet shelving block (~line 308) becomes:

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

No paint key emitted → `SF_CLOSET_SHELF_NC_v1` will not activate via spec resolution. Same mechanism the doors/windows `.painting` flag uses.

### New resolver: closet-shelf-protection.js

New file `engine/closet-shelf-protection.js`. Mirrors the structure of `engine/fixture-protection.js`:

```js
import {
  SHELVING_PROTECTION_DEFAULTS,
  PROTECTION_LEVEL_MULTIPLIERS,
  resolveProtectionLevel,
} from '../data/closet-shelving-protection.js';

/**
 * Resolve closet shelf protection tasks for all rooms.
 *
 * For each closet where shelving_type !== 'none', shelving_lf > 0, and
 * paint_shelving === false, emits up to three task entries:
 *   1. setup    — masking setup time
 *   2. cleanup  — masking teardown time
 *   3. apply    — obstruction modifier (only if any closet-relevant
 *                 substrate is active in the parent room)
 *
 * Returns: { [roomIndex]: { tasks: [...], totalHours } }
 */
export function resolveClosetShelfProtection(rooms) {
  const result = {};
  rooms.forEach((room, ri) => {
    const subs = room.substrates || {};
    const closetRelevantActive =
      !!subs.walls || !!subs.ceiling || !!subs.baseboard;

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

      const setupHrs    = round3(lf * def.setup_min_per_lf    * levelMult / 60);
      const teardownHrs = round3(lf * def.teardown_min_per_lf * levelMult / 60);
      const obstructHrs = round3(lf * def.obstruction_min_per_lf / 60);

      if (setupHrs > 0) {
        tasks.push({
          taskId: `__CSP_${closet.id}_SETUP__`,
          taskName: `Mask ${labelForType(closet.shelving_type)} (${closet.label})`,
          phase: 'setup',
          hours: setupHrs,
          isFixed: false,
          baseRate: `${def.setup_min_per_lf}m/LF × ${levelMult}`,
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
          taskName: `Remove ${labelForType(closet.shelving_type)} Masking (${closet.label})`,
          phase: 'cleanup',
          hours: teardownHrs,
          isFixed: false,
          baseRate: `${def.teardown_min_per_lf}m/LF × ${levelMult}`,
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
          taskName: `Shelf Obstruction — ${closet.label}`,
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

function labelForType(type) {
  switch (type) {
    case 'wire_shelving':  return 'Wire Shelving';
    case 'wood_shelving':  return 'Wood Shelving';
    case 'builtin_system': return 'Built-In System';
    default: return 'Shelving';
  }
}

function round3(n) { return Math.round(n * 1000) / 1000; }
```

### Wiring into run-estimate.js

`run-estimate.js` already calls `resolveRoomFixtureProtection(...)` and merges its tasks into per-room totals. Add a parallel call: `resolveClosetShelfProtection(rooms)` and merge the results into the same per-room task list using the same merging code path. Tasks are tagged with `isClosetShelfProtection: true` so the estimate view can group/label them distinctly from fixture-protection tasks if desired.

### Why a separate file from fixture-protection.js

`fixture-protection.js` is tightly coupled to the `roomSpecMethods` array and the `SPEC_PAINTING_CONTEXT` table — it's driven by "which paint specs are firing in this room and with what spray method". Closet shelf protection has different inputs:
- It's per-closet, not per-room
- It doesn't depend on spray-vs-brush (masking is needed regardless)
- It only cares whether *any* of the closet-relevant substrates (walls/ceiling/baseboard) are active

Folding both into one file would tangle two separate responsibility chains. A new file with the same shape and conventions is cleaner and easier to test in isolation.

## Section 3: UI

### ClosetsTab.jsx — Shelving / Built-In section

Replace the current 2-column shelving block (lines 175-202) with a stacked layout:

```
Shelving / Built-In
┌──────────────────────────┬──────────────────────────┐
│ Type dropdown            │ Shelving LF input        │
└──────────────────────────┴──────────────────────────┘
  (only when type !== 'none')
┌──────────────────────────────────────────────────────┐
│ ◉ Paint shelving    ○ Don't paint (mask + protect)   │
└──────────────────────────────────────────────────────┘
  (only when paint_shelving === false)
┌──────────────────────────┬──────────────────────────┐
│ Protection level         │ Est. mask time (derived) │
│ [item_mask ▼]            │ ~0.4 hrs                 │
└──────────────────────────┴──────────────────────────┘
```

### Field behaviors

| Element | Behavior |
|---|---|
| Type dropdown | Existing — `closet.shelving_type` |
| Shelving LF | Existing — `closet.shelving_lf` |
| Paint / Don't paint toggle | Two-button radio. Hidden when `shelving_type === 'none'`. Writes `closet.paint_shelving`. |
| Protection level dropdown | Hidden when `paint_shelving !== false`. Options from `PROTECTION_LEVEL_LABELS`. The shelving type's default is the initial selection and shows an "(default)" tag — the same `auto-tag` style used by the inherited substrate rows in this same tab. Selecting a different value flips the tag to "(override)" and writes `closet.protection_level`. An "edit/reset" affordance reverts to default (sets `protection_level` to null). |
| Est. mask time | Read-only. Computed inline from `SHELVING_PROTECTION_DEFAULTS[type]` × level multiplier × `shelving_lf`. Displays setup + teardown total. |

### Side-effect rule

When the user changes `shelving_type` to `'none'`, also reset `paint_shelving` to `true` and clear `protection_level`. Otherwise stale values can hide behind the dropdown.

### Reducer

No new actions. The existing `SET_CLOSET` action accepts arbitrary `field`/`value` pairs on the closet object, so `paint_shelving` and `protection_level` flow through unchanged. The `'none'` reset side-effect lives in the JSX (or, more cleanly, in `SET_CLOSET` for `field === 'shelving_type'` — see Open Questions).

## Estimate Display

Closet shelf protection tasks should appear in the estimate dashboard's protection section, grouped by room → by closet, similar to how fixture-protection tasks render today. Phase 1 of this work uses the existing fixture-protection rendering path (tasks with `isClosetShelfProtection: true` will fall into the same room totals). A future polish pass can split them into their own subsection if needed.

## Testing

Manual verification:
1. Add a closet with dimensions, set shelving type to "Wood Shelving" with 20 LF
2. Default state (paint_shelving=true): confirm `SF_CLOSET_SHELF_NC_v1` activates and produces paint tasks
3. Toggle to don't-paint: confirm paint tasks disappear and three new entries appear (setup ~0.5 hr, teardown ~0.17 hr, obstruction ~0.33 hr)
4. Switch to Built-In System: confirm rates jump and default protection level changes to full_cover
5. Override protection level to item_mask: confirm setup + teardown time drops by ~67% (0.5×/1.5× ratio), but obstruction stays the same
6. Switch shelving type back to None: confirm paint_shelving resets to true, protection_level clears, no protection tasks emitted
7. Reload from localStorage: confirm migration sets paint_shelving=true on pre-existing closets

No new unit tests in this pass — the engine has no existing test harness for fixture-protection-style resolvers. Future test work for this should mirror whatever pattern eventually lands for fixture-protection tests.

## Out of Scope

- Calibrating the draft rates against real field data (intentionally deferred — they're labeled draft)
- Splitting closet shelf protection into its own UI subsection in the estimate view
- Per-substrate granularity for the obstruction modifier (today it's a single value applied at the room level when any closet-relevant substrate is active)
- Capturing shelving depth, shelf count per LF, or hardware complexity as additional dimensions
- Materials/consumables for masking (plastic sheeting, tape) — protection time only

## Open Questions

1. **Where does the `shelving_type → 'none'` reset side-effect live?** — In the JSX (cleaner for now since reducer side-effects are lightweight) or in `SET_CLOSET` (more centralized but pulls business logic into the reducer). Leaning JSX for this pass.
2. **Is the obstruction value correct as a per-LF rate?** — Built-in systems with very long shelving runs may not actually scale linearly (a 6 LF wall of built-ins doesn't take 2× the time of a 3 LF wall of built-ins). Could revisit as a fixed-per-closet base + small per-LF rate. Deferred until real data is available.

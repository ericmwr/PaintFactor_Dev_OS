# PaintFactor Mini — NC Interior Trim Pricing Calculator

**Date:** 2026-04-24
**Status:** Design approved, ready for implementation plan
**Audience:** A friend of the user who runs a residential painting business and needs to quote new-construction interior trim packages quickly from his phone.

## Purpose

Build an isolated, single-user, mobile-first pricing calculator for four NC interior trim substrates: **baseboard, door casing, door frame, door slabs**. Output: scope (task list) + charge (labor + materials + overhead + profit). Deployable as a static HTML site.

Decoupled from the main PaintFactor platform — changes in PaintFactor do not affect this tool and vice versa. Task rates and material catalog are seeded once from PaintFactor spec files, then fully editable by the user.

## Non-Goals

- No multi-user accounts, customer database, or invoicing.
- No integration with the main PaintFactor pipeline at runtime.
- No interior substrates beyond the four listed (no drywall, no cabinets, no stair parts).
- No exterior trim.
- No tax, payment processing, or PDF generation library — rely on browser native print.

## Project Location & Stack

- **Folder:** `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\` — sibling to the `Claude\` folder, its own git repo (own `.git`).
- **Stack:** Static site, no build step. Files:
  - `index.html`
  - `app.js` (vanilla JS, no framework)
  - `style.css`
  - `seed.json` (task + material catalog seed, generated from PaintFactor specs)
  - `build-seed.js` (Node script, re-runnable, reads PaintFactor spec folders and writes `seed.json`)
  - `README.md`
- **Storage:** `localStorage` for all editable state.
- **Deployment:** Drop folder on Netlify, or open `index.html` directly. Works offline.
- **Import/export:** JSON file export/import for backup and moving between devices.

## UI Layout — Mobile-First

Portrait phone viewport (~375–414px wide). Single-column, bottom tab bar, sticky total in header.

```
┌─────────────────────────┐
│  $ 4,250    (live total)│ ← sticky header
├─────────────────────────┤
│                         │
│   (active tab content)  │
│                         │
├─────────────────────────┤
│ [📋] [🧱] [💰] [⚙]     │ ← bottom tab bar
│ Job Tasks Mats Setup    │
└─────────────────────────┘
```

### Tab 1 — Job

Accordion cards, one per substrate. Each card (collapsed) shows: substrate name, current qty, finish system badge. Expanded shows:

- **Baseboard** — LF input, substrate state, finish system, application method, enable toggle.
- **Door Casing** — LF input (direct), "from frames: +N LF" indicator, substrate state, finish system, application method, enable toggle.
- **Door Frames** — EA input, auto-computed jamb LF + casing LF readouts, substrate state, finish system, application method, enable toggle.
- **Door Slabs** — sides count (each face = 1 side), substrate state, finish system, application method, enable toggle.

All four fields per card: substrate state, finish system, application method, and an enable toggle.

### Tab 2 — Tasks

Filtered task list derived from Job inputs. Grouped by substrate with collapsible headers. Each task row: checkbox (on by default), task name, phase badge, editable `rate_per_hour` field, computed hours display. Changes persist to `localStorage` `job.task_overrides`.

### Tab 3 — Mats (Materials)

Two sections:
- **Picks** — for each active substrate + category combination (from `material_mapping`), show the currently picked product with: name, $/unit, auto-computed quantity, editable qty override, total cost. Tap to change product (opens catalog picker).
- **Catalog** — full searchable list of all products (seed + user-added). Add / edit / disable products. Edits persist to `localStorage` `catalog`.

### Tab 4 — Setup

- Labor $/hr
- Overhead %
- Profit %
- Door frame geometry constants (jamb LF per EA, casing LF per EA) — defaults 17 and 34
- Job name + optional customer fields (name, address — free text, stored for current job)
- **Generate Quote** button → full-screen Quote Output overlay (only trigger; no duplicate in header)
- Export JSON / Import JSON
- Reset to defaults (two-step confirmation)

### Quote Output Overlay

Full-screen modal, print-optimized CSS. Content:
- Header: job name, date, customer fields
- Scope: per substrate — qty, state, finish, method, list of included tasks
- Breakdown table: labor hours + subtotal, materials (itemized by SKU), overhead $, profit $, **Total $**
- Footer: labor hours total, notes (free text field)
- Actions: Print, Save PDF (browser native), Close

## Valid Substrate × State × Finish Combinations

| Substrate State | Valid Finish Systems |
|---|---|
| Bare wood | Prime and Paint, Stain, Stain and Clear |
| Factory primer | Prime and Paint, Paint |

All paint systems apply **2 finish coats** by default (editable per task via coat_count in future; fixed at 2 for v1).

## Data Model

### A. `seed.json` (read-only reference, shipped with app)

```json
{
  "substrates": [
    {
      "id": "baseboard",
      "name": "Baseboard",
      "uom": "LF",
      "sf_per_unit": 0.75,
      "valid_state_finish": {
        "bare_wood": ["prime_and_paint", "stain", "stain_and_clear"],
        "factory_primer": ["prime_and_paint", "paint"]
      }
    },
    {
      "id": "door_casing",
      "name": "Door Casing",
      "uom": "LF",
      "sf_per_unit": 0.5,
      "valid_state_finish": { /* same as baseboard */ }
    },
    {
      "id": "door_frame",
      "name": "Door Frame",
      "uom": "EA",
      "sf_per_unit": 6.4,
      "derives": { "jamb_lf_per_ea": 17, "casing_lf_per_ea": 34 },
      "valid_state_finish": { /* same as baseboard */ }
    },
    {
      "id": "door_slab",
      "name": "Door Slab",
      "uom": "SIDE",
      "sf_per_unit": 21,
      "valid_state_finish": { /* same as baseboard */ }
    }
  ],
  "tasks": [
    {
      "task_id": "TSK_BASEBOARD_BRUSH_FINISH",
      "name": "Apply baseboard finish (brush)",
      "substrate": "baseboard",
      "phase": "apply",
      "method": "brush",
      "finish_system_filter": ["paint", "prime_and_paint"],
      "state_filter": null,
      "rate_per_hour": 80,
      "uom": "LF",
      "coat_count": 2
    }
    /* ... many more, extracted from PaintFactor spec files */
  ],
  "materials": [
    {
      "sku": "SW-PROCLASSIC-WHITE-GAL",
      "name": "SW ProClassic Interior Acrylic Latex Enamel — Semi-Gloss White",
      "category": "paint",
      "unit": "GAL",
      "price_per_unit": 72,
      "spread_rate_sf_per_unit": 400
    }
    /* ... more */
  ],
  "material_mapping": {
    "paint": ["paint"],
    "prime_and_paint": ["primer", "paint"],
    "stain": ["stain"],
    "stain_and_clear": ["stain", "clear"]
  }
}
```

### B. `localStorage` state (single key: `paintfactor_mini_state_v1`)

```json
{
  "version": 1,
  "settings": {
    "labor_rate_per_hour": 65,
    "overhead_pct": 15,
    "profit_pct": 20,
    "door_frame": { "jamb_lf_per_ea": 17, "casing_lf_per_ea": 34 }
  },
  "job": {
    "name": "",
    "customer": { "name": "", "address": "", "notes": "" },
    "substrates": {
      "baseboard":    { "qty": 0, "state": "bare_wood",      "finish": "prime_and_paint", "method": "brush", "enabled": true },
      "door_casing":  { "qty": 0, "state": "bare_wood",      "finish": "prime_and_paint", "method": "brush", "enabled": true },
      "door_frame":   { "qty": 0, "state": "bare_wood",      "finish": "prime_and_paint", "method": "brush", "enabled": true },
      "door_slab":    { "qty": 0, "state": "factory_primer", "finish": "paint",           "method": "spray", "enabled": true }
    },
    "task_overrides": {
      "TSK_BASEBOARD_BRUSH_FINISH": { "enabled": true, "rate_per_hour": 82 }
    },
    "material_picks": {
      "baseboard.primer": { "sku": "SW-PREPRITE-PROBLOCK-GAL", "qty_override": null },
      "baseboard.paint":  { "sku": "SW-PROCLASSIC-WHITE-GAL",  "qty_override": null }
    }
  },
  "catalog": {
    "custom_materials": [],
    "overrides": {},
    "disabled_skus": []
  }
}
```

### C. Derived values (computed on every render, never stored)

- **Filtered task list** per substrate: `tasks[].substrate == s.id` AND finish_system_filter matches substrate's finish AND state_filter matches substrate's state AND (method filter matches OR method is "any").
- **Door frame → casing LF contribution:** `door_frame.qty × settings.door_frame.casing_lf_per_ea`. Added to door_casing's effective qty when computing casing tasks.
- **Door frame effective LF:** `door_frame.qty × settings.door_frame.jamb_lf_per_ea`. Used for door-frame tasks.
- **Per-task hours:** `effective_qty / rate_per_hour × task.coat_count`. `task.coat_count` is stored on each task in the seed (1 for prime/stain/clear/prep/setup/cleanup/interstage; 2 for paint-apply tasks). `rate_per_hour` uses override if present, else seed default.
- **Material quantity per (substrate, category):**
  - `coats_for_category` — derived from the category: primer=1, paint=2, stain=1, clear=2.
  - Raw qty: `(effective_qty_sf × coats_for_category) / spread_rate_sf_per_unit` where `effective_qty_sf = effective_qty × sf_per_unit`.
  - Final: `qty_override ?? max(1, ceil(raw_qty))` (can't buy 0 gallons).
- **Effective qty per substrate (used above):**
  - baseboard: `substrates.baseboard.qty`
  - door_slab: `substrates.door_slab.qty` (sides count)
  - door_frame (for frame-substrate tasks): `substrates.door_frame.qty × settings.door_frame.jamb_lf_per_ea`
  - door_casing (for casing-substrate tasks): `substrates.door_casing.qty + (substrates.door_frame.qty × settings.door_frame.casing_lf_per_ea)`
- **Totals** — see pricing formula below.

## Pricing Formula

```
labor_hours    = Σ over enabled tasks: (effective_qty / rate_per_hour × coat_count)
labor_cost     = labor_hours × labor_rate_per_hour
materials_cost = Σ over material picks: (qty × price_per_unit)
subtotal       = labor_cost + materials_cost
overhead       = subtotal × (overhead_pct / 100)
profit         = (subtotal + overhead) × (profit_pct / 100)
total          = subtotal + overhead + profit
```

## Seed Extraction

A Node script `build-seed.js` runs once (or whenever the user wants to refresh) and reads from the PaintFactor worktree:

| PaintFactor source folder | Substrate |
|---|---|
| `SF_BASEBOARD_NC_PAINT_v1` + `SF_BASEBOARD_NC_PRIME_v1` + `SF_BASEBOARD_NC_STAIN_v1` | baseboard |
| `SF_DOOR_CASING_NC_PAINT_v1` + `SF_DOOR_CASING_NC_PRIME_v1` + `SF_DOOR_CASING_NC_STAIN_v1` | door_casing |
| `SF_DOOR_FRAME_NC_FINISH_v1` + `SF_DOOR_FRAME_NC_STAIN_v1` | door_frame |
| `SF_DOOR_SLAB_INT_NC_v1` + `SF_DOOR_SLAB_INT_NC_STAIN_v1` | door_slab |

Extraction logic:
- From each `production.json` — pull task_id, name, phase, method, rate_per_hour, coat_count, finish_system_filter, state_filter.
- From each `materials.json` — pull Sherwin-Williams products (SKU, name, category, unit, $/unit, spread rate). De-duplicate across specs.
- Rewrite phase names to match the four-stage model if needed (setup/prep/prime/apply/interstage/cleanup → these are already the PaintFactor names).
- Materials missing a price or spread rate: fill with reasonable defaults and flag in a `build-seed.log` file for review.

Script writes `seed.json` to the PaintFactorMini folder. Re-runnable at any time.

## Validation & Warnings

Inline, non-blocking:

- Invalid state × finish combination on a substrate card → red hint below finish selector, but still lets user proceed.
- Required field missing (labor rate is 0, no product picked for an active category) → amber banner in Quote output.
- Material quantity auto-computed as 0 → show "≥ 1" fallback (can't buy 0 gallons).
- Door-frame EA entered but door_casing disabled → show notice: "casing LF from frames won't be quoted because Door Casing is off."

## Implementation Sequence (preview for writing-plans)

1. Scaffold project folder + git init, stub `index.html`/`app.js`/`style.css`
2. Write `build-seed.js`, run against PaintFactor specs, produce initial `seed.json`
3. Implement state module (load/save localStorage, default state, migration hook)
4. Implement pricing engine (pure function: state + seed → totals + breakdown)
5. Implement tab router + mobile header + bottom nav
6. Implement Job tab (four substrate cards)
7. Implement Tasks tab (filtered list, toggle, rate edit)
8. Implement Mats tab (picks + catalog editor)
9. Implement Setup tab (settings, export/import, reset)
10. Implement Quote output overlay (print-optimized)
11. Cross-tab validation + warnings
12. README with deploy instructions
13. Manual test pass on mobile viewport (Chrome DevTools device emulation)

## Open Items for Writing-Plans Stage

- Exact list of tasks extracted from each spec — depends on what's in the current PaintFactor files. The plan should have a step to run `build-seed.js` and review the output before locking down the UI task-filter logic.
- Default rates for paint vs stain vs clear tasks — pull from production.json as-is; if gaps exist, set to seed values that match spec-family averages and note them in `build-seed.log`.
- Any task in the PaintFactor specs that uses modifiers (QT, height, complexity) — for v1 of Mini we ignore modifiers. Rates used are the base QT3 rate. Mention in README.

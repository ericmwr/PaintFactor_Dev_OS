# Multi-Coat Production Rate Architecture

**Status:** Deferred — prototype uses temporary coat multiplier
**Priority:** Required before production deployment
**Created:** 2026-02-16
**Related commit:** `68149cb` (coat count multiplier in estimation engine)

## Current State (Prototype — Temporary)

The estimation engine applies a simple coat multiplier to finish and interstage modules:

- Finish coat module hours × `finish_coats` (e.g., ×2 for QT3/QT4, ×3 for QT5 brush)
- Interstage module hours × `interstage_cycles`
- Same production rate used for every coat

**This is inaccurate.** It overestimates total hours because it assumes every coat takes the same amount of time as the first.

## Why This Matters

Each additional coat is faster than the previous one:

1. **Coat 1** (over primer or bare surface) — Slowest. Surface may have texture inconsistencies, absorption variation, and coverage challenges. Painter works carefully to establish an even base.
2. **Coat 2** (over coat 1) — Faster. Surface is uniform, sealed, and predictable. Paint goes on smoother with better coverage. Less time spent working material into the surface.
3. **Coat 3** (QT5 brush only) — Fastest application coat. Surface is fully built up. This coat is primarily for depth, sheen uniformity, and defect elimination.

**What changes between coats is the interstage work, not the application speed improvement.** Interstage tasks (inspect, sand, patch, spot coat, tack clean) may actually increase in scope at higher quality tiers because the standard rises with each coat.

## Production Architecture Requirements

### Per-Coat Production Rates

Each finish coat task needs rates broken out by coat number:

```json
{
  "task_id": "TSK_ARCH_SPRAY_BEAM",
  "rates_by_coat": {
    "coat_1": { "rate_lf_per_hour": 150, "notes": "First coat over primer — careful coverage" },
    "coat_2": { "rate_lf_per_hour": 185, "notes": "Second coat — surface uniform, faster application" },
    "coat_3": { "rate_lf_per_hour": 200, "notes": "Third coat (QT5 brush) — built-up surface, fastest" }
  }
}
```

Estimated improvement per coat: ~20-25% faster per subsequent coat (varies by substrate and method).

### Per-Coat Interstage Scope

Interstage tasks between coats may have different scope:

- **After coat 1:** More defects to find and patch (first coat reveals substrate issues)
- **After coat 2:** Fewer defects, but QT4/QT5 inspection is more critical (sheen uniformity, profile coverage)
- **After coat 3 (if applicable):** Final interstage is essentially the pre-final-inspection pass

### Engine Changes Required

1. **Phase sequence orchestration:** Replace simple multiplier with explicit coat-by-coat execution
2. **Round configurations:** Load and use the `round_configurations` table (already defined in specs, currently unused)
3. **Per-coat context:** Pass `coat_number` in the estimation context so rates and interstage scope can vary
4. **Task line items:** Emit separate line items per coat ("Spray finish beam — Coat 1", "Spray finish beam — Coat 2")
5. **Rate resolution:** `resolveTaskRate` needs to check `rates_by_coat[coat_N]` before falling back to base rate

### Data Changes Required

1. **production.json:** Add `rates_by_coat` to all finish coat tasks across all specs
2. **DB schema:** Add `coat_number` column to task_production_rates or create a `coat_rates` table
3. **DB_BUNDLE:** Replace `coat_counts` table with full `round_configurations` + per-coat rates
4. **Calibration:** Field-validate per-coat rate improvements (the 20-25% estimate needs real data)

## Specs Affected

All specs with finish coat modules (11 currently with coat_count data):

| Spec | Finish Coats (QT3) | Finish Coats (QT5 Brush) |
|------|-------------------|-------------------------|
| SF_ARCH_ELEMENT_NC | 2 | 3 |
| SF_BUILTIN_NC | 2 | 3 |
| SF_CABINET_NC_PAINT | 2 | 3 |
| SF_STAIR_RAILING_NC | 2 | 3 |
| SF_STAIR_RISER_NC | 2 | 3 |
| SF_WAINSCOT_PANEL_NC | 2 | 3 |
| SF_WOOD_CEILING_NC | 2 | 3 |
| SF_WOOD_WALL_NC | 2 | 3 |
| SF_CLOSET_SHELF_NC | 2 | 3 |
| SF_DOOR_FRAME_NC_FINISH | 2 | 3 |
| SF_DOOR_SLAB_INT_NC | 2 | 3 |

Additionally, specs that handle multi-coat through duplicate modules (SF_TRIM_NC_PAINT, SF_WINDOW_INT_NC) should be migrated to the per-coat architecture for consistency.

## Specs Still Missing Coat Data

- **SF_DRYWALL_WALL_NC_FINISH** — No finish-phase module exists in DB. Structural issue.
- **SF_DRYWALL_CEILING_NC_FINISH** — Same as above.
- Prime-only specs (3) are correctly 1 coat — no change needed.

## Dependencies

- Per-coat rate calibration data (field validation needed)
- Round configurations loaded into DB (data exists in sop_modules.json, never imported)
- Possible schema changes to accommodate coat_number dimension

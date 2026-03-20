# Wood Grain Fill Spec — Design Spec

## Summary

Add a standalone spec `SF_WOOD_GRAIN_FILL_NC` for wood grain filling on open-grain hardwoods being painted. User-activated toggle on any bare_wood substrate with paint coating type. Fills open grain pores with AquaCoat (or similar) before finish painting. Quality tier controls coat count. Includes second prime coat after fill.

## Problem

Open-grain hardwoods (oak, ash, walnut, mahogany, hickory) show grain texture through paint finish if not filled. The grain fill process is a multi-coat prep add-on that sits between prime and finish coats. It is not automatic — the painter decides when it's needed based on the wood species and desired finish quality.

## Activation Model

- **User toggle**: `grain_fill: true` on any wood substrate config in SubstrateDetailPanel
- **Conditions**: substrate_state = `bare_wood` AND coating_type = `paint`
- **NOT auto-activated** — user must explicitly enable it per substrate
- **Standalone spec** that runs alongside the parent paint spec (trim, doors, cabinets, etc.)

## Quality Tier → Coat Count

| QT | Fill Coats | Sand Between | Final Sand | Second Prime |
|----|-----------|-------------|-----------|-------------|
| QT3 | 1 | 1 (220 grit) | No | Yes + sand 320 |
| QT4 | 2 | 2 (220, 280-320) | No | Yes + sand 320 |
| QT5 | 3 | 3 (220, 280, 320) | Yes (400 grit) | Yes + sand 320 |

## Task List

### All Quality Tiers
- `TSK_GRAIN_SAND_PREP` — Sand primed surface 220 grit before fill
- `TSK_GRAIN_FILL_COAT` — Apply grain filler (skim coat) — repeats per QT (1/2/3 coats)
- `TSK_GRAIN_SAND_BETWEEN` — Sand between fill coats — repeats per QT
- `TSK_GRAIN_PRIME_SEAL` — Apply second prime coat (seal coat over filler)
- `TSK_GRAIN_SAND_PRIME` — Sand second prime 320 grit

### QT5 Only
- `TSK_GRAIN_FINAL_SAND` — Final sand 320-400 grit before second prime

## Production Rates (SF-based)

| Task | Rate (SF/hr) | Notes |
|------|-------------|-------|
| Sand prep (220) | 100 | Orbital on flats, hand on profiles |
| Fill coat application | 70 | Blended flat/profile, squeegee + brush |
| Sand between coats | 80 | 220-320 grit depending on coat |
| Final sand (QT5, 400) | 60 | Fine grit, hand work |
| Second prime coat | 150 | Standard prime application |
| Sand second prime (320) | 90 | Light sand for tooth |

## UOM Conversion

The spec uses SF as its native UOM. Quantity lookups convert from each substrate's UOM:

| Substrate UOM | Conversion | Example |
|--------------|-----------|---------|
| SF (walls, wainscot, cabinets) | Direct: 1 SF = 1 SF | 120 SF wood wall → 120 SF grain fill |
| LF (trim, baseboard, casing) | 1 LF = 1 SF | 60 LF baseboard → 60 SF grain fill |
| EA doors | Per door type baseline SF | Slab door = ~21 SF/side × sides |
| EA built-ins | Heuristic from doctrine | Use existing Bayes quantifying method |

## PS Key

`PS_SURFACE_SF.GRAIN_FILL` — emitted by quantity-lookups when any substrate has `grain_fill: true`. Value is the sum of all grain-fill-enabled substrates' SF (converted from their native UOM).

## Modifiers

| Modifier | Values | Effect |
|----------|--------|--------|
| surface_profile | flat (1.0x), light_profile (1.3x), medium_profile (2.0x), heavy_profile (2.8x) | Dominant modifier — profiled surfaces require hand work |
| height_band | Standard height modifiers from existing specs | |
| wood_species | deep_grain (oak/hickory: 1.0x), moderate_grain (ash/walnut: 0.85x) | Deeper grain = slower fill |

## Materials

### AquaCoat White Grain Filler
- Coverage per coat: 15-20 SF/QT (deep grain) to 20-25 SF/QT (moderate grain)
- Default: 60 SF/GAL per coat
- Waste factor: 1.12 (12%)

### Sandpaper
- 220 grit sheets: 1 per 20 SF
- 280/320 grit sheets: 1 per 25 SF
- 400 grit sheets (QT5): 1 per 30 SF

### Second prime coat
- Uses same primer as the parent spec's prime system
- Coverage: standard primer coverage from parent spec

## Wood Species Classification

**Requires grain fill (open grain):**
- Red Oak, White Oak, Ash, Walnut, Mahogany, Hickory, Elm, Chestnut

**Does NOT need grain fill (closed grain):**
- Maple, Cherry, Poplar, Birch, Pine, Alder, MDF

## SOP Modules

```
MOD_GRAIN_PREP       — Sand prep of primed surface (phase: prep)
MOD_GRAIN_FILL       — Fill coat application (phase: apply, repeats by QT)
MOD_GRAIN_INTERSTAGE — Sand between fill coats (phase: interstage, repeats by QT)
MOD_GRAIN_FINAL      — Final sand QT5 only (phase: prep, applies_when QT5)
MOD_GRAIN_SEAL       — Second prime coat + sand (phase: prime)
```

## Spec State Compatibility

- **Input states**: `SS_PRIMED_FIELD`, `SS_PRIMED_FACTORY` (surface must already be primed)
- **Output state**: `SS_GRAIN_FILLED` (ready for finish paint)
- **Chain**: Parent prime spec → Grain Fill spec → Parent finish spec

## UI Changes

### SubstrateDetailPanel
- When substrate is bare_wood + coating_type = paint + substrate is in WOOD_SUBSTRATES:
  - Show "Grain Fill" toggle
  - When enabled, grain fill spec activates
  - No additional config needed (QT follows project/room tier)

### quantity-lookups.js
- When any substrate has `grain_fill: true`, calculate SF and emit `PS_SURFACE_SF.GRAIN_FILL`
- Conversion: LF substrates → 1:1 SF, EA doors → type-based SF lookup, SF → direct

## Database Import

Full SpecFactory pipeline:
1. `spec.json` — spec definition with PS keys, state declarations
2. `research.json` — AquaCoat product data, process documentation
3. `materials.json` — grain filler coverage, sandpaper consumption
4. `sop_modules.json` — 5 modules with task definitions
5. `production.json` — rates per task, tier-based coat counts, modifiers
6. `qa_report.json` — validation against field data

Import into SQLite → regenerate `db-bundle.js`

## What This Spec Does NOT Include

- Stain-grade grain fill (different process — fill then stain, not fill then paint)
- Auto-detection of wood species (user decides when grain fill is needed)
- Built-in/cabinet heuristic quantification (uses existing doctrine methods)
- Product database integration for AquaCoat (manual product reference for now)

## Open Items

- Trim Paint spec has 9 tasks with null production rates — needs to be fixed before grain fill spec can chain correctly with trim finish
- Surface profile modifier values need field calibration
- Door type → SF conversion table needs to be formalized (slab = 21 SF/side baseline)

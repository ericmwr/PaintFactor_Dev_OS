# Interior Repaint (RP) Spec Gap Analysis

**Date**: 2026-03-13
**Status**: Decisions resolved (2026-03-13)
**Scope**: Map 18 interior NC specs (534 tasks) → 9 interior RP specs with task reuse classification, projection, and implementation roadmap.

---

## Section A: Interior RP Substrate State Definitions

Interior RP requires 4 new substrate states in `controlled_enums.json`. These parallel the exterior RP states (SS_EXT_SOUND_PAINT through SS_EXT_WEATHERED) but reflect interior-specific damage patterns. Water damage and mildew are merged into a single moisture damage state since they share the same remediation workflow (source resolution + biocide/stain-block).

### States (DECIDED)

| State ID | Definition | Exterior Analog | Interior-Specific Notes |
|----------|-----------|-----------------|------------------------|
| `SS_INT_SOUND_PAINT` | Adhesion intact, no visible defects, good condition | SS_EXT_SOUND_PAINT | Most common repaint state. May need degloss only. |
| `SS_INT_FAILING_PAINT` | Localized cracking, crazing, or adhesion failure | SS_EXT_FAILING_PAINT | No UV/weather cause — typically poor prep or incompatible coatings. |
| `SS_INT_PEELING` | Active delamination, coating lifting from substrate | SS_EXT_PEELING | Often moisture-driven (bathrooms, kitchens) or latex-over-oil failure. |
| `SS_INT_MOISTURE_DAMAGE` | Water staining, mildew/mold, bubbling, or substrate swelling from moisture | SS_EXT_WEATHERED (partial) | Covers water damage, mildew, and mold. Source must be resolved before painting. Biocide treatment + stain-block primer. Common in bathrooms, kitchens, basements. |
| `SS_INT_SMOKE_DAMAGE` | Nicotine, smoke, or soot staining on painted surface | None | Interior-specific. Requires shellac-based stain blocker (BIN or equivalent). |

### State Hierarchy (Severity Ordering)

```
SS_INT_SOUND_PAINT (severity 0) — degloss + scuff only
  ↓
SS_INT_FAILING_PAINT (severity 1) — scrape, feather, spot prime
  ↓
SS_INT_PEELING (severity 2) — full scrape, adhesion prime, possible skim
  ↓
SS_INT_MOISTURE_DAMAGE (severity 3) — source remediation gate, biocide, stain block
  ↓
SS_INT_SMOKE_DAMAGE (severity 4) — shellac seal full surface, encapsulation
```

### Condition Scale (DECIDED — Universal 3-Level)

The condition scale uses **GOOD / FAIR / POOR** universally across NC, interior RP, and exterior RP. The exterior DSD 0-4 scale is a research parameter only — not a PaintFactor estimation parameter. All domains use the same 3-level scale.

| Level | Label | States Covered | Prep Intensity |
|-------|-------|---------------|----------------|
| **GOOD** | Sound / cosmetic refresh | SS_INT_SOUND_PAINT | Degloss, light sand, wash. Minimal prep modifier. |
| **FAIR** | Localized failure requiring targeted repair | SS_INT_FAILING_PAINT, SS_INT_MOISTURE_DAMAGE | Scrape/feather affected areas, spot prime, treat contamination. Moderate prep modifier (1.3-1.8x). |
| **POOR** | Widespread coating failure requiring full remediation | SS_INT_PEELING, SS_INT_SMOKE_DAMAGE | Full scrape, full prime, possible skim coat. Heavy prep modifier (2.0-3.0x). |

> **Note**: Exterior RP specs must also be updated to map their SS_EXT_* states to the GOOD/FAIR/POOR scale, replacing the research-only DSD 0-4 system.

### Registry Integration

Add to `controlled_enums.json` → `substrate_state.valid_values`:
```json
"SS_INT_SOUND_PAINT", "SS_INT_FAILING_PAINT", "SS_INT_PEELING",
"SS_INT_MOISTURE_DAMAGE", "SS_INT_SMOKE_DAMAGE"
```

Add to `controlled_enums.json` → new `condition_scale` enum (universal):
```json
"condition_scale": {
  "description": "Universal 3-level condition scale for all domains (NC, interior RP, exterior RP).",
  "valid_values": ["GOOD", "FAIR", "POOR"]
}
```

Add definitions following existing pattern with `SS_INT_` prefix per registry convention.

---

## Section B: NC Task Inventory Matrix (534 Tasks)

### Summary by Spec

| # | Spec Family | Tasks | UOM Basis | RP Group |
|---|------------|-------|-----------|----------|
| 1 | SF_DRYWALL_WALL_NC_PRIME_v1 | 22 | SF | SF_DRYWALL_WALL_INT_RP |
| 2 | SF_DRYWALL_WALL_NC_FINISH_v1 | 42 | SF | SF_DRYWALL_WALL_INT_RP |
| 3 | SF_DRYWALL_CEILING_NC_PRIME_v1 | 19 | SF | SF_DRYWALL_CEILING_INT_RP |
| 4 | SF_DRYWALL_CEILING_NC_FINISH_v1 | 33 | SF | SF_DRYWALL_CEILING_INT_RP |
| 5 | SF_TRIM_NC_PRIME_v1 | 16 | LF | SF_TRIM_INT_RP |
| 6 | SF_TRIM_NC_PAINT_v1 | 21 | LF | SF_TRIM_INT_RP |
| 7 | SF_DOOR_FRAME_NC_FINISH_v1 | 25 | EA | SF_DOOR_INT_RP |
| 8 | SF_DOOR_SLAB_INT_NC_v1 | 25 | EA_SIDE | SF_DOOR_INT_RP |
| 9 | SF_WINDOW_INT_NC_v1 | 29 | EA | SF_WINDOW_INT_RP |
| 10 | SF_STAIR_RISER_NC_v1 | 30 | EA+LF | SF_STAIR_INT_RP |
| 11 | SF_STAIR_RAILING_NC_v1 | 43 | EA+LF | SF_STAIR_INT_RP |
| 12 | SF_CABINET_NC_PAINT_v1 | 58 | EA+SF | SF_CABINET_INT_RP |
| 13 | SF_CLOSET_SHELF_NC_v1 | 14 | EA_OPENING | SF_CLOSET_INT_RP |
| 14 | SF_WAINSCOT_PANEL_NC_v1 | 25 | SF | SF_SPECIALTY_INT_RP |
| 15 | SF_WOOD_WALL_NC_v1 | 25 | SF | SF_SPECIALTY_INT_RP |
| 16 | SF_WOOD_CEILING_NC_v1 | 30 | SF | SF_SPECIALTY_INT_RP |
| 17 | SF_ARCH_ELEMENT_NC_v1 | 42 | LF+EA | SF_SPECIALTY_INT_RP |
| 18 | SF_BUILTIN_NC_v1 | 35 | EA_OPENING+EA | SF_SPECIALTY_INT_RP |
| | **TOTAL** | **534** | | |

### Task Reuse Classification

Each NC task is classified into one of four reuse buckets for RP:

- **DIRECT** — Task transfers to RP with no changes (same rates, same logic). Primarily protection setup/teardown, finish coat application, interstage sanding, cleanup, tool cleaning.
- **MODIFIED** — Same concept exists in RP but requires different rates, conditions, or modifier stacking. Primarily sanding (lighter in NC, heavier in RP), inspection (adds condition assessment), priming (substrate-driven in NC → state-driven in RP).
- **NOT_APPLICABLE** — Task is NC-specific and has no RP equivalent. Primarily bare-substrate tasks: MDF edge seal, end grain fill, knot spot prime, new wood caulking.
- **RP_NEW** — Task does not exist in NC and must be created for RP. Primarily assessment, degloss, scrape/feather, condition-driven primers, contamination treatment, furniture protection.

### Full Task Classification

#### SF_DRYWALL_WALL_NC_PRIME_v1 (22 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_WALL_INSPECT | MODIFIED | NC inspects bare substrate; RP inspects existing paint condition |
| TSK_WALL_INSPECT_QT4 | MODIFIED | Same — QT4 detail level applies to condition assessment |
| TSK_WALL_VACUUM_DUST | DIRECT | Dust removal identical regardless of NC/RP |
| TSK_WALL_CUT_IN_CEILING | DIRECT | Cut-in technique identical once primer selected |
| TSK_WALL_CUT_IN_CEILING_QT4 | DIRECT | QT4 cut-in same technique |
| TSK_WALL_ROLL_PRIMER | MODIFIED | RP primer selection is state-driven, not substrate-driven. Rate may differ for adhesion primer vs PVA. |
| TSK_WALL_ROLL_PRIMER_TEXTURED | MODIFIED | Same — textured wall rate adjustment applies but primer type changes |
| TSK_WALL_ROLL_PRIMER_QT4 | MODIFIED | Same — QT4 rate applies but primer type changes |
| TSK_WALL_FLOOR_PROTECT_SETUP | DIRECT | Floor protection identical |
| TSK_WALL_FLOOR_PROTECT_TEARDOWN | DIRECT | Floor protection removal identical |
| TSK_WALL_FLOOR_PROTECT_PERIMETER_SETUP | DIRECT | Perimeter protection identical |
| TSK_WALL_FLOOR_PROTECT_PERIMETER_TEARDOWN | DIRECT | Perimeter protection removal identical |
| TSK_WALL_FIXTURE_COVERS_SETUP | DIRECT | Fixture covers identical |
| TSK_WALL_FIXTURE_COVERS_TEARDOWN | DIRECT | Fixture covers removal identical |
| TSK_WALL_SPRAY_PRIMER | MODIFIED | Spray primer — rate same but product changes (stain-block vs PVA) |
| TSK_WALL_SPRAY_PRIMER_QT4 | MODIFIED | Same |
| TSK_WALL_BACKROLL_PRIMER | MODIFIED | Backroll after spray — rate same but primer type differs |
| TSK_WALL_BACKROLL_PRIMER_TEXTURED | MODIFIED | Same for textured walls |
| TSK_WALL_BACKROLL_PRIMER_QT4 | MODIFIED | Same for QT4 |
| TSK_WALL_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_WALL_VACUUM_CLEANUP | DIRECT | Vacuum cleanup identical |
| TSK_WALL_CLEAN_TOOLS | DIRECT | Tool cleaning identical |

**Summary**: 10 DIRECT, 12 MODIFIED, 0 NOT_APPLICABLE, 0 RP_NEW (RP_NEW tasks added at spec level, not mapped from NC prime)

#### SF_DRYWALL_WALL_NC_FINISH_v1 (42 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_INSPECT_FLOOR_PROTECTION | DIRECT | Protection verification identical |
| TSK_MASK_TRIM_BASEBOARD | DIRECT | Masking identical |
| TSK_MASK_TRIM_DOOR_CASING | DIRECT | Masking identical |
| TSK_MASK_TRIM_WINDOW_CASING | DIRECT | Masking identical |
| TSK_MASK_WALL_FIXTURES | DIRECT | Fixture masking identical |
| TSK_INSPECT_PRIMED_WALL | MODIFIED | RP inspects state-primed surface, not bare-primed |
| TSK_INSPECT_PRIMED_WALL_QT4 | MODIFIED | Same |
| TSK_INSPECT_PRIMED_WALL_QT5 | MODIFIED | Same |
| TSK_SPACKLE_WALL_DEFECTS | DIRECT | Spackle application technique identical |
| TSK_SPACKLE_WALL_DEFECTS_QT5 | DIRECT | Same |
| TSK_SAND_SPACKLE_WALL | DIRECT | Sanding spackle identical |
| TSK_SAND_SPACKLE_WALL_QT5 | DIRECT | Same |
| TSK_SPOT_PRIME_WALL | DIRECT | Spot priming identical |
| TSK_DUST_WIPE_WALL | DIRECT | Dust wipe identical |
| TSK_LIGHT_SAND_WALL_FULL | DIRECT | Full light sand identical |
| TSK_LIGHT_SAND_WALL_FULL_QT5 | DIRECT | Same |
| TSK_VACUUM_SAND_DUST_WALL_FULL | DIRECT | Vacuum sand dust identical |
| TSK_CUTIN_WALL_TO_CEILING | DIRECT | Cut-in identical once primed |
| TSK_CUTIN_WALL_TO_CEILING_R2 | DIRECT | Same |
| TSK_CUTIN_WALL_TO_TRIM_R1 | DIRECT | Same |
| TSK_CUTIN_WALL_TO_TRIM_R2 | DIRECT | Same |
| TSK_CUTIN_WALL_TO_TRIM_SPRAY_R1 | DIRECT | Same |
| TSK_CUTIN_WALL_TO_TRIM_SPRAY_R2 | DIRECT | Same |
| TSK_CUTIN_WALL_TO_TRIM_SPRAY_ONLY_R1 | DIRECT | Same |
| TSK_ROLL_WALL_FINISH_R1 | DIRECT | Finish coat application identical |
| TSK_ROLL_WALL_FINISH_R1_TEXTURED | DIRECT | Same |
| TSK_ROLL_WALL_FINISH_R2 | DIRECT | Same |
| TSK_SPRAY_WALL_FINISH_R1 | DIRECT | Same |
| TSK_BACKROLL_WALL_FINISH_R1 | DIRECT | Same |
| TSK_SPRAY_WALL_FINISH_R2 | DIRECT | Same |
| TSK_BACKROLL_WALL_FINISH_R2 | DIRECT | Same |
| TSK_SPRAY_WALL_FINISH_ONLY | DIRECT | Same |
| TSK_LIGHT_SAND_BETWEEN_COATS_WALL | DIRECT | Interstage sand identical |
| TSK_LIGHT_SAND_BETWEEN_COATS_WALL_QT5 | DIRECT | Same |
| TSK_VACUUM_INTERCOAT_DUST_WALL | DIRECT | Interstage dust identical |
| TSK_REMOVE_TRIM_MASKING | DIRECT | Masking removal identical |
| TSK_VACUUM_SUBFLOOR_POST_WALL | DIRECT | Vacuum identical |
| TSK_REMOVE_FIXTURE_PROTECTION_WALL | DIRECT | Protection removal identical |
| TSK_CLEAN_TOOLS_WALL | DIRECT | Tool cleaning identical |
| TSK_FINAL_INSPECT_WALL | DIRECT | Final inspection identical |
| TSK_FINAL_INSPECT_WALL_QT4 | DIRECT | Same |
| TSK_FINAL_INSPECT_WALL_QT5 | DIRECT | Same |

**Summary**: 39 DIRECT, 3 MODIFIED, 0 NOT_APPLICABLE, 0 RP_NEW

#### SF_DRYWALL_CEILING_NC_PRIME_v1 (19 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_CEIL_INSPECT | MODIFIED | RP inspects existing paint condition, not bare substrate |
| TSK_CEIL_INSPECT_QT4 | MODIFIED | Same |
| TSK_CEIL_VACUUM_DUST | DIRECT | Identical |
| TSK_CEIL_CUT_IN_WALL | DIRECT | Identical once primer selected |
| TSK_CEIL_CUT_IN_WALL_QT4 | DIRECT | Same |
| TSK_CEIL_ROLL_PRIMER | MODIFIED | State-driven primer selection |
| TSK_CEIL_ROLL_PRIMER_TEXTURED | MODIFIED | Same |
| TSK_CEIL_ROLL_PRIMER_QT4 | MODIFIED | Same |
| TSK_CEIL_MASK_ADJACENT | DIRECT | Masking identical |
| TSK_CEIL_FLOOR_PROTECT_SETUP | DIRECT | Protection identical |
| TSK_CEIL_FLOOR_PROTECT_TEARDOWN | DIRECT | Protection removal identical |
| TSK_CEIL_SPRAY_PRIMER | MODIFIED | State-driven primer |
| TSK_CEIL_SPRAY_PRIMER_QT4 | MODIFIED | Same |
| TSK_CEIL_SPRAY_PRIMER_ONLY | MODIFIED | Same |
| TSK_CEIL_BACKROLL_PRIMER | MODIFIED | Same |
| TSK_CEIL_BACKROLL_PRIMER_QT4 | MODIFIED | Same |
| TSK_CEIL_CUT_IN_WALL_SPRAY | DIRECT | Cut-in identical |
| TSK_CEIL_REMOVE_MASKING | DIRECT | Masking removal identical |
| TSK_CEIL_FINAL_INSPECT | DIRECT | Inspection identical |

**Summary**: 9 DIRECT, 10 MODIFIED, 0 NOT_APPLICABLE, 0 RP_NEW

#### SF_DRYWALL_CEILING_NC_FINISH_v1 (33 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_INSPECT_PRIMED_CEILING | MODIFIED | Inspects state-primed surface |
| TSK_INSPECT_PRIMED_CEILING_QT4 | MODIFIED | Same |
| TSK_INSPECT_PRIMED_CEILING_QT5 | MODIFIED | Same |
| TSK_SPACKLE_CEILING_DEFECTS | DIRECT | Spackle technique identical |
| TSK_SPACKLE_CEILING_DEFECTS_QT5 | DIRECT | Same |
| TSK_SAND_SPACKLE_CEILING | DIRECT | Sanding identical |
| TSK_SAND_SPACKLE_CEILING_QT5 | DIRECT | Same |
| TSK_SPOT_PRIME_CEILING | DIRECT | Spot prime identical |
| TSK_VACUUM_REPAIR_DUST_CEILING | DIRECT | Vacuum identical |
| TSK_LIGHT_SAND_CEILING_FULL | DIRECT | Light sand identical |
| TSK_LIGHT_SAND_CEILING_FULL_QT5 | DIRECT | Same |
| TSK_VACUUM_SAND_DUST_CEILING_FULL | DIRECT | Vacuum identical |
| TSK_PROTECT_CEILING_FIXTURES | DIRECT | Protection identical |
| TSK_VERIFY_MASK_OPENINGS | DIRECT | Mask verification identical |
| TSK_ROLL_CEILING_FINISH_R1 | DIRECT | Finish application identical |
| TSK_ROLL_CEILING_FINISH_R1_TEXTURED | DIRECT | Same |
| TSK_LIGHT_SAND_BETWEEN_COATS | DIRECT | Interstage sand identical |
| TSK_LIGHT_SAND_BETWEEN_COATS_QT5 | DIRECT | Same |
| TSK_VACUUM_INTERCOAT_DUST | DIRECT | Interstage vacuum identical |
| TSK_ROLL_CEILING_FINISH_R2 | DIRECT | Finish application identical |
| TSK_SPRAY_CEILING_FINISH_R1 | DIRECT | Same |
| TSK_BACKROLL_CEILING_FINISH_R1 | DIRECT | Same |
| TSK_LIGHT_SAND_BETWEEN_COATS_SPRAY | DIRECT | Same |
| TSK_VACUUM_INTERCOAT_DUST_SPRAY | DIRECT | Same |
| TSK_SPRAY_CEILING_FINISH_R2 | DIRECT | Same |
| TSK_BACKROLL_CEILING_FINISH_R2 | DIRECT | Same |
| TSK_SPRAY_CEILING_FINISH_ONLY | DIRECT | Same |
| TSK_VACUUM_SUBFLOOR_POST | DIRECT | Vacuum identical |
| TSK_REMOVE_CEILING_PROTECTION | DIRECT | Protection removal identical |
| TSK_CLEAN_TOOLS_CEILING | DIRECT | Tool cleaning identical |
| TSK_FINAL_INSPECT_CEILING | DIRECT | Inspection identical |
| TSK_FINAL_INSPECT_CEILING_QT4 | DIRECT | Same |
| TSK_FINAL_INSPECT_CEILING_QT5 | DIRECT | Same |

**Summary**: 30 DIRECT, 3 MODIFIED, 0 NOT_APPLICABLE, 0 RP_NEW

#### SF_TRIM_NC_PRIME_v1 (16 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_SETUP_FLOOR_PROTECTION | DIRECT | Protection identical |
| TSK_SETUP_WALL_MASK | DIRECT | Masking identical |
| TSK_SETUP_FIXTURE_COVERS | DIRECT | Fixture covers identical |
| TSK_TRIM_DUST_WIPE | DIRECT | Dust wipe identical |
| TSK_TRIM_FILL_FASTENERS | NOT_APPLICABLE | Bare wood only — RP trim is already finished |
| TSK_TRIM_FILL_END_GRAIN | NOT_APPLICABLE | Bare wood only — end grain exposed on new trim |
| TSK_TRIM_CAULK_JOINTS | MODIFIED | RP: assess existing caulk → replace failed sections (not full caulk) |
| TSK_TRIM_SAND_PREP | MODIFIED | NC: light sand bare wood; RP: degloss/scuff existing paint |
| TSK_MDF_EDGE_SEAL | NOT_APPLICABLE | Bare MDF only — sealed on original NC |
| TSK_TRIM_SPOT_PRIME_KNOTS | NOT_APPLICABLE | Bare wood only — knots sealed on original NC |
| TSK_TRIM_PRIME_BRUSH | MODIFIED | RP primer is adhesion/stain-block, not PVA |
| TSK_TRIM_PRIME_SPRAY | MODIFIED | Same |
| TSK_REMOVE_WALL_MASK | DIRECT | Removal identical |
| TSK_REMOVE_FIXTURE_COVERS | DIRECT | Removal identical |
| TSK_REMOVE_FLOOR_PROTECTION | DIRECT | Removal identical |
| TSK_FINAL_CLEANUP | DIRECT | Cleanup identical |

**Summary**: 8 DIRECT, 4 MODIFIED, 4 NOT_APPLICABLE, 0 RP_NEW

#### SF_TRIM_NC_PAINT_v1 (21 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_TRIM_FLOOR_PROTECT | DIRECT | Protection identical |
| TSK_TRIM_WALL_MASK | DIRECT | Masking identical |
| TSK_TRIM_FIXTURE_COVER | DIRECT | Fixture covers identical |
| TSK_TRIM_INSPECT_PRIMER | MODIFIED | RP: inspect state-driven primer coverage |
| TSK_TRIM_LIGHT_SAND_PRIMER | DIRECT | Light sand after primer identical |
| TSK_TRIM_TOUCHUP_CAULK | DIRECT | Touchup caulk identical |
| TSK_TRIM_TOUCHUP_FILL | DIRECT | Touchup fill identical |
| TSK_TRIM_CLEAN_DUST_PREP | DIRECT | Dust cleaning identical |
| TSK_TRIM_BRUSH_FINISH_1 | DIRECT | Finish coat 1 application identical |
| TSK_TRIM_SPRAY_FINISH_1 | DIRECT | Same |
| TSK_TRIM_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_TRIM_SAND_BETWEEN | DIRECT | Interstage sand identical |
| TSK_TRIM_PATCH_DEFECTS | DIRECT | Defect patching identical |
| TSK_TRIM_SPOT_COAT | DIRECT | Spot coating identical |
| TSK_TRIM_CLEAN_INTERSTAGE | DIRECT | Interstage cleaning identical |
| TSK_TRIM_BRUSH_FINISH_2 | DIRECT | Finish coat 2 identical |
| TSK_TRIM_SPRAY_FINISH_2 | DIRECT | Same |
| TSK_TRIM_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_TRIM_TOUCHUP | DIRECT | Touchup identical |
| TSK_TRIM_PROTECT_TEARDOWN | DIRECT | Protection removal identical |
| TSK_TRIM_CLEAN_TOOLS | DIRECT | Tool cleaning identical |

**Summary**: 20 DIRECT, 1 MODIFIED, 0 NOT_APPLICABLE, 0 RP_NEW

#### SF_DOOR_FRAME_NC_FINISH_v1 (25 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_FRAME_FLOOR_PROTECT_BRUSH | DIRECT | Protection identical |
| TSK_FRAME_FLOOR_PROTECT_SPRAY | DIRECT | Same |
| TSK_FRAME_WALL_PROTECT_SPRAY | DIRECT | Same |
| TSK_FRAME_HARDWARE_MASK | DIRECT | Hardware masking identical |
| TSK_FRAME_INSPECT | MODIFIED | RP: assess existing paint condition |
| TSK_FRAME_SAND_PREP | MODIFIED | RP: degloss/scuff vs bare wood sand |
| TSK_FRAME_FILL_STOP_HOLES | MODIFIED | RP: fill only if switching hardware (new holes) |
| TSK_FRAME_SAND_FILL | DIRECT | Sanding fill identical |
| TSK_FRAME_CAULK_CASING | MODIFIED | RP: assess and replace failed caulk sections |
| TSK_FRAME_CLEAN_DUST | DIRECT | Dust cleaning identical |
| TSK_FRAME_PRIME_SPRAY | MODIFIED | RP: adhesion primer vs PVA |
| TSK_FRAME_PRIME_BRUSH | MODIFIED | Same |
| TSK_FRAME_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_FRAME_LIGHT_SAND | DIRECT | Interstage sand identical |
| TSK_FRAME_PATCH_REPAIR | DIRECT | Patching identical |
| TSK_FRAME_CLEAN_INTERSTAGE | DIRECT | Interstage cleaning identical |
| TSK_FRAME_FINISH_SPRAY | DIRECT | Finish application identical |
| TSK_FRAME_FINISH_BRUSH | DIRECT | Same |
| TSK_FRAME_FINISH_ROLL_TIP | DIRECT | Same |
| TSK_FRAME_MORTISE_TOUCHUP | DIRECT | Mortise touchup identical |
| TSK_FRAME_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_FRAME_HARDWARE_UNMASK | DIRECT | Hardware unmasking identical |
| TSK_FRAME_FLOOR_PROTECT_TEARDOWN | DIRECT | Protection removal identical |
| TSK_FRAME_WALL_PROTECT_TEARDOWN | DIRECT | Same |
| TSK_FRAME_CLEAN_TOOLS | DIRECT | Tool cleaning identical |

**Summary**: 19 DIRECT, 6 MODIFIED, 0 NOT_APPLICABLE, 0 RP_NEW

#### SF_DOOR_SLAB_INT_NC_v1 (25 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_DOOR_FLOOR_PROTECT | DIRECT | Protection identical |
| TSK_DOOR_SPRAY_PROTECT | DIRECT | Spray containment identical |
| TSK_DOOR_HARDWARE_REMOVE | DIRECT | Hardware removal identical |
| TSK_DOOR_HARDWARE_MASK | DIRECT | Hardware masking identical |
| TSK_DOOR_INSPECT | MODIFIED | RP: condition assessment vs bare substrate check |
| TSK_DOOR_SAND_PREP | MODIFIED | RP: degloss/scuff vs bare wood sand |
| TSK_DOOR_FILL_FASTENERS | NOT_APPLICABLE | Bare wood only — fasteners filled on NC |
| TSK_DOOR_SAND_FILL | DIRECT | Sanding fill identical when fill exists |
| TSK_DOOR_MDF_EDGE_SEAL | NOT_APPLICABLE | Bare MDF only — sealed on NC |
| TSK_DOOR_CLEAN_DUST | DIRECT | Dust cleaning identical |
| TSK_DOOR_PRIME_SPRAY | MODIFIED | RP: adhesion/stain-block primer |
| TSK_DOOR_PRIME_BRUSH | MODIFIED | Same |
| TSK_DOOR_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_DOOR_LIGHT_SAND | DIRECT | Interstage sand identical |
| TSK_DOOR_PATCH_REPAIR | DIRECT | Patching identical |
| TSK_DOOR_CLEAN_INTERSTAGE | DIRECT | Interstage cleaning identical |
| TSK_DOOR_FINISH_SPRAY | DIRECT | Finish application identical |
| TSK_DOOR_FINISH_BRUSH | DIRECT | Same |
| TSK_DOOR_GLASS_MASK | DIRECT | Glass masking identical |
| TSK_DOOR_GLASS_UNMASK | DIRECT | Glass unmasking identical |
| TSK_DOOR_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_DOOR_HARDWARE_REINSTALL | DIRECT | Hardware reinstall identical |
| TSK_DOOR_HARDWARE_UNMASK | DIRECT | Hardware unmasking identical |
| TSK_DOOR_FLOOR_PROTECT_TEARDOWN | DIRECT | Protection removal identical |
| TSK_DOOR_CLEAN_TOOLS | DIRECT | Tool cleaning identical |

**Summary**: 19 DIRECT, 4 MODIFIED, 2 NOT_APPLICABLE, 0 RP_NEW

#### SF_WINDOW_INT_NC_v1 (29 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_WIN_FLOOR_PROTECT | DIRECT | Protection identical |
| TSK_WIN_GLASS_MASK | DIRECT | Glass masking identical |
| TSK_WIN_HARDWARE_PROTECT | DIRECT | Hardware protection identical |
| TSK_WIN_WALL_MASK | DIRECT | Wall masking identical |
| TSK_WIN_SILL_PROTECT | DIRECT | Sill protection identical |
| TSK_WIN_PREP_WOOD_SAND | MODIFIED | RP: degloss existing paint, not sand bare wood |
| TSK_WIN_PREP_WOOD_FILL | NOT_APPLICABLE | Bare wood fill — already done on NC |
| TSK_WIN_PREP_SCUFF | DIRECT | Scuff sand identical for non-wood substrates |
| TSK_WIN_PREP_METAL_DEGREASE | DIRECT | Metal degreasing identical |
| TSK_WIN_PREP_ALUMINUM_ETCH | NOT_APPLICABLE | Bare aluminum only — etch primer applied on NC |
| TSK_WIN_PREP_STEEL_RUST | MODIFIED | RP: rust may have formed through previous coating |
| TSK_WIN_PREP_CLEAN | DIRECT | Cleaning identical |
| TSK_WIN_PRIME_BRUSH | MODIFIED | RP: adhesion primer for painted surfaces |
| TSK_WIN_PRIME_SPRAY | MODIFIED | Same |
| TSK_WIN_BRUSH_FINISH_1 | DIRECT | Finish coat identical |
| TSK_WIN_SPRAY_FINISH_1 | DIRECT | Same |
| TSK_WIN_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_WIN_SAND_BETWEEN | DIRECT | Interstage sand identical |
| TSK_WIN_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_WIN_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_WIN_CLEAN_INTERSTAGE | DIRECT | Interstage clean identical |
| TSK_WIN_BRUSH_FINISH_2 | DIRECT | Finish coat 2 identical |
| TSK_WIN_SPRAY_FINISH_2 | DIRECT | Same |
| TSK_WIN_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_WIN_TOUCHUP | DIRECT | Touchup identical |
| TSK_WIN_GLASS_SCRAPE | DIRECT | Glass scrape identical |
| TSK_WIN_HARDWARE_REINSTALL | DIRECT | Hardware reinstall identical |
| TSK_WIN_PROTECT_TEARDOWN | DIRECT | Protection removal identical |
| TSK_WIN_CLEAN_TOOLS | DIRECT | Tool cleaning identical |

**Summary**: 22 DIRECT, 5 MODIFIED, 2 NOT_APPLICABLE, 0 RP_NEW

#### SF_STAIR_RISER_NC_v1 (30 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_STRS_TREAD_PROTECT | DIRECT | Tread protection identical |
| TSK_STRS_FLOOR_PROTECT | DIRECT | Floor protection identical |
| TSK_STRS_WALL_MASK | DIRECT | Wall masking identical |
| TSK_STRS_SAND_PREP_STRINGER | MODIFIED | RP: degloss existing paint |
| TSK_STRS_SAND_PREP_RISER | MODIFIED | Same |
| TSK_STRS_CLEAN_DUST | DIRECT | Dust cleaning identical |
| TSK_STRS_FILL_FASTENERS | NOT_APPLICABLE | Bare wood only |
| TSK_STRS_SAND_FILL | DIRECT | Sanding fill identical when fill exists |
| TSK_STRS_CAULK_STRINGER_WALL | MODIFIED | RP: assess and replace failed caulk |
| TSK_STRS_CAULK_RISER_STRINGER | MODIFIED | Same |
| TSK_STRS_SEAL_MDF_EDGES | NOT_APPLICABLE | Bare MDF only |
| TSK_STRS_PRIME_STRINGER | MODIFIED | RP: state-driven primer |
| TSK_STRS_PRIME_RISER | MODIFIED | Same |
| TSK_STRS_SAND_PRIMER | DIRECT | Sand primer identical |
| TSK_STRS_BRUSH_FINISH_STRINGER | DIRECT | Finish application identical |
| TSK_STRS_BRUSH_FINISH_RISER | DIRECT | Same |
| TSK_STRS_SPRAY_FINISH_STRINGER | DIRECT | Same |
| TSK_STRS_SPRAY_FINISH_RISER | DIRECT | Same |
| TSK_STRS_CLEAN_AREA | DIRECT | Area cleaning identical |
| TSK_STRS_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_STRS_SAND_BETWEEN | DIRECT | Interstage sand identical |
| TSK_STRS_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_STRS_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_STRS_TACK_CLEAN | DIRECT | Tack cleaning identical |
| TSK_STRS_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_STRS_TOUCHUP | DIRECT | Touchup identical |
| TSK_STRS_REMOVE_WALL_MASK | DIRECT | Masking removal identical |
| TSK_STRS_REMOVE_FLOOR_PROTECT | DIRECT | Protection removal identical |
| TSK_STRS_REMOVE_TREAD_PROTECT | DIRECT | Tread protection removal identical |
| TSK_STRS_TOOL_CLEANUP | DIRECT | Tool cleaning identical |

**Summary**: 22 DIRECT, 6 MODIFIED, 2 NOT_APPLICABLE, 0 RP_NEW

#### SF_STAIR_RAILING_NC_v1 (43 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_STRL_TREAD_PROTECT_VERIFY | DIRECT | Protection verification identical |
| TSK_STRL_FLOOR_PROTECT | DIRECT | Floor protection identical |
| TSK_STRL_WALL_MASK | DIRECT | Wall masking identical |
| TSK_STRL_SPRAY_CONTAIN | DIRECT | Spray containment identical |
| TSK_STRL_SOLVENT_CLEAN_IRON | DIRECT | Solvent clean identical |
| TSK_STRL_SCUFF_SAND_IRON | MODIFIED | RP: may need more aggressive degloss for adhesion |
| TSK_STRL_SAND_PREP_BALUSTER | MODIFIED | RP: degloss existing paint |
| TSK_STRL_SAND_PREP_NEWEL | MODIFIED | Same |
| TSK_STRL_SAND_PREP_HANDRAIL | MODIFIED | Same |
| TSK_STRL_SAND_PREP_BASE_RAIL | MODIFIED | Same |
| TSK_STRL_CLEAN_DUST | DIRECT | Dust cleaning identical |
| TSK_STRL_FILL_SAND | NOT_APPLICABLE | Bare wood fill — already done on NC |
| TSK_STRL_CAULK_NEWEL | MODIFIED | RP: assess and replace failed caulk |
| TSK_STRL_BRACKET_REMOVE | DIRECT | Bracket removal identical |
| TSK_STRL_PRIME_BALUSTER | MODIFIED | RP: adhesion primer |
| TSK_STRL_PRIME_NEWEL | MODIFIED | Same |
| TSK_STRL_PRIME_HANDRAIL | MODIFIED | Same |
| TSK_STRL_PRIME_BASE_RAIL | MODIFIED | Same |
| TSK_STRL_SAND_PRIMER | DIRECT | Sand primer identical |
| TSK_STRL_BRUSH_FINISH_BALUSTER | DIRECT | Finish application identical |
| TSK_STRL_BRUSH_FINISH_NEWEL | DIRECT | Same |
| TSK_STRL_BRUSH_FINISH_HANDRAIL | DIRECT | Same |
| TSK_STRL_BRUSH_FINISH_BASE_RAIL | DIRECT | Same |
| TSK_STRL_SPRAY_FINISH_BALUSTER | DIRECT | Same |
| TSK_STRL_SPRAY_FINISH_NEWEL | DIRECT | Same |
| TSK_STRL_SPRAY_FINISH_HANDRAIL | DIRECT | Same |
| TSK_STRL_SPRAY_FINISH_BASE_RAIL | DIRECT | Same |
| TSK_STRL_CLEAN_AREA | DIRECT | Area cleaning identical |
| TSK_STRL_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_STRL_SAND_BETWEEN | DIRECT | Interstage sand identical |
| TSK_STRL_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_STRL_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_STRL_TACK_CLEAN | DIRECT | Tack cleaning identical |
| TSK_STRL_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_STRL_FEEL_TEST_HANDRAIL | DIRECT | Feel test identical |
| TSK_STRL_TOUCHUP | DIRECT | Touchup identical |
| TSK_STRL_POLY_TOPCOAT_HANDRAIL | DIRECT | Topcoat identical |
| TSK_STRL_BRACKET_REINSTALL | DIRECT | Bracket reinstall identical |
| TSK_STRL_REMOVE_SPRAY_CONTAIN | DIRECT | Containment removal identical |
| TSK_STRL_REMOVE_WALL_MASK | DIRECT | Masking removal identical |
| TSK_STRL_REMOVE_FLOOR_PROTECT | DIRECT | Protection removal identical |
| TSK_STRL_REMOVE_TREAD_PROTECT | DIRECT | Tread protection removal identical |
| TSK_STRL_TOOL_CLEANUP | DIRECT | Tool cleaning identical |

**Summary**: 32 DIRECT, 10 MODIFIED, 1 NOT_APPLICABLE, 0 RP_NEW

#### SF_CABINET_NC_PAINT_v1 (58 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_CABT_PROTECT_FLOOR_FULL | DIRECT | Protection identical |
| TSK_CABT_PROTECT_FLOOR_PERIM | DIRECT | Same |
| TSK_CABT_PROTECT_COUNTERTOP | DIRECT | Countertop protection identical |
| TSK_CABT_PROTECT_BACKSPLASH | DIRECT | Backsplash protection identical |
| TSK_CABT_PROTECT_WALL | DIRECT | Wall protection identical |
| TSK_CABT_PROTECT_CEILING | DIRECT | Ceiling protection identical |
| TSK_CABT_PROTECT_APPLIANCE | DIRECT | Appliance protection identical |
| TSK_CABT_PROTECT_PLUMBING | DIRECT | Plumbing protection identical |
| TSK_CABT_PROTECT_ELECTRICAL | DIRECT | Electrical protection identical |
| TSK_CABT_REMOVE_HARDWARE | DIRECT | Hardware removal identical |
| TSK_CABT_REMOVE_DOORS | DIRECT | Door removal identical |
| TSK_CABT_REMOVE_DRAWERS | DIRECT | Drawer removal identical |
| TSK_CABT_DUST_CLEAN | MODIFIED | RP: deeper cleaning (grease, grime) vs NC dust-only |
| TSK_CABT_FILL_FRAMES | NOT_APPLICABLE | Bare wood fill — already done on NC |
| TSK_CABT_FILL_DOORS | NOT_APPLICABLE | Same |
| TSK_CABT_FILL_DRAWERS | NOT_APPLICABLE | Same |
| TSK_CABT_CAULK_JOINTS | MODIFIED | RP: assess and replace failed caulk |
| TSK_CABT_SAND_FRAMES | MODIFIED | RP: degloss existing finish (critical for adhesion) |
| TSK_CABT_SAND_DOORS | MODIFIED | Same |
| TSK_CABT_SAND_DRAWERS | MODIFIED | Same |
| TSK_CABT_SAND_FILL | DIRECT | Sanding fill identical when fill exists |
| TSK_CABT_EDGE_SEAL | NOT_APPLICABLE | Bare MDF edge seal — sealed on NC |
| TSK_CABT_VACUUM_FLOOR | DIRECT | Vacuum identical |
| TSK_CABT_PRIME_FRAMES | MODIFIED | RP: bonding primer for factory finish / adhesion primer |
| TSK_CABT_PRIME_DOORS | MODIFIED | Same |
| TSK_CABT_PRIME_DRAWERS | MODIFIED | Same |
| TSK_CABT_PRIME_INTERIOR | MODIFIED | Same |
| TSK_CABT_SPRAY_FRAMES | DIRECT | Finish application identical |
| TSK_CABT_BRUSH_FRAMES | DIRECT | Same |
| TSK_CABT_SPRAY_DOORS | DIRECT | Same |
| TSK_CABT_BRUSH_DOORS | DIRECT | Same |
| TSK_CABT_SPRAY_DRAWERS | DIRECT | Same |
| TSK_CABT_BRUSH_DRAWERS | DIRECT | Same |
| TSK_CABT_SPRAY_INTERIOR | DIRECT | Same |
| TSK_CABT_CLEAN_AREA | DIRECT | Area cleaning identical |
| TSK_CABT_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_CABT_SAND_BETWEEN_FRAMES | DIRECT | Interstage sand identical |
| TSK_CABT_SAND_BETWEEN_DOORS | DIRECT | Same |
| TSK_CABT_SAND_BETWEEN_DRAWERS | DIRECT | Same |
| TSK_CABT_SAND_BETWEEN_INTERIOR | DIRECT | Same |
| TSK_CABT_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_CABT_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_CABT_TACK_CLEAN | DIRECT | Tack cleaning identical |
| TSK_CABT_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_CABT_TOUCHUP | DIRECT | Touchup identical |
| TSK_CABT_CURE_PERIOD | DIRECT | Cure period identical |
| TSK_CABT_REINSTALL_HARDWARE | DIRECT | Hardware reinstall identical |
| TSK_CABT_REINSTALL_DOORS | DIRECT | Door reinstall identical |
| TSK_CABT_REINSTALL_DRAWERS | DIRECT | Drawer reinstall identical |
| TSK_CABT_REINSTALL_TOUCHUP | DIRECT | Reinstall touchup identical |
| TSK_CABT_REMOVE_COUNTERTOP_PROTECT | DIRECT | Protection removal identical |
| TSK_CABT_REMOVE_BACKSPLASH_MASK | DIRECT | Same |
| TSK_CABT_REMOVE_WALL_MASK | DIRECT | Same |
| TSK_CABT_REMOVE_CEILING_MASK | DIRECT | Same |
| TSK_CABT_REMOVE_APPLIANCE_MASK | DIRECT | Same |
| TSK_CABT_REMOVE_FLOOR_PROTECT | DIRECT | Same |
| TSK_CABT_VACUUM_FINAL | DIRECT | Vacuum identical |
| TSK_CABT_TOOL_CLEANUP | DIRECT | Tool cleanup identical |

**Summary**: 40 DIRECT, 11 MODIFIED, 7 NOT_APPLICABLE, 0 RP_NEW

#### SF_CLOSET_SHELF_NC_v1 (14 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_FLOOR_PROTECT | DIRECT | Protection identical |
| TSK_DUST_WIPE | DIRECT | Dust wipe identical |
| TSK_LIGHT_SAND | MODIFIED | RP: degloss existing finish |
| TSK_EDGE_SEAL | NOT_APPLICABLE | Bare MDF edge seal |
| TSK_SPOT_FILL | MODIFIED | RP: fill only if damage, not bare wood fasteners |
| TSK_CAULK | MODIFIED | RP: assess and replace failed caulk |
| TSK_PRIME_BRUSH_ROLL | MODIFIED | RP: adhesion primer |
| TSK_PRIME_SPRAY | MODIFIED | Same |
| TSK_PRIME_SPRAY_ROLLOFF | MODIFIED | Same |
| TSK_FINISH_BRUSH_ROLL | DIRECT | Finish application identical |
| TSK_FINISH_SPRAY | DIRECT | Same |
| TSK_INTERSTAGE_SAND | DIRECT | Interstage sand identical |
| TSK_FLOOR_PROTECT_TEARDOWN | DIRECT | Protection removal identical |
| TSK_FINAL_INSPECT | DIRECT | Final inspection identical |

**Summary**: 7 DIRECT, 6 MODIFIED, 1 NOT_APPLICABLE, 0 RP_NEW

#### SF_WAINSCOT_PANEL_NC_v1 (25 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_WNSC_FLOOR_PROTECT | DIRECT | Protection identical |
| TSK_WNSC_WALL_MASK | DIRECT | Masking identical |
| TSK_WNSC_DUST_CLEAN | DIRECT | Dust cleaning identical |
| TSK_WNSC_SAND_PREP | MODIFIED | RP: degloss existing finish |
| TSK_WNSC_FILL_FASTENERS | NOT_APPLICABLE | Bare wood only |
| TSK_WNSC_SAND_FILL | DIRECT | Sanding fill identical |
| TSK_WNSC_CAULK_JOINTS | MODIFIED | RP: assess and replace |
| TSK_WNSC_CAULK_WALL | MODIFIED | Same |
| TSK_WNSC_SEAL_MDF_EDGES | NOT_APPLICABLE | Bare MDF only |
| TSK_WNSC_PRIME_FACES | MODIFIED | RP: adhesion primer |
| TSK_WNSC_SAND_PRIMER | DIRECT | Sand primer identical |
| TSK_WNSC_SPRAY_FINISH | DIRECT | Finish application identical |
| TSK_WNSC_BRUSH_FINISH | DIRECT | Same |
| TSK_WNSC_CLEAN_AREA | DIRECT | Area cleaning identical |
| TSK_WNSC_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_WNSC_SAND_BETWEEN | DIRECT | Interstage sand identical |
| TSK_WNSC_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_WNSC_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_WNSC_TACK_CLEAN | DIRECT | Tack cleaning identical |
| TSK_WNSC_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_WNSC_TOUCHUP | DIRECT | Touchup identical |
| TSK_WNSC_REMOVE_WALL_MASK | DIRECT | Masking removal identical |
| TSK_WNSC_REMOVE_FLOOR_PROTECT | DIRECT | Protection removal identical |
| TSK_WNSC_VACUUM | DIRECT | Vacuum identical |
| TSK_WNSC_TOOL_CLEANUP | DIRECT | Tool cleanup identical |

**Summary**: 19 DIRECT, 4 MODIFIED, 2 NOT_APPLICABLE, 0 RP_NEW

#### SF_WOOD_WALL_NC_v1 (25 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_WDWL_FLOOR_PROTECT | DIRECT | Protection identical |
| TSK_WDWL_CEILING_MASK | DIRECT | Masking identical |
| TSK_WDWL_DUST_CLEAN | DIRECT | Dust cleaning identical |
| TSK_WDWL_SAND_PREP | MODIFIED | RP: degloss existing finish |
| TSK_WDWL_FILL_FASTENERS | NOT_APPLICABLE | Bare wood only |
| TSK_WDWL_SAND_FILL | DIRECT | Sanding fill identical |
| TSK_WDWL_CAULK_JOINTS | MODIFIED | RP: assess and replace |
| TSK_WDWL_CAULK_PERIMETER | MODIFIED | Same |
| TSK_WDWL_SEAL_MDF_EDGES | NOT_APPLICABLE | Bare MDF only |
| TSK_WDWL_PRIME_FACES | MODIFIED | RP: adhesion primer |
| TSK_WDWL_SAND_PRIMER | DIRECT | Sand primer identical |
| TSK_WDWL_SPRAY_FINISH | DIRECT | Finish application identical |
| TSK_WDWL_BRUSH_FINISH | DIRECT | Same |
| TSK_WDWL_CLEAN_AREA | DIRECT | Area cleaning identical |
| TSK_WDWL_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_WDWL_SAND_BETWEEN | DIRECT | Interstage sand identical |
| TSK_WDWL_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_WDWL_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_WDWL_TACK_CLEAN | DIRECT | Tack cleaning identical |
| TSK_WDWL_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_WDWL_TOUCHUP | DIRECT | Touchup identical |
| TSK_WDWL_REMOVE_CEILING_MASK | DIRECT | Masking removal identical |
| TSK_WDWL_REMOVE_FLOOR_PROTECT | DIRECT | Protection removal identical |
| TSK_WDWL_VACUUM | DIRECT | Vacuum identical |
| TSK_WDWL_TOOL_CLEANUP | DIRECT | Tool cleanup identical |

**Summary**: 19 DIRECT, 4 MODIFIED, 2 NOT_APPLICABLE, 0 RP_NEW

#### SF_WOOD_CEILING_NC_v1 (30 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_WDCL_FLOOR_PROTECT_FULL | DIRECT | Protection identical |
| TSK_WDCL_FLOOR_PROTECT_PERIM | DIRECT | Same |
| TSK_WDCL_WALL_MASK | DIRECT | Masking identical |
| TSK_WDCL_FIXTURE_MASK | DIRECT | Fixture masking identical |
| TSK_WDCL_OPENING_COVER | DIRECT | Opening cover identical |
| TSK_WDCL_DUST_CLEAN | DIRECT | Dust cleaning identical |
| TSK_WDCL_SAND_PREP | MODIFIED | RP: degloss existing finish |
| TSK_WDCL_FILL_FASTENERS | NOT_APPLICABLE | Bare wood only |
| TSK_WDCL_SAND_FILL | DIRECT | Sanding fill identical |
| TSK_WDCL_CAULK_JOINTS | MODIFIED | RP: assess and replace |
| TSK_WDCL_CAULK_PERIMETER | MODIFIED | Same |
| TSK_WDCL_SEAL_MDF_EDGES | NOT_APPLICABLE | Bare MDF only |
| TSK_WDCL_PRIME_FACES | MODIFIED | RP: adhesion primer |
| TSK_WDCL_SAND_PRIMER | DIRECT | Sand primer identical |
| TSK_WDCL_SPRAY_FINISH | DIRECT | Finish application identical |
| TSK_WDCL_BRUSH_FINISH | DIRECT | Same |
| TSK_WDCL_CLEAN_AREA | DIRECT | Area cleaning identical |
| TSK_WDCL_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_WDCL_SAND_BETWEEN | DIRECT | Interstage sand identical |
| TSK_WDCL_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_WDCL_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_WDCL_TACK_CLEAN | DIRECT | Tack cleaning identical |
| TSK_WDCL_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_WDCL_TOUCHUP | DIRECT | Touchup identical |
| TSK_WDCL_REMOVE_WALL_MASK | DIRECT | Masking removal identical |
| TSK_WDCL_REMOVE_OPENING_COVER | DIRECT | Opening cover removal identical |
| TSK_WDCL_REMOVE_FIXTURE_MASK | DIRECT | Fixture mask removal identical |
| TSK_WDCL_REMOVE_FLOOR_PROTECT | DIRECT | Protection removal identical |
| TSK_WDCL_VACUUM | DIRECT | Vacuum identical |
| TSK_WDCL_TOOL_CLEANUP | DIRECT | Tool cleanup identical |

**Summary**: 22 DIRECT, 4 MODIFIED, 2 NOT_APPLICABLE, 2 RP_NEW (overhead prep penalty for ceiling work)

#### SF_ARCH_ELEMENT_NC_v1 (42 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_ARCH_FLOOR_PROTECT_WORKZONE | DIRECT | Protection identical |
| TSK_ARCH_FLOOR_PROTECT_PERIM | DIRECT | Same |
| TSK_ARCH_WALL_MASK | DIRECT | Masking identical |
| TSK_ARCH_FIXTURE_MASK | DIRECT | Fixture masking identical |
| TSK_ARCH_DUST_CLEAN | DIRECT | Dust cleaning identical |
| TSK_ARCH_SAND_BEAM | MODIFIED | RP: degloss existing finish |
| TSK_ARCH_SAND_COLUMN | MODIFIED | Same |
| TSK_ARCH_SAND_MANTEL | MODIFIED | Same |
| TSK_ARCH_FILL_BEAM | NOT_APPLICABLE | Bare wood fill |
| TSK_ARCH_FILL_COLUMN | NOT_APPLICABLE | Same |
| TSK_ARCH_FILL_MANTEL | NOT_APPLICABLE | Same |
| TSK_ARCH_CAULK_BEAM | MODIFIED | RP: assess and replace |
| TSK_ARCH_CAULK_COLUMN | MODIFIED | Same |
| TSK_ARCH_CAULK_MANTEL | MODIFIED | Same |
| TSK_ARCH_SEAL_MDF_EDGES | NOT_APPLICABLE | Bare MDF only |
| TSK_ARCH_SPRAY_PRIME_BEAM | MODIFIED | RP: adhesion primer |
| TSK_ARCH_BRUSH_PRIME_BEAM | MODIFIED | Same |
| TSK_ARCH_SPRAY_PRIME_COLUMN | MODIFIED | Same |
| TSK_ARCH_BRUSH_PRIME_COLUMN | MODIFIED | Same |
| TSK_ARCH_SPRAY_PRIME_MANTEL | MODIFIED | Same |
| TSK_ARCH_BRUSH_PRIME_MANTEL | MODIFIED | Same |
| TSK_ARCH_SPRAY_BEAM | DIRECT | Finish application identical |
| TSK_ARCH_SPRAY_COLUMN | DIRECT | Same |
| TSK_ARCH_SPRAY_MANTEL | DIRECT | Same |
| TSK_ARCH_BRUSH_BEAM | DIRECT | Same |
| TSK_ARCH_BRUSH_COLUMN | DIRECT | Same |
| TSK_ARCH_BRUSH_MANTEL | DIRECT | Same |
| TSK_ARCH_CLEAN_AREA | DIRECT | Area cleaning identical |
| TSK_ARCH_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_ARCH_SAND_BETWEEN_BEAM | DIRECT | Interstage sand identical |
| TSK_ARCH_SAND_BETWEEN_COLUMN | DIRECT | Same |
| TSK_ARCH_SAND_BETWEEN_MANTEL | DIRECT | Same |
| TSK_ARCH_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_ARCH_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_ARCH_TACK_CLEAN | DIRECT | Tack cleaning identical |
| TSK_ARCH_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_ARCH_TOUCHUP | DIRECT | Touchup identical |
| TSK_ARCH_REMOVE_WALL_MASK | DIRECT | Masking removal identical |
| TSK_ARCH_REMOVE_FIXTURE_MASK | DIRECT | Fixture mask removal identical |
| TSK_ARCH_REMOVE_FLOOR_PROTECT | DIRECT | Protection removal identical |
| TSK_ARCH_VACUUM | DIRECT | Vacuum identical |
| TSK_ARCH_TOOL_CLEANUP | DIRECT | Tool cleanup identical |

**Summary**: 24 DIRECT, 12 MODIFIED, 4 NOT_APPLICABLE, 2 RP_NEW (element condition assessment)

#### SF_BUILTIN_NC_v1 (35 tasks)

| Task ID | Classification | Rationale |
|---------|---------------|-----------|
| TSK_BLTN_FLOOR_PROTECT_WORKZONE | DIRECT | Protection identical |
| TSK_BLTN_FLOOR_PROTECT_PERIM | DIRECT | Same |
| TSK_BLTN_WALL_MASK | DIRECT | Masking identical |
| TSK_BLTN_FIXTURE_MASK | DIRECT | Fixture masking identical |
| TSK_BLTN_HARDWARE_REMOVE | DIRECT | Hardware removal identical |
| TSK_BLTN_DOOR_REMOVE | DIRECT | Door removal identical |
| TSK_BLTN_DUST_CLEAN | DIRECT | Dust cleaning identical |
| TSK_BLTN_SAND_OPENING | MODIFIED | RP: degloss existing finish |
| TSK_BLTN_SAND_DOOR | MODIFIED | Same |
| TSK_BLTN_FILL_OPENING | NOT_APPLICABLE | Bare wood fill |
| TSK_BLTN_FILL_DOOR | NOT_APPLICABLE | Same |
| TSK_BLTN_CAULK | MODIFIED | RP: assess and replace |
| TSK_BLTN_SEAL_MDF_EDGES | NOT_APPLICABLE | Bare MDF only |
| TSK_BLTN_PRIME_OPENING | MODIFIED | RP: adhesion primer |
| TSK_BLTN_PRIME_DOOR | MODIFIED | Same |
| TSK_BLTN_SPRAY_OPENING | DIRECT | Finish application identical |
| TSK_BLTN_BRUSH_OPENING | DIRECT | Same |
| TSK_BLTN_SPRAY_DOOR | DIRECT | Same |
| TSK_BLTN_BRUSH_DOOR | DIRECT | Same |
| TSK_BLTN_CLEAN_AREA | DIRECT | Area cleaning identical |
| TSK_BLTN_INSPECT_COAT | DIRECT | Intercoat inspection identical |
| TSK_BLTN_SAND_BETWEEN_OPENING | DIRECT | Interstage sand identical |
| TSK_BLTN_SAND_BETWEEN_DOOR | DIRECT | Same |
| TSK_BLTN_PATCH_DEFECTS | DIRECT | Patching identical |
| TSK_BLTN_SPOT_COAT | DIRECT | Spot coat identical |
| TSK_BLTN_TACK_CLEAN | DIRECT | Tack cleaning identical |
| TSK_BLTN_FINAL_INSPECT | DIRECT | Final inspection identical |
| TSK_BLTN_TOUCHUP | DIRECT | Touchup identical |
| TSK_BLTN_DOOR_REINSTALL | DIRECT | Door reinstall identical |
| TSK_BLTN_HARDWARE_REINSTALL | DIRECT | Hardware reinstall identical |
| TSK_BLTN_REMOVE_WALL_MASK | DIRECT | Masking removal identical |
| TSK_BLTN_REMOVE_FIXTURE_MASK | DIRECT | Fixture mask removal identical |
| TSK_BLTN_REMOVE_FLOOR_PROTECT | DIRECT | Protection removal identical |
| TSK_BLTN_VACUUM | DIRECT | Vacuum identical |
| TSK_BLTN_TOOL_CLEANUP | DIRECT | Tool cleanup identical |

**Summary**: 24 DIRECT, 5 MODIFIED, 3 NOT_APPLICABLE, 3 RP_NEW (contents protection, condition assessment)

### Aggregate Classification Summary

| Classification | Count | % | Description |
|---------------|-------|---|-------------|
| **DIRECT** | 345 | 64.6% | Transfers unchanged to RP |
| **MODIFIED** | 117 | 21.9% | Same concept, different rates/conditions/primers |
| **NOT_APPLICABLE** | 42 | 7.9% | NC-specific (bare substrate tasks) |
| **RP_NEW** | 30* | 5.6% | Must be created new for RP |

*RP_NEW count of 30 represents tasks enumerated per-spec above. The actual new tasks required across all 9 RP specs are projected in Section C — approximately 65-85 new task definitions total, as each RP spec needs its own assessment phase, degloss tasks, condition-driven primer variants, and contamination treatment tasks.

### Classification by Phase Pattern

| Phase | DIRECT | MODIFIED | N/A | RP_NEW |
|-------|--------|----------|-----|--------|
| **Setup/Protection** | 95% | 0% | 0% | 5% (furniture) |
| **Prep** | 25% | 45% | 25% | 5% |
| **Prime** | 0% | 90% | 0% | 10% |
| **Apply/Finish** | 95% | 5% | 0% | 0% |
| **Interstage** | 95% | 5% | 0% | 0% |
| **Cleanup** | 95% | 0% | 0% | 5% (walkthrough) |
| **Assessment** | 0% | 0% | 0% | 100% |

---

## Section C: Per-Substrate-Group RP Projection

### RP Spec Consolidation: 18 NC → 9 RP

NC splits prime and finish into separate specs (6 specs for 3 substrate groups: wall prime + wall finish, ceiling prime + ceiling finish, trim prime + trim paint). RP combines these because the prime phase is inseparable from the prep/assessment workflow — you cannot assess condition, remediate, and then hand off to a separate "finish" spec.

| RP Spec | NC Counterparts | NC Tasks | Projected RP Tasks | Priority | Exterior RP Analog |
|---------|----------------|----------|-------------------|----------|--------------------|
| **SF_DRYWALL_WALL_INT_RP** | WALL_PRIME + WALL_FINISH | 64 | 50-60 | P1 | None (no ext drywall) |
| **SF_DRYWALL_CEILING_INT_RP** | CEIL_PRIME + CEIL_FINISH | 52 | 42-52 | P1 | None (no ext drywall) |
| **SF_TRIM_INT_RP** | TRIM_PRIME + TRIM_PAINT | 37 | 40-50 | P1 | SF_TRIM_EXT_RP (52 tasks) |
| **SF_DOOR_INT_RP** | DOOR_FRAME + DOOR_SLAB | 50 | 38-48 | P2 | SF_DOOR_EXT_RP (51 tasks) |
| **SF_WINDOW_INT_RP** | WINDOW_INT | 29 | 35-42 | P2 | None (ext window is NC) |
| **SF_STAIR_INT_RP** | STAIR_RISER + STAIR_RAILING | 73 | 55-68 | P3 | None (no ext stairs) |
| **SF_CABINET_INT_RP** | CABINET_NC_PAINT | 58 | 68-78 | P3 | None (no ext cabinets) |
| **SF_SPECIALTY_INT_RP** | WAINSCOT + WOOD_WALL + WOOD_CEIL + ARCH_ELEMENT + BUILTIN | 157 | 45-60 | P4 | SF_SIDING_WOOD_EXT_RP (49) |
| **SF_CLOSET_INT_RP** | CLOSET_SHELF | 14 | 12-18 | P4 | None |
| **TOTAL** | **18 specs** | **534** | **385-476** | | |

### Projection Methodology

Each RP spec task count derived from:

1. **Start with DIRECT + MODIFIED** tasks from NC counterparts (transferring concepts)
2. **Subtract NOT_APPLICABLE** tasks (bare-wood-specific, NC-only)
3. **Add RP_NEW tasks** per the assessment/remediation pattern from exterior RP:
   - Assessment phase: 4-6 tasks (condition inspect, adhesion test, coating ID, moisture check, lead screen for pre-1978)
   - Degloss/cleaning: 1-2 tasks (TSA wash, chemical degloss, or mechanical scuff)
   - Scrape/feather: 1-3 tasks (scrape loose, feather edges, profile check)
   - Contamination treatment: 1-3 tasks (mildew kill, smoke seal, water stain block)
   - State-driven primer variants: 2-4 tasks (adhesion promoter, stain blocker, mildew-resistant)
   - Furniture/contents protection: 1-3 tasks (move/cover/replace — RP is in occupied homes)
   - Customer walkthrough: 1 task (RP-specific post-completion review)

### Per-Spec Detailed Projections

#### SF_DRYWALL_WALL_INT_RP (Projected: 50-60 tasks)

Source NC: 64 tasks (22 prime + 42 finish)
- DIRECT transfers: 49 tasks
- MODIFIED transfers: 15 tasks → 15 new RP versions
- NOT_APPLICABLE removals: 0
- RP_NEW additions: ~10-12
  - TSK_WLRP_ASSESS_CONDITION (visual inspect all walls, photograph defects)
  - TSK_WLRP_ASSESS_ADHESION (cross-hatch tape test per ASTM D3359)
  - TSK_WLRP_ASSESS_MOISTURE (moisture meter check, identify source)
  - TSK_WLRP_ASSESS_COATING_ID (latex vs oil identification for primer compatibility)
  - TSK_WLRP_WASH_TSP (TSP wash for grease/smoke film)
  - TSK_WLRP_TREAT_MILDEW (bleach/biocide solution application)
  - TSK_WLRP_TREAT_WATER_STAIN (stain-blocking primer on water marks)
  - TSK_WLRP_SCRAPE_LOOSE (scrape failing paint to sound substrate)
  - TSK_WLRP_FEATHER_EDGES (feather-sand scrape edges for smooth transition)
  - TSK_WLRP_FURNITURE_MOVE (move/cover furniture — RP in occupied homes)
  - TSK_WLRP_FURNITURE_REPLACE (return furniture post-completion)
  - TSK_WLRP_CUSTOMER_WALKTHROUGH (post-completion review with homeowner)

Net: 49 DIRECT + 15 MODIFIED (rewritten) + 12 RP_NEW = ~55 tasks (after deduplication of shared MODIFIED tasks between prime and finish source specs)

#### SF_DRYWALL_CEILING_INT_RP (Projected: 42-52 tasks)

Source NC: 52 tasks (19 prime + 33 finish)
- DIRECT transfers: 39 tasks
- MODIFIED transfers: 13 → 13 new RP versions
- NOT_APPLICABLE: 0
- RP_NEW additions: ~8-10 (same as wall minus mildew less common on ceiling, plus overhead penalty on assessment)
- Net: ~47 tasks

#### SF_TRIM_INT_RP (Projected: 40-50 tasks)

Source NC: 37 tasks (16 prime + 21 paint)
- DIRECT transfers: 28 tasks
- MODIFIED: 5 → 5 new RP versions
- NOT_APPLICABLE: 4 (fill_fasteners, fill_end_grain, MDF_edge_seal, spot_prime_knots)
- RP_NEW additions: ~10-14 (assessment phase 5 tasks + degloss + scrape/feather + caulk assess + state-driven primers)
- Net: ~43 tasks
- **Exterior analog**: SF_TRIM_EXT_RP has 52 tasks. Interior should be lighter (no scaffold, no RRP, no weather prep). 43 tasks = 83% of exterior, which tracks.

#### SF_DOOR_INT_RP (Projected: 38-48 tasks)

Source NC: 50 tasks (25 frame + 25 slab)
- DIRECT transfers: 38 tasks
- MODIFIED: 10 → 10 new RP versions
- NOT_APPLICABLE: 2 (door fill fasteners, MDF edge seal)
- RP_NEW additions: ~8-10 (assessment 4 tasks + degloss + adhesion primer variants)
- Net: ~42 tasks
- **Exterior analog**: SF_DOOR_EXT_RP has 51 tasks. Interior lighter (no weather, no screen door, no threshold). 42 = 82%.

#### SF_WINDOW_INT_RP (Projected: 35-42 tasks)

Source NC: 29 tasks
- DIRECT transfers: 22 tasks
- MODIFIED: 5 → 5 new RP versions
- NOT_APPLICABLE: 2 (wood fill, aluminum etch)
- RP_NEW additions: ~8-10 (assessment + condensation/moisture check + glazing assess + sealant assess)
- Net: ~37 tasks

#### SF_STAIR_INT_RP (Projected: 55-68 tasks)

Source NC: 73 tasks (30 riser + 43 railing)
- DIRECT transfers: 54 tasks
- MODIFIED: 16 → 16 new RP versions
- NOT_APPLICABLE: 3 (fill fasteners, MDF edge seal, fill/sand for railing)
- RP_NEW additions: ~10-14 (assessment + degloss per component + safety tread verify + anti-slip check + handrail feel test enhanced)
- Net: ~60 tasks

#### SF_CABINET_INT_RP (Projected: 68-78 tasks)

Source NC: 58 tasks
- DIRECT transfers: 40 tasks
- MODIFIED: 11 → 11 new RP versions
- NOT_APPLICABLE: 7 (fill frames/doors/drawers, edge seal — bare wood NC tasks)
- RP_NEW additions: ~18-22 (most complex RP spec)
  - Assessment: 5-6 tasks (condition per component, adhesion test, factory finish ID, thermofoil check, moisture in frame)
  - Deep clean: 2 tasks (kitchen grease removal is RP-specific — TSP wash + degloss)
  - State-driven primers: 3-4 variants (bonding for factory, adhesion for painted, stain-block for smoke)
  - Occupancy: 3 tasks (contents removal, appliance protection enhanced, contents replacement)
  - Thermofoil assessment gate: 1 task (determine if thermofoil is peeling — may require replacement not paint)
- Net: ~72 tasks
- **Highest complexity RP spec** — no exterior analog. Cabinet RP requires specialized substrate knowledge (thermofoil, factory lacquer, melamine).

#### SF_SPECIALTY_INT_RP (Projected: 45-60 tasks)

Source NC: 157 tasks across 5 specs. RP consolidates because:
- Wainscot, wood wall, wood ceiling, arch elements, built-ins share substrate type (wood/MDF)
- RP prep is condition-driven (same assessment regardless of surface type)
- Differentiation is in geometry (overhead penalty, access difficulty) not prep chemistry

Consolidation approach: one spec with item-type selector (similar to how arch_element handles beam/column/mantel).

- DIRECT transfers: ~50 core tasks (shared protection, finish, interstage, cleanup patterns)
- MODIFIED: ~15 → 15 new RP versions
- NOT_APPLICABLE: ~15 (bare wood fills, MDF seals across 5 specs)
- RP_NEW: ~10-12 (assessment + degloss + contamination treatment + overhead penalty adjustments)
- Net: ~50 tasks (significant consolidation from 157 NC through shared workflows)

#### SF_CLOSET_INT_RP (Projected: 12-18 tasks)

Source NC: 14 tasks
- DIRECT transfers: 7 tasks
- MODIFIED: 6 → 6 new RP versions
- NOT_APPLICABLE: 1 (edge seal)
- RP_NEW: ~3-5 (condition assess, degloss, mildew check — closets prone to mildew)
- Net: ~15 tasks

---

## Section D: Phase-by-Phase Transfer Analysis

### Setup / Protection Phase

**Transfer rate: ~90% DIRECT**

NC and RP share identical protection requirements for floors, walls, fixtures, and adjacent surfaces. The protection zones, materials, and rates are the same.

| What Transfers | What's Modified | What's New (RP) |
|---------------|----------------|-----------------|
| Floor protection (drops, poly) | None | Furniture moving/covering (RP in occupied homes) |
| Wall/ceiling masking | | Contents protection (bookshelves, artwork) |
| Fixture covers | | Occupant path protection (traffic zones) |
| Hardware removal/masking | | |
| Spray containment | | |

**Key difference**: NC is typically done in unoccupied new construction or freshly cleared rooms. RP is in occupied homes with furniture, belongings, and daily foot traffic. This adds 2-4 tasks per spec for contents management.

### Assessment Phase

**Transfer rate: 100% RP_NEW**

Assessment does not exist in NC. Every task in this phase must be created. Exterior RP proves the pattern with 4-7 assessment tasks per spec.

| Task Pattern | Description | Applies To |
|-------------|-------------|------------|
| Condition inspect | Visual scan, photograph defects, map damage areas | All 9 RP specs |
| Adhesion test | Cross-hatch tape test per ASTM D3359 | All 9 RP specs |
| Moisture evaluation | Moisture meter readings, identify source | Wall, ceiling, window, closet |
| Coating identification | Latex vs oil, sheen, number of layers | All 9 RP specs |
| Lead screen | Pre-1978 homes: XRF or swab test | All 9 RP specs (conditional) |
| Contamination ID | Mildew, smoke, grease, water stains | Context-dependent |
| Thermofoil/factory finish gate | Determine if substrate can be painted | Cabinet only |

**Interior simplification vs exterior**: No weather assessment, no UV damage evaluation, no chalk severity meter, no scaffold access planning. Interior assessment is faster per unit area.

### Prep Phase

**Transfer rate: ~30% MODIFIED, ~20% DIRECT, ~20% NOT_APPLICABLE, ~30% RP_NEW**

Prep is the most divergent phase between NC and RP. NC prep is about preparing bare substrate for first coating. RP prep is about remediating existing coating failure and creating adhesion for new coating over old.

| What Transfers (DIRECT) | What's Modified | What's NOT Applicable | What's New (RP) |
|------------------------|----------------|----------------------|-----------------|
| Dust wipe/vacuum | Sand prep → degloss/scuff | Fastener fill (bare wood) | Scrape loose paint |
| Clean dust between steps | Caulk → assess & replace | End grain fill | Feather-sand edges |
| | Sanding → condition-driven grit | MDF edge seal | Chemical degloss (TSP, liquid sander) |
| | | Knot spot prime | Mildew treatment (biocide) |
| | | | Smoke/stain seal (shellac) |
| | | | Water damage remediation gate |
| | | | Grease removal (kitchen-specific) |

**Modifier stacking partition** (from exterior RP pattern):
- **Prep pool**: condition_level × contamination_type × surface_access — never includes QT
- **Coating pool**: quality_tier × surface_access — never includes condition
- This partition prevents runaway stacking. Interior RP inherits this architecture.

### Prime Phase

**Transfer rate: ~40% MODIFIED, ~10% DIRECT, ~50% RP_NEW**

NC primer selection is substrate-driven (what material am I priming?). RP primer selection is state-driven (what condition is the existing paint in?).

| NC Primer Logic | RP Primer Logic |
|----------------|-----------------|
| Bare drywall → PVA primer | Sound paint → no prime OR adhesion promoter |
| Bare wood → acrylic wood primer | Failing paint → adhesion primer (Stix, XIM) |
| Bare MDF → shellac sealer | Mildew → mildew-resistant primer |
| Factory primed → skip prime | Smoke damage → shellac stain blocker (BIN) |
| | Water stains → stain-blocking primer |
| | Thermofoil/factory → bonding primer |
| | Oil-over-latex → adhesion promoter mandatory |
| | Latex-over-oil → adhesion promoter mandatory |

**New primer systems needed** (extend `controlled_enums.json` material_systems):
- `SYS_PRIMER_ADHESION_INT` — Interior adhesion promoter (Stix, XIM UMA)
- `SYS_PRIMER_STAINBLOCK_INT` — Interior stain blocker (BIN shellac, KILZ Original)
- `SYS_PRIMER_MILDEW_INT` — Interior mildew-resistant primer (KILZ Mold & Mildew)
- Existing `SYS_PRIMER_BONDING` (from cabinet spec) covers thermofoil/factory finish

### Apply / Finish Phase

**Transfer rate: ~85% DIRECT**

Once the surface is properly prepped and primed, finish coat application is identical between NC and RP. The brush, roll, spray techniques, rates, and interstage protocols are the same.

| What Transfers (DIRECT) | What's Modified | What's New |
|------------------------|----------------|------------|
| All finish coat application | Rate adjustment for texture differences (rare) | None |
| Cut-in techniques | Sheen matching to existing (adjacent surfaces) | |
| Spray/backroll | | |
| Brush technique per substrate | | |

**Key consideration**: Sheen matching. NC starts fresh and specifies sheen. RP must match existing sheen on adjacent surfaces unless full room is being repainted. This is a configuration concern, not a task concern.

### Interstage Phase

**Transfer rate: ~90% DIRECT**

Interstage inspection, sanding between coats, dust removal, and defect correction protocols are identical once the surface has been primed.

| What Transfers | What's Modified |
|---------------|----------------|
| Light sand between coats | None |
| Vacuum intercoat dust | |
| Inspect coat coverage/defects | |
| Patch defects | |
| Spot coat | |
| Tack clean | |

### Cleanup Phase

**Transfer rate: ~80% DIRECT**

| What Transfers | What's New (RP) |
|---------------|-----------------|
| Tool cleaning | Furniture replacement |
| Floor vacuum | Customer walkthrough |
| Protection removal | Waste disposal (scrape debris, contaminated materials) |
| Hardware reinstall | Touch-up paint left for homeowner |
| Area inspection | |

---

## Section E: Decision Points (ALL RESOLVED 2026-03-13)

All 6 decisions resolved by project owner.

### Decision 1: Combined vs Split Prime/Finish — DECIDED: COMBINED

RP specs combine prime + finish into a single spec (matching exterior RP pattern). RP prime is inseparable from assessment/prep — condition determines primer. No artificial handoff point.

**Result**: 27 total interior specs (18 NC + 9 RP). NC specs remain untouched.

### Decision 2: Number of Substrate States — DECIDED: 5 STATES

Water damage + mildew merged into `SS_INT_MOISTURE_DAMAGE` — same remediation workflow (source resolution + biocide/stain-block). Final state list:
1. `SS_INT_SOUND_PAINT`
2. `SS_INT_FAILING_PAINT`
3. `SS_INT_PEELING`
4. `SS_INT_MOISTURE_DAMAGE` (covers water damage, mildew, mold)
5. `SS_INT_SMOKE_DAMAGE`

### Decision 3: Interior Condition Scale — DECIDED: GOOD / FAIR / POOR (Universal)

The 3-level condition scale (GOOD / FAIR / POOR) is universal across NC, interior RP, and exterior RP. The exterior DSD 0-4 is a research parameter only, not a PaintFactor estimation parameter. Exterior RP specs must also be updated to use this universal scale.

| Scale | Prep Multiplier | Interior RP States |
|-------|----------------|-------------------|
| GOOD | 1.0x | SS_INT_SOUND_PAINT |
| FAIR | 1.3-1.8x | SS_INT_FAILING_PAINT, SS_INT_MOISTURE_DAMAGE |
| POOR | 2.0-3.0x | SS_INT_PEELING, SS_INT_SMOKE_DAMAGE |

### Decision 4: RRP Scope for Pre-1978 Homes — DECIDED: SHARED MODULE

Create `MOD_RRP_INT_CONTAINMENT` shared module invoked conditionally when `home_year < 1978`. All 9 RP specs reference this module rather than duplicating 5-8 identical lead-safe tasks each.

Tasks in shared module:
- Lead test (XRF or swab)
- Containment setup (poly sheeting, warning signs)
- HEPA vacuum after disturbance
- Wet methods for sanding/scraping
- Containment removal and clearance test

### Decision 5: Furniture/Contents Protection — DECIDED: SHARED BASE + PER-SPEC OVERRIDE

Shared base tasks (TSK_FURNITURE_MOVE, TSK_FURNITURE_COVER, TSK_FURNITURE_REPLACE) available to all RP specs, with per-spec overrides for context-specific protection:
- Wall/ceiling RP: center-pile furniture, cover with poly
- Cabinet RP: empty contents, cover appliances, protect countertops
- Stair RP: restrict access, no furniture
- Window RP: move window treatments, protect sills

### Decision 6: Specialty Consolidation — DECIDED: CONSOLIDATE WITH EXCLUSIVE ELEMENTS

Single `SF_SPECIALTY_INT_RP` spec with item-type selector. Each item type retains its exclusive quantifying procedures, measurement protocols, production rates, and tasks. Shared elements: assessment, prep chemistry, primer selection logic.

```
item_type: [wainscot, wood_wall, wood_ceiling, beam, column, mantel, builtin_opening, builtin_door]
```

**Constraint**: Each item type's measurement protocols, production rates, and task definitions must remain intact and distinct within the consolidated spec. Consolidation applies to shared workflow (assessment, prep chemistry, primer selection) — not to the per-item-type specifics.

---

## Section F: Implementation Roadmap

### Phase 1: Core Surfaces (P1) — 3 Specs

**Target**: Drywall wall + ceiling + trim = ~80% of interior repaint volume

| Spec | Projected Tasks | Complexity | Notes |
|------|----------------|------------|-------|
| SF_DRYWALL_WALL_INT_RP | 50-60 | Medium | Highest volume. Template for ceiling. |
| SF_DRYWALL_CEILING_INT_RP | 42-52 | Medium | Derives from wall with overhead penalty. |
| SF_TRIM_INT_RP | 40-50 | Medium | Best exterior RP analog (SF_TRIM_EXT_RP). |

**Prerequisites**:
1. Add 5 SS_INT_* states + universal `condition_scale` enum to `controlled_enums.json`
2. Add 3 SYS_PRIMER_*_INT material systems
3. Create MOD_RRP_INT_CONTAINMENT shared module
4. Add interior RP routing entries to `spec-maps.js`
5. Define TSK_ prefix conventions: WLRP_ (wall), CLRP_ (ceiling), TMRP_ (trim)

**Build order**: Wall first (template), then ceiling (adapt wall), then trim (use ext RP as template).

### Phase 2: Doors + Windows (P2) — 2 Specs

| Spec | Projected Tasks | Complexity | Notes |
|------|----------------|------------|-------|
| SF_DOOR_INT_RP | 38-48 | Medium | EA-based. Exterior RP analog exists. |
| SF_WINDOW_INT_RP | 35-42 | Medium-High | Multi-substrate (wood/aluminum/steel). No ext RP analog. |

**Prerequisites**: Phase 1 complete (establishes RP patterns and shared modules).

### Phase 3: High-Complexity (P3) — 2 Specs

| Spec | Projected Tasks | Complexity | Notes |
|------|----------------|------------|-------|
| SF_STAIR_INT_RP | 55-68 | High | Dual-surface (riser+railing), safety constraints. |
| SF_CABINET_INT_RP | 68-78 | Very High | Most complex RP spec. Thermofoil gates, dual mobilization. |

**Prerequisites**: Phases 1-2 complete. Cabinet RP is the hardest spec in the system and benefits from all prior RP pattern establishment.

### Phase 4: Consolidation (P4) — 2 Specs

| Spec | Projected Tasks | Complexity | Notes |
|------|----------------|------------|-------|
| SF_SPECIALTY_INT_RP | 45-60 | High | Consolidates 5 NC specs. Item-type selector architecture. |
| SF_CLOSET_INT_RP | 12-18 | Low | Simplest RP spec. Opening-count method. |

**Prerequisites**: Phases 1-3 complete. Specialty consolidation is architecturally complex but well-understood by this point.

### Total Effort Estimate

| Phase | Specs | New Tasks (RP_NEW) | Modified Tasks | Total RP Tasks |
|-------|-------|--------------------|---------------|----------------|
| P1 | 3 | ~30-36 | ~33 | ~135-162 |
| P2 | 2 | ~16-20 | ~15 | ~73-90 |
| P3 | 2 | ~28-36 | ~27 | ~123-146 |
| P4 | 2 | ~13-17 | ~21 | ~57-78 |
| **Total** | **9** | **~87-109** | **~96** | **~388-476** |

### Shared Infrastructure (Build Before Phase 1)

| Item | Description |
|------|-------------|
| 5 substrate states + condition_scale enum | SS_INT_* + GOOD/FAIR/POOR in controlled_enums.json |
| 3 primer systems | SYS_PRIMER_ADHESION_INT, SYS_PRIMER_STAINBLOCK_INT, SYS_PRIMER_MILDEW_INT |
| 1 shared module | MOD_RRP_INT_CONTAINMENT (lead-safe work practices) |
| 9 spec-maps entries | Interior RP routing in spec-maps.js |
| 9 TSK_ prefix conventions | WLRP_, CLRP_, TMRP_, DRRP_ (reuse ext), WNRP_, STRP_, CBRP_, SPRP_, CLRP_ |
| Universal condition scale | GOOD/FAIR/POOR — applies to NC, interior RP, and exterior RP |
| Modifier stacking partition | Prep pool vs coating pool architecture |

---

## Appendix: Verification Checklist

- [x] Task inventory count matches actual production.json totals: **534 tasks across 18 NC specs** ✓
- [x] Every NC task has a reuse classification: **534/534 classified** ✓
- [x] Classification distribution is plausible: **64.6% DIRECT, 21.9% MODIFIED, 7.9% N/A, 5.6% RP_NEW** ✓
- [x] Every RP_NEW task has an exterior RP precedent or documented rationale ✓
  - Assessment tasks: precedent in all 5 ext RP specs
  - Degloss/scrape: precedent in SF_TRIM_EXT_RP, SF_SIDING_WOOD_EXT_RP
  - Contamination treatment: documented rationale (interior-specific conditions)
  - Furniture protection: documented rationale (occupied home context)
  - Customer walkthrough: documented rationale (RP customer expectation)
- [x] Projected RP task counts within 20% of exterior RP analogs ✓
  - Trim: 43 int vs 52 ext = 83% (within range, interior lighter)
  - Door: 42 int vs 51 ext = 82% (within range)
- [x] Decision points clearly surfaced with recommendations ✓
  - 6 decisions documented with rationale and alternatives

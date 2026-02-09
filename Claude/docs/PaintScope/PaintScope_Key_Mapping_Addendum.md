# PaintScope Key Mapping Addendum

**For:** PaintFactor_Production_Rate_Reference.md  
**Version:** 1.0 | **Date:** 2026-01-27

---

## Purpose

This addendum maps every task in the Production Rate Reference to its required PaintScope quantity key and corresponding spec input name. This enables Critic validation and ensures rate-UOM-input alignment.

---

## Mapping Format

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|

---

# SYSTEM 1: INTERIOR WALLS

## SYS_WALL_NC_PRIME — New Construction Wall Prime

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_WALL_DUST | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_PROTECT_SETUP | SF | IN_SF_PROTECT_FLOOR_EXPOSED | PS_PROTECT_SF.FLOOR_EXPOSED |
| TSK_WALL_MASK_CEILING | LF | IN_LF_EDGE_TO_CEILING | PS_EDGE_LF.TO_CEILING |
| TSK_WALL_ROLL_PRIME | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_SPRAY_PRIME | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_BACKROLL_PRIME | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_PROTECT_REMOVE | SF | IN_SF_PROTECT_FLOOR_EXPOSED | PS_PROTECT_SF.FLOOR_EXPOSED |

## SYS_WALL_NC_FINISH — New Construction Wall Finish

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_WALL_PREP_SAND | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_CUTIN_CEILING | LF | IN_LF_EDGE_TO_CEILING | PS_EDGE_LF.TO_CEILING |
| TSK_WALL_CUTIN_TRIM | LF | IN_LF_EDGE_TO_TRIM | PS_EDGE_LF.TO_TRIM |
| TSK_WALL_ROLL_FINISH_1 | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_ROLL_FINISH_2 | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_SPRAY_FINISH_1 | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_SPRAY_FINISH_2 | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_INSPECT | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_TOUCHUP | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |

## SYS_WALL_REPAINT — Interior Wall Repaint

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_WALL_WASH | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_WASH_HEAVY | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_WALL_SPACKLE | SF | IN_SF_WALL_REPAIR_AREA | PS_SURFACE_SF.WALL_REPAIR_AREA |
| TSK_WALL_SAND_REPAIRS | SF | IN_SF_WALL_REPAIR_AREA | PS_SURFACE_SF.WALL_REPAIR_AREA |
| TSK_WALL_SPOT_PRIME | SF | IN_SF_WALL_REPAIR_AREA | PS_SURFACE_SF.WALL_REPAIR_AREA |
| TSK_WALL_CAULK_TRIM | LF | IN_LF_EDGE_TO_TRIM | PS_EDGE_LF.TO_TRIM |

---

# SYSTEM 2: INTERIOR CEILINGS

## SYS_CEIL_NC_PRIME — New Construction Ceiling Prime

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_CEIL_DUST | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_PROTECT_FIXTURES | EA | IN_EA_CEILING_FIXTURES | PS_PROTECT_EA.ASSET.FIXTURES |
| TSK_CEIL_ROLL_PRIME | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_SPRAY_PRIME | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_BACKROLL_PRIME | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |

## SYS_CEIL_NC_FINISH — New Construction Ceiling Finish

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_CEIL_SAND_PRIME | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_ROLL_FINISH_1 | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_ROLL_FINISH_2 | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_SPRAY_FINISH_1 | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_SPRAY_FINISH_2 | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_INSPECT | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_CEIL_TOUCHUP | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |

---

# SYSTEM 3: INTERIOR TRIM

## SYS_TRIM_NC_PAINT — New Construction Trim

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_TRIM_FILL_FASTENERS | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD + PS_SURFACE_LF.TRIM_CASING_DOOR + PS_SURFACE_LF.TRIM_CASING_WINDOW |
| TSK_TRIM_FILL_OPEN_GRAIN | EA | IN_EA_TRIM_CASING_ENDS | PS_META.EA.CASING_END_COUNT |
| TSK_TRIM_CAULK_WALL | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_CAULK_JOINTS | LF | IN_LF_TRIM_JOINTS | PS_EDGE_LF.TRIM_JOINTS |
| TSK_TRIM_SAND_INITIAL | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_CLEAN_DUST | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_BRUSH_FINISH_1 | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_BRUSH_FINISH_2 | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_SPRAY_FINISH_1 | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_SPRAY_FINISH_2 | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_SAND_BETWEEN | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_INSPECT_COAT | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_PATCH_DEFECTS | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_SPOT_COAT | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_FINAL_INSPECT | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_TOUCHUP | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |

## SYS_TRIM_REPAINT — Trim Repaint

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_TRIM_WASH | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_SCRAPE | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_SAND_DEGLOSS | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TRIM_SPOT_PRIME | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |

---

# SYSTEM 4: INTERIOR DOORS

## SYS_DOOR_NC_PAINT — New Construction Door

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_DOOR_PREP_SAND | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_MASK_HARDWARE | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_FILL_DEFECTS | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_BRUSH_FINISH_1 | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_BRUSH_FINISH_2 | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_SPRAY_FINISH_1 | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_SPRAY_FINISH_2 | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_SAND_BETWEEN | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_INSPECT | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_TOUCHUP | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_DOOR_UNMASK | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |

### Door Type Meta Keys (for Surface Modifier selection)

| Door Type | Meta Key |
|-----------|----------|
| Flush | PS_META.EA_SIDE.DOOR_SLAB.SLAB |
| Panel | PS_META.EA_SIDE.DOOR_SLAB.PANEL |
| French | PS_META.EA_SIDE.DOOR_SLAB.FRENCH |
| Bi-fold | PS_META.EA_SIDE.DOOR_SLAB.BIFOLD |
| Louvered | PS_META.EA_SIDE.DOOR_SLAB.LOUVERED |

---

# SYSTEM 5: CABINETS

## SYS_CAB_REPAINT — Cabinet Refinish

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_CAB_REMOVE_HARDWARE | EA | IN_EA_CABINET_HARDWARE | PS_META.EA.CABINET_HARDWARE |
| TSK_CAB_REMOVE_DOORS | EA | IN_EA_CABINET_DOORS | PS_META.EA.CABINET_DOORS |
| TSK_CAB_CLEAN_DEGREASE | SF | IN_SF_CABINET_FACE | PS_SURFACE_SF.CABINET_FACE |
| TSK_CAB_SAND_DEGLOSS | SF | IN_SF_CABINET_FACE | PS_SURFACE_SF.CABINET_FACE |

---

# SYSTEM 7: PREP TASKS

## SYS_PREP — Universal Prep Tasks

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_PREP_DUST | SF | IN_SF_SURFACE_FIELD | (context-dependent: WALL_FIELD, CEILING_FIELD) |
| TSK_PREP_WASH | SF | IN_SF_SURFACE_FIELD | (context-dependent) |
| TSK_PREP_SAND_LIGHT | SF | IN_SF_SURFACE_FIELD | (context-dependent) |
| TSK_PREP_SAND_MEDIUM | SF | IN_SF_SURFACE_FIELD | (context-dependent) |
| TSK_PREP_SAND_FINE | SF | IN_SF_SURFACE_FIELD | (context-dependent) |
| TSK_PREP_SPACKLE | SF | IN_SF_REPAIR_AREA | PS_SURFACE_SF.WALL_REPAIR_AREA |
| TSK_PREP_SAND_SPACKLE | SF | IN_SF_REPAIR_AREA | PS_SURFACE_SF.WALL_REPAIR_AREA |
| TSK_PREP_CAULK | LF | IN_LF_CAULK_JOINTS | PS_EDGE_LF.TO_TRIM |
| TSK_PREP_SPOT_PRIME | SF | IN_SF_REPAIR_AREA | PS_SURFACE_SF.WALL_REPAIR_AREA |
| TSK_PREP_SCRAPE | SF | IN_SF_SURFACE_FIELD | (context-dependent) |

---

# SYSTEM 8: CUT-IN / EDGE WORK

## SYS_CUTIN — Cut-In Tasks

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_CUTIN_CEILING | LF | IN_LF_EDGE_TO_CEILING | PS_EDGE_LF.TO_CEILING |
| TSK_CUTIN_TRIM | LF | IN_LF_EDGE_TO_TRIM | PS_EDGE_LF.TO_TRIM |
| TSK_CUTIN_CORNER | LF | IN_LF_EDGE_INSIDE_CORNER | PS_EDGE_LF.TO_SURFACE |
| TSK_CUTIN_WINDOW | LF | IN_LF_EDGE_TO_WINDOW | PS_EDGE_LF.TO_ASSET.WINDOW |
| TSK_CUTIN_DOOR | LF | IN_LF_EDGE_TO_DOOR_CASING | PS_EDGE_LF.TO_TRIM |

---

# SYSTEM 9: INSPECTION & TOUCHUP

## SYS_QC — Quality Control Tasks

| Task ID | UOM | Spec Input Name | PaintScope Key |
|---------|-----|-----------------|----------------|
| TSK_INSPECT_WALL | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_INSPECT_CEILING | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_INSPECT_TRIM | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_INSPECT_DOOR | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |
| TSK_TOUCHUP_WALL | SF | IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD |
| TSK_TOUCHUP_CEILING | SF | IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD |
| TSK_TOUCHUP_TRIM | LF | IN_LF_TRIM_TOTAL | PS_SURFACE_LF.TRIM_BASEBOARD |
| TSK_TOUCHUP_DOOR | EA | IN_EA_SIDE_DOOR_SLAB | PS_SURFACE_EA_SIDE.DOOR_SLAB |

---

# MODIFIERS — Input Key Requirements

## Height Modifier (MOD_HT)

| Modifier | Spec Input Name | PaintScope Key |
|----------|-----------------|----------------|
| HT_STD, HT_STEP, HT_EXT, HT_SCAFFOLD, HT_LIFT | IN_HEIGHT_BAND | PS_META.HEIGHT_BAND |

## Surface Condition (MOD_COND)

| Modifier | Spec Input Name | PaintScope Key |
|----------|-----------------|----------------|
| COND_NEW, COND_GOOD, COND_FAIR, COND_POOR | IN_SURFACE_CONDITION | PS_META.SURFACE_CONDITION |

## Complexity (MOD_COMP)

| Modifier | Spec Input Name | PaintScope Key |
|----------|-----------------|----------------|
| COMP_CLOSET | IN_FLAG_CLOSET_SHELVING | PS_ROOM_FLAG.CLOSET_SHELVING_PRESENT |
| Other complexity | IN_COMPLEXITY_FACTOR | PS_META.COMPLEXITY_FACTOR |

## Texture (MOD_SURF for field)

| Modifier | Spec Input Name | PaintScope Key |
|----------|-----------------|----------------|
| SURF_DW_SMOOTH, SURF_DW_ORANGE, etc. | IN_SURFACE_TEXTURE | PS_META.SURFACE_TEXTURE |

---

# PROPOSED NEW KEYS

The following keys are referenced above but not yet in the canonical catalog. Flag for PaintScope team review:

| Proposed Key | UOM | Description | Justification |
|--------------|-----|-------------|---------------|
| PS_META.EA.CASING_END_COUNT | EA | Count of trim casing ends requiring grain fill | Required for TSK_TRIM_FILL_OPEN_GRAIN |
| PS_EDGE_LF.TRIM_JOINTS | LF | Linear feet of trim miter/cope joints | Required for TSK_TRIM_CAULK_JOINTS |
| PS_META.EA.CABINET_HARDWARE | EA | Count of cabinet hardware pieces | Required for TSK_CAB_REMOVE_HARDWARE |
| PS_META.EA.CABINET_DOORS | EA | Count of cabinet doors | Required for TSK_CAB_REMOVE_DOORS |
| PS_SURFACE_SF.CABINET_FACE | SF | Paintable cabinet face area | Required for cabinet prep/finish tasks |
| PS_EDGE_LF.TO_SURFACE | LF | Edge where two surfaces meet (inside corners) | Required for TSK_CUTIN_CORNER |
| PS_EDGE_LF.TO_ASSET.WINDOW | LF | Edge at window frame | Required for TSK_CUTIN_WINDOW |
| PS_META.HEIGHT_BAND | ENUM | Height classification (STD/STEP/EXT/SCAFFOLD/LIFT) | Required for height modifier |
| PS_META.SURFACE_CONDITION | ENUM | Condition classification (NEW/GOOD/FAIR/POOR) | Required for condition modifier |
| PS_META.SURFACE_TEXTURE | ENUM | Texture classification (smooth/orange/knockdown/heavy) | Required for texture modifier |
| PS_META.COMPLEXITY_FACTOR | ENUM | Complexity classification | Required for complexity modifier |

---

# NOTES

## QT6 Fallback

Per system design: **QT6 = "Contractor Choice"** labor rate from profile settings panel. Not estimable via production rates.

## Aggregation Pattern for Trim

When spec requires `IN_LF_TRIM_TOTAL`, the estimation engine should aggregate:
```
IN_LF_TRIM_TOTAL = PS_SURFACE_LF.TRIM_BASEBOARD 
                 + PS_SURFACE_LF.TRIM_CROWN 
                 + PS_SURFACE_LF.TRIM_CASING_DOOR 
                 + PS_SURFACE_LF.TRIM_CASING_WINDOW
```

This aggregation happens at runtime, not in specs.

## Context-Dependent Keys

Tasks marked "(context-dependent)" inherit their PaintScope key from the parent system context:
- Wall system → PS_SURFACE_SF.WALL_FIELD
- Ceiling system → PS_SURFACE_SF.CEILING_FIELD

---

**Document Version:** 1.0  
**Status:** Ready for Integration

# PaintFactor Production Rate Reference

**Version:** 1.0 | **Last Updated:** 2026-01-27

---

# UNIVERSAL BASE RATES

| Base ID | Rate | UOM | Use For |
|---------|------|-----|---------|
| **BASE_SF** | 400 | SF/hr | Field surfaces (walls, ceilings, floors) |
| **BASE_LF** | 100 | LF/hr | Linear elements (trim, edges, caulk) |
| **BASE_EA** | 4 | EA/hr | Discrete units (doors, windows, fixtures) |

**Formula:** `Task Rate = Base Rate ÷ Combined Modifiers`

---

# SYSTEMS & TASKS

## SYSTEM 1: INTERIOR WALLS

### SYS_WALL_NC_PRIME — New Construction Wall Prime
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_WALL_DUST | Dust/vacuum surface | SF | 800 | 800 | Binary task |
| TSK_WALL_PROTECT_SETUP | Set floor protection | SF | 400 | 400 | Method dependent |
| TSK_WALL_MASK_CEILING | Mask ceiling line | LF | 150 | 150 | Spray only |
| TSK_WALL_ROLL_PRIME | Roll primer | SF | 400 | 400 | Baseline |
| TSK_WALL_SPRAY_PRIME | Spray primer | SF | 800 | 445 | W/ backroll coupling |
| TSK_WALL_BACKROLL_PRIME | Backroll primer | SF | 450 | 450 | Bottleneck rate |
| TSK_WALL_PROTECT_REMOVE | Remove protection | SF | 600 | 600 | Binary task |

### SYS_WALL_NC_FINISH — New Construction Wall Finish (2 Coats)
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_WALL_PREP_SAND | Light sand prime | SF | 500 | 500 | QT4+ only |
| TSK_WALL_CUTIN_CEILING | Cut-in at ceiling | LF | 100 | 100 | Per coat |
| TSK_WALL_CUTIN_TRIM | Cut-in at trim | LF | 100 | 90 | Per coat |
| TSK_WALL_ROLL_FINISH_1 | Roll first finish | SF | 400 | 380 | Coat 1 modifier |
| TSK_WALL_ROLL_FINISH_2 | Roll second finish | SF | 400 | 445 | Coat 2 faster |
| TSK_WALL_SPRAY_FINISH_1 | Spray first finish | SF | 800 | 445 | W/ backroll |
| TSK_WALL_SPRAY_FINISH_2 | Spray second finish | SF | 800 | 470 | W/ backroll |
| TSK_WALL_INSPECT | Final inspection | SF | 800 | 800 | QT scaled |
| TSK_WALL_TOUCHUP | Touch-up | SF | 400 | 400 | QT scaled |

### SYS_WALL_REPAINT — Interior Wall Repaint
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_WALL_WASH | Wash walls | SF | 200 | 200 | Condition dependent |
| TSK_WALL_WASH_HEAVY | Heavy wash (TSP) | SF | 100 | 100 | Fair/Poor condition |
| TSK_WALL_SPACKLE | Spackle defects | SF | 200 | 200 | Condition dependent |
| TSK_WALL_SAND_REPAIRS | Sand repairs | SF | 300 | 300 | After spackle |
| TSK_WALL_SPOT_PRIME | Spot prime repairs | SF | 600 | 600 | As needed |
| TSK_WALL_CAULK_TRIM | Caulk at trim | LF | 150 | 150 | As needed |

---

## SYSTEM 2: INTERIOR CEILINGS

### SYS_CEIL_NC_PRIME — New Construction Ceiling Prime
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_CEIL_DUST | Dust ceiling | SF | 700 | 700 | Overhead factor |
| TSK_CEIL_PROTECT_FIXTURES | Protect fixtures | EA | 30 | 30 | Per fixture |
| TSK_CEIL_ROLL_PRIME | Roll primer | SF | 400 | 350 | Overhead modifier |
| TSK_CEIL_SPRAY_PRIME | Spray primer | SF | 800 | 390 | W/ backroll + overhead |
| TSK_CEIL_BACKROLL_PRIME | Backroll primer | SF | 450 | 390 | Overhead modifier |

### SYS_CEIL_NC_FINISH — New Construction Ceiling Finish
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_CEIL_SAND_PRIME | Sand primer | SF | 450 | 450 | QT4+ only |
| TSK_CEIL_ROLL_FINISH_1 | Roll first finish | SF | 400 | 330 | Overhead + coat 1 |
| TSK_CEIL_ROLL_FINISH_2 | Roll second finish | SF | 400 | 390 | Overhead + coat 2 |
| TSK_CEIL_SPRAY_FINISH_1 | Spray first finish | SF | 800 | 365 | W/ backroll + overhead |
| TSK_CEIL_SPRAY_FINISH_2 | Spray second finish | SF | 800 | 410 | W/ backroll + overhead |
| TSK_CEIL_INSPECT | Final inspection | SF | 700 | 700 | Overhead adjusted |
| TSK_CEIL_TOUCHUP | Touch-up | SF | 350 | 350 | Overhead adjusted |

---

## SYSTEM 3: INTERIOR TRIM

### SYS_TRIM_NC_PAINT — New Construction Trim (2 Finish Coats)
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_TRIM_FILL_FASTENERS | Fill nail holes | LF | 120 | 120 | 2 holes per 12-16" |
| TSK_TRIM_FILL_OPEN_GRAIN | Fill casing ends | EA | 30 | 30 | 2 per door, 4 per window |
| TSK_TRIM_CAULK_WALL | Caulk trim to wall | LF | 150 | 150 | All joints |
| TSK_TRIM_CAULK_JOINTS | Caulk trim joints | LF | 120 | 120 | Miters, copes |
| TSK_TRIM_SAND_INITIAL | Initial sand | LF | 400 | 400 | Full surface |
| TSK_TRIM_CLEAN_DUST | Clean sanding dust | LF | 600 | 600 | Tack/vacuum |
| TSK_TRIM_BRUSH_FINISH_1 | Brush first finish | LF | 100 | 80 | Coat 1 modifier |
| TSK_TRIM_BRUSH_FINISH_2 | Brush second finish | LF | 100 | 90 | Coat 2 faster |
| TSK_TRIM_SPRAY_FINISH_1 | Spray first finish | LF | 400 | 380 | Coat 1 modifier |
| TSK_TRIM_SPRAY_FINISH_2 | Spray second finish | LF | 400 | 445 | Coat 2 faster |
| TSK_TRIM_SAND_BETWEEN | Sand between coats | LF | 400 | 400 | QT3: spot, QT4+: full |
| TSK_TRIM_INSPECT_COAT | Inspect after coat | LF | 800 | 800 | Mark defects |
| TSK_TRIM_PATCH_DEFECTS | Patch revealed defects | LF | 400 | 400 | Interstage |
| TSK_TRIM_SPOT_COAT | Spot coat patches | LF | 500 | 500 | Interstage |
| TSK_TRIM_FINAL_INSPECT | Final inspection | LF | 600 | 600 | QT scaled |
| TSK_TRIM_TOUCHUP | Touch-up | LF | 400 | 400 | QT scaled |

### SYS_TRIM_REPAINT — Trim Repaint
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_TRIM_WASH | Wash trim | LF | 150 | 150 | TSP or degreaser |
| TSK_TRIM_SCRAPE | Scrape loose paint | LF | 80 | 80 | Poor condition |
| TSK_TRIM_SAND_DEGLOSS | Sand/degloss | LF | 200 | 200 | Existing enamel |
| TSK_TRIM_SPOT_PRIME | Spot prime bare | LF | 200 | 200 | As needed |

---

## SYSTEM 4: INTERIOR DOORS

### SYS_DOOR_NC_PAINT — New Construction Door (2 Finish Coats)
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_DOOR_PREP_SAND | Sand door/frame | EA | 4 | 4 | Light scuff |
| TSK_DOOR_MASK_HARDWARE | Mask hardware | EA | 10 | 10 | Hinges, strike |
| TSK_DOOR_FILL_DEFECTS | Fill defects | EA | 8 | 8 | Factory imperfections |
| TSK_DOOR_BRUSH_FINISH_1 | Brush first finish | EA | 4 | 3.8 | Coat 1 modifier |
| TSK_DOOR_BRUSH_FINISH_2 | Brush second finish | EA | 4 | 4.4 | Coat 2 faster |
| TSK_DOOR_SPRAY_FINISH_1 | Spray first finish | EA | 8 | 7.6 | Coat 1 modifier |
| TSK_DOOR_SPRAY_FINISH_2 | Spray second finish | EA | 8 | 8.9 | Coat 2 faster |
| TSK_DOOR_SAND_BETWEEN | Sand between coats | EA | 6 | 6 | QT4+ |
| TSK_DOOR_INSPECT | Final inspection | EA | 20 | 20 | QT scaled |
| TSK_DOOR_TOUCHUP | Touch-up | EA | 15 | 15 | QT scaled |
| TSK_DOOR_UNMASK | Remove masking | EA | 20 | 20 | Hardware reveal |

### Door Types (Use Surface Modifier)
| Door Type | Modifier | Effective EA/hr (brush) |
|-----------|----------|-------------------------|
| Flush | 1.00 | 4.0 |
| Panel (raised) | 1.30 | 3.1 |
| French (lites) | 2.00 | 2.0 |
| Louvered | 2.50 | 1.6 |
| Fire door | 1.50 | 2.7 |
| Bi-fold pair | 1.40 | 2.9 |

---

## SYSTEM 5: CABINETS

### SYS_CAB_REPAINT — Cabinet Refinish
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_CAB_REMOVE_HARDWARE | Remove hardware | EA | 30 | 30 | Pulls, hinges |
| TSK_CAB_REMOVE_DOORS | Remove doors | EA | 12 | 12 | Label location |
| TSK_CAB_CLEAN_DEGREASE | Clean/degrease | SF | 100 | 100 | TSP or deglosser |
| TSK_CAB_SAND_DEGLOSS | Sand/degloss | SF | 150 | 150 | 150-180 grit |
| TSK_CAB_FILL_DEFECTS | Fill defects | EA | 20 | 20 | Per door/drawer |
| TSK_CAB_PRIME | Prime coat | SF | 300 | 300 | Bonding primer |
| TSK_CAB_SAND_PRIME | Sand primer | SF | 200 | 200 | 220 grit |
| TSK_CAB_SPRAY_FINISH_1 | Spray first finish | SF | 350 | 330 | Coat 1 |
| TSK_CAB_SPRAY_FINISH_2 | Spray second finish | SF | 350 | 390 | Coat 2 |
| TSK_CAB_SAND_BETWEEN | Sand between coats | SF | 250 | 250 | 320 grit |
| TSK_CAB_REINSTALL_DOORS | Reinstall doors | EA | 10 | 10 | Align, adjust |
| TSK_CAB_REINSTALL_HARDWARE | Reinstall hardware | EA | 25 | 25 | Clean, install |
| TSK_CAB_FINAL_INSPECT | Final inspection | SF | 400 | 400 | QT scaled |
| TSK_CAB_TOUCHUP | Touch-up | SF | 250 | 250 | QT scaled |

---

## SYSTEM 6: PROTECTION & MASKING

### SYS_PROTECT — Protection Tasks
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_PROTECT_DROPS | Lay canvas drops | EA | 6 | 6 | Per room |
| TSK_PROTECT_PAPER | Lay rosin paper | SF | 400 | 400 | Tape seams |
| TSK_PROTECT_PLASTIC | Lay plastic sheeting | SF | 350 | 350 | Tape seams |
| TSK_PROTECT_REMOVE | Remove all protection | SF | 600 | 600 | Fold, dispose |

### SYS_MASK — Masking Tasks
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_MASK_TAPE | Apply masking tape | LF | 200 | 200 | 1.5" blue tape |
| TSK_MASK_PAPER_TRIM | Paper mask trim | LF | 150 | 150 | Tape + paper |
| TSK_MASK_WINDOW | Mask window | EA | 8 | 8 | Film + tape |
| TSK_MASK_DOOR | Mask door opening | EA | 6 | 6 | Plastic + tape |
| TSK_MASK_FIXTURE | Mask fixture/outlet | EA | 30 | 30 | Tape/bag |
| TSK_MASK_CEILING_LINE | Mask ceiling line | LF | 150 | 150 | Spray prep |
| TSK_UNMASK_ALL | Remove all masking | LF | 400 | 400 | Pull tape |

---

## SYSTEM 7: PREP TASKS (Standalone)

### SYS_PREP — Preparation Tasks
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_PREP_DUST_WALLS | Dust walls | SF | 800 | 800 | Vacuum/wipe |
| TSK_PREP_DUST_CEILING | Dust ceiling | SF | 700 | 700 | Overhead |
| TSK_PREP_WASH_LIGHT | Light wash | SF | 200 | 200 | Dust/mild dirt |
| TSK_PREP_WASH_HEAVY | Heavy wash (TSP) | SF | 100 | 100 | Grease/smoke |
| TSK_PREP_DEGREASE | Degrease/solvent | SF | 90 | 90 | Kitchen/bath |
| TSK_PREP_SAND_LIGHT | Light scuff sand | SF | 400 | 400 | Adhesion only |
| TSK_PREP_SAND_MEDIUM | Medium sand | SF | 300 | 300 | 150 grit |
| TSK_PREP_SAND_FULL | Full sand | SF | 250 | 250 | 180-220 grit |
| TSK_PREP_SAND_FINE | Fine sand | SF | 150 | 150 | 320+ grit |
| TSK_PREP_SPACKLE | Spackle defects | SF | 200 | 200 | Fill + smooth |
| TSK_PREP_SAND_SPACKLE | Sand spackle | SF | 300 | 300 | Feather edges |
| TSK_PREP_CAULK | Caulk gaps | LF | 150 | 150 | Apply + tool |
| TSK_PREP_SPOT_PRIME | Spot prime | SF | 600 | 600 | Touch repairs |
| TSK_PREP_SCRAPE | Scrape loose paint | SF | 100 | 100 | Poor condition |

---

## SYSTEM 8: CUT-IN / EDGE WORK

### SYS_CUTIN — Cut-In Tasks
| Task ID | Task Name | UOM | Base Rate | QT3 Rate | Notes |
|---------|-----------|-----|-----------|----------|-------|
| TSK_CUTIN_CEILING | Cut-in at ceiling | LF | 100 | 100 | QT scaled |
| TSK_CUTIN_TRIM | Cut-in at trim | LF | 100 | 90 | QT scaled |
| TSK_CUTIN_CORNER | Cut-in inside corner | LF | 100 | 120 | Easier than edge |
| TSK_CUTIN_WINDOW | Cut-in at window | LF | 100 | 85 | Detail work |
| TSK_CUTIN_DOOR | Cut-in at door casing | LF | 100 | 85 | Detail work |

---

## SYSTEM 9: INSPECTION & TOUCHUP

### SYS_QC — Quality Control Tasks
| Task ID | Task Name | UOM | Base Rate | QT2 | QT3 | QT4 | QT5 |
|---------|-----------|-----|-----------|-----|-----|-----|-----|
| TSK_INSPECT_WALL | Inspect walls | SF | 800 | 1500 | 800 | 500 | 300 |
| TSK_INSPECT_CEILING | Inspect ceiling | SF | 700 | 1200 | 700 | 450 | 275 |
| TSK_INSPECT_TRIM | Inspect trim | LF | 600 | 1000 | 600 | 400 | 250 |
| TSK_INSPECT_DOOR | Inspect door | EA | 20 | 30 | 20 | 12 | 8 |
| TSK_TOUCHUP_WALL | Touch-up walls | SF | 400 | 600 | 400 | 300 | 200 |
| TSK_TOUCHUP_CEILING | Touch-up ceiling | SF | 350 | 500 | 350 | 250 | 175 |
| TSK_TOUCHUP_TRIM | Touch-up trim | LF | 400 | 600 | 400 | 300 | 200 |
| TSK_TOUCHUP_DOOR | Touch-up door | EA | 15 | 20 | 15 | 10 | 6 |

---

# MODIFIERS

## MOD_APP — Application Method

### Field Tasks (SF)
| Code | Method | Modifier | Effective Rate |
|------|--------|----------|----------------|
| APP_BRUSH | Brush | 2.00 | 200 SF/hr |
| APP_ROLL_9 | Roll 9" | 1.00 | 400 SF/hr |
| APP_ROLL_18 | Roll 18" | 0.85 | 470 SF/hr |
| APP_SPRAY | Spray only | 0.50 | 800 SF/hr |
| APP_SPRAY_BR | Spray + backroll | 0.90 | 445 SF/hr |

### Linear Tasks (LF)
| Code | Method | Modifier | Effective Rate |
|------|--------|----------|----------------|
| APP_BRUSH | Brush | 1.00 | 100 LF/hr |
| APP_SPRAY | Spray | 0.25 | 400 LF/hr |
| APP_ROLL_MINI | Mini roller | 0.80 | 125 LF/hr |

### Unit Tasks (EA)
| Code | Method | Modifier | Effective Rate |
|------|--------|----------|----------------|
| APP_BRUSH_ROLL | Brush/roll | 1.00 | 4 EA/hr |
| APP_SPRAY | Spray | 0.50 | 8 EA/hr |

---

## MOD_SURF — Surface Type

### Field Surfaces
| Code | Surface | Modifier |
|------|---------|----------|
| SURF_DW_SMOOTH | Drywall smooth | 1.00 |
| SURF_DW_ORANGE | Drywall orange peel | 1.10 |
| SURF_DW_KNOCKDOWN | Drywall knockdown | 1.20 |
| SURF_DW_HEAVY | Drywall heavy texture | 1.35 |
| SURF_PLASTER_SM | Plaster smooth | 1.05 |
| SURF_PLASTER_TX | Plaster textured | 1.25 |
| SURF_MASONRY_SM | Masonry smooth | 1.15 |
| SURF_MASONRY_BLK | Masonry block | 1.40 |
| SURF_WOOD_PANEL | Wood paneling | 1.20 |
| SURF_CONCRETE | Concrete | 1.25 |

### Linear Surfaces
| Code | Surface | Modifier |
|------|---------|----------|
| SURF_TRIM_MDF | MDF/smooth | 1.00 |
| SURF_TRIM_PINE | Paint-grade pine | 1.05 |
| SURF_TRIM_HARDWOOD | Stain-grade | 1.20 |
| SURF_TRIM_ORNATE | Ornate/detailed | 1.40 |
| SURF_CROWN | Crown molding | 1.30 |

### Unit Surfaces
| Code | Surface | Modifier |
|------|---------|----------|
| SURF_DOOR_FLUSH | Flush door | 1.00 |
| SURF_DOOR_PANEL | Panel door | 1.30 |
| SURF_DOOR_FRENCH | French door | 2.00 |
| SURF_DOOR_LOUVER | Louvered door | 2.50 |
| SURF_DOOR_FIRE | Fire door | 1.50 |
| SURF_CAB_FLAT | Flat cabinet | 1.00 |
| SURF_CAB_RAISED | Raised panel | 1.30 |

---

## MOD_POS — Position

| Code | Position | Modifier |
|------|----------|----------|
| POS_WALL | Vertical wall | 1.00 |
| POS_FLOOR | Horizontal floor | 0.90 |
| POS_CEILING | Overhead ceiling | 1.15 |
| POS_CEIL_EXT | Ceiling w/ pole | 1.25 |
| POS_CONFINED | Confined space | 1.40 |
| POS_EXT_SCAFFOLD | Exterior scaffold | 1.20 |

---

## MOD_COND — Surface Condition

| Code | Condition | Prep Modifier | Finish Modifier |
|------|-----------|---------------|-----------------|
| COND_NEW | New construction | 0.80 | 1.00 |
| COND_GOOD | Good | 1.00 | 1.00 |
| COND_FAIR | Fair | 1.50 | 1.00 |
| COND_POOR | Poor | 2.00 | 1.00 |

*Note: Condition modifier applies to PREP tasks only*

---

## MOD_COMP — Complexity

| Code | Complexity | Modifier |
|------|------------|----------|
| COMP_OPEN | Open/simple | 0.90 |
| COMP_STD | Standard room | 1.00 |
| COMP_MOD | Moderate | 1.20 |
| COMP_COMPLEX | Complex | 1.40 |
| COMP_CLOSET | Closet w/ shelving | 1.50 |
| COMP_VCOMPLEX | Very complex | 1.60 |
| COMP_EXTREME | Extreme | 2.00 |

---

## MOD_COAT — Coat Sequence

| Code | Coat | Modifier |
|------|------|----------|
| COAT_PRIME | Primer | 1.00 |
| COAT_FINISH_1 | First finish | 1.05 |
| COAT_FINISH_2 | Second finish | 0.90 |
| COAT_FINISH_3 | Third+ finish | 0.85 |
| COAT_SPOT | Spot coat | 1.20 |
| COAT_CLEAR | Clear coat | 1.10 |

---

## MOD_HT — Height

| Code | Height | Modifier |
|------|--------|----------|
| HT_STD | 0-8 ft | 1.00 |
| HT_STEP | 9-12 ft | 1.30 |
| HT_EXT | 13-17 ft | 1.50 |
| HT_SCAFFOLD | 18-24 ft | 2.00 |
| HT_LIFT | 25+ ft | 2.50 |

---

## MOD_MAT — Material Type

| Code | Material | Modifier |
|------|----------|----------|
| MAT_FLAT | Flat latex | 1.00 |
| MAT_EGGSHELL | Eggshell | 1.05 |
| MAT_SATIN | Satin | 1.08 |
| MAT_SEMI | Semi-gloss | 1.15 |
| MAT_GLOSS | High gloss | 1.30 |
| MAT_OIL | Oil/alkyd | 1.10 |
| MAT_EPOXY | Epoxy | 1.40 |
| MAT_LACQUER | Lacquer | 1.25 |
| MAT_STAIN | Stain | 0.90 |
| MAT_CLEAR | Clear coat | 1.20 |
| MAT_PRIMER_PVA | PVA primer | 0.95 |
| MAT_PRIMER_BOND | Bonding primer | 1.10 |
| MAT_PRIMER_SHELLAC | Shellac primer | 1.15 |

---

# QUALITY TIERS

## Quality Tier Definitions

| Tier | Name | Global Modifier | Description |
|------|------|-----------------|-------------|
| **QT2** | Minimal | 0.80 | Economy work, basic coverage, no warranty |
| **QT3** | Standard | 1.00 | **Baseline** - typical residential/commercial |
| **QT4** | Premium | 1.30 | Enhanced process, tighter tolerances |
| **QT5** | Superior | 1.50 | Maximum care, critical inspection |
| **QT6** | Architectural | Hourly | Not estimable - time & materials |

## Quality Tier Characteristics

### QT2 — Minimal
- Single coat acceptable where coverage achieved
- Minimal prep (spot only)
- No between-coat sanding
- Quick visual inspection only
- No warranty
- **Use for:** Apartments, turnovers, insurance, quick refreshes

### QT3 — Standard
- Two coat finish standard
- Proper prep (fill holes, light sand)
- Spot sand between coats if needed
- Standard inspection
- 1-year warranty typical
- **Use for:** Most residential, standard commercial

### QT4 — Premium
- Two coat finish minimum
- Thorough prep (all holes filled, surface sanded)
- Full sand between coats
- Detailed inspection with work light
- Extended warranty
- **Use for:** High-end residential, visible commercial, quality-conscious clients

### QT5 — Superior
- Two coat finish + possible additional coats
- Maximum prep (perfect surface)
- Full sand between every coat
- Critical inspection with raking light
- Premium warranty
- **Requires:** Good condition surfaces only
- **Use for:** Showrooms, model homes, architectural spec

## Quality Tier Impact by Task Type

### Application Tasks
| Task Type | QT2 | QT3 | QT4 | QT5 |
|-----------|-----|-----|-----|-----|
| Roll/spray field | 500 SF/hr | 400 SF/hr | 310 SF/hr | 265 SF/hr |
| Brush trim | 125 LF/hr | 100 LF/hr | 77 LF/hr | 67 LF/hr |
| Brush door | 5 EA/hr | 4 EA/hr | 3.1 EA/hr | 2.7 EA/hr |

### Cut-In Tasks
| Edge Type | QT2 | QT3 | QT4 | QT5 |
|-----------|-----|-----|-----|-----|
| Ceiling line | 130 LF/hr | 100 LF/hr | 80 LF/hr | 60 LF/hr |
| Trim line | 120 LF/hr | 90 LF/hr | 70 LF/hr | 55 LF/hr |

### Inspection Tasks
| Surface | QT2 | QT3 | QT4 | QT5 |
|---------|-----|-----|-----|-----|
| Walls | 1500 SF/hr | 800 SF/hr | 500 SF/hr | 300 SF/hr |
| Ceilings | 1200 SF/hr | 700 SF/hr | 450 SF/hr | 275 SF/hr |
| Trim | 1000 LF/hr | 600 LF/hr | 400 LF/hr | 250 LF/hr |
| Doors | 30 EA/hr | 20 EA/hr | 12 EA/hr | 8 EA/hr |

### Touch-Up Tasks
| Surface | QT2 | QT3 | QT4 | QT5 |
|---------|-----|-----|-----|-----|
| Walls | 600 SF/hr | 400 SF/hr | 300 SF/hr | 200 SF/hr |
| Ceilings | 500 SF/hr | 350 SF/hr | 250 SF/hr | 175 SF/hr |
| Trim | 600 LF/hr | 400 LF/hr | 300 LF/hr | 200 LF/hr |
| Doors | 20 EA/hr | 15 EA/hr | 10 EA/hr | 6 EA/hr |

---

# SYSTEM RATE SUMMARY

## Quick Reference: Full System Rates

| System | Method | QT2 | QT3 | QT4 | QT5 |
|--------|--------|-----|-----|-----|-----|
| Wall (prime + 2 finish) | Roll | 56 SF/hr | 45 SF/hr | 35 SF/hr | 30 SF/hr |
| Wall (prime + 2 finish) | Spray+BR | 62 SF/hr | 50 SF/hr | 38 SF/hr | 33 SF/hr |
| Ceiling (prime + 2 finish) | Roll | 61 SF/hr | 49 SF/hr | 38 SF/hr | 33 SF/hr |
| Trim (2 finish) | Brush | 38 LF/hr | 30 LF/hr | 23 LF/hr | 20 LF/hr |
| Trim (2 finish) | Spray | 75 LF/hr | 60 LF/hr | 46 LF/hr | 40 LF/hr |
| Door (2 finish) | Brush | 0.35 EA/hr | 0.28 EA/hr | 0.22 EA/hr | 0.19 EA/hr |
| Door (2 finish) | Spray | 0.50 EA/hr | 0.40 EA/hr | 0.31 EA/hr | 0.27 EA/hr |

*System rates include all tasks: prep, protection, application, inspection, touchup*

---

# APPENDIX: CALCULATION EXAMPLES

## Example 1: Wall Finish QT4, Textured, 10ft Ceiling

```
Task: Roll first finish coat
Base: 400 SF/hr

Modifiers:
× MOD_SURF (knockdown): 1.20
× MOD_QT (QT4): 1.30
× MOD_COAT (finish 1): 1.05
× MOD_HT (10ft): 1.15

Combined: 1.20 × 1.30 × 1.05 × 1.15 = 1.88

Rate = 400 ÷ 1.88 = 213 SF/hr
```

## Example 2: Trim Brush QT5, Ornate Profile

```
Task: Brush first finish coat
Base: 100 LF/hr

Modifiers:
× MOD_SURF (ornate): 1.40
× MOD_QT (QT5): 1.50
× MOD_COAT (finish 1): 1.05

Combined: 1.40 × 1.50 × 1.05 = 2.21

Rate = 100 ÷ 2.21 = 45 LF/hr
```

## Example 3: Spray Door QT3, Panel Door

```
Task: Spray first finish coat
Base: 4 EA/hr (brush baseline)

Modifiers:
× MOD_APP (spray): 0.50
× MOD_SURF (panel): 1.30
× MOD_COAT (finish 1): 1.05

Combined: 0.50 × 1.30 × 1.05 = 0.68

Rate = 4 ÷ 0.68 = 5.9 EA/hr
```

---

**Document Version:** 1.0  
**Status:** Production Ready

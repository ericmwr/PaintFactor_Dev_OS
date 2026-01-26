---
name: fine-finish-workflow
description: Workflow patterns for fine finish surfaces (trim, built-ins, doors, millwork) per Fine_Finish_Doctrine.md
---

# Fine Finish Workflow Skill

This skill defines the workflow patterns for fine finish painting per `Fine_Finish_Doctrine.md`.

## Scope

### Applies to:
- **Trim** — baseboard, door casing, window casing, crown molding, chair rail
- **Built-ins** — cabinets, bookshelves, entertainment centers
- **Doors** — interior, closet, entry interior face, French, bifold, louvered
- **Millwork** — wainscoting, paneling, coffered ceilings, beams, columns
- **Fine finish ceilings** — wood plank, beadboard, coffered panels
- **Fine finish walls** — wood paneled, shiplap, board-and-batten

### Does NOT apply to:
- Drywall walls/ceilings (use SF_DRYWALL specs)
- Exterior surfaces
- Metal surfaces
- Cabinet refinishing (strip/sand)

---

## Module Structure

### Standard Fine Finish Modules

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_FF_SETUP | setup | Protection, staging | binary |
| MOD_FF_INITIAL_PREP | prep | Fill, caulk, sand before first coat | qt_scaled |
| MOD_FF_PRIME | prime | Primer coat (if needed) | qt_scaled |
| MOD_FF_FINISH_COAT | finish | Finish coat application | qt_scaled |
| MOD_FF_INTERSTAGE | inspect | Between-coat maintenance | qt_scaled |
| MOD_FF_FINAL_INSPECT | inspect | Final quality check | qt_scaled |
| MOD_FF_CLEANUP | cleanup | Protection removal, touch-up | binary |

### Workflow Sequence

```
Scenario A (with primer):
  SETUP → INITIAL_PREP → PRIME → INTERSTAGE → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → FINAL_INSPECT → CLEANUP

Scenario B (factory-primed, no additional primer):
  SETUP → INITIAL_PREP → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → FINAL_INSPECT → CLEANUP
```

### Interstage Run Rule

**Critical:** Interstage runs AFTER each coat EXCEPT the final coat.

| Coat System | Interstage Runs |
|-------------|-----------------|
| Prime + 1 Finish | 1 (after prime) |
| Prime + 2 Finish | 2 (after prime, after finish 1) |
| 2 Finish (no prime) | 1 (after finish 1) |
| Prime + 2 Finish + Clear | 3 (after prime, after finish 1, after finish 2) |

---

## Quality Tier Scrutiny

### Inspection Distance

| Tier | Inspection Standard |
|------|---------------------|
| QT3 | Quick glance at 6 feet |
| QT4 | Systematic scan at 3 feet |
| QT5 | Lighted critical inspection at arm's length |

### Task Behavior by Tier

| Task | QT3 | QT4 | QT5 |
|------|-----|-----|-----|
| Light Sand | Spot sand only | Light full sand 220 grit | Thorough full sand 220-320 grit |
| Inspect Coat | Quick glance, obvious issues | Systematic scan, mark defects | Critical inspection, zero tolerance |
| Patch Repair | Glaring defects only | All marked defects | All defects regardless of size |
| Clean Work Area | Quick sweep | Thorough clean | Meticulous clean |

---

## Material System Alignment

| Quality Tier | Material System | Product Type |
|--------------|-----------------|--------------|
| QT3 | SYS_FF_STANDARD_ACRYLIC | 100% acrylic enamel |
| QT4 | SYS_FF_MODIFIED_URETHANE | Urethane-modified alkyd |
| QT5 | SYS_FF_PREMIUM / SYS_FF_GALLERY | Premium urethane/conversion |

### Sheen Restrictions

| Sheen | Minimum QT |
|-------|------------|
| Flat/Matte/Eggshell | QT3 |
| Satin | QT3 |
| Semi-gloss | QT4 |
| Gloss | QT5 |

---

## Defect Tolerance

### Application Failures (NEVER Acceptable)

These indicate improper technique and should NEVER exist at ANY tier:
- Runs
- Sags
- Drips
- Holidays (missed spots)
- Heavy orange peel from improper spray technique

### Tier-Based Tolerance

| Defect Type | QT3 | QT4 | QT5 |
|-------------|-----|-----|-----|
| Dust nibs | Acceptable if minor | Must be sanded | Zero tolerance |
| Brush marks | Acceptable if minimal | Light marks OK | Zero tolerance |
| Orange peel | Light acceptable | Very light OK | Zero tolerance |

---

## Required Inputs

Fine finish specs typically require:

| Input | UOM | PaintScope Key | Notes |
|-------|-----|----------------|-------|
| Trim LF | LF | PS_SURFACE_LF.TRIM_* | By trim type |
| Door count | EA_SIDE | PS_SURFACE_EA_SIDE.DOOR_* | Counted per side |
| Opening count | EA | PS_OPENING_EA.* | For open grain fill |
| Floor protection | SF | PS_PROTECT_SF.FLOOR_EXPOSED | If spray method |

---

## Task ID Patterns

Standard Fine Finish task IDs:

| Task ID | Name | task_class |
|---------|------|------------|
| TSK_FF_CLEAN_SURFACES_FLOORS | Clean Surfaces/Floors | binary |
| TSK_FF_SET_PROTECTION | Set Protection | binary |
| TSK_FF_FILL_FASTENERS | Fill Fastener Holes | qt_scaled |
| TSK_FF_FILL_GAPS | Fill Gaps/Cracks | qt_scaled |
| TSK_FF_CAULK_JOINTS | Caulk Joints | qt_scaled |
| TSK_FF_FULL_SAND | Full Surface Sand | qt_scaled |
| TSK_FF_CLEAN_DUST | Clean Sanding Dust | binary |
| TSK_FF_APPLY_PRIMER | Apply Primer | qt_scaled |
| TSK_FF_APPLY_FINISH | Apply Finish Coat | qt_scaled |
| TSK_FF_CLEAN_WORK_AREA | Clean Work Area (interstage) | binary |
| TSK_FF_INSPECT_COAT | Inspect Coat (interstage) | qt_scaled |
| TSK_FF_LIGHT_SAND | Light Sand (interstage) | qt_scaled |
| TSK_FF_PATCH_REPAIR | Patch/Repair Defects | qt_scaled |
| TSK_FF_SAND_PATCHES | Sand Patches | qt_scaled |
| TSK_FF_SPOT_COAT_PATCHES | Spot Coat Patches | qt_conditional |
| TSK_FF_FINAL_INSPECT | Final Inspection | qt_scaled |
| TSK_FF_REMOVE_PROTECTION | Remove Protection | binary |

---

## Core Principles

1. **Primer is Configuration, Not Tier-Locked** — Primer requirement driven by substrate, not quality tier
2. **Interstage Process is Universal** — Same cycle at all tiers, scrutiny level varies
3. **Quality Tier Controls Scrutiny, Not Process Steps** — Same tasks exist at all tiers
4. **Clear Coat is Optional Scope** — Configuration option, not automatic at any tier

---

## References

- `Claude/docs/Fine_Finish_Doctrine.md` — Canonical source
- `Claude/docs/Quality_Tiers_and_Surface_Condition.md` — Quality tier definitions
- `Claude/docs/Materials_and_Consumables_Doctrine.md` — Consumable usage patterns

# Mask Level Definitions Rollout

**Status:** DRAFT  
**Version:** 1.0  
**Created:** 2026-02-03  
**Author:** Eric / Claude  
**Purpose:** Standardize mask level terminology across PaintFactor specs and doctrine

---

## Overview

This document defines the three-tier mask level system and provides Claude Code prompts to update related documentation for consistency.

---

## New Doctrine: Mask Level Definitions

### Problem Statement

The terms `light_mask` and `full_mask` were being used interchangeably in specs without clear operational meaning. The existing `protection_level` enum (`edge_only`, `partial_cover`, `full_cover`) describes coverage extent but doesn't capture masking intent based on application method.

### Solution

Introduce a standardized `mask_level` vocabulary that describes coverage intent, independent of specific material selection.

---

## Mask Level Definitions

### Three-Tier System

| Mask Level | Components | Coverage Intent | Primary Use Case |
|------------|------------|-----------------|------------------|
| `light_mask` | Tape line only | Edge protection only; surface remains exposed | Brush/roll work requiring clean edge to cut into |
| `heavy_mask` | Tape line + border drape | Protective border around item being protected | Spray work requiring overspray buffer zone |
| `full_mask` | Tape line + complete encapsulation | Entire surface covered | Protecting finished surfaces from spray fallout |

### Key Principle

**Mask level describes coverage intent, not material selection.**

Material choices are situational within each level based on surface size, substrate type, and contractor preference. A `heavy_mask` might use 12" paper in one situation and 4' film in another—both are valid implementations of the same mask level.

### Material Options by Mask Level

| Mask Level | Acceptable Materials |
|------------|---------------------|
| `light_mask` | 1.5" or 2" painter's tape |
| `heavy_mask` | Tape + 12" paper, 18" paper, 24" paper, 4' masking film |
| `full_mask` | Tape + 6' film, 9' film, visqueen (0.35 mil), bulk plastic sheeting |

**Note:** The boundary between heavy_mask and full_mask materials is not rigid. A 4' film on a short cabinet might provide full coverage, while 9' film on a 10' wall is still heavy_mask. The mask level is determined by *intent* (border vs. encapsulation), not material width.

---

## Operational Examples

### Example 1: Painting Walls and Ceilings in Kitchen with Finished Cabinets

| Work Being Done | Application Method | Mask Level | Implementation |
|-----------------|-------------------|------------|----------------|
| Walls adjacent to cabinets | Brush/roll | `light_mask` | Tape line at wall-cabinet edge; brush cut-in to tape |
| Ceilings above cabinets | Spray | `heavy_mask` | Tape at cabinet top edge + film draped over cabinet faces |
| Full cabinet isolation for adjacent spray | Spray | `full_mask` | Tape + plastic wrapped tight around cabinet boxes like a Christmas present |

### Example 2: Painting Ceilings Only (Finished Walls Not in Scope)

| Mask Level | Implementation |
|------------|----------------|
| `light_mask` | Tape line at wall-ceiling edge; brush cut-in to tape line; wall surface exposed |
| `heavy_mask` | Tape at wall-ceiling edge + 12" paper or up to 4' film creating protective border down from ceiling |
| `full_mask` | Tape at wall-ceiling edge + draped plastic from ceiling to floor protecting entire wall |

### Example 3: Door Painting with Adjacent Finished Walls

| Work Being Done | Application Method | Mask Level | Implementation |
|-----------------|-------------------|------------|----------------|
| Door slab brush/roll | Brush/roll | `light_mask` | Tape at door-to-wall edge for clean line |
| Door slab spray | Spray | `heavy_mask` | Tape + masking film creating border on adjacent wall area |
| Door spray in finished hallway | Spray | `full_mask` | Tape + plastic encapsulating surrounding wall areas |

---

## Application Method Guidance

| Application Method | Typical Mask Level | Rationale |
|--------------------|-------------------|-----------|
| Brush only | `light_mask` | Minimal fallout; tape provides edge to cut into |
| Roll only | `light_mask` to `heavy_mask` | Some splatter risk on horizontal surfaces below work |
| Brush/roll combination | `light_mask` | Standard residential interior approach |
| Spray | `heavy_mask` to `full_mask` | Overspray requires buffer or full encapsulation depending on adjacency sensitivity |

### Decision Factors for Spray Work

| Factor | Favors `heavy_mask` | Favors `full_mask` |
|--------|--------------------|--------------------|
| Distance from spray | Adjacent surface is close but not directly in spray path | Adjacent surface is in direct spray path |
| Finish sensitivity | Adjacent surface can tolerate minor overspray dust | Adjacent surface is high-gloss or recently finished |
| Encapsulation feasibility | Surface is too large to fully cover efficiently | Surface can be wrapped/encapsulated |
| Production efficiency | Quick drape is sufficient | Full wrap is faster than cleanup would be |

---

## Relationship to Existing Schema

### Protection Level vs. Mask Level

| Field | Describes | Values | Used In |
|-------|-----------|--------|---------|
| `protection_level` | Coverage extent of a protection zone | `edge_only`, `partial_cover`, `full_cover` | spec.json `protection_zones_required`, task `protection_metadata` |
| `mask_level` | Masking approach for adjacent surfaces | `light_mask`, `heavy_mask`, `full_mask` | Task descriptions, SOP documentation, estimating guidance |

### Typical Mapping

| Mask Level | Maps to Protection Level |
|------------|-------------------------|
| `light_mask` | `edge_only` |
| `heavy_mask` | `partial_cover` |
| `full_mask` | `full_cover` |

**Note:** This mapping is typical but not absolute. The `protection_level` field in the schema continues to use the existing enum values. `mask_level` is primarily operational vocabulary for SOP documentation and task descriptions.

---

## Schema Considerations

### Option A: Add `mask_level` as Alias Documentation

Keep the existing `protection_level` enum unchanged but document that:
- `edge_only` = `light_mask` operationally
- `partial_cover` = `heavy_mask` operationally  
- `full_cover` = `full_mask` operationally

**Pros:** No schema changes required; backward compatible  
**Cons:** Two vocabularies to maintain

### Option B: Add `mask_level` as Separate Field

Add `mask_level` enum to task schema for masking-specific tasks where the operational term is more intuitive than `protection_level`.

```json
"mask_level": {
  "type": "string",
  "enum": ["light_mask", "heavy_mask", "full_mask"],
  "description": "Masking approach: light_mask (tape only), heavy_mask (tape + border drape), full_mask (complete encapsulation)"
}
```

**Pros:** Clear operational vocabulary; self-documenting  
**Cons:** Schema change; potential redundancy with `protection_level`

### Recommendation

Start with **Option A** (alias documentation) for now. If the operational vocabulary proves more intuitive during spec authoring, migrate to Option B in a future schema update.

---

## Claude Code Prompts

### Prompt 1: Update Protection_and_Masking_Doctrine.md

```
Update the file `Claude/docs/Doctrine/Protection_and_Masking_Doctrine.md` to add a new section for Mask Level Definitions.

Add this section AFTER the "Masking Adjacent Surfaces" section and BEFORE the "Plastic Sheeting Types" section:

---

## Mask Level Definitions

Mask levels standardize masking terminology based on coverage intent, not material selection.

### Three-Tier System

| Mask Level | Components | Coverage Intent | Primary Use Case |
|------------|------------|-----------------|------------------|
| `light_mask` | Tape line only | Edge protection only; surface remains exposed | Brush/roll work requiring clean edge to cut into |
| `heavy_mask` | Tape line + border drape | Protective border around item being protected | Spray work requiring overspray buffer zone |
| `full_mask` | Tape line + complete encapsulation | Entire surface covered | Protecting finished surfaces from spray fallout |

### Key Principle

**Mask level describes coverage intent, not material selection.** Material choices are situational within each level.

| Mask Level | Typical Materials |
|------------|-------------------|
| `light_mask` | 1.5" or 2" painter's tape |
| `heavy_mask` | Tape + 12"-24" paper, or 4' masking film |
| `full_mask` | Tape + 6'-9' film, visqueen, or bulk plastic |

### Application Method Guidance

| Application Method | Typical Mask Level | Rationale |
|--------------------|-------------------|-----------|
| Brush only | `light_mask` | Minimal fallout; tape provides cut-in edge |
| Brush/roll | `light_mask` | Standard approach; splatter risk is low |
| Roll only | `light_mask` to `heavy_mask` | Splatter risk on surfaces below |
| Spray | `heavy_mask` to `full_mask` | Overspray requires buffer or encapsulation |

### Operational Example: Cabinets

| Scenario | Mask Level | Implementation |
|----------|------------|----------------|
| Brush/roll walls adjacent to cabinets | `light_mask` | Tape line at wall-cabinet edge to cut into |
| Spray ceilings with cabinets below | `heavy_mask` | Tape + drape covering cabinet tops and faces |
| Spray work requiring full cabinet isolation | `full_mask` | Tape + plastic wrapped tight around cabinet boxes |

### Relationship to Protection Level Schema

| Mask Level | Maps to `protection_level` |
|------------|---------------------------|
| `light_mask` | `edge_only` |
| `heavy_mask` | `partial_cover` |
| `full_mask` | `full_cover` |

---

After adding, verify the document still flows logically and update the table of contents if one exists.
```

### Prompt 2: Update Spec_Completeness_Doctrine.md Protection Levels Table

```
In `Claude/docs/Doctrine/Spec_Completeness_Doctrine.md`, locate the "Protection Levels" table in the Layer 1: Protection Zones section.

Update the table to include the mask level alias:

FIND this table:
| Level | Description | Typical Materials | When Used |
|-------|-------------|-------------------|-----------|
| `edge_only` | Tape line at junction only | 1.5" tape | Brush/roll adjacent to asset |
| `partial_cover` | Horizontal surfaces + edge | Paper/plastic on tops + tape | Brush/roll with drip risk |
| `full_cover` | Entire exposed surface | Plastic sheeting, taped edges | Spray adjacent to asset |

REPLACE with:
| Level | Alias | Description | Typical Materials | When Used |
|-------|-------|-------------|-------------------|-----------|
| `edge_only` | `light_mask` | Tape line at junction only | 1.5" tape | Brush/roll adjacent to asset |
| `partial_cover` | `heavy_mask` | Border coverage with drape | Paper/film on border + tape | Spray buffer zone; drip risk areas |
| `full_cover` | `full_mask` | Entire exposed surface encapsulated | Plastic sheeting, taped edges | Spray adjacent to asset; full protection |

Add a note below the table:
> **Mask Level Alias:** The alias column provides operational terminology commonly used in SOP documentation. See Protection_and_Masking_Doctrine.md § Mask Level Definitions for detailed guidance.
```

### Prompt 3: Update Materials Manager Agent Prompt

```
In `Claude/agents/materials-manager.md`, locate the "Protection Level to Material Mapping" table.

Update to include mask level aliases:

FIND:
| Protection Level | Description | Typical Materials | Material Coverage |
|-----------------|-------------|-------------------|-------------------|
| `edge_only` | Tape line at junction only | 1.5" painter's tape | LF of junction |
| `partial_cover` | Horizontal surfaces + edge | Paper/plastic on tops + tape | SF of horizontal + LF of edge |
| `full_cover` | Entire exposed surface | Plastic sheeting, taped edges | SF of full surface + LF of perimeter tape |

REPLACE with:
| Protection Level | Mask Level Alias | Description | Typical Materials | Material Coverage |
|-----------------|------------------|-------------|-------------------|-------------------|
| `edge_only` | `light_mask` | Tape line at junction only | 1.5" painter's tape | LF of junction |
| `partial_cover` | `heavy_mask` | Border drape + edge | Tape + 12"-24" paper or 4' film | SF of border + LF of edge |
| `full_cover` | `full_mask` | Complete surface encapsulation | Tape + 6'-9' film, visqueen, bulk plastic | SF of full surface + LF of perimeter |
```

### Prompt 4: Verify Schema Documentation Consistency

```
Search the following files for any instances of `light_mask` or `full_mask` being used inconsistently or without definition:

1. Claude/specs/_schemas/spec.schema.json
2. Claude/specs/_schemas/sop_modules.schema.json
3. Claude/docs/Reference/Protection_Zones_Reference.md
4. Claude/docs/Doctrine/Interior_Protection_Doctrine_Final.md

Report any findings where these terms are used but not aligned with the new three-tier definition:
- light_mask = tape line only
- heavy_mask = tape + border drape
- full_mask = tape + complete encapsulation

If inconsistencies are found, propose specific corrections.
```

---

## Validation Checklist

After executing the Claude Code prompts:

- [ ] Protection_and_Masking_Doctrine.md contains new Mask Level Definitions section
- [ ] Spec_Completeness_Doctrine.md protection levels table includes alias column
- [ ] Materials Manager agent prompt updated with alias column
- [ ] No orphaned references to `light_mask` or `full_mask` without context
- [ ] All three mask levels are consistently defined across documentation

---

## Future Considerations

1. **Schema enum addition:** If the mask level vocabulary proves more intuitive during spec authoring, add `mask_level` as a formal enum in sop_modules.schema.json

2. **Task naming convention:** Consider standardizing protection task names to include mask level (e.g., `TSK_PROTECT_CABINET_HEAVY_MASK` vs. `TSK_PROTECT_CABINET_FULL_MASK`)

3. **PaintScope integration:** Mask level could become a dimension in protection zone declarations, allowing the estimator to select mask level based on project conditions

---

## References

- [Protection_and_Masking_Doctrine.md](Claude/docs/Doctrine/Protection_and_Masking_Doctrine.md)
- [Spec_Completeness_Doctrine.md](Claude/docs/Doctrine/Spec_Completeness_Doctrine.md)
- [Protection_Zones_Reference.md](Claude/docs/Reference/Protection_Zones_Reference.md)
- [Interior_Protection_Doctrine_Final.md](Claude/docs/Doctrine/Interior_Protection_Doctrine_Final.md)

# PaintScope Stairwell Geometry System — Complete Specification

**Spec Family ID:** PAINTSCOPE_STAIRWELL_GEOMETRY_SYSTEM  
**Status:** DRAFT  
**Version:** 0.1.0  
**Effective Date:** 2026-02-08  
**Source:** Stairwell Estimation Strategy (conversation 2026-01-29)

---

## Overview

The Stairwell Geometry System is a module within PaintScope that derives paintable surface areas for stairwells from a minimal set of inputs. It exploits the fact that stair geometry is **code-constrained** — building code mandates specific riser heights and tread depths — making derivation deterministic rather than heuristic.

This is not AI hallucinating measurements. The math is deterministic from physical constraints codified in the International Residential Code (IRC).

### Design Philosophy

**Count steps, derive geometry.** The number of risers combined with code-mandated dimensions produces total rise, total run, rake length, and wall heights without a tape measure.

**Minimal input, maximum derivation.** Five fields (style, risers, width, starting ceiling height, ceiling type) produce ceiling SF, wall SF, max working height, and access method determination.

**Override always available.** Derived values serve as defaults. If a tech measures directly, their measurement replaces the derivation. The system never forces a derived value over a field measurement.

**Stairwells are special space types.** Standard room logic fails for stairwells because ceiling heights vary, wall heights differ along the run, and multiple access conditions exist within the same space. Stairwells require their own data model.

---

## Why Standard Room Logic Fails

| Standard Room | Stairwell |
|---------------|-----------|
| Uniform ceiling height | Varying heights (raked, stepped, or both) |
| Wall SF derivable from perimeter × height | Wall heights vary along the run |
| Single height modifier applies | Multiple access conditions in same space |
| Ceiling SF ≈ floor SF | Ceiling geometry is complex (rake angle, landings) |

---

## Code-Constrained Geometry

### IRC Residential Code Parameters

| Parameter | IRC Code Limit | Typical Value Used |
|-----------|---------------|--------------------|
| Riser height | 7.75" max | 7.5" (0.625 ft) |
| Tread depth | 10" min | 10.5" (0.875 ft) |
| Headroom clearance | 6'8" min | — |

### Core Derivation Formulas

```
CONSTANTS:
  RISER_HEIGHT = 7.5 in = 0.625 ft
  TREAD_DEPTH  = 10.5 in = 0.875 ft

DERIVED FROM RISER COUNT:
  total_rise = risers × RISER_HEIGHT
  total_run  = (risers - 1) × TREAD_DEPTH
  rake_length = √(total_rise² + total_run²)
  max_working_height = h_start + total_rise
```

### Worked Example: 14 Risers

```
total_rise  = 14 × 0.625 ft = 8.75 ft
total_run   = 13 × 0.875 ft = 11.375 ft ≈ 11.4 ft
rake_length = √(8.75² + 11.4²) = √(76.6 + 130.0) = √206.6 ≈ 14.4 ft
max_working_height = 8.0 + 8.75 = 16.75 ft (assuming 8 ft starting ceiling)
```

---

## PaintScope Data Entry — Minimum Required Inputs

| Field | Input Type | Required | Default |
|-------|------------|----------|---------|
| Stairwell style | Dropdown: straight, L-shape, U-shape, winder, spiral | Yes | — |
| Number of risers | Integer | Yes | — |
| Stairwell width | Feet (decimal) | Yes | 3.5 |
| Starting ceiling height | Feet (decimal) | Yes | 8.0 |
| Ceiling type | Dropdown: raked, flat, stepped, open_to_above | Yes | — |

### Optional Overrides

| Field | Purpose |
|-------|---------|
| Measured ceiling SF | Tech override of derived ceiling SF |
| Measured wall SF | Tech override of derived total wall SF |
| Measured riser height | Override 7.5" default if non-standard (rare) |
| Measured tread depth | Override 10.5" default if non-standard (rare) |

When an override is provided, PaintScope uses the measured value and flags it as `source: measured` rather than `source: derived`.

---

## Ceiling SF Derivation by Type

### Raked Ceiling

Follows the stair angle. The painted surface is the rake length × stairwell width.

```
ceiling_sf = rake_length × width

Example (14 risers, 3.5 ft width):
  ceiling_sf = 14.4 × 3.5 = 50.4 SF
```

### Flat Ceiling (Open to Above)

The ceiling is at the upper floor height. The stairwell opens through it.

```
ceiling_sf = 0  (no ceiling work in stairwell; ceiling counted in upper floor room)
```

If there is a partial ceiling over the lower landing:

```
ceiling_sf = landing_depth × width
```

### Stepped Flat Ceiling

Multiple flat ceiling segments at different heights. Harder to derive precisely because step count and depth of each flat section varies.

```
ceiling_sf = total_run × width × 1.1  (approximation with overlap factor)
```

> **⚠ Open Question:** The 1.1× multiplier for stepped ceilings is an approximation. This needs field validation to determine whether a more precise derivation is feasible or if stepped ceilings should require direct measurement.

### Open to Above

No ceiling painting in the stairwell space. Ceiling is counted as part of the room above.

```
ceiling_sf = 0
```

---

## Wall SF Derivation (Straight Stairwell)

For an enclosed straight stairwell with width W:

### Wall Components

| Wall | Height Formula | SF Formula |
|------|----------------|------------|
| Tall wall (bottom, looking up) | h_start + total_rise | width × (h_start + total_rise) |
| Short wall (top landing) | h_start | width × h_start |
| Stringer walls (×2, along stairs) | Average height | total_run × avg_height × 2 |

### Stringer Wall Approximation

The stringer walls run along the stairs. Their height varies from bottom to top. The average height provides a workable approximation:

```
avg_height = h_start + (total_rise / 2)
stringer_sf_each = total_run × avg_height
stringer_sf_total = 2 × total_run × avg_height
```

### Total Wall SF

```
total_wall_sf = tall_wall + short_wall + stringer_walls

Where:
  tall_wall     = width × (h_start + total_rise)
  short_wall    = width × h_start
  stringer_walls = 2 × total_run × (h_start + total_rise / 2)
```

### Worked Example: 14 Risers, 3.5 ft Width, 8 ft Starting Height

```
tall_wall      = 3.5 × (8.0 + 8.75)     = 3.5 × 16.75  = 58.6 SF
short_wall     = 3.5 × 8.0               = 3.5 × 8.0    = 28.0 SF
avg_height     = 8.0 + (8.75 / 2)        = 12.375 ft
stringer_each  = 11.4 × 12.375           = 141.1 SF
stringer_total = 2 × 141.1               = 282.2 SF

total_wall_sf  = 58.6 + 28.0 + 282.2     = 368.8 SF
```

---

## Multi-Run Stairwells

The derivation logic for straight stairwells extends additively to multi-run configurations.

### L-Shape Stairwell

Two straight runs connected by a 90° landing.

```
Run 1: Apply straight derivation with risers_run1
Run 2: Apply straight derivation with risers_run2
Landing: Add landing wall SF (landing_length × landing_width ceiling, plus landing walls)

Total = Run 1 derived SF + Run 2 derived SF + Landing SF
```

**Required additional inputs for L-shape:**
- Risers per run (run 1 count, run 2 count)
- Landing dimensions (length × width)

### U-Shape Stairwell

Two parallel runs connected by a 180° landing. Same additive logic as L-shape but the runs are parallel rather than perpendicular.

**Required additional inputs for U-shape:**
- Risers per run (run 1 count, run 2 count)
- Landing dimensions (length × width)

### Winder and Spiral

> **⚠ Open Question:** Winder and spiral stairwells have non-rectangular geometry that breaks the straight-run derivation model. Winders have pie-shaped treads at the turn. Spirals have continuously curving geometry. These likely require either:
> - Direct measurement (override mode)
> - A separate derivation model specific to winder/spiral geometry
> - A heuristic multiplier applied to equivalent straight-run calculations
>
> **Decision needed before PaintScope implementation.**

---

## Max Working Height Derivation

Max working height is critical for access method determination and modifier application.

```
max_working_height = h_start + total_rise

Example (14 risers, 8 ft start):
  max_working_height = 8.0 + 8.75 = 16.75 ft
```

This value feeds directly into the access method and modifier system.

---

## Stairwell Access Modifiers

Unlike standard ceiling height modifiers, stairwell access is determined by the **access method required**, not just nominal height. A 14-ft stairwell wall might need an articulating ladder (1.8×) while a 14-ft standard room uses an extension ladder (1.5×) — the constrained geometry creates different access conditions.

| Access Method | Max Height Range | Time Modifier | Equipment Notes |
|---------------|-----------------|---------------|-----------------|
| Step ladder | ≤12 ft | 1.3 | Standard step ladder work |
| Extension ladder | 12–16 ft | 1.6 | Requires solid footing, spotter |
| Articulating ladder | 12–18 ft | 1.8 | Little Giant type, repositioning time |
| Stair scaffold (adjustable legs) | 16–22 ft | 2.2 | Baker scaffold, setup time significant |
| Rolling scaffold w/ outriggers | 20–28 ft | 2.5 | Major setup, multiple repositions |
| Lift (if accessible) | 28+ ft | 2.8 | Rare in residential, equipment rental |

> **RESOLVED:** Stairwell access modifiers ADD TO standard height modifiers for drywall/ceiling work (they represent the additional difficulty of constrained stairwell geometry on top of working height). For stair component work (risers, stringers, railings), the stairwell access modifier alone applies — risers use H1 (accessible from treads), stringers use the stairwell access modifier based on max_working_height.

### Ceiling Type Modifiers (Stack with Access)

These modifiers apply on top of the access method modifier for ceiling work:

| Ceiling Type | Modifier | Rationale |
|--------------|----------|-----------|
| Flat stepped | 1.0 | Discrete flat sections at different heights |
| Raked (follows stair angle) | 1.15 | Continuous angle, extension pole technique |
| Combination | 1.2 | Mixed geometry, more repositioning |
| Open to above | 0.9 | No ceiling work in stairwell (counted elsewhere) |

---

## Complete Derivation Logic (Pseudocode)

```
FUNCTION derive_stairwell_geometry(style, risers, width, h_start, ceiling_type):

  // Constants
  RISER_HEIGHT = 0.625  // ft (7.5 in)
  TREAD_DEPTH  = 0.875  // ft (10.5 in)

  // Core derivations
  total_rise = risers × RISER_HEIGHT
  total_run  = (risers - 1) × TREAD_DEPTH
  rake_length = sqrt(total_rise² + total_run²)
  max_working_height = h_start + total_rise

  // Ceiling SF
  IF ceiling_type == 'raked':
    ceiling_sf = rake_length × width
  ELIF ceiling_type == 'flat' OR ceiling_type == 'open_to_above':
    ceiling_sf = 0
  ELIF ceiling_type == 'stepped':
    ceiling_sf = total_run × width × 1.1  // approximation

  // Wall SF (straight stairwell)
  IF style == 'straight':
    tall_wall = width × (h_start + total_rise)
    short_wall = width × h_start
    avg_height = h_start + (total_rise / 2)
    stringer_walls = 2 × total_run × avg_height
    total_wall_sf = tall_wall + short_wall + stringer_walls

  ELIF style IN ('l_shape', 'u_shape'):
    // Requires per-run riser counts and landing dimensions
    // Apply straight logic to each run, add landing SF
    // See Multi-Run Stairwells section
    REQUIRES: risers_run1, risers_run2, landing_length, landing_width

  ELIF style IN ('winder', 'spiral'):
    // No derivation model yet — require direct measurement
    REQUIRES: measured_ceiling_sf, measured_wall_sf

  RETURN {
    total_rise,
    total_run,
    rake_length,
    max_working_height,
    ceiling_sf,       // or NULL if override required
    total_wall_sf,    // or NULL if override required
    source: 'derived' // vs 'measured' if overridden
  }
```

---

## Proposed PaintScope Quantity Keys

These keys would be added to the PaintScope Quantity Key Catalog for stairwell geometry:

### Stairwell Meta Keys

- `PS_META.STAIRWELL.STYLE` — Enum: straight, l_shape, u_shape, winder, spiral
- `PS_META.STAIRWELL.RISERS` — Integer count of risers
- `PS_META.STAIRWELL.WIDTH_FT` — Stairwell width in feet
- `PS_META.STAIRWELL.H_START_FT` — Starting ceiling height in feet
- `PS_META.STAIRWELL.CEILING_TYPE` — Enum: raked, flat, stepped, open_to_above

### Derived Geometry Keys

- `PS_STAIRWELL.TOTAL_RISE_FT` — Total vertical travel (derived)
- `PS_STAIRWELL.TOTAL_RUN_FT` — Total horizontal travel (derived)
- `PS_STAIRWELL.RAKE_LENGTH_FT` — Diagonal distance bottom-to-top (derived)
- `PS_STAIRWELL.MAX_WORKING_HEIGHT_FT` — Maximum height requiring access (derived)

### Surface Keys

- `PS_SURFACE_SF.STAIRWELL_CEILING` — Ceiling SF (derived or measured override)
- `PS_SURFACE_SF.STAIRWELL_WALL_TOTAL` — Total wall SF (derived or measured override)
- `PS_SURFACE_SF.STAIRWELL_WALL_TALL` — Tall wall SF (derived)
- `PS_SURFACE_SF.STAIRWELL_WALL_SHORT` — Short wall SF (derived)
- `PS_SURFACE_SF.STAIRWELL_WALL_STRINGER` — Combined stringer wall SF (derived)

### Edge Keys

- `PS_EDGE_LF.STAIRWELL_TO_CEILING` — Edge LF where stairwell walls meet ceiling
- `PS_EDGE_LF.STAIRWELL_TO_TRIM` — Edge LF where stairwell walls meet trim (stringer boards, etc.)

> **⚠ Open Question:** Are stairwell-specific PaintScope keys necessary, or should stairwell surfaces use the standard `PS_SURFACE_SF.WALL_FIELD` and `PS_SURFACE_SF.CEILING_FIELD` keys with a stairwell room type flag? The Window Counting System created its own key namespace. Need to decide the pattern for stairwells.

---

## Integration with Stairway Component Specs

This geometry system covers **drywall surfaces only** (walls and ceilings). Stairway component painting (treads, risers, skirtboards, balusters, newels, railings) is handled by separate atomic specs that consume their own PaintScope keys.

The stairwell geometry system establishes the **spatial context** that those component specs operate within — particularly for access method determination and protection zone establishment.

### Scope Boundary

| In Scope (This System) | Out of Scope (Component Specs) |
|------------------------|-------------------------------|
| Stairwell wall SF | Tread/riser SF |
| Stairwell ceiling SF | Skirtboard LF |
| Max working height | Baluster EA / LF |
| Access method determination | Newel post EA |
| Protection zone context | Handrail LF |

### Cross-Reference

The Stairway Painting Doctrine (under development) covers sequencing, access, and cross-surface coordination for the complete stairway painting system. This geometry system feeds that doctrine with spatial data.

---

## Open Questions Summary

The following questions were identified during development and remain unresolved. Each must be answered before PaintScope implementation.

### 1. Multi-Run Data Model

**Question:** Should PaintScope handle multi-run stairwells (L-shape, U-shape) as a single stairwell object with an "add run" capability, or as separate stairwell entries that are linked?

**Considerations:** Single object is simpler for the estimator but requires more complex data entry UI. Separate linked entries are more modular but require a linking mechanism and risk inconsistency.

**Status:** Eric leaned toward single object with "add run" but no final decision.

### 2. Winder and Spiral Derivation

**Question:** Can winder and spiral stairwells use a derivation model, or must they require direct measurement?

**Considerations:** Winders have pie-shaped treads that don't follow the rectangular tread model. Spirals have continuously curving geometry. A heuristic multiplier on equivalent straight-run calculations could work for estimation purposes but needs field validation.

**Status:** No derivation model developed. Currently defaults to direct measurement override.

### 3. Stepped Ceiling Approximation

**Question:** Is the 1.1× multiplier for stepped ceiling SF adequate, or does this need a more precise model?

**Considerations:** Stepped ceilings vary widely — some have 2–3 large flat sections, others have many small steps. The 1.1× factor was proposed as a rough approximation. Field measurement comparison data would validate or refine this.

**Status:** Approximation proposed, not field-validated.

### 4. Landing Dimensions for Multi-Run

**Question:** How should landing dimensions be captured for L-shape and U-shape stairwells?

**Considerations:** Landings add both ceiling SF and wall SF that can't be derived from riser count alone. Need to decide if landing is a simple length × width input or requires more detail.

**Status:** Identified as required input but no UI/data model designed.

### 5. Stairwell as Room Type vs. Special Object

**Question:** Is a stairwell a room with a special type flag, or a distinct PaintScope object type separate from rooms?

**Considerations:** Rooms have length, width, height — stairwells don't fit this model cleanly. But treating stairwells as a separate object type means they can't inherit room-level defaults (quality tier, finish groups, etc.). The Window Counting System exists as a module within the room model.

**Status:** Not decided. Architectural decision needed.

### 6. Access Modifier Stacking — **RESOLVED**

**Question:** Do stairwell access modifiers replace or stack with standard height modifiers from the Estimation Modifiers Doctrine?

**Resolution:** Stairwell access modifiers ADD TO standard height modifiers for drywall/ceiling work in stairwells. They represent the additional difficulty of constrained stairwell geometry on top of working height. For stair component work (risers, stringers, railings), the stairwell access modifier alone applies — risers use H1 (accessible from treads), stringers use the stairwell access modifier based on max_working_height.

**Status:** RESOLVED (2026-02-08).

### 7. Open Stairwells / Open-to-Below

**Question:** How should open stairwells (no enclosing walls on one or more sides, e.g., two-story foyer with open staircase) be handled?

**Considerations:** Open stairwells reduce wall SF (some walls don't exist) but may increase ceiling complexity and access difficulty. The tall wall might actually be a room wall, not a stairwell wall, creating an ownership question for which space claims that SF.

**Status:** Identified in the original data model as a flag (`open_to_below: boolean`) but derivation logic not developed.

### 8. Hover Integration

**Question:** Can Hover (photo-based room measurement app) capture stairwell geometry, and if so, does that obsolete this derivation system?

**Considerations:** Hover may struggle with stairwell geometry due to the multi-level, non-rectangular space. Even if Hover can capture it, the riser-count method serves as a fast validation cross-check and a fallback when Hover data isn't available. The derivation system has value as both primary capture and validation tool.

**Status:** Long-term consideration. Derivation system should be built regardless.

---

## Cross-References

### Related Doctrine Documents
- Stairway Painting Doctrine (in development) — Sequencing, access, cross-surface coordination
- `Estimation_Modifiers_Doctrine.md` — Height modifiers, access modifiers
- `Interior_Protection_Doctrine.md` — Protection zone patterns in stairwells
- `Quality_Tiers_and_Surface_Condition.md` — Line-item QT assignment

### Related PaintScope Documents
- `PaintScope_Quantity_Key_Catalog.md` — Key namespace and registration
- `PaintScope_Adjacency_Schema.md` — Edge and adjacency model
- `PaintScope_Window_Counting_System.md` — Analogous derivation system for windows
- `PaintScope_Asset_Catalog.md` — Stair/railing assets for protection

### Source Conversation
- [Standardizing stairwell ceiling data entry for paint estimation](https://claude.ai/chat/8e4dd569-bb9b-4948-802f-e072fdadb79f) (2026-01-29)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-08 | Eric + Claude | Initial specification from conversation capture |

# Typical Finish Groups Reference

**Status:** DRAFT  
**Version:** 1.0.0  
**Last Updated:** 2026-02-03  
**Doctrine Level:** 3  
**Authority:** Finish_Group_Declaration_System.md

This reference captures common finish group patterns in residential painting. PaintScope uses these as smart defaults when contractors create estimates. Contractors always have final authority on actual finish group assignments.

---

## 1. Overview

### 1.1 Purpose

Finish groups define which surfaces share the same color/sheen. This reference documents **typical industry patterns** — not rules, but common defaults that:

- Speed up estimate creation (auto-suggest groupings)
- Reduce contractor data entry
- Ensure consistent finish continuity optimization
- Capture domain knowledge independent of individual specs

### 1.2 How This Is Used

| System | Usage |
|--------|-------|
| **PaintScope** | Auto-suggest finish groups when contractor adds surfaces to scope |
| **Estimation Engine** | Reference for default `same_finish` assumptions if no explicit assignment |
| **Specs** | DO NOT reference — specs declare adjacencies, not finish groups |

### 1.3 Contractor Override

These are **defaults only**. Contractors override based on:
- Client preferences
- Accent colors
- Room-specific treatments
- Project scope limitations

---

## 2. Standard Finish Group Patterns

### 2.1 FG_TRIM — Interior Trim Package

The most common finish group in residential painting. All interior trim elements share the same color and sheen.

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `trim_baseboard` | Baseboard | Core element |
| `trim_casing_door` | Door casing | Core element |
| `trim_casing_window` | Window casing | Core element |
| `trim_crown` | Crown molding | When present |
| `trim_chair_rail` | Chair rail | When present |
| `trim_shoe` | Shoe molding | When present |
| `door_frame` | Door frame/jamb | Typically matches casing |
| `window_jamb` | Window jamb | Typically matches casing |
| `window_sill` | Window sill | Typically matches casing |

**Typical Sheen:** Semi-gloss (traditional) or Satin (modern preference)

**Common Variations:**
- Crown molding sometimes matches ceiling instead of trim
- Chair rail may be accent color in formal dining rooms

---

### 2.2 FG_TRIM_AND_DOORS — Trim + Door Slabs

Extension of FG_TRIM that includes door slabs. Very common in production/builder-grade work.

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| *All surfaces from FG_TRIM* | | |
| `door_slab_interior` | Interior door slab | Both sides |
| `door_slab_closet` | Closet door slab | Both sides |
| `door_slab_bifold` | Bifold door slab | Both sides |

**Typical Sheen:** Semi-gloss

**When Used:**
- New construction (standard)
- Whole-house repaints
- When simplicity is preferred over accent options

---

### 2.3 FG_DOORS_ACCENT — Accent Door Slabs

When door slabs are a different color from trim (accent color, contrasting, or client-selected feature).

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `door_slab_interior` | Interior door slab | Accent color |
| `door_slab_closet` | Closet door slab | May or may not match |

**Typical Sheen:** Semi-gloss or Satin

**When Used:**
- Designer/custom homes
- Statement doors (black, navy, bold colors)
- When client wants door color flexibility

**Note:** When doors are accent, trim typically remains in FG_TRIM as a separate group.

---

### 2.4 FG_WALLS — Wall Surfaces Only

Standard wall treatment when walls and ceilings are different colors (traditional approach).

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `wall_field` | Main wall area | All rooms unless accent |

**Typical Sheen:** Eggshell (standard) or Satin (high-traffic areas)

**Common Variations:**
- Bathroom walls may be separate group (higher sheen)
- Kitchen walls may be separate group (scrubbable finish)

---

### 2.5 FG_CEILINGS — Ceiling Surfaces Only

Standard ceiling treatment — typically white or near-white, flat sheen.

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `ceiling_field` | Main ceiling area | All rooms |

**Typical Sheen:** Flat (standard) or Eggshell (moisture-prone areas)

**Common Variations:**
- Bathroom ceilings may be higher sheen
- Tray ceiling detail may be accent color

---

### 2.6 FG_WALLS_CEILINGS — Unified Walls + Ceilings

Modern open-concept treatment where walls and ceilings share the same color for seamless flow.

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `wall_field` | Main wall area | All rooms |
| `ceiling_field` | Main ceiling area | All rooms |

**Typical Sheen:** Flat on ceilings, Eggshell on walls (same color, different sheen acceptable)

**When Used:**
- Open floor plans
- Modern/contemporary design
- Scandinavian aesthetic
- When client wants "envelope" effect

**Finish Continuity Impact:** Eliminates wall-to-ceiling cut-in precision — significant labor savings.

---

### 2.7 FG_CABINETS — Cabinet System

Kitchen and bathroom cabinet finish group.

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `cabinet_box_interior` | Cabinet interior box | When painted |
| `cabinet_box_exterior` | Cabinet exterior box | Face frames, sides |
| `cabinet_door` | Cabinet doors | Fronts and backs |
| `cabinet_drawer_front` | Drawer fronts | |
| `cabinet_end_panel` | Exposed end panels | |

**Typical Sheen:** Semi-gloss or Satin (durability required)

**Common Variations:**
- Interior boxes sometimes left unpainted or different color
- Island cabinets may be accent color (separate group)

---

### 2.8 FG_BUILT_INS — Built-In Elements

Built-in cabinetry, shelving, and millwork features.

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `built_in_shelving` | Fixed shelving units | Libraries, offices |
| `closet_shelving` | Closet shelf systems | When painted |
| `entertainment_center` | Entertainment built-ins | |
| `window_seat` | Window seat boxes | |
| `mudroom_cubbies` | Mudroom storage | |
| `bench_built_in` | Built-in benches | |

**Typical Sheen:** Semi-gloss or Satin

**Common Treatment:**
- Often matches FG_TRIM (same color as surrounding trim)
- Sometimes matches FG_WALLS (blends into room)
- Occasionally accent color (feature element)

---

### 2.9 FG_ACCENT_WALL — Accent Wall Treatment

Single wall or wall section as a design feature.

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `wall_accent` | Accent wall | Single wall, different color |

**Typical Sheen:** Matches main wall sheen (Eggshell/Satin)

**When Used:**
- Feature walls (fireplace, behind bed, dining room)
- Color blocking design
- Client-requested focal points

---

### 2.10 FG_MILLWORK — Architectural Millwork

Specialized architectural wood elements, often high-end.

| Surface ID | Surface Name | Notes |
|------------|--------------|-------|
| `wainscot_panel` | Wainscoting panels | |
| `wainscot_rail` | Wainscot cap rail | |
| `wall_paneling` | Full wall paneling | |
| `coffered_ceiling_beam` | Coffered ceiling beams | |
| `coffered_ceiling_panel` | Coffered ceiling panels | |
| `column` | Columns | |
| `beam_decorative` | Decorative beams | |
| `fireplace_surround` | Fireplace mantel/surround | |

**Typical Sheen:** Semi-gloss (painted) or Clear (stained)

**Common Treatment:**
- Often matches FG_TRIM
- May be stained (separate system entirely)
- High-end may be custom color

---

## 3. New Construction Default Groupings

### 3.1 Builder Grade / Production (QT2-QT3)

| Finish Group | Surfaces | Notes |
|--------------|----------|-------|
| FG_TRIM_AND_DOORS | All trim + door slabs + jambs | One color, one sheen |
| FG_WALLS | All walls | One color (maybe 2 for accent) |
| FG_CEILINGS | All ceilings | White, flat |

**Total Groups:** 3 (minimal complexity)

### 3.2 Custom Home (QT4)

| Finish Group | Surfaces | Notes |
|--------------|----------|-------|
| FG_TRIM | All trim elements | |
| FG_DOORS | Door slabs | May match trim or accent |
| FG_WALLS | Main walls | |
| FG_ACCENT_WALL | Feature walls | If specified |
| FG_CEILINGS | All ceilings | |
| FG_CABINETS | Kitchen/bath cabinets | If in scope |

**Total Groups:** 4-6 (moderate complexity)

### 3.3 Luxury / Architect-Specified (QT5)

| Finish Group | Surfaces | Notes |
|--------------|----------|-------|
| FG_TRIM | Standard trim | |
| FG_MILLWORK | Architectural millwork | May differ from trim |
| FG_DOORS | Door slabs | Often accent |
| FG_WALLS | Main walls | |
| FG_ACCENT_WALL | Feature walls | Multiple possible |
| FG_CEILINGS | Standard ceilings | |
| FG_CEILING_FEATURE | Coffered/tray ceilings | |
| FG_CABINETS | Cabinets | |
| FG_BUILT_INS | Built-in elements | |

**Total Groups:** 6-10+ (high complexity)

---

## 4. Repaint Default Groupings

### 4.1 Walls Only Repaint

| Finish Group | Surfaces | Notes |
|--------------|----------|-------|
| FG_WALLS | All walls in scope | |
| FG_CEILINGS | All ceilings in scope | If included |

**Trim typically not in scope** — no trim finish group needed.

### 4.2 Whole House Repaint

Similar to new construction defaults based on quality tier.

### 4.3 Room-by-Room Repaint

May have **room-specific groups** when colors vary:

| Finish Group | Surfaces | Notes |
|--------------|----------|-------|
| FG_WALLS_MASTER | Master bedroom walls | Color A |
| FG_WALLS_KIDS | Kids rooms walls | Color B |
| FG_WALLS_COMMON | Living/dining/kitchen walls | Color C |
| FG_CEILINGS | All ceilings | White |
| FG_TRIM | All trim | White |

---

## 5. PaintScope Implementation Guidance

### 5.1 Auto-Suggest Logic

When contractor adds surfaces to scope:

1. Look up surface in this reference
2. Find which finish groups commonly include it
3. Suggest: "Add to existing group [X]?" or "Create new group [typical name]?"

### 5.2 Conflict Detection

When surfaces are assigned to unexpected groups:

- Warn if `trim_baseboard` and `door_slab` are in different groups (common pattern broken)
- Don't block — contractor may have valid reason

### 5.3 Default Group Names

Use the `FG_*` IDs from this reference as default group names. Contractor can rename.

---

## 6. Relationship to Other Systems

### 6.1 Surface Vocabulary Reference

This document uses Surface IDs from `Surface_Vocabulary_Reference.md`. If a surface ID doesn't exist there, it shouldn't appear here.

### 6.2 Adjacency Declarations

Specs declare `typical_relationship: same_finish | different_finish` between adjacent surfaces. This reference provides the **grouping context** — which surfaces typically share a finish — while adjacency declarations provide the **pairwise context** — what happens at the boundary.

### 6.3 Finish Group Declaration System

`Future_Work/Finish_Group_Declaration_System.md` defines the project-level UI and database schema. This reference feeds the **defaults** into that system.

### 6.4 Substrate State

Finish group membership is independent of substrate state. A surface can be `SS_BARE` and still be assigned to `FG_TRIM`. State affects prep/prime; finish group affects color/continuity.

---

## 7. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-03 | Eric + Claude | Initial reference document |

---

## 8. Related Documents

- `Surface_Vocabulary_Reference.md` — Canonical surface IDs
- `Finish_Group_Declaration_System.md` — Project-level implementation spec
- `Engine_State_Coordination_Architecture.md` — How engine uses finish groups
- `Spec_Completeness_Doctrine.md` — Finish continuity resolution logic

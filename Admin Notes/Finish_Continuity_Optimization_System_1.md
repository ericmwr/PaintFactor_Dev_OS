# Finish Continuity Optimization System

**Status:** Draft - Filed for Future Implementation  
**Created:** 2025-01-25  
**Purpose:** Capture the architectural concept for project-level finish continuity optimization

---

## Overview

When adjacent surfaces share the same product, sheen, and color, significant efficiency gains are possible by eliminating edge masking, enabling continuous application, and simplifying equipment setup. This document defines the metadata structures and engine behaviors needed to capture and exploit these efficiencies.

**Related System:** Protection Zone Optimization (same architectural pattern)

---

## Document Contents

1. Finish Continuity Doctrine — Conceptual framework and rules
2. Adjacency Metadata Schema — Task-level schema additions
3. Surface Adjacency Vocabulary — Standardized surface IDs
4. Finish Group Structure — Project-level configuration

---

# 1. Finish Continuity Doctrine

## The Opportunity

Professional painting projects often include multiple substrates that touch each other:

- Walls meet trim at baseboards, casings, and crown
- Door casings meet door frames meet door leaves
- Window casings meet jambs meet stools meet aprons
- Paneled walls meet baseboards

When these adjacent surfaces receive **different finishes** (different product, sheen, or color), painters must:

- Mask edges between surfaces
- Cut careful lines
- Stop spray patterns at boundaries
- Potentially change equipment/product between operations

When adjacent surfaces receive the **same finish**, painters can:

- Skip edge masking between them
- Apply continuously across boundaries
- Feather/blend instead of cutting lines
- Maintain single product in equipment

**This is a significant production efficiency factor that varies by project.**

## Terminology

| Term | Definition |
|------|------------|
| Adjacent Surfaces | Two substrate surfaces that physically touch or meet at an edge |
| Finish Group | A set of surfaces receiving identical product, sheen, and color |
| Continuous Finish | Adjacent surfaces in the same finish group (no edge break needed) |
| Discontinuous Finish | Adjacent surfaces in different finish groups (edge definition required) |
| Edge Break | The visible line where two different finishes meet |
| Blending (Brushwork) | Feathering wet edge across surface boundary using brush at intersecting edges (continuous finish only, brush/roll method) |

## The Principle

**Specs are authored for the discontinuous case** (adjacent surfaces have different finishes). This is the more complex scenario requiring edge masking and careful cut lines.

**The estimation engine optimizes for continuity** when project-level finish assignments indicate adjacent surfaces share a finish group. Optimization includes:

- Skipping edge masking tasks
- Replacing cut-in tasks with blend tasks (brush/roll only)
- Applying production rate modifiers
- Potentially merging work sequences

## Common Continuity Scenarios

### Economy/Budget Work

| Surfaces | Typical Approach | Continuity Benefit |
|----------|------------------|-------------------|
| Walls + Trim + Doors | All painted wall color, same product | Massive - one continuous operation |
| Ceiling + Crown | Both ceiling white | Skip crown/ceiling edge masking |

### Paneled/Architectural

| Surfaces | Typical Approach | Continuity Benefit |
|----------|------------------|-------------------|
| Wall panels + Baseboard | Same color/sheen throughout | No edge definition at panel/base joint |
| Wainscot + Chair rail | Unified millwork finish | Continuous application |
| Built-in + Trim | Matching throughout | Single spray pass |

### Door Systems

| Configuration | Continuity Pattern |
|---------------|-------------------|
| All same (casing, frame, door) | Full continuous - only mask hardware or remove hardware and swap hinges (dummy painted hinges) |
| Casing/frame same, door different | Continuous on casing/frame, mask at door or remove door |
| All different | Full edge masking throughout |

### Window Systems

| Configuration | Continuity Pattern |
|---------------|-------------------|
| All painted same | Continuous from casing through stool/apron |
| Sash different/unpainted | Continuous on wood, mask at sash |
| Stained jamb extensions | Mask at casing/extension joint |

## Production Impact

### Tasks Affected by Continuity

| Task Type | Discontinuous (Different) | Continuous (Same) |
|-----------|--------------------------|-------------------|
| Edge masking | Required | Skip |
| Cut-in at edge | Careful line work | Skip or blend (brush/roll) |
| Spray stop line | Required, careful | Skip - continuous pass |
| Product changeover | May be required | Not needed |
| Edge (line) inspection | Required | Skip |

### Production Rate Modifiers

When continuity is detected between a spec's primary surface and an adjacent surface:

| Edge Type | Description | Estimated Rate Improvement |
|-----------|-------------|---------------------------|
| Linear | Two surfaces meet along a line (wall/trim, ceiling/crown, etc.) | 15-25% faster on edge work |
| Complex | Multiple surfaces form a system (door assembly, window assembly) | 20-30% faster when fully continuous |

**Note:** These modifiers apply to edge-related labor, not the entire spec. The rate modifier is based on **how much edge work exists** (measured in linear feet from takeoff), not a categorical distinction.

## Spec Authoring Rules

1. **Author for discontinuous case** — Include all edge masking and cut-in tasks
2. **Add adjacency metadata** — Flag which tasks depend on edge condition
3. **Define adjacent surfaces** — Declare what the spec's primary surface touches
4. **Trust the engine** — Don't add conditional language; engine handles optimization

## Engine Responsibilities

At project assembly:

1. Collect all specs in scope
2. Build finish group assignments from project configuration
3. Identify which adjacent surfaces share finish groups
4. For each continuity match: skip tasks marked `skip_when: "same_finish_group"`, include tasks marked `required_when: "same_finish_group"`, apply rate modifiers to affected task categories
5. Optionally merge work sequences for fully continuous systems

---

# 2. Adjacency Metadata Schema

## Task-Level Schema Addition

Add to `sop_modules.schema.json` task definition:

**adjacency_metadata object properties:**

- **adjacent_surface** (string) — Surface ID this task relates to
- **condition** (enum) — `"different_finish"`, `"same_finish"`, `"always"`
- **skip_when** (enum) — `"same_finish_group"`, `"different_finish_group"`
- **required_when** (enum) — `"same_finish_group"`, `"different_finish_group"`
- **rate_modifier_category** (enum) — `"edge_masking"`, `"cut_in"`, `"spray_edge"`, `"inspection"`
- **application_method** (enum, optional) — `"brush_roll"`, `"spray"`, `"any"` — Restricts when this task applies based on method

## Spec-Level Schema Addition

**adjacency_declarations object properties:**

- **primary_surface** (string) — Surface ID of this spec's primary substrate
- **adjacent_surfaces** (array) — Objects with surface_id, edge_type (linear or complex), typical_relationship, continuity_rate_modifier

## Edge Type Enum

| Value | Description | Examples |
|-------|-------------|----------|
| `linear` | Two surfaces meet along a line | Wall/baseboard, wall/casing, ceiling/crown, trim/wall |
| `complex` | Multiple surfaces form an interconnected system | Door assembly (casing+frame+leaf+edges), window assembly |

## Example Tasks with Adjacency Metadata

### Edge Masking Task (Skip when continuous)

```json
{
  "task_id": "TSK_TRIM_MASK_WALL_EDGE",
  "task_type": "mask",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish",
    "skip_when": "same_finish_group"
  }
}
```

### Cut-In Task (Skip when continuous)

```json
{
  "task_id": "TSK_TRIM_CUT_WALL_LINE",
  "task_type": "apply",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish",
    "skip_when": "same_finish_group"
  }
}
```

### Blend Task — Brush/Roll Only (Only when continuous)

```json
{
  "task_id": "TSK_TRIM_BLEND_TO_WALL",
  "task_type": "apply",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "same_finish",
    "required_when": "same_finish_group",
    "application_method": "brush_roll"
  }
}
```

*Note: Blend tasks only apply to brush/roll application. Spray application achieves continuity through continuous pass, not blending.*

---

# 3. Surface Adjacency Vocabulary

## Wall Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `wall_field` | Main wall surface area | trim_baseboard, trim_casing, trim_crown, ceiling_field, trim_chair_rail, trim_wainscot_rail, trim_shadow_box |
| `wall_accent` | Accent wall (different color/finish) | wall_field, trim_baseboard |
| `wall_panel` | Paneled wall sections | trim_baseboard, panel_trim |

## Ceiling Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `ceiling_field` | Main ceiling surface | wall_field, trim_crown, fixture_canopy |
| `ceiling_detail` | Coffered/tray ceiling details | ceiling_field, trim_crown |

## Trim Surfaces - Linear

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `trim_baseboard` | Baseboard | wall_field, floor (not painted) |
| `trim_casing_door` | Door casing | wall_field, door_frame |
| `trim_casing_window` | Window casing | wall_field, window_jamb |
| `trim_crown` | Crown molding | wall_field, ceiling_field |
| `trim_chair_rail` | Chair rail | wall_field (above/below) |
| `trim_wainscot_rail` | Wainscot cap/rail | wall_field, wainscot_panel |
| `trim_shadow_box` | Shadow box / picture frame molding | wall_field |
| `trim_panel_mold` | Panel molding | wall_panel |

## Door System Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `door_casing` | Door casing | wall_field, door_frame |
| `door_frame` | Door frame/jamb | door_casing, door_leaf_edge |
| `door_leaf_face` | Door face (field) | door_leaf_edge |
| `door_leaf_edge` | Door edges (hinge, latch, top, bottom) | door_frame, door_leaf_face |
| `door_stop` | Door stop molding | door_frame |

## Window System Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `window_casing` | Window casing | wall_field, window_jamb |
| `window_jamb` | Window jamb/extension | window_casing, window_sash |
| `window_sash` | Window sash (operable) | window_jamb, window_glass |
| `window_stool` | Window stool | window_jamb, window_apron |
| `window_apron` | Window apron | wall_field, window_stool |

## Cabinet Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `cabinet_face_frame` | Cabinet face frame | cabinet_door, cabinet_drawer |
| `cabinet_door` | Cabinet door face | cabinet_face_frame |
| `cabinet_drawer` | Cabinet drawer face | cabinet_face_frame |
| `cabinet_box_interior` | Cabinet box inside | cabinet_shelf |
| `cabinet_end_panel` | Exposed cabinet end | wall_field |

## Built-In Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `builtin_carcass` | Built-in cabinet body | wall_field, builtin_face |
| `builtin_face` | Built-in face frame | builtin_carcass, builtin_door |
| `builtin_shelf` | Built-in shelving | builtin_carcass |
| `builtin_trim` | Built-in trim details | builtin_face, wall_field |

## Millwork Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `wainscot_panel` | Wainscot panel field | wainscot_rail, wainscot_stile |
| `wainscot_rail` | Wainscot rails (horizontal) | wainscot_panel, wall_field |
| `wainscot_stile` | Wainscot stiles (vertical) | wainscot_panel |
| `wainscot_cap` | Wainscot cap rail | wainscot_panel, wall_field |
| `beam_wrap` | Decorative beam wrap | ceiling_field |
| `column_wrap` | Decorative column wrap | ceiling_field, floor |
| `mantel` | Fireplace mantel | wall_field |

---

# 4. Finish Group Structure

## Project-Level Configuration

At the project level, surfaces are assigned to Finish Groups. A finish group represents a unique combination of:

- Product system
- Sheen
- Color

## Finish Group Schema Properties

- **group_id** — Unique identifier for this finish group
- **name** — Human-readable name
- **surfaces** — Array of surface IDs assigned to this group
- **product_system** — Product system ID from material systems
- **sheen** — flat, matte, eggshell, satin, semi-gloss, gloss
- **color_id** — Color identifier from project color schedule
- **color_name** — Human-readable color name

## Finish Group Schema

```json
{
  "finish_groups": {
    "type": "object",
    "description": "Project-level finish group assignments",
    "additionalProperties": {
      "type": "object",
      "properties": {
        "group_id": { "type": "string" },
        "name": { "type": "string" },
        "surfaces": {
          "type": "array",
          "items": { "type": "string" }
        },
        "product_system": { "type": "string" },
        "sheen": {
          "type": "string",
          "enum": ["flat", "matte", "eggshell", "satin", "semi-gloss", "gloss"]
        },
        "color_id": { "type": "string" },
        "color_name": { "type": "string" }
      },
      "required": ["group_id", "surfaces", "product_system", "sheen", "color_id"]
    }
  }
}
```

## Example: Economy Repaint - All Surfaces Same

```json
{
  "finish_groups": {
    "FG_MAIN": {
      "group_id": "FG_MAIN",
      "name": "Main Interior",
      "surfaces": [
        "wall_field",
        "ceiling_field",
        "trim_baseboard",
        "trim_casing_door",
        "trim_casing_window",
        "door_frame",
        "door_leaf_face",
        "door_leaf_edge"
      ],
      "product_system": "SYS_ECONOMY_LATEX",
      "sheen": "eggshell",
      "color_id": "SW7015",
      "color_name": "Repose Gray"
    }
  }
}
```

**Engine Result:** Nearly all edge masking eliminated. Massive efficiency gain.

## Example: Standard Repaint - Walls vs Trim

```json
{
  "finish_groups": {
    "FG_WALLS": {
      "group_id": "FG_WALLS",
      "name": "Wall Color",
      "surfaces": ["wall_field"],
      "product_system": "SYS_PREMIUM_LATEX",
      "sheen": "eggshell",
      "color_id": "BM_OC17",
      "color_name": "White Dove"
    },
    "FG_TRIM": {
      "group_id": "FG_TRIM",
      "name": "Trim Color",
      "surfaces": [
        "trim_baseboard",
        "trim_casing_door",
        "trim_casing_window",
        "trim_crown",
        "door_frame",
        "door_leaf_face",
        "door_leaf_edge"
      ],
      "product_system": "SYS_FF_STANDARD",
      "sheen": "semi-gloss",
      "color_id": "SW7006",
      "color_name": "Extra White"
    },
    "FG_CEILING": {
      "group_id": "FG_CEILING",
      "name": "Ceiling White",
      "surfaces": ["ceiling_field"],
      "product_system": "SYS_CEILING_FLAT",
      "sheen": "flat",
      "color_id": "CEIL_WHITE",
      "color_name": "Ceiling White"
    }
  }
}
```

**Engine Result:** Full edge masking at wall/trim joints. Continuous within trim system.

## Example: Premium - Multiple Accent Colors

```json
{
  "finish_groups": {
    "FG_WALLS_MAIN": {
      "group_id": "FG_WALLS_MAIN",
      "name": "Main Wall Color",
      "surfaces": ["wall_field"],
      "product_system": "SYS_PREMIUM_LATEX",
      "sheen": "eggshell",
      "color_id": "BM_HC172",
      "color_name": "Revere Pewter"
    },
    "FG_WALLS_ACCENT": {
      "group_id": "FG_WALLS_ACCENT",
      "name": "Accent Wall",
      "surfaces": ["wall_accent"],
      "product_system": "SYS_PREMIUM_LATEX",
      "sheen": "eggshell",
      "color_id": "BM_2134-30",
      "color_name": "Salamander"
    },
    "FG_TRIM": {
      "group_id": "FG_TRIM",
      "name": "Trim",
      "surfaces": [
        "trim_baseboard",
        "trim_casing_door",
        "trim_casing_window",
        "trim_crown",
        "door_frame"
      ],
      "product_system": "SYS_FF_PREMIUM",
      "sheen": "semi-gloss",
      "color_id": "BM_OC17",
      "color_name": "White Dove"
    },
    "FG_DOORS": {
      "group_id": "FG_DOORS",
      "name": "Interior Doors",
      "surfaces": ["door_leaf_face", "door_leaf_edge"],
      "product_system": "SYS_FF_PREMIUM",
      "sheen": "semi-gloss",
      "color_id": "BM_2134-30",
      "color_name": "Salamander"
    }
  }
}
```

**Engine Result:** Complex project with multiple edge breaks. Doors accent-matched to wall, frames white.

## Edge Cases

### Surface Not in Any Group

If a surface is not assigned to a finish group (e.g., vinyl window sash, prefinished flooring), treat as implicit "different finish" — all edge masking applies. This is the safe default.

### Same Product/Sheen, Different Color

Surfaces with same product and sheen but different colors are DISCONTINUOUS. The color difference requires edge definition.

### Same Color, Different Sheen

Even with matching colors, different sheens create visible edge differences and are treated as DISCONTINUOUS.

## Continuity Detection Algorithm

```
For each spec in project:
  For each adjacent_surface declared in spec:
    spec_surface = spec.primary_surface
    adjacent = adjacent_surface.surface_id
    
    spec_group = find_finish_group(spec_surface)
    adjacent_group = find_finish_group(adjacent)
    
    If spec_group == adjacent_group:
      relationship = "CONTINUOUS"
      Apply skip_when: "same_finish_group" rules
      Apply continuity rate modifiers
    Else:
      relationship = "DISCONTINUOUS"
      Apply skip_when: "different_finish_group" rules
      Include all edge masking tasks
```

---

# Implementation Roadmap

## Phase 1: Documentation (Current)

- [x] Capture concept in this document
- [ ] Review with domain experts
- [ ] Finalize surface vocabulary
- [ ] Finalize adjacency patterns

## Phase 2: Schema Updates

- [ ] Add `adjacency_metadata` to task schema
- [ ] Add `adjacency_declarations` to spec schema
- [ ] Add `finish_groups` to project schema
- [ ] Update schema documentation

## Phase 3: Spec Updates

- [ ] Add adjacency declarations to existing specs
- [ ] Add adjacency metadata to edge-dependent tasks
- [ ] Create continuity-specific tasks (blend for brush/roll)
- [ ] Validate all specs against new schema

## Phase 4: Engine Implementation

- [ ] Build finish group parser
- [ ] Build continuity detection algorithm
- [ ] Implement task skip/include logic
- [ ] Implement rate modifier application
- [ ] Test with sample projects

## Phase 5: Validation

- [ ] Test economy scenario (all same)
- [ ] Test standard scenario (walls vs trim)
- [ ] Test complex scenario (multiple groups)
- [ ] Validate production rate impacts
- [ ] Adjust modifiers based on real-world feedback

---

# Appendix: Related Systems

## Protection Zone Optimization

The Finish Continuity system uses the same architectural pattern as Protection Zones:

- Specs are complete and self-contained
- Metadata on tasks enables project-level optimization
- Engine handles deduplication and optimization
- No conditional language in spec prose

**Key difference:** Protection zones are about physical areas. Finish groups are about visual/material identity.

## Quality Tier System

Finish groups interact with quality tiers:

- QT3-QT4 work may be more likely to have economy finish groups (all same)
- QT5-QT6 work more likely to have complex finish group assignments
- Rate modifiers should respect quality tier expectations

## Material Systems

Finish groups reference product systems from the Material Systems:

- SYS_ECONOMY_LATEX
- SYS_PREMIUM_LATEX
- SYS_FF_STANDARD
- SYS_FF_PREMIUM
- etc.

The product system in a finish group determines material costs; continuity determines labor efficiency.

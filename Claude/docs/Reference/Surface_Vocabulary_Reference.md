# Surface Vocabulary Reference

**Status:** Canonical
**Version:** 1.0
**Last Updated:** 2025-01-26

Standardized surface IDs for adjacency metadata and finish group assignments.

---

## Overview

Surface IDs identify specific substrate types for:
- `adjacency_metadata` on tasks (what surface is adjacent)
- `adjacency_declarations` on specs (what the primary surface touches)
- `finish_groups` in projects (which surfaces share a finish)

**Related Document:** [Finish_Continuity_Optimization_System.md](Finish_Continuity_Optimization_System.md)

---

## Wall Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `wall_field` | Main wall surface area | trim_baseboard, trim_casing_door, trim_casing_window, trim_crown, ceiling_field, trim_chair_rail, trim_wainscot_rail, trim_shadow_box |
| `wall_accent` | Accent wall (different color/finish) | wall_field, trim_baseboard |
| `wall_panel` | Paneled wall sections | trim_baseboard, trim_panel_mold |

---

## Ceiling Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `ceiling_field` | Main ceiling surface | wall_field, trim_crown, fixture_canopy |
| `ceiling_detail` | Coffered/tray ceiling details | ceiling_field, trim_crown |

---

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
| `trim_picture_rail` | Picture rail | wall_field (above/below) |

---

## Door System Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `door_casing` | Door casing | wall_field, door_frame |
| `door_frame` | Door frame/jamb | door_casing, door_leaf_edge |
| `door_leaf_face` | Door face (field) | door_leaf_edge |
| `door_leaf_edge` | Door edges (hinge, latch, top, bottom) | door_frame, door_leaf_face |
| `door_stop` | Door stop molding | door_frame |

---

## Window System Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `window_frame` | Window frame (wood, vinyl, aluminum, steel) | wall_field, window_sash, window_jamb |
| `window_sash` | Operable sash components | window_frame, window_muntin, window_glass |
| `window_muntin` | Dividing strips between panes (grilles) | window_sash, window_glass |
| `window_jamb` | Extension jamb (interior reveal) | window_casing, window_sash, window_frame |
| `window_stool` | Interior window sill | window_jamb, window_apron, wall_field |
| `window_apron` | Trim below stool | wall_field, window_stool |
| `window_casing` | Trim surrounding window | wall_field, window_jamb |
| `window_glass` | Glass surface (protection target, not painted) | window_sash, window_muntin |

---

## Cabinet Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `cabinet_face_frame` | Cabinet face frame | cabinet_door, cabinet_drawer |
| `cabinet_door` | Cabinet door face | cabinet_face_frame |
| `cabinet_drawer` | Cabinet drawer face | cabinet_face_frame |
| `cabinet_box_interior` | Cabinet box inside | cabinet_shelf |
| `cabinet_end_panel` | Exposed cabinet end | wall_field |

---

## Built-In Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `builtin_carcass` | Built-in cabinet body | wall_field, builtin_face |
| `builtin_face` | Built-in face frame | builtin_carcass, builtin_door |
| `builtin_shelf` | Built-in shelving | builtin_carcass |
| `builtin_trim` | Built-in trim details | builtin_face, wall_field |

---

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

## Edge Types

When declaring adjacencies, specify the edge type:

| Edge Type | Description | Examples |
|-----------|-------------|----------|
| `linear` | Two surfaces meet along a line | Wall/baseboard, wall/casing, ceiling/crown |
| `complex` | Multiple surfaces form interconnected system | Door assembly, window assembly |

---

## Usage in Tasks

```json
{
  "task_id": "TASK_TRIM_MASK_WALL_EDGE",
  "task_type": "mask",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish",
    "skip_when": "same_finish_group"
  }
}
```

---

## Usage in Specs

```json
{
  "adjacency_declarations": {
    "primary_surface": "trim_baseboard",
    "adjacent_surfaces": [
      {
        "surface_id": "wall_field",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.20
      }
    ]
  }
}
```

---

## Adding New Surfaces

When a new surface type is identified:

1. Check if existing surface ID covers it
2. If not, propose new ID following naming convention:
   - Category prefix: `wall_`, `trim_`, `door_`, `window_`, `cabinet_`, `builtin_`, etc.
   - Lowercase with underscores
3. Add to appropriate category in this reference
4. Document common adjacencies

---

## Exterior Surfaces

Exterior surface IDs follow the same naming convention as interior (lowercase with underscores), prefixed with `ext_` for trim surfaces that share names with interior counterparts. Field surfaces (siding, soffit, masonry) use their plain name since they have no interior equivalent.

**Note:** These IDs are for use in exterior spec `adjacency_declarations` and `finish_groups`. Do not use interior surface IDs in exterior specs.

---

### Siding and Field Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `siding_field` | Main horizontal or vertical siding field (clapboard, shiplap, T1-11, LP SmartSide, HardiePlank) | fascia, ext_trim_corner, ext_trim_frieze, ext_trim_window_casing, ext_trim_door_casing, foundation_wall |
| `siding_board_batten` | Board and batten vertical siding (if tracked separately from siding_field) | ext_trim_corner, fascia |
| `soffit_field` | Underside of roof overhang | fascia, ext_trim_frieze |
| `porch_ceiling` | Porch ceiling surface (often painted separately from soffit) | fascia, ext_trim_frieze |
| `porch_floor` | Painted or stained porch floor surface | porch_ceiling, ext_trim_corner |

---

### Fascia and Roofline Trim

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `fascia` | Horizontal fascia board at roofline | soffit_field, ext_trim_rake, siding_field |
| `ext_trim_rake` | Rake board along gable slope | fascia, siding_field |
| `ext_trim_frieze` | Frieze board — horizontal trim between soffit and siding | soffit_field, siding_field, ext_trim_corner |

---

### Corner and Band Trim

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `ext_trim_corner` | Corner boards (vertical trim at building corners) | siding_field, fascia, foundation_wall |
| `ext_trim_band` | Band board or belt course (horizontal accent between floors) | siding_field, ext_trim_corner |

---

### Window and Door Trim (Exterior)

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `ext_trim_window_casing` | Exterior window casing and trim surround | siding_field, window_glass_ext, ext_trim_band |
| `ext_trim_door_casing` | Exterior door casing and trim surround | siding_field, door_slab_ext |
| `ext_sill` | Exterior window sill | ext_trim_window_casing, siding_field |

---

### Door and Window Faces (Exterior)

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `door_slab_ext` | Exterior face of exterior door slab | ext_trim_door_casing, door_frame_ext |
| `door_frame_ext` | Exterior door frame (jamb visible from outside) | door_slab_ext, ext_trim_door_casing |
| `window_glass_ext` | Exterior window glass (protection target — not painted) | ext_trim_window_casing |
| `garage_door_ext` | Exterior face of garage door (panels or flush) | siding_field, ext_trim_corner |

---

### Masonry and Structural

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `foundation_wall` | Visible foundation above grade | siding_field, ext_trim_corner |
| `masonry_wall` | Brick, CMU, or block exterior wall field | ext_trim_corner, foundation_wall |
| `stucco_field` | Stucco-finished exterior wall field | ext_trim_corner, ext_trim_band |

---

### Decks, Fences, and Accessory Structures

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `deck_field` | Horizontal deck board field (stain or paint) | deck_railing, porch_floor |
| `deck_railing` | Deck railing system (rails, balusters, posts) | deck_field |
| `fence_field` | Fence panel field (boards or pickets) | fence_post |
| `fence_post` | Fence posts | fence_field |

---

### Protection Targets (Exterior — Not Painted)

These surfaces are adjacency and protection targets only — they are not painted under exterior specs.

| Surface ID | Description | Role |
|------------|-------------|------|
| `landscape_adjacent` | Plants, beds, lawn within spray reach | Protection target |
| `hardscape_patio` | Concrete or brick patio below work area | Protection target |
| `ext_hvac_unit` | Exterior HVAC condenser or AC unit | Protection target |
| `ext_utility_panel` | Electrical panel, gas meter, water shutoff | Protection target |

---

## Adding New Exterior Surfaces

Follow the same process as interior surfaces:
1. Check if existing exterior surface ID covers it
2. If not, propose new ID:
   - Use `ext_` prefix only for surfaces that share a name with an interior surface
   - Plain names for surfaces with no interior equivalent (e.g., `fascia`, `siding_field`)
   - Lowercase with underscores
3. Add to appropriate category above
4. Document common adjacencies

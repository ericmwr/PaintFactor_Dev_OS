# Protection Zones Reference

**Status:** Canonical
**Version:** 2.0
**Last Updated:** 2026-01-31

Quick reference for protection zone IDs used in task metadata and spec authoring.

---

## Overview

Protection tasks carry zone metadata that enables the estimation engine to optimize setup/teardown across multiple specs in a project. Specs are authored as complete processes; optimization happens at project assembly.

**Related Documents:**
- [Interior_Protection_Doctrine.md](Interior_Protection_Doctrine.md) — protection standards and requirements
- [paintscope_quantity_key_catalog.md](paintscope_quantity_key_catalog.md) — PaintScope keys that source geometry for zones

---

## Two-Layer Zone ID Architecture

This reference defines **flat zone IDs** — the conceptual vocabulary used when authoring specs. These are distinct from the parameterized `PZ_*` IDs used by the estimation engine at runtime.

### Layer 1: Flat Zone IDs (Spec Authoring)

Flat zone IDs define WHAT KIND of protection is needed.

- **Used in:** `spec.json` → `protection_zones_required[].zone_id`
- **Defined in:** This document
- **Mapped to:** PaintScope keys for geometry sourcing
- **Examples:** `floor_perimeter`, `ceiling_line`, `fixture_covers`, `hardware_covers`

### Layer 2: Parameterized PZ_* IDs (Engine Runtime)

PZ_* IDs are runtime instantiation patterns used by the estimation engine to apply protection per room/area. They define WHERE protection is applied.

- **Used in:** Interior_Protection_Doctrine.md zone architecture; engine logic
- **Pattern:** `PZ_{TYPE}_{LOCATION}_{SUBTYPE}` (e.g., `PZ_FLOOR_ROOM_KITCHEN`)
- **Resolved at:** Project assembly when engine maps flat zone IDs to specific rooms
- **Examples:** `PZ_FLOOR_ROOM_{room_id}`, `PZ_ASSET_ROOM_{room_id}_CABINETS`

### How They Connect

```
Spec declares:        "zone_id": "floor_perimeter"          <- flat ID (what kind)
Engine instantiates:  PZ_FLOOR_ROOM_KITCHEN                 <- PZ_* ID (where)
PaintScope sources:   PS_PROTECT_SF.FLOOR_PERIMETER          <- geometry (how much)
```

**Agent rule:** Agents use flat IDs when authoring specs. Agents NEVER use PZ_* IDs in spec artifacts. The engine handles the flat-to-PZ mapping at runtime.

---

## Zone Catalog

### Floor Protection

| Zone ID | Description | Typical Materials | Common Specs | PaintScope Key |
|---------|-------------|-------------------|--------------|----------------|
| `floor_full` | Complete floor coverage | Rosin paper, plastic, taped seams | Spray ceilings, spray walls | `PS_PROTECT_SF.FLOOR_EXPOSED` |
| `floor_perimeter` | Perimeter drops/runners | Canvas drops, plastic runners | Brush/roll walls, trim, doors | `PS_PROTECT_SF.FLOOR_PERIMETER` |
| `floor_workzone` | Localized protection under work area | Drop cloth, plastic | Door painting, touch-up | `PS_PROTECT_SF.FLOOR_WORKZONE` |
| `floor_full_8ft_radius` | Radial floor protection around spray work area (doors, windows) | Rosin paper, plastic | Door spray, window spray | `PS_PROTECT_SF.FLOOR_8FT_RADIUS` |
| `floor_full_kitchen` | Full kitchen floor coverage for cabinet spray | Rosin paper, taped seams | Cabinet spray | `PS_PROTECT_SF.FLOOR_KITCHEN` |
| `floor_door_swing` | Door swing area floor protection | Drop cloth, plastic | Door spray | `PS_PROTECT_SF.FLOOR_DOOR_SWING` |

### Surface-Adjacent Protection

| Zone ID | Description | Typical Materials | Common Specs | PaintScope Key |
|---------|-------------|-------------------|--------------|----------------|
| `wall_adjacent` | Wall surfaces near work | Paper, plastic film | Spray trim, spray cabinets | `PS_PROTECT_LF.WALL_ADJACENT` |
| `wall_upper_band` | Upper wall band near ceiling (spray overspray zone) | Paper, plastic film | Ceiling spray | `PS_PROTECT_SF.WALL_UPPER_BAND` |
| `wall_adjacent_door` | Wall area adjacent to door during spray | Paper, masking film | Door spray | `PS_PROTECT_LF.WALL_ADJACENT_DOOR` |
| `wall_adjacent_window` | Wall area adjacent to window during spray | Paper, masking film | Window spray | `PS_PROTECT_LF.WALL_ADJACENT_WINDOW` |
| `wall_adjacent_cabinet` | Wall area adjacent to cabinets during spray | Paper, masking film | Cabinet spray | `PS_PROTECT_LF.WALL_ADJACENT_CABINET` |
| `ceiling_line` | Ceiling-wall junction | Tape, paper backing | Wall painting | `PS_PROTECT_LF.CEILING_LINE` |
| `trim_edges` | Trim perimeter (for wall work) | Painter's tape | Wall painting | `PS_PROTECT_LF.TRIM_EDGES` |
| `baseboard_top` | Top edge of baseboard | Painter's tape | Wall painting | — (legacy, use `trim_edges`) |
| `jamb_adjacent` | Door/window jamb area protection | Tape, masking paper | Window spray | `PS_PROTECT_LF.JAMB_ADJACENT` |

### Fixture/Asset Protection

| Zone ID | Description | Typical Materials | Common Specs | PaintScope Key |
|---------|-------------|-------------------|--------------|----------------|
| `fixture_covers` | Lights, outlets, switches | Tape, plastic bags | Wall/ceiling painting | `PS_PROTECT_EA.ASSET.FIXTURES` |
| `hardware_covers` | Hinges, knobs, locks | Tape, plastic bags | Door painting | `PS_PROTECT_EA.ASSET.HARDWARE_GROUPS` |
| `furniture_room` | Room furniture protection (occupancy-driven) | Plastic sheeting, furniture pads | Wall brush/roll, ceiling, spray | `PS_PROTECT_SF.FURNITURE_ROOM` |
| `countertop_covers` | Counter surfaces | Paper, plastic | Cabinet painting | `PS_PROTECT_SF.ASSET.COUNTERTOPS` |
| `appliance_adjacent` | Appliance adjacency protection for brush/roll | Plastic film | Cabinet brush/roll, wall painting | `PS_PROTECT_EA.APPLIANCE_ADJACENT` |
| `appliance_covers` | Full appliance coverage for spray | Plastic sheeting | Cabinet spray | `PS_PROTECT_EA.APPLIANCE_COVERS` |
| `cabinet_interior` | Inside cabinet boxes | Paper, plastic | Cabinet painting | — |
| `cabinet_hardware` | Pulls, hinges, catches | Remove or tape | Cabinet painting | `PS_META.EA.CABINET_HARDWARE` |

**Aliases (retired IDs):**
- `door_hardware` → now `hardware_covers` (Protection_Zones_Reference v1.0)
- `window_glass` → now `glass_mask` (Protection_Zones_Reference v1.0)
- `countertop` → now `countertop_covers` (Protection_Zones_Reference v1.0)
- `appliances` → split into `appliance_adjacent` + `appliance_covers` (Protection_Zones_Reference v1.0)

### Masking

| Zone ID | Description | Typical Materials | Common Specs | PaintScope Key |
|---------|-------------|-------------------|--------------|----------------|
| `glass_mask` | Window panes | Paper, masking film | Window/trim painting | `PS_PROTECT_SF.ASSET.GLASS_AREA` |
| `backsplash_mask` | Tile backsplash masking | Masking paper, tape | Cabinet spray | `PS_PROTECT_SF.ASSET.TILE_BACKSPLASH` |
| `sill_protection` | Window sill surface protection | Paper, tape | Window spray | `PS_PROTECT_LF.SILL` |

### Millwork/Specialty

| Zone ID | Description | Typical Materials | Common Specs | PaintScope Key |
|---------|-------------|-------------------|--------------|----------------|
| `millwork_beam` | Decorative beam/millwork protection | Masking film 72-99", tape | Ceiling spray, wall spray | `PS_PROTECT_SF.MILLWORK_BEAM` |

---

## Zone Hierarchy

Some zones supersede others:

| If Using | Supersedes | Reason |
|----------|------------|--------|
| `floor_full` | `floor_perimeter` | Full coverage includes perimeter |
| `floor_full_8ft_radius` | `floor_door_swing` | 8ft radius includes door swing area |
| `floor_full_kitchen` | `floor_perimeter` (in kitchen) | Full kitchen includes perimeter |
| `appliance_covers` | `appliance_adjacent` | Full covers includes adjacent protection |

---

## Method-Dependent Zones

When `method_dependent: true`, zone selection varies by application method:

| Logical Need | Brush/Roll Resolves To | Spray Resolves To |
|--------------|------------------------|-------------------|
| Floor protection (general) | `floor_perimeter` | `floor_full` |
| Floor protection (door work) | `floor_perimeter` | `floor_full_8ft_radius` |
| Floor protection (kitchen cabinets) | `floor_perimeter` | `floor_full_kitchen` |
| Wall protection | minimal/none | `wall_adjacent` |
| Wall protection (door adjacent) | none | `wall_adjacent_door` |
| Wall protection (window adjacent) | none | `wall_adjacent_window` |
| Wall protection (cabinet adjacent) | none | `wall_adjacent_cabinet` |
| Appliance protection | `appliance_adjacent` | `appliance_covers` |

---

## Related Adjacency Field

An optional field linking protection zones to Surface_Vocabulary_Reference surface IDs. Enables the future engine to coordinate protection zone setup/teardown with finish continuity decisions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `related_adjacency` | string | No | Surface ID from Surface_Vocabulary_Reference.md that this zone protects at the edge junction |

**Zones with related adjacencies:**

| Zone ID | Related Adjacency | Engine Implication |
|---------|-------------------|--------------------|
| `ceiling_line` | `ceiling_field` | Skip protection when wall and ceiling share finish group |
| `trim_edges` | `trim_baseboard` | Skip protection when wall and trim share finish group |
| `wall_adjacent` | `wall_field` | Skip protection when adjacent spec paints same wall |
| `wall_adjacent_door` | `wall_field` | Skip protection when door and wall share finish group |
| `wall_adjacent_window` | `wall_field` | Skip protection when window trim and wall share finish group |
| `wall_adjacent_cabinet` | `cabinet_face_frame` | Always protect (cabinets typically not in scope) |
| `glass_mask` | `window_glass` | Always protect (glass is never painted) |

**Note:** This is metadata for future engine use. It does not change current spec authoring or agent behavior.

---

## Task Metadata Structure

Protection tasks include `protection_metadata`:

```json
{
  "task_id": "TASK_SETUP_FLOOR_PROTECTION",
  "task_type": "protect",
  "protection_metadata": {
    "action": "setup",
    "zones": ["floor_perimeter"],
    "method_dependent": true
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | enum | Yes | `setup`, `teardown`, or `maintain` |
| `zones` | array | Yes | Zone IDs from this catalog |
| `method_dependent` | boolean | No | If true, zones vary by spray vs brush/roll |

---

## Engine Behavior (Future)

At project assembly, the estimation engine will:

1. Collect all specs in project scope
2. Determine work sequence
3. Map zone usage across specs (flat IDs → PZ_* instances per room)
4. Optimize: setup first, teardown last, skip middle
5. Use `related_adjacency` to skip protection when finish groups match

**Example:** If trim and walls both need `floor_perimeter`:
- Trim (first): SETUP floor_perimeter
- Walls (last): TEARDOWN floor_perimeter

---

## Commonly Paired Zones by Spec Type

| Spec Category | Application | Typical Zones |
|---------------|-------------|---------------|
| Wall | brush/roll | `floor_perimeter`, `fixture_covers` |
| Wall | spray | `floor_full`, `ceiling_line`, `trim_edges`, `fixture_covers` |
| Ceiling | brush/roll | `floor_full`, `furniture_room`, `fixture_covers` |
| Ceiling | spray | `floor_full`, `furniture_room`, `fixture_covers`, `wall_upper_band` |
| Trim | brush | `floor_perimeter` |
| Trim | spray | `floor_perimeter`, `wall_adjacent` |
| Door | brush/roll | `floor_perimeter`, `hardware_covers` |
| Door | spray | `floor_full_8ft_radius`, `wall_adjacent_door`, `hardware_covers`, `floor_door_swing` |
| Window | brush/roll | `floor_perimeter`, `hardware_covers`, `glass_mask` |
| Window | spray | `floor_full_8ft_radius`, `wall_adjacent_window`, `jamb_adjacent`, `hardware_covers`, `glass_mask`, `sill_protection` |
| Cabinet | brush/roll | `floor_perimeter`, `countertop_covers`, `appliance_adjacent` |
| Cabinet | spray | `floor_full_kitchen`, `countertop_covers`, `appliance_covers`, `backsplash_mask`, `wall_adjacent_cabinet` |

---

## Adding New Zones

When a new protection scenario is identified:

1. Check if existing zone covers it
2. If not, propose new zone ID (lowercase, underscores)
3. Add to this reference with description and typical materials
4. Assign or create a PaintScope key for geometry sourcing
5. Update paintscope_quantity_key_catalog.md
6. Update Interior_Protection_Doctrine.md if needed

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-26 | Initial zone catalog (14 zones) |
| 2.0 | 2026-01-31 | Zone/Key Alignment Rollout: renamed 4 zones (`door_hardware`→`hardware_covers`, `window_glass`→`glass_mask`, `countertop`→`countertop_covers`, `appliances`→`appliance_adjacent`/`appliance_covers`), added 12 new zones, added two-layer architecture docs, added related_adjacency field, expanded hierarchy/method-dependent/paired zones tables. Total: 27 zones. |

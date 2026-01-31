# Zone/Key Alignment Audit Report

**Date:** 2026-01-31
**Auditor:** Claude Opus 4.5 (automated)
**Status:** Complete

---

## 1. Alignment Matrix

### Floor Protection Zones

| Zone ID | In Zones Ref? | Has PS Key? | PS Key ID | In Spec JSONs? | Specs Using |
|---------|--------------|-------------|-----------|-----------------|-------------|
| `floor_perimeter` | YES | NO | -- | YES | WALL_NC_PRIME, WALL_NC_FINISH, TRIM_NC_PAINT |
| `floor_full` | YES | YES | `PS_PROTECT_SF.FLOOR_EXPOSED` | YES (upgrade target) | WALL_NC_PRIME, WALL_NC_FINISH, TRIM_NC_PAINT |
| `floor_full_8ft_radius` | NO | NO | -- | NO | -- |
| `floor_full_kitchen` | NO | NO | -- | NO | -- |
| `floor_door_swing` | NO | NO | -- | NO | -- |

### Fixture/Asset Protection Zones

| Zone ID | In Zones Ref? | Has PS Key? | PS Key ID | In Spec JSONs? | Specs Using |
|---------|--------------|-------------|-----------|-----------------|-------------|
| `fixture_covers` | YES | YES | `PS_PROTECT_EA.ASSET.FIXTURES` | YES | WALL_NC_PRIME, WALL_NC_FINISH, FULL_NC_PRIME, CEILINGS_NC_PAINT |
| `hardware_covers` | NO (uses `door_hardware`) | YES (partial) | `PS_PROTECT_EA.ASSET.HARDWARE_GROUPS` | NO | -- |
| `furniture_room` | NO | NO | -- | NO | -- |
| `countertop_covers` | NO (uses `countertop`) | YES | `PS_PROTECT_SF.ASSET.COUNTERTOPS` | NO | -- |
| `appliance_adjacent` | NO (uses `appliances`) | NO | -- | NO | -- |
| `appliance_covers` | NO (uses `appliances`) | NO | -- | NO | -- |

### Surface-Adjacent Protection Zones

| Zone ID | In Zones Ref? | Has PS Key? | PS Key ID | In Spec JSONs? | Specs Using |
|---------|--------------|-------------|-----------|-----------------|-------------|
| `ceiling_line` | YES | NO | -- | YES | WALL_NC_FINISH |
| `trim_edges` | YES | NO | -- | YES | WALL_NC_FINISH |
| `wall_upper_band` | NO | NO | -- | NO | -- |
| `wall_adjacent` | YES | NO | -- | NO | -- |
| `wall_adjacent_door` | NO | NO | -- | NO | -- |
| `wall_adjacent_window` | NO | NO | -- | NO | -- |
| `wall_adjacent_cabinet` | NO | NO | -- | NO | -- |
| `jamb_adjacent` | NO | NO | -- | NO | -- |

### Masking Zones

| Zone ID | In Zones Ref? | Has PS Key? | PS Key ID | In Spec JSONs? | Specs Using |
|---------|--------------|-------------|-----------|-----------------|-------------|
| `glass_mask` | NO (uses `window_glass`) | YES (partial) | `PS_PROTECT_SF.ASSET.GLASS_AREA` | NO | -- |
| `backsplash_mask` | NO | YES | `PS_PROTECT_SF.ASSET.TILE_BACKSPLASH` | NO | -- |
| `sill_protection` | NO | NO | -- | NO | -- |

### Millwork/Specialty Zones

| Zone ID | In Zones Ref? | Has PS Key? | PS Key ID | In Spec JSONs? | Specs Using |
|---------|--------------|-------------|-----------|-----------------|-------------|
| `millwork_beam` | NO | NO | -- | NO | -- |

---

## 2. Summary Counts

| Category | Count |
|----------|-------|
| Total doctrine zone IDs audited | 23 |
| Defined in Protection_Zones_Reference.md | 6 (26%) |
| Have a corresponding PaintScope key | 5 (22%) |
| Used in actual spec.json files | 5 (22%) |
| Fully aligned (Zones Ref + PS Key + spec usage) | 1 (`fixture_covers`) |
| Partially aligned (2 of 3) | 4 (`floor_perimeter`, `floor_full`, `ceiling_line`, `trim_edges`) |
| Not aligned at all (0 of 3) | 13 |

---

## 3. Zones in Protection_Zones_Reference.md NOT in Doctrine

| Zone ID | Description | Status |
|---------|-------------|--------|
| `floor_workzone` | Localized protection under work area | Used in door painting context |
| `baseboard_top` | Top edge of baseboard | Tape-based edge zone |
| `door_hardware` | Hinges, knobs, locks | Doctrine uses `hardware_covers` instead |
| `window_glass` | Window panes | Doctrine uses `glass_mask` instead |
| `cabinet_interior` | Inside cabinet boxes | Not in doctrine table |
| `cabinet_hardware` | Pulls, hinges, catches | Not in doctrine table |
| `countertop` | Counter surfaces | Doctrine uses `countertop_covers` instead |
| `appliances` | Kitchen/bath appliances | Doctrine uses `appliance_adjacent`/`appliance_covers` |

---

## 4. PaintScope Protection Keys Without Zone Definitions

| PS Key | Description | Gap |
|--------|-------------|-----|
| `PS_PROTECT_SF.FLOOR_HARD_EXPOSED` | Hard floor subtype | No zone differentiates floor type |
| `PS_PROTECT_SF.FLOOR_CARPET_EXPOSED` | Carpet floor subtype | No zone differentiates floor type |
| `PS_PROTECT_SF.ASSET.CABINETS_FACE` | Cabinet face protection SF | No zone maps to this key |

---

## 5. Naming Conflicts

| Concept | Zones_Reference ID | Doctrine Zone Pattern ID | Recommendation |
|---------|-------------------|-------------------------|----------------|
| Hardware protection | `door_hardware` | `hardware_covers` | Standardize to one |
| Window glass masking | `window_glass` | `glass_mask` | Standardize to one |
| Countertop protection | `countertop` | `countertop_covers` | Standardize to one |
| Appliance protection | `appliances` | `appliance_adjacent` / `appliance_covers` | Standardize to one |

The Interior Protection Doctrine uses a **third** convention (`PZ_FLOOR_ROOM_*`, `PZ_ASSET_ROOM_*`) that is parameterized by room ID.

---

## 6. Recommended Actions (Prioritized)

### Priority 1: Resolve Naming Conflicts

Choose ONE canonical naming convention. **Recommendation:** Use the flat IDs from Spec Completeness Doctrine (`floor_perimeter`, `fixture_covers`, etc.) as canonical. Update Protection_Zones_Reference.md to match.

### Priority 2: Update Protection_Zones_Reference.md

Add 17 missing zone IDs. Retire or alias conflicting old names.

### Priority 3: Determine PaintScope Key Strategy

Decide whether surface-adjacent protection zones use existing edge keys (`PS_EDGE_LF.*`) or need new dedicated protection keys (`PS_PROTECT_LF.*`).

### Priority 4: Add Missing PaintScope Protection Keys

| Proposed Key | UOM | Maps To Zone |
|-------------|-----|-------------|
| `PS_PROTECT_SF.FLOOR_PERIMETER` | SF | `floor_perimeter` |
| `PS_PROTECT_SF.FLOOR_DOOR_SWING` | SF | `floor_door_swing` |
| `PS_PROTECT_SF.FLOOR_8FT_RADIUS` | SF | `floor_full_8ft_radius` |
| `PS_PROTECT_EA.ASSET.HARDWARE` | EA | `hardware_covers` |
| `PS_PROTECT_SF.WALL_ADJACENT` | SF | `wall_adjacent` (and subtypes) |

### Priority 5: Update Existing Spec JSONs

Once zone vocabulary is settled, audit all spec.json `protection_zones_required` arrays for canonical zone IDs.

---

## 7. Bottom Line

The system has a vocabulary fragmentation problem. Three documents define protection zones using three different naming schemes, and only 26% of the doctrine's zone vocabulary has formal definitions. The single highest-value action is to **standardize the zone ID vocabulary across all documents** before adding new specs that reference protection zones.

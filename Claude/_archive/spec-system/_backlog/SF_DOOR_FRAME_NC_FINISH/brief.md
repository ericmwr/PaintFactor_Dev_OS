# Spec Brief: SF_DOOR_FRAME_NC_FINISH

**Status:** queued
**Priority:** P1
**Authored:** 2026-02-03
**Author:** Spec Researcher (via DevOrchestrator)

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_DOOR_FRAME_NC_FINISH` |
| Name | New Construction Interior Door Frame Finish Paint |
| Domain | interior |
| Context | NC |
| Description | Complete painting of interior door frames (jamb, stop, head jamb) in new construction. Covers prep through finish coats. Separate from door slab (different measurement, different access, different production rates) and door casing (linear trim, covered by SF_TRIM_NC_PAINT). Uses EA (frame set) as primary unit — one opening = one frame set. Frame sets may share or differ in color from door slabs. |

---

## 2. Scope Boundaries

### Includes
- Door frame jambs (left, right, head)
- Door stop molding (the ledge the door closes against)
- Hinge mortise touch-up (after slab installation)
- Strike plate mortise touch-up
- Conditional primer coat (bare wood frames)
- Finish coats (2 coats standard)
- Light sanding between coats per quality tier

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Door slab (leaf) | SF_DOOR_SLAB_INT_NC |
| Door casing (trim around opening) | SF_TRIM_NC_PAINT (profile_type: door_casing) |
| Exterior door frame exterior face | SF_DOOR_FRAME_EXT_NC_FINISH (future) |
| Pocket door track/hardware | Config dimension within this spec (frame_type: pocket) |
| Bifold door track/hardware | Handled within this spec (frame_type: bifold) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT4 | Door frames are scrutinized surfaces — QT2 not applicable. Fine Finish Doctrine governs. |
| application_method | spray, brush | spray | Spray is standard NC production. Brush for touch-up or occupied spaces. |
| sheen | satin, semi-gloss, gloss | semi-gloss | Per Fine Finish Doctrine sheen/QT rules |
| frame_type | standard, pocket, cased_opening, bifold | standard | Controls complexity and task inclusion |
| substrate_condition | factory_primed, bare_wood | factory_primed | Controls conditional primer coat |

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_DOOR_FRAME_SET | Door frame set (jamb + stop) | EA | 1 per door opening. Includes both jamb sides, head jamb, and all stop surfaces. | Always |
| ITM_DOOR_FRAME_STOP | Door stop molding | EA | Included in frame set count — not separate. | N/A (bundled) |
| ITM_HINGE_MORTISE | Hinge mortise touch-up | EA | 3 per standard door (2 hinges on 6'8", 3 on taller). Touch-up after slab install. | When doors installed before painting |
| ITM_STRIKE_MORTISE | Strike mortise touch-up | EA | 1 per door. Touch-up after hardware install. | When hardware installed before painting |

> **EA (frame set) is the primary unit, not LF.** Unlike trim (LF-based), door frames are estimated per opening because:
> - Setup/access is per-opening (same regardless of frame height)
> - Production rate is per-opening (move between openings, not continuous run)
> - Per PCA standards, surfaces <1 ft width are measured as 1 LF regardless of actual width (no frame width modifier)

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_EA_DOOR_FRAME_SET | PS_SURFACE_EA.DOOR_FRAME_SET | EA | Always | Count of door frame sets (one per opening) |
| IN_EA_DOORS_INTERIOR | PS_OPENING_EA.DOOR_OPENINGS_TOTAL | EA | Always | Validation: frame count should match opening count |

### Proposed New Keys
None. `PS_SURFACE_EA.DOOR_FRAME_SET` exists in catalog. Verify mapping exists in `Spec_Input_to_PaintScope_Key_Mapping.md`.

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| door_frame | door_casing | complex | same_finish (typically) |
| door_frame | door_leaf_edge | complex | same_finish or different_finish |
| door_frame | wall_field | linear | different_finish (frame meets wall at reveal) |
| door_stop | door_leaf_face | complex | same_finish or different_finish |
| door_stop | door_frame | complex | same_finish (always — stop is part of frame) |

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_DOOR_SLAB_INT_NC, SF_TRIM_NC_PAINT | Door system = slab + frame + casing |
| Typical before | SF_DRYWALL_WALL_NC_FINISH | Frames painted before final wall coats |
| Typical after | SF_DRYWALL_WALL_NC_PRIME, SF_DRYWALL_CEILING_NC_FINISH | After major spray work |
| Shares finish group with | SF_DOOR_SLAB_INT_NC (often), SF_TRIM_NC_PAINT (door casing) | Often same color as door/casing (but not always) |

---

## 8. References

### 8a. Domain Doctrines

| Doctrine | Sections Relevant |
|----------|-------------------|
| docs/Doctrine/Fine_Finish_Doctrine.md | All sections — door frames are fine finish scope |
| docs/Doctrine/Doors_Doctrine.md | Frame/jamb substrate, factory-primed assessment |
| docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | QT3-QT5 sanding, sheen minimums |
| docs/Doctrine/Materials_and_Consumables_Doctrine.md | Enamel systems, spray tip sizing |
| docs/Doctrine/Estimation_Modifiers_Doctrine.md | Height modifiers (for tall door openings) |
| docs/Doctrine/Protection_and_Masking_Doctrine.md | floor_workzone, wall_adjacent_door zones |

### 8b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | `docs/Doctrine/Spec_Completeness_Doctrine.md` | Mandatory completeness requirements |
| Modifier Registry | `docs/Doctrine/Modifier_Registry.md` | Canonical modifier IDs and values |
| Protection Zones Reference | `docs/Reference/Protection_Zones_Reference.md` | Valid zone IDs for protection tasks |
| Surface Vocabulary Reference | `docs/Reference/Surface_Vocabulary_Reference.md` | Valid surface IDs for adjacency |
| Site Condition Vocabulary | `docs/Reference/Site_Condition_Vocabulary_Reference.md` | Valid site condition IDs |
| PaintScope Quantity Key Catalog | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` | Verify Section 5 keys exist |
| Spec Input → PaintScope Mapping | `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` | Key mapping validation |
| Spec JSON Schema | `specs/_schemas/spec.schema.json` | Target schema for spec.json |

---

## 9. Special Notes / Constraints

- **EA (frame set) is the primary unit.** Unlike door slabs (EA_SIDE per face), frames are estimated per opening because production workflow is per-opening, not per-surface.
- **Stop is bundled with frame.** The door stop is painted as part of the frame set — not a separate line item. The stop is the small ledge the door closes against; it's integral to the frame painting task.
- **Hinge/strike mortise touch-up is conditional.** In NC sequence, frames may be painted before or after slab installation. If painted after slab install, hinge mortises and strike mortises need touch-up where the installer chiseled/routed for hardware.
- **No frame width modifier.** Per PCA standards, surfaces less than 1 ft width are measured as 1 LF regardless of actual width. A 4-9/16" frame and 6-9/16" frame are both considered 1 LF per linear foot. Taller doors naturally have more LF.
- **Pocket doors have no stop.** frame_type: pocket should exclude stop tasks and have reduced surface area.
- **Cased openings (no door).** frame_type: cased_opening has jambs but no stop and no hardware mortises.
- **Pairs with SF_DOOR_SLAB_INT_NC** — protection setup should be shared when both specs run in same project.
- **Refer to Doors_Doctrine.md** — substrate assessment and factory-primer handling are fully documented there.

---

## 10. Acceptance Criteria

- [ ] EA (frame set) as primary unit (not LF, not EA_SIDE)
- [ ] Stop surfaces bundled in frame set (not separate item)
- [ ] frame_type variants differentiated (standard, pocket, cased_opening)
- [ ] Conditional primer coat based on substrate_condition
- [ ] Hinge/strike mortise touch-up tasks conditional on installation sequence
- [ ] Bifold frame variant included in frame_type dimension
- [ ] Fine Finish Doctrine interstage process at all quality tiers
- [ ] Protection zones include floor_workzone at minimum; floor_full_8ft_radius + wall_adjacent_door when spray
- [ ] Adjacency declares door_frame as primary surface with adjacent: door_casing, door_leaf_edge, wall_field
- [ ] Production rates align with Doors Doctrine benchmarks (frame is simpler than slab)

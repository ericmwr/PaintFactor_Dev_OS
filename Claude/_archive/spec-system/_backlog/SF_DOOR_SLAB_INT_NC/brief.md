# Spec Brief: SF_DOOR_SLAB_INT_NC

**Status:** queued  
**Priority:** P1  
**Authored:** 2026-02-01  
**Author:** Eric  

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_DOOR_SLAB_INT_NC` |
| Name | New Construction Interior Door Slab Paint |
| Domain | interior |
| Context | NC |
| Description | Complete painting of interior door slabs (faces + edges) in new construction. Covers prep through finish coats. Separate from door frame/jamb (different measurement, different access, different production rates) and door casing (linear trim, covered by SF_TRIM_NC_PAINT). Uses EA_SIDE as primary unit — each face is an independently paintable unit that may have different finish assignments. |

---

## 2. Scope Boundaries

### Includes
- Door slab faces (2 per door, counted per side)
- Door slab edges (hinge edge, latch edge, top edge, bottom edge — assigned to the side being painted)
- Conditional primer coat (bare wood doors)
- Finish coats (2 coats standard)
- Fastener hole filling (if pre-hung doors have nail holes)
- Light sanding between coats per quality tier
- Hardware masking/removal (hinges, latch hardware)

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Door frame / jamb / stop | SF_DOOR_FRAME_NC |
| Door casing | SF_TRIM_NC_PAINT (profile_type: door_casing) |
| Exterior door exterior face | SF_DOOR_SLAB_EXT_NC (future) |
| French door glass masking | Config dimension within this spec (door_type: french) |
| Bifold door track/hardware | Config dimension within this spec (door_type: bifold) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT4 | Doors are scrutinized surfaces — QT2 not applicable. Fine Finish Doctrine governs. |
| application_method | spray, brush | spray | Spray is standard NC production. Brush for touch-up or occupied spaces. |
| sheen | satin, semi-gloss, gloss | semi-gloss | Per Fine Finish Doctrine sheen/QT rules |
| door_type | flush, panel_4, panel_6, french, bifold, louvered | flush | Controls complexity modifier and detail tasks |
| substrate_condition | factory_primed, bare_wood | factory_primed | Controls conditional primer coat |
| door_size | standard (6'8"), tall (7'0"-8'0"), oversized (8'0"+) | standard | Affects SF per side and production rate |

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_DOOR_FACE | Door slab face | EA_SIDE | 1 per paintable side. Interior door = 2 sides typically. Each side may be different color. | Always |
| ITM_DOOR_EDGE_HINGE | Hinge edge | EA | Assigned to side that "owns" it by convention (see notes). | Always |
| ITM_DOOR_EDGE_LATCH | Latch edge | EA | Assigned to opening side by convention. | Always |
| ITM_DOOR_EDGE_TOP | Top edge | EA | Typically painted, sometimes skipped. | Always |
| ITM_DOOR_EDGE_BOTTOM | Bottom edge | EA | Often skipped (sealed, not painted). | Conditional |
| ITM_DOOR_HARDWARE_REMOVE | Hardware removal | EA_SET | Hinges + latch set per door. | When spray method |
| ITM_DOOR_HARDWARE_REINSTALL | Hardware reinstall | EA_SET | Matching removal. | When spray method |

> **Edge ownership convention:** Hinge edge → hinge side. Latch edge → opening side (room you're standing in when door swings toward you). Top/bottom → shared or assigned to primary side. This is an estimation convention for labor allocation, not a finish group decision.

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_EA_DOOR_SIDES | PS_META.EA.DOOR_SIDES | EA | Always | Count of paintable door sides (not doors — sides) |
| IN_EA_DOORS | PS_META.EA.DOORS_INTERIOR | EA | Always | Count of door units (for hardware removal calc) |

### Proposed New Keys
- `PS_META.EA.DOOR_SIDES` — Count of paintable door faces. Distinct from door count because a door has 2 sides that may be scoped independently. May not exist yet — verify in catalog.
- Alternatively, use `PS_OPENING_EA.DOOR_OPENINGS_TOTAL` and derive sides from that (×2 for standard interior). Need to confirm catalog approach.

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| door_leaf_face | door_frame | complex | same_finish or different_finish |
| door_leaf_face | door_leaf_edge | complex | same_finish (always — edges match face) |
| door_leaf_edge | door_frame | complex | same_finish or different_finish |

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_DOOR_FRAME_NC, SF_TRIM_NC_PAINT | Door system = slab + frame + casing |
| Typical before | SF_DRYWALL_WALL_NC_FINISH | Doors painted before final wall coats |
| Typical after | SF_DRYWALL_WALL_NC_PRIME, SF_DRYWALL_CEILING_NC_FINISH | After major spray work |
| Shares finish group with | SF_DOOR_FRAME_NC | Often same color (but not always — two-tone doors exist) |

---

## 8. References

### 8a. Domain Doctrines

| Doctrine | Sections Relevant |
|----------|-------------------|
| Fine_Finish_Doctrine.md | All sections — doors are core fine finish scope |
| Doors_Doctrine.md | Door-specific substrate, counting, edge ownership |
| Quality_Tiers_and_Surface_Condition.md | QT3-QT5 sanding, sheen minimums |
| Materials_and_Consumables_Doctrine.md | Enamel systems, spray tip sizing |
| Estimation_Modifiers_Doctrine.md | Door type complexity modifiers |
| Protection_and_Masking_Doctrine.md | floor_workzone, door_hardware zones |

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

- **EA_SIDE is the primary unit, not EA_DOOR.** A door with 2 painted sides in different colors generates 2 line items. This is the atomic principle — each side is independently assignable to a finish group.
- **Edge ownership by convention.** The system needs a consistent rule for which side "owns" each edge for labor allocation. Hinge edge → hinge side, latch edge → opening side. This prevents double-counting.
- **French doors need glass masking tasks.** The door_type: french config should trigger glass masking modules from the SOP. This is what makes french doors significantly more labor-intensive.
- **Louvered doors have extreme complexity.** door_type: louvered should carry a substantial complexity modifier (2.0-3.0x) due to individual slat painting. Spray-only is practical.
- **Bifold doors** are typically spray-finished off-hinges. Hardware removal is different (track system vs standard hinges). The door_type config handles this.
- **Refer to Doors_Doctrine.md** — the atomic architecture and edge conventions are fully documented there.

---

## 10. Acceptance Criteria

- [ ] EA_SIDE as primary unit (not EA_DOOR)
- [ ] Edge ownership convention implemented in counting rules
- [ ] door_type complexity modifiers differentiated (flush=1.0, panel=1.2-1.3, french=1.8+, louvered=2.5+)
- [ ] Conditional primer coat based on substrate_condition
- [ ] Hardware removal/reinstall tasks conditional on spray method
- [ ] Glass masking module included for french door_type
- [ ] Fine Finish Doctrine interstage process at all quality tiers
- [ ] Production rates reference Doors Doctrine benchmarks

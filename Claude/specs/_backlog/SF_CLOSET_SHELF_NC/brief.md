# Spec Brief: SF_CLOSET_SHELF_NC

**Status:** queued
**Priority:** P1
**Authored:** 2026-02-03
**Author:** Spec Researcher (Dev Orchestrator dispatch)

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_CLOSET_SHELF_NC` |
| Name | New Construction Closet Shelf Paint |
| Domain | interior |
| Context | NC (new construction) |
| Description | Painting of fixed closet shelving in new construction. Uses Opening Count quantification method per BuiltIns_Shelving Quantification System.md. Covers shelf compartments (openings), cleats, and support brackets. Simple spec with clear scope boundaries. |

---

## 2. Scope Boundaries

### Includes
- Closet shelf compartment interiors (counted as openings per tier S/M/L/XL)
- Shelf surfaces (top, bottom, edges — bundled in opening count)
- Shelf cleats and wood support brackets
- Light prep (sanding, dusting, spot fill)
- Prime coat (conditional on SS_BARE substrate)
- Finish coats (1-2 coats per quality tier)

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Closet walls | SF_DRYWALL_WALL_NC_PRIME, SF_DRYWALL_WALL_NC_FINISH |
| Closet ceiling | SF_DRYWALL_CEILING_NC_PRIME, SF_DRYWALL_CEILING_NC_FINISH |
| Closet trim (baseboard, casing) | SF_TRIM_NC_PAINT |
| Closet door | SF_DOOR_SLAB_INT_NC, SF_DOOR_FRAME_NC_FINISH |
| Wire shelving mesh (chrome/coated) | Not paintable — excluded |
| Freestanding/removable shelving | Not fixed — excluded |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT2, QT3, QT4, QT5 | QT3 | All tiers available. QT5 rare but must be supported. |
| application_method | brush_roll, spray, spray_rolloff | brush_roll | Brush/roll typical for installed. Spray for pre-install. Spray_rolloff for SS_BARE. |
| sheen | flat, eggshell, satin | satin | Satin standard for durability. |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | Per Substrate_State_Reference.md. Controls primer coat. |

---

## 4. Paintable Items

Uses **Opening Count Method** per BuiltIns_Shelving Quantification System.md v2.0.

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_OPENING_S | Small opening (6-18" x 6-18") | EA | Count per tier | Always |
| ITM_OPENING_M | Medium opening (18-36" x 12-30") | EA | Count per tier | Always |
| ITM_OPENING_L | Large opening (36-60" x 18-42") | EA | Count per tier | Always |
| ITM_OPENING_XL | XL opening (60"+ x 30"+) | EA | Count per tier | Always |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_EA_OPENING_S | PS_OPENING_EA.CLOSET_SHELF.S | EA | Always | Small openings count |
| IN_EA_OPENING_M | PS_OPENING_EA.CLOSET_SHELF.M | EA | Always | Medium openings count |
| IN_EA_OPENING_L | PS_OPENING_EA.CLOSET_SHELF.L | EA | Always | Large openings count |
| IN_EA_OPENING_XL | PS_OPENING_EA.CLOSET_SHELF.XL | EA | Always | XL openings count |
| IN_MOD_DEPTH | PS_OPENING_MOD.DEPTH | ENUM | Always | SHALLOW / DEEP / VERY_DEEP |
| IN_MOD_DETAIL | PS_OPENING_MOD.DETAIL | ENUM | Always | SIMPLE_BOX / FACE_FRAME |
| IN_MOD_ACCESS | PS_OPENING_MOD.ACCESS | ENUM | Always | OPEN_ACCESS / CRAMPED |
| IN_SUBSTRATE_STATE | PS_META.SUBSTRATE_STATE.CLOSET_SHELF | ENUM | Always | SS_BARE or SS_PRIMED_FACTORY |
| IN_SURFACE_CONDITION | PS_META.SURFACE_CONDITION.CLOSET_SHELF | ENUM | Always | COND_GOOD (NC assumption) |

### Proposed New Keys
- `PS_OPENING_EA.CLOSET_SHELF.S` — Small closet shelf openings (subset of BUILTIN_SHELF)
- `PS_OPENING_EA.CLOSET_SHELF.M` — Medium closet shelf openings
- `PS_OPENING_EA.CLOSET_SHELF.L` — Large closet shelf openings
- `PS_OPENING_EA.CLOSET_SHELF.XL` — XL closet shelf openings

> **Note:** Can use generic `PS_OPENING_EA.BUILTIN_SHELF.*` keys if separate closet keys not needed.

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| builtin_shelf | wall_field | linear | different_finish |

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_DRYWALL_WALL_NC_FINISH, SF_TRIM_NC_PAINT | Same closet scope |
| Typical before | SF_DRYWALL_WALL_NC_FINISH | Shelves often painted before wall finish |
| Typical after | SF_DRYWALL_WALL_NC_PRIME | Shelves installed after wall prime |

---

## 8. References

### 8a. Domain Doctrines

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| BuiltIns Quantification | BuiltIns_Shelving Quantification System.md | Opening Count method, modifiers |
| Millwork Doctrine | docs/Doctrine/Millwork_NC_Paint_Doctrine.md | MDF edge sealing, substrate prep |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | QT2-QT4 definitions |

### 8b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Substrate State Reference | docs/Reference/Substrate_State_Reference.md | SS_* state IDs |
| Modifier Registry | docs/Doctrine/Modifier_Registry.md | Canonical modifier values |
| Protection Zones Reference | docs/Reference/Protection_Zones_Reference.md | Valid zone IDs |
| Surface Vocabulary Reference | docs/Reference/Surface_Vocabulary_Reference.md | Valid surface IDs |

---

## 9. Special Notes / Constraints

- **Opening Count Method:** This spec uses EA opening counts, not SF. See BuiltIns_Shelving Quantification System.md v2.0.
- **Spray Rolloff:** When substrate_state = SS_BARE, use spray_rolloff application to work primer into wood grain.
- **Simple Spec:** Marked as "simple spec" in catalog. Minimize modules and task counts.
- **Closet Complexity:** This spec is the CAUSE of COMP_CLOSET_SHELVING (1.5x) modifier on wall/ceiling specs in the same closet — this spec does not receive that modifier itself.

---

## 10. Acceptance Criteria

- [ ] Uses Opening Count method (EA by tier) per BuiltIns_Shelving Quantification System.md
- [ ] Substrate state uses SS_* values from Substrate_State_Reference.md
- [ ] Spray_rolloff application method conditional on SS_BARE
- [ ] Protection zones match Protection_Zones_Reference
- [ ] State declarations include valid_input_states and output_state
- [ ] Adjacency declarations use valid surface IDs

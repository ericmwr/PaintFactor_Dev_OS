# Spec Brief: SF_DRYWALL_CEILING_NC_PRIME

**Status:** queued  
**Priority:** P1  
**Authored:** 2026-02-01  
**Author:** Eric  

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_DRYWALL_CEILING_NC_PRIME` |
| Name | New Construction Drywall Ceiling Prime |
| Domain | interior |
| Context | NC |
| Description | PVA or drywall primer on new drywall ceilings. Separate spec from wall prime because ceilings are typically primed at the same time as walls but have different application considerations (overhead work, different spray patterns. Separate from ceiling finish because prime happens before trim install. |

---

## 2. Scope Boundaries

### Includes
- New drywall ceiling field area (flat ceilings)
- Tray ceiling flat areas (treated as standard ceiling field)
- Vaulted/cathedral ceiling flat areas (height modifier applies)
- Drywall primer application (1 coat)
- Spot prime on repairs if applicable

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Ceiling finish coats | SF_DRYWALL_CEILING_NC_FINISH |
| Wall priming | SF_DRYWALL_WALL_NC_PRIME |
| Wood/beadboard ceilings | SF_WOOD_CEILING_NC |
| Coffered ceiling beams | SF_ARCH_ELEMENT_NC |
| Textured ceiling application | Out of scope (texture is pre-paint trade) |
| Ceiling edge cut-in at wall line | Included IF ceiling and wall are different colors (see notes) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| application_method | spray+backroll | Roll | Spray+backroll is standard for NC ceiling prime. Roll only for small areas or occupied spaces. |
| ceiling_height | standard (≤9ft), tall (10-12ft), vaulted (13-17ft), cathedral (18ft+) | standard | Drives height modifier on production rates |

> **No quality_tier dimension.** Primer is primer — QT doesn't differentiate primer application.
> QT applies to the finish spec. No sheen dimension either (primer has no sheen choice).

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_CEILING_FIELD_PRIME | Ceiling field prime | SF | PaintScope: PS_SURFACE_SF.CEILING_FIELD | Always |
| ITM_CEILING_EDGE_WALL | Ceiling-to-wall edge cut-in | LF | PaintScope: PS_EDGE_LF.TO_WALL (ceiling perspective) | When method = roll, or when spray requires edge work at wall line |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD | SF | Always | Total ceiling area to prime |
| IN_LF_EDGE_TO_WALL | PS_EDGE_LF.TO_WALL | LF | When roll | Ceiling perimeter for cut-in. Same physical edge as wall's PS_EDGE_LF.TO_CEILING but from ceiling's perspective. |

### Proposed New Keys
- `PS_SURFACE_SF.CEILING_FIELD` — Should already exist, verify in catalog
- `PS_EDGE_LF.TO_WALL` — May need to add. Currently catalog has `PS_EDGE_LF.TO_CEILING` (wall's perspective). Need the ceiling-perspective key or confirm they're the same measurement.

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| ceiling_field | wall_field | linear | different_finish |
| ceiling_field | trim_crown | linear | different_finish |

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_DRYWALL_WALL_NC_PRIME | Same day, same crew, same material |
| Typical before | SF_DRYWALL_CEILING_NC_FINISH, SF_TRIM_NC_PAINT | Prime before trim install |
| Typical after | Drywall finishing (not a paint spec) | Prime as soon as drywall is ready |
| Shares finish group with | — | Primer has no finish group; it's substrate prep |

---

## 8. References

### 8a. Domain Doctrines

| Doctrine | Sections Relevant |
|----------|-------------------|
| Quality_Tiers_and_Surface_Condition.md | Surface condition classification (new drywall = known condition) |
| Materials_and_Consumables_Doctrine.md | PVA primer specs, roller/spray tip sizing for ceilings |
| Estimation_Modifiers_Doctrine.md | Height modifiers for vaulted/cathedral ceilings |
| Protection_and_Masking_Doctrine.md | floor_full zone for ceiling spray |

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

- **Mirror the wall prime spec structure closely.** SF_DRYWALL_WALL_NC_PRIME is the closest sibling. Ceiling prime should follow the same patterns with ceiling-specific adjustments.
- **Height matters more for ceilings.** Overhead work at 9ft is very different from overhead at 18ft cathedral. The height modifier should be more aggressive than wall height modifiers.
- **Floor protection is always required for ceiling spray.** Protection zone: floor_full (not floor_perimeter).
- **Wall protection for ceiling spray.** If walls are not yet painted (typical NC sequence), wall masking may not be needed. If walls are already finished, wall_adjacent protection zone applies. This is a project-level sequencing decision, not a spec-level one — but the spec should declare the protection zones as conditional.

---

## 10. Acceptance Criteria

- [ ] Production rates for spray are distinct from wall spray rates (ceiling spray is slower due to overhead)
- [ ] Height modifiers are ceiling-specific (may be more aggressive than wall height modifiers)
- [ ] Floor protection zone is floor_full for spray method
- [ ] Material system references PVA or drywall-specific primer, not general purpose
- [ ] PaintScope key verification passes (all keys exist in catalog)

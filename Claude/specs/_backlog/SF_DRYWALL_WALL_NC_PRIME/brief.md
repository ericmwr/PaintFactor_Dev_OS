# Spec Brief: SF_DRYWALL_WALL_NC_PRIME

**Status:** queued
**Priority:** P1
**Authored:** 2026-02-01
**Author:** Eric

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_DRYWALL_WALL_NC_PRIME` |
| Name | New Construction Drywall Wall Prime |
| Domain | interior |
| Context | NC |
| Description | PVA or drywall primer on new drywall wall surfaces in new construction. Separate spec from ceiling prime because walls have different application considerations (vertical vs overhead, different spray patterns, different edge relationships). Separate from wall finish because prime happens before trim install and uses different material systems. Single primer coat, no finish coats. Includes substrate inspection and repair as a quality-tier-driven prep phase. |

---

## 2. Scope Boundaries

### Includes
- New drywall wall field area (all paintable wall surfaces excluding openings)
- Drywall primer application (1 coat)
- Surface preparation (dust removal, inspection)
- Substrate inspection and repair (QT-driven intensity)
- Wall-to-ceiling edge cut-in when required

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Wall finish coats | SF_DRYWALL_WALL_NC_FINISH |
| Ceiling priming | SF_DRYWALL_CEILING_NC_PRIME |
| Wood/panel walls | SF_WOOD_WALL_NC |
| Trim priming | SF_TRIM_NC_PRIME |
| Drywall repair beyond normal joint compound | Out of scope (drywall contractor) |
| Texture application | Out of scope (texture is pre-paint trade) |
| Stain blocking for smoke/water damage | Use repaint spec |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT2, QT3, QT4 | QT3 | Drives inspection/repair intensity and edge discipline. Does NOT differentiate primer application itself — primer must be applied properly at all tiers. QT affects prep scrutiny. |
| application_method | roll, spray_backroll, spray | spray_backroll | Spray+backroll is standard for NC wall prime. Roll for smaller jobs or occupied spaces. Spray-only where backroll is not required (verify with doctrine — backroll is strongly recommended on drywall for consolidation). |
| wall_height | standard, tall, high, extreme | standard | standard (≤9ft), tall (10-12ft), high (13-17ft), extreme (18ft+). Drives height modifier on production rates per Estimation_Modifiers_Doctrine. 18ft ceiling = 18ft wall. |
| drywall_finish_level | level_3, level_4, level_5 | level_4 | Affects coverage rate and absorption. Level 3 = more absorption. Level 5 = uniform surface. |
| surface_texture | smooth, orange_peel, knockdown | smooth | Texture affects coverage rate and nap selection. |

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_WALL_FIELD_PRIME | Wall field prime coat | SF | PaintScope: PS_SURFACE_SF.WALL_FIELD | Always |
| ITM_WALL_EDGE_CEILING | Ceiling edge cut-in | LF | PaintScope: PS_EDGE_LF.TO_CEILING | When method = roll, or when spray requires edge work at ceiling line |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD | SF | Always | Total paintable wall field area (excluding openings) |
| IN_LF_EDGE_TO_CEILING | PS_EDGE_LF.TO_CEILING | LF | When roll or spray requires edge work | Wall-to-ceiling boundary for cut-in. Same physical edge as ceiling's PS_EDGE_LF.TO_WALL but from wall's perspective. |

### Proposed New Keys
- None — all keys exist in catalog.

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| wall_field | ceiling_field | linear | different_finish |
| wall_field | trim_baseboard | linear | different_finish |
| wall_field | trim_casing_door | linear | different_finish |
| wall_field | trim_casing_window | linear | different_finish |

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_DRYWALL_CEILING_NC_PRIME | Same day, same crew, same material |
| Typical before | SF_DRYWALL_WALL_NC_FINISH, SF_TRIM_NC_PRIME | Prime before trim install |
| Typical after | Drywall finishing (not a paint spec) | Prime as soon as drywall is ready |
| Shares finish group with | — | Primer has no finish group; it's substrate prep |

---

## 8. References

### 8a. Domain Doctrines

| Doctrine | Sections Relevant |
|----------|-------------------|
| Quality_Tiers_and_Surface_Condition.md | Surface condition classification (new drywall = known condition), QT-driven inspection/repair intensity |
| Materials_and_Consumables_Doctrine.md | PVA primer specs, roller/spray tip sizing |
| Estimation_Modifiers_Doctrine.md | Height modifiers (applies to walls per doctrine line 170), texture modifiers, spray/backroll coupling |
| Protection_and_Masking_Doctrine.md | floor_perimeter and floor_full zone assignments |

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

- **Mirror the ceiling prime spec structure closely.** SF_DRYWALL_CEILING_NC_PRIME is the closest sibling. Wall prime should follow the same patterns with wall-specific adjustments.
- **Quality tier drives inspection/repair, not application.** Primer application quality is constant — no drips, sags, holidays at any tier. But QT2 does minimal inspection, QT3 does standard inspection and repair, QT4 does comprehensive inspection and repair. This prep phase is included here so the prime spec is self-contained and doesn't depend on the finish spec for inspection/repair.
- **Inspection/repair round deduplication with finish spec.** If inspection/repair is performed during prime, the finish spec (SF_DRYWALL_WALL_NC_FINISH) should eliminate its first inspection/repair round to avoid double-counting. This is a cross-spec coordination note.
- **Wall height modifiers apply.** Per Estimation_Modifiers_Doctrine line 170: "Height modifier applies to wall tasks when ceiling height creates elevated work areas." An 18ft ceiling means 18ft walls. Height modifier tiers: standard (≤9ft) = 1.0, tall (10-12ft) = 1.3, high (13-17ft) = 1.5, extreme (18ft+) = 2.0.
- **Floor protection varies by application method.** Roll = floor_perimeter (edge_only). Spray/spray_backroll = floor_full upgrades conditionally, fixture_covers for spray.
- **Inherited research corrections from old spec apply:** RC-001 (no spot-priming NC fasteners), RC-002 (PVA/acrylic primers are sealers not stain blockers), RC-003 (floor protection conditional on floor_type), RC-004 (no dry times in specs).
- **Old spec data is reference only for production rates, coverage rates, material systems, and task structure.** Do not carry over the old spec's format or schema — build fresh in the new format.
- **Adjacency includes door and window casings.** Wall field touches trim_casing_door and trim_casing_window in addition to ceiling_field and trim_baseboard. All four adjacencies must be declared.

---

## 10. Acceptance Criteria

- [ ] Quality tier is a config dimension driving inspection/repair intensity
- [ ] Wall height modifiers included per Estimation_Modifiers_Doctrine (1.0 / 1.3 / 1.5 / 2.0)
- [ ] Production rates for wall are distinct from ceiling rates (wall is faster — no overhead fatigue)
- [ ] Floor protection zone assignments match: floor_perimeter for roll, floor_full for spray
- [ ] Material system references PVA or drywall-specific primer, not general purpose
- [ ] PaintScope key verification passes (all keys exist in catalog)
- [ ] Research corrections RC-001 through RC-004 are inherited and enforced
- [ ] Adjacency declares all four adjacent surfaces: ceiling_field, trim_baseboard, trim_casing_door, trim_casing_window
- [ ] Structure mirrors SF_DRYWALL_CEILING_NC_PRIME with wall-specific adjustments
- [ ] Cross-spec note about inspection/repair deduplication with finish spec

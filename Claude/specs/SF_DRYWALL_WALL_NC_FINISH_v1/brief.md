# Spec Brief: SF_DRYWALL_WALL_NC_FINISH

**Status:** queued
**Priority:** P1
**Authored:** 2026-02-04
**Author:** SpecFactory (generated from catalog entry #7)

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_DRYWALL_WALL_NC_FINISH` |
| Name | New Construction Drywall Wall Finish Coat |
| Domain | interior |
| Context | NC |
| Description | Finish coat application (1-2 coats) for primed drywall walls in new construction. Applied over cured primer. Wall painter establishes the clean ceiling line via cut-in at the wall-to-ceiling boundary. Walls are painted AFTER ceilings in NC production. Separate from prime because finish happens after primer cures and may occur after trim install begins. |

---

## 2. Scope Boundaries

### Includes
- Primed drywall wall surfaces (primer cured)
- Finish coat application (1 or 2 coats depending on QT)
- Surface preparation (inspection, dust wipe, sanding per QT)
- Light sand between coats (QT4+)
- Edge cut-in at ceiling line (wall painter establishes ceiling line)
- Window/door masking verification (overspray/splatter risk for spray methods)
- Subfloor vacuum (post-paint cleanup)

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Primer application | SF_DRYWALL_WALL_NC_PRIME |
| Ceiling finish coats | SF_DRYWALL_CEILING_NC_FINISH |
| Wood/panel wall finish | SF_WOOD_WALL_NC |
| Trim painting | SF_TRIM_NC_PAINT |
| Textured wall application | Out of scope (texture is pre-paint trade) |
| Floor protection (finished flooring) | Subfloor only in typical NC sequence; if finished flooring installed, floor protection applies |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT2, QT3, QT4, QT5 | QT3 | Coat count: QT2=1 coat, QT3=2 coats (1 if coverage achieved), QT4-QT5=2 coats. Sheen restricts minimum QT: flat/matte/eggshell=any QT, satin/semi-gloss=QT4+, gloss=QT5. |
| application_method | roll, spray_backroll, spray | spray_backroll | Spray+backroll is NC production standard. 18" roller per doctrine. |
| finish_sheen | flat, matte, eggshell, satin, semi-gloss, gloss | eggshell | Eggshell is standard for walls. Flat/matte/eggshell available at any QT. Satin/semi-gloss require QT4+. Gloss requires QT5. |
| surface_texture | smooth, orange_peel, knockdown | smooth | Texture affects coverage rate and application technique |
| wall_height | standard, tall, high, extreme | standard | standard (<=9ft), tall (10-12ft), high (13-17ft), extreme (18ft+). Drives height modifier per Estimation_Modifiers_Doctrine. |

> **No coat_count dimension.** Coat count is derived from quality_tier per doctrine:
> - QT2 = 1 coat
> - QT3 = 2 coats default (1 coat acceptable if full coverage achieved)
> - QT4 = 2 coats
> - QT5 = 2 coats

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_WALL_FIELD_FINISH | Wall field finish coat | SF | PaintScope: PS_SURFACE_SF.WALL_FIELD | Always |
| ITM_WALL_EDGE_CEILING | Ceiling edge cut-in | LF | PaintScope: PS_EDGE_LF.TO_CEILING | Always (wall painter establishes ceiling line) |

> **Critical difference from ceiling finish:** Wall finish REQUIRES edge cut-in at the ceiling line. In NC production, walls are painted after ceilings, and the wall painter establishes the clean ceiling line.

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD | SF | Always | Total wall area to finish |
| IN_LF_EDGE_TO_CEILING | PS_EDGE_LF.TO_CEILING | LF | Always | Wall-to-ceiling boundary for cut-in (wall painter establishes ceiling line) |
| IN_SF_FLOOR_AREA | PS_META.SF.FLOOR_VACUUM_AREA | SF | Always | Floor area for post-application vacuum cleanup |
| IN_SF_FLOOR_AREA | PS_PROTECT_SF.FLOOR_EXPOSED | SF | When floor covering exists | Inspect previously installed floor covering for defects, repair as needed |
| IN_EA_ROOMS | PS_META.EA.ROOMS_TOTAL | EA | When spray/spray_backroll | Room count for protection heuristics |
| IN_EA_WINDOW_OPENINGS | PS_OPENING_EA.WINDOW_OPENINGS_TOTAL | EA | Always | Count of window openings to verify/apply masking |
| IN_EA_DOOR_OPENINGS | PS_OPENING_EA.DOOR_OPENINGS_TOTAL | EA | Always | Count of door openings to verify/apply masking |

### Proposed New Keys
- None. All keys exist in catalog.

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| wall_field | ceiling_field | linear | different_finish |
| wall_field | trim_baseboard | linear | different_finish |
| wall_field | trim_casing_door | linear | different_finish |
| wall_field | trim_casing_window | linear | different_finish |

> **Edge work required:** Wall painter cuts in at ceiling line. This IS the critical edge relationship that differentiates wall finish from ceiling finish.

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_DRYWALL_CEILING_NC_FINISH | Same project |
| Typical after | SF_DRYWALL_WALL_NC_PRIME | Finish follows cured primer |
| Typical after | SF_DRYWALL_CEILING_NC_FINISH | Ceilings finished before trim package |
| Typical after | SF_TRIM_NC_PAINT | Wall finish comes AFTER trim package is complete and masked off |
| Shares finish group with | — | Walls may share finish group with ceilings if same color/sheen (rare but possible) |

> **NC Production Sequence:** Prime ceilings → Prime walls → Finish ceilings → Complete trim package (fill, sand, caulk, prime if needed, 2 coats finish, sand between coats, mask off) → **Wall finish**. Wall finish is one of the last operations.

---

## 8. References

### 8a. Domain Doctrines (per-spec)

| Doctrine | Sections Relevant |
|----------|-------------------|
| Quality_Tiers_and_Surface_Condition.md | Sanding standards by QT, sheen/QT minimums, coat count rules |
| Materials_and_Consumables_Doctrine.md | Wall paint specs, roller/spray tip sizing for walls, 18" backroll roller standard |
| Estimation_Modifiers_Doctrine.md | Wall height modifiers (standard/tall/high/extreme) |
| Protection_and_Masking_Doctrine.md | Floor protection zones, window/door masking verification |

### 8b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | `docs/Doctrine/Spec_Completeness_Doctrine.md` | Mandatory completeness requirements all specs must pass |
| Modifier Registry | `docs/Doctrine/Modifier_Registry.md` | Canonical modifier IDs and values |
| Protection Zones Reference | `docs/Reference/Protection_Zones_Reference.md` | Valid zone IDs for protection task metadata |
| Surface Vocabulary Reference | `docs/Reference/Surface_Vocabulary_Reference.md` | Valid surface IDs for adjacency and finish groups |
| Site Condition Vocabulary | `docs/Reference/Site_Condition_Vocabulary_Reference.md` | Valid site condition IDs |
| PaintScope Quantity Key Catalog | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` | Canonical key catalog for verifying Section 5 keys |
| Spec Input to PaintScope Mapping | `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` | Mapping between spec inputs and PaintScope keys |
| Spec JSON Schema | `specs/_schemas/spec.schema.json` | Target schema for generated spec.json |

---

## 9. Special Notes / Constraints

- **Mirror the ceiling finish spec structure.** SF_DRYWALL_CEILING_NC_FINISH is the closest sibling. Wall finish should follow the same patterns with wall-specific adjustments (edge cut-in at ceiling, wall height modifiers, faster production rates).
- **Wall painter establishes ceiling line.** This is the critical difference from ceiling finish. In NC production, ceilings are painted first and the ceiling painter rolls/sprays freely past the wall line. Later, the wall painter cuts in at the ceiling to establish the clean line. MUST add edge cut-in tasks and PaintScope inputs.
- **Wall height modifiers are less aggressive than ceiling modifiers.** Walls don't have overhead fatigue. Use wall-specific height modifiers from Modifier_Registry.md: standard (<=9ft) = 1.0, tall (10-12ft) = 1.15, high (13-17ft) = 1.3, extreme (18ft+) = 1.5.
- **Wall finish is faster than ceiling finish.** No overhead work means faster production rates. Base rates should reflect this (wall production ~15-20% faster than ceiling for same method).
- **Window/door masking verification.** Splatter risk for spray methods requires masking verification/application at openings.
- **Sheen application progression.** Higher sheens require more careful application. Walls commonly use eggshell (default) vs flat for ceilings.
- **Inspection/repair deduplication with prime spec.** If SF_DRYWALL_WALL_NC_PRIME performed inspection/repair, wall finish should eliminate its first inspection/repair round to avoid double-counting. This is a cross-spec coordination note — implement via conditional task inclusion based on whether prime spec was applied.
- **Inherit research corrections from SF_DRYWALL_WALL_NC_PRIME.** Key inherited corrections: RC-001 (no spot-priming NC fasteners), RC-004 (no dry time references in specs).
- **Subfloor vacuum cleanup.** Post-application cleanup uses PS_META.SF.FLOOR_VACUUM_AREA.
- **Floor protection inspection.** If floor covering was installed during earlier tasks, inspect for defects and repair as needed (uses PS_PROTECT_SF.FLOOR_EXPOSED).

---

## 10. Acceptance Criteria

- [ ] Edge cut-in tasks exist at ceiling line (wall painter establishes ceiling line)
- [ ] Production rates for wall are wall-specific (faster than ceiling due to no overhead fatigue)
- [ ] Wall height modifiers are wall-specific (less aggressive than ceiling height modifiers)
- [ ] Window/door masking verification tasks exist for spray methods
- [ ] Coat count rules match doctrine (QT2=1 coat, QT3=2 coats default, QT4-5=2 coats)
- [ ] Sheen/QT rules match doctrine (flat/matte/eggshell=any QT, satin/semi-gloss=QT4+, gloss=QT5)
- [ ] Sanding between coats at QT4+ per doctrine
- [ ] Material system references wall-appropriate finish paint (not primer, not ceiling paint)
- [ ] All PaintScope keys verified in catalog
- [ ] All four adjacency relationships declared: ceiling_field, trim_baseboard, trim_casing_door, trim_casing_window
- [ ] Sequencing notes confirm wall finish comes after trim package is complete and masked off
- [ ] Cross-spec note about inspection/repair deduplication with prime spec

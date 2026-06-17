# Spec Brief: SF_DRYWALL_CEILING_NC_FINISH

**Status:** queued
**Priority:** P1
**Authored:** 2026-02-02
**Author:** SpecFactory (generated from catalog entry #2)

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_DRYWALL_CEILING_NC_FINISH` |
| Name | New Construction Drywall Ceiling Finish Coat |
| Domain | interior |
| Context | NC |
| Description | Finish coat application (1-2 coats) for primed drywall ceilings in new construction. Applied over cured primer. Mirrors SF_DRYWALL_WALL_NC_FINISH structure adapted for overhead work. Ceilings are painted BEFORE walls in NC production — the ceiling painter does NOT need to cut in at the wall line (wall painter establishes the final ceiling line). Separate from prime because finish happens after primer cures and may occur after trim install begins. |

---

## 2. Scope Boundaries

### Includes
- Primed drywall ceiling surfaces (primer cured)
- Finish coat application (1 or 2 coats depending on QT)
- Surface preparation (inspection, dust wipe, sanding per QT)
- Light sand between coats (QT4+)
- Ceiling fixture protection (recessed lights, electrical boxes) for spray methods
- Window/door masking verification (overspray/splatter falls on openings)
- Subfloor vacuum (post-paint cleanup)

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Primer application | SF_DRYWALL_CEILING_NC_PRIME |
| Wall finish coats | SF_DRYWALL_WALL_NC_FINISH |
| Wood/beadboard ceiling finish | SF_WOOD_CEILING_NC |
| Coffered ceiling beam finish | SF_ARCH_ELEMENT_NC |
| Trim painting | SF_TRIM_NC_PAINT |
| Edge work at ceiling-wall boundary | NOT REQUIRED — wall painter establishes ceiling line |
| Textured ceiling application | Out of scope (texture is pre-paint trade) |
| Floor protection (finished flooring) | Subfloor only in typical NC sequence; if finished flooring installed, floor protection applies |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT2, QT3, QT4, QT5 | QT3 | Sheen restricts minimum QT per doctrine. QT2=flat only 1 coat; QT3=flat 1 coat; QT4=2 coats (flat for color OR eggshell/satin); QT5=2 coats semi-gloss+ |
| application_method | roll, spray_backroll, spray | spray_backroll | Spray+backroll is NC production standard. 18" roller per doctrine. |
| finish_sheen | flat, eggshell, satin, semi-gloss, gloss | flat | Flat is standard for ceilings. Higher sheens require progressively more careful application. Satin/semi-gloss require QT4+. |
| surface_texture | smooth, orange_peel, knockdown | smooth | Texture affects coverage rate and application technique |
| ceiling_height | standard, tall, vaulted, cathedral | standard | standard (<=9ft), tall (10-12ft), vaulted (13-17ft), cathedral (18ft+). Drives height modifier — more aggressive than wall height modifiers due to overhead work. |

> **No coat_count dimension.** Coat count is derived from quality_tier per doctrine (QT2-QT3 = 1 coat, QT4-QT5 = 2 coats).

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_CEILING_FIELD_FINISH | Ceiling field finish coat | SF | PaintScope: PS_SURFACE_SF.CEILING_FIELD | Always |

> **No edge cut-in item.** Ceiling finish in NC does not require edge work at the wall line. The wall painter establishes the final ceiling line. This is the key structural difference from SF_DRYWALL_WALL_NC_FINISH.

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_CEILING_FIELD | PS_SURFACE_SF.CEILING_FIELD | SF | Always | Total ceiling area to finish |
| IN_SF_FLOOR_AREA | PS_PROTECT_SF.FLOOR_EXPOSED | SF | Always | Floor area for subfloor vacuum cleanup |
| IN_EA_ROOMS | PS_META.EA.ROOMS_TOTAL | EA | When spray/spray_backroll | Room count for ceiling fixture protection heuristic |
| IN_EA_WINDOW_OPENINGS | PS_OPENING_EA.WINDOW_OPENINGS_TOTAL | EA | Always | Count of window openings to verify/apply masking |
| IN_EA_DOOR_OPENINGS | PS_OPENING_EA.DOOR_OPENINGS_TOTAL | EA | Always | Count of door openings to verify/apply masking |

### Proposed New Keys
- None. All keys exist in catalog.

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| ceiling_field | wall_field | linear | different_finish |

> **No affected_tasks for adjacency.** Because ceiling finish does NOT cut in at the wall line (wall painter does), there are no ceiling finish tasks affected by this adjacency. The declaration exists for project-level finish group optimization only.

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_DRYWALL_WALL_NC_FINISH | Same project, but ceilings first |
| Typical before | SF_DRYWALL_WALL_NC_FINISH | Ceilings painted before walls in NC |
| Typical after | SF_DRYWALL_CEILING_NC_PRIME | Finish follows cured primer |
| Shares finish group with | — | Ceilings are typically different color/sheen from walls |

---

## 8. References

### 8a. Domain Doctrines (per-spec)

| Doctrine | Sections Relevant |
|----------|-------------------|
| Quality_Tiers_and_Surface_Condition.md | Sanding standards by QT, sheen/QT minimums, coat count rules |
| Materials_and_Consumables_Doctrine.md | Ceiling paint specs, roller/spray tip sizing for ceilings, 18" backroll roller standard |
| Estimation_Modifiers_Doctrine.md | Height modifiers for vaulted/cathedral ceilings (more aggressive than wall) |
| Protection_and_Masking_Doctrine.md | Fixture protection zones, window/door masking verification |

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

- **Mirror the wall finish spec structure.** SF_DRYWALL_WALL_NC_FINISH is the closest sibling. Ceiling finish should follow the same patterns with ceiling-specific adjustments (overhead rates, no edge work).
- **NO edge cut-in at wall line.** This is the critical difference from wall finish. In NC production, ceilings are painted first and the ceiling painter rolls/sprays freely past the wall line. The wall painter later cuts in and establishes the clean ceiling line. Do NOT add edge tasks or edge PaintScope inputs.
- **Height modifiers are more aggressive for ceilings.** Overhead work at height compounds the difficulty. Use ceiling-specific height modifiers from Modifier_Registry.md, not wall modifiers.
- **Fixture protection required for spray methods.** Recessed lights and ceiling electrical boxes need protection (paper stuff + tape). Use room count heuristic (6 recessed + 2 electrical per room).
- **Window/door masking verification.** Even though ceilings aren't near windows, overspray and splatter can reach openings. Verify existing masking or apply if missing.
- **Sheen application penalty on ceilings.** Higher sheens on ceilings are significantly harder than on walls due to gravity — roller marks and lap marks are more visible. Production rates should reflect this.
- **Inherit research corrections from SF_DRYWALL_CEILINGS_NC_PAINT_v1.** The old ceiling paint spec contains validated patterns. Key inherited corrections: no dry time references in specs (RC-004).
- **Subfloor vacuum cleanup.** Post-application cleanup uses PS_META.SF.FLOOR_VACUUM_AREA or PS_PROTECT_SF.FLOOR_EXPOSED.

---

## 10. Acceptance Criteria

- [ ] No edge cut-in tasks exist (wall painter establishes ceiling line)
- [ ] Production rates for spray are ceiling-specific (slower than wall spray due to overhead)
- [ ] Height modifiers are ceiling-specific and more aggressive than wall height modifiers
- [ ] Fixture protection tasks exist for spray/spray_backroll methods
- [ ] Window/door masking verification tasks exist
- [ ] Sheen/QT rules match doctrine (QT2-3 = 1 coat flat, QT4 = 2 coats, QT5 = 2 coats semi-gloss+)
- [ ] Sanding between coats at QT4+ per doctrine
- [ ] Material system references ceiling-appropriate paint (not primer)
- [ ] All PaintScope keys verified in catalog
- [ ] Sequencing notes confirm ceilings-before-walls production order

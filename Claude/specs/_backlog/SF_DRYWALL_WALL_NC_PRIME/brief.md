# Spec Brief: SF_DRYWALL_WALL_NC_PRIME

**Status:** queued
**Priority:** P1
**Authored:** 2026-02-04
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_DRYWALL_WALL_NC_PRIME` |
| Name | New Construction Drywall Wall Prime |
| Domain | interior |
| Context | NC |
| Description | PVA or drywall primer on bare drywall wall surfaces in new construction. Single primer coat to seal drywall and provide uniform porosity for finish coats. Separate from ceiling prime (vertical vs overhead application, different spray patterns, no overhead fatigue). Separate from wall finish (prime happens before trim install, uses different material systems). Includes QT-driven substrate inspection/repair as prep phase. |

---

## 2. Scope Boundaries

### Includes
- Bare drywall wall field area (all paintable wall surfaces excluding openings)
- Drywall primer application (1 coat)
- Surface preparation (dust removal via HEPA vacuum)
- Substrate inspection and repair (intensity driven by quality_tier)
- Wall-to-ceiling edge cut-in (when required by application method)
- Floor protection setup/teardown (conditional on floor_type and application_method)
- Fixture protection (spray methods only)

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Wall finish coats | SF_DRYWALL_WALL_NC_FINISH |
| Ceiling priming | SF_DRYWALL_CEILING_NC_PRIME |
| Wood/panel walls | SF_WOOD_WALL_NC |
| Trim priming | SF_TRIM_NC_PRIME |
| Drywall repair beyond normal joint compound | Out of scope (drywall contractor) |
| Texture application | Out of scope (texture is pre-paint trade) |
| Stain blocking for smoke/water damage | Use repaint spec with stain-blocking primer |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT2, QT3, QT4 | QT3 | Drives inspection/repair intensity. Primer application quality is constant at all tiers (no drips, sags, holidays). QT5 not applicable to primer-only scope. |
| application_method | roll, spray_backroll | spray_backroll | Spray+backroll is NC production standard with 18" roller. Roll for smaller jobs. **Spray-only is NEVER valid** — backroll always required for sealing bare drywall. |
| wall_height | standard, tall, high, extreme | standard | standard (7-8ft)=H1, tall (9-12ft)=H2, high (13-17ft)=H3, extreme (18ft+)=H4. Height modifiers per Modifier_Registry. |
| drywall_finish_level | level_3, level_4, level_5 | level_4 | Affects primer coverage rate. Level 3 = more absorption. Level 5 = may require high-build primer. |
| surface_texture | smooth, orange_peel, knockdown | smooth | Texture affects coverage rate and roller nap selection. Modifiers: smooth=1.0, orange_peel=1.10, knockdown=1.15. |

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_WALL_FIELD_PRIME | Wall field prime coat | SF | PaintScope: PS_SURFACE_SF.WALL_FIELD | Always |
| ITM_WALL_EDGE_CEILING | Ceiling edge cut-in | LF | PaintScope: PS_EDGE_LF.TO_CEILING | When application_method = roll, or when spray requires ceiling-line edge work |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_WALL_FIELD | PS_SURFACE_SF.WALL_FIELD | SF | Always | Total paintable wall field area (excluding openings) |
| IN_LF_EDGE_TO_CEILING | PS_EDGE_LF.TO_CEILING | LF | Conditional | Wall-to-ceiling boundary for cut-in. Required for roll method. May be needed for spray edge touch-up. |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | When roll | Perimeter floor protection area |
| IN_SF_PROTECT_FLOOR_EXPOSED | PS_PROTECT_SF.FLOOR_EXPOSED | SF | When spray_backroll | Full floor protection for spray overspray |
| IN_EA_ROOMS_TOTAL | PS_META.EA.ROOMS_TOTAL | EA | When spray_backroll | Room count for fixture protection heuristic (avg 6 outlets/switches per room) |
| IN_SF_FLOOR_VACUUM | PS_META.SF.FLOOR_VACUUM_AREA | SF | Always | Floor area for post-prime vacuum cleanup |

### Proposed New Keys
- None — all required keys exist in PaintScope_Quantity_Key_Catalog.md

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| wall_field | ceiling_field | linear | different_finish |
| wall_field | trim_baseboard | linear | different_finish |
| wall_field | trim_casing_door | linear | different_finish |
| wall_field | trim_casing_window | linear | different_finish |

**NC Context Note:** In NC sequence, trim (baseboard, door casing, window casing) is typically NOT installed during wall prime phase. These adjacencies are declared for project-level finish group tracking but do NOT create edge work tasks in this spec. Primary edge work is at the ceiling line only.

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_DRYWALL_CEILING_NC_PRIME | Same day, same crew, same material. Protection setup can be shared. |
| Typical before | SF_DRYWALL_WALL_NC_FINISH, SF_TRIM_NC_PRIME | Prime before trim install |
| Typical after | Drywall finishing (not a paint spec) | Prime as soon as drywall is ready |
| Shares finish group with | — | Primer has no finish group; it's substrate prep |

---

## 8. References

### 8a. Domain Doctrines

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Task classification (binary vs QT-scaled), application quality not tiered, inspection discipline by QT |
| Materials & Consumables | docs/Doctrine/Materials_and_Consumables_Doctrine.md | PVA primer classification (sealer not stain blocker), roller sizing (18" for spray+backroll), nap selection |
| Estimation Modifiers | docs/Doctrine/Estimation_Modifiers_Doctrine.md | Height modifiers, spray/backroll throughput coupling, texture modifiers |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Floor protection by method, fixture covers for spray |

### 8b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | `docs/Doctrine/Spec_Completeness_Doctrine.md` | Mandatory completeness requirements |
| Modifier Registry | `docs/Doctrine/Modifier_Registry.md` | Canonical modifier IDs and values |
| Protection Zones Reference | `docs/Reference/Protection_Zones_Reference.md` | Valid zone IDs for protection tasks |
| Surface Vocabulary Reference | `docs/Reference/Surface_Vocabulary_Reference.md` | Valid surface IDs for adjacency |
| Site Condition Vocabulary | `docs/Reference/Site_Condition_Vocabulary_Reference.md` | Valid site condition IDs |
| Substrate State Reference | `docs/Reference/Substrate_State_Reference.md` | Valid substrate state IDs (SS_*) |
| PaintScope Quantity Key Catalog | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` | Verify Section 5 keys exist |
| Spec Input → PaintScope Mapping | `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` | Key mapping validation |
| Spec JSON Schema | `specs/_schemas/spec.schema.json` | Target schema for spec.json |

---

## 9. Special Notes / Constraints

### Application Method Constraint
- **Spray-only is NEVER valid for priming bare drywall.** Backroll is always required when spraying primer on bare drywall to consolidate primer into drywall pores and ensure proper sealing. Without backroll, even sheen on finish coats is impossible. This is non-negotiable doctrine.

### Inherited Research Corrections (from prior specs)
- **RC-001:** No spot-priming of NC drywall fasteners — fasteners are mudded by drywall contractor and modern screws are rust-resistant
- **RC-002:** PVA/acrylic primers are SEALERS, not stain blockers — zero stain blocking capability
- **RC-003:** Floor protection is conditional on floor_type site condition — subfloor requires no protection
- **RC-004:** Do not specify dry times in specs — too many variables, refer to PDS

### Cross-Spec Coordination
- If inspection/repair is performed during wall prime, SF_DRYWALL_WALL_NC_FINISH should reduce or eliminate its first inspection/repair round to avoid double-counting labor. Track via XSPEC flag.

### Wall vs Ceiling Production Rates
- Wall work is ~15-20% faster than ceiling work due to no overhead fatigue. Production rates should reflect this (wall is baseline, ceiling has overhead fatigue modifier).

### Height Modifiers
- Per Estimation_Modifiers_Doctrine: Height modifier applies to wall tasks when ceiling height creates elevated work areas. An 18ft ceiling means 18ft walls. Use Modifier_Registry values: H1=1.0, H2=1.30, H3=1.50, H4=2.00.

### NC Sequencing Context
- Wall prime typically occurs before trim installation (baseboard, casing). Trim adjacency edges are not relevant during prime phase — only ceiling edge work matters.
- Walls and ceilings are typically primed in the same session. Project assembly should optimize shared protection setup/teardown.

---

## 10. Acceptance Criteria

- [ ] quality_tier is a config dimension driving inspection/repair intensity (not application quality)
- [ ] application_method excludes spray-only (only roll and spray_backroll are valid)
- [ ] Wall height modifiers use Modifier_Registry values (H1=1.0, H2=1.30, H3=1.50, H4=2.00)
- [ ] Floor protection zones correct: floor_perimeter for roll, floor_full for spray_backroll
- [ ] Material system references PVA/drywall primer as SEALER (not stain blocker per RC-002)
- [ ] No spot-prime tasks for fasteners (per RC-001)
- [ ] No dry times specified in materials (per RC-004)
- [ ] Floor protection conditional on floor_type site condition (per RC-003)
- [ ] Adjacency declares all four adjacent surfaces: ceiling_field, trim_baseboard, trim_casing_door, trim_casing_window
- [ ] State declarations: valid_input_states = SS_BARE, output_state = SS_PRIMED_FIELD
- [ ] Cross-spec coordination note for inspection/repair deduplication with finish spec
- [ ] PaintScope key verification passes (all keys exist in catalog)

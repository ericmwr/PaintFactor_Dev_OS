# Spec Brief: {SF_ID}

**Status:** queued | in_progress | generated  
**Priority:** P1 | P2 | P3  
**Authored:** {date}  
**Author:** {name}  

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_EXAMPLE_NC_PAINT` |
| Name | Human-readable name |
| Domain | interior / exterior / specialty |
| Context | NC (new construction) / RP (repaint) |
| Description | One paragraph: what this spec covers and why it's a separate spec |

---

## 2. Scope Boundaries

### Includes
- Surface/item 1
- Surface/item 2
- Specific prep steps worth calling out

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Adjacent surface X | SF_OTHER_SPEC |
| Specialty process Y | SF_SPECIALTY_SPEC |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT2, QT3, QT4, QT5 | QT3 | Sheen restricts minimum QT per doctrine |
| application_method | spray, brush, roll | spray | Standard for NC |
| sheen | flat, eggshell, satin, semi-gloss, gloss | — | Per project spec |
| substrate_condition | factory_primed, bare_wood | factory_primed | Controls conditional primer coat |

> Only list dimensions that actually change behavior in this spec.
> Don't add dimensions just for metadata.

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_EXAMPLE_1 | Primary surface | SF | PaintScope measured | Always |
| ITM_EXAMPLE_2 | Edge work | LF | PaintScope derived | When method = roll |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_EXAMPLE | PS_SURFACE_SF.EXAMPLE | SF | Always | Core quantity |
| IN_LF_EXAMPLE | PS_EDGE_LF.TO_CEILING | LF | When roll | Edge cut-in |

> If a key doesn't exist in the PaintScope catalog yet, flag it here.
> The pipeline will STOP if keys are missing — that's by design.

### Proposed New Keys (if any)
- `PS_NEW_KEY.EXAMPLE` — Description, why needed

---

## 6. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| surface_id_1 | surface_id_2 | linear | different_finish |

---

## 7. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often combined with | SF_X, SF_Y | Same project scope |
| Typical before | SF_A | Sequencing |
| Typical after | SF_B | Sequencing |
| Shares finish group with | SF_C | Same color/sheen likely |

---

## 8. References

### 8a. Domain Doctrines (per-spec — list only those relevant)

| Doctrine | Sections Relevant |
|----------|-------------------|
| Quality_Tiers_and_Surface_Condition.md | Sanding standards, sheen/QT minimums |
| Materials_and_Consumables_Doctrine.md | Roller sizing, consumable standards |
| Fine_Finish_Doctrine.md | If fine finish surface |
| Millwork_NC_Paint_Doctrine.md | If wood millwork |
| Protection_and_Masking_Doctrine.md | Protection zone assignments |

### 8b. Standing References (always included — do not remove)

These apply to every spec and are automatically loaded by the orchestrator. They do not need to be customized per brief.

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | `docs/Doctrine/Spec_Completeness_Doctrine.md` | Mandatory completeness requirements all specs must pass |
| Modifier Registry | `docs/Doctrine/Modifier_Registry.md` | Canonical modifier IDs and values |
| Protection Zones Reference | `docs/Reference/Protection_Zones_Reference.md` | Valid zone IDs for protection task metadata |
| Surface Vocabulary Reference | `docs/Reference/Surface_Vocabulary_Reference.md` | Valid surface IDs for adjacency and finish groups |
| Site Condition Vocabulary | `docs/Reference/Site_Condition_Vocabulary_Reference.md` | Valid site condition IDs |
| PaintScope Quantity Key Catalog | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` | Canonical key catalog for verifying Section 5 keys |
| Spec Input → PaintScope Mapping | `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` | Mapping between spec inputs and PaintScope keys |
| Spec JSON Schema | `specs/_schemas/spec.schema.json` | Target schema for generated spec.json |

---

## 9. Special Notes / Constraints

> Anything the pipeline agents need to know that isn't captured above.
> Examples:
> - "Primer coat is conditional on substrate_condition, not a separate spec"
> - "Production rates should reference Millwork Doctrine Table 7.2"
> - "This spec pairs with SF_X — protection setup should be shared"

---

## 10. Acceptance Criteria

> What makes this spec "done"? Minimum quality gates beyond standard Critic pass.
> Examples:
> - [ ] All profile_type variants have distinct production rates
> - [ ] Glass masking tasks include window_glass protection zone
> - [ ] Coat count matches doctrine for substrate condition

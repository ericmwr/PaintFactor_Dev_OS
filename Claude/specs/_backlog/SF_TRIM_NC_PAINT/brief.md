# Spec Brief: SF_TRIM_NC_PAINT

**Status:** queued
**Priority:** P1 (#9 in catalog)
**Authored:** 2026-02-07
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_TRIM_NC_PAINT` |
| Name | New Construction Interior Trim Finish Coat |
| Domain | interior |
| Context | NC |
| Description | Finish coat application (2 coats standard) for interior trim in new construction. Applied over cured primer from SF_TRIM_NC_PRIME. Covers all trim types: baseboard, door casing, window casing, crown molding, chair rail, wainscot rail, shadow box, panel mold, and picture rail. Uses LF as primary UOM per PDCA standard (1 LF trim = 1 SF). Material system selection is quality-tier-driven: standard acrylic enamel (QT3), waterborne alkyd (QT4), or premium urethane enamel (QT5). Sheen selection is constrained by quality tier per Fine Finish Doctrine. This spec was split from SF_TRIM_NC_PRIME because finish has different material systems, sheen constraints, and includes interstage between-coat processes. |

---

## 2. Scope Boundaries

### Includes
- Finish coat application (2 coats standard, 3+ at QT5 with brush/roll)
- Initial prep after primer cure (light sand, touch-up fill/caulk, dust cleanup)
- Interstage inspect-sand-repair cycle between finish coats
- Final quality inspection
- Floor protection setup/teardown
- Wall masking (spray method only)

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Primer application | SF_TRIM_NC_PRIME |
| Heavy fill/caulk/sand before primer | SF_TRIM_NC_PRIME |
| Wall finish coats | SF_DRYWALL_WALL_NC_FINISH |
| Ceiling finish coats | SF_DRYWALL_CEILING_NC_FINISH |
| Door slab painting | SF_DOOR_SLAB_INT_NC |
| Door frame painting | SF_DOOR_FRAME_NC_FINISH |
| Window trim painting | SF_WINDOW_INT_NC (future) |
| Cabinet painting | SF_CABINET_NC_PAINT |
| Stair trim | SF_STAIR_RAILING_NC |
| Exterior trim | SF_TRIM_EXT_* (future) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | Drives material system, sanding discipline, inspection scrutiny. QT3=quick glance 6ft, QT4=systematic 3ft, QT5=lighted critical arm's length. |
| application_method | brush, spray | brush | Brush is NC production standard for trim. Spray requires wall/floor protection but faster for large scope. Per Fine_Finish_Doctrine Section 15. |
| sheen | satin, semi-gloss, gloss | semi-gloss | Per Fine_Finish_Doctrine Section 4.1: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only. Semi-gloss is trim default. |
| profile_complexity | simple, standard, complex, ornate | standard | Affects production rates. Simple=0.85x, Standard=1.0x, Complex=1.25x, Ornate=1.40x per Millwork_NC_Paint_Doctrine Section 7.2. |
| trim_height | standard, tall, high | standard | Standard (7-8ft)=H1, Tall (9-12ft)=H2, High (13ft+)=H3. Primarily affects crown molding and high casing. |

> **No coat_count dimension.** Coat count is derived from quality_tier per doctrine:
> - QT3 = 2 finish coats
> - QT4 = 2 finish coats
> - QT5 = 2-3 finish coats (3+ typical for brush/roll per FFD 15.10.3)

> **Sheen/QT gate for trim (Fine Finish Doctrine Section 4.1):**
> - QT3: Satin or lower
> - QT4: Any except gloss
> - QT5: Any including gloss

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_TRIM_BASEBOARD | Baseboard | LF | PaintScope: PS_SURFACE_LF.TRIM_BASEBOARD | Always (when baseboard in scope) |
| ITM_TRIM_CASING_DOOR | Door casing | LF | PaintScope: PS_SURFACE_LF.TRIM_CASING_DOOR | Always (when door casing in scope) |
| ITM_TRIM_CASING_WINDOW | Window casing | LF | PaintScope: PS_SURFACE_LF.TRIM_CASING_WINDOW | Always (when window casing in scope) |
| ITM_TRIM_CROWN | Crown molding | LF | PaintScope: PS_SURFACE_LF.TRIM_CROWN | When crown molding present |
| ITM_TRIM_CHAIR_RAIL | Chair rail | LF | PaintScope: PS_SURFACE_LF.TRIM_CHAIR_RAIL | When chair rail present |
| ITM_TRIM_WAINSCOT_RAIL | Wainscot rail | LF | PaintScope: PS_SURFACE_LF.TRIM_WAINSCOT_RAIL | When wainscot rail present |
| ITM_TRIM_SHADOW_BOX | Shadow box molding | LF | PaintScope: PS_SURFACE_LF.TRIM_SHADOW_BOX | When shadow box present |
| ITM_TRIM_PANEL_MOLD | Panel molding | LF | PaintScope: PS_SURFACE_LF.TRIM_PANEL_MOLD | When panel molding present |
| ITM_TRIM_PICTURE_RAIL | Picture rail | LF | PaintScope: PS_SURFACE_LF.TRIM_PICTURE_RAIL | When picture rail present |

> **No caulk or fill items.** Heavy caulking (ITM_TRIM_JOINTS_CAULK) and end grain filling (ITM_CASING_ENDS_FILL) belong to SF_TRIM_NC_PRIME. This spec's initial prep includes light touch-up caulk as an SOP task, not a standalone paintable item.

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_LF_BASEBOARD | PS_SURFACE_LF.TRIM_BASEBOARD | LF | Conditional | When baseboard in scope. 1 LF = 1 SF per PDCA standard. |
| IN_LF_DOOR_CASING | PS_SURFACE_LF.TRIM_CASING_DOOR | LF | Conditional | When door casing in scope |
| IN_LF_WINDOW_CASING | PS_SURFACE_LF.TRIM_CASING_WINDOW | LF | Conditional | When window casing in scope |
| IN_LF_CROWN | PS_SURFACE_LF.TRIM_CROWN | LF | Conditional | When crown molding present |
| IN_LF_CHAIR_RAIL | PS_SURFACE_LF.TRIM_CHAIR_RAIL | LF | Conditional | When chair rail present |
| IN_LF_WAINSCOT_RAIL | PS_SURFACE_LF.TRIM_WAINSCOT_RAIL | LF | Conditional | When wainscot rail present |
| IN_LF_SHADOW_BOX | PS_SURFACE_LF.TRIM_SHADOW_BOX | LF | Conditional | When shadow box present |
| IN_LF_PANEL_MOLD | PS_SURFACE_LF.TRIM_PANEL_MOLD | LF | Conditional | When panel molding present |
| IN_LF_PICTURE_RAIL | PS_SURFACE_LF.TRIM_PICTURE_RAIL | LF | Conditional | When picture rail present |
| IN_LF_TRIM_JOINTS | PS_EDGE_LF.TRIM_JOINTS | LF | Always | Joint LF for touch-up caulk in initial prep |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | Always | Perimeter floor protection for drip catching |
| IN_LF_PROTECT_WALL_ADJACENT | PS_PROTECT_LF.WALL_ADJACENT | LF | When spray | Wall masking at trim edge when spraying |
| IN_EA_FIXTURES | PS_PROTECT_EA.ASSET.FIXTURES | EA | When spray | Fixtures near spray zone |

### Key Verification

All keys exist in `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md`:
- `PS_SURFACE_LF.TRIM_BASEBOARD` - Section "Trim (LF-based)"
- `PS_SURFACE_LF.TRIM_CASING_DOOR` - Section "Trim (LF-based)"
- `PS_SURFACE_LF.TRIM_CASING_WINDOW` - Section "Trim (LF-based)"
- `PS_SURFACE_LF.TRIM_CROWN` - Section "Trim (LF-based)"
- `PS_SURFACE_LF.TRIM_CHAIR_RAIL` - Section "Trim (LF-based)"
- `PS_SURFACE_LF.TRIM_WAINSCOT_RAIL` - Section "Trim (LF-based)"
- `PS_SURFACE_LF.TRIM_SHADOW_BOX` - Section "Trim (LF-based)"
- `PS_SURFACE_LF.TRIM_PANEL_MOLD` - Section "Trim (LF-based)"
- `PS_SURFACE_LF.TRIM_PICTURE_RAIL` - Section "Trim (LF-based)"
- `PS_EDGE_LF.TRIM_JOINTS` - Section "Trim-specific edges"
- `PS_PROTECT_SF.FLOOR_PERIMETER` - Section "Floor Protection Keys (SF)"
- `PS_PROTECT_LF.WALL_ADJACENT` - Section "Surface-Adjacent Protection Keys (LF)"
- `PS_PROTECT_EA.ASSET.FIXTURES` - Section "Fixture/Asset Protection"

### Proposed New Keys
- None required — all keys exist in catalog.

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | PaintScope Key | Notes |
|---------|-----------|------------------|----------------|-------|
| floor_perimeter | always | edge_only | PS_PROTECT_SF.FLOOR_PERIMETER | Drop cloth runners along trim work area |
| wall_adjacent | when spray | light_mask | PS_PROTECT_LF.WALL_ADJACENT | Tape line + paper at wall-trim edge when spraying |
| fixture_covers | when spray | partial_cover | PS_PROTECT_EA.ASSET.FIXTURES | Cover outlets/switches near spray zone |

**Zone Source:** Protection_Zones_Reference.md v2.0

**Method-Dependent Behavior:**
- Brush application: `floor_perimeter` only
- Spray application: `floor_perimeter` + `wall_adjacent` + `fixture_covers`

---

## 7. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| trim_baseboard | wall_field | linear | different_finish |
| trim_baseboard | floor (not painted) | linear | not_in_scope |
| trim_casing_door | wall_field | linear | different_finish |
| trim_casing_door | door_frame | linear | same_finish (often) |
| trim_casing_window | wall_field | linear | different_finish |
| trim_casing_window | window_jamb | linear | same_finish (often) |
| trim_crown | ceiling_field | linear | different_finish |
| trim_crown | wall_field | linear | different_finish |
| trim_chair_rail | wall_field | linear | different_finish |
| trim_wainscot_rail | wall_field | linear | different_finish |
| trim_shadow_box | wall_field | linear | different_finish |
| trim_panel_mold | wall_field | linear | different_finish |
| trim_picture_rail | wall_field | linear | different_finish |

**Surface IDs verified against:** Surface_Vocabulary_Reference.md v1.0

---

## 8. State Declarations

### 8.1 Valid Input States

| Condition | Valid Input States | Notes |
|-----------|-------------------|-------|
| After SF_TRIM_NC_PRIME | SS_PRIMED_FIELD | Standard NC workflow — primer applied by separate prime spec |
| Factory primed (no prime spec) | SS_PRIMED_FACTORY | Direct to finish when factory primer is sufficient |

### 8.2 Output State

| Output State | Varies By | Notes |
|--------------|-----------|-------|
| SS_PAINTED | sheen dimension | Output sub-state matches selected sheen (SS_PAINTED_SATIN, SS_PAINTED_SEMIGLOSS, SS_PAINTED_GLOSS) |

### 8.3 Adjacent State Protection Rules

| Adjacent Surface | When State | Protection Level | Protection Zone | Notes |
|------------------|------------|------------------|-----------------|-------|
| wall_field | SS_BARE, SS_PRIMED_FIELD | none | — | Unfinished/primed walls need no protection during trim finish (typical NC sequence) |
| wall_field | SS_PAINTED_* | light_mask | wall_adjacent | Protect finished walls from drips (brush) or overspray (spray) |
| ceiling_field | SS_PAINTED_* | none (brush), light_mask (spray) | — | Crown adjacent to finished ceiling; brush unlikely to contact, spray overspray may |

---

## 9. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Typical after | SF_TRIM_NC_PRIME | Finish follows cured primer |
| Often same session | SF_DOOR_FRAME_NC_FINISH | Same crew, same material system, may share protection |
| Typical before | SF_DRYWALL_WALL_NC_FINISH | Trim package completes before wall finish in NC |
| Shares finish group with | SF_DOOR_FRAME_NC_FINISH (often) | Often same color/sheen for all trim elements |

---

## 10. Module Structure

Per Fine_Finish_Doctrine Section 5, this spec follows the standard Fine Finish module structure for finish work (Scenario B — primer handled by separate spec):

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_FF_SETUP | Setup | Floor protection, staging | binary |
| MOD_FF_INITIAL_PREP | Prep | Light sand primer, touch-up fill/caulk, dust cleanup | qt_scaled |
| MOD_FF_FINISH_COAT | Finish | Finish coat application | qt_scaled |
| MOD_FF_INTERSTAGE | Interstage | Inspect-sand-repair between coats | qt_scaled |
| MOD_FF_FINAL_INSPECT | Finish | Final quality check | qt_scaled |
| MOD_FF_CLEANUP | Cleanup | Protection removal | binary |

**Workflow sequence:**
```
SETUP → INITIAL_PREP → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → FINAL_INSPECT → CLEANUP
```

**Note:** This is a finish-only spec. No primer module — that belongs to SF_TRIM_NC_PRIME. Interstage runs AFTER each coat EXCEPT the final coat (per FFD Section 5.3).

---

## 11. Material Systems by Quality Tier

Per Fine_Finish_Doctrine Section 3:

| Quality Tier | System ID | Finish Type | Typical Products | Notes |
|--------------|-----------|-------------|------------------|-------|
| QT3 | SYS_FF_STANDARD_ACRYLIC | 100% acrylic enamel | ProClassic WB, Regal Select | Fast dry, good leveling |
| QT4 | SYS_FF_MODIFIED_URETHANE | Waterborne alkyd | BM Advance, SW Pro Industrial WB Alkyd | Superior flow, longer open time |
| QT5 | SYS_FF_PREMIUM | Premium urethane enamel | Emerald Urethane, Scuff-X | Maximum leveling, durability |

**Material selection is recommended by quality tier** (unlike primer, which is substrate-driven). Contractor retains discretion on actual product selection — system identifies proper application characteristics for each product category. Per Fine_Finish_Doctrine Section 2.1.

**Brush/roll compatibility:** All material systems are brush/roll compatible. Advance (waterborne alkyd) and Emerald Urethane (acrylic-urethane enamel) both dry fast — short working time demands proper first-pass technique (apply, tip once, walk away). Premium products sand more easily between coats, which is the key brush/roll advantage. See Fine_Finish_Doctrine Section 15.

---

## 12. References

### 12a. Domain Doctrines

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Fine Finish Doctrine | docs/Doctrine/Fine_Finish_Doctrine.md | Section 3 (Material Systems by QT), Section 4 (Sheen Selection), Section 5 (Module Structure), Section 7 (Interstage Process), Section 8 (Scrutiny by Tier), Section 9 (Defect Tolerance), Section 10 (Trim-specific), Section 15 (Brush and Roll) |
| Millwork NC Paint Doctrine | docs/Doctrine/Millwork_NC_Paint_Doctrine.md | Section 1.3 (LF to SF), Section 5 (Finish Coat Systems), Section 6 (QT Matrix), Section 7.1 (Production Rates), Section 7.2 (Complexity Modifiers) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Sheen/QT minimums (trim exception), sanding standards, task classification |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Mask level definitions, floor protection by method |

### 12b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | docs/Doctrine/Spec_Completeness_Doctrine.md | Mandatory completeness requirements |
| Modifier Registry | docs/Doctrine/Modifier_Registry.md | Canonical modifier IDs and values |
| Protection Zones Reference | docs/Reference/Protection_Zones_Reference.md | Valid zone IDs for protection tasks |
| Surface Vocabulary Reference | docs/Reference/Surface_Vocabulary_Reference.md | Valid surface IDs for adjacency |
| Site Condition Vocabulary | docs/Reference/Site_Condition_Vocabulary_Reference.md | Valid site condition IDs |
| Substrate State Reference | docs/Reference/Substrate_State_Reference.md | Valid substrate state IDs (SS_*) |
| PaintScope Quantity Key Catalog | docs/PaintScope/PaintScope_Quantity_Key_Catalog.md | Key verification |
| Spec Input to PaintScope Mapping | docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md | Key mapping validation |

---

## 13. Special Notes / Constraints

### Finish Material is Recommended by QT, Not Substrate-Driven
Unlike primer (substrate-driven per Fine_Finish_Doctrine 2.1), finish coat material selection is recommended by quality tier. QT3 = standard acrylic, QT4 = waterborne alkyd, QT5 = premium urethane enamel. These are recommendations — contractor has discretion on product selection. System identifies proper application characteristics for each product category.

### Sheen/QT Gate for Trim
Per Fine_Finish_Doctrine Section 4.1, sheen is constrained by quality tier:
- QT3: Satin or lower (semi-gloss requires upgrade to QT4)
- QT4: Any except gloss (gloss requires upgrade to QT5)
- QT5: Any including gloss

The wall sheen restriction (eggshell max at QT3) does NOT apply to trim per Quality_Tiers_and_Surface_Condition.md exception.

### Interstage is Universal
Per Fine_Finish_Doctrine Section 2.2, the inspect-repair-clean cycle runs between every coat at ALL quality tiers. What changes is scrutiny, tolerance, and pace.

### Between-Coat Sanding Discipline
Per Fine_Finish_Doctrine Section 15.3 and Section 8:
- QT3: Spot sand only (visible nibs, rough spots)
- QT4: Light full sand (220 grit, entire surface)
- QT5: Thorough full sand (220-320 grit, uniform scratch pattern)

### Rigid Block Sanding is Mandatory for Defect Removal
Per Fine_Finish_Doctrine Section 15.4.1: When sanding between coats to remove brush marks, orange peel, or texture, use a rigid sanding block. Flexible sponges conform to defects instead of removing them.

### Waterborne Application Philosophy
Per Fine_Finish_Doctrine Section 15.3.1: Apply. Tip once. Walk away. Do NOT overwork waterborne products. If brush marks or texture remain, sand them out between coats. Build the finish through multiple sanded coats.

### Application Quality is Not Tiered
Per Quality_Tiers_and_Surface_Condition.md: A properly painted surface — free of drips, sags, holidays, and lap marks — is the baseline expectation at EVERY quality tier. There is no tier at which application defects are acceptable.

### Production Rate by Profile Complexity
Per Millwork_NC_Paint_Doctrine Section 7.2:
- Simple (flat/square edge): 0.85x
- Standard (ogee/cove): 1.0x
- Complex (multi-piece/built-up): 1.25x
- Ornate (dentil/egg-and-dart): 1.40x

### Height Modifiers
Per Modifier_Registry.md:
- H1 Standard (7-8ft): 1.00
- H2 Tall (9-12ft): 1.30
- H3 High (13-17ft): 1.50

### NC Sequencing Context
In NC, the typical sequence is: Prime ceilings → Prime walls → Finish ceilings → Trim package (prime → finish → mask off) → Wall finish. Trim finish is part of the "trim package" that completes before wall finish. This spec pairs naturally with SF_DOOR_FRAME_NC_FINISH for shared protection setup.

### Prep Deduplication with Prime Spec
SF_TRIM_NC_PRIME performed the heavy fill/caulk/sand prep. This finish spec's initial prep is the lighter post-primer-cure prep: inspection, light sand for adhesion, touch-up caulk (cracked joints), dust cleanup. Do NOT duplicate the heavy prep from the prime spec.

### QT5 Gloss with Brush/Roll
Per Fine_Finish_Doctrine Section 15.10.3, QT5 gloss with brush/roll is listed as difficult. It IS achievable by a skilled painter but requires meticulous technique — 3+ coats with thorough between-coat sanding. Production rates should reflect this. Do NOT enforce spray — application method is configuration, not quality.

---

## 14. Site Condition Analysis

| Condition ID | Affected Task Types | Include Values | Exclude Values | Notes |
|--------------|---------------------|----------------|----------------|-------|
| floor_type | protect | finished, partial | subfloor | Floor protection required only when finished floors present |
| occupancy_state | protect | occupied_crew_handles, occupied_sensitive | vacant | Additional furniture/item protection when occupied |
| lead_status | prep, finish | tested_positive, unknown_pre1978 | tested_negative, not_applicable | Lead-safe practices when applicable (rare in NC) |

---

## 15. Acceptance Criteria

- [ ] Material system selection is quality-tier-driven (SYS_FF_STANDARD_ACRYLIC, SYS_FF_MODIFIED_URETHANE, SYS_FF_PREMIUM)
- [ ] Sheen/QT gate enforced: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only
- [ ] All 9 trim type items present with LF-based UOM per PDCA standard (1 LF = 1 SF)
- [ ] Interstage between-coat cycle present at ALL quality tiers
- [ ] Between-coat sanding discipline per tier: QT3=spot, QT4=full 220, QT5=full 220-320
- [ ] Profile complexity modifiers per Millwork_NC_Paint_Doctrine: 0.85, 1.0, 1.25, 1.40
- [ ] Height modifiers per Modifier_Registry: H1=1.0, H2=1.30, H3=1.50
- [ ] Protection zones: floor_perimeter always, wall_adjacent + fixture_covers for spray only
- [ ] State declarations: input = SS_PRIMED_FIELD or SS_PRIMED_FACTORY, output = SS_PAINTED
- [ ] Adjacent state protection: walls need no protection when unfinished, light_mask when finished
- [ ] Module structure follows Fine Finish finish-only pattern (no primer module)
- [ ] Initial prep is LIGHT (post-primer-cure touch-up), not duplicating prime spec's heavy prep
- [ ] All PaintScope keys verified against catalog
- [ ] No coat_count dimension — coat count derived from quality_tier per doctrine
- [ ] Application quality notes do not vary by tier (per mandatory doctrine)

---

## 16. Open Questions for Human Review

### Q1: Crown Molding Inclusion
Same question as SF_TRIM_NC_PRIME Q1. Crown is included here as ITM_TRIM_CROWN with trim_height dimension. If crown requires a separate spec, adjust both prime and finish specs together.

**Recommendation:** Include crown in this spec. Same decision as prime spec.

### Q2: Spray vs Brush Default — **RESOLVED**
~~Should the default application_method be `brush` or `spray`?~~

**Resolution:** Default is `brush`. Consistent with prime spec. Spray available for large volume NC production.

### Q3: QT5 Gloss with Brush/Roll — **RESOLVED**
~~Should the spec enforce spray for QT5 gloss?~~

**Resolution:** No. Do not enforce spray. QT5 gloss with brush/roll is achievable by a skilled painter. Leave as advisory — the spec allows the combination. Production rates should reflect higher coat count and meticulous sanding required.

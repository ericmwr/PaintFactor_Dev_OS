# Spec Brief: SF_STAIR_RISER_NC

**Status:** queued
**Priority:** P2 (#11 in catalog)
**Authored:** 2026-02-08
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_STAIR_RISER_NC` |
| Name | New Construction Stair Riser & Stringer Painting |
| Domain | interior |
| Context | NC |
| Description | Combined prime+paint spec for stair risers and stringers/skirtboards in new construction. Covers MDF, poplar, hardwood, and paint-grade plywood substrates. Primer is conditional on substrate_state (SS_BARE requires primer, SS_PRIMED_FACTORY skips to finish). Risers use EA counting sourced from the PaintScope Stairwell Geometry System riser count; stringers use LF counting derivable from the geometry system's rake_length. Stringer_type (open/closed) is a configuration dimension affecting production rates and accessible surface area. Combined spec (not split prime/paint) because stairway work is a self-contained zone with dedicated staging, shared tread protection, and same-session execution. Material systems follow Fine Finish Doctrine: primer is substrate-driven, finish is QT-driven. Stairwell access modifiers from the Stairwell Geometry System REPLACE standard height modifiers for stringer work in tall stairwells. |

---

## 2. Scope Boundaries

### Includes
- Riser face priming and painting (vertical surface between treads, not walked on)
- Stringer/skirtboard priming and painting (diagonal transition element between stairs and wall)
- Surface prep per substrate (dust removal, sanding, grain fill on MDF cut edges)
- Stringer-to-wall caulking (mandatory joint at wall transition)
- Riser-to-stringer caulk (joint between riser edge and stringer face)
- Fastener hole filling and sanding
- Tread protection setup and maintenance (mandatory from Day 1 through cleanup)
- Floor protection at landings
- Primer coat — conditional on substrate_state = SS_BARE
- Finish coat application (2 coats standard, 3+ at QT5 brush/roll per FFD 15.10.3)
- Interstage inspect/sand/repair between finish coats
- Final quality inspection
- Riser-to-tread edge masking (when treads are stained/clear or already finished)

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Stair treads (floor-rated coating, absolutely last per doctrine) | SF_STAIR_TREAD_NC (future) |
| Stair tread landings (floor-rated coating) | SF_STAIR_TREAD_NC (future) |
| Railing system (balusters, newels, handrails) | SF_STAIR_RAILING_NC (future) |
| Stairwell walls | SF_DRYWALL_WALL_NC_PRIME / SF_DRYWALL_WALL_NC_FINISH |
| Stairwell ceilings | SF_DRYWALL_CEILING_NC_PRIME / SF_DRYWALL_CEILING_NC_FINISH |
| Standard baseboard at landing level | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT |
| Window stool/apron in stairwell | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT |
| Decorative shoes at baluster base | SF_STAIR_RAILING_NC (installed after tread/baluster finishing) |
| Exterior stair components | Future exterior spec |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | QT2 not applicable — stairways are scrutinized, prominent surfaces per Stairway_Systems_Doctrine Section 10.1. Drives inspection scrutiny, sanding discipline, coat count. |
| application_method | brush, spray | brush | Brush is default for stair component detail work. Spray available for large-scope NC but requires extensive tread/wall masking. |
| sheen | satin, semi-gloss, gloss | semi-gloss | Semi-gloss default for risers (toe-kick scuff resistance per doctrine Section 7.2). Satin/semi-gloss for stringers. Sheen/QT gate: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only. |
| substrate | mdf, poplar, hardwood, paint_grade_plywood | mdf | Drives primer chemistry selection. MDF is most common NC riser/stringer material. Poplar requires stain-blocking primer. Hardwood requires tannin-blocking primer. |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | Drives primer requirement. SS_BARE = full primer coat required. SS_PRIMED_FACTORY = skip primer, lighter prep. |
| stringer_type | open, closed | closed | Open stringers have notched profile visible from exposed side — more surface area, harder to paint, higher production rate multiplier. Closed stringers are flat boards against wall (like baseboard). |

> **No coat_count dimension.** Coat count derived from quality_tier per doctrine:
> - QT3 = 2 finish coats
> - QT4 = 2 finish coats
> - QT5 = 2-3 finish coats (3+ typical for brush/roll per FFD 15.10.3)

> **Sheen/QT gate for trim surfaces (Fine Finish Doctrine Section 4.1):**
> - QT3: Satin or lower
> - QT4: Any except gloss
> - QT5: Any including gloss

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_STAIR_RISER | Stair riser face | EA | PaintScope: PS_SURFACE_EA.STAIR_RISER. Count of individual risers. Sourced from PaintScope Stairwell Geometry System riser count (PS_META.STAIRWELL.RISERS). | Always |
| ITM_STAIR_STRINGER | Stringer / skirtboard | LF | PaintScope: PS_SURFACE_LF.STAIR_STRINGER. Linear feet of stringer runs. Derivable from geometry system's rake_length (PS_STAIRWELL.RAKE_LENGTH_FT). | Always |
| ITM_STAIR_STRINGER_CAULK | Stringer-to-wall caulk joint | LF | PaintScope: PS_EDGE_LF.STAIR_STRINGER_TO_WALL. Runs length of stringer where it meets wall (closed stringers only). | When stringer_type = closed |
| ITM_STAIR_RISER_CAULK | Riser-to-stringer caulk joint | LF | Derived: 2 joints per riser (left + right stringer edge) × riser width. | Always |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_EA_STAIR_RISER | PS_SURFACE_EA.STAIR_RISER | EA | Always | Count of individual risers to paint. Sourced from geometry system riser count. Standard flight = 12-16 risers. |
| IN_LF_STAIR_STRINGER | PS_SURFACE_LF.STAIR_STRINGER | LF | Always | Total LF of stringer/skirtboard runs. Both sides of enclosed stair; wall side only for open stair. Derivable from rake_length × number of stringer runs. |
| IN_LF_STAIR_STRINGER_CAULK | PS_EDGE_LF.STAIR_STRINGER_TO_WALL | LF | When closed | Stringer-to-wall junction caulk. Same LF as stringer where it meets wall. |
| IN_SF_STAIR_TREAD_PROTECT | PS_PROTECT_SF.ASSET.STAIR_TREADS | SF | Always | Tread protection area — sourced from PaintScope Asset Catalog. Tread count = risers - 1 (can be derived from riser count). |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | Always | Landing floor protection |
| IN_LF_PROTECT_WALL_ADJACENT | PS_PROTECT_LF.WALL_ADJACENT | LF | When spray | Wall masking along stringer edge when spraying |

### Geometry System Integration

The PaintScope Stairwell Geometry System (`PaintScope_Stairwell_Geometry_System.md`) provides spatial context for this spec:

| Geometry System Key | Usage in This Spec |
|--------------------|--------------------|
| `PS_META.STAIRWELL.RISERS` | Source for riser painting count (IN_EA_STAIR_RISER) |
| `PS_STAIRWELL.RAKE_LENGTH_FT` | Derivation input for stringer LF (stringer run ≈ rake_length per side) |
| `PS_STAIRWELL.MAX_WORKING_HEIGHT_FT` | Access modifier selection for upper stringer portions |
| `PS_META.STAIRWELL.STYLE` | Affects stringer configuration (open stairwells may have one-sided stringers) |
| `PS_META.STAIRWELL.WIDTH_FT` | Riser width = stairwell width (determines riser surface area per unit) |

### Key Verification

**Existing keys (verified in catalog):**
- `PS_PROTECT_SF.FLOOR_PERIMETER` - Section "Floor Protection Keys (SF)"
- `PS_PROTECT_LF.WALL_ADJACENT` - Section "Surface-Adjacent Protection Keys (LF)"
- `PS_PROTECT_SF.ASSET.STAIR_TREADS` - PaintScope Asset Catalog Section 8 (Stairs & Railings)

### Proposed New Keys

| Key | UOM | Description | Justification |
|-----|-----|-------------|---------------|
| `PS_SURFACE_EA.STAIR_RISER` | EA | Count of individual stair risers to paint | Component spec needs its own surface key per PaintScope rules, even though value may equal PS_META.STAIRWELL.RISERS |
| `PS_SURFACE_LF.STAIR_STRINGER` | LF | Total LF of stringer/skirtboard runs to paint | No existing key for painted stringer measurement (PS_SURFACE_SF.STAIRWELL_WALL_STRINGER covers the WALL behind the stringer, not the stringer board itself) |
| `PS_EDGE_LF.STAIR_STRINGER_TO_WALL` | LF | Stringer-to-wall caulk junction LF | No existing key for this edge relationship |

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | PaintScope Key | Notes |
|---------|-----------|------------------|----------------|-------|
| stair_tread_covers | always | heavy_cover | PS_PROTECT_SF.ASSET.STAIR_TREADS | Mandatory from Day 1. Ram Board Stair Armor or equivalent. Per doctrine Section 6.2: "Tread protection must begin before any painting starts and remain in place until the very final phase." |
| floor_perimeter | always | edge_only | PS_PROTECT_SF.FLOOR_PERIMETER | Drop cloth runners at landing areas |
| wall_adjacent | when spray | light_mask | PS_PROTECT_LF.WALL_ADJACENT | Wall masking along stringer top edge when spraying |

**Zone Source:** Protection_Zones_Reference.md v2.0 + proposed `stair_tread_covers` zone

**Proposed New Zone:**
- `stair_tread_covers` — Stair tread surface protection mandatory throughout all painting phases. Typical materials: Ram Board Stair Armor (covers riser face bottom edge, tread surface, and bullnose in one piece with Spill Guard and Tread-Trac grip strips), rosin paper + masonite (premium), or Trimaco Stay Put Canvas Plus. Standard plastic sheeting on treads is an EXTREME FALL HAZARD per doctrine Section 6.2 and must NEVER be used. All tread protection taped with low-tack Safe-Release tape.

**Method-Dependent Behavior:**
- Brush application: `stair_tread_covers` + `floor_perimeter`
- Spray application: `stair_tread_covers` + `floor_perimeter` + `wall_adjacent`

---

## 7. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| stair_riser | stair_tread (above) | linear | different_finish or not_in_scope (treads may be stain-grade) |
| stair_riser | stair_tread (below) | linear | different_finish or not_in_scope |
| stair_riser | stair_stringer | linear | same_finish (typically same color/sheen) |
| stair_stringer | wall_field | linear | different_finish (standard) or same_finish (color drenching per doctrine 7.3) |
| stair_stringer | trim_baseboard | linear | same_finish (stringer connects to baseboard at top/bottom of flight) |
| stair_stringer | stair_riser | linear | same_finish (typically) |

### Proposed New Surface IDs

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `stair_riser` | Vertical surface between treads (not walked on, trim enamel system) | stair_tread, stair_stringer |
| `stair_stringer` | Diagonal board running alongside stair (skirtboard), transition between stair and wall | wall_field, stair_riser, trim_baseboard, stair_tread |
| `stair_tread` | Horizontal walking surface of stair (protection target, not painted in this spec) | stair_riser, stair_stringer |

**Surface IDs verified against:** Surface_Vocabulary_Reference.md v1.0 — stair surfaces are NEW, not yet in vocabulary.

---

## 8. State Declarations

### 8.1 Valid Input States

| Substrate State Config | Valid Input States | Notes |
|------------------------|-------------------|-------|
| SS_BARE | SS_BARE | Uncoated riser/stringer requiring full primer |
| SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | Standard NC — trim arrives pre-primed from mill |

### 8.2 Output State

| Output State | Varies By | Notes |
|--------------|-----------|-------|
| SS_PAINTED | sheen dimension | Output sub-state: SS_PAINTED_SATIN, SS_PAINTED_SEMIGLOSS, SS_PAINTED_GLOSS |

### 8.3 Adjacent State Protection Rules

| Adjacent Surface | When State | Protection Level | Protection Zone | Notes |
|------------------|------------|------------------|-----------------|-------|
| wall_field | SS_BARE, SS_PRIMED_FIELD | none | — | Unfinished walls need no protection during stair trim work |
| wall_field | SS_PAINTED_* | light_mask | wall_adjacent | Protect finished walls from drips or overspray |
| stair_tread | any | heavy_cover | stair_tread_covers | Treads ALWAYS protected regardless of state — painted last or may be stain-grade |

---

## 9. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Typical before | SF_STAIR_TREAD_NC (future) | Treads are ALWAYS the final component per doctrine Section 3.2 |
| Often same session | SF_STAIR_RAILING_NC (future) | Same staging, shared tread protection, same crew |
| Shares finish group with | SF_TRIM_NC_PAINT | Risers/stringers often same color/sheen as room baseboard and trim |
| Typical after | SF_DRYWALL_WALL_NC_PRIME, SF_DRYWALL_CEILING_NC_PRIME | Stairwell walls primed before stair trim work |
| Sequencing within spec | Stringers before risers | Per canonical sequence: stringers (#4), risers (#8) per doctrine Section 3.2 |

---

## 10. Module Structure

Combined prime+paint spec following Fine Finish module pattern:

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_FF_SETUP | Setup | Tread protection, landing floor protection, staging/access setup | binary |
| MOD_FF_INITIAL_PREP | Prep | Fill holes, caulk joints (stringer-to-wall, riser-to-stringer), sand per substrate, MDF edge seal | qt_scaled |
| MOD_FF_PRIME | Prime | Primer coat(s) per substrate — conditional on substrate_state = SS_BARE | qt_scaled |
| MOD_FF_FINISH_COAT | Finish | Finish coat application (stringers first, then risers per canonical sequence) | qt_scaled |
| MOD_FF_INTERSTAGE | Interstage | Inspect/sand/repair between finish coats | qt_scaled |
| MOD_FF_FINAL_INSPECT | Finish | Final quality check | qt_scaled |
| MOD_FF_CLEANUP | Cleanup | Protection removal (tread covers remain if railing/tread work follows) | binary |

**Workflow sequence:**
```
SETUP → INITIAL_PREP → PRIME (conditional) → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → FINAL_INSPECT → CLEANUP
```

**Note:** Primer module is CONDITIONAL — only runs when substrate_state = SS_BARE. Factory-primed substrates skip from prep to finish.

---

## 11. Material Systems

### Primer (Substrate-Driven)

Per Stairway_Systems_Doctrine Section 4 and Millwork_NC_Paint_Doctrine Section 4:

| Substrate | Primer Type | Purpose | Example Products |
|-----------|-------------|---------|------------------|
| bare_mdf (cut/routed edges) | Solvent-based sealer | Seal edges, prevent fiber raise | Zinsser BIN Shellac, KILZ Original |
| bare_mdf (factory faces) | High-build latex | Build film, level surface | BM Enamel Underbody 217, ProClassic Undercoater |
| bare_poplar | Stain-blocking primer | Block green mineral streaks | BM Prime Lock Plus, BM Fresh Start oil-based |
| bare_hardwood | Tannin-blocking primer | Block tannin bleed-through | BM Prime Lock Plus, SW Extreme Block |
| bare_paint_grade_plywood | Standard primer-sealer | Seal, tooth | Zinsser Bulls Eye 1-2-3, KILZ 2 |
| factory_primed | skip (or optional additional coat) | Factory primer is transit protection | — |

### Finish (QT-Driven)

Per Fine_Finish_Doctrine Section 3:

| Quality Tier | System ID | Finish Type | Typical Products |
|--------------|-----------|-------------|------------------|
| QT3 | SYS_FF_STANDARD_ACRYLIC | 100% acrylic enamel | ProClassic WB, Regal Select |
| QT4 | SYS_FF_MODIFIED_URETHANE | Waterborne alkyd | BM Advance, SW Emerald Urethane |
| QT5 | SYS_FF_PREMIUM | Premium urethane enamel | Emerald Urethane, Scuff-X |

**MDF Edge Sealing Note:** MDF cut edges MUST receive solvent-based sealer before any latex product. Water-based primers cause irreversible fiber swelling on MDF edges. Two-step prime process for bare MDF: (1) edge seal with shellac/oil-based, (2) face prime with latex. Per Millwork_NC_Paint_Doctrine Section 2 and Stairway_Systems_Doctrine Section 4.3.

**Poplar Stain-Blocking Note:** Poplar REQUIRES stain-blocking primer. Green mineral streaks bleed through latex without stain-blocking. This is NOT optional. Per Stairway_Systems_Doctrine Section 4.1.

---

## 12. References

### 12a. Domain Doctrines

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Stairway Systems Doctrine | docs/Doctrine/Stairway_Systems_Doctrine.md | Section 3 (Sequencing — canonical order, stringers #4, risers #8), Section 4 (Substrates/Primers), Section 6 (Protection — tread covers), Section 7 (Sheen Architecture), Section 8 (Coating Systems), Section 9 (Production Benchmarks), Section 10 (Quality Tiers — QT2 not applicable) |
| PaintScope Stairwell Geometry System | docs/Doctrine/PaintScope_Stairwell_Geometry_System.md | Riser count as geometry input (PS_META.STAIRWELL.RISERS), rake_length for stringer LF derivation, max_working_height for access, stairwell_style for configuration, stairwell_width for riser surface area. Stairwell access modifiers (Section: Stairwell Access Modifiers). |
| Fine Finish Doctrine | docs/Doctrine/Fine_Finish_Doctrine.md | Section 2 (Core Principles — primer is substrate-driven), Section 3 (Material Systems by QT), Section 4 (Sheen/QT gate), Section 5 (Module Structure), Section 7 (Interstage Process), Section 15 (Brush and Roll) |
| Millwork NC Paint Doctrine | docs/Doctrine/Millwork_NC_Paint_Doctrine.md | Section 2 (Substrate Classification — MDF, Poplar), Section 4 (Primer Systems), Section 7.1 (Production Rates), Section 7.2 (Complexity Modifiers) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Sheen/QT minimums, sanding standards, task classification |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Mask level definitions, floor protection |

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
| PaintScope Asset Catalog | docs/PaintScope/PaintScope_Asset_Catalog.md | Section 8: Stairs & Railings — PS_PROTECT_SF.ASSET.STAIR_TREADS |
| Spec Input to PaintScope Mapping | docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md | Key mapping validation |

---

## 13. Special Notes / Constraints

### Combined Prime+Paint Spec
Primer is conditional on substrate_state, not a separate spec. This matches the window spec pattern (SF_WINDOW_INT_NC). Rationale: stairway work is a self-contained zone with dedicated staging, shared tread protection, and same-session execution. Splitting into separate prime/paint specs would double the staging/protection setup for no benefit.

### Geometry System Integration
This spec operates within the spatial context established by the PaintScope Stairwell Geometry System. Riser count is sourced from `PS_META.STAIRWELL.RISERS`. Stringer LF is derivable from the geometry system's `PS_STAIRWELL.RAKE_LENGTH_FT` (stringer run ≈ rake_length per side). The geometry system covers drywall surfaces only — this spec handles the component surfaces (risers, stringers) that the geometry system scopes out.

### Height and Access Modifiers
For risers, use H1 (always accessible from adjacent treads). For stringers, use the stairwell access modifiers from PaintScope_Stairwell_Geometry_System.md based on max_working_height at the top of the stringer run. Stairwell access modifiers range from 1.3 (step ladder, ≤12 ft) to 2.8 (lift, 28+ ft). Note: for stairwell drywall/ceiling work (separate specs), stairwell access modifiers ADD TO standard height modifiers — but for stair component work (this spec), the access modifier alone applies to stringers.

### Canonical Painting Sequence
Per Stairway_Systems_Doctrine Section 3.2: Stringers (#4 in sequence) MUST be painted before risers (#8). The spec's internal task ordering must respect this. Treads (#9) are ALWAYS last and belong to a separate spec.

### Tread Protection is Non-Negotiable
Per doctrine Section 6.2: "Tread protection must begin before any painting starts and remain in place until the very final phase." Ram Board Stair Armor is the industry standard. Standard plastic sheeting on treads is an EXTREME FALL HAZARD per doctrine Section 6.2. Tread protection setup is the FIRST task; tread protection removal is the LAST task (or deferred if railing/tread work follows).

### Stringer-to-Wall Caulking is Always Required (Closed Stringers)
The stringer-to-wall junction is a mandatory caulk point for closed stringers. This joint is highly visible and any gap is noticeable due to the stairway's prominence. Open stringers do not have a wall junction on the exposed side.

### MDF Edge Sealing (Same as Trim Spec)
Bare MDF edges MUST receive solvent-based sealer before any latex product. Two-step prime process for bare MDF. Per Millwork_NC_Paint_Doctrine Section 2 and Stairway_Systems_Doctrine Section 4.3.

### Poplar Stain-Blocking is Mandatory
Poplar REQUIRES stain-blocking primer to prevent green mineral streak bleed-through. Not optional for bare poplar substrates.

### Open vs Closed Stringers
Open stringers have a notched profile visible from the exposed side, following the tread/riser pattern. They have significantly more surface area and complex geometry compared to closed (flat board against wall) stringers. Production rate for open stringers should be 1.3-1.5x that of closed stringers. Open stringers have stringer-to-wall caulk only on the wall side (if present); the exposed side has no wall junction.

### Skirtboard Finish Assignment
The skirtboard/stringer may be color-matched to the wall ("color drenching" — modern aesthetic) or matched to the room trim (classical). Either way, it receives trim-grade paint (enamel), NOT wall paint. This is a finish group decision, not a process difference. Per doctrine Section 7.3.

### Riser Width = Stairwell Width
Per PaintScope Stairwell Geometry System, riser width equals the stairwell width (`PS_META.STAIRWELL.WIDTH_FT`). This determines riser surface area per unit: riser_SF_each = stairwell_width × riser_height (typically 3.5 ft × 0.625 ft ≈ 2.2 SF per riser).

### Production Rate References
Per Stairway_Systems_Doctrine Section 9.2: risers are flat panel surfaces with production rates similar to trim. Stringers are linear trim similar to baseboard. Open stringers add complexity for notched profile. Overall stairway projects: 15-40% of time consumed by access staging per doctrine Section 5.6.

### Primer Selection is Substrate-Driven, NOT QT-Driven
Per Fine_Finish_Doctrine Section 2.1: primer requirement is driven by substrate condition and system specification, not quality tier.

---

## 14. Site Condition Analysis

| Condition ID | Affected Task Types | Include Values | Exclude Values | Notes |
|--------------|---------------------|----------------|----------------|-------|
| floor_type | protect | finished, partial | subfloor | Landing floor protection required only when finished floors present |
| occupancy_state | protect | occupied_crew_handles, occupied_sensitive | vacant | Additional protection when occupied |
| lead_status | prep, prime | tested_positive, unknown_pre1978 | tested_negative, not_applicable | Lead-safe practices when applicable (rare in NC) |

---

## 15. Acceptance Criteria

- [ ] Combined prime+paint with primer conditional on substrate_state (SS_BARE = primer, SS_PRIMED_FACTORY = skip)
- [ ] EA counting for risers (ITM_STAIR_RISER), LF counting for stringers (ITM_STAIR_STRINGER)
- [ ] Treads excluded — routed to future SF_STAIR_TREAD_NC
- [ ] Railing system excluded — routed to future SF_STAIR_RAILING_NC
- [ ] Stairwell walls/ceilings excluded — routed to drywall specs
- [ ] quality_tier minimum QT3 (QT2 not applicable per doctrine 10.1)
- [ ] Sheen/QT gate enforced: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only
- [ ] substrate dimension with all four values (mdf, poplar, hardwood, paint_grade_plywood)
- [ ] substrate_state drives primer requirement
- [ ] stringer_type (open/closed) present as config dimension with production rate impact
- [ ] Substrate-specific primer selection per Stairway_Systems_Doctrine Section 4 and Millwork doctrine
- [ ] MDF edge sealing task (solvent-based) for bare MDF substrates
- [ ] Poplar stain-blocking primer mandatory (not optional)
- [ ] QT-driven finish material system per Fine Finish Doctrine Section 3
- [ ] Tread protection (stair_tread_covers zone) mandatory from setup to cleanup
- [ ] Stringer-to-wall caulking included as mandatory prep task (closed stringers)
- [ ] Riser-to-stringer caulking included as mandatory prep task
- [ ] Internal sequencing: stringers before risers per canonical sequence (#4, #8)
- [ ] Module structure follows Fine Finish combined prime+paint pattern
- [ ] Interstage between-coat cycle present at ALL quality tiers
- [ ] Between-coat sanding discipline per tier: QT3=spot, QT4=full 220, QT5=full 220-320
- [ ] Geometry system integration: riser count from PS_META.STAIRWELL.RISERS, stringer LF from rake_length
- [ ] Risers use H1 (accessible from treads); stringers use stairwell access modifiers from geometry system
- [ ] All proposed PaintScope keys documented (3 new keys)
- [ ] All proposed Surface IDs documented (3 new IDs: stair_riser, stair_stringer, stair_tread)
- [ ] All proposed Protection Zone IDs documented (1 new zone: stair_tread_covers)
- [ ] All existing PaintScope keys verified against catalog
- [ ] State declarations: input = SS_BARE or SS_PRIMED_FACTORY, output = SS_PAINTED

---

## 16. Resolved Questions

### Q1: Landing Baseboard Routing — **RESOLVED**
~~Should baseboard at the landing level be included in this spec or routed to SF_TRIM_NC_PAINT?~~

**Resolution:** Route to SF_TRIM_NC_PAINT. Landing baseboard is standard baseboard — no scope overlap.

### Q2: Stringer-to-Baseboard Junction Caulking — **RESOLVED**
~~Should caulking at the stringer-to-baseboard junction be included here or in the trim spec?~~

**Resolution:** Include in this spec. Painter doing stringer work is already on-site with caulk. Natural extension of stringer prep.

### Q3: Riser Sizing — **RESOLVED**
~~Should risers use Size Bucket Method or simple EA counting?~~

**Resolution:** Simple EA counting. Riser width = stairwell width (entered into PaintScope via PS_META.STAIRWELL.WIDTH_FT). No size buckets needed — risers are uniform within a flight. Riser surface area derivable: riser_SF = stairwell_width × riser_height.

### Q4: Height/Access Modifiers — **RESOLVED**
~~Should stairwell access modifiers replace or stack with standard height modifiers?~~

**Resolution:** For risers, use H1 (always accessible from treads). For stringers, use stairwell access modifiers from geometry system. For stairwell drywall/ceiling work (separate specs), stairwell access modifiers ADD TO standard height modifiers — the geometry system doc needs to be corrected on this point (it currently says "replace").

### Q5: Open Stairwell Flag — **RESOLVED**
~~Should this spec include an open_stairwell flag?~~

**Resolution:** No. Estimate engine handles open stairwell configuration. PaintScope stringer LF input reflects actual painted stringer runs regardless of configuration.

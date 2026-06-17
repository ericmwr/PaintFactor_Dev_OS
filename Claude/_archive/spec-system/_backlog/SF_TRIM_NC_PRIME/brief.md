# Spec Brief: SF_TRIM_NC_PRIME

**Status:** queued
**Priority:** P1 (#8 in catalog)
**Authored:** 2026-02-04
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_TRIM_NC_PRIME` |
| Name | New Construction Interior Trim Priming |
| Domain | interior |
| Context | NC |
| Description | Primer application for interior trim in new construction. Covers all substrate scenarios: factory-primed trim (optional additional primer), bare wood (MDF, FJP, solid wood requiring sealing and/or stain-blocking), and glossy/oil-based existing finishes requiring bonding primer. Uses LF as primary UOM per PDCA standard (1 LF trim = 1 SF). Primer requirement is configuration-driven based on substrate_condition dimension. This spec was split from SF_TRIM_NC_PAINT because priming has different material systems per substrate type and different production rates. |

---

## 2. Scope Boundaries

### Includes
- Factory-primed trim scuff sand and optional additional primer coat
- Bare MDF priming (solvent-based edge sealer + latex face primer)
- Bare FJP (Finger-Joint Pine) priming (stain-blocking primer required)
- Bare solid wood priming (standard primer-sealer)
- Bonding primer application for glossy/oil-based substrates
- Surface preparation (dust removal, light sanding per substrate)
- Fastener hole filling and sanding
- Joint caulking (trim-to-wall, trim-to-trim miters)
- Knot/tannin spot priming (shellac-based for stain blocking)
- Floor protection setup/teardown

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Trim finish coats (after primer) | SF_TRIM_NC_PAINT |
| Wall priming | SF_DRYWALL_WALL_NC_PRIME |
| Ceiling priming | SF_DRYWALL_CEILING_NC_PRIME |
| Door slab priming | SF_DOOR_SLAB_INT_NC |
| Door frame priming | SF_DOOR_FRAME_NC_FINISH |
| Window trim priming | SF_WINDOW_INT_NC (future) |
| Crown molding (separate profile complexity) | SF_CROWN_NC_PRIME (future, or include via profile_complexity) |
| Cabinet priming | SF_CABINET_NC_PAINT |
| Stair trim | SF_STAIR_RAILING_NC |
| Exterior trim | SF_TRIM_EXT_* (future) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| substrate_condition | factory_primed, bare_mdf, bare_fjp, bare_solid_wood, glossy_existing, oil_based_existing | factory_primed | Drives primer selection and prep intensity. Factory primed is NC default. |
| primer_on_factory_primed | true, false | false | User choice to add additional primer coat on factory-primed trim. Factory primer is transit protection, often thin. |
| quality_tier | QT3, QT4, QT5 | QT3 | Drives inspection/repair intensity and scrutiny. QT3 = quick glance at 6 ft, QT4 = systematic scan at 3 ft, QT5 = lighted critical at arm's length. Per Fine_Finish_Doctrine. |
| application_method | brush, spray | brush | Brush is NC production standard for trim. Spray requires wall protection but faster for large scope. Per Fine_Finish_Doctrine Section 15, brush/roll is appropriate for occupied or small scope. |
| profile_complexity | simple, standard, complex, ornate | standard | Affects production rates. Simple (flat/square edge) = 0.85x, Standard (ogee/cove) = 1.0x, Complex (multi-piece/built-up) = 1.25x, Ornate (dentil/egg-and-dart) = 1.40x. Per Millwork_NC_Paint_Doctrine Section 7.2. |
| trim_height | standard, tall, high | standard | Height of trim work. Standard (7-8ft) = H1, Tall (9-12ft) = H2, High (13ft+) = H3. Primarily affects crown molding and high casing work. |

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
| ITM_TRIM_JOINTS_CAULK | Trim joint caulking | LF | PaintScope: PS_EDGE_LF.TRIM_JOINTS | Always — miter/cope/scarf joints |
| ITM_CASING_ENDS_FILL | Casing end grain fill | EA | PaintScope: PS_META.EA.CASING_END_COUNT | When bare wood (not factory primed) |

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
| IN_LF_TRIM_JOINTS | PS_EDGE_LF.TRIM_JOINTS | LF | Always | Joint LF for caulking. Derived: ~1 joint per 8-12 LF trim. |
| IN_EA_CASING_ENDS | PS_META.EA.CASING_END_COUNT | EA | When bare wood | End grain exposures for grain fill. 2 per door, 4 per window typically. |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | Always | Perimeter floor protection for drip catching |
| IN_LF_PROTECT_WALL_ADJACENT | PS_PROTECT_LF.WALL_ADJACENT | LF | When spray | Wall masking at trim edge when spraying |

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
- `PS_META.EA.CASING_END_COUNT` - Section "Trim (LF-based)"
- `PS_PROTECT_SF.FLOOR_PERIMETER` - Section "Floor Protection Keys (SF)"
- `PS_PROTECT_LF.WALL_ADJACENT` - Section "Surface-Adjacent Protection Keys (LF)"

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

| Substrate Condition Config | Valid Input States | Notes |
|---------------------------|-------------------|-------|
| factory_primed | SS_PRIMED_FACTORY | Standard NC trim arrives pre-primed |
| bare_mdf | SS_BARE | Uncoated MDF requires edge seal + face prime |
| bare_fjp | SS_BARE | Uncoated FJP requires stain-blocking primer |
| bare_solid_wood | SS_BARE | Uncoated wood requires primer-sealer |
| glossy_existing | SS_PAINTED_SEMIGLOSS, SS_PAINTED_GLOSS | Requires bonding primer |
| oil_based_existing | SS_PAINTED_ALKYD | Requires adhesion test + bonding primer |

### 8.2 Output State

| Output State | Varies By | Notes |
|--------------|-----------|-------|
| SS_PRIMED_FIELD | — | All substrate scenarios output field-primed state |

### 8.3 Adjacent State Protection Rules

| Adjacent Surface | When State | Protection Level | Protection Zone | Notes |
|------------------|------------|------------------|-----------------|-------|
| wall_field | SS_BARE, SS_PRIMED | none | — | Unfinished walls need no protection during trim prime |
| wall_field | SS_PAINTED_* | light_mask | trim_edges | Protect finished walls from primer drips (brush) or overspray (spray) |

---

## 9. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Typical before | SF_TRIM_NC_PAINT | Prime before finish coats |
| Often same session | SF_DOOR_FRAME_NC_FINISH | Same crew, same material system, may share protection |
| Typical after | Wall prime (SF_DRYWALL_WALL_NC_PRIME) | Trim installed after wall prime |
| Shares finish group with | SF_DOOR_FRAME_NC_FINISH (sometimes) | Often same color/sheen for all trim elements |

---

## 10. Module Structure

Per Fine_Finish_Doctrine Section 5, this spec follows the standard Fine Finish module structure:

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_FF_SETUP | Setup | Floor protection, staging | binary |
| MOD_FF_INITIAL_PREP | Prep | Fill, caulk, sand before prime | qt_scaled |
| MOD_FF_PRIME | Prime | Primer coat application | qt_scaled |
| MOD_FF_CLEANUP | Cleanup | Protection removal | binary |

**Note:** This is a prime-only spec. No interstage or finish modules — those belong to SF_TRIM_NC_PAINT.

---

## 11. Material Systems by Substrate

Per Millwork_NC_Paint_Doctrine Section 4 and Fine_Finish_Doctrine Section 3.6:

| Substrate Condition | Primer Type | Purpose | Example Products |
|--------------------|-------------|---------|------------------|
| factory_primed + primer_on_factory_primed=true | High-build latex | Build film thickness | ProClassic Undercoater |
| bare_mdf (edges) | Solvent-based sealer | Seal edges, prevent fiber raise | Zinsser BIN Shellac, KILZ Original |
| bare_mdf (faces) | High-build latex | Build film, level surface | ProClassic Undercoater |
| bare_fjp | Stain-blocking primer | Block resin bleed | KILZ 3, Zinsser BIN, Cover Stain |
| bare_solid_wood | Standard primer-sealer | Seal, tooth, block stains | Zinsser Bulls Eye 1-2-3, KILZ 2 |
| glossy_existing | Bonding primer | Adhesion to glossy surface | Zinsser BIN, STIX |
| oil_based_existing | Bonding primer | Adhesion test + bonding | Zinsser BIN, STIX, XIM UMA |

**MDF Edge Special Note:** MDF edges MUST receive solvent-based sealer (shellac or oil-based) before latex primer. Water-based primers cause fiber raise on MDF edges. This is a separate task from face priming.

**FJP Stain-Blocking Note:** FJP REQUIRES stain-blocking primer. This is NOT optional. Without stain-blocking, resin bleed-through will appear as amber/yellow discoloration within weeks/months. Shellac-based (BIN) or high-quality acrylic stain-blocking (KILZ 3) required.

---

## 12. References

### 12a. Domain Doctrines

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Fine Finish Doctrine | docs/Doctrine/Fine_Finish_Doctrine.md | Section 2 (Core Principles: primer is configuration), Section 3 (Material Systems), Section 5 (Module Structure: MOD_FF_PRIME), Section 6 (Initial Prep Phase), Section 10 (Substrate-Specific: Trim), Section 15 (Brush and Roll Method) |
| Millwork NC Paint Doctrine | docs/Doctrine/Millwork_NC_Paint_Doctrine.md | Section 1.3 (LF to SF Conversion: PDCA 1 LF = 1 SF), Section 2 (Substrate Classification: MDF, FJP), Section 3 (Surface Preparation Matrix), Section 4 (Primer Systems), Section 7.2 (Complexity Modifiers) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Task classification (binary vs qt_scaled), inspection discipline by QT, application quality not tiered |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Mask level definitions (light_mask, heavy_mask), floor protection by method |

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

### Substrate-Driven Primer Selection
Primer type is determined by substrate_condition dimension, NOT quality tier. Per Fine_Finish_Doctrine Section 2.1: "Primer requirement is driven by substrate condition and system specification, not quality tier." This is mandatory doctrine.

### MDF Edge Sealer Requirement
MDF edges MUST receive solvent-based sealer before any latex products. This creates a two-step prime process for bare MDF: (1) edge seal with shellac/oil-based, (2) face prime with latex. This is non-negotiable — water-based primers cause irreversible fiber raise on MDF edges.

### FJP Stain-Blocking is Mandatory
FJP (Finger-Joint Pine) MUST receive stain-blocking primer. Without stain-blocking, resin bleed will occur. This is not optional for bare FJP.

### Factory Primer Limitations
Factory primer on pre-primed trim is transit protection, not finish-ready prep. Per Millwork_NC_Paint_Doctrine Section 2.3: factory primer is often thin and may have handling damage. User configuration `primer_on_factory_primed` allows optional additional primer coat.

### Production Rate by Profile Complexity
Per Millwork_NC_Paint_Doctrine Section 7.2:
- Simple profile (flat/square edge): 0.85x base rate
- Standard profile (ogee/cove): 1.0x (baseline)
- Complex profile (multi-piece/built-up): 1.25x
- Ornate profile (dentil/egg-and-dart): 1.40x

### Height Modifiers for Trim
Height modifiers apply when trim work is elevated (crown molding, high door casings):
- H1 Standard (7-8ft): 1.00
- H2 Tall (9-12ft): 1.30
- H3 High (13-17ft): 1.50

### Application Method Selection
Per Fine_Finish_Doctrine Section 15.1.1:
- **Brush is appropriate:** Small scope, occupied spaces, punch list work
- **Spray is appropriate:** Large volume NC production, unoccupied spaces with full masking capability
- Both methods must achieve the selected quality tier's standards

### NC Sequencing Context
In new construction, trim is typically installed AFTER walls are primed but BEFORE walls are finish painted. Trim priming often occurs in the same session as door frame finish work. Project assembly should optimize shared protection setup.

---

## 14. Site Condition Analysis

| Condition ID | Affected Task Types | Include Values | Exclude Values | Notes |
|--------------|---------------------|----------------|----------------|-------|
| floor_type | protect | finished, partial | subfloor | Floor protection required only when finished floors present |
| occupancy_state | protect | occupied_crew_handles, occupied_sensitive | vacant | Additional furniture/item protection when occupied |
| lead_status | prep, prime | tested_positive, unknown_pre1978 | tested_negative, not_applicable | Lead-safe practices when applicable (rare in NC) |

---

## 15. Acceptance Criteria

- [ ] substrate_condition is a config dimension with all six values (factory_primed, bare_mdf, bare_fjp, bare_solid_wood, glossy_existing, oil_based_existing)
- [ ] primer_on_factory_primed is a boolean config dimension (true/false)
- [ ] quality_tier drives inspection/repair intensity, NOT primer selection
- [ ] MDF has separate edge seal task (solvent-based) and face prime task (latex)
- [ ] FJP requires stain-blocking primer (marked as mandatory, not optional)
- [ ] Profile complexity modifiers per Millwork_NC_Paint_Doctrine: 0.85, 1.0, 1.25, 1.40
- [ ] Height modifiers per Modifier_Registry: H1=1.0, H2=1.30, H3=1.50
- [ ] LF-based UOM per PDCA standard (1 LF trim = 1 SF)
- [ ] Protection zones: floor_perimeter always, wall_adjacent for spray only
- [ ] State declarations: valid inputs per substrate_condition, output = SS_PRIMED_FIELD
- [ ] Adjacent state protection: walls need no protection when unfinished, light_mask when finished
- [ ] All PaintScope keys verified against catalog
- [ ] Module structure follows Fine Finish pattern (MOD_FF_SETUP, MOD_FF_INITIAL_PREP, MOD_FF_PRIME, MOD_FF_CLEANUP)
- [ ] Material systems documented per substrate type with example products
- [ ] Spray application triggers wall_adjacent and fixture_covers protection zones

---

## 16. Open Questions for Human Review

### Q1: Crown Molding Inclusion
Should crown molding priming be included in this spec (via profile_complexity = ornate + trim_height = tall/high), or should it be a separate spec (SF_CROWN_NC_PRIME)? Crown has different adjacency (ceiling + wall) and always requires elevated work.

**Recommendation:** Include crown in this spec with profile_complexity and trim_height dimensions. Create separate spec only if crown requires fundamentally different workflow.

### Q2: Chair Rail / Wainscot Cap — **RESOLVED**
~~Should chair rail, picture rail, and wainscot cap be included via IN_LF_TRIM_OTHER, or require explicit PaintScope keys?~~

**Resolution:** Each trim type now has its own item ID and PaintScope key (ITM_TRIM_CROWN, ITM_TRIM_CHAIR_RAIL, ITM_TRIM_WAINSCOT_RAIL, ITM_TRIM_SHADOW_BOX, ITM_TRIM_PANEL_MOLD, ITM_TRIM_PICTURE_RAIL). ITM_TRIM_OTHER and IN_LF_TRIM_OTHER are DEPRECATED.

### Q3: Pre-Finish Sanding
Factory-primed trim often benefits from a light scuff sand (150-180 grit) before additional primer or direct-to-finish. Should this be a mandatory prep task or user-configurable?

**Recommendation:** Include as standard task with qt_scaled behavior (more thorough at higher tiers). Per Fine_Finish_Doctrine Section 6.3: "Full Sand: Light scuff for adhesion" at QT3, increasing to "Thorough sand" at QT5.

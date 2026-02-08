# Spec Brief: SF_WINDOW_INT_NC

**Status:** queued
**Priority:** P2 (#10 in catalog)
**Authored:** 2026-02-07
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_WINDOW_INT_NC` |
| Name | New Construction Interior Window Painting |
| Domain | interior |
| Context | NC |
| Description | Painting of interior window unit components in new construction: window frame (interior face), operable sash, muntins (true divided lights), and extension jamb. This is a combined prime+paint spec — primer coat is conditional on substrate state (bare wood requires primer; factory-primed windows skip to finish). Window CASING, STOOL, and APRON are excluded (handled by SF_TRIM_NC_PAINT/SF_TRIM_NC_PRIME as linear trim). Quantified per-window (EA) using PaintScope Size Bucket Method with height tier modifiers. Substrate type (wood, aluminum, steel) drives prep protocol and primer selection. Vinyl windows are excluded — handled by a separate specialty spec due to fundamentally different prep and primer requirements. Quality tier drives material system, sanding discipline, and inspection scrutiny per Fine Finish Doctrine. |

---

## 2. Scope Boundaries

### Includes
- Window frame painting (interior face)
- Window sash painting (operable and fixed)
- Muntin painting (true divided lights — adds complexity modifier)
- Extension jamb / reveal painting
- Glass masking and cleanup (razor scraping after cure)
- Window hardware protection (locks, latches, operators)
- Substrate-specific prep (sanding, cleaning, filling — wood and metal)
- Primer coat (conditional — required for SS_BARE, optional for SS_PRIMED_FACTORY)
- Finish coats (2 standard, 3 at QT5 brush/roll per FFD 15.10.3)
- Interstage inspect-sand-repair between coats
- Floor protection in work area
- Wall masking (spray method only)

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Window casing (wall-facing trim surround) | SF_TRIM_NC_PAINT |
| Window casing priming | SF_TRIM_NC_PRIME |
| Window stool (interior sill) | SF_TRIM_NC_PAINT / SF_TRIM_NC_PRIME |
| Window apron | SF_TRIM_NC_PAINT / SF_TRIM_NC_PRIME |
| Vinyl window painting (bonding primer, LRV concerns) | SF_WINDOW_VINYL (future specialty spec) |
| Exterior window painting | SF_WINDOW_EXT_NC (future) |
| Wall painting (windows create deductions) | SF_DRYWALL_WALL_NC_FINISH |
| Ceiling painting | SF_DRYWALL_CEILING_NC_FINISH |
| Window replacement / carpentry repair | Carpentry scope (not painting) |
| Glass replacement / glazing | Glazier scope (not painting) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | Drives material system, sanding discipline, inspection scrutiny. QT3=quick glance 6ft, QT4=systematic 3ft, QT5=lighted critical arm's length. Per Fine_Finish_Doctrine Section 8. |
| application_method | brush, spray | brush | Brush is standard for window detail work (sash, muntins). Spray only for large-volume NC production with full masking. Per Window_Systems_Doctrine Section 8.2. |
| substrate | wood, aluminum, steel | wood | Drives prep protocol, primer selection, adhesion strategy. Wood is the primary NC painting substrate. Aluminum needs DTM prep. Steel needs rust assessment + DTM primer. Vinyl excluded — separate specialty spec. Per Window_Systems_Doctrine Sections 3, 6. |
| sheen | satin, semi-gloss, gloss | semi-gloss | Per Fine_Finish_Doctrine Section 4.1: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only. Semi-gloss is window/trim default. |
| window_type | double_hung, casement, slider, fixed, awning | double_hung | Affects base production rate. Fixed is simplest (no operable parts). Per Window_Systems_Doctrine Section 8.1. |
| has_muntins | true, false | false | True divided lights add +20% labor for muntin complexity. Per Window_Systems_Doctrine Section 8.3. |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | Bare wood requires full primer coat. Factory-primed requires scuff sand + optional spot prime. Per Fine_Finish_Doctrine Section 2.1. |

> **No coat_count dimension.** Coat count is derived from quality_tier per Fine Finish Doctrine:
> - QT3 = 2 finish coats
> - QT4 = 2 finish coats
> - QT5 = 2-3 finish coats (3+ typical for brush/roll per FFD 15.10.3)

> **Sheen/QT gate for trim/windows (Fine Finish Doctrine Section 4.1):**
> - QT3: Satin or lower
> - QT4: Any except gloss
> - QT5: Any including gloss

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_WINDOW_UNIT | Window unit (frame, sash, muntins) | EA | PaintScope: PS_OPENING_EA.WINDOW_S + WINDOW_M + WINDOW_L + WINDOW_O | Always (scope-driven by substrate) |
| ITM_WINDOW_JAMB | Extension jamb / reveal | EA | Same count as ITM_WINDOW_UNIT | Always |

> **Stool and apron are NOT in this spec.** They are handled by SF_TRIM_NC_PAINT / SF_TRIM_NC_PRIME as linear trim items (ITM_TRIM_STOOL, ITM_TRIM_APRON). This keeps them available even when windows are vinyl (not painted) but stool/apron are wood.

> **EA counting:** Each window is counted once as EA. Size bucket (S/M/L/O) drives the base production rate — larger windows take longer. Height tier (H1-H5) drives the access modifier. Window type drives the base rate. These are modifiers on the EA rate, not separate items.

> **1 LF = 1 SF assumption does NOT apply here.** Unlike linear trim (where 1 LF trim = 1 SF per PDCA), window components are three-dimensional assemblies. Production rates are per-EA, not per-LF or per-SF.

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_EA_WINDOW_S | PS_OPENING_EA.WINDOW_S | EA | Conditional | Small windows in scope |
| IN_EA_WINDOW_M | PS_OPENING_EA.WINDOW_M | EA | Conditional | Medium windows in scope |
| IN_EA_WINDOW_L | PS_OPENING_EA.WINDOW_L | EA | Conditional | Large windows in scope |
| IN_EA_WINDOW_O | PS_OPENING_EA.WINDOW_O | EA | Conditional | Oversized windows (measured perimeter) |
| IN_EA_WINDOW_TOTAL | PS_OPENING_EA.WINDOW_TOTAL | EA | Always | Total window count — validation |
| IN_EA_WINDOW_H1 | PS_OPENING_EA.WINDOW_H1 | EA | Always | Windows at 0-8 ft (1.00x) |
| IN_EA_WINDOW_H2 | PS_OPENING_EA.WINDOW_H2 | EA | Always | Windows at 9-12 ft (1.30x) |
| IN_EA_WINDOW_H3 | PS_OPENING_EA.WINDOW_H3 | EA | Always | Windows at 13-17 ft (1.50x) |
| IN_EA_WINDOW_H4 | PS_OPENING_EA.WINDOW_H4 | EA | Always | Windows at 18-24 ft (2.00x) |
| IN_EA_WINDOW_H5 | PS_OPENING_EA.WINDOW_H5 | EA | Always | Windows at 25+ ft (2.50x) |
| IN_EA_WINDOW_EXCEPTION | PS_OPENING_EA.WINDOW_EXCEPTION | EA | Always | Flagged exceptions count |
| IN_SF_PROTECT_GLASS | PS_PROTECT_SF.ASSET.GLASS_AREA | SF | Always | Glass area for masking tasks |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | Always | Perimeter floor protection (brush) |
| IN_SF_PROTECT_FLOOR_8FT_RADIUS | PS_PROTECT_SF.FLOOR_8FT_RADIUS | SF | When spray | Radial floor protection (spray) |
| IN_LF_PROTECT_WALL_ADJACENT_WINDOW | PS_PROTECT_LF.WALL_ADJACENT_WINDOW | LF | When spray | Wall masking around window (spray) |
| IN_EA_PROTECT_HARDWARE | PS_PROTECT_EA.ASSET.HARDWARE_GROUPS | EA | Always | Window hardware protection (locks, latches) |
| IN_LF_PROTECT_SILL | PS_PROTECT_LF.SILL | LF | When spray | Sill edge masking during spray (protect stool surface from overspray) |

### Key Verification

All PaintScope keys exist in `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md`:
- `PS_OPENING_EA.WINDOW_S/M/L/O/TOTAL` — Section "Window Size Buckets"
- `PS_OPENING_EA.WINDOW_H1-H5` — Section "Window Height Distribution"
- `PS_OPENING_EA.WINDOW_EXCEPTION` — Section "Window Exceptions"
- `PS_PROTECT_SF.ASSET.GLASS_AREA` — Section "Asset Protection Keys"
- `PS_PROTECT_SF.FLOOR_PERIMETER` — Section "Floor Protection Keys"
- `PS_PROTECT_SF.FLOOR_8FT_RADIUS` — Section "Floor Protection Keys"
- `PS_PROTECT_LF.WALL_ADJACENT_WINDOW` — Section "Surface-Adjacent Protection Keys"
- `PS_PROTECT_EA.ASSET.HARDWARE_GROUPS` — Section "Asset Protection Keys"
- `PS_PROTECT_LF.SILL` — Section "Surface-Adjacent Protection Keys"

### Proposed New Keys
- None required — all PaintScope keys exist in catalog.

### Proposed New Input Mappings (for Spec_Input_to_PaintScope_Key_Mapping.md)
The following IN_ names need to be added to the mapping document (keys exist; mappings don't):
- `IN_EA_WINDOW_S` → `PS_OPENING_EA.WINDOW_S`
- `IN_EA_WINDOW_M` → `PS_OPENING_EA.WINDOW_M`
- `IN_EA_WINDOW_L` → `PS_OPENING_EA.WINDOW_L`
- `IN_EA_WINDOW_O` → `PS_OPENING_EA.WINDOW_O`
- `IN_EA_WINDOW_TOTAL` → `PS_OPENING_EA.WINDOW_TOTAL`
- `IN_EA_WINDOW_H1` through `IN_EA_WINDOW_H5` → `PS_OPENING_EA.WINDOW_H1-H5`
- `IN_EA_WINDOW_EXCEPTION` → `PS_OPENING_EA.WINDOW_EXCEPTION`
- `IN_SF_PROTECT_GLASS` → `PS_PROTECT_SF.ASSET.GLASS_AREA`
- `IN_SF_PROTECT_FLOOR_8FT_RADIUS` → `PS_PROTECT_SF.FLOOR_8FT_RADIUS`
- `IN_LF_PROTECT_WALL_ADJACENT_WINDOW` → `PS_PROTECT_LF.WALL_ADJACENT_WINDOW`
- `IN_EA_PROTECT_HARDWARE` → `PS_PROTECT_EA.ASSET.HARDWARE_GROUPS`
- `IN_LF_PROTECT_SILL` → `PS_PROTECT_LF.SILL`

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | PaintScope Key | Notes |
|---------|-----------|------------------|----------------|-------|
| floor_perimeter | always (brush) | edge_only | PS_PROTECT_SF.FLOOR_PERIMETER | Drop cloth runners along window work area |
| floor_full_8ft_radius | when spray | full_cover | PS_PROTECT_SF.FLOOR_8FT_RADIUS | Radial floor protection around spray zone |
| glass_mask | always | full_cover | PS_PROTECT_SF.ASSET.GLASS_AREA | Paper/film masking on window glass |
| hardware_covers | always | partial_cover | PS_PROTECT_EA.ASSET.HARDWARE_GROUPS | Tape/bag window locks, latches, operators |
| wall_adjacent_window | when spray | light_mask | PS_PROTECT_LF.WALL_ADJACENT_WINDOW | Wall masking around window during spray |
| sill_protection | when spray | light_mask | PS_PROTECT_LF.SILL | Protect stool surface from overspray |

**Zone Source:** Protection_Zones_Reference.md v2.0

**Method-Dependent Behavior:**
- Brush application: `floor_perimeter` + `glass_mask` + `hardware_covers`
- Spray application: `floor_full_8ft_radius` + `glass_mask` + `hardware_covers` + `wall_adjacent_window` + `sill_protection`

---

## 7. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| window_frame | wall_field | linear | different_finish |
| window_frame | window_sash | complex | same_finish |
| window_sash | window_muntin | complex | same_finish |
| window_sash | window_glass | complex | not_in_scope (glass is protected, not painted) |
| window_jamb | window_casing | linear | same_finish (often) |
| window_jamb | window_sash | complex | same_finish |
| window_jamb | window_stool | linear | same_finish (stool painted by trim spec) |
| window_casing | wall_field | linear | different_finish |

**Surface IDs verified against:** Surface_Vocabulary_Reference.md v1.0

---

## 8. State Declarations

### 8.1 Valid Input States

| Condition | Valid Input States | Notes |
|-----------|-------------------|-------|
| Bare wood (not factory primed) | SS_BARE | Requires full primer coat per substrate prep protocol |
| Factory primed (standard NC) | SS_PRIMED_FACTORY | Scuff sand + optional spot prime. Most common NC state. |

### 8.2 Output State

| Output State | Varies By | Notes |
|--------------|-----------|-------|
| SS_PAINTED | sheen dimension | Output sub-state matches selected sheen (SS_PAINTED_SATIN, SS_PAINTED_SEMIGLOSS, SS_PAINTED_GLOSS) |

### 8.3 Adjacent State Protection Rules

| Adjacent Surface | When State | Protection Level | Protection Zone | Notes |
|------------------|------------|------------------|-----------------|-------|
| wall_field | SS_BARE, SS_PRIMED_FIELD | none | — | Unfinished/primed walls need no protection during window painting (typical NC sequence) |
| wall_field | SS_PAINTED_* | light_mask (brush), heavy_mask (spray) | wall_adjacent_window | Protect finished walls from drips (brush) or overspray (spray) |
| window_casing | SS_BARE, SS_PRIMED_FACTORY | none | — | Unfinished casing needs no protection |
| window_casing | SS_PAINTED_* | light_mask | — | If casing is already finished, protect during window unit painting |
| window_stool | SS_BARE, SS_PRIMED_FACTORY | none | — | Unfinished stool needs no protection |
| window_stool | SS_PAINTED_* | light_mask | sill_protection | If stool is already painted by trim spec, protect from overspray |

---

## 9. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Shares trim package with | SF_TRIM_NC_PRIME, SF_TRIM_NC_PAINT | Casing, stool, and apron are handled by trim specs; window unit + jamb handled here |
| Typical before | SF_DRYWALL_WALL_NC_FINISH | Window painting is part of the trim package that completes before wall finish in NC |
| Often same session | SF_TRIM_NC_PAINT | Same crew, same material system for trim and window painting |
| May pair with | SF_DOOR_FRAME_NC_FINISH | Same fine finish material system, adjacent work areas |

---

## 10. Module Structure

This is a combined prime+paint spec (Scenario A per FFD Section 5 — primer is conditional, included in same spec). Module structure:

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_WIN_SETUP | setup | Floor protection, glass masking, hardware protection, staging | binary |
| MOD_WIN_PREP | prep | Substrate-specific prep (sand, clean, fill, etch), dust cleanup | qt_scaled |
| MOD_WIN_PRIME | prime | Primer coat (conditional on substrate_state) | qt_scaled |
| MOD_WIN_FINISH_COAT | finish | Finish coat application | qt_scaled |
| MOD_WIN_INTERSTAGE | interstage | Inspect-sand-repair between coats | qt_scaled |
| MOD_WIN_FINAL_INSPECT | finish | Final quality check | qt_scaled |
| MOD_WIN_CLEANUP | cleanup | Protection removal, glass scraping/cleaning, hardware reinstall | binary |

**Workflow sequence (SS_BARE):**
```
SETUP → PREP → PRIME → [dry] → INTERSTAGE → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → FINAL_INSPECT → CLEANUP
```

**Workflow sequence (SS_PRIMED_FACTORY):**
```
SETUP → PREP → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → FINAL_INSPECT → CLEANUP
```

**QT5 with brush/roll (3 coats):**
```
SETUP → PREP → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → INTERSTAGE → FINISH_COAT_3 → FINAL_INSPECT → CLEANUP
```

---

## 11. Material Systems by Quality Tier

Per Fine_Finish_Doctrine Section 3:

| Quality Tier | System ID | Finish Type | Typical Products | Notes |
|--------------|-----------|-------------|------------------|-------|
| QT3 | SYS_FF_STANDARD_ACRYLIC | 100% acrylic enamel | ProClassic WB, Regal Select | Fast dry, good leveling |
| QT4 | SYS_FF_MODIFIED_URETHANE | Waterborne alkyd | BM Advance, SW Pro Industrial WB Alkyd | Superior flow, longer open time |
| QT5 | SYS_FF_PREMIUM | Premium urethane enamel | Emerald Urethane, Scuff-X | Maximum leveling, durability |

**Primer selection by substrate (not QT-driven):**

| Substrate | Primer System | Notes |
|-----------|---------------|-------|
| Wood (SS_BARE) | Standard acrylic primer or shellac-based (knots/tannin) | Per Fine_Finish_Doctrine Section 2.1 |
| Wood (SS_PRIMED_FACTORY) | No additional primer needed (scuff sand only) | Factory primer sufficient |
| Aluminum | DTM etching primer or organofunctional silane treatment | Per Window_Systems_Doctrine Section 6.2 |
| Steel | Rust-inhibitive DTM primer | Per Window_Systems_Doctrine Section 6.3.4 |

---

## 12. References

### 12a. Domain Doctrines

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Window Systems Doctrine | docs/Doctrine/Window_Systems_Doctrine.md | Section 3 (Wood Systems), Section 4 (Muntin/Glass), Section 6 (Metal), Section 7 (Quantification), Section 8 (Application), Section 13 (PaintFactor Integration) |
| Fine Finish Doctrine | docs/Doctrine/Fine_Finish_Doctrine.md | Section 2 (Core Principles), Section 3 (Material Systems), Section 4 (Sheen Selection), Section 5 (Module Structure), Section 7 (Interstage), Section 8 (Scrutiny by Tier), Section 15 (Brush and Roll) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Sheen/QT minimums (trim exception), sanding standards, task classification |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Mask level definitions, glass masking, floor protection by method |
| Materials & Consumables | docs/Doctrine/Materials_and_Consumables_Doctrine.md | Brush sizing (1.5" angled sash brush), consumable rates |
| PaintScope Window Counting | docs/PaintScope/PaintScope_Window_Counting_System.md | Size Bucket Method, trim packages, height tiers, exceptions |

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

## 13. Site Condition Analysis

| Condition ID | Affected Task Types | Include Values | Exclude Values | Notes |
|--------------|---------------------|----------------|----------------|-------|
| floor_type | protect | finished, partial | subfloor | Floor protection required only when finished floors present |
| occupancy_state | protect | occupied_crew_handles, occupied_sensitive | vacant | Additional furniture/item protection when occupied |
| lead_status | prep, prime, finish | tested_positive, unknown_pre1978 | tested_negative, not_applicable | Lead-safe practices when applicable (rare in NC but possible in gut renovation) |
| temperature_condition | prime, finish | cold_below_50f, hot_above_90f | normal | Affects dry times and open time. Cold = extended dry (2-3x). Hot = reduced open time. |

---

## 14. Special Notes / Constraints

### EA-Based Counting (Not LF)
Unlike trim specs that use LF, this spec uses EA per window. Size bucket (S/M/L/O) drives base production rate. The PaintScope Window Counting System provides all necessary EA counts — specs never compute geometry.

### Stool and Apron are Trim Items
Window stool and apron are ALWAYS handled by SF_TRIM_NC_PAINT / SF_TRIM_NC_PRIME, not this spec. This keeps stool/apron available as paintable trim items even when the window unit itself is vinyl (not painted). The trim spec will need ITM_TRIM_STOOL and ITM_TRIM_APRON items added.

### Substrate Determines Prep Protocol
Each substrate type has fundamentally different prep requirements:
- **Wood:** Sand (150-220 grit), fill grain/defects, dust cleanup. Per Window_Systems_Doctrine Section 3.
- **Aluminum:** Degrease, chemical etch or mechanical abrasion, DTM primer. Per Window_Systems_Doctrine Section 6.2.
- **Steel:** Degrease, rust assessment, mechanical/chemical treatment, rust-inhibitive primer. Per Window_Systems_Doctrine Section 6.3.

### Vinyl Windows are a Separate Spec
Vinyl/clad window painting is excluded from this spec. Vinyl requires fundamentally different prep (bonding primer, LRV constraints, heat absorption concerns) that warrants its own specialty spec (SF_WINDOW_VINYL, future). This spec covers wood and metal substrates only.

### Glass Masking is Mandatory
Glass masking (glass_mask zone) is ALWAYS required regardless of application method. The 1/16-inch seal technique may apply for wood windows per Window_Systems_Doctrine Section 4.1. Glass scraping/cleanup is part of the cleanup module.

### Height Tier System (5-Tier for Windows)
Windows use a 5-tier height system per Window_Systems_Doctrine Section 8.4:
- H1: 0-8 ft (1.00x) — ground/step stool
- H2: 9-12 ft (1.30x) — step ladder
- H3: 13-17 ft (1.50x) — extension ladder
- H4: 18-24 ft (2.00x) — scaffolding
- H5: 25+ ft (2.50x) — lift equipment

The Modifier Registry has been updated to include H5_LIFT at 2.50x (v1.2).

### Window Condition Modifiers (Prep Only)
Per Window_Systems_Doctrine Section 8.5, condition modifiers apply to PREP tasks only:
- Good: 1.00x prep, 1.00x finish
- Fair: 1.50x prep, 1.00x finish
- Poor: 2.00x prep, 1.00x finish

In NC, condition is typically Good (new windows). Fair/Poor would indicate installation damage or storage damage.

### Multi-Pane Modifier
True divided light (TDL) muntins add +20% labor per Window_Systems_Doctrine Section 8.3. This is captured via the `has_muntins` configuration dimension. Simulated divided lights (SDL) with snap-in grilles do NOT trigger this modifier — they are removed before painting.

### Between-Coat Sanding Discipline
Per Fine_Finish_Doctrine Section 15.3 and Section 8:
- QT3: Spot sand only (visible nibs, rough spots)
- QT4: Light full sand (220 grit, entire surface)
- QT5: Thorough full sand (220-320 grit, uniform scratch pattern)

### Application Method Notes
- **Brush** is the standard for window detail work. 1.5-inch angled sash brush for sash and muntins. Per Window_Systems_Doctrine Section 8.2.1.
- **Spray** (HVLP or air-assisted airless) provides faster production and smoother finish but requires extensive masking (wall, floor, glass). 20-40% material waste from overspray. Per Window_Systems_Doctrine Section 8.2.2.

### NC Sequencing Context
In NC, the typical sequence is: Prime ceilings → Prime walls → Finish ceilings → Trim/window package (prime → finish → mask off) → Wall finish. This window spec is part of the "trim/window package" phase. Window painting naturally pairs with SF_TRIM_NC_PAINT for shared protection setup and same material system.

### Blocking Prevention (Window-Specific Defect)
Per Window_Systems_Doctrine Section 10.1: Freshly painted windows MUST remain open ("ajar" position) during cure. Closing before full cure (3-7 days for enamels) causes blocking (sticking). This is a critical SOP note — not a rate modifier but a mandatory work practice.

---

## 15. Acceptance Criteria

- [ ] EA-based counting using PaintScope Size Bucket keys (PS_OPENING_EA.WINDOW_S/M/L/O)
- [ ] 5-tier height modifier system (H1-H5) using PS_OPENING_EA.WINDOW_H1-H5
- [ ] Substrate-specific prep tasks for wood, aluminum, steel (NO vinyl)
- [ ] Primer conditional on substrate_state (SS_BARE requires primer, SS_PRIMED_FACTORY does not)
- [ ] Material system selection is QT-driven per Fine Finish Doctrine (SYS_FF_STANDARD_ACRYLIC, SYS_FF_MODIFIED_URETHANE, SYS_FF_PREMIUM)
- [ ] Sheen/QT gate enforced: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only
- [ ] Glass masking (glass_mask zone) required for ALL application methods
- [ ] Between-coat sanding discipline per tier: QT3=spot, QT4=full 220, QT5=full 220-320
- [ ] Multi-pane muntin modifier (+20%) when has_muntins = true
- [ ] Window type affects base production rate (double_hung, casement, slider, fixed, awning)
- [ ] Size bucket affects base production rate (S, M, L, O)
- [ ] Protection zones: floor + glass + hardware always; wall + sill added for spray
- [ ] State declarations: input = SS_BARE or SS_PRIMED_FACTORY, output = SS_PAINTED
- [ ] Adjacent state protection: walls need no protection when unfinished, masking when finished
- [ ] Interstage between-coat cycle present at ALL quality tiers
- [ ] Blocking prevention note in SOP (windows must remain open during cure)
- [ ] Window casing, stool, and apron EXCLUDED (handled by trim specs)
- [ ] Vinyl substrate EXCLUDED (separate specialty spec)
- [ ] All PaintScope keys verified against catalog
- [ ] No new PaintScope keys required

---

## 16. Open Questions for Human Review

### Q1: Stool and Apron Scope Boundary — **RESOLVED**
~~Should stool and apron be in the window spec or the trim spec?~~

**Resolution:** Stool and apron are ALWAYS in the trim spec (SF_TRIM_NC_PAINT / SF_TRIM_NC_PRIME). This keeps them available as paintable items even when window units are vinyl (not painted). The trim spec will need ITM_TRIM_STOOL and ITM_TRIM_APRON items added.

### Q2: Vinyl Window Painting in NC — **RESOLVED**
~~Should this spec support vinyl as a substrate?~~

**Resolution:** No. Vinyl windows are excluded — separate specialty spec (SF_WINDOW_VINYL, future). Vinyl prep requirements (bonding primer, LRV constraints, heat absorption) are fundamentally different from wood/metal window painting and warrant their own spec.

### Q3: H5 Height Tier — **RESOLVED**
~~Should the Modifier Registry be updated to include H5?~~

**Resolution:** Yes. Modifier Registry updated to v1.2 with H5_LIFT at 2.50x (25+ ft, lift equipment). H4_EXTREME range narrowed to 18-24 ft. This aligns the registry with the Window Systems Doctrine and PaintScope Window Counting System.

### Q4: Steel Windows in NC Residential — **RESOLVED**
~~Should steel be included as a substrate option?~~

**Resolution:** Yes. Steel is included. The Window Systems Doctrine (Section 6.3) provides thorough coverage of steel prep protocols. The SOP module handles the complexity — if steel is selected, the appropriate prep tasks (rust assessment, SSPC standards, DTM primers) activate automatically.

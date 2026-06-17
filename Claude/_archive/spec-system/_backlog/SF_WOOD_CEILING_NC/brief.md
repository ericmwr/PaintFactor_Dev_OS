# Spec Brief: SF_WOOD_CEILING_NC

**Status:** queued
**Priority:** P3 (#15 in generation order)
**Authored:** 2026-02-09
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_WOOD_CEILING_NC` |
| Name | New Construction Wood Ceiling Painting |
| Domain | interior |
| Context | NC |
| Description | Combined prime+paint spec for wood plank and panel ceilings in new construction. Covers the entire ceiling field — flat plank, beadboard, tongue-and-groove boards, and coffered panel systems — measured as a single SF quantity. Distinct from SF_DRYWALL_CEILING_NC_PRIME / SF_DRYWALL_CEILING_NC_FINISH which cover gypsum board ceilings. Distinct from SF_WOOD_WALL_NC which covers vertical wood surfaces. Wood ceilings require Fine Finish Doctrine workflow: substrate-driven primer, QT-driven finish, interstage inspect/sand/repair cycle. The ceiling_style dimension (flat_plank, beadboard, tongue_and_groove, coffered) drives production rate complexity modifiers. ALL work is overhead, requiring inherently slower base production rates compared to vertical wall work due to physical strain, gravity effects, and equipment positioning. Height modifier applies on top of overhead base rates — working on a wood ceiling at 8 ft vs 18 ft requires different access equipment. Combined spec (not split prime/paint) because a wood ceiling is a self-contained surface with continuous finish — identical rationale to SF_WOOD_WALL_NC, SF_WAINSCOT_PANEL_NC, and SF_WINDOW_INT_NC. |

---

## 2. Scope Boundaries

### Includes
- Full-area wood ceiling painting (flat plank, beadboard, tongue-and-groove, coffered panels + beam faces)
- Board joint treatment (caulk at V-groove, tongue-and-groove, or butt joints as required by ceiling_style)
- Coffered ceiling beam face painting (beams are integral to the coffered ceiling system, not separate scope)
- Coffered panel-to-beam junction caulking and detail work
- Surface prep per substrate (dust removal, sanding, grain fill)
- MDF edge sealing with solvent-based sealer (conditional on substrate = MDF + SS_BARE)
- Fastener hole filling and sanding
- Caulking at ceiling-to-wall junction perimeter
- Primer coat — conditional on substrate_state
- Finish coat application (2 coats standard, 3+ at QT5 brush per FFD §15.10.3)
- Interstage inspect/sand/repair between finish coats
- Floor protection (full or perimeter, method-dependent)
- Wall upper band masking when spray application
- Ceiling fixture masking/protection (lights, fans, smoke detectors)
- Lightweight opening covers for windows/doors (overspray fallout catch)
- Final quality inspection
- Post-work floor vacuum cleanup

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Crown molding at ceiling-wall junction | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_CROWN) |
| Standalone decorative beams (not part of coffered ceiling) | SF_ARCH_ELEMENT_NC (future) |
| Decorative columns supporting ceiling | SF_ARCH_ELEMENT_NC (future) |
| Drywall ceiling field | SF_DRYWALL_CEILING_NC_PRIME / SF_DRYWALL_CEILING_NC_FINISH |
| Wood wall panels below ceiling | SF_WOOD_WALL_NC |
| Drywall wall field below ceiling | SF_DRYWALL_WALL_NC_PRIME / SF_DRYWALL_WALL_NC_FINISH |
| Ceiling-mounted light fixture removal/reinstall | Electrical trade |
| Recessed lighting trim ring removal | Electrical trade (if needed; otherwise mask in place) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | QT2 not applicable — wood ceilings are prominent millwork per Millwork Doctrine. QT5 requires zero-defect surface with critical inspection at arm's length (overhead — more difficult to inspect). |
| application_method | spray, brush | spray | Spray strongly preferred for overhead — faster, more ergonomic, better coverage on horizontal-downward surfaces. Brush for small areas, occupied spaces, or detail work on coffered beam profiles. Per FFD §15.1.1. |
| sheen | satin, semi-gloss, gloss | satin | Wood ceilings typically satin for softer appearance and to minimize reflection/glare from lighting. Sheen/QT gate per FFD §4.1: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only. |
| ceiling_style | flat_plank, beadboard, tongue_and_groove, coffered | flat_plank | Drives production rate complexity modifier. Flat_plank = standard (1.0x), beadboard = narrow board detail (1.15x), tongue_and_groove = tight joint (1.10x), coffered = beam+panel system (1.35x). |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | SS_BARE: full primer required per substrate type. SS_PRIMED_FACTORY: skip primer, lighter prep. Standard NC delivery is factory-primed MDF, FJP, or solid wood. |

> **No coat_count dimension.** Coat count derived from quality_tier per FFD:
> - QT3 = 2 finish coats
> - QT4 = 2 finish coats
> - QT5 = 2-3 finish coats (3+ typical for brush per FFD §15.10.3)

> **Sheen/QT gate for millwork surfaces (Fine Finish Doctrine §4.1):**
> - QT3: Satin or lower
> - QT4: Any except gloss
> - QT5: Any including gloss

> **Height is NOT a config dimension.** Room height varies (standard 8 ft to great room 18+ ft). Height modifier (MOD_HT) is applied by the estimation engine via PS_META.HEIGHT_BAND. This affects access equipment requirements for overhead work.

> **Overhead penalty is baked into base rates.** All production rates for wood ceiling tasks are inherently lower than equivalent wood wall tasks due to overhead work difficulty. The height modifier then applies ON TOP of these already-reduced base rates.

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_WOOD_CEILING_PANEL | Wood ceiling panel assembly | SF | PaintScope: PS_SURFACE_SF.WOOD_CEILING. Total SF of wood ceiling surface. For board styles (beadboard, T&G, flat_plank), includes board faces and joint detail. For coffered style, includes panel faces AND beam faces within the ceiling system — beams are integral to the coffered ceiling, not separate items. | Always |

> **Design decision:** Single SF item for the entire ceiling surface. For coffered style, beam faces are inherent complexity captured in the ceiling_style modifier (1.35x), not separate line items. This matches the wood wall approach (single ITM_WOOD_WALL_PANEL with wall_style modifier) and parallels SF_WAINSCOT_PANEL_NC's single-item design.

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_WOOD_CEILING | PS_SURFACE_SF.WOOD_CEILING | SF | Always | Total SF of wood ceiling surface. |
| IN_EA_ROOMS_TOTAL | PS_META.EA.ROOMS_TOTAL | EA | Always | Room-level operations (setup, cleanup). |
| IN_SF_PROTECT_FLOOR_EXPOSED | PS_PROTECT_SF.FLOOR_EXPOSED | SF | When spray | Full floor protection for overhead spray drip/overspray. |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | When brush | Perimeter floor protection for overhead brush drips. |
| IN_SF_PROTECT_WALL_UPPER_BAND | PS_PROTECT_SF.WALL_UPPER_BAND | SF | When spray | Upper wall band masking near ceiling for overspray containment. |
| IN_EA_PROTECT_FIXTURES | PS_PROTECT_EA.ASSET.FIXTURES | EA | Always | Ceiling-mounted fixtures (lights, fans, smoke detectors) requiring masking. |
| IN_SF_FLOOR_VACUUM_AREA | PS_META.SF.FLOOR_VACUUM_AREA | SF | Always | Post-work vacuum cleanup area. |

### Key Verification

**Existing keys (verified in catalog):**
- `PS_META.EA.ROOMS_TOTAL` — Section "Room / Zone meta"
- `PS_PROTECT_SF.FLOOR_EXPOSED` — Section "Floor Protection Keys (SF)"
- `PS_PROTECT_SF.FLOOR_PERIMETER` — Section "Floor Protection Keys (SF)"
- `PS_PROTECT_SF.WALL_UPPER_BAND` — Section "Area Protection Keys (SF) - Non-Floor"
- `PS_PROTECT_EA.ASSET.FIXTURES` — Section "Asset Protection Keys (SF/EA)"
- `PS_META.SF.FLOOR_VACUUM_AREA` — Section "Room / Zone meta"

### Proposed New Keys

| Key | UOM | Description | Justification |
|-----|-----|-------------|---------------|
| `PS_SURFACE_SF.WOOD_CEILING` | SF | Total SF of wood ceiling surface (plank, beadboard, T&G, coffered panel+beam) | No existing key covers wood ceiling surfaces. PS_SURFACE_SF.CEILING_FIELD is for drywall ceilings. Wood ceiling is semantically distinct — wood substrate, fine finish doctrine, different prep and production rates, overhead-specific methodology. Same rationale as PS_SURFACE_SF.WOOD_WALL for wood walls. |

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | PaintScope Key | Notes |
|---------|-----------|------------------|----------------|-------|
| floor_full | when spray | full_cover | PS_PROTECT_SF.FLOOR_EXPOSED | Full floor coverage for overhead spray drip protection. Overspray falls straight down from ceiling. |
| floor_perimeter | when brush | edge_only | PS_PROTECT_SF.FLOOR_PERIMETER | Perimeter drop cloths for brush drip protection. Less overspray risk than spray. |
| wall_upper_band | when spray | partial_cover | PS_PROTECT_SF.WALL_UPPER_BAND | Upper wall band masking near ceiling for overspray containment during spray. Paper/plastic film at wall-ceiling junction area. |
| fixture_covers | always | full_cover | PS_PROTECT_EA.ASSET.FIXTURES | Mask ceiling-mounted lights, fans, smoke detectors. Tape and plastic bag or masking film. |
| opening_cover_lightweight | when spray | light_mask | PS_OPENING_EA.WINDOW_OPENINGS_TOTAL, PS_OPENING_EA.DOOR_OPENINGS_TOTAL | Lightweight plastic pin-up over window and door openings to catch overspray fallout from overhead work. |

**Zone Source:** Protection_Zones_Reference.md v2.1

**Method-Dependent Behavior:**
- Brush application: `floor_perimeter` + `fixture_covers`
- Spray application: `floor_full` + `wall_upper_band` + `fixture_covers` + `opening_cover_lightweight`

---

## 7. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| ceiling_field | wall_field (below) | linear | different_finish (ceiling enamel vs wall latex). Junction at wall-ceiling line. |
| ceiling_field | trim_crown (at junction, if present) | linear | same_finish or different_finish (crown may match ceiling color or contrast). |
| ceiling_field | wall_panel (below, if wood wall room) | linear | same_finish (wood ceiling + wood wall often same color/sheen in library/accent rooms). |
| ceiling_field | beam_wrap (coffered beams, if coffered style) | complex | same_finish (beams and panels are the same ceiling system). |

**Surface IDs verified against:** Surface_Vocabulary_Reference.md v1.0 — `ceiling_field` exists in Ceiling Surfaces section. All adjacent surface IDs verified.

---

## 8. State Declarations

### 8.1 Valid Input States

| Substrate State Config | Valid Input States | Notes |
|------------------------|-------------------|-------|
| SS_BARE | SS_BARE | Uncoated MDF, FJP, or solid wood ceiling panels/boards requiring full primer per substrate type |
| SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | Standard NC delivery — factory-primed MDF, FJP, or pre-primed boards |

### 8.2 Output State

| Output State | Varies By | Notes |
|--------------|-----------|-------|
| SS_PAINTED | sheen dimension | Output sub-state: SS_PAINTED_SATIN, SS_PAINTED_SEMIGLOSS, SS_PAINTED_GLOSS |

### 8.3 Adjacent State Protection Rules

| Adjacent Surface | When State | Protection Level | Protection Zone | Notes |
|------------------|------------|------------------|-----------------|-------|
| wall_field (below) | SS_BARE | none | — | Unfinished wall needs no protection during ceiling work |
| wall_field (below) | SS_PAINTED_* | heavy_mask | wall_upper_band | Protect finished wall from drips or overspray when painting ceiling overhead |
| trim_crown (at junction) | SS_BARE | none | — | Crown not yet finished — no protection needed |
| trim_crown (at junction) | SS_PAINTED_* | light_mask | — | If crown already painted, mask top edge during ceiling work |

---

## 9. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Shares finish group with | SF_WOOD_WALL_NC | Wood ceiling and wood walls in same room often same color/sheen (library/accent rooms). |
| Shares finish group with | SF_TRIM_NC_PAINT | Crown molding and ceiling trim often same color as ceiling. |
| Typical before | SF_DRYWALL_WALL_NC_FINISH | Ceiling painted before walls — standard top-down sequence. |
| Typical before | SF_TRIM_NC_PAINT | Ceiling painted before trim — field before detail. |
| Typical after | SF_DRYWALL_CEILING_NC_PRIME | If ceiling needs drywall prime first (not applicable for wood ceiling, but for adjacent drywall ceilings in same project). |
| Often combined with | SF_WOOD_WALL_NC | Same room session — wood ceiling + wood walls are both millwork in the same zone. |

---

## 10. Module Structure

Combined prime+paint spec following Fine Finish module pattern:

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_WDCL_SETUP | setup | Floor protection setup, wall upper band masking (when spray), fixture masking, opening covers (when spray), staging | binary |
| MOD_WDCL_PREP | prep | Dust wipe, sanding (full surface per QT), MDF edge sealing (conditional), fastener fill, caulk at board joints / panel-to-beam joints (coffered) / ceiling-to-wall perimeter | qt_scaled |
| MOD_WDCL_PRIME | prime | Primer coat(s) per substrate type — conditional on substrate_state=SS_BARE. MDF: solvent edge seal + latex face. FJP: stain-block. Solid wood: standard primer-sealer. Hardwood: tannin-block. | qt_scaled |
| MOD_WDCL_FINISH_COAT | finish | Finish coat application. Spray: sweep passes across ceiling field. Coffered: field panels first, then beam faces. Brush: work board-by-board (beadboard/T&G) or panel-by-panel (coffered). All work overhead — gravity management critical. | qt_scaled |
| MOD_WDCL_INTERSTAGE | interstage | Between-coat inspect/sand/repair. Scuff sand 220-320 grit. Overhead sanding is especially fatiguing — may need shorter work intervals. | qt_scaled |
| MOD_WDCL_FINAL_INSPECT | finish | Final quality check. Visual inspection at tier-appropriate distance from below. Check for holidays at joints, board edges, and panel-to-beam junctions. Overhead inspection requires looking up — use angled light to reveal defects. | qt_scaled |
| MOD_WDCL_CLEANUP | cleanup | Protection teardown, floor vacuum, tool cleaning | binary |

**Workflow sequence:**
```
SETUP → PREP → PRIME (conditional) → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → [INTERSTAGE → FINISH_COAT_3 at QT5 brush] → FINAL_INSPECT → CLEANUP
```

**Note:** Primer module is CONDITIONAL — only runs when substrate_state = SS_BARE. Factory-primed substrates skip from prep to finish.

---

## 11. Material Systems

### Primer (Substrate-Driven)

Per Millwork_NC_Paint_Doctrine §4.1 and Fine_Finish_Doctrine §3.6:

| Substrate | Primer Type | Purpose | Existing System ID |
|-----------|-------------|---------|-------------------|
| MDF (edges/routed details) | Solvent-based sealer (shellac/oil-based) | Seal edges, prevent fiber raise. Water-based causes irreversible fiber swelling. | SYS_PRIMER_MDF_SHELLAC |
| MDF (face surfaces) | High-build latex primer | Build film, level surface | SYS_PRIMER_MDF_LATEX |
| FJP | Stain-blocking primer | Block resin bleed-through at finger joints | SYS_PRIMER_POPLAR_STAINBLOCK |
| Solid wood (hardwood) | Tannin-blocking primer | Block tannin bleed-through | SYS_PRIMER_HARDWOOD_TANNINBLOCK |
| Solid wood (softwood) | Standard primer-sealer | Seal, tooth, block minor stains | SYS_PRIMER_WOOD_STANDARD |
| Factory primed | Skip (or optional additional coat) | Factory primer is transit protection | — |

> **MDF Two-Step Process:** MDF requires a mandatory two-step prime: (1) solvent-based edge seal on ALL cut/routed edges, (2) high-build latex on face surfaces. This is a task sequence constraint, not just a material selection. Per Millwork Doctrine §3.1: "Edges require solvent-based sealer (prevents fiber raise)."

### Finish (QT-Driven)

Per Fine_Finish_Doctrine §3:

| Quality Tier | System ID | Finish Type | Typical Products |
|--------------|-----------|-------------|------------------|
| QT3 | SYS_FF_STANDARD_ACRYLIC | 100% acrylic enamel | SW ProClassic WB, BM Regal Select |
| QT4 | SYS_FF_MODIFIED_URETHANE | Waterborne alkyd | BM Advance, SW Emerald Urethane |
| QT5 | SYS_FF_PREMIUM | Premium urethane enamel | SW Emerald Urethane Trim, BM Scuff-X |

---

## 12. References

### 12a. Domain Doctrines

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Millwork NC Paint Doctrine | docs/Doctrine/Millwork_NC_Paint_Doctrine.md | §1.1 (Millwork types, SF measurement), §2 (Substrate Classification), §3 (Surface Preparation Matrix), §4 (Primer Systems), §6 (Quality Tier Matrix), §7 (Productivity Benchmarks — complexity modifiers) |
| Fine Finish Doctrine | docs/Doctrine/Fine_Finish_Doctrine.md | §1.1 (Fine Finish Ceilings — wood plank, beadboard, coffered explicitly listed), §2 (Core Principles — primer is substrate-driven), §3 (Material Systems by QT), §4 (Sheen/QT gate), §5 (Module Structure), §6 (Initial Prep Phase), §7 (Interstage Process), §8 (Scrutiny Definitions), §15 (Brush and Roll — sanding strategy, rigid block) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Sheen/QT minimums, sanding standards, inspection distances |
| Materials & Consumables | docs/Doctrine/Materials_and_Consumables_Doctrine.md | Consumable standards, caulk/spackle rates, sandpaper grades |
| Estimation Modifiers | docs/Doctrine/Estimation_Modifiers_Doctrine.md | Height modifiers (H1-H4), modifier stacking rules |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Floor protection, spray containment masking, wall upper band masking, fixture masking |

### 12b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | docs/Doctrine/Spec_Completeness_Doctrine.md | Mandatory completeness requirements |
| Modifier Registry | docs/Doctrine/Modifier_Registry.md | Canonical modifier IDs and values |
| Protection Zones Reference | docs/Reference/Protection_Zones_Reference.md | Valid zone IDs for protection tasks |
| Surface Vocabulary Reference | docs/Reference/Surface_Vocabulary_Reference.md | Valid surface IDs for adjacency |
| Site Condition Vocabulary | docs/Reference/Site_Condition_Vocabulary_Reference.md | Valid site condition IDs |
| Substrate State Reference | docs/Reference/Substrate_State_Reference.md | Valid SS_* state IDs |
| PaintScope Quantity Key Catalog | docs/PaintScope/PaintScope_Quantity_Key_Catalog.md | Key verification |
| Spec Input to PaintScope Mapping | docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md | Key mapping validation |

---

## 13. Special Notes / Constraints

### Combined Prime+Paint Spec
Primer is conditional on substrate_state, not a separate spec. Same pattern as SF_WOOD_WALL_NC, SF_WAINSCOT_PANEL_NC, and SF_WINDOW_INT_NC. Rationale: a wood ceiling is a self-contained surface — primer and paint flow continuously across the entire ceiling field in the same session.

### Single SF Paintable Item
The wood ceiling surface (boards or panel+beam assembly) is measured as ONE item in SF. For coffered style, beam faces are inherent complexity captured by the ceiling_style modifier (1.35x), not by splitting into separate LF and SF items. For board styles (beadboard, T&G), joint detail complexity is captured by the ceiling_style modifier. This matches SF_WOOD_WALL_NC's single-item design.

### Overhead Work — Slower Base Rates
ALL production rates for wood ceiling tasks must be LOWER than equivalent wood wall tasks because all work is performed overhead. Key differences:
- **Physical strain**: Arms above head, neck strain, fatigue cycles shorter
- **Gravity effects**: Drips fall onto worker, sag risk on overhead surfaces, spray material fights gravity
- **Equipment positioning**: Must position ladders/scaffold for overhead reach, more repositioning
- **Inspection difficulty**: Looking up vs straight ahead — angled light required to reveal defects overhead
- **Typical overhead penalty**: ~0.70-0.80x of equivalent wall rates (i.e., 20-30% slower)

### Height Modifier Applies ON TOP of Overhead Base Rates
Room height determines access equipment. The height modifier (MOD_HT via PS_META.HEIGHT_BAND) applies to production rate tasks on top of the already-reduced overhead base rates. Standard 8 ft ceiling = H1 (1.0x). Great room 14 ft ceiling = H3 (1.5x). Combined with overhead penalty, a 14 ft wood ceiling is approximately 0.75 × (1/1.5) = 0.50x the rate of a standard wall task.

### Coffered Ceiling Scope Decision
Coffered ceiling beams ARE included in this spec because:
1. Beams and panels are parts of a single ceiling system painted together
2. Separating beams into SF_ARCH_ELEMENT_NC would create coordination complexity
3. The ceiling_style=coffered modifier (1.35x) captures the beam complexity

**Standalone decorative beams** (not part of a coffered ceiling grid) are EXCLUDED — routed to SF_ARCH_ELEMENT_NC.

### Ceiling Style Drives Complexity Modifier
- **flat_plank** = simple flat boards or panels across ceiling (1.0x) — simplest overhead surface
- **beadboard** = narrow boards (~3-4" wide) with bead groove at each joint (1.15x) — high joint density, more attention to grooves overhead
- **tongue_and_groove** = interlocking boards with tight-fitting joint (1.10x) — similar to beadboard but wider boards, fewer joints
- **coffered** = grid of beams forming recessed panel bays (1.35x) — most complex: beam faces, panel fields, beam-to-panel junctions, inside corners at beam/panel transitions. Multiple orientation changes (horizontal panels, vertical beam faces).

### MDF Edge Sealing is a Task Constraint
When substrate is MDF and substrate_state is SS_BARE, the SOP MUST include solvent-based edge sealing as a separate prep task BEFORE latex face primer. NON-NEGOTIABLE per Millwork Doctrine §3.1.

### Board Joint Caulking (Overhead)
Same joint density patterns as wood wall, but caulking overhead is slower and messier. Gravity pulls caulk away from joints. For beadboard (highest joint density), caulk labor is significantly higher overhead.

### Spray Technique for Wood Ceilings
Wood ceiling spray technique differs from walls:
- **Flat plank/T&G**: Sweep passes following board direction. Maintain consistent distance. Light coats to prevent sags — gravity pulls coating down, creating drip risk at board edges.
- **Beadboard**: Same as T&G but narrower boards require more attention to groove fill.
- **Coffered**: Panel fields first (broad overhead passes), then beam faces (vertical surfaces within the ceiling system — less overhead penalty for beam faces since they're vertical).

### Distinction from Drywall Ceiling
| Attribute | SF_DRYWALL_CEILING_NC | SF_WOOD_CEILING_NC |
|-----------|----------------------|-------------------|
| Substrate | Gypsum board (drywall) | Wood (MDF, FJP, solid wood) |
| Finish system | Standard wall latex | Fine Finish enamel (QT-driven) |
| Prep workflow | Drywall-specific (tape/mud/sand by others) | Fine Finish initial prep (fill, caulk, sand) |
| Interstage | Not applicable (wall latex) | Mandatory (Fine Finish cycle) |
| Primer | PVA drywall primer | Substrate-driven (MDF/FJP/wood specific) |
| Quality gate | QT2-QT5 | QT3-QT5 only (millwork standard) |
| Typical sheen | Flat or matte | Satin or semi-gloss |

### Distinction from Wood Wall
| Attribute | SF_WOOD_WALL_NC | SF_WOOD_CEILING_NC |
|-----------|-----------------|-------------------|
| Orientation | Vertical | Overhead (horizontal-down) |
| Base rates | Standard wall rates | Reduced by overhead penalty (~0.70-0.80x) |
| Gravity risk | Drips run down wall (standard) | Drips fall from ceiling onto worker/floor (higher risk) |
| Style options | flat_panel, shiplap, T&G, library_panel | flat_plank, beadboard, T&G, coffered |
| Height modifier | Varies by room (H1-H4) | Varies by room (H1-H4), same modifiers apply |
| Inspection | Eye-level or near | Looking up, requires angled light |
| Protection zones | floor_perimeter, ceiling_line | floor_full/perimeter, wall_upper_band, fixture_covers, opening_cover_lightweight |

---

## 14. Site Condition Analysis

| Condition ID | Affected Task Types | Include Values | Exclude Values | Notes |
|--------------|---------------------|----------------|----------------|-------|
| floor_type | protect | finished, partial | subfloor | Floor protection required when finished floors present |
| occupancy_state | protect | occupied_crew_handles, occupied_sensitive | vacant | Additional protection when occupied — furniture and belongings below ceiling work |
| temperature_condition | apply, prime | — | — | Modifier on dry times per temperature range. Overhead surfaces may cure differently due to heat stratification (warm air rises). |
| ventilation_condition | apply, prime | — | — | Extended dry times in limited/poor ventilation. Ceiling height affects air circulation near work surface. |
| access_constraint | all | step_ladder, extension_ladder, scaffold, lift | none | Overhead work always requires some access equipment. Standard ceiling = step_ladder. High ceilings = scaffold/lift. |

---

## 15. Acceptance Criteria

- [ ] Combined prime+paint with primer conditional on substrate_state
- [ ] SF counting for entire wood ceiling surface (ITM_WOOD_CEILING_PANEL)
- [ ] Crown molding excluded — routed to SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_CROWN)
- [ ] Standalone decorative beams excluded — routed to SF_ARCH_ELEMENT_NC
- [ ] Coffered ceiling beams INCLUDED as part of coffered ceiling system (ceiling_style=coffered)
- [ ] quality_tier minimum QT3 (QT2 not applicable for millwork)
- [ ] Sheen/QT gate enforced: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only
- [ ] ceiling_style (flat_plank, beadboard, tongue_and_groove, coffered) present as config dimension
- [ ] Ceiling style drives production rate complexity modifier (1.0x, 1.15x, 1.10x, 1.35x)
- [ ] substrate_state drives primer requirement: SS_BARE requires full primer, SS_PRIMED_FACTORY skips to finish
- [ ] MDF edge sealing with solvent-based sealer included as conditional prep task when substrate=MDF + SS_BARE
- [ ] MDF two-step prime process enforced: edge seal (solvent) then face primer (latex)
- [ ] FJP stain-blocking primer when substrate=FJP + SS_BARE
- [ ] Hardwood tannin-blocking primer when substrate=hardwood + SS_BARE
- [ ] QT-driven finish material system per Fine Finish Doctrine §3
- [ ] Floor protection: floor_full when spray, floor_perimeter when brush
- [ ] Wall upper band masking (wall_upper_band) when application_method=spray
- [ ] Ceiling fixture masking (fixture_covers) always
- [ ] Opening covers (opening_cover_lightweight) when spray
- [ ] Module structure follows Fine Finish combined prime+paint pattern
- [ ] Interstage between-coat cycle present at ALL quality tiers
- [ ] Between-coat sanding discipline per tier: QT3=spot, QT4=full 220, QT5=full 220-320
- [ ] Production rates reflect overhead work penalty (~0.70-0.80x of equivalent wall rates)
- [ ] Height modifier applies on top of overhead base rates (PS_META.HEIGHT_BAND)
- [ ] PS_SURFACE_SF.WOOD_CEILING proposed as new PaintScope key
- [ ] All existing PaintScope keys verified against catalog
- [ ] State declarations: input = SS_BARE or SS_PRIMED_FACTORY; output = SS_PAINTED_{sheen}
- [ ] Ceiling-to-wall junction caulking addressed in prep module
- [ ] Coffered beam-to-panel junction caulking addressed when ceiling_style=coffered
- [ ] Adjacency to wall_field declared (direct junction at wall-ceiling line)
- [ ] Context prefix WDCL used for all task and module IDs (TSK_WDCL_*, MOD_WDCL_*)

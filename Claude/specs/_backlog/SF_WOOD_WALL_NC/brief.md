# Spec Brief: SF_WOOD_WALL_NC

**Status:** queued
**Priority:** P3 (#14 in generation order)
**Authored:** 2026-02-09
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_WOOD_WALL_NC` |
| Name | New Construction Wood Wall Panel System Painting |
| Domain | interior |
| Context | NC |
| Description | Combined prime+paint spec for full-height wood paneled walls in new construction. Covers the entire wall field from floor to ceiling — boards (shiplap, tongue-and-groove) or panel assemblies (flat panel, library panel) — measured as a single SF quantity. Distinct from SF_WAINSCOT_PANEL_NC which covers lower-wall treatment (32-42" height below cap rail). Distinct from SF_DRYWALL_WALL_NC which covers gypsum board substrates. Wood walls require Fine Finish Doctrine workflow: substrate-driven primer, QT-driven finish, interstage inspect/sand/repair cycle. The wall_style dimension (flat_panel, shiplap, tongue_and_groove, library_panel) drives production rate complexity modifiers per Millwork Doctrine §7.2. Height varies (standard rooms to great rooms), so height modifier applies unlike fixed-height wainscot. Combined spec (not split prime/paint) because a wood wall is a self-contained surface with continuous finish — identical rationale to SF_WINDOW_INT_NC, SF_STAIR_RISER_NC, and SF_WAINSCOT_PANEL_NC. |

---

## 2. Scope Boundaries

### Includes
- Full-height wood wall field painting (shiplap, tongue-and-groove, flat panel, library panel)
- Board joint treatment (caulk at V-groove, tongue-and-groove, or butt joints as required by wall_style)
- Panel system rail and stile painting (library_panel style — internal framing within the panel assembly)
- Surface prep per substrate (dust removal, sanding, grain fill)
- MDF edge sealing with solvent-based sealer (conditional on substrate = MDF + SS_BARE)
- Fastener hole filling and sanding
- Caulking at wall-to-ceiling junction, wall-to-floor junction, and board/panel-to-board/panel joints
- Primer coat — conditional on substrate_state
- Finish coat application (2 coats standard, 3+ at QT5 brush per FFD §15.10.3)
- Interstage inspect/sand/repair between finish coats
- Floor protection at work zone
- Ceiling masking when spray application
- Final quality inspection

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Crown molding at ceiling line | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_CROWN) |
| Standard baseboard at floor line | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_BASEBOARD) |
| Door casing on wood wall | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_CASING_DOOR) |
| Window casing on wood wall | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_CASING_WINDOW) |
| Drywall wall field (adjacent non-wood walls) | SF_DRYWALL_WALL_NC_PRIME / SF_DRYWALL_WALL_NC_FINISH |
| Ceiling above wood wall | SF_DRYWALL_CEILING_NC_PRIME / SF_DRYWALL_CEILING_NC_FINISH |
| Wainscot panel system (lower-wall treatment, 32-42") | SF_WAINSCOT_PANEL_NC |
| Built-in shelving/bookcases mounted on wood wall | SF_BUILTIN_NC (future) |
| Wood ceiling (overhead wood surface) | SF_WOOD_CEILING_NC (future) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | QT2 not applicable — wood walls are prominent millwork per Millwork Doctrine. QT5 requires zero-defect surface with critical inspection at arm's length. |
| application_method | spray, brush | spray | Spray preferred for NC production — large flat wall areas spray efficiently. Brush for occupied spaces, small areas, detail work on library panels, or touch-up. Per FFD §15.1.1. |
| sheen | satin, semi-gloss, gloss | satin | Wood walls typically satin for softer appearance. Sheen/QT gate per FFD §4.1: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only. |
| wall_style | flat_panel, shiplap, tongue_and_groove, library_panel | flat_panel | Drives production rate complexity modifier per Millwork Doctrine §7.2. Flat_panel = standard (1.0x), shiplap = groove detail (1.15x), tongue_and_groove = tight joint (1.10x), library_panel = complex profile (1.25x). |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | SS_BARE: full primer required per substrate type. SS_PRIMED_FACTORY: skip primer, lighter prep. Standard NC delivery is factory-primed MDF, FJP, or solid wood. |

> **No coat_count dimension.** Coat count derived from quality_tier per FFD:
> - QT3 = 2 finish coats
> - QT4 = 2 finish coats
> - QT5 = 2-3 finish coats (3+ typical for brush per FFD §15.10.3)

> **Sheen/QT gate for millwork surfaces (Fine Finish Doctrine §4.1):**
> - QT3: Satin or lower
> - QT4: Any except gloss
> - QT5: Any including gloss

> **Height is NOT a config dimension.** Height varies by room (standard 8 ft to great room 18+ ft). Height modifier (MOD_HT) is applied by the estimation engine via PS_META.HEIGHT_BAND, not as a spec config dimension. This is a key distinction from SF_WAINSCOT_PANEL_NC (always H1).

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_WOOD_WALL_PANEL | Wood wall panel assembly | SF | PaintScope: PS_SURFACE_SF.WOOD_WALL. Total SF of wood wall surface from floor to ceiling. For board styles (shiplap, T&G), includes board faces and joint detail. For panel styles (flat_panel, library_panel), includes panels, internal rails/stiles, and applied molding within the panel system. | Always |

> **Design decision:** Single SF item for the entire wall surface. For library_panel style, internal framing (rails, stiles) is inherent complexity captured in the wall_style modifier, not separate line items. This matches the Millwork Doctrine §1.1 approach and parallels SF_WAINSCOT_PANEL_NC's single-item design. Board styles (shiplap, T&G) are simple board faces where joint detail is the complexity factor.

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_WOOD_WALL | PS_SURFACE_SF.WOOD_WALL | SF | Always | Total SF of wood wall surface from floor to ceiling. |
| IN_EA_ROOMS_TOTAL | PS_META.EA.ROOMS_TOTAL | EA | Always | Room-level operations (setup, cleanup). |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | Always | Floor protection at wall work zone. |
| IN_LF_PROTECT_CEILING_LINE | PS_PROTECT_LF.CEILING_LINE | LF | When spray | Ceiling masking at ceiling-wall junction for overspray containment during spray. |
| IN_SF_FLOOR_VACUUM_AREA | PS_META.SF.FLOOR_VACUUM_AREA | SF | Always | Post-work vacuum cleanup area. |

### Key Verification

**Existing keys (verified in catalog):**
- `PS_META.EA.ROOMS_TOTAL` — Section "Room / Zone meta"
- `PS_PROTECT_SF.FLOOR_PERIMETER` — Section "Floor Protection Keys (SF)"
- `PS_PROTECT_LF.CEILING_LINE` — Section "Surface-Adjacent Protection Keys (LF)"
- `PS_META.SF.FLOOR_VACUUM_AREA` — Section "Room / Zone meta"

### Proposed New Keys

| Key | UOM | Description | Justification |
|-----|-----|-------------|---------------|
| `PS_SURFACE_SF.WOOD_WALL` | SF | Total SF of wood paneled wall surface from floor to ceiling | No existing key covers full-height wood wall surfaces. PS_SURFACE_SF.WALL_FIELD is for drywall walls. PS_SURFACE_SF.WAINSCOTING is for partial-height wainscot. This surface is semantically distinct — wood substrate, fine finish doctrine, different prep and production rates. |

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | PaintScope Key | Notes |
|---------|-----------|------------------|----------------|-------|
| floor_perimeter | always | edge_only | PS_PROTECT_SF.FLOOR_PERIMETER | Drop cloth runners at base of wood wall work area. Drips, sanding dust, and debris are the primary concerns. |
| ceiling_line | when spray | light_mask | PS_PROTECT_LF.CEILING_LINE | Paper masking at the ceiling-wall junction to protect finished ceiling from overspray. Only needed for spray application. |

**Zone Source:** Protection_Zones_Reference.md v2.1

**Method-Dependent Behavior:**
- Brush application: `floor_perimeter` only
- Spray application: `floor_perimeter` + `ceiling_line` (ceiling above wood wall must be masked)

---

## 7. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| wall_panel | ceiling_field (above) | linear | different_finish (ceiling paint above vs millwork enamel on wall). Junction at ceiling-wall line. |
| wall_panel | trim_baseboard (below) | linear | same_finish or different_finish (baseboard may match or contrast with wood wall). |
| wall_panel | trim_crown (at ceiling, if present) | linear | same_finish (crown and wood wall often same color/sheen). |
| wall_panel | trim_casing_door (adjacent) | complex | same_finish (wood wall meets door casing where both are present). |
| wall_panel | trim_casing_window (adjacent) | complex | same_finish (wood wall meets window casing where both are present). |
| wall_panel | wall_field (adjacent non-wood wall) | linear | different_finish (wood wall enamel meets drywall wall paint at inside corner or transition). |

**Surface IDs verified against:** Surface_Vocabulary_Reference.md v1.0 — `wall_panel` exists in the Wall Surfaces section. All adjacent surface IDs verified.

---

## 8. State Declarations

### 8.1 Valid Input States

| Substrate State Config | Valid Input States | Notes |
|------------------------|-------------------|-------|
| SS_BARE | SS_BARE | Uncoated MDF, FJP, or solid wood wall panels/boards requiring full primer per substrate type |
| SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | Standard NC delivery — factory-primed MDF, FJP, or pre-primed boards |

### 8.2 Output State

| Output State | Varies By | Notes |
|--------------|-----------|-------|
| SS_PAINTED | sheen dimension | Output sub-state: SS_PAINTED_SATIN, SS_PAINTED_SEMIGLOSS, SS_PAINTED_GLOSS |

### 8.3 Adjacent State Protection Rules

| Adjacent Surface | When State | Protection Level | Protection Zone | Notes |
|------------------|------------|------------------|-----------------|-------|
| ceiling_field (above) | SS_BARE | none | — | Unfinished ceiling needs no protection during wood wall work |
| ceiling_field (above) | SS_PAINTED_* | light_mask | ceiling_line | Protect finished ceiling from drips or overspray when spraying wood wall |
| trim_baseboard (below) | SS_BARE | none | — | Baseboard not yet finished — no protection needed |
| trim_baseboard (below) | SS_PAINTED_* | light_mask | — | If baseboard already painted, mask top edge during wood wall work |
| wall_field (adjacent) | SS_BARE | none | — | Adjacent drywall not yet finished — no protection needed |
| wall_field (adjacent) | SS_PAINTED_* | light_mask | — | If adjacent drywall already painted, mask at transition edge during spray |

---

## 9. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Shares finish group with | SF_TRIM_NC_PAINT | Wood wall and surrounding trim (baseboard, crown, casings) often same color and sheen. Same crew, potentially same session. |
| Typical after | SF_DRYWALL_CEILING_NC_FINISH | Ceiling painted first — wood wall is detail work that follows field painting. |
| Typical after | SF_DRYWALL_WALL_NC_FINISH | Adjacent drywall walls painted first if in same rooms. |
| Typical before | SF_TRIM_NC_PAINT | Wood wall panels before linear trim detail — paint field before trim. |
| Often combined with | SF_TRIM_NC_PAINT, SF_TRIM_NC_PRIME | Same room session — wood wall + baseboard + crown + casings are all millwork in the same zone. |

---

## 10. Module Structure

Combined prime+paint spec following Fine Finish module pattern:

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_WDWL_SETUP | setup | Floor protection setup, ceiling masking (when spray), staging | binary |
| MOD_WDWL_PREP | prep | Dust wipe, sanding (full surface per QT), MDF edge sealing (conditional), fastener fill, caulk at board joints / panel-to-frame joints / wall-to-ceiling junction / wall-to-floor junction | qt_scaled |
| MOD_WDWL_PRIME | prime | Primer coat(s) per substrate type — conditional on substrate_state=SS_BARE. MDF: solvent edge seal + latex face. FJP: stain-block. Solid wood: standard primer-sealer. Hardwood: tannin-block. | qt_scaled |
| MOD_WDWL_FINISH_COAT | finish | Finish coat application. Spray: sweep passes across wall field, then detail on joints/profiles. Brush: work board-by-board (shiplap/T&G) or panel-to-frame sequence (library_panel). | qt_scaled |
| MOD_WDWL_INTERSTAGE | interstage | Between-coat inspect/sand/repair. Scuff sand 220-320 grit. Rigid block sanding per FFD §15.4.1 for leveling brush marks. | qt_scaled |
| MOD_WDWL_FINAL_INSPECT | finish | Final quality check. Visual inspection at tier-appropriate distance. Check for holidays at joints, board edges, and panel-to-frame junctions. | qt_scaled |
| MOD_WDWL_CLEANUP | cleanup | Protection teardown, floor vacuum, tool cleaning | binary |

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
| Fine Finish Doctrine | docs/Doctrine/Fine_Finish_Doctrine.md | §1.1 (Fine Finish Walls — shiplap, paneling explicitly listed), §2 (Core Principles — primer is substrate-driven), §3 (Material Systems by QT), §4 (Sheen/QT gate), §5 (Module Structure), §6 (Initial Prep Phase), §7 (Interstage Process), §8 (Scrutiny Definitions), §15 (Brush and Roll — sanding strategy, rigid block) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Sheen/QT minimums, sanding standards, inspection distances |
| Materials & Consumables | docs/Doctrine/Materials_and_Consumables_Doctrine.md | Consumable standards, caulk/spackle rates, sandpaper grades |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Floor protection, spray containment masking, ceiling line masking |

### 12b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | docs/Doctrine/Spec_Completeness_Doctrine.md | Mandatory completeness requirements |
| Modifier Registry | docs/Doctrine/Modifier_Registry.md | Canonical modifier IDs and values |
| Protection Zones Reference | docs/Reference/Protection_Zones_Reference.md | Valid zone IDs for protection tasks |
| Surface Vocabulary Reference | docs/Reference/Surface_Vocabulary_Reference.md | Valid surface IDs for adjacency |
| Site Condition Vocabulary | docs/Reference/Site_Condition_Vocabulary_Reference.md | Valid site condition IDs |
| PaintScope Quantity Key Catalog | docs/PaintScope/PaintScope_Quantity_Key_Catalog.md | Key verification |
| Spec Input to PaintScope Mapping | docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md | Key mapping validation |

---

## 13. Special Notes / Constraints

### Combined Prime+Paint Spec
Primer is conditional on substrate_state, not a separate spec. Same pattern as SF_WINDOW_INT_NC, SF_STAIR_RISER_NC, and SF_WAINSCOT_PANEL_NC. Rationale: a wood wall is a self-contained surface — primer and paint flow continuously across the entire wall field in the same session.

### Single SF Paintable Item
The wood wall surface (boards or panel assembly) is measured as ONE item in SF. For library_panel style, internal framing complexity is captured by the wall_style modifier, not by splitting into separate LF and SF items. For board styles (shiplap, T&G), joint detail complexity is captured by the wall_style modifier. This matches Millwork Doctrine §1.1 approach and parallels SF_WAINSCOT_PANEL_NC.

### Height Varies — Height Modifier Applies
Unlike SF_WAINSCOT_PANEL_NC (always H1, 32-42" height), wood walls span floor to ceiling. Standard rooms are 8-9 ft (H1), but great rooms, foyers, and stairwells may be 10-18+ ft requiring step ladders, extension ladders, or scaffolding. The height modifier (MOD_HT via PS_META.HEIGHT_BAND) applies to production rate tasks. This is NOT a config dimension — it is an environmental modifier applied by the estimation engine.

### Wall Style Drives Complexity Modifier
Per Millwork Doctrine §7.2 complexity categories:
- **flat_panel** = standard flat board or panel surface (1.0x) — simplest wood wall style
- **shiplap** = overlapping horizontal boards with V-groove at each joint, ~6-8" board width (1.15x) — many joints require attention to prevent holidays and runs in grooves
- **tongue_and_groove** = interlocking boards with tight-fitting joint, may have V-groove or smooth (1.10x) — similar to shiplap but tighter joints, slightly less groove detail
- **library_panel** = traditional raised or recessed panel system with rails, stiles, and panel fields (1.25x) — most complex, multiple profile changes, frame-to-panel transitions requiring detail work

### MDF Edge Sealing is a Task Constraint
When substrate is MDF and substrate_state is SS_BARE, the SOP MUST include solvent-based edge sealing as a separate prep task BEFORE latex face primer. This is a NON-NEGOTIABLE two-step process per Millwork Doctrine §3.1 and §4.1. Water-based primer on raw MDF edges causes irreversible fiber swelling.

### Board Joint Caulking
For board styles (shiplap, T&G), joint caulking rates are driven by board spacing density:
- **Shiplap**: ~1 joint per 6-8 inches of wall height. For an 8 ft wall, approximately 12-16 horizontal joints per LF of wall width. Joint density translates to significant caulk labor on large walls.
- **T&G**: joints are tighter and may not require caulking unless specified. When caulked, similar density to shiplap.
- **flat_panel / library_panel**: caulk at panel-to-frame joints and perimeter junctions. Similar joint density pattern to wainscot.

The caulk task should use SF as the UOM (not LF of individual joints) because the joint density is a function of the wall area and wall_style. The wall_style modifier captures this variation.

### Spray Technique for Wood Walls
Wood wall panels spray efficiently due to large flat areas. Spray technique varies by wall_style:
- **Shiplap/T&G**: Sweep horizontal passes following board direction. Maintain consistent distance to avoid pooling in grooves. Light back-brush on grooves if needed.
- **Flat_panel**: Broad sweep passes, straightforward.
- **Library_panel**: Field panels first (broad passes), then HVLP or fine-finish tip for frame detail — same technique as wainscot.

When spraying, ceiling above must be masked at ceiling-wall junction.

### Production Rate References
Millwork Doctrine §7.1 provides trim LF rates. For wood wall SF rates, derive from wall area. Key rate drivers:
- Spray finish coat: ~150-200 SF/hr (flat_panel, QT3)
- Brush finish coat: ~60-80 SF/hr (flat_panel, QT3)
- Shiplap modifier: 1.15x (groove detail attention)
- T&G modifier: 1.10x (tight joint attention)
- Library_panel modifier: 1.25x (profile detail work)
- QT4 multiplier: ~0.80x on qt_scaled tasks
- QT5 multiplier: ~0.60x on qt_scaled tasks
- Height modifier applied on top by estimation engine

### Primer Selection is Substrate-Driven, NOT QT-Driven
Per Fine_Finish_Doctrine §2.1: primer requirement is driven by substrate condition and system specification, not quality tier. The key distinction is substrate TYPE (MDF vs FJP vs solid wood) which determines primer chemistry.

### Distinction from Wainscot
| Attribute | SF_WAINSCOT_PANEL_NC | SF_WOOD_WALL_NC |
|-----------|---------------------|-----------------|
| Coverage | Lower wall only (32-42") | Floor to ceiling |
| Height | Always H1 | Varies (H1-H3+) |
| Cap rail | Excluded (separate trim) | No cap rail concept |
| Top junction | Meets cap rail | Meets ceiling directly |
| Typical rooms | Dining room, hallways | Accent walls, libraries, foyers |
| wall_style values | flat_panel, raised_panel, beadboard | flat_panel, shiplap, tongue_and_groove, library_panel |

---

## 14. Site Condition Analysis

| Condition ID | Affected Task Types | Include Values | Exclude Values | Notes |
|--------------|---------------------|----------------|----------------|-------|
| floor_type | protect | finished, partial | subfloor | Floor protection required when finished floors present |
| occupancy_state | protect | occupied_crew_handles, occupied_sensitive | vacant | Additional protection when occupied |
| temperature_condition | apply, prime | — | — | Modifier on dry times per temperature range |
| ventilation_condition | apply, prime | — | — | Extended dry times in limited/poor ventilation |

---

## 15. Acceptance Criteria

- [ ] Combined prime+paint with primer conditional on substrate_state
- [ ] SF counting for entire wood wall surface (ITM_WOOD_WALL_PANEL)
- [ ] Crown molding excluded — routed to SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_CROWN)
- [ ] Standard baseboard excluded — routed to SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT
- [ ] quality_tier minimum QT3 (QT2 not applicable for millwork)
- [ ] Sheen/QT gate enforced: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only
- [ ] wall_style (flat_panel, shiplap, tongue_and_groove, library_panel) present as config dimension
- [ ] Wall style drives production rate complexity modifier (1.0x, 1.15x, 1.10x, 1.25x)
- [ ] substrate_state drives primer requirement: SS_BARE requires full primer, SS_PRIMED_FACTORY skips to finish
- [ ] MDF edge sealing with solvent-based sealer included as conditional prep task when substrate=MDF + SS_BARE
- [ ] MDF two-step prime process enforced: edge seal (solvent) then face primer (latex)
- [ ] FJP stain-blocking primer when substrate=FJP + SS_BARE
- [ ] Hardwood tannin-blocking primer when substrate=hardwood + SS_BARE
- [ ] QT-driven finish material system per Fine Finish Doctrine §3
- [ ] Floor protection (floor_perimeter) mandatory from setup to cleanup
- [ ] Ceiling masking (ceiling_line) when application_method=spray
- [ ] Module structure follows Fine Finish combined prime+paint pattern
- [ ] Interstage between-coat cycle present at ALL quality tiers
- [ ] Between-coat sanding discipline per tier: QT3=spot, QT4=full 220, QT5=full 220-320
- [ ] Rigid block sanding specified for defect leveling per FFD §15.4.1
- [ ] PS_SURFACE_SF.WOOD_WALL proposed as new PaintScope key
- [ ] All existing PaintScope keys verified against catalog
- [ ] State declarations: input = SS_BARE or SS_PRIMED_FACTORY; output = SS_PAINTED_{sheen}
- [ ] Height modifier applies (NOT fixed H1 like wainscot) — PS_META.HEIGHT_BAND used by estimation engine
- [ ] Wall_style-specific joint caulking addressed in prep module
- [ ] Adjacency to ceiling_field declared (direct junction, no cap rail intermediary)

---

## 16. Resolved Questions

### Q1: UOM Approach — **RESOLVED**
~~Should library_panel internal rails and stiles be separate paintable items (LF) or combined into one SF measurement?~~

**Resolution:** Combined SF. One ITM_WOOD_WALL_PANEL item measured as SF of wall area covered. Internal framing is inherent complexity captured by wall_style modifier, not separate scope. Matches Millwork Doctrine §1.1 and parallels SF_WAINSCOT_PANEL_NC.

### Q2: Wall Style Values — **RESOLVED**
~~How many wall styles should drive production rates?~~

**Resolution:** Four styles: flat_panel (1.0x), shiplap (1.15x), tongue_and_groove (1.10x), library_panel (1.25x). Covers all common NC wood wall types. Modifiers derived from Millwork Doctrine §7.2 complexity categories. Board-and-batten is excluded — it is a vertical board + flat strip style that doesn't have the groove/joint complexity of shiplap/T&G. If needed, it would be a future addition (similar complexity to flat_panel, ~1.05x).

### Q3: Height Handling — **RESOLVED**
~~Should height be a configuration dimension?~~

**Resolution:** No. Height is an environmental factor that varies by room, not a spec design choice. The estimation engine applies MOD_HT via PS_META.HEIGHT_BAND. This is a key distinction from SF_WAINSCOT_PANEL_NC which is always H1.

### Q4: Roll Application — **RESOLVED**
~~Should roll (or roll_and_tip) be included as an application method?~~

**Resolution:** Not as a config dimension. Roll_and_tip is a valid technique for board-style walls (shiplap, T&G) but the Fine Finish Doctrine §15 governs brush/roll technique under the "brush" method umbrella. Keeping spray and brush as the two methods matches the wainscot pattern. If the estimation engine needs roll-specific rates, it can be addressed as a future enhancement.

### Q5: Baseboard Handling — **RESOLVED**
~~Should baseboard below wood wall be included or excluded?~~

**Resolution:** Exclude to trim spec. Standard baseboard at the base of a wood wall is independently scoped in SF_TRIM_NC_PAINT (ITM_TRIM_BASEBOARD). The wood wall meets the baseboard at a linear junction. The baseboard may be the same or different finish group.

# Spec Brief: SF_WAINSCOT_PANEL_NC

**Status:** queued
**Priority:** P3 (#13 in catalog)
**Authored:** 2026-02-09
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_WAINSCOT_PANEL_NC` |
| Name | New Construction Wainscot Panel System Painting |
| Domain | interior |
| Context | NC |
| Description | Combined prime+paint spec for wainscot panel systems in new construction. Covers the panel assembly below the cap rail — panels (flat, raised, or beadboard), internal rails, stiles, and base rail — measured as a single SF quantity. The cap rail at top is excluded (handled by SF_TRIM_NC_PRIME/PAINT as ITM_TRIM_WAINSCOT_RAIL). Standard baseboard below wainscot is also excluded to the trim spec. Substrate types include MDF, FJP, and solid wood, each requiring different primer chemistry when bare. Combined spec (not split prime/paint) because wainscot is a self-contained assembly with continuous surfaces that flow between components — identical rationale to SF_WINDOW_INT_NC and SF_STAIR_RISER_NC. Material systems follow Fine Finish Doctrine: primer is substrate-driven, finish is QT-driven. The wainscot_type dimension (flat_panel, raised_panel, beadboard) drives production rate complexity modifiers per Millwork Doctrine §7.2. |

---

## 2. Scope Boundaries

### Includes
- Wainscot panel field painting (flat recessed, flat raised, raised panel, beadboard)
- Internal rail painting (horizontal framing members within the wainscot assembly)
- Internal stile painting (vertical framing members within the wainscot assembly)
- Base rail painting (bottom horizontal member of the wainscot frame)
- Applied panel molding within the assembly (decorative trim creating panel look on flat panels)
- Surface prep per substrate (dust removal, sanding, grain fill)
- MDF edge sealing with solvent-based sealer (conditional on substrate = MDF + SS_BARE)
- Fastener hole filling and sanding
- Caulking at panel-to-rail joints, panel-to-stile joints, wainscot-to-wall junction
- Primer coat — conditional on substrate_state
- Finish coat application (2 coats standard, 3+ at QT5 brush per FFD §15.10.3)
- Interstage inspect/sand/repair between finish coats
- Floor protection at work zone
- Final quality inspection

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Wainscot cap rail (top horizontal trim) | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_WAINSCOT_RAIL) |
| Chair rail (when used instead of cap rail) | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_CHAIR_RAIL) |
| Standard baseboard below wainscot | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_BASEBOARD) |
| Wall field above wainscot | SF_DRYWALL_WALL_NC_PRIME / SF_DRYWALL_WALL_NC_FINISH |
| Wall panel molding above wainscot (decorative applied mold on drywall) | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_PANEL_MOLD) |
| Coffered ceiling panels | Future SF_ARCH_ELEMENT_NC |
| Full-height wood paneling (floor to ceiling) | Future SF_WOOD_WALL_NC |
| Cabinet wainscot (kitchen/bath cabinet-style lower wall) | Future SF_CABINET_NC_PAINT |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | QT2 not applicable — wainscot is prominent millwork per Millwork Doctrine. QT5 requires zero-defect surface with critical inspection at arm's length. |
| application_method | spray, brush | spray | Spray preferred for NC production — large flat panels spray efficiently. Brush for occupied spaces, small areas, or touch-up. Per FFD §15.1.1. |
| sheen | satin, semi-gloss, gloss | satin | Wainscot typically satin for softer appearance. Sheen/QT gate per FFD §4.1: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only. |
| wainscot_type | flat_panel, raised_panel, beadboard | flat_panel | Drives production rate complexity modifier per Millwork Doctrine §7.2. Flat_panel = standard (1.0×), raised_panel = complex profile (1.25×), beadboard = groove detail (1.15×). |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | SS_BARE: full primer required per substrate type. SS_PRIMED_FACTORY: skip primer, lighter prep. Standard NC delivery is factory-primed MDF or FJP. |

> **No coat_count dimension.** Coat count derived from quality_tier per FFD:
> - QT3 = 2 finish coats
> - QT4 = 2 finish coats
> - QT5 = 2-3 finish coats (3+ typical for brush per FFD §15.10.3)

> **Sheen/QT gate for millwork surfaces (Fine Finish Doctrine §4.1):**
> - QT3: Satin or lower
> - QT4: Any except gloss
> - QT5: Any including gloss

> **No height dimension.** Standard wainscot is 32-42 inches tall (always H1). All work performed standing or kneeling. No access equipment required.

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_WAINSCOT_PANEL | Wainscot panel assembly | SF | PaintScope: PS_SURFACE_SF.WAINSCOTING. Total SF of wainscot assembly below cap rail — includes panels, internal rails/stiles, base rail, and applied molding. Measured as wall area covered by wainscot system. | Always |

> **Design decision:** Single SF item for the entire assembly. Internal framing (rails, stiles, base rail) is inherent complexity captured in the wainscot_type modifier, not separate line items. This matches the Millwork Doctrine §1.1 approach: wainscoting measured as SF.

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_WAINSCOT | PS_SURFACE_SF.WAINSCOTING | SF | Always | Total SF of wainscot panel assembly. Measured as wall area covered below cap rail. |
| IN_EA_ROOMS_TOTAL | PS_META.EA.ROOMS_TOTAL | EA | Always | Room-level operations (setup, cleanup). |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | Always | Floor protection at wainscot work zone. |
| IN_LF_PROTECT_WALL_ADJACENT | PS_PROTECT_LF.WALL_ADJACENT | LF | When spray | Wall masking above wainscot for overspray containment during spray. |
| IN_SF_FLOOR_VACUUM_AREA | PS_META.SF.FLOOR_VACUUM_AREA | SF | Always | Post-work vacuum cleanup area. |

### Key Verification

**Existing keys (verified in catalog):**
- `PS_META.EA.ROOMS_TOTAL` — Section "Room / Zone meta"
- `PS_PROTECT_SF.FLOOR_PERIMETER` — Section "Floor Protection Keys (SF)"
- `PS_PROTECT_LF.WALL_ADJACENT` — Section "Surface-Adjacent Protection Keys (LF)"
- `PS_META.SF.FLOOR_VACUUM_AREA` — Section "Room / Zone meta"

### Proposed New Keys

| Key | UOM | Description | Justification |
|-----|-----|-------------|---------------|
| `PS_SURFACE_SF.WAINSCOTING` | SF | Total SF of wainscot panel assembly below cap rail | Defined in Millwork Doctrine §1.1 but not yet in PaintScope catalog active entries. Required as the primary input for this spec. Measured as wall area covered by wainscot system. |

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | PaintScope Key | Notes |
|---------|-----------|------------------|----------------|-------|
| floor_perimeter | always | edge_only | PS_PROTECT_SF.FLOOR_PERIMETER | Drop cloth runners at base of wainscot work area. Wainscot is low to floor — drips and sanding dust are the primary concerns. |
| wall_adjacent | when spray | light_mask | PS_PROTECT_LF.WALL_ADJACENT | Paper masking above the wainscot cap rail line to protect finished wall field from overspray. Only needed for spray application. |

**Zone Source:** Protection_Zones_Reference.md v2.1

**Method-Dependent Behavior:**
- Brush application: `floor_perimeter` only
- Spray application: `floor_perimeter` + `wall_adjacent` (wall above wainscot must be masked)

---

## 7. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| wainscot_panel | wall_field (above) | linear | different_finish (wall paint above vs millwork enamel below). Junction at cap rail line. |
| wainscot_panel | trim_wainscot_rail (cap rail) | linear | same_finish (cap rail and wainscot typically same color/sheen) |
| wainscot_panel | trim_baseboard (below, if present) | linear | same_finish or different_finish (baseboard may match or contrast) |
| wainscot_panel | trim_casing_door (adjacent) | complex | same_finish (wainscot meets door casing where both are present) |
| wainscot_panel | trim_casing_window (adjacent) | complex | same_finish (wainscot meets window casing where both are present) |

**Surface IDs verified against:** Surface_Vocabulary_Reference.md v1.0 — `wainscot_panel`, `wainscot_rail`, `wainscot_stile`, `wainscot_cap` all exist in the Millwork Surfaces section.

---

## 8. State Declarations

### 8.1 Valid Input States

| Substrate State Config | Valid Input States | Notes |
|------------------------|-------------------|-------|
| SS_BARE | SS_BARE | Uncoated MDF, FJP, or solid wood wainscot requiring full primer per substrate type |
| SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | Standard NC delivery — factory-primed MDF or FJP panels |

### 8.2 Output State

| Output State | Varies By | Notes |
|--------------|-----------|-------|
| SS_PAINTED | sheen dimension | Output sub-state: SS_PAINTED_SATIN, SS_PAINTED_SEMIGLOSS, SS_PAINTED_GLOSS |

### 8.3 Adjacent State Protection Rules

| Adjacent Surface | When State | Protection Level | Protection Zone | Notes |
|------------------|------------|------------------|-----------------|-------|
| wall_field (above) | SS_BARE | none | — | Unfinished wall above needs no protection during wainscot work |
| wall_field (above) | SS_PAINTED_* | light_mask | wall_adjacent | Protect finished wall from drips or overspray when spraying wainscot |
| trim_wainscot_rail (cap) | SS_BARE | none | — | Cap rail not yet finished — no protection needed |
| trim_wainscot_rail (cap) | SS_PAINTED_* | light_mask | — | If cap rail already painted, mask top edge during wainscot spray |
| trim_baseboard (below) | SS_PAINTED_* | light_mask | — | If baseboard already painted, mask top edge during wainscot work |

---

## 9. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Shares finish group with | SF_TRIM_NC_PAINT | Wainscot and cap rail/trim often same color and sheen. Same crew, potentially same session. |
| Typical after | SF_DRYWALL_WALL_NC_FINISH | Wall above wainscot painted first — wainscot is detail work that follows field painting. |
| Typical before | SF_TRIM_NC_PAINT | Wainscot panels before cap rail trim — paint field before linear trim detail. |
| Often combined with | SF_TRIM_NC_PAINT, SF_TRIM_NC_PRIME | Same room session — wainscot panel + cap rail + baseboard are all millwork in the same zone. |

---

## 10. Module Structure

Combined prime+paint spec following Fine Finish module pattern:

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_WNSC_SETUP | setup | Floor protection setup, wall masking above cap rail (when spray), staging | binary |
| MOD_WNSC_PREP | prep | Dust wipe, sanding (full surface per QT), MDF edge sealing (conditional), fastener fill, caulk at panel-to-frame joints and wainscot-to-wall junction | qt_scaled |
| MOD_WNSC_PRIME | prime | Primer coat(s) per substrate type — conditional on substrate_state=SS_BARE. MDF: solvent edge seal + latex face. FJP: stain-block. Solid wood: standard primer-sealer. | qt_scaled |
| MOD_WNSC_FINISH_COAT | finish | Finish coat application. Spray: panels first, then detail on rails/stiles. Brush: work panel-to-frame sequence. | qt_scaled |
| MOD_WNSC_INTERSTAGE | interstage | Between-coat inspect/sand/repair. Scuff sand 220-320 grit. Rigid block sanding per FFD §15.4.1 for leveling brush marks. | qt_scaled |
| MOD_WNSC_FINAL_INSPECT | finish | Final quality check. Visual inspection at tier-appropriate distance. Check for holidays at panel-to-frame junctions. | qt_scaled |
| MOD_WNSC_CLEANUP | cleanup | Protection teardown, floor vacuum, tool cleaning | binary |

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
| FJP | Stain-blocking primer | Block resin bleed-through at finger joints | SYS_PRIMER_POPLAR_STAINBLOCK (or FJP equivalent) |
| Solid wood (softwood) | Standard primer-sealer | Seal, tooth, block minor stains | New: SYS_PRIMER_WOOD_STANDARD_WAINSCOT |
| Solid wood (hardwood) | Tannin-blocking primer | Block tannin bleed-through | SYS_PRIMER_HARDWOOD_TANNINBLOCK |
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
| Millwork NC Paint Doctrine | docs/Doctrine/Millwork_NC_Paint_Doctrine.md | §1.1 (Wainscoting: SF, PS_SURFACE_SF.WAINSCOTING), §2 (Substrate Classification), §3 (Surface Preparation Matrix), §4 (Primer Systems), §6 (Quality Tier Matrix), §7 (Productivity Benchmarks — trim rates, complexity modifiers) |
| Fine Finish Doctrine | docs/Doctrine/Fine_Finish_Doctrine.md | §2 (Core Principles — primer is substrate-driven), §3 (Material Systems by QT), §4 (Sheen/QT gate), §5 (Module Structure), §6 (Initial Prep Phase), §7 (Interstage Process), §8 (Scrutiny Definitions), §15 (Brush and Roll — sanding strategy, rigid block, Roll and Tip) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Sheen/QT minimums, sanding standards, inspection distances |
| Materials & Consumables | docs/Doctrine/Materials_and_Consumables_Doctrine.md | §consumable standards, caulk/spackle rates, sandpaper grades |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Floor protection, spray containment masking |

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
Primer is conditional on substrate_state, not a separate spec. Same pattern as SF_WINDOW_INT_NC and SF_STAIR_RISER_NC. Rationale: wainscot is a self-contained assembly — primer and paint flow continuously across panels, rails, and stiles in the same session.

### Single SF Paintable Item
The wainscot assembly (panels + internal rails + stiles + base rail + applied molding) is measured as ONE item in SF. Internal framing complexity is captured by the wainscot_type modifier, not by splitting into separate LF and SF items. This matches Millwork Doctrine §1.1 which lists wainscoting as SF-based.

### Cap Rail Exclusion
The cap rail / wainscot top rail is explicitly EXCLUDED from this spec. It is handled by SF_TRIM_NC_PRIME and SF_TRIM_NC_PAINT as `ITM_TRIM_WAINSCOT_RAIL` (LF-based, PS_SURFACE_LF.TRIM_WAINSCOT_RAIL). The cap rail is trim; the panel system below it is millwork. Same scope boundary logic as door casing (trim) vs door slab (separate spec).

### Baseboard Exclusion
Standard baseboard below wainscot is handled by the trim spec (ITM_TRIM_BASEBOARD). Many wainscot installations have regular baseboard at the bottom; it may be the same or different finish group. When different finish group, it is independently scoped in SF_TRIM_NC_PAINT. The wainscot base rail (internal bottom frame member of the assembly) IS included in this spec's SF measurement.

### MDF Edge Sealing is a Task Constraint
When substrate is MDF and substrate_state is SS_BARE, the SOP MUST include solvent-based edge sealing as a separate prep task BEFORE latex face primer. This is a NON-NEGOTIABLE two-step process per Millwork Doctrine §3.1 and §4.1. Water-based primer on raw MDF edges causes irreversible fiber swelling.

### Wainscot Type Drives Complexity Modifier
Per Millwork Doctrine §7.2:
- **flat_panel** = standard profile (1.0×) — flat panels with simple frame
- **raised_panel** = complex profile (1.25×) — 3D panel faces with detail edges, more cutting-in
- **beadboard** = groove detail (1.15×) — uniform vertical grooves require additional attention but technique is consistent

### Spray Technique for Wainscot
Wainscot panels spray efficiently due to large flat areas. The key challenge is detail at panel-to-frame junctions and frame profiles. Spray technique: field panels first (broad passes), then HVLP or fine-finish tip for frame detail. When spraying, wall above must be masked at cap rail line. Backroll optional on flat panels for texture management.

### Production Rate References
Millwork Doctrine §7.1 provides trim LF rates. For wainscot SF rates, derive from the panel area. Key rate drivers:
- Spray finish coat: ~150-200 SF/hr (flat panel, QT3)
- Brush finish coat: ~60-80 SF/hr (flat panel, QT3)
- Raised panel modifier: 1.25× (more detail work at edges)
- Beadboard modifier: 1.15× (groove filling/attention)
- QT4 multiplier: ~0.80× on qt_scaled tasks
- QT5 multiplier: ~0.60× on qt_scaled tasks

### Primer Selection is Substrate-Driven, NOT QT-Driven
Per Fine_Finish_Doctrine §2.1: primer requirement is driven by substrate condition and system specification, not quality tier. The key distinction is substrate TYPE (MDF vs FJP vs solid wood) which determines primer chemistry.

---

## 14. Site Condition Analysis

| Condition ID | Affected Task Types | Include Values | Exclude Values | Notes |
|--------------|---------------------|----------------|----------------|-------|
| floor_type | protect | finished, partial | subfloor | Floor protection required when finished floors present |
| occupancy_state | protect | occupied_crew_handles, occupied_sensitive | vacant | Additional protection when occupied |

---

## 15. Acceptance Criteria

- [ ] Combined prime+paint with primer conditional on substrate_state
- [ ] SF counting for entire wainscot panel assembly (ITM_WAINSCOT_PANEL)
- [ ] Cap rail excluded — routed to SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT (ITM_TRIM_WAINSCOT_RAIL)
- [ ] Standard baseboard excluded — routed to SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT
- [ ] quality_tier minimum QT3 (QT2 not applicable for millwork)
- [ ] Sheen/QT gate enforced: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only
- [ ] wainscot_type (flat_panel, raised_panel, beadboard) present as config dimension
- [ ] Wainscot type drives production rate complexity modifier (1.0×, 1.25×, 1.15×)
- [ ] substrate_state drives primer requirement: SS_BARE requires full primer, SS_PRIMED_FACTORY skips to finish
- [ ] MDF edge sealing with solvent-based sealer included as conditional prep task when substrate=MDF + SS_BARE
- [ ] MDF two-step prime process enforced: edge seal (solvent) then face primer (latex)
- [ ] FJP stain-blocking primer when substrate=FJP + SS_BARE
- [ ] Hardwood tannin-blocking primer when substrate=hardwood + SS_BARE
- [ ] QT-driven finish material system per Fine Finish Doctrine §3
- [ ] Floor protection (floor_perimeter) mandatory from setup to cleanup
- [ ] Wall adjacent masking when application_method=spray
- [ ] Module structure follows Fine Finish combined prime+paint pattern
- [ ] Interstage between-coat cycle present at ALL quality tiers
- [ ] Between-coat sanding discipline per tier: QT3=spot, QT4=full 220, QT5=full 220-320
- [ ] Rigid block sanding specified for defect leveling per FFD §15.4.1
- [ ] PS_SURFACE_SF.WAINSCOTING proposed as new PaintScope key
- [ ] All existing PaintScope keys verified against catalog
- [ ] State declarations: input = SS_BARE or SS_PRIMED_FACTORY; output = SS_PAINTED_{sheen}
- [ ] H1 height assumed for all tasks (wainscot is always below waist height)

---

## 16. Resolved Questions

### Q1: UOM Approach — **RESOLVED**
~~Should internal rails and stiles be separate paintable items (LF) or combined into one SF measurement?~~

**Resolution:** Combined SF. One ITM_WAINSCOT_PANEL item measured as SF of wall area covered. Internal framing is inherent complexity captured by wainscot_type modifier, not separate scope. Matches Millwork Doctrine §1.1.

### Q2: Wainscot Types — **RESOLVED**
~~How many wainscot type variants should drive production rates?~~

**Resolution:** Three types: flat_panel (1.0×), raised_panel (1.25×), beadboard (1.15×). Covers all common NC wainscot. Modifiers derived from Millwork Doctrine §7.2 complexity categories.

### Q3: Baseboard Handling — **RESOLVED**
~~Should baseboard below wainscot be included or excluded?~~

**Resolution:** Exclude to trim spec. Many installations have regular baseboard that may be same or different finish group. The wainscot base rail (internal bottom frame member) IS captured in the assembly SF. Standard baseboard is independently scoped in SF_TRIM_NC_PAINT.

### Q4: Height Modifiers — **RESOLVED**
~~Should height be a configuration dimension?~~

**Resolution:** No. Standard wainscot is 32-42 inches tall — always H1. No access equipment needed. All work performed standing or kneeling. Full-height paneling (foyer, library, floor-to-ceiling) would be a separate spec (SF_WOOD_WALL_NC, future P3).

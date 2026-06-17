# Spec Brief: SF_STAIR_RAILING_NC

**Status:** generated
**Priority:** P2 (#12 in catalog)
**Authored:** 2026-02-08
**Author:** Spec Researcher Agent

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_STAIR_RAILING_NC` |
| Name | New Construction Stair Railing System Painting |
| Domain | interior |
| Context | NC |
| Description | Combined prime+paint spec for stair railing systems (balusters/spindles, newel posts, handrails, base rails) in new construction. Covers wood, iron, and composite substrates. Railing systems are high-detail, multi-component assemblies with the highest per-unit labor density of any stairway component. Primer is conditional on substrate_state (SS_BARE wood requires wood primer, SS_POWDER_COATED iron requires bonding/DTM primer, SS_PRIMED_FACTORY skips to finish). Balusters use EA counting; handrails and base rails use LF counting; newel posts use EA counting. The railing_type dimension (all_wood vs iron_and_wood) drives primer chemistry selection for balusters. Combined spec (not split prime/paint) because stairway work is a self-contained zone with dedicated staging, shared tread protection, and same-session execution — identical rationale to SF_STAIR_RISER_NC. Material systems follow Fine Finish Doctrine: primer is substrate-driven, finish is QT-driven. Canonical sequence per Stairway_Systems_Doctrine Section 3.2: balusters (#5) before newels (#6) before handrails (#7). |

---

## 2. Scope Boundaries

### Includes
- Baluster/spindle priming and painting (wood square, wood turned, iron, composite)
- Newel post priming and painting (wood solid, wood box, composite)
- Handrail priming and painting (wood, composite)
- Base rail / shoe rail priming and painting (when present in system)
- Surface prep per substrate (dust removal, sanding, grain fill)
- Iron baluster solvent cleaning per SSPC-SP 1 (mandatory for all metal)
- Iron baluster scuff-sand for powder-coated surfaces (180-220 grit)
- Baluster-to-handrail junction finishing (artist brush cut-in or taping per technique selection)
- Baluster-to-tread/base-rail junction finishing
- Newel post detail finishing (caps, rosettes, flutes)
- Handrail bracket removal and reinstall (QT4+ per doctrine 12.1)
- Caulk at newel-to-tread junction and newel-to-handrail junction
- Fastener hole filling and sanding
- Tread protection maintenance (shared with SF_STAIR_RISER_NC — treads MUST remain protected)
- Floor protection at landings
- Primer coat — conditional on substrate_state
- Finish coat application (2 coats standard, 3+ at QT5 brush per FFD 15.10.3)
- Interstage inspect/sand/repair between finish coats
- Optional polyurethane topcoat on handrails (maximum hand-oil resistance, QT5)
- Final quality inspection including "feel test" on handrails at QT5

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Stair risers | SF_STAIR_RISER_NC |
| Stair stringers / skirtboards | SF_STAIR_RISER_NC |
| Stair treads (floor-rated coating, absolutely last per doctrine) | SF_STAIR_TREAD_NC (future) |
| Stair tread landings (floor-rated coating) | SF_STAIR_TREAD_NC (future) |
| Decorative shoes at baluster base | Not a painting scope — installed after tread/baluster finishing per doctrine 4.4 |
| Stairwell walls | SF_DRYWALL_WALL_NC_PRIME / SF_DRYWALL_WALL_NC_FINISH |
| Stairwell ceilings | SF_DRYWALL_CEILING_NC_PRIME / SF_DRYWALL_CEILING_NC_FINISH |
| Standard baseboard at landing level | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT |
| Window stool/apron in stairwell | SF_TRIM_NC_PRIME / SF_TRIM_NC_PAINT |
| Exterior railing components | Future exterior spec |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | QT2 not applicable — stairways are scrutinized, prominent surfaces per Stairway_Systems_Doctrine Section 10.1. QT5 requires glass-smooth finish, feel test on handrails. |
| application_method | brush, spray | brush | Brush default for detail work. Spray available for large baluster counts but requires extensive containment masking. HVLP preferred over airless for in-place baluster work per doctrine 6.3. |
| sheen | satin, semi-gloss, gloss | semi-gloss | Per doctrine 7.2: balusters satin/semi-gloss/gloss, newels semi-gloss/gloss, handrails semi-gloss/gloss. High sheen = maximum durability on high-touch surfaces. Sheen/QT gate: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only. |
| railing_type | all_wood, iron_and_wood | all_wood | All_wood: all components are wood/composite. Iron_and_wood: balusters are iron/steel, newels and handrails are wood. Drives primer chemistry for balusters. |
| baluster_profile | square, turned | square | Square balusters: simple rectangular profile, 3-5 min/EA per coat. Turned/ornate balusters: complex curved profiles, 5-10 min/EA per coat. Only applies when railing_type=all_wood (iron balusters are always straight/scrollwork profile). |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY, SS_POWDER_COATED | SS_PRIMED_FACTORY | SS_BARE: full primer required (wood or DTM for iron). SS_PRIMED_FACTORY: skip primer, lighter prep. SS_POWDER_COATED: bonding primer after scuff-sand (iron balusters only, when railing_type=iron_and_wood). |

> **No coat_count dimension.** Coat count derived from quality_tier per doctrine:
> - QT3 = 2 finish coats
> - QT4 = 2 finish coats
> - QT5 = 2-3 finish coats (3+ typical for brush per FFD 15.10.3)

> **Sheen/QT gate for trim surfaces (Fine Finish Doctrine Section 4.1):**
> - QT3: Satin or lower
> - QT4: Any except gloss
> - QT5: Any including gloss

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_STAIR_BALUSTER | Baluster / spindle | EA | PaintScope: PS_SURFACE_EA.STAIR_BALUSTER. Count of individual balusters. Typical: 3 per tread (code minimum), 62+ for a standard flight system. | Always |
| ITM_STAIR_NEWEL | Newel post | EA | PaintScope: PS_SURFACE_EA.STAIR_NEWEL. Count of newel posts (typically 2-4 per flight: bottom, top, plus landing/turn newels). | Always |
| ITM_STAIR_HANDRAIL | Handrail | LF | PaintScope: PS_SURFACE_LF.STAIR_HANDRAIL. Total LF of handrail runs. Includes top surface, both sides, and underside. | Always |
| ITM_STAIR_BASE_RAIL | Base rail / shoe rail | LF | PaintScope: PS_SURFACE_LF.STAIR_BASE_RAIL. Total LF of base rail at bottom of baluster system. | When system has base rail (not all railing systems include one — many have balusters set directly into treads) |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_EA_STAIR_BALUSTER | PS_SURFACE_EA.STAIR_BALUSTER | EA | Always | Count of individual balusters to paint. Typical residential: 3 per tread × 13 treads = 39 balusters per flight. Large systems: 62+ balusters. |
| IN_EA_STAIR_NEWEL | PS_SURFACE_EA.STAIR_NEWEL | EA | Always | Count of newel posts. Typically 2-4 per flight system. |
| IN_LF_STAIR_HANDRAIL | PS_SURFACE_LF.STAIR_HANDRAIL | LF | Always | Total LF of handrail. Derivable from PaintScope geometry system rake_length (handrail ≈ rake_length per side + landing returns). |
| IN_LF_STAIR_BASE_RAIL | PS_SURFACE_LF.STAIR_BASE_RAIL | LF | When present | Total LF of base rail. Same measurement as handrail LF in most systems. |
| IN_SF_STAIR_TREAD_PROTECT | PS_PROTECT_SF.ASSET.STAIR_TREADS | SF | Always | Tread protection area — sourced from PaintScope Asset Catalog. Treads must be protected throughout railing work. |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | Always | Landing floor protection |
| IN_LF_PROTECT_WALL_ADJACENT | PS_PROTECT_LF.WALL_ADJACENT | LF | When spray | Wall masking for overspray containment when spraying balusters |

### Geometry System Integration

The PaintScope Stairwell Geometry System provides spatial context for this spec:

| Geometry System Key | Usage in This Spec |
|--------------------|--------------------|
| `PS_STAIRWELL.RAKE_LENGTH_FT` | Derivation input for handrail LF (handrail ≈ rake_length per side) |
| `PS_META.STAIRWELL.RISERS` | Derivation input for baluster count estimate (typically 3 per tread, treads = risers - 1) |
| `PS_STAIRWELL.MAX_WORKING_HEIGHT_FT` | Safety context — determines if upper portions of railing system require special access |
| `PS_META.STAIRWELL.STYLE` | Open stairwells may have railing on exposed side only vs. both sides |

### Key Verification

**Existing keys (verified in catalog):**
- `PS_PROTECT_SF.FLOOR_PERIMETER` — Section "Floor Protection Keys (SF)"
- `PS_PROTECT_LF.WALL_ADJACENT` — Section "Surface-Adjacent Protection Keys (LF)"
- `PS_PROTECT_SF.ASSET.STAIR_TREADS` — PaintScope Asset Catalog Section 8 (Stairs & Railings)

### Proposed New Keys

| Key | UOM | Description | Justification |
|-----|-----|-------------|---------------|
| `PS_SURFACE_EA.STAIR_BALUSTER` | EA | Count of individual balusters/spindles to paint | Component spec needs its own surface key per PaintScope rules. Balusters are the primary cost driver in railing work. |
| `PS_SURFACE_EA.STAIR_NEWEL` | EA | Count of newel posts to paint | Newels have distinct production rates from balusters — different size, complexity, and often ornate detail. |
| `PS_SURFACE_LF.STAIR_HANDRAIL` | LF | Total LF of handrail runs to paint | Handrails have distinct production rates and may receive additional polyurethane topcoat. |
| `PS_SURFACE_LF.STAIR_BASE_RAIL` | LF | Total LF of base rail / shoe rail | Conditional component — not all systems have base rails. Distinct from handrail (lower position, different access). |

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | PaintScope Key | Notes |
|---------|-----------|------------------|----------------|-------|
| stair_tread_covers | always | heavy_cover | PS_PROTECT_SF.ASSET.STAIR_TREADS | Mandatory throughout all railing work. If riser spec was completed first, tread protection should already be in place. Per doctrine Section 6.2: "Tread protection must begin before any painting starts." |
| floor_perimeter | always | edge_only | PS_PROTECT_SF.FLOOR_PERIMETER | Drop cloth runners at landing areas |
| wall_adjacent | when spray | light_mask | PS_PROTECT_LF.WALL_ADJACENT | Wall masking for overspray containment. Tape & Drape pre-taped plastic creates containment zones per doctrine 6.3. |

**Zone Source:** Protection_Zones_Reference.md v2.1 + `stair_tread_covers` zone (proposed in SF_STAIR_RISER_NC brief)

**Method-Dependent Behavior:**
- Brush application: `stair_tread_covers` + `floor_perimeter`
- Spray application: `stair_tread_covers` + `floor_perimeter` + `wall_adjacent` + baluster overspray containment (cardboard shields, Tape & Drape, HVLP preferred)

---

## 7. Adjacency Declarations

| Primary Surface | Adjacent Surface | Edge Type | Typical Relationship |
|----------------|-----------------|-----------|---------------------|
| stair_baluster | stair_handrail | complex | same_finish or different_finish (two-tone systems) |
| stair_baluster | stair_tread (below) | complex | different_finish (treads may be stain-grade, not in this spec) |
| stair_baluster | stair_base_rail | complex | same_finish (when base rail present) |
| stair_newel | stair_handrail | complex | same_finish (typically) |
| stair_newel | stair_tread (adjacent) | complex | different_finish (treads may be stain-grade) |
| stair_newel | trim_baseboard | linear | same_finish (newel base meets baseboard at landing) |
| stair_handrail | stair_baluster | complex | same_finish or different_finish (two-tone) |
| stair_handrail | wall_field | complex | different_finish (bracket attachment points) |
| stair_handrail | stair_newel | complex | same_finish (typically) |

### Proposed New Surface IDs

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `stair_baluster` | Individual baluster/spindle (wood, iron, composite). Highest per-unit labor density. | stair_handrail, stair_tread, stair_base_rail |
| `stair_newel` | Newel post (solid or box, often ornate). High-touch grip point. | stair_handrail, stair_tread, trim_baseboard |
| `stair_handrail` | Handrail (wood, composite). Constant skin contact — hardest finish required. | stair_baluster, stair_newel, wall_field |
| `stair_base_rail` | Base rail / shoe rail at bottom of baluster system. | stair_baluster, stair_tread |

**Surface IDs verified against:** Surface_Vocabulary_Reference.md v1.0 — stair railing surfaces are NEW, not yet in vocabulary. (stair_riser, stair_stringer, stair_tread were proposed in SF_STAIR_RISER_NC brief.)

---

## 8. State Declarations

### 8.1 Valid Input States

| Substrate State Config | Valid Input States | Notes |
|------------------------|-------------------|-------|
| SS_BARE | SS_BARE | Uncoated wood railing components requiring full primer |
| SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | Standard NC — wood components arrive pre-primed from mill |
| SS_POWDER_COATED | SS_POWDER_COATED | Iron balusters with factory powder coat requiring bonding primer + scuff-sand |

### 8.2 Output State

| Output State | Varies By | Notes |
|--------------|-----------|-------|
| SS_PAINTED | sheen dimension | Output sub-state: SS_PAINTED_SATIN, SS_PAINTED_SEMIGLOSS, SS_PAINTED_GLOSS |

### 8.3 Adjacent State Protection Rules

| Adjacent Surface | When State | Protection Level | Protection Zone | Notes |
|------------------|------------|------------------|-----------------|-------|
| wall_field | SS_BARE, SS_PRIMED_FIELD | none | — | Unfinished walls need no protection during railing work |
| wall_field | SS_PAINTED_* | light_mask | wall_adjacent | Protect finished walls from drips or overspray |
| stair_tread | any | heavy_cover | stair_tread_covers | Treads ALWAYS protected regardless of state |
| stair_riser | SS_PAINTED_* | light_mask | — | If risers already painted, mask riser tops during baluster/newel work |

---

## 9. Relationships

| Relationship | Spec IDs | Notes |
|-------------|----------|-------|
| Often same session | SF_STAIR_RISER_NC | Same staging, shared tread protection, same crew. Risers/stringers before railing per canonical sequence. |
| Typical before | SF_STAIR_TREAD_NC (future) | Treads are ALWAYS the final component per doctrine Section 3.2 |
| Shares finish group with | SF_TRIM_NC_PAINT | Railing often same color/sheen as room trim |
| Typical after | SF_STAIR_RISER_NC | Riser/stringer work precedes railing per canonical sequence (#4 stringers, #5 balusters) |
| Typical after | SF_DRYWALL_WALL_NC_FINISH | Stairwell walls finished before railing work begins |
| Sequencing within spec | Balusters → Newels → Handrails | Per canonical sequence: balusters (#5), newels (#6), handrails (#7) per doctrine Section 3.2 |

---

## 10. Module Structure

Combined prime+paint spec following Fine Finish module pattern:

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| MOD_STRL_SETUP | Setup | Tread protection verification, landing floor protection, staging, containment setup (spray) | binary |
| MOD_STRL_PREP | Prep | Iron baluster solvent clean (SSPC-SP 1), scuff-sand powder coat, wood sanding, fill holes, caulk joints (newel-to-tread, newel-to-handrail), bracket removal (QT4+) | qt_scaled |
| MOD_STRL_PRIME | Prime | Primer coat(s) per substrate — conditional on substrate_state. Wood: standard millwork primer. Iron: DTM acrylic. Powder coat: bonding primer. | qt_scaled |
| MOD_STRL_FINISH_COAT | Finish | Finish coat application in canonical sequence: balusters first (#5), then newels (#6), then handrails (#7). Two-tone systems: light color first (balusters), dark color last (handrail). | qt_scaled |
| MOD_STRL_INTERSTAGE | Interstage | Inspect/sand/repair between finish coats. Scuff sand 220-320 grit. "Nib" removal critical on handrails (feel test at QT5). | qt_scaled |
| MOD_STRL_FINAL_INSPECT | Finish | Final quality check. Visual at all tiers. Feel test on handrails at QT5. | qt_scaled |
| MOD_STRL_CLEANUP | Cleanup | Bracket reinstall (QT4+), containment removal (spray), tread protection remains if tread work follows | binary |

**Workflow sequence:**
```
SETUP → PREP → PRIME (conditional) → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → [INTERSTAGE → FINISH_COAT_3 at QT5] → FINAL_INSPECT → CLEANUP
```

**Note:** Primer module is CONDITIONAL — only runs when substrate_state = SS_BARE or SS_POWDER_COATED. Factory-primed substrates skip from prep to finish.

---

## 11. Material Systems

### Primer (Substrate-Driven)

Per Stairway_Systems_Doctrine Section 4 and Millwork_NC_Paint_Doctrine:

| Substrate | Primer Type | Purpose | Example Products |
|-----------|-------------|---------|------------------|
| bare_wood (hardwood components) | Tannin-blocking primer | Block tannin bleed-through | BM Prime Lock Plus, SW Extreme Block |
| bare_wood (poplar components) | Stain-blocking primer | Block green mineral streaks | BM Prime Lock Plus, BM Fresh Start oil-based |
| bare_wood (MDF components, cut edges) | Solvent-based sealer | Seal edges, prevent fiber raise | Zinsser BIN Shellac, KILZ Original |
| bare_wood (MDF components, faces) | High-build latex | Build film, level surface | BM Enamel Underbody 217, ProClassic Undercoater |
| bare_iron / bare_steel balusters | DTM Acrylic primer | Corrosion prevention | SW Pro Industrial DTM Acrylic, BM IronClad DTM Acrylic |
| powder-coated iron | Bonding primer (after scuff-sand 180-220 grit) | Adhesion over powder coat | BM Fresh Start All Purpose |
| factory_primed (wood) | Skip (or optional additional coat) | Factory primer is transit protection | — |
| bare_composite | Standard primer-sealer or bonding primer | Adhesion, tooth | Zinsser Bulls Eye 1-2-3, KILZ 2 |

> **Critical:** Self-etching primers do NOT work on powder coat. Must scuff-sand with 180-220 grit then use bonding primer per doctrine Section 4.4.

> **Critical:** Per SSPC-SP 1, ALL iron/steel balusters must receive solvent cleaning before priming to remove oils and drawing compounds. Failure causes "fish-eye" defects or delamination per doctrine Section 4.4.

### Finish (QT-Driven)

Per Fine_Finish_Doctrine Section 3:

| Quality Tier | System ID | Finish Type | Typical Products |
|--------------|-----------|-------------|------------------|
| QT3 | SYS_FF_STANDARD_ACRYLIC | 100% acrylic enamel | ProClassic WB, Regal Select |
| QT4 | SYS_FF_MODIFIED_URETHANE | Waterborne alkyd | BM Advance, SW Emerald Urethane |
| QT5 | SYS_FF_PREMIUM | Premium urethane enamel | Emerald Urethane, Scuff-X |

### Handrail Special Treatment

Per doctrine Section 8.1: "Some professionals apply a polyurethane topcoat over paint on handrails for additional hand-oil resistance." This is an optional QT5 upgrade — an additional clear coat over the enamel finish on handrails only. Standard enamel is adequate at QT3/QT4.

### Flow Additive Note

Per doctrine Section 8.4: Adding extender (Floetrol for latex, Penetrol for alkyd) to trim enamel improves leveling and extends working time on slow, detail-intensive baluster work. Particularly valuable with fast-drying waterborne products where the 2-minute working window creates "roping" on complex profiles.

---

## 12. References

### 12a. Domain Doctrines

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Stairway Systems Doctrine | docs/Doctrine/Stairway_Systems_Doctrine.md | Section 1 (Surfaces — balusters, newels, handrails), Section 3 (Sequencing — canonical order #5-#7), Section 4 (Substrates/Primers — iron DTM, wood, powder coat), Section 6 (Protection — tread covers, spray containment), Section 7 (Sheen Architecture — component assignments), Section 8 (Coating Systems — handrail topcoat), Section 9 (Production Benchmarks — 3-10 min/EA balusters), Section 10 (Quality Tiers — QT2 not applicable), Section 12 (Workflow Optimizations — two-person technique, artist brush, handrail underside trick) |
| PaintScope Stairwell Geometry System | docs/Doctrine/PaintScope_Stairwell_Geometry_System.md | Rake_length for handrail LF derivation, max_working_height for safety context, stairwell_style for configuration. |
| Fine Finish Doctrine | docs/Doctrine/Fine_Finish_Doctrine.md | Section 2 (Core Principles — primer is substrate-driven), Section 3 (Material Systems by QT), Section 4 (Sheen/QT gate), Section 5 (Module Structure), Section 7 (Interstage Process), Section 15 (Brush and Roll) |
| Millwork NC Paint Doctrine | docs/Doctrine/Millwork_NC_Paint_Doctrine.md | Section 2 (Substrate Classification), Section 4 (Primer Systems) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | Sheen/QT minimums, sanding standards, task classification |
| Protection & Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Mask level definitions, spray containment |

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
| PaintScope Asset Catalog | docs/PaintScope/PaintScope_Asset_Catalog.md | Section 8: Stairs & Railings |
| Spec Input to PaintScope Mapping | docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md | Key mapping validation |

---

## 13. Special Notes / Constraints

### Combined Prime+Paint Spec
Primer is conditional on substrate_state, not a separate spec. Same pattern as SF_STAIR_RISER_NC and SF_WINDOW_INT_NC. Rationale: stairway work is a self-contained zone with dedicated staging, shared tread protection, and same-session execution.

### Canonical Painting Sequence
Per Stairway_Systems_Doctrine Section 3.2: Balusters (#5) BEFORE newels (#6) BEFORE handrails (#7). In two-tone systems (different color for handrail vs balusters), this sequence is critical: "the darker rail paint applied last covers overlap at the baluster-rail junction — a technique that saves enormous cutting-in time." The spec's internal task ordering must respect this.

### Two-Tone Railing Systems
Two-tone systems (e.g., white balusters/newels with dark stained or painted handrail) are supported through the canonical painting sequence and finish group assignments. This is NOT a spec config dimension — it's a project-level finish group decision. The spec paints all components to the specified finish; the estimation engine handles different colors via finish group assignments.

### Iron Baluster Solvent Cleaning is Non-Negotiable
Per SSPC-SP 1 and doctrine Section 4.4: ALL iron/steel balusters must receive solvent cleaning before ANY primer. Oils and drawing compounds from manufacturing cause fish-eye defects and delamination. This is the mandatory first prep step for iron balusters, regardless of quality tier.

### Decorative Shoes are Excluded
Per doctrine Section 4.4: decorative shoes (metal sleeves at baluster base) are epoxy-set AFTER both the tread and baluster are fully finished. They are installation hardware, not a painting scope item.

### Handrail Bracket Removal
Per doctrine Section 12.1: "Remove handrails and brackets, label and bag each piece, paint behind attachment points, finish handrails horizontally to reduce runs/sags, then reinstall." This is a QT4+ technique. At QT3, brackets are masked in place.

### Spray Containment for Balusters
Per doctrine Section 6.3: When spraying balusters in place, overspray management is the dominant challenge. HVLP sprayers are preferred over airless (significantly less overspray). Containment techniques: Tape & Drape pre-taped plastic, cardboard shields behind balusters, small torn tape pieces at baluster-rail junctions. When using airless: fine-finish low-pressure tips (Graco FFLP 108, 210/310 series, 4-6" fan).

### Workflow Optimizations as Conditional Tasks
Per doctrine Section 12.1, the following proven techniques should be represented as conditional tasks or technique notes:
- **Two-person baluster technique:** Dramatically increases throughput on large baluster counts
- **Artist brush cut-in at baluster junctions:** Faster and cleaner than individually taping 62+ balusters (taping takes ~2 hours vs faster artist brush work)
- **Handrail underside in baluster color:** On two-tone systems, coat entire handrail underside in baluster color to eliminate precise cutting-in
- **German round trim brushes (1.25"):** Purpose-made for turned/ornate baluster complex profiles

### Height and Access Modifiers
All railing components are accessible from the treads or adjacent floor/landing. Use H1 (1.00) for all railing work. The difficulty in railing painting is DETAIL COMPLEXITY and COMPONENT COUNT, not height access. These factors are captured through production rates (3-10 min/EA per coat per baluster) and the baluster_profile dimension, not height modifiers.

### Production Rate References
Per Stairway_Systems_Doctrine Section 9.2:
- Square balusters: 3-5 min/EA per coat (hand brush/roll)
- Turned/ornate balusters: 5-10 min/EA per coat (hand brush/roll)
- Baluster taping: ~2 hours for 62 balusters (if taping technique used)
- Complete banister system (12-16 LF): 17-34 hours over 2-5 days

### Primer Selection is Substrate-Driven, NOT QT-Driven
Per Fine_Finish_Doctrine Section 2.1: primer requirement is driven by substrate condition and system specification, not quality tier. The key distinction is railing_type — all_wood uses standard wood primers; iron_and_wood uses DTM/bonding primers for iron balusters.

### Shared Tread Protection with Riser Spec
If SF_STAIR_RISER_NC has already been completed, tread protection should already be in place. This spec's setup module should VERIFY tread protection rather than set it up again. If railing work is done standalone (no prior riser work), tread protection setup is required.

---

## 14. Site Condition Analysis

| Condition ID | Affected Task Types | Include Values | Exclude Values | Notes |
|--------------|---------------------|----------------|----------------|-------|
| floor_type | protect | finished, partial | subfloor | Landing floor protection required only when finished floors present |
| occupancy_state | protect | occupied_crew_handles, occupied_sensitive | vacant | Additional protection when occupied |
| lead_status | prep, prime | tested_positive, unknown_pre1978 | tested_negative, not_applicable | Lead-safe practices when applicable (rare in NC but railings are frequent lead-paint carriers in repaints per doctrine 13.2) |

---

## 15. Acceptance Criteria

- [ ] Combined prime+paint with primer conditional on substrate_state
- [ ] EA counting for balusters (ITM_STAIR_BALUSTER) and newels (ITM_STAIR_NEWEL)
- [ ] LF counting for handrails (ITM_STAIR_HANDRAIL) and base rails (ITM_STAIR_BASE_RAIL, conditional)
- [ ] Treads excluded — routed to future SF_STAIR_TREAD_NC
- [ ] Risers/stringers excluded — routed to SF_STAIR_RISER_NC
- [ ] Decorative shoes excluded — installation item, not painting scope
- [ ] quality_tier minimum QT3 (QT2 not applicable per doctrine 10.1)
- [ ] Sheen/QT gate enforced: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only
- [ ] railing_type (all_wood/iron_and_wood) present as config dimension
- [ ] baluster_profile (square/turned) present as config dimension, affects production rates
- [ ] substrate_state drives primer requirement: SS_BARE, SS_PRIMED_FACTORY, SS_POWDER_COATED
- [ ] Iron baluster solvent cleaning (SSPC-SP 1) included as mandatory prep when railing_type=iron_and_wood
- [ ] DTM primer for iron balusters when railing_type=iron_and_wood + SS_BARE
- [ ] Bonding primer for powder-coated iron when SS_POWDER_COATED
- [ ] Wood primer per Millwork Doctrine when railing_type=all_wood + SS_BARE
- [ ] QT-driven finish material system per Fine Finish Doctrine Section 3
- [ ] Tread protection (stair_tread_covers zone) mandatory from setup to cleanup
- [ ] Canonical sequence respected: balusters (#5) → newels (#6) → handrails (#7)
- [ ] Handrail bracket removal included as conditional task (QT4+)
- [ ] Newel-to-tread and newel-to-handrail caulk included as prep tasks
- [ ] Module structure follows Fine Finish combined prime+paint pattern
- [ ] Interstage between-coat cycle present at ALL quality tiers
- [ ] Between-coat sanding discipline per tier: QT3=spot, QT4=full 220, QT5=full 220-320
- [ ] Feel test on handrails included at QT5 in final inspect
- [ ] Optional poly topcoat on handrails at QT5
- [ ] All proposed PaintScope keys documented (4 new keys)
- [ ] All proposed Surface IDs documented (4 new IDs: stair_baluster, stair_newel, stair_handrail, stair_base_rail)
- [ ] All existing PaintScope keys verified against catalog
- [ ] State declarations: input = SS_BARE, SS_PRIMED_FACTORY, or SS_POWDER_COATED; output = SS_PAINTED
- [ ] Spray containment techniques documented for spray application method

---

## 16. Resolved Questions

### Q1: Decorative Shoe Scope — **RESOLVED**
~~Should decorative shoes (metal sleeves at baluster base) be included in this spec?~~

**Resolution:** Exclude. Per doctrine Section 4.4, shoes are epoxy-set AFTER both tread and baluster are fully finished. They are installation hardware, not painting scope.

### Q2: Two-Tone System Config — **RESOLVED**
~~Should two-tone railing systems (different color for handrail vs balusters) be a spec config dimension?~~

**Resolution:** No. Two-tone is a project-level finish group decision, not a spec configuration. The spec paints all components to specified finish. The canonical painting sequence (balusters before handrails) inherently supports two-tone: "darker rail paint applied last covers overlap at the baluster-rail junction."

### Q3: Base Rail Inclusion — **RESOLVED**
~~Should base rails / shoe rails be included or routed elsewhere?~~

**Resolution:** Include as CONDITIONAL paintable item. Not all railing systems have base rails (many have balusters set directly into tread holes). When present, base rail is integral to the railing system and painted in the same session.

### Q4: Handrail Bracket Handling — **RESOLVED**
~~Should handrail brackets be removed or masked in place?~~

**Resolution:** Both, tier-dependent. At QT4+, brackets are removed per doctrine 12.1 ("Remove handrails and brackets, label and bag each piece, paint behind attachment points, finish handrails horizontally"). At QT3, brackets are masked in place (faster, acceptable quality).

### Q5: Height Modifiers for Railing Work — **RESOLVED**
~~Should railing work use stairwell access modifiers like stringer work?~~

**Resolution:** No. All railing components are accessible from treads or adjacent floor/landing — use H1 (1.00). The difficulty is detail complexity and component count, not height access. Production rates (3-10 min/EA per coat) already account for the inherent complexity. Stairwell access modifiers are for stringer/wall/ceiling work where the painter must reach high surfaces, not for components at tread level.

### Q6: Spray Method Viability — **RESOLVED**
~~When is spray appropriate for railing work?~~

**Resolution:** Spray is viable for large baluster counts and is preferred at QT4+ for achieving factory-like finish per doctrine 10.3. HVLP is preferred over airless for in-place work (less overspray). The key constraint is containment masking time — spraying 62 balusters is faster than brushing them, but the masking setup is substantial. Application method is a config dimension; the estimation engine factors containment setup time for spray.

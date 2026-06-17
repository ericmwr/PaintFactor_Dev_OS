# Spec Brief: SF_BUILTIN_NC

**Status:** Draft
**Priority:** P3
**Authored:** 2026-02-09
**Author:** Spec Researcher

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_BUILTIN_NC` |
| Name | New Construction Built-In Millwork Painting |
| Domain | interior |
| Context | NC (new construction) |
| Description | Combined prime+paint spec for fixed built-in millwork units in new construction: bookcases, entertainment/media centers, window seats, mudroom cubbies, built-in desks, display cases, and custom storage units. Uses the Opening Count quantification method per BuiltIns_Shelving Quantification System v2.0 for interior compartments, plus EA-based door/drawer front painting for units with removable components. Fine Finish workflow with substrate-driven primer selection, QT-driven finish systems, and interstage discipline. Five paintable items: 4 opening tiers (S/M/L/XL) for carcass work plus 1 EA item for removed door/drawer fronts painted flat. Complexity captured by PaintScope modifiers (depth, detail, access) rather than per-type configuration dimensions. |

---

## 2. Scope Boundaries

### Includes
- Interior compartment painting (openings counted by tier S/M/L/XL per BuiltIns Quantification System v2.0)
- Face frames, stiles, and rails (captured by FACE_FRAME detail modifier)
- Exposed end panels and top surfaces (bundled with opening production rates)
- Crown/valance details (captured by CROWN_VALANCE detail modifier)
- Door and drawer front removal, flat painting on sawhorses, and reinstallation
- Hardware removal and reinstallation (knobs, pulls, hinges, catches)
- Surface prep per substrate (sanding, dust removal, MDF edge sealing)
- Fastener hole filling and sanding
- Caulking at built-in-to-wall junctions
- MDF edge sealing with solvent-based sealer (bare MDF only -- step 1 of two-step prime)
- Primer coat -- conditional on substrate_state = SS_BARE (substrate-driven chemistry)
- Finish coat application (spray or brush) -- 2 coats standard, 3+ at QT5 brush per FFD SS15.10.3
- Between-coat interstage process (inspect, sand, repair, clean) at ALL quality tiers
- Floor protection at work zone base
- Wall masking adjacent to spray work area
- Final quality inspection
- Protection teardown and cleanup

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Closet shelving (dedicated simple spec) | `SF_CLOSET_SHELF_NC` |
| Kitchen/bathroom cabinets (dedicated cabinet spec) | `SF_CABINET_NC_PAINT` (future) |
| Architectural elements (beams, columns, mantels) | `SF_ARCH_ELEMENT_NC` |
| Trim (baseboard, crown, casing as LF items) | `SF_TRIM_NC_PAINT` |
| Wainscoting / partial-height wall panels | `SF_WAINSCOT_PANEL_NC` |
| Full-height wood wall panels | `SF_WOOD_WALL_NC` |
| Freestanding/removable furniture | Not fixed -- excluded from painting scope |
| Back panels (hidden against wall) | Not paintable -- excluded |
| Glass doors/inserts | Not painted -- excluded |
| Countertop surfaces (stone, laminate) | Not painting scope -- excluded |
| Interior of units behind closed doors (if not spec'd) | Optional -- include only when explicitly scoped |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | QT2 prohibited -- prominent millwork per Millwork Doctrine SS6. Sheen/QT gate enforced at runtime. |
| application_method | spray, brush | spray | Spray preferred for complex interiors (reaches all surfaces, uniform finish). Brush for occupied spaces, small scope, or installed units with limited spray access. |
| sheen | satin, semi-gloss, gloss | satin | Per QT gate: satin (QT3+), semi-gloss (QT4+), gloss (QT5 only). Satin default for softer appearance; semi-gloss common for durability/cleanability. |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | NC context. SS_BARE requires full primer (substrate-driven). SS_PRIMED_FACTORY skips primer. Standard NC built-ins arrive factory-primed from mill. |

> Complexity modifiers (depth, detail, access) are PaintScope-provided inputs, not configuration dimensions. They describe the specific built-in unit measured on-site.

---

## 4. Paintable Items

Uses **Opening Count Method** per BuiltIns_Shelving Quantification System v2.0.

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_BUILTIN_OPEN_S | Small opening (6-18" x 6-18") | EA | Count per tier. Small cubbies, shoe shelves, small niches. | Always |
| ITM_BUILTIN_OPEN_M | Medium opening (18-36" x 12-30") | EA | Count per tier. Standard bookshelf openings, typical built-in bays. | Always |
| ITM_BUILTIN_OPEN_L | Large opening (36-60" x 18-42") | EA | Count per tier. Wide media shelving, large compartments. | Always |
| ITM_BUILTIN_OPEN_XL | XL opening (60"+ x 30"+) | EA | Count per tier. Oversized bays, deep/wide feature units. | Always |
| ITM_BUILTIN_DOOR | Door/drawer front | EA | Count of solid removable doors + drawer fronts. Removed, painted flat on sawhorses, reinstalled after 5-7 day cure. Glass doors excluded. | When has_doors = true |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_EA_BUILTIN_OPEN_S | PS_OPENING_EA.BUILTIN_SHELF.S | EA | Always | Small opening count |
| IN_EA_BUILTIN_OPEN_M | PS_OPENING_EA.BUILTIN_SHELF.M | EA | Always | Medium opening count |
| IN_EA_BUILTIN_OPEN_L | PS_OPENING_EA.BUILTIN_SHELF.L | EA | Always | Large opening count |
| IN_EA_BUILTIN_OPEN_XL | PS_OPENING_EA.BUILTIN_SHELF.XL | EA | Always | XL opening count |
| IN_EA_BUILTIN_DOORS | PS_META.EA.BUILTIN_DOORS | EA | When has_doors | Count of solid doors + drawer fronts to remove/paint |
| IN_EA_BUILTIN_HARDWARE | PS_META.EA.BUILTIN_HARDWARE | EA | When has_doors | Hardware pieces to remove/reinstall |
| IN_ENUM_BUILTIN_DEPTH | PS_OPENING_MOD.DEPTH | ENUM | Always | SHALLOW / DEEP / VERY_DEEP |
| IN_ENUM_BUILTIN_DETAIL | PS_OPENING_MOD.DETAIL | ENUM | Always | SIMPLE_BOX / FACE_FRAME / CROWN_VALANCE / BEADED_ROUTED |
| IN_ENUM_BUILTIN_ACCESS | PS_OPENING_MOD.ACCESS | ENUM | Always | OPEN_ACCESS / CRAMPED / OBSTRUCTED |
| IN_EA_ROOMS_TOTAL | PS_META.EA.ROOMS_TOTAL | EA | Always | Room count for setup/cleanup |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | When brush | Perimeter floor protection |
| IN_SF_PROTECT_FLOOR_WORKZONE | PS_PROTECT_SF.FLOOR_WORKZONE | SF | When spray | Localized floor protection around spray work area |
| IN_ENUM_HEIGHT_BAND | PS_META.HEIGHT_BAND | ENUM | Always | Height modifier for tall units (floor-to-ceiling bookcases). Values: STD / STEP / EXT / SCAFFOLD. |
| IN_SF_FLOOR_VACUUM_AREA | PS_META.SF.FLOOR_VACUUM_AREA | SF | Always | Post-work vacuum cleanup area |

**Verification:** IN_EA_ROOMS_TOTAL, IN_SF_PROTECT_FLOOR_PERIMETER, IN_SF_PROTECT_FLOOR_WORKZONE, IN_ENUM_HEIGHT_BAND, IN_SF_FLOOR_VACUUM_AREA -- all map to existing PaintScope keys.

### Proposed New Keys

| Proposed Key | UOM | Description | Justification |
|-------------|-----|-------------|---------------|
| `PS_OPENING_EA.BUILTIN_SHELF.S` | EA | Small built-in openings count | Generic key from BuiltIns Quantification System v2.0. Closet shelf uses separate PS_OPENING_EA.CLOSET_SHELF.* keys. |
| `PS_OPENING_EA.BUILTIN_SHELF.M` | EA | Medium built-in openings count | Same family as above. |
| `PS_OPENING_EA.BUILTIN_SHELF.L` | EA | Large built-in openings count | Same family as above. |
| `PS_OPENING_EA.BUILTIN_SHELF.XL` | EA | XL built-in openings count | Same family as above. |
| `PS_META.EA.BUILTIN_DOORS` | EA | Count of built-in doors + drawer fronts | Separate from PS_META.EA.CABINET_DOORS (kitchen cabinets). Built-in doors vary widely in size. |
| `PS_META.EA.BUILTIN_HARDWARE` | EA | Hardware piece count for built-ins | Separate from PS_META.EA.CABINET_HARDWARE (kitchen cabinets). |

> **Note:** PS_OPENING_MOD.DEPTH, PS_OPENING_MOD.DETAIL, PS_OPENING_MOD.ACCESS are already documented in BuiltIns_Shelving Quantification System v2.0. Verify presence in PaintScope catalog.

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | Notes |
|---------|-----------|------------------|-------|
| floor_perimeter | application_method = brush | edge_only | Drop cloth runners at base of built-in work area. Standard for brush millwork. From Protection_Zones_Reference. |
| floor_workzone | application_method = spray | full_cover | Localized floor coverage around spray target. Built-ins are discrete -- not full room coverage. From Protection_Zones_Reference. |
| wall_adjacent | application_method = spray | partial_cover | Wall masking near built-in when spraying (built-in-to-wall junction). From Protection_Zones_Reference. |
| fixture_covers | application_method = spray AND fixtures near work area | full_cover | Ceiling fixtures near spray work. From Protection_Zones_Reference. |

---

## 7. Adjacency Declarations

### Primary Surface: builtin_carcass

| Adjacent Surface | Edge Type | Typical Relationship | Notes |
|-----------------|-----------|---------------------|-------|
| wall_field | linear | different_finish | Built-in meets drywall wall on sides and top. Different finish -- built-in enamel (satin/semi-gloss) vs wall paint (flat/eggshell). Primary edge relationship. |
| ceiling_field | linear | different_finish | Floor-to-ceiling units meet ceiling. Different finish. Not all built-ins reach ceiling -- conditional on unit height. |
| floor | linear | not_in_scope | Built-in base meets floor. Floor is never painted. |

---

## 8. References

### 8a. Domain Doctrines (per-spec)

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| BuiltIns Quantification | `BuiltIns_Shelving Quantification System.md` | Opening Count method, size tiers, depth/detail/access modifiers, PaintScope key patterns |
| Fine Finish | `docs/Doctrine/Fine_Finish_Doctrine.md` | SS1.1 (millwork surfaces -- built-ins listed), SS2 (core principles), SS3 (material systems), SS4 (sheen/QT gate), SS5 (module structure), SS7 (interstage), SS10.3 (built-in specifics -- door removal, horizontal painting, blocking resistance), SS15 (brush/roll method, roll and tip, 2-minute window, rigid block sanding) |
| Millwork NC Paint | `docs/Doctrine/Millwork_NC_Paint_Doctrine.md` | SS2 (substrate classification -- MDF, FJP, softwood, hardwood), SS3 (surface prep matrix), SS4 (primer systems -- MDF edge seal, FJP stain-block), SS6 (prominent millwork = QT2 prohibited), SS7.2 (complexity modifiers) |
| Quality Tiers | `docs/Doctrine/Quality_Tiers_and_Surface_Condition.md` | QT3-QT5 definitions, sheen/QT gate, condition gate at QT5 |
| Materials and Consumables | `docs/Doctrine/Materials_and_Consumables_Doctrine.md` | Consumable standards, caulk/spackle usage, tape yields (180 LF/roll) |
| Estimation Modifiers | `docs/Doctrine/Estimation_Modifiers_Doctrine.md` | Height modifiers, complexity modifiers, modifier stacking (multiply not add), spray/backroll coupling |
| Protection and Masking | `docs/Doctrine/Protection_and_Masking_Doctrine.md` | Floor protection methods, wall masking near spray, masking film sizes (72" for standard built-ins, 99" for full-height) |
| Interior Protection | `docs/Doctrine/Interior_Protection_Doctrine.md` | Protection zone activation patterns, asset protection for built-ins |

### 8b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | `docs/Doctrine/Spec_Completeness_Doctrine.md` | Mandatory completeness requirements |
| Modifier Registry | `docs/Doctrine/Modifier_Registry.md` | Canonical modifier IDs and values (H1-H4, QT3-QT5, COND_*, etc.) |
| Protection Zones Reference | `docs/Reference/Protection_Zones_Reference.md` | Valid zone IDs |
| Surface Vocabulary Reference | `docs/Reference/Surface_Vocabulary_Reference.md` | Valid surface IDs (builtin_carcass, builtin_face, builtin_shelf, builtin_trim) |
| Site Condition Vocabulary | `docs/Reference/Site_Condition_Vocabulary_Reference.md` | Valid site condition IDs |
| Substrate State Reference | `docs/Reference/Substrate_State_Reference.md` | SS_* state IDs |
| PaintScope Quantity Key Catalog | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` | Key verification |
| Spec Input to PaintScope Mapping | `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` | Input-key mapping |
| Spec JSON Schema | `specs/_schemas/spec.schema.json` | Target schema |

---

## 9. Special Notes / Constraints

### Opening Count Method
This spec uses EA opening counts per tier, NOT SF. See BuiltIns_Shelving Quantification System v2.0. Openings are the primary quantity driver for interior compartment painting. Face frame and exterior surface complexity is captured by the DETAIL modifier (SIMPLE_BOX, FACE_FRAME, CROWN_VALANCE, BEADED_ROUTED).

### Door/Drawer Removal (Critical)
- Solid doors and drawer fronts are REMOVED, painted flat on sawhorses (spray preferred), then reinstalled after cure
- **5-7 day minimum cure for waterborne alkyd (QT4+) before closing doors** -- premature closing causes finish fusion and catastrophic peeling per FFD SS15.11.3
- Glass doors/inserts are excluded -- not painted
- Hardware (knobs, pulls, hinges, catches) removed before painting, reinstalled after cure

### Complexity Modifiers from PaintScope
Three PaintScope-provided modifiers replace per-type configuration dimensions:
- **PS_OPENING_MOD.DEPTH**: SHALLOW (1.0x), DEEP (1.x), VERY_DEEP (1.x) -- depth increases reach difficulty and masking
- **PS_OPENING_MOD.DETAIL**: SIMPLE_BOX (1.0x), FACE_FRAME (1.x), CROWN_VALANCE (1.x), BEADED_ROUTED (1.x) -- profile complexity
- **PS_OPENING_MOD.ACCESS**: OPEN_ACCESS (1.0x), CRAMPED (1.x), OBSTRUCTED (1.x) -- workspace restrictions

Exact modifier values to be determined by Estimation Engineer using Modifier_Registry.md and Millwork Doctrine SS7.2 complexity categories as reference.

### Adjacent Spec Impact
Built-ins are the SOURCE of a complexity modifier on adjacent wall/ceiling specs:
- Similar to COMP_CLOSET_SHELVING (1.50x) for closet shelves
- This spec does NOT receive that modifier itself -- it has its own depth/detail/access modifiers
- May require proposal of COMP_BUILTIN modifier for adjacent specs (open question)

### Scope Boundary: Closet Shelving vs General Built-Ins
- **SF_CLOSET_SHELF_NC** handles closet shelving specifically (simple spec, opening count only, no doors/drawers)
- **SF_BUILTIN_NC** handles all other built-in millwork: bookcases, media centers, window seats, desks, cubbies, storage benches, display cases
- Key difference: SF_BUILTIN_NC supports door/drawer removal, has broader detail modifier range (CROWN_VALANCE, BEADED_ROUTED), and may require height modifiers for tall units

### Height Considerations
- Standard built-ins (bookcase, desk): H1 (standard, 1.0x)
- Tall built-ins (floor-to-ceiling bookcases, entertainment centers): H2 (step ladder, 1.30x) possible
- Very tall built-ins in high-ceiling rooms: H3+ possible but rare
- PS_META.HEIGHT_BAND applies at room level

### Material Systems
Same QT-driven systems as other millwork -- all reuse existing SYS_ IDs:
- **QT3:** SYS_FF_STANDARD_ACRYLIC (100% acrylic enamel)
- **QT4:** SYS_FF_MODIFIED_URETHANE (waterborne alkyd -- 5-7 day cure before closing doors)
- **QT5:** SYS_FF_PREMIUM (premium urethane)
No new material system IDs needed.

### Context Prefix
- **BLTN** -- TSK_BLTN_*, MOD_BLTN_*

### Sibling Specs (structural reference)
- `SF_CLOSET_SHELF_NC_v1` -- Closest structural sibling (opening count method, EA-based, same quantification system)
- `SF_ARCH_ELEMENT_NC_v1` -- Multi-item millwork spec (5 items here vs 3 there)
- `SF_WOOD_WALL_NC_v1` -- Combined prime+paint, SF-based millwork, fine finish workflow
- `SF_WAINSCOT_PANEL_NC_v1` -- Fine finish millwork with complexity modifiers

### Production Rate Guidance
Per Millwork Doctrine SS7.1 (adapted for opening-based work):
- Opening-based rates (EA/hr) vary significantly by tier:
  - S openings: fastest per EA (small area, quick access)
  - XL openings: slowest per EA (large area, deep reach)
- Door/drawer front rates similar to door slab rates (EA/hr)
- Depth, detail, and access modifiers scale production time multiplicatively
- These are RESEARCH GUIDANCE -- Estimation Engineer determines final rates

### Inherited Research Corrections
- **RC-005:** Material systems are suggestions per QT -- contractor has discretion
- **RC-006:** Both Advance (waterborne alkyd) and Emerald Urethane (acrylic-urethane enamel, NOT waterborne alkyd) have SHORT working times

---

## 10. Acceptance Criteria

- [ ] Uses Opening Count method (EA by tier) per BuiltIns_Shelving Quantification System v2.0
- [ ] ITM_BUILTIN_DOOR (EA) handles door/drawer removal and flat painting workflow
- [ ] 5-7 day cure requirement documented for QT4+ waterborne alkyd before closing doors
- [ ] QT2 explicitly prohibited (prominent millwork per Millwork Doctrine SS6)
- [ ] Substrate-driven primer selection matches Millwork Doctrine SS4 (MDF edge seal, FJP stain-block)
- [ ] MDF two-step prime sequence maintained (shellac edge seal BEFORE latex face primer)
- [ ] Depth/detail/access modifiers from PaintScope correctly applied as production time multipliers
- [ ] Height modifier applies to tall units (floor-to-ceiling bookcases)
- [ ] Material systems reuse existing SYS_FF_* IDs (no new SYS_ IDs)
- [ ] All protection zones use valid IDs from Protection_Zones_Reference
- [ ] All surface IDs (builtin_carcass, builtin_face, builtin_shelf) verified against Surface_Vocabulary_Reference
- [ ] All 6 proposed PaintScope keys flagged for PaintScope team review
- [ ] Closet shelving exclusion is explicit in scope boundaries
- [ ] Kitchen/bathroom cabinet exclusion is explicit in scope boundaries
- [ ] Glass door exclusion is explicit
- [ ] State declarations include valid_input_states (SS_BARE, SS_PRIMED_FACTORY) and output_state (varies by sheen)
- [ ] Adjacency declarations cover built-in-to-wall, built-in-to-ceiling, built-in-to-floor relationships
- [ ] Hardware removal/reinstall tasks driven by PS_META.EA.BUILTIN_HARDWARE count

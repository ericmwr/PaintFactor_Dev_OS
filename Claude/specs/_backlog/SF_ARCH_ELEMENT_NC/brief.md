# Spec Brief: SF_ARCH_ELEMENT_NC

**Status:** Draft
**Priority:** P3
**Authored:** 2026-02-09
**Author:** Spec Researcher

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_ARCH_ELEMENT_NC` |
| Name | New Construction Architectural Element Painting |
| Domain | interior |
| Context | NC (new construction) |
| Description | Combined prime+paint spec for standalone decorative architectural elements in new construction: exposed beams (not part of coffered ceiling systems), decorative column wraps, and fireplace mantels/surrounds. These are prominent millwork focal points sharing the Fine Finish workflow, substrate-driven primer selection, and QT-driven finish systems. Three paintable items with distinct UOMs (LF for beams, EA for columns, EA for mantels) unified under a single spec because they share identical substrate handling, material systems, interstage process, and quality tier behavior. Each element type has its own profile/complexity modifier. |

---

## 2. Scope Boundaries

### Includes
- Standalone decorative beam painting (exposed 3-sided box beams, faux timber wraps, decorative ceiling beams NOT integrated into a coffered grid)
- Decorative column wrap painting (square, round, fluted, paneled -- floor-to-ceiling or partial-height)
- Fireplace mantel and surround painting (shelf mantels, leg/pilaster surrounds, full assemblies)
- Surface prep per substrate (dust removal, sanding, grain fill for open-grain wood)
- MDF edge sealing with solvent-based sealer (bare MDF only -- step 1 of two-step prime per Wainscot/Wood Wall precedent)
- Fastener hole filling and sanding
- Caulking at element-to-wall, element-to-ceiling, and element-to-floor junctions
- Primer coat -- conditional on substrate_state = SS_BARE (substrate-driven chemistry)
- Finish coat application (spray or brush) -- 2 coats standard, 3+ at QT5 brush per FFD SS15.10.3
- Between-coat interstage process (inspect, sand, repair, clean) at ALL quality tiers
- Floor protection (perimeter for brush, workzone for spray)
- Wall/ceiling adjacent masking when spraying near finished surfaces
- Final quality inspection
- Protection teardown and cleanup

### Excludes (with routing)

| Excluded Item | Route To |
|---------------|----------|
| Coffered ceiling beams (integrated into ceiling grid system) | `SF_WOOD_CEILING_NC` (coffered ceiling_style covers beam faces within the grid) |
| Crown molding (LF-based trim item) | `SF_TRIM_NC_PAINT` (ITM_TRIM_CROWN) |
| Wainscoting / wall panels | `SF_WAINSCOT_PANEL_NC` or `SF_WOOD_WALL_NC` |
| Stone/brick/tile fireplace surround | Not a painting scope -- masonry/tile trade |
| Structural columns (steel, concrete) | Future exterior/industrial spec |
| Stair newel posts (part of railing system) | `SF_STAIR_RAILING_NC` |
| Exterior columns / porch posts | Future exterior spec |
| Cabinet/built-in millwork | `SF_BUILTIN_NC` (future) or `SF_CABINET_NC_PAINT` (future) |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | QT2 prohibited -- prominent millwork per Millwork Doctrine SS6. Sheen/QT gate enforced at runtime. |
| application_method | spray, brush | spray | Spray preferred for production speed and uniform finish. Brush for occupied spaces, small scope, or intricate profiles. No roll -- these are millwork. |
| sheen | satin, semi-gloss, gloss | satin | Per QT gate: satin (QT3+), semi-gloss (QT4+), gloss (QT5 only). |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | NC context. SS_BARE requires full primer (substrate-driven). SS_PRIMED_FACTORY skips primer. |
| beam_profile | small_box, standard_box, large_timber, ornate | standard_box | Drives beam complexity modifier. small_box=1.0x, standard_box=1.10x, large_timber=1.20x, ornate=1.40x. Only applies to ITM_ARCH_BEAM. |
| column_type | square_smooth, square_detailed, round_smooth, round_fluted | square_smooth | Drives column complexity modifier. square_smooth=1.0x, square_detailed=1.15x, round_smooth=1.10x, round_fluted=1.30x. Only applies to ITM_ARCH_COLUMN. |
| mantel_type | shelf_only, standard_surround, full_assembly | standard_surround | Drives mantel complexity modifier. shelf_only=1.0x, standard_surround=1.25x, full_assembly=1.50x. Only applies to ITM_ARCH_MANTEL. |

> Complexity modifiers are element-specific. beam_profile, column_type, and mantel_type each apply ONLY to their respective paintable item. They do not cross-apply.

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_ARCH_BEAM | Decorative beam | LF | Linear footage of exposed beam length. Each beam measured as running LF. Profile complexity (width, face count, detail) handled by beam_profile modifier. Typically 3 exposed faces (bottom + 2 sides) for ceiling-mounted beams. | When beams in scope |
| ITM_ARCH_COLUMN | Decorative column wrap | EA | Each column counted individually. Size and profile complexity handled by column_type modifier. Height captured via PS_META.HEIGHT_BAND at room level -- columns run floor-to-ceiling or partial-height. | When columns in scope |
| ITM_ARCH_MANTEL | Fireplace mantel/surround | EA | Each mantel counted individually. Complexity handled by mantel_type modifier (shelf vs surround vs full assembly). Standard wall height work (H1 typical). | When mantels in scope |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_LF_ARCH_BEAM | PS_SURFACE_LF.ARCH_BEAM | LF | When beams in scope | Total LF of standalone decorative beams |
| IN_EA_ARCH_COLUMN | PS_SURFACE_EA.ARCH_COLUMN | EA | When columns in scope | Count of decorative column wraps |
| IN_EA_ARCH_MANTEL | PS_SURFACE_EA.ARCH_MANTEL | EA | When mantels in scope | Count of fireplace mantels/surrounds |
| IN_EA_ROOMS_TOTAL | PS_META.EA.ROOMS_TOTAL | EA | Always | Room count for setup/cleanup |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | When brush | Perimeter floor protection |
| IN_SF_PROTECT_FLOOR_WORKZONE | PS_PROTECT_SF.FLOOR_WORKZONE | SF | When spray | Localized floor protection around spray work area |
| IN_EA_PROTECT_FIXTURES | PS_PROTECT_EA.ASSET.FIXTURES | EA | When spray near fixtures | Fixture masking near work area |
| IN_ENUM_HEIGHT_BAND | PS_META.HEIGHT_BAND | ENUM | Always | Height modifier for beams/columns at elevation |
| IN_SF_FLOOR_VACUUM_AREA | PS_META.SF.FLOOR_VACUUM_AREA | SF | Always | Post-work vacuum cleanup area |

**Verification:** IN_EA_ROOMS_TOTAL, IN_SF_PROTECT_FLOOR_PERIMETER, IN_SF_PROTECT_FLOOR_WORKZONE, IN_EA_PROTECT_FIXTURES, IN_ENUM_HEIGHT_BAND, IN_SF_FLOOR_VACUUM_AREA -- all map to existing PaintScope keys.

### Proposed New Keys

| Proposed Key | UOM | Description | Justification |
|-------------|-----|-------------|---------------|
| `PS_SURFACE_LF.ARCH_BEAM` | LF | Running LF of standalone decorative beams | No existing key for beam surfaces. Beams are LF items with profile complexity modifier. |
| `PS_SURFACE_EA.ARCH_COLUMN` | EA | Count of decorative column wraps | No existing key for column counting. Columns are EA items with type complexity modifier. |
| `PS_SURFACE_EA.ARCH_MANTEL` | EA | Count of fireplace mantels/surrounds | No existing key for mantel counting. Mantels are EA items with assembly complexity modifier. |

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | Notes |
|---------|-----------|------------------|-------|
| floor_perimeter | application_method = brush | edge_only | Drop cloth runners near work area. Standard for brush millwork. From Protection_Zones_Reference. |
| floor_workzone | application_method = spray | full_cover | Localized floor coverage around spray target. Not full room -- architectural elements are discrete, not room-spanning. From Protection_Zones_Reference. |
| wall_adjacent | application_method = spray | partial_cover | Wall masking near spray target (beam-wall junction, column-wall junction, mantel-wall junction). From Protection_Zones_Reference. |
| fixture_covers | application_method = spray AND fixtures near work area | full_cover | Ceiling fixtures near beam spray work. From Protection_Zones_Reference. |

---

## 7. Adjacency Declarations

### Primary Surface: varies by paintable item

**ITM_ARCH_BEAM (beam_wrap)**

| Adjacent Surface | Edge Type | Typical Relationship | Notes |
|-----------------|-----------|---------------------|-------|
| ceiling_field | linear | different_finish | Beam meets drywall ceiling. Different finish -- beam enamel vs ceiling flat. |
| wall_field | linear | different_finish | Beam meets wall at end supports. Different finish -- beam enamel vs wall latex. |

**ITM_ARCH_COLUMN (column_wrap)**

| Adjacent Surface | Edge Type | Typical Relationship | Notes |
|-----------------|-----------|---------------------|-------|
| ceiling_field | linear | different_finish | Column top meets ceiling. |
| wall_field | linear | varies | Column meets wall at back (wall-mounted) or freestanding. |
| floor | linear | not_in_scope | Column base meets floor. Floor is never painted. |

**ITM_ARCH_MANTEL (mantel)**

| Adjacent Surface | Edge Type | Typical Relationship | Notes |
|-----------------|-----------|---------------------|-------|
| wall_field | linear | different_finish | Mantel meets wall. Different finish typically. |

---

## 8. References

### 8a. Domain Doctrines (per-spec)

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Fine Finish | docs/Doctrine/Fine_Finish_Doctrine.md | SS1.1 (millwork surfaces), SS2 (core principles), SS3 (material systems), SS4 (sheen/QT gate), SS5 (module structure), SS7 (interstage), SS10 (substrate-specific), SS15 (brush/roll method) |
| Millwork NC Paint | docs/Doctrine/Millwork_NC_Paint_Doctrine.md | SS1.1 (measurement), SS2 (substrate classification), SS3 (surface prep matrix), SS4 (primer systems), SS6 (prominent millwork = QT2 prohibited), SS7.2 (complexity modifiers) |
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | QT3-QT5 definitions, sheen/QT gate, sanding standards |
| Materials and Consumables | docs/Doctrine/Materials_and_Consumables_Doctrine.md | Consumable standards, caulk/spackle usage |
| Estimation Modifiers | docs/Doctrine/Estimation_Modifiers_Doctrine.md | Height modifiers, complexity modifiers, modifier stacking |
| Protection and Masking | docs/Doctrine/Protection_and_Masking_Doctrine.md | Floor protection methods, wall masking near spray |
| Interior Protection | docs/Doctrine/Interior_Protection_Doctrine.md | Protection zone activation patterns |

### 8b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | docs/Doctrine/Spec_Completeness_Doctrine.md | Mandatory completeness requirements |
| Modifier Registry | docs/Doctrine/Modifier_Registry.md | Canonical modifier IDs and values |
| Protection Zones Reference | docs/Reference/Protection_Zones_Reference.md | Valid zone IDs |
| Surface Vocabulary Reference | docs/Reference/Surface_Vocabulary_Reference.md | Valid surface IDs (beam_wrap, column_wrap, mantel) |
| Site Condition Vocabulary | docs/Reference/Site_Condition_Vocabulary_Reference.md | Valid site condition IDs |
| Substrate State Reference | docs/Reference/Substrate_State_Reference.md | SS_* state IDs |
| PaintScope Quantity Key Catalog | docs/PaintScope/PaintScope_Quantity_Key_Catalog.md | Key verification |
| Spec Input to PaintScope Mapping | docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md | Input-key mapping |
| Spec JSON Schema | specs/_schemas/spec.schema.json | Target schema |

---

## 9. Special Notes / Constraints

### Scope Boundary: Coffered Beams vs Standalone Beams
- **Coffered ceiling beams** (forming a grid with recessed panels) are IN SCOPE of `SF_WOOD_CEILING_NC` (coffered ceiling_style). Those beams are integral to the ceiling system.
- **Standalone decorative beams** (individual beams crossing a ceiling, rustic exposed beams, faux timber beams) are IN SCOPE of this spec (`SF_ARCH_ELEMENT_NC`).
- The distinction: if the beam is part of a coffered grid system, it goes to wood ceiling. If it's a standalone decorative element, it comes here.

### Scope Boundary: Newel Posts vs Columns
- Newel posts at stair railings are part of `SF_STAIR_RAILING_NC` (ITM_RAILING_NEWEL).
- Decorative freestanding or wall-mounted columns are in this spec.

### Height Considerations
- **Beams**: Height varies with ceiling height. Overhead work when beam is at ceiling. PS_META.HEIGHT_BAND applies.
- **Columns**: Full room height. Column tops may require ladder/scaffold work. PS_META.HEIGHT_BAND applies.
- **Mantels**: Typically wall height H1 (4-5 ft). Standard access. Height modifier usually 1.0x.

### Substrate Mix
- Architectural elements may use mixed substrates in a single element (e.g., MDF flat faces with FJP detail, or solid wood column with MDF capital). Primer selection should address the most demanding substrate present.

### Production Rate Guidance
- **Beams**: Similar to trim LF rates with profile complexity adjustment. Spray ~150-200 LF/hr, brush ~60-80 LF/hr at QT3 baseline for standard_box.
- **Columns**: EA-based rate. Spray ~4-6 EA/hr, brush ~2-3 EA/hr at QT3 for square_smooth (8ft standard column). Height modifier stacks.
- **Mantels**: EA-based rate. Spray ~2-3 EA/hr, brush ~1-2 EA/hr at QT3 for standard_surround. Highly variable by mantel complexity.
- These are RESEARCH GUIDANCE rates, not doctrine. Estimation Engineer determines final rates.

### Material Systems
- Same QT-driven systems as other millwork: SYS_FF_STANDARD_ACRYLIC (QT3), SYS_FF_MODIFIED_URETHANE (QT4), SYS_FF_PREMIUM (QT5).
- All reuse existing SYS_ IDs -- no new material system IDs needed.

### Context Prefix
- **ARCH** -- TSK_ARCH_*, MOD_ARCH_*

### Sibling Specs (structural reference)
- `SF_WOOD_CEILING_NC_v1` -- Closest structural pattern (combined prime+paint, SF-based millwork, overhead work, multiple styles)
- `SF_STAIR_RAILING_NC_v1` -- Multiple paintable items with different UOMs in one spec
- `SF_WAINSCOT_PANEL_NC_v1` -- Fine finish millwork with type-based complexity modifier
- `SF_TRIM_NC_PAINT_v1` -- LF-based millwork painting

---

## 10. Acceptance Criteria

- [ ] All three paintable items (beam, column, mantel) have distinct production rates per element type
- [ ] beam_profile, column_type, and mantel_type complexity modifiers are correctly scoped to their respective items only
- [ ] Coffered ceiling beam exclusion is explicit in scope boundaries
- [ ] Stair newel post exclusion is explicit in scope boundaries
- [ ] Substrate-driven primer selection matches Millwork Doctrine SS4 (MDF edge seal, FJP stain-block, etc.)
- [ ] MDF two-step prime sequence maintained (shellac edge seal BEFORE latex face primer)
- [ ] Height modifier applies to beams and columns (overhead and elevated work)
- [ ] Material systems reuse existing SYS_FF_* IDs (no new SYS_ IDs)
- [ ] All protection zones use valid IDs from Protection_Zones_Reference
- [ ] All surface IDs (beam_wrap, column_wrap, mantel) verified against Surface_Vocabulary_Reference
- [ ] All 3 proposed PaintScope keys flagged for PaintScope team review
- [ ] Protection zones match expected patterns for millwork spray/brush
- [ ] Adjacency declarations cover beam-ceiling, column-ceiling, column-floor, mantel-wall relationships
- [ ] QT2 explicitly prohibited (prominent millwork)

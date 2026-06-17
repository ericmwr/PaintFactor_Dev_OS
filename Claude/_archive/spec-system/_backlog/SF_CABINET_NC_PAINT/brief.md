# Spec Brief: SF_CABINET_NC_PAINT

**Status:** Draft
**Priority:** P3
**Authored:** 2026-02-09
**Author:** Spec Researcher

---

## 1. Identity

| Field | Value |
|-------|-------|
| Spec Family ID | `SF_CABINET_NC_PAINT` |
| Name | New Construction Cabinet Painting (On-Site) |
| Domain | interior |
| Context | NC (new construction) |
| Description | Combined prime+paint spec for on-site painting of new construction kitchen, bathroom, and utility cabinets. Covers door/drawer front removal and flat painting on sawhorses, face frame and end panel in-place painting, and optional box interior painting. Fine Finish workflow with substrate-driven primer selection, QT-driven finish systems, and interstage discipline. Four paintable items: doors (EA), drawer fronts (EA), frame/end panels (SF), and interior (SF, conditional). Scope dimension controls which items are active: doors_only, full_exterior, or full_with_interior. Kitchen environment requires extensive protection (countertops, backsplash, appliances, floor). Hardware removal/reinstall is integral. 5-7 day cure before closing doors is mandatory for waterborne alkyd systems. |

---

## 2. Scope Boundaries

### Includes
- Cabinet door removal, flat painting on sawhorses (spray preferred), and reinstallation after cure
- Drawer front removal, flat painting on sawhorses, and reinstallation after cure
- Face frame painting in place (spray or brush)
- Exposed end panel / gable painting in place
- Box interior painting (conditional on scope = full_with_interior)
- Hardware removal (knobs, pulls, hinges, catches, soft-close mechanisms) and reinstallation
- Surface prep per substrate (sanding, dust removal, MDF edge sealing, grain filling)
- Fastener hole filling and sanding
- Caulking at cabinet-to-wall junctions (face frame to wall)
- MDF edge sealing with solvent-based sealer (bare MDF only -- step 1 of two-step prime)
- Primer coat -- conditional on substrate_state = SS_BARE (substrate-driven chemistry)
- Finish coat application -- 2 coats standard, 3+ at QT5 brush per FFD SS15.10.3
- Between-coat interstage process (inspect, sand, repair, clean) at ALL quality tiers
- Countertop protection (paper/plastic covering)
- Backsplash masking (between upper and lower cabinets)
- Appliance protection (adjacent or full coverage based on method)
- Kitchen/bath floor protection
- Wall masking adjacent to spray work
- Final quality inspection
- Protection teardown and cleanup

### Excludes (with routing)
| Excluded Item | Route To |
|---------------|----------|
| Built-in bookcases, entertainment centers, window seats | `SF_BUILTIN_NC` |
| Closet shelving | `SF_CLOSET_SHELF_NC` |
| Cabinet casing/trim (LF elements around cabinet openings) | `SF_TRIM_NC_PAINT` |
| Cabinet repaint (existing finish removal, adhesion testing) | `SF_CABINET_REPAINT` (future) |
| Factory-finished cabinets (painter doesn't touch) | Not in painting scope |
| Countertop surfaces (stone, laminate, solid surface) | Not painting scope |
| Cabinet lighting (under-cabinet, interior) | Electrician scope |
| Glass door inserts / decorative glass panels | Not painted -- excluded |
| Wire pull-out organizers / lazy susans (metal/wire) | Not painted -- excluded |

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT3, QT4, QT5 | QT3 | QT2 prohibited -- prominent millwork per Millwork Doctrine SS6. Sheen/QT gate enforced at runtime. |
| application_method | spray, brush | spray | Spray strongly preferred for cabinets (uniform finish, reaches all surfaces, production speed). Brush for small scope, occupied spaces, or limited ventilation. Per FFD SS15.10.5: cabinet interiors = spray preferred; face frames = spray or brush. |
| sheen | satin, semi-gloss, gloss | semi-gloss | Per QT gate: satin (QT3+), semi-gloss (QT4+), gloss (QT5 only). Semi-gloss is the kitchen/bath default for durability and cleanability. |
| substrate_state | SS_BARE, SS_PRIMED_FACTORY | SS_PRIMED_FACTORY | NC context. SS_BARE requires full primer (substrate-driven). SS_PRIMED_FACTORY skips primer. Standard NC cabinets arrive factory-primed. |
| scope | doors_only, full_exterior, full_with_interior | full_exterior | Controls which paintable items are active. doors_only = doors + drawers only (rare in NC, common for color-change-only scenarios). full_exterior = doors + drawers + frame + end panels (NC default). full_with_interior = everything including box interior. |

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | Conditional? |
|---------|------|-----|----------------|-------------|
| ITM_CABINET_DOOR | Cabinet door | EA | Count of full cabinet doors. Removed from hinges, painted flat on sawhorses or painting pyramids. Reinstalled after 5-7 day cure. | When scope includes doors (all scopes) |
| ITM_CABINET_DRAWER | Drawer front | EA | Count of drawer fronts. Removed from box, painted flat on sawhorses. Reinstalled after cure. Smaller than doors, faster rate. | When scope includes doors (all scopes) |
| ITM_CABINET_FRAME | Face frame + end panels | SF | Total SF of face frames, stiles, rails, and exposed end/gable panels. Painted in place (spray or brush). | When scope = full_exterior or full_with_interior |
| ITM_CABINET_INTERIOR | Box interior | SF | Interior surfaces of cabinet boxes (shelves, sides, top, bottom). Spray preferred for access. Lower QT acceptable (semi-exposed per AWI). | When scope = full_with_interior |

---

## 5. Required PaintScope Inputs

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|---------------|-----|----------|-------|
| IN_SF_CABINET_FACE | PS_SURFACE_SF.CABINET_FACE | SF | Always | Total visible face area (doors + drawers + frame). Drives material quantity calculations. Existing key. |
| IN_EA_CABINET_DOORS | PS_META.EA.CABINET_DOORS | EA | Always | Count of full cabinet doors to remove/paint. Existing key. |
| IN_EA_CABINET_DRAWERS | PS_META.EA.CABINET_DRAWERS | EA | Always | Count of drawer fronts to remove/paint. NEW key -- separate from doors for production rate accuracy. |
| IN_EA_CABINET_HARDWARE | PS_META.EA.CABINET_HARDWARE | EA | Always | Hardware pieces to remove/reinstall (knobs, pulls, hinges, catches). Existing key. |
| IN_EA_CABINET_END_PANELS | PS_META.EA.CABINET_END_PANELS | EA | When scope includes frame | Count of exposed end/gable panels. NEW key. |
| IN_SF_CABINET_FRAME | PS_SURFACE_SF.CABINET_FRAME | SF | When scope includes frame | Face frame + end panel SF for in-place painting labor. NEW key -- distinct from CABINET_FACE which includes doors/drawers. |
| IN_SF_CABINET_INTERIOR | PS_SURFACE_SF.CABINET_INTERIOR | SF | When scope = full_with_interior | Interior box surface SF. NEW key. |
| IN_EA_ROOMS_TOTAL | PS_META.EA.ROOMS_TOTAL | EA | Always | Room count for setup/cleanup. Existing key. |
| IN_SF_PROTECT_FLOOR_PERIMETER | PS_PROTECT_SF.FLOOR_PERIMETER | SF | When brush | Perimeter floor protection. Existing key. |
| IN_SF_PROTECT_FLOOR_KITCHEN | PS_PROTECT_SF.FLOOR_KITCHEN | SF | When spray | Full kitchen floor protection. Existing key. |
| IN_ENUM_HEIGHT_BAND | PS_META.HEIGHT_BAND | ENUM | Always | Height modifier for upper cabinets (standard, step ladder for tall uppers). Existing key. |
| IN_SF_FLOOR_VACUUM_AREA | PS_META.SF.FLOOR_VACUUM_AREA | SF | Always | Post-work vacuum cleanup area. Existing key. |

### Proposed New Keys

| Proposed Key | UOM | Description | Justification |
|-------------|-----|-------------|---------------|
| `PS_META.EA.CABINET_DRAWERS` | EA | Count of drawer fronts to remove/paint | Drawer fronts are smaller than doors with different production rates. Separating from PS_META.EA.CABINET_DOORS enables accurate labor estimation. Industry standard to count doors and drawers separately. |
| `PS_SURFACE_SF.CABINET_FRAME` | SF | Face frame + end panel SF | Needed for in-place painting labor rates. PS_SURFACE_SF.CABINET_FACE includes doors/drawers (removed items) -- frame SF must be separate for production rate accuracy. |
| `PS_META.EA.CABINET_END_PANELS` | EA | Exposed end/gable panel count | End panels may be removed for flat painting or painted in place. Count drives labor task routing. |
| `PS_SURFACE_SF.CABINET_INTERIOR` | SF | Interior box surface area | Conditional on scope = full_with_interior. Separate from exterior because interior uses different rates, lower QT acceptable, and spray-only access in many configurations. |

---

## 6. Protection Zones

Per Protection_Zones_Reference v2.1, "Commonly Paired Zones by Spec Type -- Cabinet":

| Zone ID | Condition | Protection Level | Notes |
|---------|-----------|------------------|-------|
| floor_perimeter | application_method = brush | edge_only | Perimeter drops at cabinet base. From Protection_Zones_Reference. |
| floor_full_kitchen | application_method = spray | full_cover | Full kitchen floor coverage for cabinet spray. From Protection_Zones_Reference. |
| countertop_covers | always | full_cover | Countertop surfaces covered with paper/plastic. Critical -- paint on stone/granite is catastrophic. From Protection_Zones_Reference. |
| backsplash_mask | application_method = spray | full_cover | Tile backsplash between upper and lower cabinets masked with paper. From Protection_Zones_Reference. |
| appliance_adjacent | application_method = brush | partial_cover | Plastic film on appliance faces adjacent to brush work. From Protection_Zones_Reference. |
| appliance_covers | application_method = spray | full_cover | Full plastic sheeting over appliances for spray work. From Protection_Zones_Reference. |
| wall_adjacent_cabinet | application_method = spray | partial_cover | Wall area adjacent to cabinets masked for spray overspray. From Protection_Zones_Reference. |
| cabinet_hardware | always | N/A | Hardware removed before painting, not just masked. From Protection_Zones_Reference. |
| fixture_covers | application_method = spray | full_cover | Kitchen light fixtures protected from spray. From Protection_Zones_Reference. |

---

## 7. Adjacency Declarations

### Primary Surface: cabinet_face_frame

| Adjacent Surface | Edge Type | Typical Relationship | Notes |
|-----------------|-----------|---------------------|-------|
| wall_field | linear | different_finish | Cabinets meet wall at face frame edges, above uppers, below uppers, beside end panels. Different finish -- cabinet enamel (semi-gloss) vs wall paint (flat/eggshell). Primary edge relationship. |
| ceiling_field | linear | different_finish | Upper cabinets may extend to ceiling. Soffit or gap above uppers. |
| countertop_surface | linear | not_in_scope | Lower cabinets meet countertop. Not painted. Protection required. |
| tile_backsplash | linear | not_in_scope | Space between upper and lower cabinets. Not painted. Protection required. |
| appliance | complex | not_in_scope | Cabinets flank refrigerator, range, dishwasher. Protection required. |
| floor | linear | not_in_scope | Cabinet base/toe kick meets floor. Floor not painted. |

---

## 8. References

### 8a. Domain Doctrines (per-spec)

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Fine Finish | `docs/Doctrine/Fine_Finish_Doctrine.md` | SS1.1 (scope -- cabinets listed), SS2 (core principles), SS3 (material systems), SS4 (sheen/QT gate), SS5 (module structure), SS7 (interstage), SS10.3 (built-in/cabinet specifics -- door removal, horizontal painting, blocking resistance), SS15.10.4 (AWI surface visibility categories -- exposed vs semi-exposed vs concealed), SS15.10.5 (where spray remains superior -- cabinet interiors), SS15.11.3 (cabinetry "Thin to Win" philosophy, 5-7 day cure) |
| Millwork NC Paint | `docs/Doctrine/Millwork_NC_Paint_Doctrine.md` | SS2 (substrate classification -- MDF, FJP, softwood, hardwood), SS3 (surface prep matrix), SS4 (primer systems -- MDF edge seal, FJP stain-block), SS6 (prominent millwork = QT2 prohibited), SS7.2 (complexity modifiers) |
| Quality Tiers | `docs/Doctrine/Quality_Tiers_and_Surface_Condition.md` | QT3-QT5 definitions, sheen/QT gate, condition gate at QT5 |
| Materials and Consumables | `docs/Doctrine/Materials_and_Consumables_Doctrine.md` | Consumable standards, tape yields (180 LF/roll), caulk/spackle usage, roller/brush selection |
| Estimation Modifiers | `docs/Doctrine/Estimation_Modifiers_Doctrine.md` | Height modifiers, room complexity (COMP_CABINETS 1.50x for adjacent specs), modifier stacking, spray/backroll coupling |
| Protection and Masking | `docs/Doctrine/Protection_and_Masking_Doctrine.md` | Floor protection methods, wall masking near spray, masking film sizes (72" for standard, 99" for full-height) |
| Interior Protection | `docs/Doctrine/Interior_Protection_Doctrine.md` | Protection zone activation patterns, cabinet-specific protection (§ Asset-Specific Protection Reference -- Cabinets), kitchen protection consolidation |

### 8b. Standing References (always included)

| Reference | Path | Purpose |
|-----------|------|---------|
| Spec Completeness Doctrine | `docs/Doctrine/Spec_Completeness_Doctrine.md` | Mandatory completeness requirements |
| Modifier Registry | `docs/Doctrine/Modifier_Registry.md` | Canonical modifier IDs and values (H1-H4, QT3-QT5, COND_*, COMP_CABINETS, etc.) |
| Protection Zones Reference | `docs/Reference/Protection_Zones_Reference.md` | Valid zone IDs |
| Surface Vocabulary Reference | `docs/Reference/Surface_Vocabulary_Reference.md` | Valid surface IDs (cabinet_face_frame, cabinet_door, cabinet_drawer, cabinet_box_interior, cabinet_end_panel) |
| Site Condition Vocabulary | `docs/Reference/Site_Condition_Vocabulary_Reference.md` | Valid site condition IDs |
| Substrate State Reference | `docs/Reference/Substrate_State_Reference.md` | SS_* state IDs |
| PaintScope Quantity Key Catalog | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` | Key verification (Section: Cabinets -- existing keys) |
| Spec Input to PaintScope Mapping | `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` | Input-key mapping (Section 7: Cabinets -- existing mappings) |
| Spec JSON Schema | `specs/_schemas/spec.schema.json` | Target schema |

---

## 9. Special Notes / Constraints

### Door/Drawer Removal Workflow (Critical)
- ALL cabinet doors and drawer fronts are REMOVED before painting
- Hardware (hinges, knobs, pulls, catches, soft-close mechanisms) removed first, stored in labeled bags
- Doors/drawer fronts laid flat on sawhorses or painting pyramids (horizontal painting)
- **5-7 day minimum cure for waterborne alkyd (QT4+) before closing doors** -- premature closing causes finish fusion and catastrophic peeling per FFD SS15.11.3
- Standard acrylic enamel (QT3): 3-5 day cure recommended before closing
- Reinstallation includes hardware reinstall and door alignment adjustment

### "Thin to Win" (FFD SS15.11.3)
High-performance waterborne alkyds (BM Advance, SW Emerald Urethane) are prone to sagging on vertical surfaces. Horizontal finishing on sawhorses eliminates gravity interference and produces glass-like finish. This is WHY doors are removed.

### AWI Surface Visibility Categories (FFD SS15.10.2)
Cabinets have three visibility categories per AWI:
- **Exposed:** Door fronts, drawer fronts, face frames, end panels -- highest QT applies
- **Semi-Exposed:** Interior when doors open (shelves, sides, top) -- one QT level lower acceptable
- **Concealed:** Back of cabinets against wall -- seal coat only for moisture stability

This means ITM_CABINET_INTERIOR can operate at one QT level below the specified quality_tier (e.g., if spec is QT4, interior can be QT3). The SOP Librarian should handle this through reduced interstage scrutiny for interior tasks.

### Kitchen-Specific Protection
Kitchen cabinet painting requires the most extensive protection of any spec family:
- Countertops: Paper + plastic, sealed edges (paint on granite is permanent damage)
- Backsplash: Full masking paper between upper and lower cabinets
- Appliances: Full plastic coverage for spray; adjacent protection for brush
- Floor: Full kitchen floor coverage for spray (rosin paper + taped seams)
- Sink: Cover/plug to prevent paint in drain
- Outlets/switches: Cover plates removed

### Scope Dimension Behavior
| Scope | Active Items | Use Case |
|-------|-------------|----------|
| doors_only | ITM_CABINET_DOOR, ITM_CABINET_DRAWER | Color change only -- face frame already finished. Rare in NC. |
| full_exterior | ITM_CABINET_DOOR, ITM_CABINET_DRAWER, ITM_CABINET_FRAME | NC default -- all visible surfaces. Interior left factory-primed or unfinished. |
| full_with_interior | All 4 items | Complete paint -- inside and out. Typically white interior, different exterior color. |

### Material Systems
Same QT-driven systems as other fine finish millwork -- all reuse existing SYS_ IDs:
- **QT3:** SYS_FF_STANDARD_ACRYLIC (100% acrylic enamel -- Sherwin-Williams ProClassic, BM Regal Select)
- **QT4:** SYS_FF_MODIFIED_URETHANE (waterborne alkyd -- BM Advance, SW Emerald Urethane)
- **QT5:** SYS_FF_PREMIUM (premium urethane -- Fine Paints of Europe Eurolux, BM Advance)
No new material system IDs needed.

### Primer Systems (substrate-driven)
Same substrate-driven logic as other millwork specs:
- **SS_BARE MDF:** Two-step prime -- shellac edge seal BEFORE latex face primer (mandatory sequence)
- **SS_BARE softwood/FJP:** Stain-blocking primer (SYS_PRIMER_STAIN_BLOCK)
- **SS_BARE hardwood:** Standard latex primer (SYS_PRIMER_LATEX)
- **SS_PRIMED_FACTORY:** Skip primer entirely
No new primer system IDs needed.

### Context Prefix
- **CABT** -- TSK_CABT_*, MOD_CABT_*

### Sibling Specs (structural reference)
- `SF_BUILTIN_NC_v1` -- Closest structural sibling (door removal workflow, fine finish, multi-item). Key difference: builtins use Opening Count EA method; cabinets use separate door/drawer/frame items.
- `SF_DOOR_SLAB_INT_NC_v1` -- Door removal/reinstall pattern reference
- `SF_CLOSET_SHELF_NC_v1` -- Opening count method comparison (cabinets do NOT use opening tiers)
- `SF_ARCH_ELEMENT_NC_v1` -- Multi-item millwork spec pattern

### Height Considerations
- Lower cabinets: H1 (standard, 1.0x) -- floor level
- Upper cabinets: H1 (standard, 1.0x) -- typically 54" to 90" AFF, reachable without ladder
- Tall upper cabinets (42" uppers): May need step stool -- still H1
- Over-refrigerator/pantry cabinets: May need step ladder -- H2 (1.30x) possible but rare
- Height modifier applies per room, not per cabinet

### Sequencing Notes
- Cabinet painting typically happens AFTER drywall prime and BEFORE wall finish
- Trim-first doctrine applies: trim → cabinets → walls (protection optimization)
- Cabinet doors need 5-7 day cure -- plan reinstallation timing with project schedule
- Face frame painting must complete BEFORE wall finish to avoid wall masking

### Inherited Research Corrections
- **RC-005:** Material systems are suggestions per QT -- contractor has discretion
- **RC-006:** Both Advance (waterborne alkyd) and Emerald Urethane (acrylic-urethane enamel, NOT waterborne alkyd) have SHORT working times

---

## 10. Acceptance Criteria

- [ ] Four paintable items: ITM_CABINET_DOOR (EA), ITM_CABINET_DRAWER (EA), ITM_CABINET_FRAME (SF), ITM_CABINET_INTERIOR (SF conditional)
- [ ] Scope dimension controls item activation (doors_only, full_exterior, full_with_interior)
- [ ] Door/drawer removal workflow: remove → paint flat → 5-7 day cure → reinstall
- [ ] 5-7 day cure requirement documented for QT4+ waterborne alkyd before closing doors
- [ ] QT2 explicitly prohibited (prominent millwork per Millwork Doctrine SS6)
- [ ] Substrate-driven primer selection matches Millwork Doctrine SS4 (MDF edge seal, FJP stain-block)
- [ ] MDF two-step prime sequence maintained (shellac edge seal BEFORE latex face primer)
- [ ] AWI visibility categories honored: interior tasks at reduced scrutiny vs exterior
- [ ] Material systems reuse existing SYS_FF_* IDs (no new SYS_ IDs)
- [ ] Kitchen protection zones match Protection_Zones_Reference Cabinet paired zones (floor_full_kitchen, countertop_covers, backsplash_mask, appliance_covers, wall_adjacent_cabinet)
- [ ] All surface IDs verified against Surface_Vocabulary_Reference (cabinet_face_frame, cabinet_door, cabinet_drawer, cabinet_box_interior, cabinet_end_panel)
- [ ] 4 proposed PaintScope keys flagged for PaintScope team review
- [ ] 3 existing PaintScope keys correctly mapped (CABINET_FACE, CABINET_DOORS, CABINET_HARDWARE)
- [ ] Built-in exclusion is explicit in scope boundaries (→ SF_BUILTIN_NC)
- [ ] Repaint exclusion is explicit (→ SF_CABINET_REPAINT future)
- [ ] State declarations include valid_input_states (SS_BARE, SS_PRIMED_FACTORY) and output_state (varies by sheen)
- [ ] Adjacency declarations cover cabinet-to-wall, cabinet-to-ceiling, cabinet-to-countertop, cabinet-to-backsplash, cabinet-to-appliance
- [ ] Hardware removal/reinstall tasks driven by PS_META.EA.CABINET_HARDWARE count
- [ ] Sink protection noted for kitchen scope
- [ ] Height modifier addresses upper cabinet access

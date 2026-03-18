# Interior Stain/Clear Coat Specs — Design Document

> Approved: 2026-03-18
> Status: Ready for implementation planning
> Scope: 10 new SpecFactory spec families for interior bare wood stain and clear coat workflows

---

## 1. Problem Statement

PaintScope currently supports only paint workflows (prime + finish) for interior wood surfaces. When a user selects `bare_wood` substrate state, the engine activates paint specs — but in practice, bare wood is frequently stained and clear-coated rather than painted. No interior stain or clear coat specs exist in the system. The UI has no mechanism to choose between paint vs stain/clear for bare wood surfaces.

## 2. Scope

### In Scope
- 10 new interior NC (new construction) stain/clear coat spec families
- Full SpecFactory 7-stage pipeline per spec (Researcher → Resolver → Materials → SOP → Estimation → Critic → Assembly)
- 7 artifacts per spec (research.json, spec.json, materials.json, sop_modules.json, production.json, resolution.json, qa_report.json)
- Registry updates (controlled_enums.json, id_registry.json)
- Database import and db-bundle.js regeneration
- PaintScope UI and engine integration

### Out of Scope
- Interior repaint stain specs (RP — stripping existing finish, recoating)
- Cabinet stain (SF_CABINET_NC_PAINT handles cabinets; stain variant deferred)
- Exterior stain (already handled by SF_DECK_EXT and SF_FENCE_EXT specs)
- Faux/decorative wood graining

## 3. Spec Family Architecture

10 spec families, each mirroring the existing paint spec for the same surface:

| # | Spec Family ID | Surface | UOM | QT Range | Paint Counterpart |
|---|---|---|---|---|---|
| 1 | `SF_TRIM_NC_STAIN_v1` | 7 trim profiles (baseboard, crown, chair rail, wainscot rail, shadow box, panel mold, picture rail) | LF | QT3-QT5 | SF_TRIM_NC_PAINT |
| 2 | `SF_DOOR_SLAB_INT_NC_STAIN_v1` | Door slabs | EA | QT3-QT5 | SF_DOOR_SLAB_INT_NC |
| 3 | `SF_DOOR_FRAME_NC_STAIN_v1` | Door frames/jambs | EA | QT3-QT5 | SF_DOOR_FRAME_NC_FINISH |
| 4 | `SF_WINDOW_INT_NC_STAIN_v1` | Windows (sash + jamb) | EA | QT3-QT5 | SF_WINDOW_INT_NC |
| 5 | `SF_STAIR_RISER_NC_STAIN_v1` | Stair risers/treads | EA | QT3-QT5 | SF_STAIR_RISER_NC |
| 6 | `SF_STAIR_RAILING_NC_STAIN_v1` | Railings/balusters/newels | Per-item: railing=LF, balusters=EA, newels=EA | QT3-QT5 | SF_STAIR_RAILING_NC |
| 7 | `SF_WOOD_WALL_NC_STAIN_v1` | Feature walls (shiplap, T&G, panels) | SF | QT3-QT4 | SF_WOOD_WALL_NC |
| 8 | `SF_WOOD_CEILING_NC_STAIN_v1` | Wood ceilings (plank, beadboard, coffered) | SF | QT3-QT4 | SF_WOOD_CEILING_NC |
| 9 | `SF_WAINSCOT_PANEL_NC_STAIN_v1` | Wainscoting panels | SF | QT3-QT4 | SF_WAINSCOT_PANEL_NC |
| 10 | `SF_ARCH_ELEMENT_NC_STAIN_v1` | Beams/columns/mantels | Per-item: beams=LF, columns=EA, mantels=EA | QT3-QT5 | SF_ARCH_ELEMENT_NC |

**Item alignment note:** Trim stain spec uses the same 7 items as its paint counterpart (SF_TRIM_NC_PAINT). Door casings and window casings are excluded from trim — they are handled by their respective stain specs (SF_DOOR_FRAME_NC_STAIN, SF_WINDOW_INT_NC_STAIN). Shoe mold, window stool, and window apron are handled by the trim paint spec via edge items and carry over to trim stain.

## 4. Configuration Dimensions

### 4.1 Primary Dimensions

| Dimension | Values | Scope | Notes |
|---|---|---|---|
| `coating_type` | `stain_clear`, `stain_only`, `clear_only` | All specs | Drives layer stack, material systems, available methods |
| `quality_tier` | `QT3`, `QT4`, `QT5` (QT3-QT4 for wood wall, wood ceiling, wainscot panel) | All specs | Drives coat count defaults, interstage rigor |
| `application_method_stain` | `brush`, `roll`, `spray` | Active when coating_type includes stain | All stain methods include a wipe step |
| `application_method_clear` | `brush`, `spray` | Active when coating_type includes clear | No roll — causes air bubbles in clear coat |

### 4.2 Coat Count Dimensions (user-selectable with QT-driven defaults)

| Dimension | Values | Default by QT | Visible When |
|---|---|---|---|
| `stain_coats` | 1 / 2 | QT3: 1, QT4: 1, QT5: 1 | coating_type includes stain |
| `sealer_coats` | 0 / 1 / 2 | QT3: 0, QT4: 1, QT5: 2 | coating_type includes clear |
| `clear_coats` | 1 / 2 / 3 | QT3: 1, QT4: 2, QT5: 3 | coating_type includes clear |

All three are user-selectable — the QT defaults are starting values, not constraints. A QT5 job might use 2 sealer + 2 clear if budget is tight; a QT3 job might add 1 sealer coat for better results.

### 4.3 Sheen Dimension

| Dimension | Values | Scope | Notes |
|---|---|---|---|
| `clear_sheen` | satin / semi-gloss / gloss | When coating_type includes clear | Drives clear coat product selection; stain_only has no sheen (penetrating finish) |

### 4.4 Secondary Dimensions (surface-specific)

| Dimension | Applies To | Values | Effect |
|---|---|---|---|
| `profile_complexity` | Trim, doors, windows | simple / standard / complex / ornate | 0.85x-1.40x labor modifier |
| `wood_species_group` | All specs | softwood / hardwood | Softwood = mandatory pre-stain wood conditioner (unless gel stain selected) |
| `height_band` | Beams, columns, wood ceilings, wood walls | standard / elevated / high | Height labor modifier |

### 4.5 Method Availability Matrix

| coating_type | Stain Methods | Clear Methods |
|---|---|---|
| `stain_clear` | brush, roll, spray | brush, spray (independent selection from stain method) |
| `stain_only` | brush, roll, spray | N/A |
| `clear_only` | N/A | brush, spray |

For `stain_clear`, the stain and clear application methods are resolved **independently**. A common production workflow is roll stain (speed) + spray clear (finish quality).

### 4.6 Three-Layer Coat Stack (QT defaults, user-overridable)

All coat counts are user-selectable. QT provides sensible defaults only.

**`stain_clear` defaults:**

| Layer | QT3 Default | QT4 Default | QT5 Default | User Range |
|---|---|---|---|---|
| **Stain** | 1 | 1 | 1 | 1-2 |
| **Sanding sealer** | 0 | 1 | 2 | 0-2 |
| **Clear topcoat** | 1 | 2 | 3 | 1-3 |
| **Total** | 2 | 4 | 6 | 2-7 |

**`clear_only` defaults** (same as above, minus stain row):

| Layer | QT3 Default | QT4 Default | QT5 Default | User Range |
|---|---|---|---|---|
| **Sanding sealer** | 0 | 1 | 2 | 0-2 |
| **Clear topcoat** | 1 | 2 | 3 | 1-3 |
| **Total** | 1 | 3 | 5 | 1-5 |

**`stain_only` defaults** (no sealer or clear):

| Layer | QT3 Default | QT4 Default | QT5 Default | User Range |
|---|---|---|---|---|
| **Stain** | 1 | 1 | 1 | 1-2 |

Budget example (QT3 stain_clear): 1 stain + 0 sealer + 1 clear = 2 total coats.
Standard example (QT4 stain_clear): 1 stain + 1 sealer + 2 clear = 4 total coats.
Premium example (QT5 stain_clear): 1 stain + 2 sealer + 3 clear = 6 total coats.
Max possible (QT5, user override): 2 stain + 2 sealer + 3 clear = 7 total coats.

## 5. SOP Module Architecture

### 5.1 Canonical Module Set (up to 14 modules per spec)

Each spec defines up to 14 modules in its sop_modules.json. Not all activate for every variant — coating_type and user-selected coat counts gate activation. Modules with no activated tasks are skipped at runtime.

| # | Module ID Pattern | Phase | Activated When | Key Tasks |
|---|---|---|---|---|
| 1 | `MOD_*_SETUP` | setup | Always | Floor protection, adjacent surface masking, fixture covers |
| 2 | `MOD_*_PREP` | prep | Always | Inspect bare wood, sand to profile (120-150 grit), fill defects (wood filler — not spackle), clean/tack. Includes conditional grain-raise task (wet wipe + dry + re-sand) activated when waterborne stain or WB clear is selected. |
| 3 | `MOD_*_CONDITION` | prep | wood_species_group = softwood AND coating_type includes stain AND stain product != gel | Apply wood conditioner, wait per manufacturer (~15 min), wipe excess |
| 4 | `MOD_*_STAIN_APPLY` | apply | coating_type includes stain | Apply stain coat 1 (brush+wipe / roll+wipe / spray+wipe), maintain wet edge |
| 5 | `MOD_*_STAIN_COAT_2` | apply | stain_coats = 2 | Apply stain coat 2 (same method), verify color depth |
| 6 | `MOD_*_STAIN_DRY` | interstage | coating_type includes stain AND coating_type != stain_only | Dry time verification before sealer/clear (4-8 hrs oil, 2 hrs waterborne typical) |
| 7 | `MOD_*_SEALER_APPLY` | apply | sealer_coats >= 1 | Apply sanding sealer coat 1 (brush or spray — same method rules as clear) |
| 8 | `MOD_*_SEALER_INTERSTAGE` | interstage | sealer_coats = 2 | Sand sealer (220-320 grit), tack, apply sealer coat 2 |
| 9 | `MOD_*_SEALER_SAND` | interstage | sealer_coats >= 1 | Final sealer sand before clear topcoat (320 grit), tack |
| 10 | `MOD_*_CLEAR_APPLY` | finish | coating_type includes clear | Apply clear coat 1 (brush or spray), using application_method_clear |
| 11 | `MOD_*_CLEAR_INTERSTAGE` | interstage | clear_coats >= 2 | Sand between clear coats (320 QT4, 400 QT5), tack, inspect |
| 12 | `MOD_*_CLEAR_COAT_2` | finish | clear_coats >= 2 | Apply clear coat 2 |
| 13 | `MOD_*_CLEAR_COAT_3` | finish | clear_coats = 3 | Apply clear coat 3 |
| 14 | `MOD_*_CLEANUP` | cleanup | Always | Remove masking, vacuum dust, final inspection, touch-up |

### 5.2 Phase Mapping

| Phase | Stain/Clear Usage | Paint Spec Equivalent |
|---|---|---|
| `setup` | Protection, masking | Same |
| `prep` | Sand bare wood, fill, grain raise, condition | Sand primer, fill, caulk |
| `apply` | Stain coats + sanding sealer coats | Prime coats |
| `interstage` | Dry verification, sanding between coats | Same |
| `finish` | Clear topcoat(s) | Paint finish coat(s) |
| `cleanup` | Remove masking, vacuum, inspect | Same |

Stain and sealer use `apply` phase; clear topcoat uses `finish` phase. This mirrors prime (build-up) vs paint (final) in paint specs. **Stain specs do not use the `prime` phase** — wood conditioner is prep, stain/sealer are apply, clear is finish.

### 5.3 Estimated Task Counts

| Spec | Estimated Tasks | Estimated Modules |
|---|---|---|
| SF_TRIM_NC_STAIN | 30-40 | 10-14 |
| SF_DOOR_SLAB_INT_NC_STAIN | 25-35 | 10-14 |
| SF_DOOR_FRAME_NC_STAIN | 25-35 | 10-14 |
| SF_WINDOW_INT_NC_STAIN | 25-35 | 10-14 |
| SF_STAIR_RISER_NC_STAIN | 25-35 | 10-14 |
| SF_STAIR_RAILING_NC_STAIN | 30-40 | 10-14 |
| SF_WOOD_WALL_NC_STAIN | 25-35 | 10-14 |
| SF_WOOD_CEILING_NC_STAIN | 25-35 | 10-14 |
| SF_WAINSCOT_PANEL_NC_STAIN | 25-35 | 10-14 |
| SF_ARCH_ELEMENT_NC_STAIN | 30-40 | 10-14 |
| **Total** | **~270-360 tasks** | **~100-140 modules** |

## 6. Material Systems

### 6.1 Product Systems by Role

| product_role | System ID Pattern | Products | Hard Constraints |
|---|---|---|---|
| `stain` | `SYS_STAIN_OIL` | Oil-based penetrating stain | None |
| `stain` | `SYS_STAIN_OIL_MOD` | Oil-modified stain (VOC-compliant) | None |
| `stain` | `SYS_STAIN_WB` | Water-based stain | None |
| `stain` | `SYS_STAIN_GEL` | Gel stain | QT4+ only (blotch control) |
| `sealer` | `SYS_SEALER_OIL` | Oil-based sanding sealer | None |
| `sealer` | `SYS_SEALER_WB` | Water-based sanding sealer | None |
| `clear` | `SYS_CLEAR_POLY_OIL` | Oil-based polyurethane | None |
| `clear` | `SYS_CLEAR_POLY_WB` | Water-based polyurethane | None |
| `clear` | `SYS_CLEAR_LACQUER` | Lacquer | Spray-only application |

**No chemistry-pairing constraints between layers.** Oil stain under WB clear is standard practice. Any stain works under any sealer works under any clear. Only 2 hard rules exist:
1. Gel stain requires QT4+ (controls blotch on softwood)
2. Lacquer clear requires spray-only application

### 6.2 Coverage Profiles

| Profile | Base Rate | Notes |
|---|---|---|
| `COV_*_STAIN_BRUSH` | ~200 SF/QT | Varies by wood porosity |
| `COV_*_STAIN_ROLL` | ~300 SF/QT | Higher waste from wipe-off |
| `COV_*_STAIN_SPRAY` | ~350 SF/QT | Overspray waste, agitation concerns |
| `COV_*_SEALER` | ~500 SF/QT | Thin coats, high spread |
| `COV_*_CLEAR_BRUSH` | ~400 SF/QT | Similar to paint coverage |
| `COV_*_CLEAR_SPRAY` | ~500 SF/QT | Higher transfer efficiency |

### 6.3 Consumables (stain-specific additions)

| Category | Items | Notes |
|---|---|---|
| abrasive | 120-grit (bare wood prep), 150-grit (final prep), 220-grit (sealer sand), 320-grit (clear interstage), 400-grit (QT5 final) | Wider grit progression than paint |
| applicator | Stain rags/wipe cloths, foam brushes (stain), foam rollers (stain roll), natural bristle brushes (oil clear), synthetic brushes (WB clear) | Foam rollers avoid lint in stain |
| prep | Wood conditioner (softwood + stain), tack cloths, mineral spirits (oil cleanup) | |
| protection | Same as paint specs — floor, adjacent surface, fixture covers | |
| tool | Stain mixing sticks (agitation), straining cones (clear coat), HVLP spray setup (if spray method) | |

## 7. Registry & Substrate State Changes

### 7.1 New Substrate States (controlled_enums.json)

Following the NC convention (`SS_` prefix — the `SS_INT_` prefix is reserved for RP states), two new states are added. `SS_BARE` already exists and is reused as the input state for bare wood.

| State ID | Status | Description |
|---|---|---|
| `SS_BARE` | **Existing** | Raw/uncoated substrate (bare wood, MDF, new drywall) — reused as-is |
| `SS_STAINED` | **New** | Stained wood — stain applied, no clear coat yet |
| `SS_CLEAR_COATED` | **New** | Clear-coated wood — stain and/or clear coat present |

### 7.2 State Declarations Per Spec

| coating_type | Valid Input States | Output State |
|---|---|---|
| `stain_clear` | `SS_BARE` | `SS_CLEAR_COATED` |
| `stain_only` | `SS_BARE` | `SS_STAINED` |
| `clear_only` | `SS_BARE`, `SS_STAINED` | `SS_CLEAR_COATED` |

**Note:** Recoating an existing clear coat (`SS_CLEAR_COATED` as input) is out of scope — that requires a future RP stain spec with sanding/scuffing prep workflow.

### 7.3 UI State Mapping Updates (spec-maps.js)

| UI Value | Current Mapping | New Mapping | Notes |
|---|---|---|---|
| `bare_wood` | `SS_BARE` | `SS_BARE` | **No change** — existing mapping preserved |
| `stained` | `SS_STAINED` | `SS_STAINED` | Existing UI value; maps to new registry state `SS_STAINED` |
| `clear_coated` (new) | N/A | `SS_CLEAR_COATED` | New UI option for wood substrates |

No breaking changes to existing paint spec mappings. The `SS_BARE` input state is shared between paint and stain specs — `coating_type` is what differentiates which spec activates.

### 7.4 Estimated New ID Counts

| ID Type | Per Spec | Total (10 specs) |
|---|---|---|
| Modules | 10-14 | 100-140 |
| Tasks | 25-40 | 270-360 |
| Material Systems | 6-8 | ~9 shared + per-spec coverage profiles |
| Rounds | 3-4 | 30-40 |
| Coverage Profiles | 3 | 30 |
| Modifiers | 2-4 | 20-40 |
| **Total new IDs** | | **~400-500** |

## 8. PaintScope Engine & UI Integration

### 8.1 Engine Changes

**Spec activation routing:** Add `coating_type` to spec resolution context:

| User Selection | Activated Spec |
|---|---|
| bare_wood + `paint` (or no coating_type) | Existing paint prime + finish specs (unchanged) |
| bare_wood + `stain_clear` | Stain spec (stain_clear variant) |
| bare_wood + `stain_only` | Stain spec (stain_only variant) |
| bare_wood + `clear_only` | Stain spec (clear_only variant) |

**Key engine additions:**
1. `coating_type` added to spec resolution context
2. `application_method_stain` and `application_method_clear` resolved independently for `stain_clear`
3. Coat stack resolved from QT + coating_type
4. Material system selection driven by user product preference

### 8.2 UI Changes

**New controls in room editor substrate config (visible when bare_wood on wood substrate):**

| Control | Type | Visible When |
|---|---|---|
| `coating_type` | Select: paint / stain_clear / stain_only / clear_only | substrate_state = bare_wood on any wood substrate |
| `application_method_stain` | Select: brush / roll / spray | coating_type includes stain |
| `application_method_clear` | Select: brush / spray | coating_type includes clear |
| `stain_coats` | Select: 1 / 2 (default from QT) | coating_type includes stain |
| `sealer_coats` | Select: 0 / 1 / 2 (default from QT) | coating_type includes clear |
| `clear_coats` | Select: 1 / 2 / 3 (default from QT) | coating_type includes clear |
| `clear_sheen` | Select: satin / semi-gloss / gloss | coating_type includes clear |
| `wood_species_group` | Select: softwood / hardwood | coating_type != paint |

### 8.3 Data Flow

```
User selects bare_wood + stain_clear on trim
  -> UI stores: coating_type, app_method_stain, app_method_clear, stain_coats, sealer_coats, clear_coats, clear_sheen, wood_species_group
  -> Engine: quantity-lookups emits PS keys (same as paint: PS_SURFACE_LF.TRIM_BASEBOARD etc.)
  -> Engine: spec-resolution matches SF_TRIM_NC_STAIN via coating_type + substrate_state
  -> Engine: modifier-stack applies profile_complexity, height_band as today
  -> Engine: per-item-compute uses stain/sealer/clear production rates from db-bundle
  -> Output: task list with stain, sealer, clear phases + hours
```

### 8.4 Files Modified

| File | Changes |
|---|---|
| `src/data/enums.js` | Add coating_type enum, wood_species_group enum, clear_sheen enum, clear_coated substrate state |
| `src/data/spec-maps.js` | Add 10 stain spec entries to SPEC_SUBSTRATE_MAP, SPEC_VALID_INPUT_STATES, UI_STATE_TO_SPEC_STATE |
| `src/state/reducer.js` | Handle coating_type, app_method_stain, app_method_clear, stain_coats, sealer_coats, clear_coats, clear_sheen in substrate config |
| `src/state/initial-state.js` | Add coating_type defaults for wood substrates, QT-driven coat count defaults |
| `src/engine/spec-resolution.js` | Route to stain specs when coating_type != paint |
| `src/engine/run-estimate.js` | Pass coating_type + coat counts context through pipeline |
| `src/components/room-editor/SubstrateDetailPanel.jsx` | Render conditional coating_type, stain/clear method, coat count, sheen controls |
| `src/data/db-bundle.js` | Regenerated with stain spec data |
| `specs/_registry/controlled_enums.json` | Add SS_STAINED, SS_CLEAR_COATED states; add coating_type, wood_species_group, application_method_stain, application_method_clear as new enum dimensions |
| `specs/_registry/id_registry.json` | Add ~400-500 new IDs |

## 9. Context Prefixes

Each spec uses a unique context prefix for ID generation, distinct from its paint counterpart to avoid collisions:

| Spec Family | Context Prefix | Example IDs |
|---|---|---|
| SF_TRIM_NC_STAIN | `TRST` | MOD_TRST_SETUP, TSK_TRST_APPLY_STAIN_1 |
| SF_DOOR_SLAB_INT_NC_STAIN | `DSST` | MOD_DSST_PREP, TSK_DSST_SAND_BARE |
| SF_DOOR_FRAME_NC_STAIN | `DFST` | MOD_DFST_SETUP, TSK_DFST_APPLY_CLEAR_1 |
| SF_WINDOW_INT_NC_STAIN | `WIST` | MOD_WIST_PREP, TSK_WIST_CONDITION |
| SF_STAIR_RISER_NC_STAIN | `SRST` | MOD_SRST_STAIN_APPLY, TSK_SRST_SEALER_SAND |
| SF_STAIR_RAILING_NC_STAIN | `RLST` | MOD_RLST_SETUP, TSK_RLST_APPLY_STAIN_1 |
| SF_WOOD_WALL_NC_STAIN | `WWST` | MOD_WWST_PREP, TSK_WWST_CLEAR_APPLY |
| SF_WOOD_CEILING_NC_STAIN | `WCST` | MOD_WCST_SETUP, TSK_WCST_SEALER_APPLY |
| SF_WAINSCOT_PANEL_NC_STAIN | `WPST` | MOD_WPST_PREP, TSK_WPST_STAIN_DRY |
| SF_ARCH_ELEMENT_NC_STAIN | `AEST` | MOD_AEST_SETUP, TSK_AEST_APPLY_CLEAR_2 |

Material system IDs (SYS_STAIN_*, SYS_SEALER_*, SYS_CLEAR_*) are shared across all 10 specs — registered once in id_registry.json.

**Collision check:** All context prefixes must be verified against the existing id_registry.json during the Resolver stage to confirm no collisions with existing paint spec prefixes or other registered IDs.

## 10. SpecFactory Pipeline Execution Order

Specs should be developed in this order (dependencies first):

| Priority | Specs | Rationale |
|---|---|---|
| **Tier 1** | SF_TRIM_NC_STAIN | Highest frequency surface; establishes stain SOP patterns for all other specs |
| **Tier 2** | SF_DOOR_SLAB_INT_NC_STAIN, SF_DOOR_FRAME_NC_STAIN, SF_STAIR_RAILING_NC_STAIN | High visibility surfaces; railing has unique baluster/spindle complexity |
| **Tier 3** | SF_WINDOW_INT_NC_STAIN, SF_STAIR_RISER_NC_STAIN | Common surfaces |
| **Tier 4** | SF_WOOD_WALL_NC_STAIN, SF_WOOD_CEILING_NC_STAIN, SF_WAINSCOT_PANEL_NC_STAIN, SF_ARCH_ELEMENT_NC_STAIN | Upgrade/custom surfaces |

Trim spec (Tier 1) must be completed first — it establishes the canonical stain/clear module architecture, material system patterns, and production rate baselines that all other specs reference.

## 11. Validation Criteria

Each spec must pass SpecFactory QA (Critic stage) plus these stain-specific checks:

- [ ] coating_type dimension correctly gates module activation
- [ ] stain_clear variant has independent stain/clear application methods
- [ ] clear_only variant excludes stain modules and blocks roll application
- [ ] stain_only variant excludes sealer and clear modules
- [ ] User-selectable coat counts (stain_coats, sealer_coats, clear_coats) with correct QT defaults per Section 4.6
- [ ] clear_sheen dimension drives clear coat product selection
- [ ] Softwood + stain activates wood conditioner module (unless gel stain)
- [ ] Gel stain blocked below QT4
- [ ] Lacquer clear blocked for non-spray application
- [ ] Substrate state declarations match Section 7.2 (SS_BARE input, SS_STAINED/SS_CLEAR_COATED output)
- [ ] All new IDs registered in id_registry.json with unique context prefixes per Section 9
- [ ] Material systems have no chemistry-pairing constraints (only gel QT4+ and lacquer spray-only)
- [ ] Production rates calibrated against paint spec counterparts
- [ ] Grain-raise prep task conditionally activated for waterborne products

# Exterior Estimation Engine — Implementation Plan

> Created: 2026-03-12
> Status: Approved for implementation
> Depends on: DB bundle regenerated (40 specs, 4,599 rows), exterior data model confirmed

---

## Architecture Summary

The current interior engine follows: `state.rooms` → `buildRoomQuantityLookups()` → PS key maps → `runEstimate()` loops rooms × specs × modules × tasks. The core math functions (`resolveTaskRate`, `evaluateAppliesWhen`, `computeModifierStack`) are already domain-agnostic. The gaps are entirely in the data plumbing: state model, quantity lookups, spec activation filtering, context building, and modifier resolution.

The exterior model differs fundamentally from interior:
- **Container**: Elevations (not rooms) are the primary container for elevation-bound specs. Standalone items (deck, fence, etc.) exist outside elevations.
- **PS key prefix**: All 66 exterior keys use `PS_EXT_*` prefix (vs `PS_SURFACE_*`, `PS_OPENING_EA.*` for interior)
- **Override cascade**: Project defaults → Elevation overrides → Substrate-level overrides (3 levels)
- **Modifier categories**: Exterior has access_type, wind, sun_exposure, surface_temp, substrate_condition, profile_complexity, siding_profile, surface_texture, coating_type, wood_condition — far more than interior's height/texture/QT/complexity
- **Protection model**: Landscape/hardscape/masking (not floor/fixture)

---

## Phase 0: Foundation — State Model

**Goal**: Define the data structures for elevations, standalone items, and site conditions without breaking any existing code.

**Files to create:**
- `src/state/exterior-state.js` — Factory functions:
  - `createElevation(overrides)` — `{ id, label, width_ft, height_to_eave_ft, access_type, siding_sections: [], trim_types: {}, windows: [], doors: [], caulking: {}, sub_elements: [], quality_tier: null, application_method: null }`
  - `createSidingSection(overrides)` — `{ id, siding_type, substrate_material, substrate_state, sf, profile, texture }`
  - `createExteriorTrimConfig(overrides)` — `{ type, substrate_material, substrate_state, profile_complexity, width_in, lf }`
  - `createStandaloneItem(type, overrides)` — Factory for deck, fence, garage_door, foundation, porch, metal, stucco, masonry
  - `createSiteConditions()` — `{ wind_exposure, sun_exposure, temperature_zone }`
  - `createExteriorWindow/Door(overrides)` — Per-elevation items

**Files to modify:**
- `src/state/initial-state.js` — Add `exterior: { elevations: [], standalone_items: [], site_conditions: {} }` to initial state. Keep `rooms` untouched.
- `src/state/reducer.js` — Add elevation CRUD actions (`ADD_ELEVATION`, `REMOVE_ELEVATION`, `DUPLICATE_ELEVATION`, `SET_ELEVATION`), siding section actions, trim type toggle/set, exterior window/door actions, standalone item actions, site condition action. All new `case` blocks — zero risk to existing interior cases.

**Testing**: Create elevation, add siding sections, toggle trim types, verify state shape. Verify `createRoom()` unchanged.

---

## Phase 1: Exterior Geometry Derivation

**Goal**: Build the geometry calculator that turns elevation dimensions + components into derived quantities.

**Files to create:**
- `src/engine/derive-elevation.js` — Parallel to `derive-room.js`:
  - `deriveElevation(elevation)` — Returns:
    - `gross_sf` (width × height_to_eave)
    - Window/door opening deductions
    - `net_siding_sf` (gross minus deductions)
    - Per-trim-type LF (fascia, rake, frieze, corner, band, casing, sill)
    - Soffit SF from config (run_lf × depth_ft)
    - Caulking LF derived from trim types + scope multipliers
    - Total window/door counts
  - `deriveSubElement(subElement, parentElevation)` — Bump-out, dormer, gable geometry generators
  - `deriveHeightBandExterior(access_type)` — Maps access_type to modifier band

**Testing**: Unit test with known dimensions, verify siding SF, trim LF, opening deductions, sub-element additions.

---

## Phase 2: Exterior Quantity Lookups

**Goal**: Convert state + derived geometry into PS_EXT_ key maps.

**Files to create:**
- `src/engine/quantity-lookups-exterior.js` — Parallel to `quantity-lookups.js`:
  - `buildExteriorQuantityLookups(state)` — Returns `Map<elevationIndex, Map<psKey, {value, uom}>>` for elevation-bound specs
  - `buildStandaloneQuantityLookups(state)` — Returns `Map<standaloneId, Map<psKey, {value, uom}>>` for standalone items
  - Emits all 66 PS_EXT_ keys:
    - `PS_EXT_SURFACE_SF.*` (siding, deck, fence, foundation, masonry, porch, soffit, stucco)
    - `PS_EXT_EDGE_LF.*` (fascia, rake, frieze, corner, band, casing, sill, railing, gutter)
    - `PS_EXT_OPENING_EA.*` (doors, garage, windows S/M/L)
    - `PS_EXT_LF.*` / `PS_EXT_SURFACE_LF.*` (caulk joints)
    - `PS_EXT_PROTECT_*` (landscape, hardscape, masking)
    - `PS_EXT_META.*` (elevation count, flags)

**Testing**: Create state with 2 elevations + 1 deck. Verify PS key emission, aggregation within sections, standalone isolation.

---

## Phase 3: Exterior Data Maps

**Goal**: Populate the data layer with exterior substrate catalog, spec maps, and constants.

**Files to modify:**
- `src/data/spec-maps.js` — Add:
  - `SPEC_SUBSTRATE_MAP`: All 22 exterior spec IDs → primary substrate
  - `UI_STATE_TO_SPEC_STATE`: Exterior state mappings (`bare_wood_ext` → `SS_EXT_BARE_WOOD`, etc.)
  - `SPEC_VALID_INPUT_STATES`: All 22 exterior specs with valid states
  - `SPEC_OUTPUT_STATES`: Exterior prime→finish chain entries

- `src/data/constants.js` — Add:
  - `SPEC_DISPLAY_NAMES`: All 22 exterior specs
  - `QUANTITY_KEY_LABELS`: All 66 PS_EXT_ keys
  - Access type labels, site condition labels

- `src/data/substrate-catalog.js` — Add exterior substrate groups:
  - `'Exterior Siding'`: wood, fibercement, engineered, aluminum, vinyl, stucco
  - `'Exterior Trim'`: ext_trim (with substrate_material sub-dimension)
  - `'Exterior Openings'`: ext_window, ext_door, ext_garage_door, soffit
  - `'Exterior Standalone'`: deck, fence, foundation, porch_floor, porch_ceiling, masonry, metal

- `src/data/modifiers.js` — Add exterior modifier definitions:
  - Access (ground/ladder/scaffold/lift), wind, sun, siding profile, texture, trim profile, coating type, etc.

**Testing**: Verify all 22 exterior spec IDs have entries in every map. Verify no duplicate keys with interior.

---

## Phase 4: Engine Adaptation — Spec Activation + Context Building

**Goal**: Make `run-estimate.js` process exterior specs alongside interior specs.

**Files to modify:**
- `src/engine/run-estimate.js` — Key changes:
  - **Spec activation filter** (current line 116): Must accept `PS_EXT_*` prefix keys
  - **Dual orchestrator**: Extract `runInteriorEstimate(state, db)` (current logic, unchanged) and `runExteriorEstimate(state, db)` (new). `runEstimate()` calls both, merges results.
  - **Exterior context builder**: Build `ctx` with `access_type`, `wind_exposure`, `sun_exposure`, `substrate_material`, `siding_profile`, `surface_texture`, `trim_profile_complexity`, `coating_type` from elevation/standalone config + site conditions + project defaults
  - **Override cascade**: project → elevation → substrate-level, first non-null wins

- `src/engine/spec-compatibility.js` — Add exterior substrate state resolution path (read from elevation siding/trim configs instead of `room.substrates`)

- `src/engine/spec-resolution.js` — Add exterior QT/method/texture resolution: elevation override → project exterior default

**Testing**: Create state with 1 room + 1 elevation with siding. Interior specs fire for room, exterior siding spec fires for elevation.

---

## Phase 5: Exterior Modifier Stack

**Goal**: Make `computeModifierStack` handle exterior modifier categories dynamically.

**Files to modify:**
- `src/engine/modifier-stack.js`:
  - Refactor from 4 hard-coded categories (qt, height, texture, complexity) to **dynamic iteration** over all `modifier_category` values found in `db.factor_modifiers` for the given spec
  - For each category, look up `ctx[category_name]` and find matching `time_modifier` or `values_map[ctx_value]`
  - Return dynamic object: `{ qt: 1.15, access: 1.35, wind: 1.0, profile: 1.3, ..., total: product }`
  - **Backward compatible**: Interior specs still only have qt/height/texture/complexity in their factor_modifiers, so dynamic approach returns the same 4 fields for them

**Testing**: Interior modifier stacks unchanged. Exterior trim spec with access=scaffold, profile=crown produces expected compound modifier.

---

## Phase 6: Exterior Protection Model

**Goal**: Exterior landscape/hardscape/masking protection with elevation-level dedup.

**Files to create:**
- `src/engine/exterior-protection.js`:
  - `resolveExteriorProtection(specResults, db, state)` — Post-processing dedup
  - Elevation-level aggregation: one setup/teardown cycle per elevation, not per spec
  - Zones: `ext_landscape_adjacent`, `ext_hardscape_walk`, `ext_hardscape_patio`, `ext_light_fixture`, `ext_hvac_unit`, `ext_siding_adjacent`, `ext_window_glass_adjacent`, `ext_door_glass_adjacent`, etc.
  - Dedup: When siding + trim + soffit all fire on same elevation, landscape protection counts once

**Testing**: Elevation with siding + trim active. Verify landscape protection fires once.

---

## Phase 7: Exterior Material Estimates

**Goal**: Extend material estimates for exterior coverage profiles.

**Files to modify:**
- `src/engine/material-estimates.js`:
  - Include exterior quantity lookups in aggregation (line 21-27)
  - Handle `waste_factor` from coverage_profiles (new column)
  - Handle texture/profile adjustments to coverage rates (stucco dash texture = 2× material)
  - Exterior spray loss may differ from interior 5%

**Testing**: Siding spec with cedarmill texture produces higher gallon count than smooth.

---

## Phase 8: Exterior Per-Item Compute

**Goal**: Per-item breakdowns for exterior doors, windows, garage doors.

**Files to modify:**
- `src/engine/per-item-compute.js` — Add:
  - `computeExteriorDoorPerItemResults()` — Per-door-type (flush, panel, french)
  - `computeExteriorWindowPerItemResults()` — Per-size
  - `computeGarageDoorPerItemResults()` — Per-panel/size
  - Wire into exterior spec loop in `run-estimate.js`

**Testing**: Elevation with 2 panel + 3 flush doors, verify separate line items.

---

## Phase 9: UI — Elevation Editor

**Goal**: Build the UI for entering exterior project data.

**Files to create:**
- `src/components/elevation-editor/ElevationEditor.jsx` — Main editor (parallel to RoomEditor)
- Tabs:
  - `IdentityTab.jsx` — Label, dimensions, access_type
  - `SidingTab.jsx` — Siding section CRUD
  - `TrimTab.jsx` — Checkbox selection with per-type config (simplified vs detailed mode)
  - `OpeningsTab.jsx` — Windows/doors per elevation
  - `CaulkingTab.jsx` — Scope selection, LF display
  - `SubElementsTab.jsx` — Bump-outs, dormers, gables
  - `ProtectionTab.jsx` — Site adjacency
- `src/components/standalone-editor/StandaloneEditor.jsx` — Deck, fence, garage door, etc.
- `src/components/site-conditions/SiteConditions.jsx` — Project-level wind/sun/temp

**Files to modify:**
- `src/App.jsx` — Exterior nav, elevation sidebar, view routing
- `src/components/setup/ProjectSetup.jsx` — Exterior project defaults

---

## Phase 10: Output Views

**Goal**: Extend estimate, summary, and work order views for exterior data.

**Files to modify:**
- `src/components/estimate/EstimateView.jsx` — Exterior section, elevation-based grouping
- `src/components/summary/ProjectSummary.jsx` — Exterior quantity summary
- `src/components/workorder/WorkOrderView.jsx` — Elevation-based task sequencing
- `src/engine/export-project.js` — Export exterior data

---

## Dependency Graph

```
Phase 0 (State)
    |
    +---> Phase 1 (Geometry) ---> Phase 2 (Qty Lookups) ---> Phase 4 (Engine)
    |                                                              |
    +---> Phase 3 (Data Maps) ------------------------------------+
                                                                   |
                                                          Phase 5 (Modifiers)
                                                             /    |    \
                                                  Phase 6    Phase 7    Phase 8
                                                (Protection) (Materials) (Per-Item)
                                                         \    |    /
                                                      Phase 9 (UI)
                                                           |
                                                      Phase 10 (Output)
```

**Parallel opportunities:**
- Phase 1 + Phase 3 (geometry and data maps are independent)
- Phase 6 + Phase 7 + Phase 8 (protection, materials, per-item are independent post-processing)

**Critical path:** Phase 0 → 1 → 2 → 4 → 5 → 9 → 10

---

## Interior Engine Isolation Strategy

Zero regression risk through:

1. **Separate quantity lookup functions** — `buildRoomQuantityLookups` is never modified
2. **Domain-gated spec loop** — Exterior specs run in a separate loop gated by `spec.domain === 'exterior'`
3. **Additive data maps** — All exterior entries are additions, not modifications
4. **Dynamic modifier stack** — Returns same fields for interior specs (verified by checking categories)
5. **New state keys** — `state.exterior` is new; `state.rooms` and `state.project` unchanged

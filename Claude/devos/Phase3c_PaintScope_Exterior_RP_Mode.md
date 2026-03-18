# Phase 3c: PaintScope UI — Exterior RP Mode

## Summary

Wire 18 exterior RP specs into the PaintScope exterior editor. The UI currently handles 22 NC specs with elevation-centric + standalone architecture. RP mode adds condition assessment inputs, substrate state awareness, and prep/coating pool display — reusing the existing component structure with a project-level NC/RP toggle.

---

## Current Architecture

- **Spec routing**: `spec-maps.js` maps 22 NC spec IDs to substrate IDs (ext_siding, ext_trim, etc.)
- **State mapping**: `EXT_UI_STATE_TO_SPEC_STATE` converts 16 UI states → SS_EXT_* codes
- **Quantity emission**: `buildElevationQuantityLookups()` and `buildStandaloneQuantityLookups()` emit PS_EXT_* keys
- **Context cascade**: Project defaults → elevation overrides → substrate state (3 levels)
- **Estimate engine**: `run-estimate.js` lines 418–660 handle exterior loop, split elevation-bound vs standalone

---

## Implementation Plan

### Step 1: Project-Level NC/RP Toggle

**File: `tools/paintscope/src/state/initial-state.js`**
- Add `exterior.project_type: "NC" | "RP"` to initial state (default: "NC")

**File: `tools/paintscope/src/state/reducer.js`**
- Add `SET_EXTERIOR_PROJECT_TYPE` action
- When switching NC→RP: keep all geometry/quantities, reset substrate states to RP defaults (SS_EXT_SOUND_PAINT)
- When switching RP→NC: reset substrate states to NC defaults (SS_EXT_BARE_WOOD)

**File: `tools/paintscope/src/components/exterior-editor/ExteriorSection.jsx`**
- Add NC/RP toggle in header bar (next to existing defaults panel)
- Toggle changes available substrate states, spec routing, and condition inputs

### Step 2: Spec Routing for RP

**File: `tools/paintscope/src/data/spec-maps.js`**
- Add `EXTERIOR_RP_SPEC_IDS` Set with all 18 RP spec family IDs
- Add `EXT_RP_SUBSTRATE_SPEC_MAP` mapping substrate IDs → RP spec families:

```
ext_siding.wood        → SF_SIDING_WOOD_EXT_RP
ext_siding.aluminum    → SF_SIDING_ALUMINUM_EXT_RP
ext_siding.vinyl       → SF_SIDING_VINYL_EXT_RP
ext_siding.fiber_cement → SF_SIDING_FIBERCEMENT_EXT_RP
ext_siding.engineered  → SF_SIDING_ENGINEERED_EXT_RP
ext_siding.stucco      → SF_STUCCO_EXT_RP
ext_siding.masonry     → SF_MASONRY_EXT_RP
ext_trim               → SF_TRIM_EXT_RP
ext_soffit             → SF_SOFFIT_EXT_RP
ext_window             → SF_WINDOW_EXT_RP
ext_door               → SF_DOOR_EXT_RP
ext_garage_door        → SF_GARAGE_DOOR_EXT_RP
ext_deck               → SF_DECK_EXT_RP
ext_fence              → SF_FENCE_EXT_RP
ext_foundation         → SF_FOUNDATION_EXT_RP
ext_porch.ceiling      → SF_PORCH_CEILING_EXT_RP
ext_porch.floor        → SF_PORCH_FLOOR_EXT_RP
ext_metal              → SF_METAL_EXT_RP
```

- Add `getExteriorSpecs(projectType)` helper that returns NC or RP spec set based on toggle

### Step 3: Condition Assessment Inputs

**File: `tools/paintscope/src/data/enums.js`**
- Add `CONDITION_SCALE` enum: `[{id: 'GOOD', label: 'Good'}, {id: 'FAIR', label: 'Fair'}, {id: 'POOR', label: 'Poor'}]`
- Add `RP_SUBSTRATE_STATES` enum (RP-specific states: SOUND_PAINT, CHALKING, FAILING_PAINT, PEELING, WEATHERED)

**New state fields** (added to elevation + standalone items when project_type=RP):
- `condition_scale`: GOOD | FAIR | POOR (per siding section, per trim type, per standalone item)
- Substrate state dropdown filtered to RP-relevant states only

**File: `tools/paintscope/src/components/exterior-editor/SidingTab.jsx`**
- When RP: Show condition dropdown (GOOD/FAIR/POOR) per siding section
- Filter substrate_state dropdown to RP states (remove bare_wood, factory_primed)

**File: `tools/paintscope/src/components/exterior-editor/TrimTab.jsx`**
- When RP: Add condition dropdown per trim type

**File: `tools/paintscope/src/components/exterior-editor/StandalonePanel.jsx`**
- When RP: Add condition dropdown to each standalone item (deck, fence, foundation, porch, garage door, metal)

### Step 4: Context Building for RP

**File: `tools/paintscope/src/engine/run-estimate.js`**
- Modify `buildExteriorContext()` to include `condition_scale` in context when project_type=RP
- Route to RP spec families instead of NC when project_type=RP
- Context object gains: `{ ...existingCtx, condition_scale: "GOOD"|"FAIR"|"POOR", project_type: "RP" }`

**File: `tools/paintscope/src/engine/quantity-lookups-exterior.js`**
- No changes needed — PS_EXT_* keys are the same for NC and RP (same surfaces, same UOMs)
- Quantity emission is geometry-driven, not spec-type-driven

### Step 5: Estimate Display — Prep/Coating Pool Split

**File: `tools/paintscope/src/components/estimate/EstimateView.jsx`**
- When project_type=RP: Group estimate line items by pool:
  - **Assessment**: Fixed-time assessment tasks (condition survey, adhesion test, lead screen)
  - **Prep Pool**: Scrape, sand, feather, degloss, pressure wash — multiplied by condition_scale
  - **Prime Pool**: State-driven primer tasks — multiplied by condition_scale
  - **Coating Pool**: Finish coats — multiplied by QT only (no condition multiplier)
  - **Cleanup**: Protection removal, debris, walkthrough
- Display condition modifier badge on prep/prime tasks (e.g., "FAIR 1.5x")
- Keep existing NC display unchanged

### Step 6: Elevation Defaults for RP

**File: `tools/paintscope/src/state/reducer.js`**
- `SET_EXTERIOR_DEFAULT` gains `condition_scale` field (default: GOOD)
- New elevations inherit condition_scale from defaults when project_type=RP
- Existing `siding_substrate_state` default switches to SS_EXT_SOUND_PAINT for RP

### Step 7: Migration

**File: `tools/paintscope/src/state/migrations.js`**
- Add migration to add `project_type: "NC"` to existing exterior state
- Add `condition_scale: null` to existing siding sections, trim types, standalone items

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/data/spec-maps.js` | Modify | Add RP spec routing, `getExteriorSpecs()` helper |
| `src/data/enums.js` | Modify | Add CONDITION_SCALE, RP_SUBSTRATE_STATES enums |
| `src/state/initial-state.js` | Modify | Add `exterior.project_type` field |
| `src/state/reducer.js` | Modify | SET_EXTERIOR_PROJECT_TYPE action, condition_scale in SET_SIDING_SECTION/SET_TRIM_TYPE/SET_STANDALONE |
| `src/state/migrations.js` | Modify | Migration for project_type + condition_scale fields |
| `src/components/exterior-editor/ExteriorSection.jsx` | Modify | NC/RP toggle in header |
| `src/components/exterior-editor/SidingTab.jsx` | Modify | Condition dropdown per section (RP mode) |
| `src/components/exterior-editor/TrimTab.jsx` | Modify | Condition dropdown per trim type (RP mode) |
| `src/components/exterior-editor/StandalonePanel.jsx` | Modify | Condition dropdown per item (RP mode) |
| `src/engine/run-estimate.js` | Modify | RP context building, RP spec routing |
| `src/components/estimate/EstimateView.jsx` | Modify | Prep/coating pool grouping for RP |

---

## Execution Order

1. Step 1 (state + reducer) — foundation
2. Step 7 (migration) — immediately after state changes
3. Step 2 (spec routing) — enables engine to find RP specs
4. Step 3 (condition inputs) — UI for entering RP data
5. Step 4 (context building) — wires inputs to engine
6. Step 5 (estimate display) — shows RP-specific output
7. Step 6 (defaults) — polish

---

## What Does NOT Change

- Elevation geometry (width, height, sub-elements) — identical for NC and RP
- PS_EXT_* quantity keys — same surfaces emit same quantities
- Opening counts, caulk LF, protection zones — geometry-driven, not condition-driven
- Three-level context cascade architecture — same pattern, different values
- Standalone item structure — same geometry fields, adds condition_scale

---

## Risks

- **Condition scale per-section vs per-elevation**: Plan uses per-section (one siding section could be GOOD, another POOR). This is more granular than per-elevation but matches how painters assess homes.
- **Spec data availability**: All 18 RP specs are now in the DB (Phase 3a/3b complete), so engine can query them.
- **NC↔RP switching**: Switching mid-project resets substrate states but preserves geometry. User should be warned.

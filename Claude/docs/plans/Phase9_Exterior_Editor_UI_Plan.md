# Phase 9: Exterior Editor UI — Implementation Plan

## Context

Phases 0-8 of the exterior engine are complete (state model, geometry derivation, quantity lookups, spec maps, modifier stack, exterior protection, materials, per-item compute). All engine code builds cleanly. Now we need the UI to input exterior project data so the engine can actually run.

The user wants:
- Top-level "Exterior" section in nav (not a tab within Room Editor)
- Elevation list in sidebar (parallels room list)
- 6 tabs per elevation editor
- Trim: simplified checkboxes first, expandable to detailed with LF overrides
- Sub-elements: collapsible section within the elevation (not a separate tab)
- Standalone items: one flat panel to start
- Consistent "width" naming for horizontal dimension

## Files to Create

### 1. `src/components/exterior-editor/ExteriorSection.jsx`
Top-level component that renders when view === 'exterior'. Contains:
- Elevation sidebar list (left) — add/remove/duplicate/select elevations
- Main panel (right) — ElevationEditor for active elevation
- StandalonePanel below elevation list or as a toggle
- Site Conditions collapsible section

### 2. `src/components/exterior-editor/ElevationEditor.jsx`
Tabbed editor for a single elevation (parallels RoomEditor). 6 tabs:
- Identity, Siding, Trim, Openings, Caulking + Sub-elements collapsible section at bottom

Props: `{ elevation, elevIndex, exterior, dispatch, project }`

### 3. `src/components/exterior-editor/ElevationQuickStats.jsx`
Derived stats bar showing: Width, Height, Net Siding SF, Trim LF, Windows, Doors

### 4. Tab Components (6 files in `tabs/`):

#### `tabs/IdentityTab.jsx`
- Label, width_ft, height_to_eave_ft
- access_type (select from EXT_ACCESS_TYPES)
- quality_tier override (select, placeholder "Project Default")
- application_method override (select)
- Notes textarea
- Derived stats: Gross SF, Access Band

#### `tabs/SidingTab.jsx`
- Siding section CRUD (add/remove sections)
- Per section: siding_type (select EXT_SIDING_TYPES), substrate_material, substrate_state, texture_profile, SF override
- Derived: net siding SF per section from geometry

#### `tabs/TrimTab.jsx` (hybrid simplified/detailed)
- Checkbox grid of all trim types from EXT_TRIM_TYPES
- Each enabled trim type shows a summary row with auto-derived LF
- Click to expand: LF override input, substrate_material, substrate_state, profile_complexity, width_in
- Soffit gets special treatment: SF display, soffit_profile selector
- Corner boards: default 2 per elevation, count override

#### `tabs/OpeningsTab.jsx`
- Windows section: CRUD list, each with type (select), size (S/M/L), count
- Doors section: CRUD list, each with type, complexity, substrate, count
- Derived: total window count, total door count, deduction SF

#### `tabs/CaulkingTab.jsx`
- Caulk scope selector (none, touchup, removal_repair, complete)
- Derived LF display from trim types × caulk_lf_per_lf ratios
- Read-only summary showing which trim types contribute

#### `tabs/SubElementsSection.jsx` (not a tab — collapsible section)
- Collapsible panel rendered below tabs in ElevationEditor
- Three sub-sections: Bump-Outs, Dormers, Gables
- Each with add/remove and inline form fields matching the factory shapes
- Bump-out: width, depth, height, siding_type inherit, has_soffit/fascia/corner/foundation toggles, window sub-form
- Dormer: width, height, roof_pitch, siding_type, has_window toggle + window config
- Gable: base, peak, siding_type, has_rake_trim, rake_lf override

### 5. `src/components/exterior-editor/StandalonePanel.jsx`
Flat panel with enable/disable cards for each standalone item:
- **Foundation**: perimeter_lf, height_ft, substrate, substrate_state
- **Deck**: sf, substrate, substrate_state, railing_lf, coating_type
- **Fence**: total_lf, height_ft, sides, substrate, substrate_state, coating_type, style
- **Porch**: ceiling (enable + sf + substrate), floor (enable + sf + substrate)
- **Garage Doors**: CRUD list — size, panel_type, substrate, substrate_state, has_windows, count
- **Metal Surfaces**: CRUD list — type, lf, substrate_state

### 6. `src/components/exterior-editor/SiteConditionsPanel.jsx`
Project-level: wind_exposure, sun_exposure, temperature_zone selects
Plus exterior defaults: quality_tier, application_method, siding_type, trim_substrate

## Files to Modify

### `src/App.jsx`
- Add 'exterior' to NAV_VIEWS (between 'editor' and 'summary', key '3')
- Shift subsequent keys (summary→4, estimate→5, workorder→6, export→7)
- Import and render ExteriorSection when view === 'exterior'
- Add exterior elevation list to sidebar (below rooms, with a divider)
- Import `createElevation` for ADD_ELEVATION dispatch

### `src/state/reducer.js`
- Add `SET_ACTIVE_ELEVATION` to ui state tracking (if not already present)
- Verify all exterior actions are already wired (they are from Phase 0)

### `src/styles/components.css`
- Add exterior-specific styles:
  - `.elevation-list` paralleling `.room-list`
  - `.standalone-card` for enable/disable cards
  - `.trim-grid` for checkbox grid layout
  - `.trim-detail-row` for expandable detail
  - `.sub-element-section` for collapsible sub-elements
  - `.derived-value` for auto-calculated display values

### `src/data/enums.js`
- Add exterior enum arrays if not already present (EXT_ACCESS_TYPES, EXT_SIDING_TYPES, etc. are in exterior-state.js but need { value, label } format for Select component)

## Patterns to Reuse

- **Select component**: `src/components/shared/Select.jsx` — { value, label } options
- **ErrorBoundary**: `src/components/shared/ErrorBoundary.jsx` — wrap each tab
- **Tab system**: Same pattern as RoomEditor (TABS array, activeTab state, editor-tab-bar/editor-tab classes)
- **Form layout**: `.panel-section`, `.section-title`, `.form-grid`, `.form-row`, `.field-label` classes
- **Dispatch pattern**: `dispatch({ type: 'SET_ELEVATION', payload: { elevIndex, field, value } })`
- **Derived data pattern**: Call `deriveElevation(elevation)` from `src/engine/derive-elevation.js` for stats

## Implementation Order

1. **Enums** — Add exterior option arrays to enums.js
2. **App.jsx** — Add nav entry + sidebar elevation list + exterior view routing
3. **ExteriorSection.jsx** — Shell with elevation list + editor + standalone
4. **ElevationEditor.jsx** — Tab shell with quick stats
5. **IdentityTab.jsx** — First tab to verify wiring
6. **SidingTab.jsx** — Core geometry input
7. **TrimTab.jsx** — Hybrid checkbox/detail pattern
8. **OpeningsTab.jsx** — Window/door CRUD
9. **CaulkingTab.jsx** — Derived display
10. **SubElementsSection.jsx** — Collapsible CRUD
11. **StandalonePanel.jsx** — Enable/disable cards
12. **SiteConditionsPanel.jsx** — Project-level selects
13. **ElevationQuickStats.jsx** — Derived stats bar
14. **CSS** — Exterior-specific styles
15. **Build verify** — `npx vite build`

## Verification

1. `npx vite build` — must pass with zero errors
2. `npm run dev` — start dev server, navigate to Exterior view
3. Add an elevation → verify Identity tab fields dispatch correctly
4. Add siding sections → verify Siding tab CRUD
5. Toggle trim types → verify simplified view, expand to detail, verify LF override
6. Add windows/doors → verify Openings tab CRUD + per-item labels
7. Add bump-out → verify sub-element collapsible section
8. Enable standalone deck → verify StandalonePanel card
9. Check derived stats update in real-time (ElevationQuickStats)

# Spec Editor — Rates Tab Redesign

**Date:** 2026-03-25
**Status:** Design Approved
**Scope:** PaintScope Rates tab — replace RateExplorerView with SpecEditorView

---

## Problem

Editing spec data (tasks, rates, modifiers, PS keys) currently requires SQL queries against the SQLite database, manual updates to db-bundle.js, and rebuilds. This is slow, error-prone, and blocks the user from fixing rate issues they discover while reviewing estimates.

## Design

Replace the existing `RateExplorerView` with a `SpecEditorView` that loads db-bundle data into React state, provides full inline editing of all spec fields, auto-saves a working copy to localStorage, and exports back to the db-bundle when ready.

### Data Flow

```
db-bundle.js (base source)
  → on mount: check IndexedDB for working copy
    → if exists: merge working copy editable tables over fresh DB_BUNDLE clone
    → if not: deep-clone full DB_BUNDLE into React state
    → if rate_overlays exist in IndexedDB: fold into working copy, clear overlay store
  → all edits dispatch reducer actions → update React state immediately
    → auto-save editable tables to IndexedDB (debounced 500ms)
    → estimate engine reads from state via context (immediate effect)
  → Export: serialize current state to downloadable db-bundle JSON
  → Reset to Base: discard working copy, reload from DB_BUNDLE
```

### Engine Integration

The estimate engine (`runEstimate`) is a pure function that receives `db` as a parameter. The calling hook `useEstimate` currently passes the raw `DB_BUNDLE` import:

```js
// current: useEstimate.js
return useMemo(() => runEstimate(state, DB_BUNDLE, overlayMap), [state, overlayMap]);
```

A `SpecDataProvider` wraps the app at the top level and holds the editable spec data. `useEstimate` is modified to consume `specData` from context instead of importing `DB_BUNDLE`:

```js
// new: useEstimate.js
const { specData } = useSpecData();
return useMemo(() => runEstimate(state, specData), [state, specData]);
```

The `overlayMap` parameter is eliminated — the working copy IS the overlay.

**Provider placement** (must be above all estimate consumers):
```
App → ProjectLoader → SpecDataProvider → ProjectProvider → AppShell
```

**All direct DB_BUNDLE consumers that must migrate to context:**
1. `hooks/useEstimate.js` — passes db to runEstimate
2. `components/estimate/EstimateView.jsx` — reads spec_families for display
3. `components/assemblies/TaskPickerModal.jsx` — reads spec_families, sop_modules, sop_tasks
4. `components/rates/ModifierOverridePanel.jsx` — replaced by ModifierPanel.jsx
5. `components/rates/RateExplorerView.jsx` — replaced by SpecEditorView.jsx

---

## UI Layout

### Left Sidebar — Spec Family List

- All spec families from db-bundle, grouped by domain (Interior / Exterior)
- Filter input at top for quick search
- Click to load a spec into the detail area
- Shows display name and spec ID

### Top Toolbar

- Spec family ID (bold) + display name
- Metadata: module count, task count, valid substrate states
- Dirty indicator ("unsaved changes" in amber when working copy differs from base)
- Discard button — reverts current spec to base values
- Save button — explicit persist to localStorage (also auto-saves)

### Required Inputs Bar

- Collapsible row below toolbar
- Shows all `spec_required_inputs` entries for the selected spec
- Displays PS keys and UOM — the keys that must be emitted by quantity-lookups for this spec to activate
- Editable: can add/remove/change PS keys (for fixing activation issues like the builtins/closet shelf bugs we hit today)

### Module Accordion

One accordion section per module, sorted by `sort_order`. Each shows:

**Header (always visible):**
- Expand/collapse arrow
- Module name (editable on click)
- Task count badge
- Phase badge (setup/prep/prime/interstage/finish/cleanup)
- "+ Task" button

**Expanded content:**

**Task Table** with columns:
| Column | Width | Type | Notes |
|--------|-------|------|-------|
| Task Name | 28% | text input | Editable inline |
| Rate/hr | 10% | number input | `rate_per_hour` value |
| UOM | 8% | dropdown | LF, SF, EA, EA_OPENING, FIXED |
| PS Key | 24% | dropdown | Edits `task_production_rates.paintscope_key`. Populated from spec's required_inputs + common keys |
| Class | 8% | dropdown | binary, qt_scaled |
| Fixed Min | 8% | number input | `fixed_minutes` value, shown when UOM=FIXED |
| Delete | 4% | button | × to remove task |

Each row dispatches changes immediately to state on blur/change.

**Modifiers Sub-section** (collapsed by default inside each module):
- Shows `factor_modifiers` entries applicable to this spec: name, mechanism (multiplier/additive), current value
- Shows `quality_tier_effects` for this spec: tier, time_modifier, material_modifier
- Both editable inline

### Bottom Status Bar

- Left: Auto-save status ("Working copy saved" / "Saving...")
- Right: "Export to SQLite" button, "Reset to Base" button

### Add Module

Dashed button below all modules. Creates a new module with:
- Auto-generated ID using spec prefix convention
- Phase selector dropdown
- Empty task list

---

## Components

### SpecEditorView.jsx
Top-level view replacing `RateExplorerView`. Contains the sidebar, toolbar, and content area. Manages which spec is selected and coordinates with the data provider.

### SpecDataProvider.jsx + useSpecData hook
Context provider using `useReducer` (matching the app's existing pattern). Exposes:
- `specData` — the full dataset (all DB_BUNDLE tables, with editable tables reflecting current edits)
- `dispatch` — reducer dispatch for all edit actions
- `dirty` — boolean, true when any edits exist
- `resetSpec(specId)` — revert single spec to base
- `resetAll()` — discard entire working copy, reload from DB_BUNDLE
- `exportBundle()` — serialize current state back to db-bundle format

**Reducer actions:**
- `UPDATE_TASK` — `{ specId, taskId, field, value }`
- `ADD_TASK` — `{ specId, moduleId }` (auto-generates task ID using spec prefix)
- `REMOVE_TASK` — `{ specId, taskId }`
- `UPDATE_RATE` — `{ specId, taskId, field, value }`
- `ADD_MODULE` — `{ specId, phase }`
- `REMOVE_MODULE` — `{ specId, moduleId }` (also removes child tasks)
- `UPDATE_MODIFIER` — `{ specId, modifierId, field, value }`
- `UPDATE_REQUIRED_INPUT` — `{ specId, inputId, field, value }`
- `ADD_REQUIRED_INPUT` — `{ specId }`
- `REMOVE_REQUIRED_INPUT` — `{ specId, inputId }`
- `RESET_SPEC` — `{ specId }`
- `RESET_ALL` — no payload

### ModuleAccordion.jsx
Single module section. Manages expand/collapse state. Contains the task table and modifier sub-section.

### TaskEditRow.jsx
Replaces existing `RateRow`. All fields editable inline. Dispatches changes through `useSpecData` hook.

### ModifierPanel.jsx
Refactored from existing `ModifierOverridePanel`. Displays and edits both `factor_modifiers` and `quality_tier_effects` for a given spec. Embedded inside each module accordion.

### RequiredInputsBar.jsx
Collapsible bar showing spec_required_inputs. Editable PS keys and UOM.

---

## State Shape

The provider holds a complete deep clone of DB_BUNDLE. The editable tables are the primary editing targets, but all tables must be present because the engine reads from this object as its `db` parameter.

```js
{
  // Editable tables (primary editing targets)
  spec_families: [...],
  sop_modules: [...],
  sop_tasks: [...],
  task_production_rates: [...],
  factor_modifiers: [...],
  spec_required_inputs: [...],
  quality_tier_effects: [...],

  // Read-only tables (engine needs these, not edited in UI)
  coat_counts: [...],
  material_systems: [...],
  material_coverage_profiles: [...],
  // ... all other DB_BUNDLE tables passed through unchanged
}
```

The provider clones the full DB_BUNDLE on init, so the engine always receives a complete `db` object. Only the editable tables are written to the working copy in storage; on load, they merge over a fresh DB_BUNDLE clone.

**Persistence:** Working copy stored in IndexedDB (using the existing `project-db.js` infrastructure, new `spec_editor` store) to avoid localStorage size limits. The full bundle is ~1.5 MB; IndexedDB handles this without issue. Auto-save is debounced (500ms after last edit).

**Dirty tracking:** A boolean `dirty` flag is set to `true` on any dispatch and `false` on reset. No deep comparison needed.

**Overlay migration:** On first load, if existing `rate_overlays` exist in IndexedDB, fold them into the working copy's `task_production_rates` entries and clear the overlay store. This preserves any rate overrides users set via the old system.

---

## What This Replaces

- `RateExplorerView.jsx` — replaced by `SpecEditorView.jsx`
- `RateRow.jsx` — replaced by `TaskEditRow.jsx`
- `useRateOverlays.js` — replaced by `useSpecData` hook (overlay system no longer needed for rate editing; the working copy IS the overlay)
- `ModifierOverridePanel.jsx` — refactored into `ModifierPanel.jsx` embedded in accordion

The existing `overlay-db.js` and overlay infrastructure remain available but are no longer the primary editing mechanism.

---

## Export

Export produces a downloadable JSON file containing the full edited db-bundle data. The user can then replace `tools/paintscope/src/data/db-bundle.js` with the exported content to make changes permanent on disk. This is a manual step — the browser cannot write to the filesystem directly.

The Export button should also show a brief diff summary (counts: N tasks modified, N rates changed, N modules added/removed) so the user has confidence in what they're exporting.

---

## What This Does NOT Include

- Creating new specs from scratch (future extension)
- Cloning/duplicating specs (future extension)
- Editing spec_families metadata (name, domain, status)
- Editing spec_state_declarations or spec_variants
- Direct SQLite write from the browser (Export generates a file/bundle, doesn't write to disk)
- Undo/redo history

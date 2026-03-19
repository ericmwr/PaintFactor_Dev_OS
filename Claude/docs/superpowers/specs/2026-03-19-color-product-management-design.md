# Color & Product Management — Design Spec

## Summary

Add a **Colors** tab to PaintScope that allows users to assign paint colors, products, and sheens to substrates using a three-level inheritance cascade: project defaults → substrate-type overrides → room/elevation overrides. The tab pulls substrate and room/elevation data from existing project state so users don't re-enter anything.

## Problem

PaintScope currently tracks substrate conditions, coating types, and application methods but has no way to record:
- **Paint colors** — brand, code, and name (e.g., SW 7006 Extra White)
- **Intended finish product** — what's going in the sprayer/on the brush
- **Intended finish sheen** — only `clear_sheen` exists for stain/clear coats; no sheen selection for paint substrates

Colors are sometimes known at scoping time, sometimes decided later. The system must work either way — colors are fully optional and don't affect estimation.

## Design

### Navigation Placement

New top-level view `"colors"` in `NAV_VIEWS`, positioned between `estimate` and `output`:

```
projects | setup | scope | estimate | colors | output | rates | assemblies | materials | tracker | analytics | settings
```

### Data Model

Color data lives as a **top-level state key** `state.colors` (not nested under `state.project`), consistent with how `rooms` and `exterior` are structured:

```js
// state.colors
{
  defaults: {
    // Keyed by substrate group (see SUBSTRATE_COLOR_GROUPS below)
    walls: { color_code: 'SW 7036', color_name: 'Accessible Beige', product: 'Duration', sheen: 'eggshell' },
    trim: { color_code: 'SW 7006', color_name: 'Extra White', product: 'Duration', sheen: 'satin' },
    ceiling: { color_code: 'SW 7757', color_name: 'High Reflective White', product: 'ProMar 200', sheen: 'flat' },
    doors: { color_code: 'SW 7006', color_name: 'Extra White', product: 'Duration', sheen: 'semi_gloss' },
    // ... any substrate group present in the project
  },

  substrate_overrides: {
    // Keyed by specific substrate ID from SUBSTRATE_CATALOG
    // Overrides the parent group default
    window_casing: { color_code: 'SW 6258', color_name: 'Tricorn Black' }
    // product and sheen omitted = inherit from parent group (trim)
  },

  room_overrides: {
    // Keyed by room ID (matches state.rooms[].id)
    'room-1': {
      walls: { color_code: 'SW 6244', color_name: 'Naval' }
      // product and sheen omitted = inherit from project default for walls
    }
  },

  elevation_overrides: {
    // Keyed by elevation ID (matches state.exterior.elevations[].id)
    'elev-1': {
      siding: { color_code: 'SW 7015', color_name: 'Repose Gray', product: 'Duration Exterior', sheen: 'satin' }
    }
  }
}
```

### Color Assignment Shape

Each color assignment at any level is a partial object — omitted fields inherit from the next level up:

```js
{
  color_code: string,    // e.g., 'SW 7036' (brand prefix + code)
  color_name: string,    // e.g., 'Accessible Beige'
  product: string,       // e.g., 'Duration' (manual text for now, future: product ID)
  sheen: string          // e.g., 'eggshell' (uses existing sheen enum values)
}
```

### Inheritance Cascade (Resolution Order)

To resolve the color for a given substrate in a given room/elevation:

1. Check `room_overrides[roomId][substrate]` (or `elevation_overrides[elevId][substrate]`)
2. Check `substrate_overrides[substrate]`
3. Check `defaults[substrateGroup]` (e.g., `baseboard` → group `trim`)
4. No color assigned (returns `null`)

Field-level merging: each level can override individual fields. If a room override specifies only `color_code` and `color_name`, `product` and `sheen` cascade from the next level up that has them. The resolver walks up the chain per-field until it finds a value or exhausts all levels.

### Substrate Color Group Mapping

Published as `SUBSTRATE_COLOR_GROUPS` constant in `color-state.js`. Derived from the existing `SUBSTRATE_CATALOG` groups but mapped to color-relevant groupings:

| Color Group | Substrate IDs (from SUBSTRATE_CATALOG) |
|-------------|---------------------------------------|
| `walls` | `walls` |
| `ceiling` | `ceiling` |
| `trim` | `baseboard`, `crown`, `door_casing`, `window_casing`, `chair_rail`, `shoe_mold`, `wainscot_cap`, `picture_rail`, `window_stool`, `window_apron`, `shadow_box`, `panel_mold` |
| `doors` | `doors`, `door_frames` |
| `windows` | `windows`, `window_jamb` |
| `specialty` | `wainscoting`, `wood_feature_wall`, `wood_ceiling`, `closet_shelving`, `beams`, `columns`, `mantels`, `builtins`, `stair_risers`, `stair_railing` |
| `siding` | exterior siding substrates |
| `ext_trim` | exterior fascia, soffit, trim |
| `ext_doors` | exterior doors |
| `ext_windows` | exterior windows |

Closets inherit their parent room's resolved colors — no independent closet color assignment. If a closet has `substrate_overrides` that change a substrate type, the color still resolves through the parent room's chain.

### UI Layout

The Colors tab is a single-page three-zone layout. This is a new layout pattern in PaintScope (other views use app sidebar + main panel) and requires dedicated CSS.

The Colors view renders its own embedded room/elevation list rather than using the app-level sidebar, since it needs different behavior (read-only list for selection, no add/delete/duplicate room actions).

#### Top Bar — Project Defaults
- Compact cards showing each substrate group with its assigned color swatch, code/name, product, and sheen
- "Edit Defaults" opens inline editing on the cards
- "+" card to add a new substrate group default
- Indicator line below cards showing any substrate-type overrides (e.g., "Window Casing → Tricorn Black overrides Trim default")

#### Left + Center — Room/Elevation Editor
- **Left sidebar**: List of all rooms (from `state.rooms`) and elevations (from `state.exterior.elevations`), pulled from existing project data. Grouped by Interior/Exterior. Read-only selection — no CRUD actions.
- **Center panel**: Selected room's substrates listed with their resolved colors. Each row shows:
  - Substrate name
  - Color swatch + code/name
  - Product + sheen
  - Status badge: "inherited" (dimmed), "override" (green highlight), "project" (amber, for substrate-type overrides)
  - Only substrates that are active in that room (have `painting: true` or equivalent) are shown
- Click any row to edit inline
- Inline override form at bottom: pick substrate, enter color code/name, product/sheen pre-filled with inherited values

#### Right Panel — Full Color Schedule
- Always visible, read-only summary
- Lists every room/elevation with every active substrate's resolved color
- Compact format: color swatch, substrate name, color name
- Colored dots indicate overrides (green = room, amber = substrate-type)
- Scrollable independently of the center panel

### Reducer Actions

```js
// Project-level defaults
SET_COLOR_DEFAULT:              { group, data }
// data: { color_code?, color_name?, product?, sheen? }
REMOVE_COLOR_DEFAULT:           { group }

// Substrate-type overrides (e.g., window_casing differs from trim)
SET_COLOR_SUBSTRATE_OVERRIDE:   { substrate, data }
// data: { color_code?, color_name?, product?, sheen? }
REMOVE_COLOR_SUBSTRATE_OVERRIDE: { substrate }

// Room-level overrides
SET_COLOR_ROOM_OVERRIDE:        { roomId, substrate, data }
// data: { color_code?, color_name?, product?, sheen? }
REMOVE_COLOR_ROOM_OVERRIDE:     { roomId, substrate }

// Elevation-level overrides
SET_COLOR_ELEVATION_OVERRIDE:   { elevId, substrate, data }
// data: { color_code?, color_name?, product?, sheen? }
REMOVE_COLOR_ELEVATION_OVERRIDE: { elevId, substrate }
```

All `data` payloads are partial — only include fields being set. The reducer merges them with existing values via spread: `{ ...existing, ...data }`.

### Cleanup on Room/Elevation Deletion

The existing `REMOVE_ROOM` and `REMOVE_ELEVATION` reducer cases must be updated to also delete any orphaned entries from `state.colors.room_overrides[roomId]` and `state.colors.elevation_overrides[elevId]`.

### Color Resolution Hook

A `useColorSchedule(state)` hook that applies the cascade and returns:

```js
{
  rooms: {
    [roomId]: {
      [substrate]: {
        color_code: string | null,
        color_name: string | null,
        product: string | null,
        sheen: string | null,
        source: 'default' | 'substrate' | 'room'
        // source indicates which cascade level provided the color_code
        // (individual fields may come from different levels via per-field merge)
      }
    }
  },
  elevations: {
    [elevId]: {
      [substrate]: {
        color_code: string | null,
        color_name: string | null,
        product: string | null,
        sheen: string | null,
        source: 'default' | 'substrate' | 'elevation'
      }
    }
  }
}
```

- Memoized via `useMemo` keyed on `state.colors`, `state.rooms`, and `state.exterior.elevations`
- Only resolves colors for active substrates (substrates with `painting !== false`)
- Used by both the Colors tab UI and (eventually) output generation

### Output Integration

- Color schedule is **conditional** in output — only included when color data exists
- When `state.colors.defaults` has entries, output includes a "Color Schedule" section
- Printable format: room-by-room table with substrate, color, product, sheen
- If no colors are entered, the estimate/output works exactly as it does today

### What This Feature Does NOT Include

- Product database or product picker (future — manual text entry for now)
- Auto-recommendation of products based on substrate/quality tier (future)
- Color visualization or swatch lookup (future)
- Integration with estimation engine (colors don't affect labor/material calculations)
- Stain/clear coat color tracking (existing `coating_type` system handles this separately)
- Brand as a separate field (brand is implicit in the color_code prefix for now, e.g., "SW" = Sherwin-Williams)

## File Structure

```
src/
  components/
    colors/
      ColorsView.jsx          — main tab container, three-zone layout (new CSS pattern)
      ProjectDefaults.jsx     — top bar with default cards
      RoomColorEditor.jsx     — left sidebar + center panel
      ColorSchedule.jsx       — right panel summary
      ColorEntryForm.jsx      — inline override form (reused in defaults and overrides)
  hooks/
    useColorSchedule.js       — cascade resolution logic, returns resolved schedule
  state/
    color-state.js            — initial color state, SUBSTRATE_COLOR_GROUPS constant
    reducer.js                — add color-related cases + cleanup in REMOVE_ROOM/REMOVE_ELEVATION
```

## Migration

- `initial-state.js` adds `colors: { defaults: {}, substrate_overrides: {}, room_overrides: {}, elevation_overrides: {} }` as a top-level state key
- `migrations.js` adds migration: `if (!parsed.colors) parsed.colors = { defaults: {}, substrate_overrides: {}, room_overrides: {}, elevation_overrides: {} };`
- `useProject.jsx` persistence updated to include `colors` in the serialized `project_data` object alongside `project`, `rooms`, `exterior`, and `ui`

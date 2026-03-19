# Color & Product Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Colors tab to PaintScope for assigning paint colors, products, and sheens to substrates with a three-level inheritance cascade (project defaults → substrate-type overrides → room/elevation overrides).

**Architecture:** New top-level `state.colors` key with cascade resolution via `useColorSchedule()` hook. Self-contained Colors view with its own three-zone layout (project defaults bar, room/elevation editor, full color schedule panel). All data persisted through existing IndexedDB/localStorage pipeline.

**Tech Stack:** React 19, Vite 7, useReducer + Context (no external state libraries), custom CSS with CSS custom properties, plain JSX + JS (no TypeScript, no Tailwind).

**Spec:** `docs/superpowers/specs/2026-03-19-color-product-management-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/state/color-state.js` | Initial color state, `SUBSTRATE_COLOR_GROUPS` constant, color group lookup helper |
| Create | `src/hooks/useColorSchedule.js` | Cascade resolution logic, returns resolved schedule for all rooms/elevations |
| Create | `src/components/colors/ColorsView.jsx` | Main tab container, three-zone layout |
| Create | `src/components/colors/ProjectDefaults.jsx` | Top bar with project default color cards |
| Create | `src/components/colors/RoomColorEditor.jsx` | Left sidebar (room/elevation list) + center panel (substrate color rows) |
| Create | `src/components/colors/ColorSchedule.jsx` | Right panel, full resolved color summary |
| Create | `src/components/colors/ColorEntryForm.jsx` | Reusable inline form for entering/editing color assignments |
| Modify | `src/state/initial-state.js:143-155` | Add `colors` as 5th top-level state key |
| Modify | `src/state/reducer.js:46-50,344-352` | Add 8 color actions + cleanup in REMOVE_ROOM/REMOVE_ELEVATION |
| Modify | `src/state/migrations.js:113-187` | Add migration to initialize `colors` on existing projects |
| Modify | `src/hooks/useProject.jsx:35-40` | Include `colors` in IndexedDB serialization |
| Modify | `src/App.jsx:26-38,86,243-325` | Add "colors" to NAV_VIEWS, add ColorsView rendering |

---

### Task 1: Color State Foundation

**Files:**
- Create: `src/state/color-state.js`
- Modify: `src/state/initial-state.js:143-155`

- [ ] **Step 1: Create `color-state.js` with substrate color group mapping**

```js
// src/state/color-state.js
// Substrate-to-color-group mapping for inheritance cascade

export const SUBSTRATE_COLOR_GROUPS = {
  // Surfaces
  walls: 'walls',
  ceiling: 'ceiling',
  // Trim — all inherit from 'trim' group
  baseboard: 'trim',
  crown: 'trim',
  door_casing: 'trim',
  window_casing: 'trim',
  chair_rail: 'trim',
  shoe_mold: 'trim',
  wainscot_cap: 'trim',
  picture_rail: 'trim',
  window_stool: 'trim',
  window_apron: 'trim',
  shadow_box: 'trim',
  panel_mold: 'trim',
  // Doors & Windows
  doors: 'doors',
  door_frames: 'doors',
  windows: 'windows',
  window_jamb: 'windows',
  // Specialty
  wainscoting: 'specialty',
  wood_feature_wall: 'specialty',
  wood_ceiling: 'specialty',
  closet_shelving: 'specialty',
  beams: 'specialty',
  columns: 'specialty',
  mantels: 'specialty',
  builtins: 'specialty',
  stair_risers: 'specialty',
  stair_railing: 'specialty',
  // Exterior
  siding: 'siding',
  fascia: 'ext_trim',
  soffit: 'ext_trim',
  rake_trim: 'ext_trim',
  corner_trim: 'ext_trim',
  ext_doors: 'ext_doors',
  ext_windows: 'ext_windows',
};

export const COLOR_GROUP_LABELS = {
  walls: 'Walls',
  ceiling: 'Ceiling',
  trim: 'Trim',
  doors: 'Doors',
  windows: 'Windows',
  specialty: 'Specialty',
  siding: 'Siding',
  ext_trim: 'Ext. Trim',
  ext_doors: 'Ext. Doors',
  ext_windows: 'Ext. Windows',
};

export function getColorGroup(substrateId) {
  return SUBSTRATE_COLOR_GROUPS[substrateId] || null;
}

export const initialColorState = {
  defaults: {},
  substrate_overrides: {},
  room_overrides: {},
  elevation_overrides: {},
};
```

- [ ] **Step 2: Add `colors` to initial state in `initial-state.js`**

In `src/state/initial-state.js`, import `initialColorState` and add it as a top-level key in `initialState`:

```js
// Add import at top of file
import { initialColorState } from './color-state.js';

// In initialState (line ~154), add after ui:
export const initialState = {
  project: { /* existing */ },
  rooms: [createRoom()],
  exterior: createExteriorState(),
  ui: { /* existing */ },
  colors: initialColorState,
};
```

- [ ] **Step 3: Add CSS variables for the Colors tab to `src/styles/variables.css`**

Add to the existing `:root` block (check which already exist and only add missing ones):

```css
--bg-deep: #0d0d15;
--bg-tertiary: #1a2020;
--bg-active: #1a2a3a;
--bg-override: #1a2020;
--border-subtle: #222;
--text-warning: #8a7a5a;
```

Note: The components reference `--bg-secondary`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--accent` — verify these exist in `variables.css`. If the app uses different names (e.g., `--bg-panel` instead of `--bg-secondary`), update the component code in later tasks to match.

- [ ] **Step 4: Verify no import errors by running dev server**

Run: `cd tools/paintscope && npm run dev`
Expected: Dev server starts without errors. No visible UI changes yet.

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/state/color-state.js tools/paintscope/src/state/initial-state.js tools/paintscope/src/styles/variables.css
git commit -m "feat(colors): add color state foundation with substrate group mapping"
```

---

### Task 2: Reducer Actions + Migration + Persistence

**Files:**
- Modify: `src/state/reducer.js:46-50,344-352`
- Modify: `src/state/migrations.js:113-187`
- Modify: `src/hooks/useProject.jsx:35-40`

- [ ] **Step 1: Add 8 color reducer actions to `reducer.js`**

Add these cases to the reducer switch statement, after the existing exterior actions:

```js
// ── Color Management ──────────────────────────────────
case 'SET_COLOR_DEFAULT': {
  const { group, data } = payload;
  return { ...state, colors: { ...state.colors,
    defaults: { ...state.colors.defaults, [group]: { ...(state.colors.defaults[group] || {}), ...data } }
  }};
}
case 'REMOVE_COLOR_DEFAULT': {
  const { group } = payload;
  const defaults = { ...state.colors.defaults };
  delete defaults[group];
  return { ...state, colors: { ...state.colors, defaults } };
}
case 'SET_COLOR_SUBSTRATE_OVERRIDE': {
  const { substrate, data } = payload;
  return { ...state, colors: { ...state.colors,
    substrate_overrides: { ...state.colors.substrate_overrides, [substrate]: { ...(state.colors.substrate_overrides[substrate] || {}), ...data } }
  }};
}
case 'REMOVE_COLOR_SUBSTRATE_OVERRIDE': {
  const { substrate } = payload;
  const substrate_overrides = { ...state.colors.substrate_overrides };
  delete substrate_overrides[substrate];
  return { ...state, colors: { ...state.colors, substrate_overrides } };
}
case 'SET_COLOR_ROOM_OVERRIDE': {
  const { roomId, substrate, data } = payload;
  const roomOvr = state.colors.room_overrides[roomId] || {};
  return { ...state, colors: { ...state.colors,
    room_overrides: { ...state.colors.room_overrides, [roomId]: { ...roomOvr, [substrate]: { ...(roomOvr[substrate] || {}), ...data } } }
  }};
}
case 'REMOVE_COLOR_ROOM_OVERRIDE': {
  const { roomId, substrate } = payload;
  const roomOvr = { ...(state.colors.room_overrides[roomId] || {}) };
  delete roomOvr[substrate];
  const room_overrides = { ...state.colors.room_overrides };
  if (Object.keys(roomOvr).length === 0) delete room_overrides[roomId];
  else room_overrides[roomId] = roomOvr;
  return { ...state, colors: { ...state.colors, room_overrides } };
}
case 'SET_COLOR_ELEVATION_OVERRIDE': {
  const { elevId, substrate, data } = payload;
  const elevOvr = state.colors.elevation_overrides[elevId] || {};
  return { ...state, colors: { ...state.colors,
    elevation_overrides: { ...state.colors.elevation_overrides, [elevId]: { ...elevOvr, [substrate]: { ...(elevOvr[substrate] || {}), ...data } } }
  }};
}
case 'REMOVE_COLOR_ELEVATION_OVERRIDE': {
  const { elevId, substrate } = payload;
  const elevOvr = { ...(state.colors.elevation_overrides[elevId] || {}) };
  delete elevOvr[substrate];
  const elevation_overrides = { ...state.colors.elevation_overrides };
  if (Object.keys(elevOvr).length === 0) delete elevation_overrides[elevId];
  else elevation_overrides[elevId] = elevOvr;
  return { ...state, colors: { ...state.colors, elevation_overrides } };
}
```

- [ ] **Step 2: Add cleanup to REMOVE_ROOM and REMOVE_ELEVATION**

Update the existing `REMOVE_ROOM` case (line ~46) to also clean up orphaned color overrides:

```js
case 'REMOVE_ROOM': {
  const rooms = state.rooms.filter(r => r.id !== payload);
  const activeId = state.ui.activeRoomId === payload ? (rooms[0]?.id || null) : state.ui.activeRoomId;
  const room_overrides = { ...state.colors.room_overrides };
  delete room_overrides[payload];
  return { ...state, rooms, ui:{...state.ui, activeRoomId:activeId}, colors: { ...state.colors, room_overrides } };
}
```

Update the existing `REMOVE_ELEVATION` case (line ~344) similarly:

```js
case 'REMOVE_ELEVATION': {
  const elevs = state.exterior.elevations.filter(e => e.id !== payload);
  const activeId = state.ui.activeElevationId === payload ? (elevs[0]?.id || null) : state.ui.activeElevationId;
  const elevation_overrides = { ...state.colors.elevation_overrides };
  delete elevation_overrides[payload];
  return {
    ...state,
    exterior: { ...state.exterior, elevations: elevs },
    ui: { ...state.ui, activeElevationId: activeId, scopeMode: elevs.length > 0 ? 'exterior' : state.ui.scopeMode },
    colors: { ...state.colors, elevation_overrides }
  };
}
```

- [ ] **Step 3: Add migration in `migrations.js`**

In `migrateInline()`, add after the existing UI migrations (around line ~159):

```js
// v1.0: Initialize colors state
if (!parsed.colors) {
  parsed.colors = { defaults: {}, substrate_overrides: {}, room_overrides: {}, elevation_overrides: {} };
}
```

- [ ] **Step 4: Add `colors` to IndexedDB serialization in `useProject.jsx`**

There are TWO places that build `project_data` in `useProject.jsx` — both must include `colors`:

**Auto-save path** (line ~35):
```js
proj.project_data = {
  project: state.project,
  rooms: state.rooms,
  exterior: state.exterior,
  ui: state.ui,
  colors: state.colors,
};
```

**Manual save (Ctrl+S) path** (line ~64, inside `saveNow` callback):
```js
proj.project_data = {
  project: state.project,
  rooms: state.rooms,
  exterior: state.exterior,
  ui: state.ui,
  colors: state.colors,
};
```

Both must be updated or manual saves will silently drop color data.

Note: `migrateInline()` only runs for localStorage-loaded data. For IndexedDB-loaded projects, `colors` is preserved because `{ ...initialState, ...initialData }` keeps `initialState.colors` when `initialData` has no `colors` property. This is safe but worth understanding.

- [ ] **Step 5: Verify dev server still runs and existing features work**

Run: `cd tools/paintscope && npm run dev`
Expected: Dev server starts, existing room/elevation CRUD still works, no console errors.

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/state/reducer.js tools/paintscope/src/state/migrations.js tools/paintscope/src/hooks/useProject.jsx
git commit -m "feat(colors): add reducer actions, migration, and persistence for color state"
```

---

### Task 3: Color Resolution Hook

**Files:**
- Create: `src/hooks/useColorSchedule.js`

- [ ] **Step 1: Create `useColorSchedule.js`**

```js
// src/hooks/useColorSchedule.js
import { useMemo } from 'react';
import { getColorGroup } from '../state/color-state.js';

/**
 * Resolves a single color assignment by merging fields up the cascade.
 * Returns { color_code, color_name, product, sheen, source } or null.
 */
function resolveColor(substrate, locationOverrides, colors) {
  const group = getColorGroup(substrate);
  const layers = [
    locationOverrides?.[substrate],                // room/elevation override
    colors.substrate_overrides?.[substrate],        // substrate-type override
    group ? colors.defaults?.[group] : null,        // project default by group
  ];

  // Determine source from the first layer that provides color_code
  let source = null;
  const sourceLabels = ['room', 'substrate', 'default'];

  const merged = { color_code: null, color_name: null, product: null, sheen: null };
  let hasAny = false;

  // Walk layers bottom-up for field merging, but track source from top-down
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer) continue;
    for (const field of ['color_code', 'color_name', 'product', 'sheen']) {
      if (layer[field] != null && layer[field] !== '') {
        merged[field] = layer[field];
        hasAny = true;
      }
    }
  }

  if (!hasAny) return null;

  // Source = highest-priority layer that provides color_code
  for (let i = 0; i < layers.length; i++) {
    if (layers[i]?.color_code) {
      source = sourceLabels[i];
      break;
    }
  }
  merged.source = source || 'default';

  return merged;
}

/**
 * Returns the full resolved color schedule for all active substrates
 * in all rooms and elevations.
 *
 * @param {object} state - Full app state
 * @returns {{ rooms: Object, elevations: Object }}
 */
export function useColorSchedule(state) {
  const { colors, rooms, exterior } = state;

  return useMemo(() => {
    const result = { rooms: {}, elevations: {} };

    if (!colors) return result;

    // Resolve interior rooms
    for (const room of (rooms || [])) {
      const roomColors = {};
      const subs = room.substrates || {};
      for (const subId of Object.keys(subs)) {
        // Skip inactive substrates
        if (subs[subId].painting === false) continue;
        const resolved = resolveColor(
          subId,
          colors.room_overrides?.[room.id],
          colors
        );
        if (resolved) roomColors[subId] = resolved;
      }
      if (Object.keys(roomColors).length > 0 || colors.room_overrides?.[room.id]) {
        result.rooms[room.id] = roomColors;
      }
    }

    // Resolve exterior elevations
    const elevations = exterior?.elevations || [];
    for (const elev of elevations) {
      const elevColors = {};

      // Siding sections
      if (elev.siding_sections?.length > 0) {
        const resolved = resolveColor(
          'siding',
          colors.elevation_overrides?.[elev.id],
          colors
        );
        if (resolved) elevColors.siding = resolved;
      }

      // Trim types
      if (elev.trim) {
        for (const trimType of Object.keys(elev.trim)) {
          if (!elev.trim[trimType].enabled) continue;
          const resolved = resolveColor(
            trimType,
            colors.elevation_overrides?.[elev.id],
            colors
          );
          if (resolved) elevColors[trimType] = resolved;
        }
      }

      // Windows
      if (elev.windows?.length > 0) {
        const resolved = resolveColor(
          'ext_windows',
          colors.elevation_overrides?.[elev.id],
          colors
        );
        if (resolved) elevColors.ext_windows = resolved;
      }

      // Doors
      if (elev.doors?.length > 0) {
        const resolved = resolveColor(
          'ext_doors',
          colors.elevation_overrides?.[elev.id],
          colors
        );
        if (resolved) elevColors.ext_doors = resolved;
      }

      if (Object.keys(elevColors).length > 0 || colors.elevation_overrides?.[elev.id]) {
        result.elevations[elev.id] = elevColors;
      }
    }

    return result;
  }, [colors, rooms, exterior]);
}
```

- [ ] **Step 2: Verify no import errors**

Run: `cd tools/paintscope && npm run dev`
Expected: Dev server starts without errors. Hook is not used yet but should import cleanly.

- [ ] **Step 3: Commit**

```bash
git add tools/paintscope/src/hooks/useColorSchedule.js
git commit -m "feat(colors): add useColorSchedule hook with cascade resolution"
```

---

### Task 4: ColorEntryForm Component

**Files:**
- Create: `src/components/colors/ColorEntryForm.jsx`

- [ ] **Step 1: Create `ColorEntryForm.jsx`**

Reusable inline form for entering/editing a color assignment. Used in both project defaults and room overrides.

```jsx
// src/components/colors/ColorEntryForm.jsx
import React, { useState } from 'react';

const SHEEN_OPTIONS = ['flat', 'matte', 'eggshell', 'satin', 'semi_gloss', 'gloss'];

/**
 * Inline form for entering a color assignment.
 * @param {object} props
 * @param {object} props.initial - Initial values { color_code, color_name, product, sheen }
 * @param {object} props.inherited - Inherited values to show as placeholders
 * @param {function} props.onSave - Called with { color_code, color_name, product, sheen }
 * @param {function} props.onCancel - Called when user cancels
 * @param {boolean} props.compact - Use compact layout
 */
export default function ColorEntryForm({ initial = {}, inherited = {}, onSave, onCancel, compact }) {
  const [draft, setDraft] = useState({
    color_code: initial.color_code || '',
    color_name: initial.color_name || '',
    product: initial.product || '',
    sheen: initial.sheen || '',
  });

  const set = (field, value) => setDraft(d => ({ ...d, [field]: value }));

  const handleSave = () => {
    const data = {};
    if (draft.color_code) data.color_code = draft.color_code;
    if (draft.color_name) data.color_name = draft.color_name;
    if (draft.product) data.product = draft.product;
    if (draft.sheen) data.sheen = draft.sheen;
    onSave(data);
  };

  const inputStyle = { padding: '4px 6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 };
  const labelStyle = { fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' }}>
      <div>
        <div style={labelStyle}>Color Code</div>
        <input style={{ ...inputStyle, width: 80 }}
          value={draft.color_code}
          onChange={e => set('color_code', e.target.value)}
          placeholder={inherited.color_code || 'SW 7006'} />
      </div>
      <div>
        <div style={labelStyle}>Color Name</div>
        <input style={{ ...inputStyle, width: 110 }}
          value={draft.color_name}
          onChange={e => set('color_name', e.target.value)}
          placeholder={inherited.color_name || 'Extra White'} />
      </div>
      <div>
        <div style={labelStyle}>Product</div>
        <input style={{ ...inputStyle, width: 100 }}
          value={draft.product}
          onChange={e => set('product', e.target.value)}
          placeholder={inherited.product || 'Duration'} />
      </div>
      <div>
        <div style={labelStyle}>Sheen</div>
        <select style={{ ...inputStyle, width: 90 }}
          value={draft.sheen}
          onChange={e => set('sheen', e.target.value)}>
          <option value="">{inherited.sheen ? `← ${inherited.sheen}` : 'Select...'}</option>
          {SHEEN_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', '-')}</option>)}
        </select>
      </div>
      <button onClick={handleSave}
        style={{ padding: '4px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
        Save
      </button>
      {onCancel && (
        <button onClick={onCancel}
          style={{ padding: '4px 12px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
          Cancel
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/paintscope/src/components/colors/ColorEntryForm.jsx
git commit -m "feat(colors): add ColorEntryForm reusable input component"
```

---

### Task 5: ProjectDefaults Component

**Files:**
- Create: `src/components/colors/ProjectDefaults.jsx`

- [ ] **Step 1: Create `ProjectDefaults.jsx`**

Top bar showing project-level color defaults as compact cards, with edit capability and substrate-type override indicators.

```jsx
// src/components/colors/ProjectDefaults.jsx
import React, { useState } from 'react';
import { COLOR_GROUP_LABELS } from '../../state/color-state.js';
import ColorEntryForm from './ColorEntryForm.jsx';

const SWATCH_STYLE = { display: 'inline-block', width: 14, height: 14, borderRadius: 3, border: '1px solid var(--border)', verticalAlign: 'middle', marginRight: 5 };

export default function ProjectDefaults({ colors, dispatch }) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newGroup, setNewGroup] = useState('');

  const defaults = colors.defaults || {};
  const subOverrides = colors.substrate_overrides || {};
  const groups = Object.keys(defaults);

  const allGroups = Object.keys(COLOR_GROUP_LABELS);
  const availableGroups = allGroups.filter(g => !defaults[g]);

  const handleSave = (group, data) => {
    dispatch({ type: 'SET_COLOR_DEFAULT', payload: { group, data } });
    setEditingGroup(null);
    setAddingNew(false);
  };

  const handleRemove = (group) => {
    dispatch({ type: 'REMOVE_COLOR_DEFAULT', payload: { group } });
  };

  // Find substrate overrides and which group they belong to
  const overrideList = Object.entries(subOverrides).map(([sub, data]) => ({
    substrate: sub,
    ...data,
  }));

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Project Defaults</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {groups.map(group => (
          <div key={group} onClick={() => setEditingGroup(group)}
            style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', minWidth: 150, cursor: 'pointer' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{COLOR_GROUP_LABELS[group] || group}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span style={{ ...SWATCH_STYLE, background: '#ccc' }} />
              <span style={{ fontSize: 11 }}>{defaults[group].color_code} {defaults[group].color_name}</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              {defaults[group].product || '—'} · {defaults[group].sheen || '—'}
            </div>
          </div>
        ))}

        {/* Add new group button */}
        {availableGroups.length > 0 && !addingNew && (
          <div onClick={() => setAddingNew(true)}
            style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', minWidth: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>+</span>
          </div>
        )}
      </div>

      {/* Editing a group */}
      {editingGroup && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{COLOR_GROUP_LABELS[editingGroup]}</span>
            <button onClick={() => { handleRemove(editingGroup); setEditingGroup(null); }}
              style={{ fontSize: 10, background: 'none', border: 'none', color: '#c44', cursor: 'pointer' }}>Remove</button>
          </div>
          <ColorEntryForm
            initial={defaults[editingGroup]}
            onSave={(data) => handleSave(editingGroup, data)}
            onCancel={() => setEditingGroup(null)} />
        </div>
      )}

      {/* Adding new group */}
      {addingNew && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--accent)' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Substrate Group</span>
            <select value={newGroup || availableGroups[0] || ''}
              onChange={e => setNewGroup(e.target.value)}
              style={{ marginLeft: 8, padding: '3px 6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
              {availableGroups.map(g => <option key={g} value={g}>{COLOR_GROUP_LABELS[g]}</option>)}
            </select>
          </div>
          <ColorEntryForm
            onSave={(data) => handleSave(newGroup || availableGroups[0], data)}
            onCancel={() => setAddingNew(false)} />
        </div>
      )}

      {/* Substrate-type override indicators */}
      {overrideList.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-warning)' }}>
          {overrideList.map(o => (
            <span key={o.substrate} style={{ marginRight: 12 }}>
              ⚠ {o.substrate.replace(/_/g, ' ')} → {o.color_code} {o.color_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/paintscope/src/components/colors/ProjectDefaults.jsx
git commit -m "feat(colors): add ProjectDefaults component with inline editing"
```

---

### Task 6: RoomColorEditor Component

**Files:**
- Create: `src/components/colors/RoomColorEditor.jsx`

- [ ] **Step 1: Create `RoomColorEditor.jsx`**

Left sidebar with room/elevation list + center panel showing selected room's substrates with resolved colors and inline override editing.

```jsx
// src/components/colors/RoomColorEditor.jsx
import React, { useState } from 'react';
import { SUBSTRATE_MAP } from '../../data/substrate-catalog.js';
import { getColorGroup } from '../../state/color-state.js';
import ColorEntryForm from './ColorEntryForm.jsx';

export default function RoomColorEditor({ state, schedule, dispatch }) {
  const { rooms, exterior, colors } = state;
  const elevations = exterior?.elevations || [];

  const [selectedType, setSelectedType] = useState(rooms.length > 0 ? 'room' : 'elevation');
  const [selectedId, setSelectedId] = useState(rooms[0]?.id || elevations[0]?.id || null);
  const [editingSub, setEditingSub] = useState(null);
  const [addingOverride, setAddingOverride] = useState(false);

  const isRoom = selectedType === 'room';
  const selectedItem = isRoom
    ? rooms.find(r => r.id === selectedId)
    : elevations.find(e => e.id === selectedId);

  // Get active substrates for selected room/elevation
  const getActiveSubstrates = () => {
    if (!selectedItem) return [];
    if (isRoom) {
      return Object.keys(selectedItem.substrates || {}).filter(subId => {
        const sub = selectedItem.substrates[subId];
        return sub.painting !== false;
      });
    }
    // Exterior: collect substrate types from elevation data
    const subs = [];
    if (selectedItem.siding_sections?.length > 0) subs.push('siding');
    if (selectedItem.trim) {
      for (const [type, config] of Object.entries(selectedItem.trim)) {
        if (config.enabled) subs.push(type);
      }
    }
    if (selectedItem.windows?.length > 0) subs.push('ext_windows');
    if (selectedItem.doors?.length > 0) subs.push('ext_doors');
    return subs;
  };

  const activeSubstrates = getActiveSubstrates();
  const resolvedColors = isRoom
    ? schedule.rooms[selectedId] || {}
    : schedule.elevations[selectedId] || {};

  const getSubstrateLabel = (subId) => {
    const cat = SUBSTRATE_MAP[subId];
    return cat ? cat.label : subId.replace(/_/g, ' ');
  };

  const getInherited = (subId) => {
    const group = getColorGroup(subId);
    const subOvr = colors.substrate_overrides?.[subId];
    const groupDef = group ? colors.defaults?.[group] : null;
    // Merge for inherited display
    const merged = { ...groupDef, ...subOvr };
    return merged;
  };

  const handleSaveOverride = (subId, data) => {
    const actionType = isRoom ? 'SET_COLOR_ROOM_OVERRIDE' : 'SET_COLOR_ELEVATION_OVERRIDE';
    const idKey = isRoom ? 'roomId' : 'elevId';
    dispatch({ type: actionType, payload: { [idKey]: selectedId, substrate: subId, data } });
    setEditingSub(null);
    setAddingOverride(false);
  };

  const handleRemoveOverride = (subId) => {
    const actionType = isRoom ? 'REMOVE_COLOR_ROOM_OVERRIDE' : 'REMOVE_COLOR_ELEVATION_OVERRIDE';
    const idKey = isRoom ? 'roomId' : 'elevId';
    dispatch({ type: actionType, payload: { [idKey]: selectedId, substrate: subId } });
    setEditingSub(null);
  };

  const getSourceBadge = (resolved) => {
    if (!resolved) return { label: 'none', style: { color: 'var(--text-muted)' } };
    if (resolved.source === 'room' || resolved.source === 'elevation')
      return { label: 'override', style: { background: '#2a5a4a', padding: '1px 5px', borderRadius: 3, color: '#8fc', fontSize: 9 } };
    if (resolved.source === 'substrate')
      return { label: 'project', style: { background: '#4a3a2a', padding: '1px 5px', borderRadius: 3, color: '#dab', fontSize: 9 } };
    return { label: 'inherited', style: { color: 'var(--text-muted)', fontSize: 9, fontStyle: 'italic' } };
  };

  const sidebarItemStyle = (id, type) => ({
    padding: '5px 8px', borderRadius: 4, marginBottom: 3, fontSize: 11, cursor: 'pointer',
    background: selectedId === id && selectedType === type ? 'var(--bg-active)' : 'transparent',
    color: selectedId === id && selectedType === type ? 'var(--text-primary)' : 'var(--text-secondary)',
    border: selectedId === id && selectedType === type ? '1px solid var(--accent)' : '1px solid transparent',
  });

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* Left sidebar — room/elevation list */}
      <div style={{ width: 120, borderRight: '1px solid var(--border)', padding: 8, background: 'var(--bg-deep)', overflowY: 'auto' }}>
        {rooms.length > 0 && (
          <>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Interior</div>
            {rooms.map(r => (
              <div key={r.id} style={sidebarItemStyle(r.id, 'room')}
                onClick={() => { setSelectedType('room'); setSelectedId(r.id); setEditingSub(null); }}>
                {r.label || r.id}
              </div>
            ))}
          </>
        )}
        {elevations.length > 0 && (
          <>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '10px 0 6px' }}>Exterior</div>
            {elevations.map(e => (
              <div key={e.id} style={sidebarItemStyle(e.id, 'elevation')}
                onClick={() => { setSelectedType('elevation'); setSelectedId(e.id); setEditingSub(null); }}>
                {e.label || e.id}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Center panel — substrate color rows */}
      <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        {selectedItem ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedItem.label || selectedItem.id}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>click any row to override</span>
              </div>
            </div>

            {activeSubstrates.map(subId => {
              const resolved = resolvedColors[subId];
              const badge = getSourceBadge(resolved);
              const isEditing = editingSub === subId;
              const isOverride = resolved?.source === 'room' || resolved?.source === 'elevation';

              return (
                <div key={subId}>
                  <div onClick={() => setEditingSub(isEditing ? null : subId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 4, marginBottom: 4, cursor: 'pointer',
                      background: isOverride ? 'var(--bg-override)' : 'var(--bg-secondary)',
                      border: isOverride ? '1px solid var(--accent)' : '1px solid transparent',
                    }}>
                    <span style={{ width: 70, fontSize: 11, color: isOverride ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isOverride ? 600 : 400 }}>
                      {getSubstrateLabel(subId)}
                    </span>
                    {resolved ? (
                      <>
                        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ccc', border: '1px solid var(--border)', borderRadius: 2 }} />
                        <span style={{ fontSize: 11, color: isOverride ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {resolved.color_code} {resolved.color_name}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                          · {resolved.product || '—'} · {resolved.sheen || '—'}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No color assigned</span>
                    )}
                    <span style={{ flex: 1 }} />
                    <span style={badge.style}>{badge.label}</span>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <div style={{ marginLeft: 16, marginBottom: 8, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--accent)' }}>
                      <ColorEntryForm
                        initial={resolved || {}}
                        inherited={getInherited(subId)}
                        onSave={(data) => handleSaveOverride(subId, data)}
                        onCancel={() => setEditingSub(null)} />
                      {isOverride && (
                        <button onClick={() => handleRemoveOverride(subId)}
                          style={{ marginTop: 6, fontSize: 10, background: 'none', border: 'none', color: '#c44', cursor: 'pointer' }}>
                          Remove override (revert to inherited)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {activeSubstrates.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                No active substrates in this {isRoom ? 'room' : 'elevation'}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>
            Select a room or elevation from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/paintscope/src/components/colors/RoomColorEditor.jsx
git commit -m "feat(colors): add RoomColorEditor with sidebar and inline override editing"
```

---

### Task 7: ColorSchedule Component

**Files:**
- Create: `src/components/colors/ColorSchedule.jsx`

- [ ] **Step 1: Create `ColorSchedule.jsx`**

Right panel showing the full resolved color schedule across all rooms and elevations.

```jsx
// src/components/colors/ColorSchedule.jsx
import React from 'react';
import { SUBSTRATE_MAP } from '../../data/substrate-catalog.js';

export default function ColorSchedule({ rooms, elevations, schedule }) {
  const getLabel = (subId) => {
    const cat = SUBSTRATE_MAP[subId];
    return cat ? cat.label : subId.replace(/_/g, ' ');
  };

  const hasAnyColors = Object.keys(schedule.rooms).length > 0 || Object.keys(schedule.elevations).length > 0;

  return (
    <div style={{ width: 260, padding: 10, background: 'var(--bg-deep)', overflowY: 'auto', borderLeft: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>Full Color Schedule</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>Resolved colors for every substrate</div>

      {!hasAnyColors && (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>
          Set project defaults to see the color schedule
        </div>
      )}

      {/* Interior rooms */}
      {rooms.map(room => {
        const roomColors = schedule.rooms[room.id];
        if (!roomColors || Object.keys(roomColors).length === 0) return null;
        return (
          <div key={room.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, paddingBottom: 3, borderBottom: '1px solid var(--border-subtle)' }}>
              {room.label || room.id}
            </div>
            {Object.entries(roomColors).map(([subId, resolved]) => (
              <div key={subId} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: '#ccc', border: '1px solid var(--border)', borderRadius: 2 }} />
                <span style={{ fontSize: 10, width: 55, color: 'var(--text-muted)' }}>{getLabel(subId)}</span>
                <span style={{ fontSize: 10, color: resolved.source === 'room' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {resolved.color_name || resolved.color_code || '—'}
                </span>
                {(resolved.source === 'room' || resolved.source === 'substrate') && (
                  <span style={{ fontSize: 8, marginLeft: 'auto', color: resolved.source === 'room' ? '#2a5a4a' : '#aa8a5a' }}>●</span>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Exterior elevations */}
      {elevations.map(elev => {
        const elevColors = schedule.elevations[elev.id];
        if (!elevColors || Object.keys(elevColors).length === 0) return null;
        return (
          <div key={elev.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, paddingBottom: 3, borderBottom: '1px solid var(--border-subtle)' }}>
              {elev.label || elev.id}
            </div>
            {Object.entries(elevColors).map(([subId, resolved]) => (
              <div key={subId} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: '#ccc', border: '1px solid var(--border)', borderRadius: 2 }} />
                <span style={{ fontSize: 10, width: 55, color: 'var(--text-muted)' }}>{getLabel(subId)}</span>
                <span style={{ fontSize: 10, color: resolved.source === 'elevation' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {resolved.color_name || resolved.color_code || '—'}
                </span>
                {(resolved.source === 'elevation' || resolved.source === 'substrate') && (
                  <span style={{ fontSize: 8, marginLeft: 'auto', color: resolved.source === 'elevation' ? '#2a5a4a' : '#aa8a5a' }}>●</span>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Legend */}
      {hasAnyColors && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span><span style={{ color: '#2a5a4a' }}>●</span> room override</span>
            <span><span style={{ color: '#aa8a5a' }}>●</span> substrate override</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/paintscope/src/components/colors/ColorSchedule.jsx
git commit -m "feat(colors): add ColorSchedule summary panel component"
```

---

### Task 8: ColorsView Container + App Integration

**Files:**
- Create: `src/components/colors/ColorsView.jsx`
- Modify: `src/App.jsx:26-38,86,243-325`

- [ ] **Step 1: Create `ColorsView.jsx`**

Main container that composes all three zones into the single-page layout.

```jsx
// src/components/colors/ColorsView.jsx
import React from 'react';
import { useColorSchedule } from '../../hooks/useColorSchedule.js';
import ProjectDefaults from './ProjectDefaults.jsx';
import RoomColorEditor from './RoomColorEditor.jsx';
import ColorSchedule from './ColorSchedule.jsx';

export default function ColorsView({ state, dispatch }) {
  const schedule = useColorSchedule(state);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar — Project Defaults */}
      <ProjectDefaults colors={state.colors} dispatch={dispatch} />

      {/* Main content — Room Editor + Color Schedule */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left + Center: Room/Elevation Editor */}
        <RoomColorEditor state={state} schedule={schedule} dispatch={dispatch} />

        {/* Right: Full Color Schedule */}
        <ColorSchedule
          rooms={state.rooms || []}
          elevations={state.exterior?.elevations || []}
          schedule={schedule} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add "colors" to NAV_VIEWS in App.jsx**

In `src/App.jsx`, insert the colors entry into the NAV_VIEWS array after `estimate` (line ~30):

```js
// After { id:'estimate', label:'Estimate' },
{ id:'colors', label:'Colors' },
// Before { id:'output', label:'Output' },
```

- [ ] **Step 3: Add ColorsView import and rendering in App.jsx**

Add import at top of App.jsx:
```js
import ColorsView from './components/colors/ColorsView.jsx';
```

In the view rendering section (around lines 243-325), add the conditional wrapped in an ErrorBoundary (matching the existing pattern for other views):
```jsx
{view === 'colors' && (
  <ErrorBoundary label="Colors">
    <ColorsView state={state} dispatch={dispatch} />
  </ErrorBoundary>
)}
```

Place this after the `estimate` view conditional and before the `output` view conditional. Check how other views are wrapped in ErrorBoundary and follow the same pattern. If the app does not use ErrorBoundary, skip the wrapper.

- [ ] **Step 4: Verify the Colors tab renders**

Run: `cd tools/paintscope && npm run dev`
Expected: Dev server starts, "Colors" tab appears in navigation, clicking it shows the three-zone layout (empty state — no defaults set yet).

- [ ] **Step 5: Manual smoke test**

1. Click "Colors" tab — should show empty project defaults, room sidebar, and empty schedule
2. Click "+" to add a project default for "Walls" — enter color code, name, product, sheen
3. Verify the default card appears in the top bar
4. Click a room in the sidebar — walls substrate should show the inherited color
5. Click the walls row — inline edit form should appear
6. Enter an override color — verify the badge changes to "override"
7. Check the right panel — the color schedule should show resolved colors
8. Navigate to other tabs and back — colors state should persist

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/colors/ColorsView.jsx tools/paintscope/src/App.jsx
git commit -m "feat(colors): add ColorsView container and integrate into app navigation"
```

---

### Task 9: Final Integration Verification

- [ ] **Step 1: Full workflow test**

Run dev server and test the complete workflow:
1. Create a project with 2-3 rooms and add substrates (walls, ceiling, baseboard, doors)
2. Switch to Colors tab
3. Set project defaults for walls, trim, ceiling
4. Verify all rooms show inherited colors in the schedule
5. Override walls color in one room
6. Verify the room shows "override" badge, schedule updates
7. Add a substrate-type override (e.g., window casing different from trim)
8. Verify it shows "project" badge in rooms that have window casing
9. Delete a room — verify its color overrides are cleaned up
10. Refresh page — verify all color data persists

- [ ] **Step 2: Add exterior elevation and test**

1. Add an exterior elevation with siding and trim
2. Switch to Colors tab — elevation should appear in sidebar
3. Set siding default color
4. Override on specific elevation
5. Verify schedule shows exterior colors

- [ ] **Step 3: Build check**

Run: `cd tools/paintscope && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A tools/paintscope/src/
git commit -m "feat(colors): complete color & product management feature"
```

---

## Deferred Work (not in this plan)

- **Substrate-type override UI**: The reducer supports `SET_COLOR_SUBSTRATE_OVERRIDE` / `REMOVE_COLOR_SUBSTRATE_OVERRIDE`, and existing overrides are shown as indicators in `ProjectDefaults`. However, there is no UI to *create* substrate-type overrides in this implementation. Users can set project defaults and room/elevation overrides. Substrate-type overrides (e.g., window casing differs from trim group project-wide) can be added as a follow-up enhancement to the ProjectDefaults component.
- **Output integration**: The spec describes a conditional "Color Schedule" section in estimate/proposal output. This will be implemented when the output/work order system is ready to consume color data. The `useColorSchedule` hook is already designed to be consumed by output components.
- **Product database integration**: Currently manual text entry for product names. When the product/material database is built, the product field becomes a picker with auto-suggestions based on substrate + quality tier.

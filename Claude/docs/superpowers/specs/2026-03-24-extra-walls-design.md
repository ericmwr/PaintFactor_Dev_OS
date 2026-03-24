# Extra Walls Design

**Date:** 2026-03-24
**Status:** Approved
**Goal:** Allow users to add extra paintable walls within a room (shower walls, toilet partitions, nooks) that contribute to wall SF and baseboard LF without affecting ceiling area.

---

## 1. Data Model

Each room gains an `extra_walls` array. Each entry:

```javascript
{
  id: 'xw_1',           // genId('xw')
  label: '',             // optional descriptor — "Shower Wall", "Partition", etc.
  length_ft: 0,
  height_ft: 0,          // independent of room height
  both_sides: false,     // when true, doubles wall SF and baseboard LF
}
```

**Storage:** `room.extra_walls` — same level as `room.openings`, `room.closets`.

---

## 2. Geometry Impact

### Wall SF
Each extra wall adds to `wall_field_sf`:
```
extra_wall_sf = length_ft × height_ft × (both_sides ? 2 : 1)
```

Total extra wall SF is summed across all entries and added to the derived wall net SF (after opening deductions, gable additions, and feature wall deductions).

### Baseboard LF
Each extra wall adds to the effective perimeter used for baseboard derivation:
```
extra_baseboard_lf = length_ft × (both_sides ? 2 : 1)
```

This is added to the perimeter value before `deriveLF('baseboard')` runs.

### What Doesn't Change
- **Ceiling SF** — extra walls don't add ceiling area
- **Opening deductions** — not applied to extra walls (no doors/windows in partitions)
- **Crown molding** — crown derives from perimeter; extra walls typically don't have crown. Crown is NOT affected by extra walls.
- **Other trim** — chair rail, shoe mold, etc. derive from perimeter and are NOT affected by extra walls. Only baseboard is affected.

---

## 3. Engine Changes

### `derive-room.js` — `deriveRoom()`

After computing `wallNet` and `gableExtra`, before computing `wall_field_sf`:

```javascript
// Extra walls — additional paintable wall surfaces (partitions, shower walls, nooks)
const extraWalls = room.extra_walls || [];
const extraWallSF = extraWalls.reduce((s, w) => {
  const sf = (parseFloat(w.length_ft) || 0) * (parseFloat(w.height_ft) || 0);
  return s + sf * (w.both_sides ? 2 : 1);
}, 0);
const extraWallLF = extraWalls.reduce((s, w) => {
  const lf = parseFloat(w.length_ft) || 0;
  return s + lf * (w.both_sides ? 2 : 1);
}, 0);
```

Modify `wall_field_sf` derivation to include extra wall SF:
```javascript
const wall_field_sf = subs.walls
  ? (subs.walls.sf_override
      ? parseFloat(subs.walls.sf_manual) || 0
      : Math.max(0, Math.round(wallNet + gableExtra - featureWallDeduct + extraWallSF)))
  : 0;
```

Modify baseboard derivation to include extra wall LF. Add `extraWallLF` to the perimeter passed to the baseboard auto-derive, or add it after derivation:
```javascript
const baseboard_lf_raw = deriveLF('baseboard') + (subs.baseboard ? Math.round(extraWallLF) : 0);
```

Add `extraWallSF` and `extraWallLF` to the returned derived object for display in the UI.

---

## 4. State Changes

### `initial-state.js` — `createRoom()`

Add `extra_walls: []` to the room object, same level as `openings` and `closets`:
```javascript
extra_walls: [],
```

### `migrations.js` — `migrateInline()`

Add:
```javascript
if (!r.extra_walls) r.extra_walls = [];
```

### `reducer.js`

Three new actions:

```javascript
case 'ADD_EXTRA_WALL':
  // payload: { roomId }
  return updateRoom(payload.roomId, r => ({
    ...r,
    extra_walls: [...(r.extra_walls || []), {
      id: genId('xw'),
      label: '',
      length_ft: 0,
      height_ft: 0,
      both_sides: false,
    }]
  }));

case 'SET_EXTRA_WALL':
  // payload: { roomId, wallId, field, value }
  return updateRoom(payload.roomId, r => ({
    ...r,
    extra_walls: (r.extra_walls || []).map(w =>
      w.id === payload.wallId ? { ...w, [payload.field]: payload.value } : w
    )
  }));

case 'REMOVE_EXTRA_WALL':
  // payload: { roomId, wallId }
  return updateRoom(payload.roomId, r => ({
    ...r,
    extra_walls: (r.extra_walls || []).filter(w => w.id !== payload.wallId)
  }));
```

---

## 5. UI Changes

### `StructureTab.jsx` — Walls Section

Add below the existing Wall SF field (after the gross/deduct/net breakdown line), inside the `subs.walls &&` conditional:

**"+ Add Wall" button** — creates a new extra wall entry.

**Extra wall rows** — each row in a compact inline layout:
- Label input (small, placeholder "Shower Wall, Partition...")
- Length (ft) number input
- Height (ft) number input
- "Both Sides" checkbox
- SF readout (computed: `length × height × (both_sides ? 2 : 1)`)
- Delete button (×)

Follow the same compact row pattern used by openings in OpeningsTab.

Show a summary line below the extra walls:
```
Extra walls: +XX SF wall, +XX LF baseboard
```

---

## 6. What Changes vs What Doesn't

### Changes
- `src/engine/derive-room.js` — add extraWallSF to wall_field_sf, extraWallLF to baseboard_lf
- `src/state/initial-state.js` — add `extra_walls: []` to createRoom
- `src/state/migrations.js` — migration for existing rooms
- `src/state/reducer.js` — ADD/SET/REMOVE_EXTRA_WALL actions
- `src/components/room-editor/tabs/StructureTab.jsx` — extra walls UI in Walls section

### Does NOT Change
- Ceiling derivation
- Opening deductions
- Crown/chair rail/other trim derivation
- Closet geometry
- Exterior geometry
- Estimation engine (it reads wall_field_sf and baseboard_lf from derive-room, which already include extra wall contributions)
- Material estimates (reads from the same derived quantities)

# Extra Walls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add extra paintable walls within a room (shower walls, partitions, nooks) that add to wall SF and baseboard LF.

**Architecture:** An `extra_walls` array on each room stores wall entries with length, height, and a both-sides flag. The derive-room engine sums extra wall SF and LF into the existing wall and baseboard derivations. The Structure tab UI provides add/edit/remove controls in the Walls section.

**Tech Stack:** React JSX, plain JS, no TypeScript, custom CSS with CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-24-extra-walls-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/state/initial-state.js` | Modify (line ~102) | Add `extra_walls: []` to `createRoom()` |
| `src/state/migrations.js` | Modify (line ~131) | Migration for existing rooms |
| `src/state/reducer.js` | Modify (after line ~182) | ADD/SET/REMOVE_EXTRA_WALL actions |
| `src/engine/derive-room.js` | Modify (lines ~119-144) | Add extraWallSF to wall_field_sf, extraWallLF to baseboard_lf |
| `src/components/room-editor/tabs/StructureTab.jsx` | Modify (after line ~51) | Extra walls UI in Walls section |

---

### Task 1: Add State + Migration + Reducer

**Files:**
- Modify: `tools/paintscope/src/state/initial-state.js` (line ~102)
- Modify: `tools/paintscope/src/state/migrations.js` (line ~131)
- Modify: `tools/paintscope/src/state/reducer.js` (after line ~182)

- [ ] **Step 1: Add `extra_walls` to `createRoom()` in initial-state.js**

In `createRoom()`, add `extra_walls: []` after the `closets: [],` line (~line 105):

```javascript
    // Extra walls — partitions, shower walls, nooks
    extra_walls: [],
```

- [ ] **Step 2: Add migration in migrations.js**

In `migrateInline()`, inside the `parsed.rooms.forEach(r => {` block, after `if (!r.closets) r.closets = [];` (~line 129), add:

```javascript
    if (!r.extra_walls) r.extra_walls = [];
```

- [ ] **Step 3: Add reducer actions in reducer.js**

After the `SET_OPENING` case block (~line 182), add three new cases following the exact same pattern as openings:

```javascript
    // Extra walls — partitions, shower walls, nooks
    case 'ADD_EXTRA_WALL': {
      return mapRoom(payload.roomId, r => {
        return { ...r, extra_walls: [...(r.extra_walls || []), { id: genId('xw'), label: '', length_ft: 0, height_ft: 0, both_sides: false }] };
      });
    }
    case 'REMOVE_EXTRA_WALL': {
      return mapRoom(payload.roomId, r => {
        return { ...r, extra_walls: (r.extra_walls || []).filter(w => w.id !== payload.wallId) };
      });
    }
    case 'SET_EXTRA_WALL': {
      return mapRoom(payload.roomId, r => {
        return { ...r, extra_walls: (r.extra_walls || []).map(w => w.id === payload.wallId ? { ...w, [payload.field]: payload.value } : w) };
      });
    }
```

- [ ] **Step 4: Verify build**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/state/initial-state.js tools/paintscope/src/state/migrations.js tools/paintscope/src/state/reducer.js
git commit -m "feat(paintscope): add extra_walls state, migration, and reducer actions"
```

---

### Task 2: Wire Extra Walls into Geometry Engine

**Files:**
- Modify: `tools/paintscope/src/engine/derive-room.js` (lines ~119-144)

- [ ] **Step 1: Compute extra wall SF and LF**

In `deriveRoom()`, after the feature wall deduction computation (after `fwBaseboardDeduct`, ~line 117) and before the `wall_field_sf` derivation (~line 120), add:

```javascript
  // Extra walls — partitions, shower walls, nooks
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

- [ ] **Step 2: Add extraWallSF to wall_field_sf derivation**

Change line ~121 from:

```javascript
  const wall_field_sf = subs.walls
    ? (subs.walls.sf_override ? parseFloat(subs.walls.sf_manual)||0 : Math.max(0, Math.round(wallNet + gableExtra - featureWallDeduct)))
    : 0;
```

To:

```javascript
  const wall_field_sf = subs.walls
    ? (subs.walls.sf_override ? parseFloat(subs.walls.sf_manual)||0 : Math.max(0, Math.round(wallNet + gableExtra - featureWallDeduct + extraWallSF)))
    : 0;
```

- [ ] **Step 3: Add extraWallLF to baseboard derivation**

Change line ~141 from:

```javascript
  const baseboard_lf_raw = deriveLF('baseboard');
```

To:

```javascript
  const baseboard_lf_raw = deriveLF('baseboard') + (subs.baseboard ? Math.round(extraWallLF) : 0);
```

- [ ] **Step 4: Add extraWallSF and extraWallLF to returned object**

In the return object (~line 165), add after `featureWallDeduct, fwBaseboardDeduct,`:

```javascript
    extraWallSF: Math.round(extraWallSF), extraWallLF: Math.round(extraWallLF),
```

- [ ] **Step 5: Verify build**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/engine/derive-room.js
git commit -m "feat(paintscope): wire extra walls into wall SF and baseboard LF derivation"
```

---

### Task 3: Add Extra Walls UI to Structure Tab

**Files:**
- Modify: `tools/paintscope/src/components/room-editor/tabs/StructureTab.jsx` (after line ~51)

- [ ] **Step 1: Add extra walls UI in the Walls section**

After the Wall SF breakdown line (~line 51, the `<div style={{ fontSize: 10, ...` line), and before the closing `</div>` of the walls panel-section, add:

```jsx
        {/* ── Extra Walls ── */}
        <div style={{ marginTop: 10 }}>
          {(room.extra_walls || []).length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Extra Walls</div>
          )}
          {(room.extra_walls || []).map(w => {
            const wSF = (parseFloat(w.length_ft) || 0) * (parseFloat(w.height_ft) || 0) * (w.both_sides ? 2 : 1);
            return (
              <div key={w.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <input
                  value={w.label}
                  onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'label', value: e.target.value } })}
                  placeholder="Label"
                  style={{ width: 100, fontSize: 12, padding: '3px 6px' }}
                />
                <input
                  type="number" min="0" step="0.5"
                  value={w.length_ft || ''}
                  onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'length_ft', value: parseFloat(e.target.value) || 0 } })}
                  placeholder="Length"
                  style={{ width: 60, fontSize: 12, padding: '3px 6px' }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>×</span>
                <input
                  type="number" min="0" step="0.5"
                  value={w.height_ft || ''}
                  onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'height_ft', value: parseFloat(e.target.value) || 0 } })}
                  placeholder="Height"
                  style={{ width: 60, fontSize: 12, padding: '3px 6px' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={!!w.both_sides}
                    onChange={e => dispatch({ type: 'SET_EXTRA_WALL', payload: { roomId: rid, wallId: w.id, field: 'both_sides', value: e.target.checked } })}
                  />
                  Both sides
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 50 }}>{Math.round(wSF)} SF</span>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_EXTRA_WALL', payload: { roomId: rid, wallId: w.id } })}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                  title="Remove wall"
                >×</button>
              </div>
            );
          })}
          {(derived.extraWallSF > 0) && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              Extra walls: +{derived.extraWallSF} SF wall, +{derived.extraWallLF} LF baseboard
            </div>
          )}
          <button
            className="btn btn-sm"
            onClick={() => dispatch({ type: 'ADD_EXTRA_WALL', payload: { roomId: rid } })}
            style={{ fontSize: 11, marginTop: 4 }}
          >+ Add Wall</button>
        </div>
```

- [ ] **Step 2: Update wall SF breakdown line to show extra walls**

Change the existing breakdown line (~line 50) from:

```jsx
<div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Gross {derived.wallGross} - Deduct {derived.openingDeduction} = Net {derived.wallNet}{derived.gableExtra > 0 ? ` + Gable ${derived.gableExtra}` : ''}</div>
```

To:

```jsx
<div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Gross {derived.wallGross} - Deduct {derived.openingDeduction} = Net {derived.wallNet}{derived.gableExtra > 0 ? ` + Gable ${derived.gableExtra}` : ''}{derived.extraWallSF > 0 ? ` + Extra ${derived.extraWallSF}` : ''}</div>
```

- [ ] **Step 3: Verify build**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Visual verification**

Start dev server, navigate to a room's Structure tab. Verify:
- "+ Add Wall" button appears in the Walls section
- Clicking it adds an extra wall row with label, length, height, both-sides, SF readout, and delete
- Entering length=5, height=4 shows 20 SF
- Checking "Both sides" shows 40 SF
- Wall SF total includes the extra wall SF
- Breakdown line shows "+ Extra 20" (or 40)
- Deleting the wall removes it and updates totals
- Adding multiple walls accumulates correctly

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/components/room-editor/tabs/StructureTab.jsx
git commit -m "feat(paintscope): add extra walls UI to Structure tab Walls section"
```

---

## Summary

| Task | Description | Files Modified |
|------|------------|---------------|
| 1 | State + migration + reducer | initial-state.js, migrations.js, reducer.js |
| 2 | Geometry engine wiring | derive-room.js |
| 3 | Structure tab UI | StructureTab.jsx |

Tasks 1 and 2 are independent. Task 3 depends on both.

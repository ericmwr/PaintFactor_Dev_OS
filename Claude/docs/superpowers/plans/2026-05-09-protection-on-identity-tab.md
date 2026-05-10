# Move Protection Configuration to Identity Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Co-locate fixture protection configuration with fixture selection on the Identity tab so the estimator's first on-site assessment (what's present + how to protect it) happens in one place. The Protection tab becomes a review/override surface for advanced cases (feature-wall multi-item, wall/ceiling overrides, special treatments, heuristic overrides).

**Architecture:** Zero data model changes. All protection state already exists in `room.protection.*_mask_level` and `room.fixtures[id].{protection, count, width_ft, height_ft, linear_ft, layout}`. Identity tab gains inline editors that write to those same fields. The "inheritance + override" semantic the user asked for is implicit: both tabs read and write the same field, last-write-wins. Floor protection level moves to Identity (front and center). Walls and ceiling override rows stay on Protection (rare scenarios). Per-fixture detail panels stay on Protection for the cases inline can't cover (feature-wall multi-item, notes).

**Tech Stack:** React 19 (function components, hooks), `useReducer` for state, plain CSS with custom properties. No tests are required — PaintScope verification is via dev server at `localhost:5173` with the McLeod test project (per project memory). This is pre-production; refactor freely.

---

## File Structure

| File | Role | Action |
|------|------|--------|
| `Claude/tools/paintscope/src/components/room-editor/tabs/IdentityTab.jsx` | Identity tab UI | **Modify** — add floor mask level inline + per-fixture inline rows |
| `Claude/tools/paintscope/src/components/room-editor/FixtureInlineRow.jsx` | New compact per-fixture editor | **Create** — single-row mask level + count/dims for the 5 fixture shapes |
| `Claude/tools/paintscope/src/components/room-editor/tabs/ProtectionTab.jsx` | Protection tab UI | **Modify** — remove floor row (now on Identity), update help text |

Reducer actions (`SET_ROOM_PROTECTION_FIELD`, `SET_FIXTURE`, `TOGGLE_FIXTURE`) already exist and handle all writes — no reducer changes needed.

---

## Fixture shape categorization

`FixtureInlineRow` switches on the fixture id to render the right inputs. Engine consumption (from `quantity-lookups.js`) determines what the inline row needs:

| Shape | Fixtures | Inline inputs |
|-------|----------|----------------|
| `count_only` | toilet, bathtub, appliances, light_fixtures, ceiling_fan, hardware_covers, mantel, backsplash, generic | count + protection |
| `count_wh` | shower, fireplace, stone_fireplace, builtin_shelving | count + width_ft + height_ft + protection |
| `count_w` | vanity | count + width_ft + protection |
| `lf_layout` | cabinets | linear_ft + layout (lower_only / lower_upper) + protection |
| `lf` | countertops | linear_ft + protection |
| `defer` | feature_wall | protection only + "Configure on Protection tab →" link |

---

### Task 1: Create `FixtureInlineRow` component

**Files:**
- Create: `Claude/tools/paintscope/src/components/room-editor/FixtureInlineRow.jsx`

- [ ] **Step 1: Create the component file with shape switch**

```jsx
import { FIXTURE_MAP } from '../../data/fixture-catalog';
import { getFixtureLevels, getFixtureDefault } from '../../data/mask-levels';

// Engine-driven shape per fixture id. Determines which inputs render inline.
const FIXTURE_SHAPE = {
  toilet: 'count_only',
  bathtub: 'count_only',
  appliances: 'count_only',
  light_fixtures: 'count_only',
  ceiling_fan: 'count_only',
  hardware_covers: 'count_only',
  mantel: 'count_only',
  backsplash: 'count_only',
  generic: 'count_only',
  shower: 'count_wh',
  fireplace: 'count_wh',
  stone_fireplace: 'count_wh',
  builtin_shelving: 'count_wh',
  vanity: 'count_w',
  cabinets: 'lf_layout',
  countertops: 'lf',
  feature_wall: 'defer',
};

export default function FixtureInlineRow({ fixtureId, cfg, setFix, onJumpToProtection }) {
  const cat = FIXTURE_MAP[fixtureId];
  if (!cat) return null;
  const shape = FIXTURE_SHAPE[fixtureId] || 'count_only';
  const levels = getFixtureLevels(fixtureId);
  const protectionValue = cfg.protection || cat.defaultProtection || getFixtureDefault(fixtureId);

  const numInput = (field, placeholder, step = 0.5, min = 0, max) => (
    <input
      type="number" min={min} {...(max != null ? { max } : {})} step={step}
      value={cfg[field] ?? ''}
      onChange={e => setFix(fixtureId, field, parseFloat(e.target.value) || 0)}
      placeholder={placeholder}
      style={{ width: '100%', fontSize: 12 }}
    />
  );

  const intInput = (field, placeholder, max = 20) => (
    <input
      type="number" min="1" max={max} step="1"
      value={cfg[field] ?? ''}
      onChange={e => setFix(fixtureId, field, parseInt(e.target.value) || 1)}
      placeholder={placeholder}
      style={{ width: '100%', fontSize: 12 }}
    />
  );

  const protectSelect = (
    <select
      value={protectionValue}
      onChange={e => setFix(fixtureId, 'protection', e.target.value)}
      style={{ width: '100%', fontSize: 12 }}
    >
      {levels.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );

  // Grid columns differ by shape so each input gets enough room.
  let inputs;
  let cols;
  if (shape === 'count_only') {
    cols = '60px 1fr';
    inputs = <>{intInput('count', '1')}{protectSelect}</>;
  } else if (shape === 'count_wh') {
    cols = '50px 70px 70px 1fr';
    inputs = <>{intInput('count', '1')}{numInput('width_ft', 'W')}{numInput('height_ft', 'H')}{protectSelect}</>;
  } else if (shape === 'count_w') {
    cols = '50px 70px 1fr';
    inputs = <>{intInput('count', '1')}{numInput('width_ft', 'W')}{protectSelect}</>;
  } else if (shape === 'lf_layout') {
    cols = '90px 130px 1fr';
    inputs = <>
      {numInput('linear_ft', 'LF')}
      <select value={cfg.layout || 'lower_upper'} onChange={e => setFix(fixtureId, 'layout', e.target.value)} style={{ fontSize: 12 }}>
        <option value="lower_only">Lower Only</option>
        <option value="lower_upper">Lower + Upper</option>
      </select>
      {protectSelect}
    </>;
  } else if (shape === 'lf') {
    cols = '90px 1fr';
    inputs = <>{numInput('linear_ft', 'LF')}{protectSelect}</>;
  } else if (shape === 'defer') {
    cols = '1fr 140px';
    inputs = <>
      {protectSelect}
      <button type="button"
        onClick={() => onJumpToProtection?.(fixtureId)}
        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--accent)', fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>
        Configure walls →
      </button>
    </>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `140px ${cols}`, gap: 6, alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed var(--border-subtle, var(--border))' }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{cat.label}</span>
      {inputs}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test the import**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: build succeeds (component is unused but imports resolve)

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/room-editor/FixtureInlineRow.jsx
git commit -m "feat(paintscope): FixtureInlineRow compact per-fixture editor"
```

---

### Task 2: Add inline floor mask level on Identity tab

**Files:**
- Modify: `Claude/tools/paintscope/src/components/room-editor/tabs/IdentityTab.jsx`

- [ ] **Step 1: Add mask-levels import**

At the top of `IdentityTab.jsx`, alongside the existing imports, add:

```jsx
import { MASK_LEVELS_FLOOR, MASK_LEVEL_SHORT } from '../../../data/mask-levels';
import { deriveProtectionDefaults } from '../../../engine/derive-protection-defaults.js';
```

- [ ] **Step 2: Compute auto-derived floor mask level**

Inside the `IdentityTab` function body, just below `const setScopePreset = ...`, add:

```jsx
const derivedDefaults = useMemo(
  () => deriveProtectionDefaults(room, project),
  [room, project]
);
const floorAutoLevel = derivedDefaults.floor_mask_level;
const floorOverride = room.protection?.floor_mask_level || '';
const setProtField = (field, value) =>
  dispatch({ type: 'SET_ROOM_PROTECTION_FIELD', payload: { roomId: rid, field, value } });
```

Add `useMemo` to the React import at the top:

```jsx
import { useMemo, useState } from 'react';
```

- [ ] **Step 3: Replace the Floor Type block with floor-type + floor-mask side by side**

Find the existing `{/* Floor Type */}` block in the Room Contents section. Replace the whole `<div style={{ marginBottom: 8 }}>...</div>` with:

```jsx
{/* Floor Type + Mask Level */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start', marginBottom: 8 }}>
  <div>
    <div className="field-label">Floor Type</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {FLOOR_TYPES.map(ft => (
        <label key={ft.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
          <input type="radio" name={`floor-type-${rid}`} value={ft.id}
            checked={room.floor_type === ft.id}
            onChange={() => setRoom('floor_type', ft.id)} />
          <span style={{ color: room.floor_type === ft.id ? 'var(--text-primary)' : 'var(--text-muted)' }}>{ft.label}</span>
        </label>
      ))}
    </div>
  </div>
  <div>
    <div className="field-label">Floor Protection</div>
    <select
      value={floorOverride}
      onChange={e => setProtField('floor_mask_level', e.target.value || null)}
      style={{ width: '100%', fontSize: 12 }}
    >
      <option value="">Auto: {MASK_LEVEL_SHORT[floorAutoLevel] || floorAutoLevel}</option>
      {MASK_LEVELS_FLOOR.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
      Walls + ceiling overrides on Protection tab.
    </div>
  </div>
</div>
```

- [ ] **Step 4: Verify in browser**

Start dev server (or rely on HMR if already running):
```bash
cd "Claude/tools/paintscope" && npm run dev
```

Open `localhost:5173`, load McLeod project, open any room. Check:
- Floor Type radio still works
- Floor Protection select renders with "Auto: ..." default + 9 mask level options
- Selecting a value writes to `room.protection.floor_mask_level`
- Selecting "Auto: ..." (the empty option) clears the override

Cross-check: open Protection tab, verify the Floor row shows the same "Override" badge and value.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/room-editor/tabs/IdentityTab.jsx
git commit -m "feat(paintscope): floor protection level inline on Identity tab"
```

---

### Task 3: Render per-fixture inline rows on Identity tab

**Files:**
- Modify: `Claude/tools/paintscope/src/components/room-editor/tabs/IdentityTab.jsx`

- [ ] **Step 1: Import the inline row component**

At the top of `IdentityTab.jsx`, add:

```jsx
import FixtureInlineRow from '../FixtureInlineRow';
```

- [ ] **Step 2: Wire a `setFix` helper and an `onJumpToProtection` handler**

Inside the function body, near `setRoom`, add:

```jsx
const setFix = (fId, field, value) =>
  dispatch({ type: 'SET_FIXTURE', payload: { roomId: rid, fixtureId: fId, field, value } });

const onJumpToProtection = (fixtureId) => {
  // RoomEditor owns the active tab; dispatch a tab change event the parent listens to.
  dispatch({ type: 'SET_ACTIVE_TAB', payload: { roomId: rid, tab: 'protection', focusedFixture: fixtureId } });
};
```

NOTE: `SET_ACTIVE_TAB` is exploratory — if the reducer doesn't have it, fall back to a `console.info` for now and revisit in a follow-up. The "Configure walls →" affordance only appears for `feature_wall` and is rare enough that broken nav for one click is acceptable in this iteration.

- [ ] **Step 3: Render inline rows below each fixture group**

Find the section that renders `suggestedFixtures` (and similarly `otherFixtures`) — both have a `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px' }}>` block. We keep those grids for the checkbox UI. Below each grid, add a separate "checked fixtures detail" stack. The cleanest pattern is one shared "inline rows" stack at the bottom of Room Contents, AFTER both Suggested and Other groups. Add this just before the closing `</div>` of the Room Contents `panel-section` (right before line ~178):

```jsx
{/* Inline configuration for checked fixtures */}
{(() => {
  const checkedIds = Object.keys(room.fixtures || {}).filter(id => !!room.fixtures[id]);
  if (checkedIds.length === 0) return null;
  return (
    <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        Configure Selected
      </div>
      <div>
        {checkedIds.map(fId => (
          <FixtureInlineRow
            key={fId}
            fixtureId={fId}
            cfg={room.fixtures[fId] || {}}
            setFix={setFix}
            onJumpToProtection={onJumpToProtection}
          />
        ))}
      </div>
    </div>
  );
})()}
```

- [ ] **Step 4: Remove the now-stale hint at the bottom of Room Contents**

Find and delete this line (it's just after the fixture grids):

```jsx
<div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
  Per-fixture configuration (dimensions, protection level) lives on the Protection tab.
</div>
```

- [ ] **Step 5: Verify in browser**

Reload `localhost:5173`. Open McLeod project → any bathroom-type room.
- Toggle Toilet on → an inline row appears with `count` input + protection level select
- Toggle Shower on → row shows count + width + height + protection
- Toggle Cabinets on (kitchen room) → row shows linear_ft + layout + protection
- Toggle Feature Wall on → row shows protection select + "Configure walls →" button
- Each value change should round-trip: open Protection tab and confirm the same fixture shows the same values

- [ ] **Step 6: Commit**

```bash
git add Claude/tools/paintscope/src/components/room-editor/tabs/IdentityTab.jsx
git commit -m "feat(paintscope): per-fixture inline rows on Identity tab"
```

---

### Task 4: Convert Protection tab Floor row to read-only readout

**Files:**
- Modify: `Claude/tools/paintscope/src/components/room-editor/tabs/ProtectionTab.jsx`

- [ ] **Step 1: Replace the Floor `MaskRow` with a readout block**

In `ProtectionTab.jsx`, find the Mask Levels section. The first `<MaskRow surface="floor" ... />` becomes a compact readonly summary:

```jsx
{/* Floor — readout (set on Identity tab) */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 110px', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
  <div>
    <div style={{ fontWeight: 600, fontSize: 13 }}>Floor</div>
    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
      {derived.ceilingSF || 0} SF · {derived.perimeter || 0} LF perimeter
    </div>
  </div>
  <div>
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
      IDENTITY
    </span>
  </div>
  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
    Set on Identity tab
  </div>
  <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
    {LEVEL_LABEL_SHORT[protection.floor_mask_level || derivedDefaults.floor_mask_level] || derivedDefaults.floor_mask_level}
  </div>
</div>
```

The Walls and Ceiling `MaskRow` calls remain unchanged.

- [ ] **Step 2: Update help text at the top of the Protection tab**

Replace the existing description block (currently `Mask levels auto-derive from painting scope + method + floor type. Override per surface to deviate from the rule.`) with:

```jsx
<div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
  Floor protection + per-fixture levels are set on the Identity tab. Override walls/ceiling here for the rare scenarios that need them, plus advanced fixture detail (multi-item feature walls, notes).
</div>
```

- [ ] **Step 3: Verify in browser**

Reload `localhost:5173`. Open any room → Protection tab:
- Floor row now shows "IDENTITY" badge instead of AUTO/OVERRIDE selector
- Floor effective level matches what's set on Identity
- Walls + Ceiling rows still have AUTO/OVERRIDE behavior
- Adjacent Items master/detail still works for advanced config

Round-trip: change cabinet linear_ft on Identity → switch to Protection tab → cabinets detail panel reflects the new value.

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/room-editor/tabs/ProtectionTab.jsx
git commit -m "refactor(paintscope): floor mask level moved to Identity, Protection shows readout"
```

---

### Task 5: End-to-end estimate verification

- [ ] **Step 1: Run a McLeod estimate baseline before workflow change**

If there's an estimate snapshot from the current main branch (check `Claude/estimate_*.json` files), compare. Otherwise run an estimate via the UI on `claude/cranky-saha` HEAD and capture the protection-task hours total.

- [ ] **Step 2: Set protection levels via Identity tab**

For one bathroom + one kitchen + one feature room, set fixture mask levels exclusively from Identity (no Protection-tab clicks).

- [ ] **Step 3: Run estimate and compare**

The estimate should be functionally identical to setting values on Protection tab. Walk a few representative rooms and confirm:
- Cabinet protection scenarios fire at the level set inline
- Bathroom fixture mask install/remove fires when application_method is spray (verify the recent `anySprayInRoom` fix is still committed)
- Floor protection scenario reflects the Identity-tab mask level

- [ ] **Step 4: Commit any final cleanup**

If verification turned up small bugs, commit fixes. Otherwise note in the commit log: `chore: protection-on-identity verified end-to-end with McLeod project`.

---

## Out of scope (deferred)

These came up while scoping but are explicitly NOT part of this plan:

1. **Brush+roll fixture protection downshift** — the `FIXTURE_PROTECTION_SCENARIOS` matrix in `data/fixture-protection.js` and its consuming engine path are dead code. Whether brush+roll should reduce protection levels (or fire a small time penalty) is a doctrine decision tracked separately; this plan leaves the existing behavior untouched.
2. **Walls/ceiling demoted to adjacent items** — the user mused about folding walls/ceiling into the Adjacent Items list. Current plan leaves them as small override rows on the Protection tab. Revisit if the override rows feel cluttered after the floor row leaves.
3. **`SET_ACTIVE_TAB` reducer action for "Configure walls →" button** — added with a console fallback in Task 3. Polish in a follow-up if the navigation is wanted.
4. **Tape types per fixture** — separate deferred memory item (`project_protection_tape_types.md`); not part of this restructure.
5. **Universal protect mode** — separate deferred memory item (`project_universal_protect_mode.md`).

---

## Self-review notes

- **Spec coverage:** Every part of the user's brief is reflected — floor inline (Task 2), per-fixture inline (Task 3), Protection tab keeps walls/ceiling overrides + advanced fixture config + special treatments + heuristics (untouched), single shared state (no override layer added).
- **Placeholders:** None. Every code block is the actual code to write.
- **Type consistency:** `setFix(fId, field, value)` matches the existing `SET_FIXTURE` reducer signature seen in `ProtectionTab.jsx:30-31`. `setProtField(field, value)` matches `SET_ROOM_PROTECTION_FIELD` from `ProtectionTab.jsx:27-28`. `MASK_LEVELS_FLOOR` + `MASK_LEVEL_SHORT` exports verified in `data/mask-levels.js:34, 28`. Auto-derived field names verified in `engine/derive-protection-defaults.js` via `deriveProtectionDefaults` consumer in `ProtectionTab.jsx:19-22`.

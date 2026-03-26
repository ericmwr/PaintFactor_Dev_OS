# Stairway Components Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two simple stair specialty items with a unified Stairway panel that derives component quantities from riser count and provides per-component independent finish controls.

**Architecture:** Single `stairway` substrate in the catalog with a nested `components` object. A `StairwayDetailPanel` component handles structure inputs, derivation, and per-component finish editing. Derivation logic lives in a pure function. Quantity-lookups emits per-component PS keys.

**Tech Stack:** React 19, plain JSX, CSS custom properties, useReducer state management

**Spec:** `docs/superpowers/specs/2026-03-25-stairway-components-design.md`

---

## File Structure

| File | Role |
|------|------|
| `src/data/substrate-catalog.js` | **Modify** — Replace stair_risers + stair_railing with single stairway entry |
| `src/data/enums.js` | **Modify** — Add stairway-specific enums (layout, baluster type, material) |
| `src/engine/derive-stairway.js` | **Create** — Pure derivation functions: riser count → component quantities |
| `src/components/room-editor/StairwayDetailPanel.jsx` | **Create** — Full panel: structure inputs, derived summary, component list |
| `src/components/room-editor/StairwayComponentRow.jsx` | **Create** — Single component row: quantity + override + expandable finish controls |
| `src/components/room-editor/tabs/SpecialtyTab.jsx` | **Modify** — Route stairway to custom panel |
| `src/engine/quantity-lookups.js` | **Modify** — Emit per-component PS keys from stairway data |
| `src/data/constants.js` | **Modify** — Add PS key labels for stairway components |
| `src/state/migrations.js` | **Modify** — Migrate old stair_risers + stair_railing to new stairway shape |
| `src/data/spec-maps.js` | **Modify** — Update spec-to-substrate mapping for stairway components |
| `src/components/room-editor/RoomEditor.jsx` | **Modify** — Update specialty count to include stairway (replaces stair_risers + stair_railing) |

---

### Task 1: Add stairway enums

**Files:**
- Modify: `src/data/enums.js`

- [ ] **Step 1: Add stairway enum arrays**

Insert before the exterior enums section:

```js
// ── Stairway ──
stairwayRuns: [
  { value: 1, label: '1 Run' },
  { value: 2, label: '2 Runs' },
],
stairwayLayout: [
  { value: 'l_shape', label: 'L-Shape' },
  { value: 'u_shape', label: 'U-Shape' },
],
balusterType: [
  { value: 'square', label: 'Square' },
  { value: 'turned', label: 'Turned' },
  { value: 'ornate', label: 'Ornate' },
  { value: 'iron', label: 'Iron' },
],
balusterMaterial: [
  { value: 'wood', label: 'Wood' },
  { value: 'iron', label: 'Iron / Metal' },
],
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/data/enums.js
git commit -m "feat(paintscope): add stairway enums for layout, baluster type, material"
```

---

### Task 2: Update substrate catalog — replace stair items with stairway

**Files:**
- Modify: `src/data/substrate-catalog.js`

- [ ] **Step 1: Replace stair_risers and stair_railing entries**

Remove:
```js
{ id: 'stair_risers', group: 'Specialty', label: 'Stair Risers', uom: 'EA', ... },
{ id: 'stair_railing', group: 'Specialty', label: 'Stair Railing', uom: 'EA', ... },
```

Replace with:
```js
{
  id: 'stairway', group: 'Specialty', label: 'Stairway', uom: 'EA',
  autoDerive: null, defaultConfig: {
    title: '',
    runs: 1,
    layout: 'l_shape',
    run1_risers: 0,
    run2_risers: 0,
    stair_width: 3.5,
    landing_depth: 0,
    components: {
      risers:      { count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
      treads:      { count: null, count_override: false, enabled: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
      balusters:   { count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false, baluster_type: 'square', material: 'wood' },
      newel_posts: { count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
      open_rail:   { lf: null, lf_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
      wall_rail:   { lf: 0, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
      skirtboard:  { lf: null, lf_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
    }
  }
},
```

- [ ] **Step 2: Update WOOD_SUBSTRATES set**

Replace `'stair_risers', 'stair_railing'` with `'stairway'` in the WOOD_SUBSTRATES set.

- [ ] **Step 3: Update SUBSTRATE_APPLICATION_METHODS**

Remove `stair_risers` and `stair_railing` entries. Add:
```js
stairway: { methods: ['brush', 'spray'], default: 'brush' },
```

- [ ] **Step 4: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 5: Commit**

```bash
git add src/data/substrate-catalog.js
git commit -m "feat(paintscope): replace stair_risers + stair_railing with unified stairway substrate"
```

---

### Task 3: Create stairway derivation engine

**Files:**
- Create: `src/engine/derive-stairway.js`

- [ ] **Step 1: Create the derivation module**

```js
// IRC code constants
const RISER_HEIGHT_FT = 0.625;  // 7.5 inches
const TREAD_DEPTH_FT = 0.875;   // 10.5 inches
const BALUSTER_MAX_SPACING_IN = 4;
const TREAD_DEPTH_IN = 10.5;

function deriveRun(risers) {
  if (!risers || risers <= 0) return { total_rise: 0, total_run: 0, rake_length: 0, treads: 0 };
  const total_rise = risers * RISER_HEIGHT_FT;
  const total_run = (risers - 1) * TREAD_DEPTH_FT;
  const rake_length = Math.sqrt(total_rise * total_rise + total_run * total_run);
  const treads = risers - 1;
  return { total_rise, total_run, rake_length, treads };
}

export function deriveStairway(config) {
  if (!config) return null;
  const { runs = 1, layout = 'l_shape', run1_risers = 0, run2_risers = 0, stair_width = 3.5 } = config;

  const r1 = deriveRun(run1_risers);
  const r2 = runs >= 2 ? deriveRun(run2_risers) : { total_rise: 0, total_run: 0, rake_length: 0, treads: 0 };

  const total_risers = run1_risers + (runs >= 2 ? run2_risers : 0);
  const total_treads = r1.treads + r2.treads;
  const total_rake_lf = Math.round((r1.rake_length + r2.rake_length) * 10) / 10;
  const total_rise = Math.round((r1.total_rise + r2.total_rise) * 10) / 10;
  const total_run = Math.round((r1.total_run + r2.total_run) * 10) / 10;

  // Balusters: ceil(tread_depth_in / max_spacing) per tread
  const balusters_per_tread = Math.ceil(TREAD_DEPTH_IN / BALUSTER_MAX_SPACING_IN);
  const total_balusters = total_treads * balusters_per_tread;

  // Newel posts
  let newel_posts = 0;
  if (runs === 1 && run1_risers > 0) newel_posts = 2;
  else if (runs >= 2) {
    newel_posts = 3; // bottom, landing, top
    if (layout === 'u_shape') newel_posts = 4; // two landing corners
  }

  // Skirtboard: rake length × 2 (both sides)
  const skirtboard_lf = Math.round(total_rake_lf * 2 * 10) / 10;

  return {
    total_risers,
    total_treads,
    total_rise,
    total_run,
    total_rake_lf,
    total_balusters,
    newel_posts,
    skirtboard_lf,
    // Per-run detail for display
    run1: r1,
    run2: r2,
  };
}

/**
 * Get the effective quantity for a component, respecting overrides.
 * If override is set, use the stored value. Otherwise use derived.
 */
export function getComponentQuantity(component, derivedValue) {
  if (!component) return 0;
  const overrideKey = component.count_override !== undefined ? 'count_override' : 'lf_override';
  const valueKey = component.count !== undefined ? 'count' : 'lf';
  if (component[overrideKey] && component[valueKey] != null) return component[valueKey];
  return derivedValue || 0;
}
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/engine/derive-stairway.js
git commit -m "feat(paintscope): add stairway derivation engine from riser count + IRC code"
```

---

### Task 4: Create StairwayComponentRow

**Files:**
- Create: `src/components/room-editor/StairwayComponentRow.jsx`

A single expandable row that shows a component's quantity (derived or overridden) and expands to show finish controls.

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react';
import Select from '../shared/Select';
import SubstrateStateSelect from './SubstrateStateSelect';
import { ENUMS } from '../../data/enums';

export default function StairwayComponentRow({ label, uom, derivedValue, component, onUpdate, extraFields }) {
  const [expanded, setExpanded] = useState(false);
  if (!component) return null;

  const isCount = component.count !== undefined;
  const overrideKey = isCount ? 'count_override' : 'lf_override';
  const valueKey = isCount ? 'count' : 'lf';
  const isOverride = !!component[overrideKey];
  const displayValue = isOverride ? component[valueKey] : derivedValue;

  const set = (field, value) => onUpdate({ ...component, [field]: value });

  const isBareWood = component.substrate_state === 'bare_wood';
  const coatingType = component.coating_type || 'paint';

  return (
    <div style={{ background: 'var(--bg-card, #111a28)', borderRadius: 6, marginBottom: 4, borderLeft: expanded ? '2px solid var(--accent)' : '2px solid transparent' }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <span style={{ color: expanded ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12, flex: 1 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOverride ? (
            <>
              <input type="number" value={component[valueKey] || ''} min="0"
                onClick={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); set(valueKey, parseFloat(e.target.value) || 0); }}
                style={{ width: 50, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border)', color: 'var(--accent)', borderRadius: 3, padding: '2px' }} />
              <span className="badge badge-manual" style={{ fontSize: 9 }}>manual</span>
              <span onClick={e => { e.stopPropagation(); set(overrideKey, false); set(valueKey, null); }}
                style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>reset</span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{Math.round(displayValue * 10) / 10}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{uom}</span>
              <span className="badge badge-auto" style={{ fontSize: 9 }}>auto</span>
              <span onClick={e => { e.stopPropagation(); set(overrideKey, true); set(valueKey, Math.round(displayValue)); }}
                style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>override</span>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 10px 8px' }}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="field-label">Substrate State</div>
              <SubstrateStateSelect substrateId="stairway" value={component.substrate_state} onChange={v => set('substrate_state', v)} />
            </div>
            <div>
              <div className="field-label">Quality Tier</div>
              <Select options={ENUMS.qualityTiers} value={component.quality_tier || null} onChange={v => set('quality_tier', v || null)} placeholder="Project Default" />
            </div>
            <div>
              <div className="field-label">Application Method</div>
              <Select options={ENUMS.applicationMethods.filter(m => ['brush', 'spray'].includes(m.value))} value={component.application_method} onChange={v => set('application_method', v || null)} placeholder="Default (brush)" />
            </div>
            {isBareWood && (
              <div>
                <div className="field-label">Coating Type</div>
                <Select options={ENUMS.intCoatingTypes} value={coatingType} onChange={v => set('coating_type', v)} />
              </div>
            )}
          </div>
          {isBareWood && coatingType === 'paint' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', marginTop: 4 }}>
              <input type="checkbox" checked={!!component.grain_fill} onChange={e => set('grain_fill', e.target.checked)} />
              <span style={{ fontSize: 11 }}>Fill open grain before painting</span>
            </div>
          )}
          {extraFields}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/components/room-editor/StairwayComponentRow.jsx
git commit -m "feat(paintscope): add StairwayComponentRow with override and expandable finish controls"
```

---

### Task 5: Create StairwayDetailPanel

**Files:**
- Create: `src/components/room-editor/StairwayDetailPanel.jsx`

The main panel component with structure inputs, derived summary, and component list.

- [ ] **Step 1: Create the component**

Read these reference files first to understand patterns:
- `src/components/room-editor/BuiltinsDetailPanel.jsx` — panel structure pattern
- `src/components/room-editor/StairwayComponentRow.jsx` — component row (Task 4)
- `src/engine/derive-stairway.js` — derivation functions (Task 3)
- `src/data/enums.js` — stairway enums (Task 1)

The panel should:
1. Title field at top
2. Structure section: runs dropdown, risers per run, stair width, layout (if 2 runs), landing depth (if 2 runs)
3. Derived summary: total rise, total run, rake length (read-only, monospace)
4. Component list: one `StairwayComponentRow` per component with derived quantities from `deriveStairway()`
5. Balusters row gets extra fields: baluster_type dropdown, material dropdown
6. Treads row gets an enabled checkbox

The `setSub` dispatch pattern must handle nested `components` — use a helper:
```js
const setComp = (compKey, updated) => {
  const newComponents = { ...config.components, [compKey]: updated };
  setSub('components', newComponents);
};
```

Where `setSub` dispatches `SET_SUBSTRATE` with `field: 'components'` and `value: newComponents`.

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/components/room-editor/StairwayDetailPanel.jsx
git commit -m "feat(paintscope): add StairwayDetailPanel with structure inputs and component list"
```

---

### Task 6: Route stairway to custom panel in SpecialtyTab

**Files:**
- Modify: `src/components/room-editor/tabs/SpecialtyTab.jsx`
- Modify: `src/components/room-editor/RoomEditor.jsx`

- [ ] **Step 1: Add StairwayDetailPanel import and routing**

In `SpecialtyTab.jsx`, add import:
```jsx
import StairwayDetailPanel from '../StairwayDetailPanel';
```

Add to the conditional rendering chain (after builtins and closet_shelving):
```jsx
) : focusedSubstrate === 'stairway' ? (
  <StairwayDetailPanel room={room} dispatch={dispatch} project={project} />
```

- [ ] **Step 2: Update RoomEditor specialty count**

In `RoomEditor.jsx`, update the specialty count filter array to replace `'stair_risers', 'stair_railing'` with `'stairway'`.

- [ ] **Step 3: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 4: Commit**

```bash
git add src/components/room-editor/tabs/SpecialtyTab.jsx src/components/room-editor/RoomEditor.jsx
git commit -m "feat(paintscope): route stairway to StairwayDetailPanel in SpecialtyTab"
```

---

### Task 7: Emit per-component PS keys in quantity-lookups

**Files:**
- Modify: `src/engine/quantity-lookups.js`
- Modify: `src/data/constants.js`

- [ ] **Step 1: Add stairway PS key emission**

In `quantity-lookups.js`, remove `stair_risers` and `stair_railing` from the `specKeys` array. After the closet shelving block, add:

```js
// Stairway — emit per-component PS keys from derived or overridden quantities
if (subs.stairway) {
  const sw = subs.stairway;
  const { deriveStairway, getComponentQuantity } = require('../engine/derive-stairway');
  const derived = deriveStairway(sw);
  const comps = sw.components || {};
  if (derived) {
    const riserQty = getComponentQuantity(comps.risers, derived.total_risers);
    if (riserQty > 0) addQ('PS_SURFACE_EA.STAIR_RISER', 'EA', riserQty);
    if (comps.treads?.enabled) {
      const treadQty = getComponentQuantity(comps.treads, derived.total_treads);
      if (treadQty > 0) addQ('PS_SURFACE_EA.STAIR_TREAD', 'EA', treadQty);
    }
    const balQty = getComponentQuantity(comps.balusters, derived.total_balusters);
    if (balQty > 0) addQ('PS_SURFACE_EA.STAIR_BALUSTER', 'EA', balQty);
    const newelQty = getComponentQuantity(comps.newel_posts, derived.newel_posts);
    if (newelQty > 0) addQ('PS_SURFACE_EA.STAIR_NEWEL', 'EA', newelQty);
    const railQty = getComponentQuantity(comps.open_rail, derived.total_rake_lf);
    if (railQty > 0) addQ('PS_SURFACE_LF.STAIR_OPEN_RAIL', 'LF', railQty);
    const wallRailQty = comps.wall_rail?.lf || 0;
    if (wallRailQty > 0) addQ('PS_SURFACE_LF.STAIR_WALL_RAIL', 'LF', wallRailQty);
    const skirtQty = getComponentQuantity(comps.skirtboard, derived.skirtboard_lf);
    if (skirtQty > 0) addQ('PS_SURFACE_LF.STAIR_SKIRTBOARD', 'LF', skirtQty);
  }
}
```

Note: Use dynamic import or top-level import. Since quantity-lookups.js already imports from other engine files, use a top-level import:
```js
import { deriveStairway, getComponentQuantity } from './derive-stairway';
```

- [ ] **Step 2: Add PS key labels to constants.js**

Add to the QUANTITY_KEY_LABELS object:
```js
'PS_SURFACE_EA.STAIR_RISER': 'Stair Risers',
'PS_SURFACE_EA.STAIR_TREAD': 'Stair Treads',
'PS_SURFACE_EA.STAIR_BALUSTER': 'Balusters',
'PS_SURFACE_EA.STAIR_NEWEL': 'Newel Posts',
'PS_SURFACE_LF.STAIR_OPEN_RAIL': 'Open Handrail',
'PS_SURFACE_LF.STAIR_WALL_RAIL': 'Wall Rail',
'PS_SURFACE_LF.STAIR_SKIRTBOARD': 'Skirtboard',
```

- [ ] **Step 3: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 4: Commit**

```bash
git add src/engine/quantity-lookups.js src/data/constants.js
git commit -m "feat(paintscope): emit per-component stairway PS keys from derived quantities"
```

---

### Task 8: Migration and spec-maps cleanup

**Files:**
- Modify: `src/state/migrations.js`
- Modify: `src/data/spec-maps.js`
- Modify: `src/state/color-state.js`
- Modify: `src/data/fixture-protection.js`
- Modify: `src/engine/export-project.js`

- [ ] **Step 1: Add migration in migrateInline**

After the closet shelving migration block, add:

```js
// v1.3: migrate stair_risers + stair_railing to unified stairway
for (const room of parsed.rooms || []) {
  const subs = room.substrates || {};
  if ((subs.stair_risers || subs.stair_railing) && !subs.stairway) {
    const riserCount = subs.stair_risers?.ea_manual || 0;
    const railCount = subs.stair_railing?.ea_manual || 0;
    const riserState = subs.stair_risers?.substrate_state || 'bare_wood';
    const railState = subs.stair_railing?.substrate_state || 'bare_wood';
    const riserCoating = subs.stair_risers?.coating_type || 'paint';
    const railCoating = subs.stair_railing?.coating_type || 'paint';

    subs.stairway = JSON.parse(JSON.stringify(
      SUBSTRATE_MAP.stairway?.defaultConfig || {}
    ));
    subs.stairway.components.risers.count = riserCount;
    subs.stairway.components.risers.count_override = riserCount > 0;
    subs.stairway.components.risers.substrate_state = riserState;
    subs.stairway.components.risers.coating_type = riserCoating;
    subs.stairway.components.balusters.count = railCount;
    subs.stairway.components.balusters.count_override = railCount > 0;
    subs.stairway.components.balusters.substrate_state = railState;
    subs.stairway.components.balusters.coating_type = railCoating;

    delete subs.stair_risers;
    delete subs.stair_railing;
  }
}
```

Note: Import `SUBSTRATE_MAP` at the top of migrations.js if not already imported.

- [ ] **Step 2: Update spec-maps.js**

Replace stair_risers and stair_railing mappings:
```js
// Change: 'SF_STAIR_RISER_NC': 'stair_risers' → 'SF_STAIR_RISER_NC': 'stairway'
// Change: 'SF_STAIR_RAILING_NC': 'stair_railing' → 'SF_STAIR_RAILING_NC': 'stairway'
// And the reverse mappings
```

- [ ] **Step 3: Update color-state.js**

Replace `stair_risers: 'specialty'` and `stair_railing: 'specialty'` with `stairway: 'specialty'`.

- [ ] **Step 4: Update fixture-protection.js**

Replace stair spec mappings to use `'stairway'` substrate.

- [ ] **Step 5: Update export-project.js**

Replace stair_risers and stair_railing export entries with stairway component exports.

- [ ] **Step 6: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 7: Verify in browser**

1. Open localhost:5177, navigate to a room's Specialty tab
2. Check "Stairway" checkbox
3. Enter Run 1 Risers: 14, Width: 3.5
4. Verify derived summary shows: total rise 8.75 ft, total run 11.375 ft, rake 14.4 ft
5. Verify component list shows: 14 risers, 13 treads, 39 balusters, 2 newels, 14.4 LF rail, 28.8 LF skirt
6. Expand a component — verify finish controls render
7. Override a quantity — verify manual mode works
8. Navigate to Estimate — verify stair specs activate
9. Change to 2 runs — verify layout dropdown appears and quantities update

- [ ] **Step 8: Commit**

```bash
git add src/state/migrations.js src/data/spec-maps.js src/state/color-state.js src/data/fixture-protection.js src/engine/export-project.js
git commit -m "feat(paintscope): migrate stair items to stairway, update spec-maps and exports"
```

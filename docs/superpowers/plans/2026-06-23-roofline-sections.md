# Roofline Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "roofline section" sub-element to exterior elevations that captures one-sided sloped siding (siding SF, rake fascia LF, rake soffit SF) and is priced under its own height-range-derived access band, not the wall's.

**Architecture:** New `createRooflineSection` factory + `roofline_sections: []` on each elevation; a `deriveRooflineSection` geometry function exposed (separately, not folded into the elevation aggregate); per-section quantity buckets in `quantity-lookups-exterior.js`; and a "virtual elevation" expansion in `context-adapter.js` so each section gets its own `buildExteriorCtx` with `access_type` = the band of its high point. UI mirrors the existing bump-out/dormer/gable cards.

**Tech Stack:** React + a hand-rolled reducer (`src/state/reducer.js`); Vitest for unit tests; Vite dev server (`localhost:5173`) for manual verification.

## Global Constraints

- Units uppercase: `SF`, `LF` (never `sf`/`lf`).
- Access bands reuse the existing enum: ground 0–8, ladder 8–16, scaffold 16–25, lift 25+ (`deriveAccessBand`).
- PaintScope is pre-production: **no migrations, no back-compat aliases** — factory defaults suffice.
- Access modifier values live in `EXT_ACCESS_MODIFIERS` (`run-estimate-scenario.js`): ground 1.00, ladder 1.35, scaffold 1.60, lift 1.50. Do not duplicate them; reuse via `ctx.access_type`.
- ID prefix for sections: `genId('rls')`.
- Verify with the McLeod test project at `localhost:5173`.

---

### Task 1: State factory, elevation array, and reducer actions

**Files:**
- Modify: `src/state/exterior-state.js` (add `createRooflineSection`; add array to `createElevation`)
- Modify: `src/state/reducer.js` (add `ADD/SET/REMOVE_ROOFLINE_SECTION`; re-id on duplicate)
- Test: `src/state/__tests__/roofline-section-state.test.js` (create)

**Interfaces:**
- Produces: `createRooflineSection(overrides) → section` with fields below; reducer actions `ADD_ROOFLINE_SECTION {elevId}`, `SET_ROOFLINE_SECTION {elevId, sectionId, field, value}`, `REMOVE_ROOFLINE_SECTION {elevId, sectionId}`.

- [ ] **Step 1: Write the failing test**

```js
// src/state/__tests__/roofline-section-state.test.js
import { describe, it, expect } from 'vitest';
import { createRooflineSection, createElevation } from '../exterior-state.js';
import { reducer } from '../reducer.js';

describe('roofline section state', () => {
  it('factory defaults to rake-only trim and zero quantities', () => {
    const s = createRooflineSection();
    expect(s.edges).toEqual({ rake: true, bottom: false, vertical: false });
    expect(s.siding_sf).toBe(0);
    expect(s.difficulty_override).toBeNull();
    expect(s.id).toMatch(/^rls/);
  });

  it('createElevation seeds an empty roofline_sections array', () => {
    expect(createElevation().roofline_sections).toEqual([]);
  });

  it('ADD/SET/REMOVE_ROOFLINE_SECTION mutate the right elevation', () => {
    let st = { exterior: { elevations: [createElevation({ id: 'e1' })] } };
    st = reducer(st, { type: 'ADD_ROOFLINE_SECTION', payload: { elevId: 'e1' } });
    const sid = st.exterior.elevations[0].roofline_sections[0].id;
    st = reducer(st, { type: 'SET_ROOFLINE_SECTION', payload: { elevId: 'e1', sectionId: sid, field: 'siding_sf', value: 120 } });
    expect(st.exterior.elevations[0].roofline_sections[0].siding_sf).toBe(120);
    st = reducer(st, { type: 'REMOVE_ROOFLINE_SECTION', payload: { elevId: 'e1', sectionId: sid } });
    expect(st.exterior.elevations[0].roofline_sections).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "Claude/tools/paintscope" && npx vitest run src/state/__tests__/roofline-section-state.test.js`
Expected: FAIL (`createRooflineSection is not a function`).

- [ ] **Step 3: Add the factory and array**

In `src/state/exterior-state.js`, after `createGable`:

```js
export function createRooflineSection(overrides = {}) {
  return {
    id: genId('rls'),
    label: 'Roofline Section',
    siding_type: null,       // null = inherit from parent elevation
    substrate_state: null,
    // Quantities — direct entry is source of truth
    siding_sf: 0,
    fascia_lf: 0,
    soffit_depth_ft: 1.5,
    soffit_sf: 0,            // explicit override; 0 = derive from fascia_lf × depth
    // Which edges carry roof trim
    edges: { rake: true, bottom: false, vertical: false },
    // Optional calculator inputs (only used to fill quantities above)
    calc: { enabled: false, base_ft: 0, peak_height_ft: 0, lower_roof_pitch: null, rake_pitch: null },
    // Access & difficulty — section-specific
    height_low_ft: 0,
    height_high_ft: 0,
    difficulty_override: null,  // null = 1.0 (band already prices height)
    ...overrides,
  };
}
```

In `createElevation`, add `roofline_sections: [],` next to `gables: [],`.

- [ ] **Step 4: Add reducer cases**

In `src/state/reducer.js`, import `createRooflineSection` and add cases mirroring `ADD_GABLE`/`SET_GABLE`/`REMOVE_GABLE`:

```js
case 'ADD_ROOFLINE_SECTION': {
  return { ...state, exterior: { ...state.exterior,
    elevations: state.exterior.elevations.map(e =>
      e.id === payload.elevId
        ? { ...e, roofline_sections: [...(e.roofline_sections || []), createRooflineSection(payload.overrides || {})] }
        : e) } };
}
case 'REMOVE_ROOFLINE_SECTION': {
  return { ...state, exterior: { ...state.exterior,
    elevations: state.exterior.elevations.map(e =>
      e.id === payload.elevId
        ? { ...e, roofline_sections: (e.roofline_sections || []).filter(s => s.id !== payload.sectionId) }
        : e) } };
}
case 'SET_ROOFLINE_SECTION': {
  return { ...state, exterior: { ...state.exterior,
    elevations: state.exterior.elevations.map(e =>
      e.id === payload.elevId
        ? { ...e, roofline_sections: (e.roofline_sections || []).map(s =>
            s.id === payload.sectionId ? { ...s, [payload.field]: payload.value } : s) }
        : e) } };
}
```

Also, in the duplicate-elevation handler (~line 805), add: `(copy.roofline_sections || []).forEach(s => s.id = genId('rls'));`

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/state/__tests__/roofline-section-state.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/state/exterior-state.js src/state/reducer.js src/state/__tests__/roofline-section-state.test.js
git commit -m "feat(exterior): roofline-section state + reducer actions"
```

---

### Task 2: `deriveRooflineSection` geometry + access/difficulty

**Files:**
- Modify: `src/engine/derive-elevation.js` (add `deriveRooflineSection`; expose `rooflineSections` from `deriveElevation`)
- Test: `src/engine/__tests__/derive-roofline-section.test.js` (create)

**Interfaces:**
- Consumes: `deriveAccessBand` (existing).
- Produces: `deriveRooflineSection(section) → { id, sidingSF, fasciaLF, soffitSF, accessBand, difficultyFactor }`. `deriveElevation` return gains `rooflineSections: [...]` (NOT added to `subSidingSF`/`subTrimLF` — these price separately in Task 4).

- [ ] **Step 1: Write the failing test**

```js
// src/engine/__tests__/derive-roofline-section.test.js
import { describe, it, expect } from 'vitest';
import { deriveRooflineSection } from '../derive-elevation.js';
import { createRooflineSection } from '../../state/exterior-state.js';

describe('deriveRooflineSection', () => {
  it('uses direct entry as source of truth', () => {
    const d = deriveRooflineSection(createRooflineSection({ siding_sf: 140, fascia_lf: 22, soffit_depth_ft: 1.5 }));
    expect(d.sidingSF).toBe(140);
    expect(d.fasciaLF).toBe(22);
    expect(d.soffitSF).toBe(33); // 22 × 1.5
  });

  it('explicit soffit_sf overrides the depth derivation', () => {
    const d = deriveRooflineSection(createRooflineSection({ fascia_lf: 22, soffit_sf: 50 }));
    expect(d.soffitSF).toBe(50);
  });

  it('zeroes fascia + soffit when the rake edge is off', () => {
    const d = deriveRooflineSection(createRooflineSection({ fascia_lf: 22, edges: { rake: false, bottom: false, vertical: false } }));
    expect(d.fasciaLF).toBe(0);
    expect(d.soffitSF).toBe(0);
  });

  it('fills quantities from the calculator when enabled (triangle)', () => {
    // base 20 run, peak 15 rise → area 150, rake hypotenuse 25
    const d = deriveRooflineSection(createRooflineSection({
      calc: { enabled: true, base_ft: 20, peak_height_ft: 15, lower_roof_pitch: null, rake_pitch: null },
      soffit_depth_ft: 1,
    }));
    expect(d.sidingSF).toBe(150);
    expect(d.fasciaLF).toBe(25);
    expect(d.soffitSF).toBe(25);
  });

  it('derives the access band from the HIGH point', () => {
    expect(deriveRooflineSection(createRooflineSection({ height_low_ft: 16, height_high_ft: 32 })).accessBand).toBe('LIFT');
    expect(deriveRooflineSection(createRooflineSection({ height_low_ft: 9, height_high_ft: 15 })).accessBand).toBe('LADDER');
  });

  it('difficulty defaults to 1.0 and honors the override', () => {
    expect(deriveRooflineSection(createRooflineSection()).difficultyFactor).toBe(1.0);
    expect(deriveRooflineSection(createRooflineSection({ difficulty_override: 1.3 })).difficultyFactor).toBe(1.3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/__tests__/derive-roofline-section.test.js`
Expected: FAIL (`deriveRooflineSection is not exported`).

- [ ] **Step 3: Implement `deriveRooflineSection`**

In `src/engine/derive-elevation.js`, after `deriveGable`:

```js
// ── Sub-Element: Roofline Section (one-sided sloped siding) ──
export function deriveRooflineSection(section) {
  const edges = section.edges || { rake: true };

  // Quantities: direct entry wins; calculator fills when enabled.
  let sidingSF = parseFloat(section.siding_sf) || 0;
  let rakeLF = parseFloat(section.fascia_lf) || 0;
  if (section.calc && section.calc.enabled) {
    const base = parseFloat(section.calc.base_ft) || 0;
    const rise = parseFloat(section.calc.peak_height_ft) || 0;
    if (base > 0 && rise > 0) {
      sidingSF = Math.round(0.5 * base * rise);
      rakeLF = Math.round(Math.sqrt(base * base + rise * rise));
    }
  }

  const depth = parseFloat(section.soffit_depth_ft) || 0;
  const fasciaLF = edges.rake ? Math.round(rakeLF) : 0;
  const explicitSoffit = parseFloat(section.soffit_sf) || 0;
  const soffitSF = !edges.rake ? 0
    : (explicitSoffit > 0 ? Math.round(explicitSoffit) : Math.round(rakeLF * depth));

  const accessBand = deriveAccessBand(bandFromHeight(parseFloat(section.height_high_ft) || 0));
  const difficultyFactor = section.difficulty_override != null ? parseFloat(section.difficulty_override) : 1.0;

  return { id: section.id, sidingSF: Math.round(sidingSF), fasciaLF, soffitSF, accessBand, difficultyFactor };
}

// Map a height in feet to the access_type enum used by deriveAccessBand.
function bandFromHeight(ft) {
  if (ft > 25) return 'lift';
  if (ft > 16) return 'scaffold';
  if (ft > 8)  return 'ladder';
  return 'ground';
}
```

In `deriveElevation`, after the `gables` line (~140), add:

```js
const rooflineSections = (elevation.roofline_sections || []).map(deriveRooflineSection);
```

and add `rooflineSections,` to the returned object. **Do not** add these to `subSidingSF`/`subTrimLF`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/__tests__/derive-roofline-section.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/derive-elevation.js src/engine/__tests__/derive-roofline-section.test.js
git commit -m "feat(exterior): deriveRooflineSection geometry + access band"
```

---

### Task 3: Per-section quantity buckets

**Files:**
- Modify: `src/engine/quantity-lookups-exterior.js` (emit per-section quantity maps keyed by section id)
- Test: `src/engine/__tests__/roofline-section-quantities.test.js` (create)

**Interfaces:**
- Consumes: `deriveElevation(...).rooflineSections`.
- Produces: a per-section quantity map under each elevation's lookup entry, shape `{ sectionId, accessBand, difficultyFactor, qty: Map<ps_key,{value}> }`. Exact accessor name (`rooflineSectionQty`) is finalized here by reading the file's existing return shape; the test pins the PS keys.

- [ ] **Step 1: Write the failing test** — pins the three PS keys a section emits.

```js
// src/engine/__tests__/roofline-section-quantities.test.js
import { describe, it, expect } from 'vitest';
import { buildRooflineSectionQuantities } from '../quantity-lookups-exterior.js';
import { deriveRooflineSection } from '../derive-elevation.js';
import { createRooflineSection } from '../../state/exterior-state.js';

describe('roofline section quantities', () => {
  it('emits siding/fascia/soffit PS keys for one section', () => {
    const d = deriveRooflineSection(createRooflineSection({ siding_sf: 140, fascia_lf: 22, soffit_depth_ft: 1.5, height_high_ft: 30 }));
    const out = buildRooflineSectionQuantities([d]);
    expect(out).toHaveLength(1);
    expect(out[0].accessBand).toBe('LIFT');
    expect(out[0].qty.get('PS_EXT_SURFACE_SF.SIDING_FIELD').value).toBe(140);
    expect(out[0].qty.get('PS_EXT_EDGE_LF.FASCIA').value).toBe(22);
    expect(out[0].qty.get('PS_EXT_SURFACE_SF.SOFFIT').value).toBe(33);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/engine/__tests__/roofline-section-quantities.test.js`
Expected: FAIL (`buildRooflineSectionQuantities is not exported`).

- [ ] **Step 3: Implement the builder** — add to `quantity-lookups-exterior.js` (reuse the file's existing soffit PS key; confirm it is `PS_EXT_SURFACE_SF.SOFFIT` from the `totalSoffitSF` emission near line 70 and match it exactly):

```js
export function buildRooflineSectionQuantities(derivedSections) {
  return (derivedSections || []).filter(d => d.sidingSF > 0 || d.fasciaLF > 0 || d.soffitSF > 0).map(d => {
    const qty = new Map();
    if (d.sidingSF > 0) qty.set('PS_EXT_SURFACE_SF.SIDING_FIELD', { value: d.sidingSF });
    if (d.fasciaLF > 0) qty.set('PS_EXT_EDGE_LF.FASCIA', { value: d.fasciaLF });
    if (d.soffitSF > 0) qty.set('PS_EXT_SURFACE_SF.SOFFIT', { value: d.soffitSF });
    return { sectionId: d.id, accessBand: d.accessBand, difficultyFactor: d.difficultyFactor, qty };
  });
}
```

(During execution, confirm the exact soffit PS key string against the existing `totalSoffitSF` `addQ(...)` call and align the test + code to it.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/engine/__tests__/roofline-section-quantities.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/quantity-lookups-exterior.js src/engine/__tests__/roofline-section-quantities.test.js
git commit -m "feat(exterior): per-section quantity buckets for roofline sections"
```

---

### Task 4: Per-section access pricing (virtual-elevation expansion)

**Files:**
- Modify: `src/engine/context-adapter.js` (in the `exterior.elevations.forEach` loop ~788, after the elevation's own specs, expand each roofline section into its own `(spec, virtual-elevation)` ctx using the section's `accessBand` + `difficultyFactor`)
- Test: `src/engine/__tests__/roofline-section-pricing.test.js` (create — assert a section at LIFT carries `access_type:'lift'` while the parent wall stays `ground`)

**Interfaces:**
- Consumes: `buildRooflineSectionQuantities`, `buildExteriorCtx`.
- Produces: additional entries in the exterior scenario-input array, one per section spec, with `ctx.access_type` = section band and a `ctx.section_difficulty` factor.

- [ ] **Step 1: Write the failing test**

```js
// src/engine/__tests__/roofline-section-pricing.test.js
import { describe, it, expect } from 'vitest';
import { buildExteriorScenarioInputs } from '../context-adapter.js';
import { createElevation, createRooflineSection, createExteriorState } from '../../state/exterior-state.js';

describe('roofline section pricing', () => {
  it('prices a section under its own access band, not the wall', () => {
    const elev = createElevation({ id: 'e1', access_type: 'ground', width_ft: 30, height_to_eave_ft: 9,
      siding_sections: [{ id: 's1', siding_type: 'fiber_cement_lap', substrate_state: 'factory_primed' }],
      roofline_sections: [createRooflineSection({ siding_sf: 140, height_high_ft: 30 })] });
    const state = { project: {}, exterior: createExteriorState({ elevations: [elev] }) };
    const inputs = buildExteriorScenarioInputs(state);
    const sectionInput = inputs.find(i => i.ctx.access_type === 'lift');
    expect(sectionInput).toBeTruthy();
    expect(inputs.some(i => i.ctx.access_type === 'ground')).toBe(true); // the wall
  });
});
```

(During execution: confirm the real exported name of the exterior input builder — the loop at ~788 lives in a function in `context-adapter.js`; align the import + assertion to it. If the builder isn't separately exported, export it or add a thin testable wrapper.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/engine/__tests__/roofline-section-pricing.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement the expansion** — inside the `exterior.elevations.forEach((elev, ei) => {...})` loop, after the existing per-spec block, add a nested expansion that maps each `deriveElevation(elev).rooflineSections` bucket into its own ctx:

```js
// Roofline sections price as virtual elevations with their own access band.
const sectionBuckets = buildRooflineSectionQuantities(deriveElevation(elev).rooflineSections);
sectionBuckets.forEach((bucket, si) => {
  const accessType = bucket.accessBand.toLowerCase(); // 'LIFT' → 'lift'
  for (const specId of SECTION_SPEC_IDS) {            // siding + trim/soffit specs only
    const ctx = buildExteriorCtx(specId, { ...elev, access_type: accessType }, extDefaults, siteConditions, null, `${ei}.rls${si}`, projectType, project);
    ctx.section_difficulty = bucket.difficultyFactor;
    pushInput(specId, ctx, bucket.qty, `${elev.label} · roofline ${si + 1}`);
  }
});
```

Define `SECTION_SPEC_IDS` (the siding-field, fascia, and soffit exterior spec ids already routed in `SPEC_TO_PAINTABLE_ITEM`). Reuse the loop's existing input-push mechanism (named `pushInput` here as a placeholder for whatever the loop already does — wire to the real push during execution).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/engine/__tests__/roofline-section-pricing.test.js`
Expected: PASS.

- [ ] **Step 5: Run the whole exterior suite for regressions**

Run: `npx vitest run src/engine`
Expected: PASS (no regressions in existing exterior tests).

- [ ] **Step 6: Commit**

```bash
git add src/engine/context-adapter.js src/engine/__tests__/roofline-section-pricing.test.js
git commit -m "feat(exterior): price roofline sections under their own access band"
```

---

### Task 5: UI card in the sub-elements panel

**Files:**
- Modify: `src/components/exterior-editor/tabs/SubElementsSection.jsx` (add `+ Roofline` button + card)

**Interfaces:**
- Consumes: `derived.rooflineSections` (from `deriveElevation`), the three reducer actions from Task 1.

- [ ] **Step 1: Add the button** to the `btn-group`:

```jsx
<button className="btn btn-sm" onClick={e => { e.stopPropagation(); dispatch({ type: 'ADD_ROOFLINE_SECTION', payload: { elevId: eid } }); setOpen(true); }}>+ Roofline</button>
```

Add `const rooflineSections = elevation.roofline_sections || [];` and include `+ rooflineSections.length` in `total`.

- [ ] **Step 2: Add the card** after the Gables block — direct-entry fields, edge toggles, height range, a collapsible calculator, and a derived readout:

```jsx
{rooflineSections.map((s, i) => {
  const d = derived.rooflineSections?.find(x => x.id === s.id);
  const set = (field, value) => dispatch({ type: 'SET_ROOFLINE_SECTION', payload: { elevId: eid, sectionId: s.id, field, value } });
  return (
    <div key={s.id} className="sub-element-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Roofline Section {i + 1}</span>
        <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_ROOFLINE_SECTION', payload: { elevId: eid, sectionId: s.id } })}>Remove</button>
      </div>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <div><div className="field-label">Siding (SF)</div><input type="number" value={s.siding_sf || ''} onChange={e => set('siding_sf', parseFloat(e.target.value) || 0)} min="0" /></div>
        <div><div className="field-label">Fascia / rake (LF)</div><input type="number" value={s.fascia_lf || ''} onChange={e => set('fascia_lf', parseFloat(e.target.value) || 0)} min="0" /></div>
        <div><div className="field-label">Soffit depth (ft)</div><input type="number" value={s.soffit_depth_ft || ''} onChange={e => set('soffit_depth_ft', parseFloat(e.target.value) || 0)} min="0" step="0.25" /></div>
      </div>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 6 }}>
        <div><div className="field-label">Height low (ft)</div><input type="number" value={s.height_low_ft || ''} onChange={e => set('height_low_ft', parseFloat(e.target.value) || 0)} min="0" /></div>
        <div><div className="field-label">Height high / peak (ft)</div><input type="number" value={s.height_high_ft || ''} onChange={e => set('height_high_ft', parseFloat(e.target.value) || 0)} min="0" /></div>
      </div>
      <div className="form-row" style={{ marginTop: 6, gap: 8 }}>
        <label><input type="checkbox" checked={s.edges?.rake} onChange={e => set('edges', { ...s.edges, rake: e.target.checked })} /> Rake trim</label>
        <label><input type="checkbox" checked={s.edges?.bottom} onChange={e => set('edges', { ...s.edges, bottom: e.target.checked })} /> Bottom</label>
        <label><input type="checkbox" checked={s.edges?.vertical} onChange={e => set('edges', { ...s.edges, vertical: e.target.checked })} /> Vertical</label>
      </div>
      {d && (
        <div style={{ fontSize: 11, color: 'var(--derived)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          Siding: {d.sidingSF} SF | Fascia: {d.fasciaLF} LF | Soffit: {d.soffitSF} SF | Access: {d.accessBand}
        </div>
      )}
    </div>
  );
})}
```

- [ ] **Step 3: Verify in the dev server**

Run the dev server, open the McLeod project, add an elevation, click **+ Roofline**, enter siding 140 / fascia 22 / depth 1.5 / height high 30, and confirm the derived readout shows `Soffit: 33 SF | Access: LIFT`. Capture a screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/components/exterior-editor/tabs/SubElementsSection.jsx
git commit -m "feat(exterior): roofline section UI card"
```

---

### Task 6: Full suite + estimate verification

- [ ] **Step 1:** Run `npx vitest run` — expect all suites green.
- [ ] **Step 2:** In the dev server, confirm the section's SF/LF appear in the estimate and that a high section raises the access modifier relative to a ground wall. Screenshot the estimate.
- [ ] **Step 3:** Commit any test-snapshot updates.

## Self-Review

- **Spec coverage:** geometry (T2), three paintable items + edge toggles (T2/T5), hybrid entry (T2 calc + T5 direct fields), height range → access (T2/T4), difficulty override (T2/T4), placement as elevation sub-element (T1), UI (T5). All covered.
- **Type consistency:** `deriveRooflineSection` returns `{sidingSF,fasciaLF,soffitSF,accessBand,difficultyFactor}` and that exact shape is consumed in T3/T4/T5. `roofline_sections` array name consistent across T1/T2/T4/T5.
- **Known execution-time confirmations (not placeholders, but live checks):** the exact soffit PS key string (T3) and the exterior input-builder's real export name + push mechanism (T4) are verified against the file during execution; both tasks name the exact file/loop and pin behavior with tests.

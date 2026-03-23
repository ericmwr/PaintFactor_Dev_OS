# Material Catalog Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic placeholder materials in PaintScope estimates with real products from the 350-product catalog, resolved by system ID + brand preference + quality tier.

**Architecture:** A product resolver engine maps spec material system IDs → catalog products using a brand-tier mapping table and a 3-level override cascade (project brand → system pin → manual pin). The resolver integrates into the existing material-estimates pipeline, replacing hardcoded coverage profiles with real catalog data. Specs and hours estimation are untouched.

**Tech Stack:** React JSX, plain JS, no TypeScript, custom CSS with CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-23-material-catalog-integration-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/data/product-catalog.js` | Create | 350 products extracted from catalog-viewer.html, system index |
| `src/data/brand-tier-map.js` | Create | ~20 rows mapping brand+product_line → QT range |
| `src/engine/product-resolver.js` | Create | Resolution algorithm: system_id + context → catalog product |
| `src/state/initial-state.js` | Modify (line 145-152) | Add `default_brand`, `material_overrides` to project defaults |
| `src/state/migrations.js` | Modify | Migration for new project fields |
| `src/components/setup/ProjectSetup.jsx` | Modify (line 106-110) | Add brand preference dropdown |
| `src/engine/material-estimates.js` | Modify (lines 57-213) | Use product resolver instead of hardcoded profiles |
| `src/components/estimate/EstimateView.jsx` | Modify (material section ~line 500+) | Show real product names, brands, prices |
| `src/components/materials/MaterialsView.jsx` | Modify | Add "Resolved Products" sub-tab |
| `src/components/materials/ResolvedProductsView.jsx` | Create | Resolved products list with override controls |

---

### Task 1: Extract Product Catalog Data

**Files:**
- Create: `tools/paintscope/src/data/product-catalog.js`

- [ ] **Step 1: Extract the ROWS array from catalog-viewer.html into a JS module**

Read `Research Resources/catalog-viewer.html`, find the `const ROWS = [...]` array, and write it as an ES module export. Parse `system_mappings` from CSV to arrays. Build a `Map<system_id, Product[]>` lookup index.

```javascript
// product-catalog.js structure:
const CATALOG_PRODUCTS = [ /* 350 products */ ];

// Parse system_mappings from CSV to array on each product
CATALOG_PRODUCTS.forEach(p => {
  p.system_ids = p.system_mappings
    ? p.system_mappings.split(',').map(s => s.trim()).filter(Boolean)
    : [];
});

// Build lookup: system_id → products that fulfill that system
const SYSTEM_INDEX = new Map();
CATALOG_PRODUCTS.forEach(p => {
  p.system_ids.forEach(sys => {
    if (!SYSTEM_INDEX.has(sys)) SYSTEM_INDEX.set(sys, []);
    SYSTEM_INDEX.get(sys).push(p);
  });
});

export { CATALOG_PRODUCTS, SYSTEM_INDEX };
```

- [ ] **Step 2: Verify the module loads correctly**

```bash
cd tools/paintscope/src/data && node -e "
import('./product-catalog.js').then(m => {
  console.log('Products:', m.CATALOG_PRODUCTS.length);
  console.log('System index entries:', m.SYSTEM_INDEX.size);
  console.log('SYS_WALL_EGGSHELL products:', m.SYSTEM_INDEX.get('SYS_WALL_EGGSHELL')?.length);
  console.log('SYS_PVA_PRIMER products:', m.SYSTEM_INDEX.get('SYS_PVA_PRIMER')?.length);
});
"
```
Expected: 350 products, 218 system index entries, 8 wall eggshell, 3 PVA primer

- [ ] **Step 3: Build and verify no import errors**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/data/product-catalog.js
git commit -m "feat(paintscope): add product catalog data module (350 products, 218 systems)"
```

---

### Task 2: Create Brand-Tier Mapping Table

**Files:**
- Create: `tools/paintscope/src/data/brand-tier-map.js`

- [ ] **Step 1: Create the brand-tier mapping module**

This maps `brand + product_line` → `qt_range` (array of QT values). Used by the resolver to pick the right product line for a project's quality tier. Primers have no tier mapping (selected by substrate role). QT2 is intentionally empty — resolver falls back to QT3.

```javascript
/**
 * Brand + product line → quality tier mapping.
 * Used by product resolver to match catalog products to project QT.
 * Primers are role-based (not tier-based) and skip this table.
 */
export const BRAND_TIER_MAP = [
  // ── Sherwin-Williams Finish ──
  { brand: 'Sherwin-Williams', product_line: 'ProMar 200',          qt: ['QT3'] },
  { brand: 'Sherwin-Williams', product_line: 'SuperPaint',          qt: ['QT4'] },
  { brand: 'Sherwin-Williams', product_line: 'Cashmere',            qt: ['QT4'] },
  { brand: 'Sherwin-Williams', product_line: 'Emerald',             qt: ['QT5'] },
  { brand: 'Sherwin-Williams', product_line: 'Duration',            qt: ['QT5'] },
  // ── Sherwin-Williams Trim ──
  { brand: 'Sherwin-Williams', product_line: 'ProClassic',          qt: ['QT3'] },
  { brand: 'Sherwin-Williams', product_line: 'ProClassic Alkyd',    qt: ['QT4'] },
  { brand: 'Sherwin-Williams', product_line: 'Emerald Urethane',    qt: ['QT5'] },
  // ── Benjamin Moore Finish ──
  { brand: 'Benjamin Moore',   product_line: 'ben',                 qt: ['QT3'] },
  { brand: 'Benjamin Moore',   product_line: 'Regal Select',        qt: ['QT4'] },
  { brand: 'Benjamin Moore',   product_line: 'Aura',                qt: ['QT5'] },
  // ── Benjamin Moore Trim ──
  { brand: 'Benjamin Moore',   product_line: 'Advance',             qt: ['QT4', 'QT5'] },
  // ── PPG Finish ──
  { brand: 'PPG',              product_line: 'Manor Hall',          qt: ['QT3', 'QT4'] },
  { brand: 'PPG',              product_line: 'Timeless',            qt: ['QT5'] },
  // ── PPG Pittsburgh Paints ──
  { brand: 'PPG Pittsburgh Paints', product_line: 'Ultra',          qt: ['QT3'] },
  // ── Ceiling ──
  { brand: 'Sherwin-Williams', product_line: 'ProMar Ceiling',      qt: ['QT3'] },
  { brand: 'Sherwin-Williams', product_line: 'CHB',                 qt: ['QT3'] },
  { brand: 'Benjamin Moore',   product_line: 'Waterborne Ceiling',  qt: ['QT3', 'QT4'] },
  // ── Gallery / Fine Finish Systems ──
  { brand: 'Sherwin-Williams', product_line: 'Gallery',             qt: ['QT5'] },
  { brand: 'Fine Paints of Europe', product_line: null,             qt: ['QT5'] },
];

/**
 * Find the QT range for a product.
 * Returns the qt array if found, null if no mapping (e.g., primers).
 */
export function getProductTier(brand, product_line) {
  if (!product_line) return null;
  const entry = BRAND_TIER_MAP.find(e =>
    e.brand === brand &&
    (e.product_line === null || product_line.toLowerCase().includes(e.product_line.toLowerCase()))
  );
  return entry ? entry.qt : null;
}
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add tools/paintscope/src/data/brand-tier-map.js
git commit -m "feat(paintscope): add brand-tier mapping table for product resolution"
```

---

### Task 3: Build Product Resolver Engine

**Files:**
- Create: `tools/paintscope/src/engine/product-resolver.js`

- [ ] **Step 1: Create the resolver module**

```javascript
import { SYSTEM_INDEX } from '../data/product-catalog.js';
import { getProductTier } from '../data/brand-tier-map.js';

/**
 * Resolve a material system ID to a specific catalog product.
 *
 * @param {string} systemId - e.g. 'SYS_WALL_EGGSHELL'
 * @param {Object} ctx - { quality_tier, brand_preference, sheen }
 * @param {Object} overrides - { system: {sysId: productId}, manual: {} }
 * @returns {Object|null} resolved product with all catalog fields + resolved_by
 */
export function resolveProduct(systemId, ctx, overrides = {}) {
  // 1. Get all catalog products for this system
  const candidates = SYSTEM_INDEX.get(systemId);
  if (!candidates || candidates.length === 0) return null;

  // 2. Check manual override (Level 3)
  if (overrides.manual && overrides.manual[systemId]) {
    const pinned = candidates.find(p => p.product_id === overrides.manual[systemId]);
    if (pinned) return { ...pinned, resolved_by: 'manual_override' };
  }

  // 3. Check system override (Level 2)
  if (overrides.system && overrides.system[systemId]) {
    const pinned = candidates.find(p => p.product_id === overrides.system[systemId]);
    if (pinned) return { ...pinned, resolved_by: 'system_override' };
  }

  const qt = ctx.quality_tier || 'QT3';
  const brandPref = ctx.brand_preference || null;

  // 4. Score each candidate
  const scored = candidates.map(p => {
    let score = 0;

    // Brand preference match (+10)
    if (brandPref && p.brand === brandPref) score += 10;

    // QT tier match via brand-tier map (+5 exact, +2 adjacent)
    const tierRange = getProductTier(p.brand, p.product_line);
    if (tierRange) {
      if (tierRange.includes(qt)) score += 5;
      else {
        // Adjacent tier fallback: QT5→QT4, QT4→QT3, QT2→QT3
        const adjacent = qt === 'QT5' ? 'QT4' : qt === 'QT2' ? 'QT3' : null;
        if (adjacent && tierRange.includes(adjacent)) score += 2;
      }
    }

    // Has coverage data (+1, penalize null -5)
    if (p.coverage_sf_per_gallon) score += 1;
    else score -= 5;

    // Has price (+1)
    if (p.price_per_gallon) score += 1;

    return { product: p, score };
  });

  // 5. Sort by score descending, pick best
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  const resolved_by = [];
  if (brandPref && best.product.brand === brandPref) resolved_by.push('brand_preference');
  const tierRange = getProductTier(best.product.brand, best.product.product_line);
  if (tierRange && tierRange.includes(qt)) resolved_by.push('tier_match');
  if (resolved_by.length === 0) resolved_by.push('best_available');

  return { ...best.product, resolved_by: resolved_by.join(' + ') };
}

/**
 * Resolve all material systems for a spec, given project context.
 * Returns Map<systemId, resolvedProduct>
 */
export function resolveSpecMaterials(systemIds, ctx, overrides = {}) {
  const results = new Map();
  systemIds.forEach(sysId => {
    const product = resolveProduct(sysId, ctx, overrides);
    if (product) results.set(sysId, product);
  });
  return results;
}
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Smoke test the resolver**

```bash
cd tools/paintscope/src && node -e "
import { resolveProduct } from './engine/product-resolver.js';
// Test: wall eggshell, QT5, SW preference
const r1 = resolveProduct('SYS_WALL_EGGSHELL', { quality_tier: 'QT5', brand_preference: 'Sherwin-Williams' });
console.log('Wall QT5 SW:', r1?.product_name, r1?.coverage_sf_per_gallon, r1?.price_per_gallon, r1?.resolved_by);

// Test: PVA primer (no tier, brand pref)
const r2 = resolveProduct('SYS_PVA_PRIMER', { quality_tier: 'QT3', brand_preference: 'Sherwin-Williams' });
console.log('PVA SW:', r2?.product_name, r2?.coverage_sf_per_gallon, r2?.resolved_by);

// Test: wall eggshell, no brand preference
const r3 = resolveProduct('SYS_WALL_EGGSHELL', { quality_tier: 'QT3' });
console.log('Wall QT3 no pref:', r3?.product_name, r3?.brand, r3?.resolved_by);

// Test: system override
const r4 = resolveProduct('SYS_FF_PREMIUM', { quality_tier: 'QT5' }, { system: { 'SYS_FF_PREMIUM': 'PROD_BM_ADVANCE_SG' } });
console.log('Override:', r4?.product_name, r4?.resolved_by);
"
```
Expected: Each resolves to a real product name with appropriate brand/tier matching.

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/engine/product-resolver.js
git commit -m "feat(paintscope): product resolver engine — system + brand + QT → catalog product"
```

---

### Task 4: Add Project State Fields + Migration

**Files:**
- Modify: `tools/paintscope/src/state/initial-state.js` (line 145-152)
- Modify: `tools/paintscope/src/state/migrations.js`

- [ ] **Step 1: Add default_brand and material_overrides to project defaults**

In `initial-state.js`, find the project object (line 145-152):
```javascript
project: {
  name: '', client_name: '', address: '', status: 'draft',
  new_construction: true,
  default_quality_tier: 'QT3', default_height_band: 'STD',
  default_complexity: 'STD', default_application_method: 'spray_backroll',
  default_texture: 'smooth', notes: '',
  default_substrates: ['ceiling', 'walls', 'baseboard']
},
```

Add after `default_texture: 'smooth',`:
```javascript
  default_brand: null,
  material_overrides: { system: {}, manual: {} },
```

- [ ] **Step 2: Add migration in migrations.js**

Add to `migrateInline()` before the final return:
```javascript
// v1.0: material catalog integration — add brand preference and overrides
if (state.project) {
  if (state.project.default_brand === undefined) state.project.default_brand = null;
  if (!state.project.material_overrides) state.project.material_overrides = { system: {}, manual: {} };
}
```

- [ ] **Step 3: Verify build**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/state/initial-state.js tools/paintscope/src/state/migrations.js
git commit -m "feat(paintscope): add default_brand and material_overrides to project state"
```

---

### Task 5: Add Brand Preference Dropdown to Setup Page

**Files:**
- Modify: `tools/paintscope/src/components/setup/ProjectSetup.jsx` (after line 105)

- [ ] **Step 1: Add brand options constant and dropdown**

Add a `BRAND_OPTIONS` array near the top of the file or inline. The brands come from the catalog (15 brands, but only the major contractor brands need to be in the dropdown).

After the Application Method field (line 103-106), add a new field (before Surface Texture):

```jsx
<div className="setup-field">
  <label>Preferred Brand</label>
  <Select
    options={[
      { value: '', label: 'No Preference' },
      { value: 'Sherwin-Williams', label: 'Sherwin-Williams' },
      { value: 'Benjamin Moore', label: 'Benjamin Moore' },
      { value: 'PPG', label: 'PPG' },
    ]}
    value={project.default_brand || ''}
    onChange={v => set('default_brand', v || null)}
  />
</div>
```

- [ ] **Step 2: Verify build and visually confirm on Setup page**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`
Navigate to Setup page in browser, confirm dropdown appears with 4 options.

- [ ] **Step 3: Commit**

```bash
git add tools/paintscope/src/components/setup/ProjectSetup.jsx
git commit -m "feat(paintscope): add Preferred Brand dropdown to Setup page"
```

---

### Task 6: Integrate Resolver into Material Estimates Engine

**Files:**
- Modify: `tools/paintscope/src/engine/material-estimates.js` (lines 57-213)

This is the core integration. The current `computeMaterialEstimates()` function uses DB `material_coverage_profiles` and `material_systems` to compute gallons. We replace the coverage profile lookup with the product resolver while keeping the system selection logic (applies_when) from the DB.

- [ ] **Step 1: Read the full material-estimates.js to understand current flow**

Read `src/engine/material-estimates.js` in full. Key things to understand:
- Lines 68-77: aggregates quantities across all rooms by PS key
- Lines 80-93: builds system/product indexes from DB
- Lines 97-213: for each spec with coverage profiles, resolves system → profile → gallons
- The `surfaceKeys` filter (from our earlier fix) limits to `PS_SURFACE_*` keys

- [ ] **Step 2: Add resolver import and modify computeMaterialEstimates**

Add import at top:
```javascript
import { resolveProduct } from './product-resolver.js';
```

Replace the main loop body (lines 97-213). The new flow for each spec:
1. Find matching material_systems from DB using `applies_when` logic (keep existing)
2. For each matched system, call `resolveProduct(systemId, ctx, overrides)`
3. Use the resolved product's `coverage_sf_per_gallon` instead of DB coverage profiles
4. Add `price_per_gallon` to the output

The estimate output object gains new fields:
```javascript
estimates.push({
  specFamilyId: specId,
  systemId: matchedSystem.id,
  systemName: matchedSystem.name,
  // New: resolved product info
  productId: resolved.product_id,
  productName: resolved.product_name,
  brand: resolved.brand,
  resolvedBy: resolved.resolved_by,
  pricePerGallon: resolved.price_per_gallon || null,
  // Existing fields
  productRole: matchedProfile?.product_role || 'finish',
  surfaceTexture: defaultTexture,
  totalSF: Math.round(specSF),
  coverageRate: resolved.coverage_sf_per_gallon || matchedProfile?.coverage_sf_per_gallon || 400,
  coats: coats,
  gallons: Math.round(gallons * 10) / 10,
  totalCost: resolved.price_per_gallon ? Math.round(gallons * resolved.price_per_gallon * 100) / 100 : null,
  sprayLoss: isSpray ? SPRAY_LOSS_FACTOR : 0,
  psKey: matchedKey
});
```

Key implementation detail: the resolver needs project context. Pass it from the `state.project` object:
```javascript
const resolverCtx = {
  quality_tier: defaultQT,
  brand_preference: project.default_brand || null,
};
const overrides = project.material_overrides || { system: {}, manual: {} };
```

Then in the per-spec loop, after matching the system:
```javascript
const resolved = resolveProduct(matchedSystem.id, resolverCtx, overrides);

// Determine coverage rate: resolver product → DB coverage profile → hardcoded fallback
let coverageRate = null;
let productInfo = null;

if (resolved && resolved.coverage_sf_per_gallon) {
  // Primary: use resolved catalog product
  coverageRate = resolved.coverage_sf_per_gallon;
  productInfo = {
    productId: resolved.product_id,
    productName: resolved.product_name,
    brand: resolved.brand,
    resolvedBy: resolved.resolved_by,
    pricePerGallon: resolved.price_per_gallon || null,
  };
} else if (matchedProfile && matchedProfile.coverage_sf_per_gallon) {
  // Fallback: use existing DB coverage profile (no catalog product found)
  coverageRate = matchedProfile.coverage_sf_per_gallon;
  productInfo = {
    productId: null,
    productName: matchedSystem ? matchedSystem.name : '(unknown)',
    brand: null,
    resolvedBy: 'db_fallback',
    pricePerGallon: null,
  };
} else {
  return; // No coverage data from either source — skip this spec
}

const rawGallons = (specSF * coats) / coverageRate;
const sprayMultiplier = isSpray ? (1 / (1 - SPRAY_LOSS_FACTOR)) : 1;
const gallons = rawGallons * sprayMultiplier;

estimates.push({
  specFamilyId: specId,
  systemId: matchedSystem ? matchedSystem.id : null,
  systemName: matchedSystem ? matchedSystem.name : '(unknown)',
  ...productInfo,
  productRole: matchedProfile?.product_role || 'finish',
  surfaceTexture: defaultTexture,
  totalSF: Math.round(specSF),
  coverageRate: coverageRate,
  coats: coats,
  gallons: Math.round(gallons * 10) / 10,
  totalCost: productInfo.pricePerGallon
    ? Math.round(gallons * productInfo.pricePerGallon * 100) / 100 : null,
  sprayLoss: isSpray ? SPRAY_LOSS_FACTOR : 0,
  psKey: matchedKey
});
```

This dual-path ensures: catalog products are used when available, DB coverage profiles serve as fallback for specs without catalog coverage (e.g., `SYS_GRAIN_FILLER_WB`), and no silent regressions from the existing behavior.

- [ ] **Step 3: Verify build**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`

- [ ] **Step 4: Test with Borin project in browser**

Import Borin, go to Estimate. Material estimates should now show real product names instead of generic system names. With no brand preference, it picks best available. Set SW as brand preference on Setup, verify materials switch to SW products.

- [ ] **Step 5: Commit**

```bash
git add tools/paintscope/src/engine/material-estimates.js
git commit -m "feat(paintscope): integrate product resolver into material estimates engine"
```

---

### Task 7: Update Estimate View to Show Real Products

**Files:**
- Modify: `tools/paintscope/src/components/estimate/EstimateView.jsx` (material section)

- [ ] **Step 1: Find the material estimates rendering section**

Search for `Material Estimates` heading in EstimateView.jsx. The current rendering shows:
```
systemName (generic)
  productRole description (texture)
    X.X gal (XXX SF × N coat @ XXX SF/gal +5% spray)
```

- [ ] **Step 2: Update to show product name, brand, and price**

Replace the material line items to show:
```
Brand badge | Product Name
  X.X gal (XXX SF × N coats @ XXX SF/gal +5% spray)    $XX.XX
```

Use the new fields from the estimate output: `productName`, `brand`, `pricePerGallon`, `totalCost`.

Add a total material cost line at the bottom:
```
Total Material Cost: $XXX.XX
```

- [ ] **Step 3: Verify build and visual check**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`
Check browser — material section should show real product names and prices.

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/estimate/EstimateView.jsx
git commit -m "feat(paintscope): show real product names, brands, and prices in estimate"
```

---

### Task 8: Add Resolved Products View to Materials Tab

**Files:**
- Create: `tools/paintscope/src/components/materials/ResolvedProductsView.jsx`
- Modify: `tools/paintscope/src/components/materials/MaterialsView.jsx`

- [ ] **Step 1: Create ResolvedProductsView component**

This view shows all active material systems for the current project with their resolved products. It includes per-system override dropdowns and visual indicators for override vs auto-resolved status.

```jsx
// ResolvedProductsView.jsx
import { useMemo } from 'react';
import { useEstimate } from '../../hooks/useEstimate';
import { useProject } from '../../hooks/useProject';
import { SYSTEM_INDEX } from '../../data/product-catalog.js';

export default function ResolvedProductsView() {
  const estimate = useEstimate();
  const { state, dispatch } = useProject();
  const overrides = state.project.material_overrides || { system: {}, manual: {} };

  // Get all resolved materials from the estimate
  const materials = estimate?.materialEstimates || [];

  // Handler to set/clear a system override
  const setSystemOverride = (systemId, productId) => {
    const newOverrides = { ...state.project.material_overrides };
    newOverrides.system = { ...newOverrides.system };
    if (productId) {
      newOverrides.system[systemId] = productId;
    } else {
      delete newOverrides.system[systemId];
    }
    dispatch({ type: 'SET_PROJECT_FIELD', field: 'material_overrides', value: newOverrides });
  };

  // For each material row, get alternative products from the catalog
  const getAlternatives = (systemId) => {
    return SYSTEM_INDEX.get(systemId) || [];
  };

  const isOverridden = (systemId) =>
    overrides.system && overrides.system[systemId];

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Resolved Products</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Products auto-selected based on project brand preference and quality tier.
        Override any selection with the dropdown.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>
            <th style={{ padding: 8, textAlign: 'left' }}>System</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Product</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Brand</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Coverage</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Price</th>
            <th style={{ padding: 8, textAlign: 'center' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, i) => {
            const alts = m.systemId ? getAlternatives(m.systemId) : [];
            const pinned = isOverridden(m.systemId);
            return (
              <tr key={i} style={{
                borderBottom: '1px solid var(--bg-hover)',
                background: pinned ? 'rgba(59,130,246,0.05)' : 'transparent'
              }}>
                <td style={{ padding: 8, color: 'var(--text-secondary)' }}>{m.systemName}</td>
                <td style={{ padding: 8 }}>
                  {alts.length > 1 ? (
                    <select
                      value={pinned || m.productId || ''}
                      onChange={e => setSystemOverride(m.systemId, e.target.value || null)}
                      style={{ fontSize: 12, padding: '4px 8px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, maxWidth: 280 }}
                    >
                      <option value="">Auto-resolve</option>
                      {alts.map(p => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.brand} — {p.product_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{m.productName || '(unresolved)'}</span>
                  )}
                </td>
                <td style={{ padding: 8 }}>{m.brand || '—'}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{m.coverageRate} SF/gal</td>
                <td style={{ padding: 8, textAlign: 'right', color: 'var(--accent)' }}>
                  {m.pricePerGallon ? `$${m.pricePerGallon}` : '—'}
                </td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  {pinned ? (
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>pinned</span>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.resolvedBy || 'auto'}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Add the sub-tab to MaterialsView.jsx**

In `MaterialsView.jsx`, add the third tab and import:

```javascript
import ResolvedProductsView from './ResolvedProductsView';
```

Add to the tabs array:
```javascript
{ id: 'resolved', label: 'Resolved Products' },
```

Add to the render:
```jsx
{tab === 'resolved' && <ResolvedProductsView />}
```

- [ ] **Step 3: Verify build and visual check**

Run: `cd tools/paintscope && npx vite build 2>&1 | tail -5`
Navigate to Materials → Resolved Products tab. Should show the resolved products table.

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/materials/ResolvedProductsView.jsx tools/paintscope/src/components/materials/MaterialsView.jsx
git commit -m "feat(paintscope): add Resolved Products view to Materials tab"
```

---

### Task 9: Visual Verification & Integration Test

- [ ] **Step 1: Start dev server and import Borin project**

```bash
cd tools/paintscope && npm run dev
```
Import `prototype projects/Borin.json`

- [ ] **Step 2: Verify Setup page**

- Brand preference dropdown appears with 4 options (No Preference, SW, BM, PPG)
- Setting a brand saves correctly (re-import project to verify)

- [ ] **Step 3: Verify Estimate tab with no brand preference**

- Material section shows real product names (not generic "Eggshell Wall Paint")
- Coverage rates come from catalog
- Prices show where available
- Total material cost line at bottom

- [ ] **Step 4: Set brand preference to Sherwin-Williams, verify Estimate**

- All resolved products should be SW products
- "Emerald Interior Acrylic Latex Eggshell" for QT5 walls
- "PVA Drywall Primer & Sealer" for wall prime (SW preferred)
- resolved_by should show "brand_preference + tier_match"

- [ ] **Step 5: Set brand to Benjamin Moore, verify products switch**

- Wall finish → "Aura Interior Paint Eggshell" for QT5
- Primers → BM products where available, fallback to other brands for specialty

- [ ] **Step 6: Verify Materials → Resolved Products tab**

- Shows all active systems with resolved products
- Brand, coverage, price columns populated

- [ ] **Step 7: Verify no regressions**

- Hours estimate unchanged (46.75h for Borin)
- Warnings/info count unchanged
- 0 console errors

- [ ] **Step 8: Commit any fixes**

---

## Summary

| Task | Description | New Files | Modified Files |
|------|------------|-----------|---------------|
| 1 | Product catalog data module | product-catalog.js | — |
| 2 | Brand-tier mapping table | brand-tier-map.js | — |
| 3 | Product resolver engine | product-resolver.js | — |
| 4 | Project state + migration | — | initial-state.js, migrations.js |
| 5 | Brand preference UI | — | ProjectSetup.jsx |
| 6 | Integrate resolver into estimates | — | material-estimates.js |
| 7 | Estimate view: real products | — | EstimateView.jsx |
| 8 | Resolved Products view | ResolvedProductsView.jsx | MaterialsView.jsx |
| 9 | Visual verification | — | — |

Tasks 1-2 are independent data modules. Task 3 depends on 1-2 (imports both). Tasks 4-5 are independent state/UI work. Task 6 depends on 1-4. Tasks 7-8 depend on 6. Task 9 depends on all.

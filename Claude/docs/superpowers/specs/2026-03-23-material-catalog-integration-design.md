# Material Catalog Integration Design

**Date:** 2026-03-23
**Status:** Approved
**Goal:** Replace generic placeholder materials in PaintScope estimates with real products from the 350-product catalog, resolved by system ID + brand preference + quality tier.

---

## Architecture Overview

The spec system continues to define material needs as **system IDs** (e.g., `SYS_WALL_EGGSHELL`, `SYS_STAIN_BLOCK`). A new **product resolver** layer sits between the spec system and the estimate output, mapping each system ID to a specific catalog product based on project context (quality tier, brand preference, sheen, substrate).

**Key principle:** Specs and the hours estimation engine are untouched. Only the material resolution and display layers change.

```
Spec material_system → Product Resolver → Catalog Product → Estimate Output
                         ↑ context:
                         QT, brand, sheen, substrate
                         override cascade
```

---

## 1. Product Catalog Data

**New file:** `src/data/product-catalog.js`

Extract the 350 products from `Research Resources/catalog-viewer.html` into a JS module. Each product retains its existing fields:

- `product_id` — unique identifier (e.g., `PROD_SW_PROMAR200_INT_LAT_PRIME`)
- `brand` — manufacturer name
- `product_name` — full product name
- `product_line` — product family (e.g., "ProMar 200", "Emerald")
- `sku` — manufacturer SKU
- `product_type` — primer | bonding_primer | stainblock | finish | clear | clear_coat | stain | sealer | specialty | caulk
- `coverage_sf_per_gallon` — coverage rate (null if unknown)
- `sheen_options` — available sheens (CSV or "N/A")
- `price_per_gallon` — price (null if unknown)
- `system_mappings` — parsed from CSV string to `string[]` at module level

**Build a lookup index at load time:** `Map<system_id, Product[]>` for O(1) system-to-products queries.

**Product count by type:** 136 finish, 131 primer, 26 bonding_primer, 15 caulk, 13 sealer, 10 stainblock, 8 clear_coat, 6 specialty, 4 stain, 1 clear.

---

## 2. Brand → Quality Tier Mapping

**New file:** `src/data/brand-tier-map.js`

A small mapping table (~20 rows) that maps `brand + product_line` → QT range. Used by the resolver to pick the right product line for the project's quality tier.

| Brand | Product Line | Type | QT Range |
|-------|-------------|------|----------|
| Sherwin-Williams | ProMar 200 | finish | QT3 |
| Sherwin-Williams | SuperPaint | finish | QT4 |
| Sherwin-Williams | Cashmere | finish | QT4 |
| Sherwin-Williams | Emerald | finish | QT5 |
| Sherwin-Williams | Duration | finish | QT5 |
| Benjamin Moore | ben | finish | QT3 |
| Benjamin Moore | Regal Select | finish | QT4 |
| Benjamin Moore | Aura | finish | QT5 |
| PPG | Manor Hall | finish | QT3-QT4 |
| PPG | Timeless | finish | QT5 |
| Sherwin-Williams | ProClassic | trim finish | QT3 |
| Sherwin-Williams | ProClassic Alkyd | trim finish | QT4 |
| Sherwin-Williams | Emerald Urethane | trim finish | QT5 |
| Benjamin Moore | Advance | trim finish | QT4-QT5 |

**QT2 is intentionally empty.** Apartment-grade lines (ProMar 400, Glidden, Behr) need future research. The resolver falls back to QT3 products when QT2 is selected.

**Primers are not tier-mapped.** Primer selection is role/substrate-based (stain-block, bonding, PVA), not quality-tier-based. Exception: complete finish systems like SW Gallery that include a matched primer — these are handled as system-level overrides.

---

## 3. Product Resolver Engine

**New file:** `src/engine/product-resolver.js`

### Input
- `system_id` — from the spec's material_system (e.g., `SYS_WALL_EGGSHELL`)
- `context` — `{ quality_tier, brand_preference, sheen, substrate, substrate_state }`
- `overrides` — `{ system_overrides, manual_overrides }` from project state

### Output
```javascript
{
  product_id: 'PROD_BM_REGAL_EGG',
  product_name: 'Regal Select Interior Paint',
  brand: 'Benjamin Moore',
  product_line: 'Regal Select',
  coverage_sf_per_gallon: 425,
  price_per_gallon: 48,
  resolved_by: 'brand_preference + tier_match'  // for debugging/display
}
```

### Resolution Algorithm

1. **Query catalog index:** all products where `system_mappings` includes the `system_id`
2. **Check manual override (Level 3):** if `manual_overrides[system_id]` exists, return that pinned product_id directly
3. **Check system override (Level 2):** if `system_overrides[system_id]` exists, return that pinned product_id
4. **Filter by preferred brand (Level 1):** if `brand_preference` is set, filter to that brand's products
5. **Rank by tier map:** for finish products, prefer product_line matching the project's QT. For primers, skip this step.
6. **If no brand match:** expand to all brands, rank by tier map
7. **If no tier match:** fall back one tier (QT2→QT3, QT5→QT4→QT3)
8. **Final fallback:** pick first available product in the system

### Override Cascade (priority high → low)

| Level | Scope | Example | Storage |
|-------|-------|---------|---------|
| 3 | Manual/Client pin | "Use BM Aura on master bedroom walls" | `project.material_overrides.manual` |
| 2 | System/Role pin | "Cabinet finish → always SW Emerald Urethane" | `project.material_overrides.system` |
| 1 | Project brand | Default brand: Sherwin-Williams | `project.default_brand` |
| 0 | Fallback | Best available product for this system + QT | (no storage) |

---

## 4. Integration Points

### 4a. Setup Page (`ProjectSetup.jsx`)

Add a "Preferred Brand" dropdown to the Interior Defaults section, after Application Method:

- **Options:** No Preference, Sherwin-Williams, Benjamin Moore, PPG (derived from catalog brands)
- **Storage:** `project.default_brand` (null = no preference)
- **Behavior:** Changing brand preference re-resolves all material estimates on next Estimate tab visit

### 4b. Materials Tab (`MaterialsView.jsx`)

Add a third sub-tab: "Resolved Products" (alongside existing Product Catalog and Material Costs).

This view shows:
- All active material systems for the current project scope
- The resolved product for each system (name, brand, coverage, price)
- Override controls: per-system dropdown to pin a different product
- Visual indicator when a product is overridden vs auto-resolved

Overrides stored in `project.material_overrides`:
```javascript
{
  system: {
    'SYS_FF_PREMIUM': 'PROD_BM_ADVANCE_SG'  // pin Advance for all QT5 trim
  },
  manual: {
    // room-specific pins (future — not in v1)
  }
}
```

### 4c. Estimate View (`EstimateView.jsx`)

The Material Estimates section currently shows generic names like "Eggshell Wall Paint (smooth)". After integration it shows:

```
Regal Select Eggshell (BM)    2.6 gal    498 SF × 2 coats @ 425 SF/gal +5% spray    $124.80
```

- Real product name and brand
- Real coverage rate from catalog
- Price = gallons × price_per_gallon

### 4d. Material Estimates Engine (`material-estimates.js`)

Replace the current hardcoded coverage profile lookup with resolver calls:

**Current flow:**
```
spec → material_coverage_profiles (DB) → hardcoded SF/gal → gallons
```

**New flow:**
```
spec → material_system (DB applies_when) → product resolver → catalog product → real SF/gal → gallons + price
```

The `computeMaterialEstimates()` function changes to:
1. For each active spec, resolve the matching material_system using existing `applies_when` logic
2. Pass the system_id to the product resolver with project context
3. Use the resolved product's `coverage_sf_per_gallon` instead of DB coverage profiles
4. Compute gallons as before: `(surface_SF × coats) / coverage_rate × spray_loss`
5. Add price: `gallons × product.price_per_gallon`

---

## 5. State Changes

### New project state fields

```javascript
// In initial-state.js project defaults:
default_brand: null,           // preferred brand (null = no preference)
material_overrides: {
  system: {},                  // system_id → product_id pins
  manual: {}                   // reserved for future room-specific pins
}
```

### Migration

Add inline migration for existing projects: if `default_brand` is undefined, set to null. If `material_overrides` is undefined, set to `{ system: {}, manual: {} }`.

---

## 6. What Changes vs What Doesn't

### Changes
- New `src/data/product-catalog.js` (350 products from catalog)
- New `src/data/brand-tier-map.js` (~20 rows)
- New `src/engine/product-resolver.js` (resolution algorithm)
- Modified `src/components/setup/ProjectSetup.jsx` (brand preference dropdown)
- Modified `src/components/materials/MaterialsView.jsx` (resolved products sub-tab)
- Modified `src/engine/material-estimates.js` (use resolver instead of hardcoded profiles)
- Modified `src/components/estimate/EstimateView.jsx` (real product names + prices)
- Modified `src/state/initial-state.js` (new project fields)
- Modified `src/state/migrations.js` (migration for new fields)

### Does NOT Change
- Spec JSON files (system IDs stay as-is)
- DB `material_systems` table (applies_when routing logic stays)
- `run-estimate.js` (hours calculation completely untouched)
- `quantity-lookups.js` (surface area derivation untouched)
- `modifier-stack.js` (QT/complexity/height untouched)
- Room editor UI (substrates/surfaces untouched)
- `db-bundle.js` structure (material_systems still used for applies_when routing)

---

## 7. Known Gaps & Future Work

- **QT2 products:** Apartment-grade lines (ProMar 400, Glidden, Behr) need research and catalog additions
- **Catalog pricing:** 142/350 products missing prices — need Google search / competitor research to fill
- **Substrate coverage modifiers:** Rough-sawn wood, popcorn ceiling, porous masonry modify coverage rates — future enhancement similar to existing texture modifiers
- **Grain filler:** `SYS_GRAIN_FILLER_WB` has no catalog products — niche, add when needed
- **Room-level product pins:** Level 3 manual overrides per room/surface (not in v1, structure reserved)
- **Exterior products:** 160+ exterior system IDs are already in the catalog — exterior resolver integration follows the same pattern

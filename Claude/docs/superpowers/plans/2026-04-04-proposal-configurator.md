# Proposal Configurator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire PaintFactor pricing into the estimate engine, pre-compute multi-QT options, export a self-contained proposal bundle, and build an interactive client-facing proposal configurator in the portal.

**Architecture:** PaintFactor computes fully-priced estimates per substrate per QT level and exports a JSON bundle to Supabase. The portal renders this bundle as an interactive tree (Category → Room → Substrate) with checkboxes, QT selectors, and live pricing deltas. Client submissions are tracked against the original scope.

**Tech Stack:** PaintScope (vanilla JS/React, IndexedDB), Supabase (Postgres + JS client), Next.js 16 (React 19, TypeScript, Tailwind CSS 4)

---

## File Map

### PaintFactor Side (Create)

| File | Responsibility |
|------|---------------|
| `Claude/tools/paintscope/src/engine/pricing.js` | Pricing formula: blended rate, burden, line costs, project markup |
| `Claude/tools/paintscope/src/engine/multi-qt.js` | Run estimate at every QT level per substrate, collect options |
| `Claude/tools/paintscope/src/engine/proposal-bundle.js` | Assemble the export bundle JSON from pricing + multi-QT data |
| `Claude/tools/paintscope/src/engine/__tests__/pricing.test.js` | Unit tests for pricing calculations |
| `Claude/tools/paintscope/src/engine/__tests__/multi-qt.test.js` | Unit tests for multi-QT computation |
| `Claude/tools/paintscope/src/engine/__tests__/proposal-bundle.test.js` | Unit tests for bundle assembly |

### PaintFactor Side (Modify)

| File | Change |
|------|--------|
| `Claude/tools/paintscope/src/engine/run-estimate.js` | Accept optional `profile` param, attach pricing to result |
| `Claude/tools/paintscope/src/hooks/useEstimate.js` | Pass company profile to `runEstimate` |
| `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx` | Add "Generate Proposal" button, show bid price |

### Portal Side (Create)

| File | Responsibility |
|------|---------------|
| `Claude/ideal-painting-website/supabase/migrations/002_proposal_tables.sql` | proposal_bundles + proposal_submissions tables |
| `Claude/ideal-painting-website/lib/proposal-types.ts` | TypeScript types for bundle, line items, changes, submissions |
| `Claude/ideal-painting-website/lib/proposal-helpers.ts` | Pure functions: compute total, build changes array, resolve QT |
| `Claude/ideal-painting-website/components/proposal/proposal-configurator.tsx` | Main configurator component (tree + header + totals) |
| `Claude/ideal-painting-website/components/proposal/category-group.tsx` | Expandable Interior/Exterior group |
| `Claude/ideal-painting-website/components/proposal/room-group.tsx` | Expandable room with QT selector |
| `Claude/ideal-painting-website/components/proposal/substrate-row.tsx` | Checkbox row with description, delta, QT override |
| `Claude/ideal-painting-website/components/proposal/qt-selector.tsx` | QT dropdown with indicator dot for overrides |
| `Claude/ideal-painting-website/components/proposal/verification-screen.tsx` | Changes review + confirm/submit |
| `Claude/ideal-painting-website/app/(portal)/portal/proposal/page.tsx` | Portal page that loads bundle and renders configurator |

---

## Task 1: Pricing Engine — `pricing.js`

**Files:**
- Create: `Claude/tools/paintscope/src/engine/pricing.js`
- Create: `Claude/tools/paintscope/src/engine/__tests__/pricing.test.js`

This module takes an estimate result + company profile and computes dollar amounts.

- [ ] **Step 1: Write the test file with core pricing tests**

```javascript
// Claude/tools/paintscope/src/engine/__tests__/pricing.test.js
import { describe, it, expect } from 'vitest';
import { computeBlendedRate, computeLineCost, computeBidPrice } from '../pricing.js';

describe('computeBlendedRate', () => {
  it('computes weighted average for standard 2-man crew', () => {
    const rates = { painter: 25, lead: 35, apprentice: 18 };
    const crew = { lead: 1, painter: 1, apprentice: 0 };
    const result = computeBlendedRate(rates, crew);
    // (35*1 + 25*1 + 18*0) / (1+1+0) = 60/2 = 30
    expect(result).toBe(30);
  });

  it('computes weighted average for 3-man crew with apprentice', () => {
    const rates = { painter: 25, lead: 35, apprentice: 18 };
    const crew = { lead: 1, painter: 1, apprentice: 1 };
    const result = computeBlendedRate(rates, crew);
    // (35 + 25 + 18) / 3 = 26
    expect(result).toBeCloseTo(26, 2);
  });
});

describe('computeLineCost', () => {
  it('computes labor + material cost for a line item', () => {
    const result = computeLineCost({
      hours: 4.2,
      blendedRate: 30,
      burdenPct: 0.30,
      materialCost: 100
    });
    // labor = 4.2 * 30 * 1.30 = 163.80
    // total = 163.80 + 100 = 263.80
    expect(result.laborCost).toBeCloseTo(163.80, 2);
    expect(result.materialCost).toBe(100);
    expect(result.lineCost).toBeCloseTo(263.80, 2);
  });

  it('handles zero hours', () => {
    const result = computeLineCost({
      hours: 0,
      blendedRate: 30,
      burdenPct: 0.30,
      materialCost: 50
    });
    expect(result.laborCost).toBe(0);
    expect(result.lineCost).toBe(50);
  });
});

describe('computeBidPrice', () => {
  it('applies overhead and margin to subtotal', () => {
    const result = computeBidPrice({
      subtotal: 8450,
      overheadPct: 0.15,
      marginPct: 0.10,
      mobilization: 150,
      travelCost: 19.50,
      minJobCharge: 500
    });
    // markup = 8450 * 1.15 * 1.10 = 10689.25
    // + mobilization + travel = 10689.25 + 150 + 19.50 = 10858.75
    expect(result.subtotal).toBe(8450);
    expect(result.overhead).toBeCloseTo(1267.50, 2);
    expect(result.margin).toBeCloseTo(971.75, 2);
    expect(result.bidPrice).toBeCloseTo(10858.75, 2);
    expect(result.minJobApplied).toBe(false);
  });

  it('applies min job charge when subtotal is low', () => {
    const result = computeBidPrice({
      subtotal: 200,
      overheadPct: 0.15,
      marginPct: 0.10,
      mobilization: 0,
      travelCost: 0,
      minJobCharge: 500
    });
    expect(result.bidPrice).toBe(500);
    expect(result.minJobApplied).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pricing.test.js`
Expected: FAIL — module `../pricing.js` not found

- [ ] **Step 3: Implement pricing.js**

```javascript
// Claude/tools/paintscope/src/engine/pricing.js

/**
 * Compute weighted average hourly rate for a crew configuration.
 * @param {{ painter: number, lead: number, apprentice: number }} rates - $/hr per role
 * @param {{ lead: number, painter: number, apprentice: number }} crew - headcount per role
 * @returns {number} blended $/hr
 */
export function computeBlendedRate(rates, crew) {
  const totalHeads = crew.lead + crew.painter + crew.apprentice;
  if (totalHeads === 0) return 0;
  const weightedSum =
    rates.lead * crew.lead +
    rates.painter * crew.painter +
    rates.apprentice * crew.apprentice;
  return weightedSum / totalHeads;
}

/**
 * Compute cost for a single line item (one substrate in one room).
 * @param {{ hours: number, blendedRate: number, burdenPct: number, materialCost: number }} params
 * @returns {{ laborCost: number, materialCost: number, lineCost: number }}
 */
export function computeLineCost({ hours, blendedRate, burdenPct, materialCost }) {
  const laborCost = Math.round(hours * blendedRate * (1 + burdenPct) * 100) / 100;
  return {
    laborCost,
    materialCost,
    lineCost: Math.round((laborCost + materialCost) * 100) / 100
  };
}

/**
 * Compute final bid price from subtotal + company profile settings.
 * @param {{ subtotal: number, overheadPct: number, marginPct: number, mobilization: number, travelCost: number, minJobCharge: number }} params
 * @returns {{ subtotal: number, overhead: number, margin: number, mobilization: number, travelCost: number, bidPrice: number, minJobApplied: boolean }}
 */
export function computeBidPrice({ subtotal, overheadPct, marginPct, mobilization, travelCost, minJobCharge }) {
  const afterOverhead = subtotal * (1 + overheadPct);
  const overhead = Math.round((afterOverhead - subtotal) * 100) / 100;
  const afterMargin = afterOverhead * (1 + marginPct);
  const margin = Math.round((afterMargin - afterOverhead) * 100) / 100;
  const rawBid = Math.round((afterMargin + mobilization + travelCost) * 100) / 100;
  const minJobApplied = rawBid < minJobCharge;
  return {
    subtotal,
    overhead,
    margin,
    mobilization,
    travelCost,
    bidPrice: minJobApplied ? minJobCharge : rawBid,
    minJobApplied
  };
}

/**
 * Compute travel cost from minutes + blended burdened rate.
 * @param {number} travelMinutes
 * @param {number} blendedRate $/hr
 * @param {number} burdenPct decimal (0.30)
 * @returns {number} travel cost in dollars
 */
export function computeTravelCost(travelMinutes, blendedRate, burdenPct) {
  return Math.round((travelMinutes / 60) * blendedRate * (1 + burdenPct) * 100) / 100;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "Claude/tools/paintscope" && npx vitest run src/engine/__tests__/pricing.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/engine/pricing.js Claude/tools/paintscope/src/engine/__tests__/pricing.test.js
git commit -m "feat(pricing): add pricing engine with blended rate, line cost, and bid price"
```

---

## Task 2: Wire Pricing Into Estimate Result

**Files:**
- Modify: `Claude/tools/paintscope/src/engine/run-estimate.js` (lines 104, 833–845)
- Modify: `Claude/tools/paintscope/src/hooks/useEstimate.js` (lines 6–17)

The estimate engine accepts an optional company profile and attaches a `pricing` object to its return value.

- [ ] **Step 1: Add profile parameter to runEstimate**

In `run-estimate.js`, change the function signature at line 104:

```javascript
// OLD:
export function runEstimate(state, db, overlayMap)

// NEW:
export function runEstimate(state, db, overlayMap, profile)
```

- [ ] **Step 2: Add pricing computation before the return statement**

In `run-estimate.js`, before the return block (line ~833), add the pricing pass. This aggregates hours per room+substrate from specResults, matches material costs, and runs the pricing formula:

```javascript
// --- Pricing pass (requires profile) ---
let pricing = null;
if (profile) {
  const { computeBlendedRate, computeLineCost, computeBidPrice, computeTravelCost } = await import('./pricing.js');

  const crew = profile.crew_configs?.[0] || { lead: 1, painter: 1, apprentice: 0 };
  const blendedRate = computeBlendedRate(profile.labor_rates, crew);
  const burdenPct = (profile.labor_burden_pct || 0) / 100;

  // Build material cost lookup: specFamilyId → totalCost
  const matCostBySpec = new Map();
  for (const mat of materialEstimates) {
    const prev = matCostBySpec.get(mat.specFamilyId) || 0;
    matCostBySpec.set(mat.specFamilyId, prev + (mat.totalCost || 0));
  }

  // Aggregate hours per room+substrate from specResults
  // Each specResult maps to a substrate via SPEC_DISPLAY_NAMES
  const lineMap = new Map(); // key: "roomIndex_specId" → { hours, room, roomIndex, ... }
  for (const sr of specResults) {
    for (const task of sr.tasks) {
      const key = `${task.roomIndex}_${sr.specId}`;
      if (!lineMap.has(key)) {
        lineMap.set(key, {
          room: task.roomLabel,
          roomIndex: task.roomIndex,
          domain: sr.domain || 'interior',
          specFamilyId: sr.specId,
          specName: sr.specName,
          hours: 0
        });
      }
      lineMap.get(key).hours += task.hours;
    }
  }

  // Compute line costs
  let subtotal = 0;
  const lineItems = [];
  for (const [key, line] of lineMap) {
    // Distribute material cost proportionally by hours within the spec
    const specTotalHours = specResults.find(s => s.specId === line.specFamilyId)?.totalHours || 1;
    const matCostForSpec = matCostBySpec.get(line.specFamilyId) || 0;
    const matShare = Math.round((line.hours / specTotalHours) * matCostForSpec * 100) / 100;

    const lc = computeLineCost({
      hours: line.hours,
      blendedRate,
      burdenPct,
      materialCost: matShare
    });

    subtotal += lc.lineCost;
    lineItems.push({
      room: line.room,
      roomIndex: line.roomIndex,
      domain: line.domain,
      specFamilyId: line.specFamilyId,
      specName: line.specName,
      hours: Math.round(line.hours * 100) / 100,
      laborCost: lc.laborCost,
      materialCost: lc.materialCost,
      lineCost: lc.lineCost
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const rules = profile.business_rules || {};
  const travelCost = computeTravelCost(rules.travel_time_min || 0, blendedRate, burdenPct);

  pricing = computeBidPrice({
    subtotal,
    overheadPct: (profile.overhead_rate_pct || 0) / 100,
    marginPct: (profile.profit_margin_pct || 0) / 100,
    mobilization: rules.mobilization_charge || 0,
    travelCost,
    minJobCharge: rules.min_job_charge || 0
  });
  pricing.laborRates = { blended: blendedRate, burdened: Math.round(blendedRate * (1 + burdenPct) * 100) / 100 };
  pricing.lineItems = lineItems;
}
```

- [ ] **Step 3: Add pricing to the return object**

In the return block (~line 833), add `pricing`:

```javascript
// Add to the return object:
pricing,
```

- [ ] **Step 4: Update useEstimate hook to pass profile**

In `useEstimate.js`, import the company profile hook and pass it:

```javascript
// Claude/tools/paintscope/src/hooks/useEstimate.js
import { useMemo } from 'react';
import { useProject } from './useProject.js';
import { useSpecData } from './useSpecData.js';
import { useCompanyProfile } from './useCompanyProfile.js';
import { runEstimate } from '../engine/run-estimate.js';

export function useEstimate() {
  const { state } = useProject();
  const { specData } = useSpecData();
  const { profile } = useCompanyProfile();
  return useMemo(() => {
    try {
      return runEstimate(state, specData, undefined, profile);
    } catch (e) {
      console.error('[PaintScope] Estimate error:', e);
      return null;
    }
  }, [state, specData, profile]);
}
```

- [ ] **Step 5: Verify the app still loads and estimate runs without errors**

Run: `cd "Claude/tools/paintscope" && npm run dev`
Expected: App loads, estimate tab shows hours + now shows pricing data in console (no UI changes yet)

- [ ] **Step 6: Commit**

```bash
git add Claude/tools/paintscope/src/engine/run-estimate.js Claude/tools/paintscope/src/hooks/useEstimate.js
git commit -m "feat(pricing): wire company profile into estimate engine for bid pricing"
```

---

## Task 3: Multi-QT Computation — `multi-qt.js`

**Files:**
- Create: `Claude/tools/paintscope/src/engine/multi-qt.js`
- Create: `Claude/tools/paintscope/src/engine/__tests__/multi-qt.test.js`

This module re-runs the estimate for each substrate at every available QT level and collects the options.

- [ ] **Step 1: Write the test file**

```javascript
// Claude/tools/paintscope/src/engine/__tests__/multi-qt.test.js
import { describe, it, expect } from 'vitest';
import { buildLineItemId, buildDescription, collectAvailableTiers } from '../multi-qt.js';

describe('buildLineItemId', () => {
  it('creates deterministic ID from roomIndex and substrate', () => {
    expect(buildLineItemId(0, 'walls')).toBe('line_0_walls');
    expect(buildLineItemId(3, 'baseboard')).toBe('line_3_baseboard');
  });
});

describe('buildDescription', () => {
  it('formats product-forward description', () => {
    const result = buildDescription({
      coats: 2,
      productName: 'SW Cashmere',
      sheen: 'eggshell',
      method: 'spray + backroll'
    });
    expect(result).toBe('2 coats SW Cashmere eggshell, spray + backroll');
  });

  it('uses singular "coat" for 1 coat', () => {
    const result = buildDescription({
      coats: 1,
      productName: 'SW ProMar 200',
      sheen: 'flat',
      method: 'spray'
    });
    expect(result).toBe('1 coat SW ProMar 200 flat, spray');
  });
});

describe('collectAvailableTiers', () => {
  it('returns sorted unique tiers from spec dimensions', () => {
    const dimensions = [
      { dimension_id: 'quality_tier', values: ['QT3', 'QT4', 'QT5'] },
      { dimension_id: 'application_method', values: ['spray', 'roll'] }
    ];
    expect(collectAvailableTiers(dimensions)).toEqual(['QT3', 'QT4', 'QT5']);
  });

  it('returns empty array if no quality_tier dimension', () => {
    const dimensions = [
      { dimension_id: 'application_method', values: ['spray'] }
    ];
    expect(collectAvailableTiers(dimensions)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "Claude/tools/paintscope" && npx vitest run src/engine/__tests__/multi-qt.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement multi-qt.js**

```javascript
// Claude/tools/paintscope/src/engine/multi-qt.js

/**
 * Build a deterministic line item ID.
 * @param {number} roomIndex
 * @param {string} substrate - e.g., "walls", "baseboard", "door_slab"
 * @returns {string} e.g., "line_0_walls"
 */
export function buildLineItemId(roomIndex, substrate) {
  return `line_${roomIndex}_${substrate}`;
}

/**
 * Build a product-forward description string.
 * @param {{ coats: number, productName: string, sheen: string, method: string }} params
 * @returns {string} e.g., "2 coats SW Cashmere eggshell, spray + backroll"
 */
export function buildDescription({ coats, productName, sheen, method }) {
  const coatWord = coats === 1 ? 'coat' : 'coats';
  return `${coats} ${coatWord} ${productName} ${sheen}, ${method}`;
}

/**
 * Extract available quality tiers from a spec's configuration dimensions.
 * @param {Array<{ dimension_id: string, values: string[] }>} dimensions
 * @returns {string[]} sorted tier values, e.g., ["QT3", "QT4", "QT5"]
 */
export function collectAvailableTiers(dimensions) {
  const qtDim = dimensions.find(d => d.dimension_id === 'quality_tier');
  if (!qtDim) return [];
  return [...qtDim.values].sort();
}

/**
 * Map spec family IDs to substrate display keys for line item grouping.
 * Uses the spec's primary PaintScope key to derive the substrate name.
 */
const SPEC_TO_SUBSTRATE = {
  SF_DRYWALL_WALL_NC_FINISH: 'walls',
  SF_DRYWALL_WALL_NC_PRIME: 'walls_prime',
  SF_DRYWALL_CEILING_NC_FINISH: 'ceiling',
  SF_DRYWALL_CEILING_NC_PRIME: 'ceiling_prime',
  SF_TRIM_NC_PAINT: 'trim',
  SF_TRIM_NC_PRIME: 'trim_prime',
  SF_DOOR_SLAB_INT_NC: 'doors',
  SF_DOOR_FRAME_NC_FINISH: 'door_frames',
  SF_WINDOW_INT_NC: 'windows',
  SF_STAIR_RISER_NC: 'stair_risers',
  SF_STAIR_RAILING_NC: 'stair_railing',
  SF_WAINSCOT_PANEL_NC: 'wainscot',
  SF_WOOD_WALL_NC: 'wood_walls',
  SF_WOOD_CEILING_NC: 'wood_ceiling',
  SF_ARCH_ELEMENT_NC: 'arch_elements',
  SF_BUILTIN_NC: 'builtins',
  SF_CABINET_NC_PAINT: 'cabinets',
  SF_CLOSET_SHELF_NC: 'closet_shelves'
};

/**
 * Derive substrate key from spec family ID.
 * Falls back to lowercased spec name without prefixes.
 * @param {string} specFamilyId
 * @returns {string}
 */
export function specToSubstrate(specFamilyId) {
  if (SPEC_TO_SUBSTRATE[specFamilyId]) return SPEC_TO_SUBSTRATE[specFamilyId];
  // Fallback: strip SF_ prefix, lowercase, replace _ sequences
  return specFamilyId.replace(/^SF_/, '').toLowerCase();
}

/**
 * Run multi-QT computation for all line items.
 *
 * For each substrate in each room, re-runs the estimate at every available QT
 * and collects { product, coats, method, description, price } per tier.
 *
 * @param {Function} runEstimateFn - The runEstimate function
 * @param {object} state - App state (project, rooms, exterior)
 * @param {object} db - Database bundle
 * @param {object} profile - Company profile
 * @param {object} baseEstimate - The estimate at the project's default QT
 * @returns {{ lineItems: Array, qtOptions: object }}
 */
export function computeMultiQT(runEstimateFn, state, db, profile, baseEstimate) {
  if (!baseEstimate?.pricing?.lineItems) return { lineItems: [], qtOptions: {} };

  const qtOptions = {};
  const lineItems = [];

  // Group base line items by room+spec
  for (const baseLine of baseEstimate.pricing.lineItems) {
    const substrate = specToSubstrate(baseLine.specFamilyId);
    const lineId = buildLineItemId(baseLine.roomIndex, substrate);

    // Find the spec's available tiers
    const specFamily = db.spec_families?.find(s => s.id === baseLine.specFamilyId || s.spec_family?.id === baseLine.specFamilyId);
    const dimensions = specFamily?.configuration_dimensions || specFamily?.spec_family?.configuration_dimensions || [];
    const availableTiers = collectAvailableTiers(dimensions);

    // Find material info for base tier
    const baseMat = baseEstimate.materialEstimates?.find(m => m.specFamilyId === baseLine.specFamilyId);
    const baseMethod = resolveMethod(state, baseLine.roomIndex);

    const options = {};

    for (const qt of availableTiers) {
      // Clone state with QT override for this computation
      const qtState = cloneStateWithQT(state, baseLine.roomIndex, qt);
      const qtEstimate = runEstimateFn(qtState, db, undefined, profile);

      // Find matching line in QT estimate
      const qtLine = qtEstimate?.pricing?.lineItems?.find(
        l => l.specFamilyId === baseLine.specFamilyId && l.roomIndex === baseLine.roomIndex
      );
      const qtMat = qtEstimate?.materialEstimates?.find(m => m.specFamilyId === baseLine.specFamilyId);

      options[qt] = {
        product: qtMat?.productName || 'TBD',
        coats: qtMat?.coats || 1,
        method: baseMethod,
        description: buildDescription({
          coats: qtMat?.coats || 1,
          productName: qtMat?.productName || 'TBD',
          sheen: qtMat?.sheen || '',
          method: baseMethod
        }),
        price: qtLine?.lineCost || 0
      };
    }

    const currentQT = resolveRoomQT(state, baseLine.roomIndex);

    lineItems.push({
      id: lineId,
      roomIndex: baseLine.roomIndex,
      room: baseLine.room,
      areaGroup: resolveAreaGroup(state, baseLine.roomIndex),
      domain: baseLine.domain,
      substrate,
      specFamilyId: baseLine.specFamilyId,
      included: true,
      qualityTier: currentQT,
      description: options[currentQT]?.description || baseLine.specName,
      price: options[currentQT]?.price || baseLine.lineCost
    });

    qtOptions[lineId] = { availableTiers, options };
  }

  return { lineItems, qtOptions };
}

// --- Internal helpers ---

function cloneStateWithQT(state, roomIndex, qt) {
  const cloned = JSON.parse(JSON.stringify(state));
  if (cloned.rooms?.[roomIndex]) {
    cloned.rooms[roomIndex].quality_tier = qt;
  }
  return cloned;
}

function resolveRoomQT(state, roomIndex) {
  return state.rooms?.[roomIndex]?.quality_tier || state.project?.default_quality_tier || 'QT3';
}

function resolveAreaGroup(state, roomIndex) {
  return state.rooms?.[roomIndex]?.area_group || 'MAIN';
}

function resolveMethod(state, roomIndex) {
  const method = state.rooms?.[roomIndex]?.application_method || state.project?.default_application_method || 'spray_backroll';
  return method.replace(/_/g, ' + ').replace('spray + backroll', 'spray + backroll');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "Claude/tools/paintscope" && npx vitest run src/engine/__tests__/multi-qt.test.js`
Expected: All 5 tests PASS (the pure utility functions; `computeMultiQT` is integration-tested in Task 5)

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/engine/multi-qt.js Claude/tools/paintscope/src/engine/__tests__/multi-qt.test.js
git commit -m "feat(multi-qt): add multi-QT computation engine for per-substrate tier options"
```

---

## Task 4: Proposal Bundle Assembly — `proposal-bundle.js`

**Files:**
- Create: `Claude/tools/paintscope/src/engine/proposal-bundle.js`
- Create: `Claude/tools/paintscope/src/engine/__tests__/proposal-bundle.test.js`

Assembles the export bundle JSON from multi-QT data + project metadata.

- [ ] **Step 1: Write the test file**

```javascript
// Claude/tools/paintscope/src/engine/__tests__/proposal-bundle.test.js
import { describe, it, expect } from 'vitest';
import { assembleBundle } from '../proposal-bundle.js';

const mockProfile = {
  company_name: 'Ideal Painting Company'
};

const mockState = {
  project: {
    name: 'Smith Residence',
    address: '123 Main St',
    client_name: 'Sarah Miller',
    default_quality_tier: 'QT3',
    new_construction: true
  },
  rooms: [
    { label: 'Master Bedroom', area_group: 'UPSTAIRS' }
  ]
};

const mockPricing = {
  bidPrice: 10689.25,
  mobilization: 150,
  travelCost: 19.50
};

const mockMultiQT = {
  lineItems: [
    {
      id: 'line_0_walls',
      roomIndex: 0,
      room: 'Master Bedroom',
      areaGroup: 'UPSTAIRS',
      domain: 'interior',
      substrate: 'walls',
      included: true,
      qualityTier: 'QT3',
      description: '2 coats SW Cashmere eggshell, spray + backroll',
      price: 485
    }
  ],
  qtOptions: {
    line_0_walls: {
      availableTiers: ['QT3', 'QT4'],
      options: {
        QT3: { product: 'SW Cashmere', coats: 2, method: 'spray + backroll', description: '2 coats SW Cashmere eggshell, spray + backroll', price: 485 },
        QT4: { product: 'SW Emerald', coats: 2, method: 'spray + backroll', description: '2 coats SW Emerald eggshell, spray + backroll', price: 680 }
      }
    }
  }
};

describe('assembleBundle', () => {
  it('produces a valid bundle with all required sections', () => {
    const bundle = assembleBundle(mockState, mockProfile, mockPricing, mockMultiQT);

    expect(bundle.meta.exportVersion).toBe('1.0.0');
    expect(bundle.meta.source).toBe('PaintScope');
    expect(bundle.company.name).toBe('Ideal Painting Company');
    expect(bundle.project.name).toBe('Smith Residence');
    expect(bundle.project.clientName).toBe('Sarah Miller');
    expect(bundle.project.defaultQT).toBe('QT3');
    expect(bundle.originalScope.bidPrice).toBe(10689.25);
    expect(bundle.originalScope.items).toHaveLength(1);
    expect(bundle.originalScope.items[0].id).toBe('line_0_walls');
    expect(bundle.qtOptions.line_0_walls.availableTiers).toEqual(['QT3', 'QT4']);
    expect(bundle.projectCharges.mobilization).toBe(150);
  });

  it('includes color assumptions with null values', () => {
    const bundle = assembleBundle(mockState, mockProfile, mockPricing, mockMultiQT);
    expect(bundle.colorAssumptions.ceilings.colorName).toBeNull();
    expect(bundle.colorAssumptions.trim.colorCode).toBeNull();
  });

  it('strips internal fields from line items', () => {
    const bundle = assembleBundle(mockState, mockProfile, mockPricing, mockMultiQT);
    const item = bundle.originalScope.items[0];
    // Should NOT have specFamilyId (internal)
    expect(item.specFamilyId).toBeUndefined();
    expect(item.id).toBe('line_0_walls');
    expect(item.substrate).toBe('walls');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "Claude/tools/paintscope" && npx vitest run src/engine/__tests__/proposal-bundle.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement proposal-bundle.js**

```javascript
// Claude/tools/paintscope/src/engine/proposal-bundle.js

const EXPORT_VERSION = '1.0.0';

/**
 * Assemble a proposal export bundle from computed data.
 *
 * @param {object} state - App state (project, rooms, exterior)
 * @param {object} profile - Company profile
 * @param {object} pricing - Bid price result from computeBidPrice
 * @param {{ lineItems: Array, qtOptions: object }} multiQT - Multi-QT computation result
 * @returns {object} Self-contained proposal bundle
 */
export function assembleBundle(state, profile, pricing, multiQT) {
  const project = state.project || {};
  const hasExterior = state.exterior?.elevations?.length > 0;
  const hasInterior = (state.rooms?.length || 0) > 0;

  let domain = 'interior';
  if (hasInterior && hasExterior) domain = 'both';
  else if (hasExterior) domain = 'exterior';

  return {
    meta: {
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      projectId: project.id || `proj_${Date.now()}`,
      source: 'PaintScope'
    },

    company: {
      name: profile.company_name || 'Ideal Painting Company',
      phone: '(989) 657-5446',
      website: 'idealpaintingcompany.com'
    },

    project: {
      name: project.name || '',
      address: project.address || '',
      clientName: project.client_name || '',
      defaultQT: project.default_quality_tier || 'QT3',
      domain,
      newConstruction: project.new_construction || false
    },

    originalScope: {
      bidPrice: pricing.bidPrice,
      items: multiQT.lineItems.map(item => ({
        id: item.id,
        roomIndex: item.roomIndex,
        room: item.room,
        areaGroup: item.areaGroup,
        domain: item.domain,
        substrate: item.substrate,
        included: item.included,
        qualityTier: item.qualityTier,
        description: item.description,
        price: item.price
      }))
    },

    qtOptions: multiQT.qtOptions,

    colorAssumptions: {
      ceilings: { colorName: null, colorCode: null, hex: null },
      doors: { colorName: null, colorCode: null, hex: null },
      trim: { colorName: null, colorCode: null, hex: null },
      builtins: { colorName: null, colorCode: null, hex: null },
      other: { colorName: null, colorCode: null, hex: null }
    },

    projectCharges: {
      mobilization: pricing.mobilization || 0,
      travelCost: pricing.travelCost || 0
    }
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "Claude/tools/paintscope" && npx vitest run src/engine/__tests__/proposal-bundle.test.js`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/engine/proposal-bundle.js Claude/tools/paintscope/src/engine/__tests__/proposal-bundle.test.js
git commit -m "feat(proposal): add bundle assembly for client-facing proposal export"
```

---

## Task 5: Generate Proposal Button in EstimateView

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx` (lines 69–104, 234–246)

Add a "Generate Proposal" button to the estimate header that runs multi-QT computation and downloads the bundle as JSON.

- [ ] **Step 1: Add imports and state to EstimateView**

At the top of `EstimateView.jsx`, add:

```javascript
import { computeMultiQT } from '../../engine/multi-qt.js';
import { assembleBundle } from '../../engine/proposal-bundle.js';
import { runEstimate } from '../../engine/run-estimate.js';
import { useCompanyProfile } from '../../hooks/useCompanyProfile.js';
```

Inside the component, add:

```javascript
const { profile } = useCompanyProfile();
const [generatingProposal, setGeneratingProposal] = useState(false);
```

- [ ] **Step 2: Add the generate handler**

```javascript
const handleGenerateProposal = async () => {
  if (!estimate || !profile) return;
  setGeneratingProposal(true);
  try {
    const multiQT = computeMultiQT(runEstimate, state, specData, profile, estimate);
    const bundle = assembleBundle(state, profile, estimate.pricing, multiQT);

    // Download as JSON file
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposal_${(state.project?.name || 'project').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setGeneratingProposal(false);
  }
};
```

- [ ] **Step 3: Add the button and bid price to the header card**

In the header section (around line 234–246), after the existing totals display, add:

```jsx
{estimate.pricing && (
  <div className="text-right">
    <div className="text-sm text-gray-500">Bid Price</div>
    <div className="text-2xl font-bold text-green-700">
      ${estimate.pricing.bidPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
    </div>
  </div>
)}

<button
  onClick={handleGenerateProposal}
  disabled={generatingProposal || !estimate.pricing}
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
>
  {generatingProposal ? 'Generating...' : 'Generate Proposal'}
</button>
```

- [ ] **Step 4: Verify the button works**

Run: `cd "Claude/tools/paintscope" && npm run dev`
Expected: Estimate tab shows bid price and "Generate Proposal" button. Clicking it downloads a JSON file.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/EstimateView.jsx
git commit -m "feat(proposal): add Generate Proposal button with bid price display"
```

---

## Task 6: Supabase Migration — Proposal Tables

**Files:**
- Create: `Claude/ideal-painting-website/supabase/migrations/002_proposal_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 002_proposal_tables.sql
-- Proposal bundles exported from PaintFactor and client submissions

CREATE TABLE proposal_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_name text,
  project_address text,
  bundle jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE TABLE proposal_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES proposal_bundles(id) ON DELETE CASCADE,
  original_total numeric NOT NULL,
  adjusted_total numeric NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'accepted', 'revised')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Indexes
CREATE INDEX idx_proposal_bundles_project ON proposal_bundles(project_id);
CREATE INDEX idx_proposal_bundles_status ON proposal_bundles(status);
CREATE INDEX idx_proposal_submissions_bundle ON proposal_submissions(bundle_id);
CREATE INDEX idx_proposal_submissions_status ON proposal_submissions(status);

-- RLS policies
ALTER TABLE proposal_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_submissions ENABLE ROW LEVEL SECURITY;

-- Clients can view bundles for their own projects
CREATE POLICY "Clients view own proposal bundles"
  ON proposal_bundles FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id = auth.uid()
    )
  );

-- Admins have full access to bundles
CREATE POLICY "Admins manage proposal bundles"
  ON proposal_bundles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Clients can view and insert submissions for their bundles
CREATE POLICY "Clients view own submissions"
  ON proposal_submissions FOR SELECT
  USING (
    bundle_id IN (
      SELECT pb.id FROM proposal_bundles pb
      JOIN projects p ON pb.project_id = p.id
      WHERE p.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients create submissions"
  ON proposal_submissions FOR INSERT
  WITH CHECK (
    bundle_id IN (
      SELECT pb.id FROM proposal_bundles pb
      JOIN projects p ON pb.project_id = p.id
      WHERE p.client_id = auth.uid()
    )
  );

-- Admins have full access to submissions
CREATE POLICY "Admins manage submissions"
  ON proposal_submissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

- [ ] **Step 2: Commit**

```bash
git add Claude/ideal-painting-website/supabase/migrations/002_proposal_tables.sql
git commit -m "feat(db): add proposal_bundles and proposal_submissions tables"
```

---

## Task 7: Portal Types and Helpers

**Files:**
- Create: `Claude/ideal-painting-website/lib/proposal-types.ts`
- Create: `Claude/ideal-painting-website/lib/proposal-helpers.ts`

- [ ] **Step 1: Write the TypeScript types**

```typescript
// Claude/ideal-painting-website/lib/proposal-types.ts

export type QualityTier = 'QT2' | 'QT3' | 'QT4' | 'QT5';

export type LineItem = {
  id: string;
  roomIndex: number;
  room: string;
  areaGroup: string;
  domain: 'interior' | 'exterior';
  substrate: string;
  included: boolean;
  qualityTier: QualityTier;
  description: string;
  price: number;
};

export type QTOption = {
  product: string;
  coats: number;
  method: string;
  description: string;
  price: number;
};

export type LineQTOptions = {
  availableTiers: QualityTier[];
  options: Partial<Record<QualityTier, QTOption>>;
};

export type ColorAssumption = {
  colorName: string | null;
  colorCode: string | null;
  hex: string | null;
};

export type ProposalBundle = {
  meta: {
    exportVersion: string;
    exportedAt: string;
    projectId: string;
    source: string;
  };
  company: {
    name: string;
    phone: string;
    website: string;
  };
  project: {
    name: string;
    address: string;
    clientName: string;
    defaultQT: QualityTier;
    domain: 'interior' | 'exterior' | 'both';
    newConstruction: boolean;
  };
  originalScope: {
    bidPrice: number;
    items: LineItem[];
  };
  qtOptions: Record<string, LineQTOptions>;
  colorAssumptions: {
    ceilings: ColorAssumption;
    doors: ColorAssumption;
    trim: ColorAssumption;
    builtins: ColorAssumption;
    other: ColorAssumption;
  };
  projectCharges: {
    mobilization: number;
    travelCost: number;
  };
};

export type ChangeType = 'removed' | 'added' | 'qt_change';

export type ClientChange = {
  lineId: string;
  type: ChangeType;
  originalPrice?: number;
  from?: QualityTier;
  to?: QualityTier;
  priceDelta: number;
};

export type ClientState = {
  included: Record<string, boolean>;       // lineId → checked
  qualityTiers: Record<string, QualityTier>; // lineId → selected QT
  roomQTs: Record<number, QualityTier>;    // roomIndex → room-level QT
  projectQT: QualityTier;                  // project-wide QT
};

export type ProposalSubmission = {
  bundleId: string;
  originalTotal: number;
  adjustedTotal: number;
  changes: ClientChange[];
  notes?: string;
};
```

- [ ] **Step 2: Write the helper functions**

```typescript
// Claude/ideal-painting-website/lib/proposal-helpers.ts
import type {
  ProposalBundle, ClientState, ClientChange, QualityTier, LineItem
} from './proposal-types';

/**
 * Create initial client state from the bundle's original scope.
 */
export function initClientState(bundle: ProposalBundle): ClientState {
  const included: Record<string, boolean> = {};
  const qualityTiers: Record<string, QualityTier> = {};

  for (const item of bundle.originalScope.items) {
    included[item.id] = item.included;
    qualityTiers[item.id] = item.qualityTier;
  }

  return {
    included,
    qualityTiers,
    roomQTs: {},
    projectQT: bundle.project.defaultQT
  };
}

/**
 * Resolve the effective QT for a line item using the cascade:
 * substrate override → room override → project default
 */
export function resolveQT(
  lineId: string,
  roomIndex: number,
  clientState: ClientState
): QualityTier {
  if (clientState.qualityTiers[lineId]) return clientState.qualityTiers[lineId];
  if (clientState.roomQTs[roomIndex]) return clientState.roomQTs[roomIndex];
  return clientState.projectQT;
}

/**
 * Get the current price for a line item based on its effective QT.
 */
export function getItemPrice(
  lineId: string,
  roomIndex: number,
  bundle: ProposalBundle,
  clientState: ClientState
): number {
  const qt = resolveQT(lineId, roomIndex, clientState);
  const option = bundle.qtOptions[lineId]?.options[qt];
  return option?.price ?? 0;
}

/**
 * Get the description for a line item based on its effective QT.
 */
export function getItemDescription(
  lineId: string,
  roomIndex: number,
  bundle: ProposalBundle,
  clientState: ClientState
): string {
  const qt = resolveQT(lineId, roomIndex, clientState);
  const option = bundle.qtOptions[lineId]?.options[qt];
  return option?.description ?? '';
}

/**
 * Compute the current project total based on client state.
 */
export function computeTotal(
  bundle: ProposalBundle,
  clientState: ClientState
): number {
  let total = 0;
  for (const item of bundle.originalScope.items) {
    if (!clientState.included[item.id]) continue;
    total += getItemPrice(item.id, item.roomIndex, bundle, clientState);
  }
  total += bundle.projectCharges.mobilization + bundle.projectCharges.travelCost;
  return Math.round(total * 100) / 100;
}

/**
 * Build the list of changes between original scope and current client state.
 */
export function buildChanges(
  bundle: ProposalBundle,
  clientState: ClientState
): ClientChange[] {
  const changes: ClientChange[] = [];

  for (const item of bundle.originalScope.items) {
    const isIncluded = clientState.included[item.id];
    const currentQT = resolveQT(item.id, item.roomIndex, clientState);
    const currentPrice = getItemPrice(item.id, item.roomIndex, bundle, clientState);

    // Item was removed
    if (item.included && !isIncluded) {
      changes.push({
        lineId: item.id,
        type: 'removed',
        originalPrice: item.price,
        priceDelta: -item.price
      });
      continue;
    }

    // Item was added (was not in original scope but now included)
    if (!item.included && isIncluded) {
      changes.push({
        lineId: item.id,
        type: 'added',
        priceDelta: currentPrice
      });
      continue;
    }

    // QT changed
    if (isIncluded && currentQT !== item.qualityTier) {
      changes.push({
        lineId: item.id,
        type: 'qt_change',
        from: item.qualityTier,
        to: currentQT,
        priceDelta: currentPrice - item.price
      });
    }
  }

  return changes;
}

/**
 * Group line items by domain → room for the tree display.
 */
export function groupByDomainAndRoom(items: LineItem[]): Map<string, Map<string, LineItem[]>> {
  const tree = new Map<string, Map<string, LineItem[]>>();

  for (const item of items) {
    const domain = item.domain === 'exterior' ? 'Exterior' : 'Interior';
    if (!tree.has(domain)) tree.set(domain, new Map());
    const rooms = tree.get(domain)!;
    if (!rooms.has(item.room)) rooms.set(item.room, []);
    rooms.get(item.room)!.push(item);
  }

  return tree;
}
```

- [ ] **Step 3: Commit**

```bash
git add Claude/ideal-painting-website/lib/proposal-types.ts Claude/ideal-painting-website/lib/proposal-helpers.ts
git commit -m "feat(proposal): add TypeScript types and pure helper functions for proposal configurator"
```

---

## Task 8: QT Selector Component

**Files:**
- Create: `Claude/ideal-painting-website/components/proposal/qt-selector.tsx`

- [ ] **Step 1: Implement the QT selector**

```tsx
// Claude/ideal-painting-website/components/proposal/qt-selector.tsx
'use client';

import type { QualityTier } from '@/lib/proposal-types';

type QTSelectorProps = {
  value: QualityTier;
  availableTiers: QualityTier[];
  isOverride: boolean;        // true if this differs from parent level
  onChange: (qt: QualityTier) => void;
  size?: 'sm' | 'md';
};

const TIER_LABELS: Record<string, string> = {
  QT2: 'QT2 — Economy',
  QT3: 'QT3 — Standard',
  QT4: 'QT4 — Premium',
  QT5: 'QT5 — Showroom'
};

export function QTSelector({ value, availableTiers, isOverride, onChange, size = 'sm' }: QTSelectorProps) {
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-1'
    : 'text-sm px-3 py-1.5';

  return (
    <div className="relative inline-flex items-center gap-1">
      {isOverride && (
        <span className="w-2 h-2 rounded-full bg-secondary shrink-0" title="Overrides parent tier" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as QualityTier)}
        className={`${sizeClasses} rounded border border-outline-variant bg-surface text-on-surface cursor-pointer`}
      >
        {availableTiers.map(qt => (
          <option key={qt} value={qt}>
            {TIER_LABELS[qt] ?? qt}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Claude/ideal-painting-website/components/proposal/qt-selector.tsx
git commit -m "feat(proposal): add QT selector dropdown component"
```

---

## Task 9: Substrate Row Component

**Files:**
- Create: `Claude/ideal-painting-website/components/proposal/substrate-row.tsx`

- [ ] **Step 1: Implement the substrate row**

```tsx
// Claude/ideal-painting-website/components/proposal/substrate-row.tsx
'use client';

import type { QualityTier } from '@/lib/proposal-types';
import { QTSelector } from './qt-selector';

type SubstrateRowProps = {
  lineId: string;
  substrate: string;
  description: string;
  price: number;
  included: boolean;
  effectiveQT: QualityTier;
  parentQT: QualityTier;
  availableTiers: QualityTier[];
  onToggle: (lineId: string) => void;
  onQTChange: (lineId: string, qt: QualityTier) => void;
};

const SUBSTRATE_LABELS: Record<string, string> = {
  walls: 'Walls',
  walls_prime: 'Walls (Prime)',
  ceiling: 'Ceiling',
  ceiling_prime: 'Ceiling (Prime)',
  trim: 'Trim',
  trim_prime: 'Trim (Prime)',
  doors: 'Doors',
  door_frames: 'Door Frames',
  windows: 'Windows',
  baseboard: 'Baseboard',
  stair_risers: 'Stair Risers',
  stair_railing: 'Stair Railing',
  wainscot: 'Wainscot',
  wood_walls: 'Wood Walls',
  wood_ceiling: 'Wood Ceiling',
  arch_elements: 'Architectural Elements',
  builtins: 'Built-Ins',
  cabinets: 'Cabinets',
  closet_shelves: 'Closet Shelves'
};

function formatCurrency(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function SubstrateRow({
  lineId, substrate, description, price, included,
  effectiveQT, parentQT, availableTiers,
  onToggle, onQTChange
}: SubstrateRowProps) {
  const label = SUBSTRATE_LABELS[substrate] ?? substrate;
  const isQTOverride = effectiveQT !== parentQT;
  const deltaPrefix = included ? '\u2212' : '+';

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded ${included ? '' : 'opacity-50'}`}>
      <input
        type="checkbox"
        checked={included}
        onChange={() => onToggle(lineId)}
        className="w-4 h-4 accent-primary shrink-0"
      />

      <div className={`flex-1 min-w-0 ${included ? '' : 'line-through text-on-surface-variant'}`}>
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs text-on-surface-variant ml-2">{description}</span>
      </div>

      {included && availableTiers.length > 1 && (
        <QTSelector
          value={effectiveQT}
          availableTiers={availableTiers}
          isOverride={isQTOverride}
          onChange={(qt) => onQTChange(lineId, qt)}
        />
      )}

      <span className={`text-sm font-mono whitespace-nowrap ${included ? 'text-red-600' : 'text-green-600'}`}>
        {deltaPrefix}{formatCurrency(price)}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Claude/ideal-painting-website/components/proposal/substrate-row.tsx
git commit -m "feat(proposal): add substrate row with checkbox, description, QT override, and price delta"
```

---

## Task 10: Room Group Component

**Files:**
- Create: `Claude/ideal-painting-website/components/proposal/room-group.tsx`

- [ ] **Step 1: Implement the room group**

```tsx
// Claude/ideal-painting-website/components/proposal/room-group.tsx
'use client';

import { useState } from 'react';
import type { LineItem, QualityTier, ProposalBundle, ClientState } from '@/lib/proposal-types';
import { getItemPrice, getItemDescription, resolveQT } from '@/lib/proposal-helpers';
import { QTSelector } from './qt-selector';
import { SubstrateRow } from './substrate-row';

type RoomGroupProps = {
  roomName: string;
  roomIndex: number;
  items: LineItem[];
  bundle: ProposalBundle;
  clientState: ClientState;
  parentQT: QualityTier;
  onToggle: (lineId: string) => void;
  onItemQTChange: (lineId: string, qt: QualityTier) => void;
  onRoomQTChange: (roomIndex: number, qt: QualityTier) => void;
};

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function RoomGroup({
  roomName, roomIndex, items, bundle, clientState,
  parentQT, onToggle, onItemQTChange, onRoomQTChange
}: RoomGroupProps) {
  const [expanded, setExpanded] = useState(false);

  // Compute room subtotal from included items
  let roomTotal = 0;
  for (const item of items) {
    if (clientState.included[item.id]) {
      roomTotal += getItemPrice(item.id, item.roomIndex, bundle, clientState);
    }
  }

  const roomQT = clientState.roomQTs[roomIndex] ?? parentQT;
  const isRoomQTOverride = clientState.roomQTs[roomIndex] !== undefined;

  // Collect all available tiers across items in this room
  const allTiers = new Set<QualityTier>();
  for (const item of items) {
    const opts = bundle.qtOptions[item.id];
    if (opts) opts.availableTiers.forEach(t => allTiers.add(t));
  }
  const availableTiers = [...allTiers].sort() as QualityTier[];

  return (
    <div className="border-b border-outline-variant last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-4 hover:bg-surface-container-low transition-colors"
      >
        <span className="text-xs text-on-surface-variant">{expanded ? '▾' : '▸'}</span>
        <span className="font-medium text-sm flex-1 text-left">{roomName}</span>

        {availableTiers.length > 1 && (
          <div onClick={(e) => e.stopPropagation()}>
            <QTSelector
              value={roomQT}
              availableTiers={availableTiers}
              isOverride={isRoomQTOverride}
              onChange={(qt) => onRoomQTChange(roomIndex, qt)}
            />
          </div>
        )}

        <span className="text-sm font-mono text-on-surface">{formatCurrency(roomTotal)}</span>
      </button>

      {expanded && (
        <div className="pl-6 pb-2">
          {items.map(item => {
            const effectiveQT = resolveQT(item.id, item.roomIndex, clientState);
            const opts = bundle.qtOptions[item.id];
            return (
              <SubstrateRow
                key={item.id}
                lineId={item.id}
                substrate={item.substrate}
                description={getItemDescription(item.id, item.roomIndex, bundle, clientState)}
                price={getItemPrice(item.id, item.roomIndex, bundle, clientState)}
                included={clientState.included[item.id] ?? true}
                effectiveQT={effectiveQT}
                parentQT={roomQT}
                availableTiers={opts?.availableTiers ?? []}
                onToggle={onToggle}
                onQTChange={onItemQTChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Claude/ideal-painting-website/components/proposal/room-group.tsx
git commit -m "feat(proposal): add expandable room group with QT selector and substrate rows"
```

---

## Task 11: Category Group Component

**Files:**
- Create: `Claude/ideal-painting-website/components/proposal/category-group.tsx`

- [ ] **Step 1: Implement the category group**

```tsx
// Claude/ideal-painting-website/components/proposal/category-group.tsx
'use client';

import { useState } from 'react';
import type { LineItem, QualityTier, ProposalBundle, ClientState } from '@/lib/proposal-types';
import { getItemPrice } from '@/lib/proposal-helpers';
import { RoomGroup } from './room-group';

type CategoryGroupProps = {
  category: string;              // "Interior" or "Exterior"
  roomMap: Map<string, LineItem[]>;
  bundle: ProposalBundle;
  clientState: ClientState;
  onToggle: (lineId: string) => void;
  onItemQTChange: (lineId: string, qt: QualityTier) => void;
  onRoomQTChange: (roomIndex: number, qt: QualityTier) => void;
};

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function CategoryGroup({
  category, roomMap, bundle, clientState,
  onToggle, onItemQTChange, onRoomQTChange
}: CategoryGroupProps) {
  const [expanded, setExpanded] = useState(true);

  // Compute category subtotal
  let categoryTotal = 0;
  for (const [, items] of roomMap) {
    for (const item of items) {
      if (clientState.included[item.id]) {
        categoryTotal += getItemPrice(item.id, item.roomIndex, bundle, clientState);
      }
    }
  }

  return (
    <div className="rounded-lg border border-outline-variant overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-4 bg-surface-container-low hover:bg-surface-container transition-colors"
      >
        <span className="text-sm text-on-surface-variant">{expanded ? '▾' : '▸'}</span>
        <span className="font-headline font-semibold text-base flex-1 text-left">{category}</span>
        <span className="font-mono text-base text-on-surface">{formatCurrency(categoryTotal)}</span>
      </button>

      {expanded && (
        <div>
          {[...roomMap.entries()].map(([roomName, items]) => {
            const roomIndex = items[0]?.roomIndex ?? 0;
            return (
              <RoomGroup
                key={roomName}
                roomName={roomName}
                roomIndex={roomIndex}
                items={items}
                bundle={bundle}
                clientState={clientState}
                parentQT={clientState.projectQT}
                onToggle={onToggle}
                onItemQTChange={onItemQTChange}
                onRoomQTChange={onRoomQTChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Claude/ideal-painting-website/components/proposal/category-group.tsx
git commit -m "feat(proposal): add expandable category group (Interior/Exterior)"
```

---

## Task 12: Verification Screen Component

**Files:**
- Create: `Claude/ideal-painting-website/components/proposal/verification-screen.tsx`

- [ ] **Step 1: Implement the verification screen**

```tsx
// Claude/ideal-painting-website/components/proposal/verification-screen.tsx
'use client';

import type { ProposalBundle, ClientChange } from '@/lib/proposal-types';

type VerificationScreenProps = {
  bundle: ProposalBundle;
  changes: ClientChange[];
  originalTotal: number;
  adjustedTotal: number;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
};

function formatCurrency(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getItemLabel(bundle: ProposalBundle, lineId: string): string {
  const item = bundle.originalScope.items.find(i => i.id === lineId);
  if (!item) return lineId;
  return `${item.room} — ${item.substrate.replace(/_/g, ' ')}`;
}

function getChangeIcon(type: string): string {
  if (type === 'removed') return '✕';
  if (type === 'added') return '+';
  return '▲';
}

export function VerificationScreen({
  bundle, changes, originalTotal, adjustedTotal,
  onBack, onConfirm, submitting
}: VerificationScreenProps) {
  const netAdjustment = adjustedTotal - originalTotal;
  const hasChanges = changes.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-headline text-2xl font-bold text-on-surface mb-6">Review Your Selections</h2>

      <div className="flex justify-between items-center mb-6 p-4 rounded-lg bg-surface-container-low">
        <span className="text-on-surface-variant">Original Proposal</span>
        <span className="font-mono text-lg">{formatCurrency(originalTotal)}</span>
      </div>

      {hasChanges ? (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-3">Changes</h3>
          <div className="rounded-lg border border-outline-variant overflow-hidden">
            {changes.map((change, i) => {
              const label = getItemLabel(bundle, change.lineId);
              const icon = getChangeIcon(change.type);
              const isPositive = change.priceDelta > 0;

              return (
                <div key={i} className="flex items-start gap-3 p-3 border-b border-outline-variant last:border-b-0">
                  <span className={`text-sm font-bold mt-0.5 ${change.type === 'removed' ? 'text-red-600' : change.type === 'added' ? 'text-green-600' : 'text-blue-600'}`}>
                    {icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{label}</div>
                    {change.type === 'qt_change' && (
                      <div className="text-xs text-on-surface-variant">
                        {change.from} → {change.to}
                      </div>
                    )}
                    {change.type === 'removed' && (
                      <div className="text-xs text-on-surface-variant">Removed from scope</div>
                    )}
                  </div>
                  <span className={`font-mono text-sm ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
                    {isPositive ? '+' : '\u2212'}{formatCurrency(change.priceDelta)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-lg bg-surface-container-low text-center text-on-surface-variant">
          No changes from original proposal
        </div>
      )}

      <div className="space-y-2 mb-8 p-4 rounded-lg bg-surface-container-low">
        {hasChanges && (
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Net adjustment</span>
            <span className={`font-mono ${netAdjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {netAdjustment > 0 ? '+' : '\u2212'}{formatCurrency(netAdjustment)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>Your Total</span>
          <span className="font-mono">{formatCurrency(adjustedTotal)}</span>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors"
        >
          ← Back to Edit
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="px-6 py-2 rounded bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Confirm & Submit'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Claude/ideal-painting-website/components/proposal/verification-screen.tsx
git commit -m "feat(proposal): add verification screen showing changes vs original scope"
```

---

## Task 13: Main Proposal Configurator

**Files:**
- Create: `Claude/ideal-painting-website/components/proposal/proposal-configurator.tsx`

This is the main component that composes all sub-components and manages client state.

- [ ] **Step 1: Implement the configurator**

```tsx
// Claude/ideal-painting-website/components/proposal/proposal-configurator.tsx
'use client';

import { useState, useCallback } from 'react';
import type { ProposalBundle, ClientState, QualityTier } from '@/lib/proposal-types';
import {
  initClientState, computeTotal, buildChanges, groupByDomainAndRoom
} from '@/lib/proposal-helpers';
import { QTSelector } from './qt-selector';
import { CategoryGroup } from './category-group';
import { VerificationScreen } from './verification-screen';
import { createClient } from '@/lib/supabase/client';

type ProposalConfiguratorProps = {
  bundle: ProposalBundle;
  bundleId: string;
};

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProposalConfigurator({ bundle, bundleId }: ProposalConfiguratorProps) {
  const [clientState, setClientState] = useState<ClientState>(() => initClientState(bundle));
  const [view, setView] = useState<'configure' | 'verify'>('configure');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentTotal = computeTotal(bundle, clientState);
  const changes = buildChanges(bundle, clientState);
  const tree = groupByDomainAndRoom(bundle.originalScope.items);

  // Collect all available tiers across entire project for the project-wide selector
  const allTiers = new Set<QualityTier>();
  for (const opts of Object.values(bundle.qtOptions)) {
    opts.availableTiers.forEach(t => allTiers.add(t));
  }
  const projectTiers = [...allTiers].sort() as QualityTier[];

  const handleToggle = useCallback((lineId: string) => {
    setClientState(prev => ({
      ...prev,
      included: { ...prev.included, [lineId]: !prev.included[lineId] }
    }));
  }, []);

  const handleItemQTChange = useCallback((lineId: string, qt: QualityTier) => {
    setClientState(prev => ({
      ...prev,
      qualityTiers: { ...prev.qualityTiers, [lineId]: qt }
    }));
  }, []);

  const handleRoomQTChange = useCallback((roomIndex: number, qt: QualityTier) => {
    setClientState(prev => {
      // Update room QT and reset any substrate-level overrides in this room
      const newQTs = { ...prev.qualityTiers };
      for (const item of bundle.originalScope.items) {
        if (item.roomIndex === roomIndex) {
          newQTs[item.id] = qt;
        }
      }
      return {
        ...prev,
        roomQTs: { ...prev.roomQTs, [roomIndex]: qt },
        qualityTiers: newQTs
      };
    });
  }, [bundle]);

  const handleProjectQTChange = useCallback((qt: QualityTier) => {
    setClientState(prev => {
      // Reset all room and substrate overrides
      const newQTs: Record<string, QualityTier> = {};
      for (const item of bundle.originalScope.items) {
        newQTs[item.id] = qt;
      }
      return {
        ...prev,
        projectQT: qt,
        roomQTs: {},
        qualityTiers: newQTs
      };
    });
  }, [bundle]);

  const handleRevert = useCallback(() => {
    if (confirm('Reset all changes to the original proposal?')) {
      setClientState(initClientState(bundle));
    }
  }, [bundle]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from('proposal_submissions').insert({
        bundle_id: bundleId,
        original_total: bundle.originalScope.bidPrice,
        adjusted_total: currentTotal,
        changes,
        status: 'pending_review'
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="font-headline text-2xl font-bold mb-2">Scope Submitted</h2>
        <p className="text-on-surface-variant">
          We&apos;ve received your selections and will be in touch shortly to finalize your project.
        </p>
      </div>
    );
  }

  if (view === 'verify') {
    return (
      <VerificationScreen
        bundle={bundle}
        changes={changes}
        originalTotal={bundle.originalScope.bidPrice}
        adjustedTotal={currentTotal}
        onBack={() => setView('configure')}
        onConfirm={handleSubmit}
        submitting={submitting}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-lg bg-surface-container-low">
        <div>
          <h1 className="font-headline text-xl font-bold">{bundle.project.name}</h1>
          <p className="text-sm text-on-surface-variant">{bundle.project.address}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-on-surface-variant">Project Quality Tier</div>
            <QTSelector
              value={clientState.projectQT}
              availableTiers={projectTiers}
              isOverride={clientState.projectQT !== bundle.project.defaultQT}
              onChange={handleProjectQTChange}
              size="md"
            />
          </div>
          <div className="text-right">
            <div className="text-xs text-on-surface-variant">Total</div>
            <div className="font-mono text-2xl font-bold">{formatCurrency(currentTotal)}</div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center mb-4">
        {changes.length > 0 ? (
          <button
            onClick={handleRevert}
            className="text-sm text-on-surface-variant hover:text-on-surface underline"
          >
            Revert to Standard
          </button>
        ) : (
          <span className="text-sm text-on-surface-variant">Original scope — no changes</span>
        )}
        {changes.length > 0 && (
          <span className="text-sm text-on-surface-variant">
            {changes.length} change{changes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tree body */}
      {[...tree.entries()].map(([category, roomMap]) => (
        <CategoryGroup
          key={category}
          category={category}
          roomMap={roomMap}
          bundle={bundle}
          clientState={clientState}
          onToggle={handleToggle}
          onItemQTChange={handleItemQTChange}
          onRoomQTChange={handleRoomQTChange}
        />
      ))}

      {/* Footer */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => setView('verify')}
          className="px-8 py-3 rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity"
        >
          Request This Scope
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Claude/ideal-painting-website/components/proposal/proposal-configurator.tsx
git commit -m "feat(proposal): add main proposal configurator with state management and tree layout"
```

---

## Task 14: Portal Proposal Page

**Files:**
- Create: `Claude/ideal-painting-website/app/(portal)/portal/proposal/page.tsx`

- [ ] **Step 1: Implement the page**

```tsx
// Claude/ideal-painting-website/app/(portal)/portal/proposal/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProposalConfigurator } from '@/components/proposal/proposal-configurator';
import type { ProposalBundle } from '@/lib/proposal-types';

export default async function ProposalPage() {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get user's active project
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!project) {
    return (
      <div className="text-center py-16 text-on-surface-variant">
        No active project found.
      </div>
    );
  }

  // Get the latest active proposal bundle
  const { data: bundleRow } = await supabase
    .from('proposal_bundles')
    .select('id, bundle')
    .eq('project_id', project.id)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!bundleRow) {
    return (
      <div className="text-center py-16 text-on-surface-variant">
        Your proposal is being prepared. Check back soon.
      </div>
    );
  }

  const bundle = bundleRow.bundle as ProposalBundle;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <ProposalConfigurator bundle={bundle} bundleId={bundleRow.id} />
    </div>
  );
}
```

- [ ] **Step 2: Add proposal link to portal sidebar**

In `Claude/ideal-painting-website/components/portal/portal-sidebar.tsx`, find the navigation links array (around line 8–15) and add the proposal link:

```typescript
// Add to the links array:
{ href: '/portal/proposal', label: 'Proposal', icon: 'description' },
```

- [ ] **Step 3: Commit**

```bash
git add Claude/ideal-painting-website/app/(portal)/portal/proposal/page.tsx Claude/ideal-painting-website/components/portal/portal-sidebar.tsx
git commit -m "feat(proposal): add portal proposal page with Supabase data loading"
```

---

## Task 15: End-to-End Verification

- [ ] **Step 1: Run PaintScope tests**

Run: `cd "Claude/tools/paintscope" && npx vitest run`
Expected: All tests pass including new pricing, multi-qt, and proposal-bundle tests

- [ ] **Step 2: Run Next.js type check**

Run: `cd "Claude/ideal-painting-website" && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 3: Run Next.js build**

Run: `cd "Claude/ideal-painting-website" && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit any fixes**

If any fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: resolve build issues from proposal configurator integration"
```

- [ ] **Step 5: Final commit with all changes verified**

```bash
git log --oneline -10
```

Expected: 10+ commits showing the incremental build from pricing engine through portal page.

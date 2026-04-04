# Proposal Configurator — Design Spec

**Date:** 2026-04-04
**Status:** Approved
**Approach:** B — PaintFactor-First Pricing

## Problem

PaintFactor produces workorder-style estimates with 50+ individual tasks, modifier stacks, and internal rate data. Clients need a clean, interactive proposal where they can see what's included, adjust scope and quality, and understand pricing impact — without seeing the internal machinery.

## Overview

An interactive proposal configurator served through the Ideal Painting client portal. PaintFactor computes fully-priced estimates across all quality tiers and exports a self-contained JSON bundle. The portal renders it as a live configurator where clients toggle scope items and quality levels, see pricing update in real time, and submit their selections for review.

## System Architecture

```
PaintFactor (PaintScope)          Supabase              Client Portal
─────────────────────             ────────              ─────────────
1. Project scope entered
2. Estimate engine runs
   (hours + pricing + multi-QT)
3. "Generate Proposal" clicked
4. Bundle exported ──────────►  proposal_bundles    ──► 5. Portal loads bundle
                                                        6. Client configures
                                                        7. "Request This Scope"
                                proposal_submissions ◄── 8. Submission saved
9. Review submission ◄───────── notification
10. Accept → downstream docs
    generated from locked scope
```

---

## Part 1: Pricing Engine (PaintFactor Side)

### Wiring Settings Tab → Estimate Engine

The existing company profile (stored in IndexedDB via `company-db.js`) feeds into `run-estimate.js`. The profile contains:

- **Labor rates**: painter ($25/hr), lead ($35/hr), apprentice ($18/hr)
- **Burden**: labor_burden_pct (30%)
- **Overhead**: overhead_rate_pct (15%)
- **Profit margin**: profit_margin_pct (10%)
- **Crew configs**: array of { name, lead, painter, apprentice } compositions
- **Business rules**: min_job_charge ($500), travel_time_min (30), overtime_multiplier (1.5x), mobilization_charge ($150)

### Pricing Formula

**Per line item:**
```
blended_crew_rate = weighted average of (lead_rate × lead_count + painter_rate × painter_count + apprentice_rate × apprentice_count) / total_crew
burdened_rate = blended_crew_rate × (1 + labor_burden_pct)
labor_cost = hours × burdened_rate
material_cost = gallons × price_per_gallon  (already computed by material-estimates.js)
line_cost = labor_cost + material_cost
```

**Project-level markup (applied once to total, not per line):**
```
subtotal = sum of all line_costs
bid_price = subtotal × (1 + overhead_rate_pct) × (1 + profit_margin_pct)
```

**Business rules applied:**
- `min_job_charge` — floor on bid price
- `mobilization_charge` — added if applicable
- `travel_time_min` — converted to labor cost and added

### Multi-QT Computation

For each substrate in each room, the engine runs the estimate at every available QT level (QT2–QT5, or whatever the spec supports). This produces a per-substrate pricing table with hours, product, coats, method, description, and price for each tier.

Products resolve from `material_systems` based on each QT level — either the auto-assigned product or a manual override. The engine holds all other dimensions constant (application method, texture, height, etc.) and only swaps QT.

### Estimate Output Addition

The existing estimate result gains a `pricing` section:

```javascript
{
  // ...existing specResults, totalHours, materialEstimates...
  pricing: {
    laborRates: { blended: 30, burdened: 39 },
    subtotal: 8450,
    overhead: 1267.50,
    margin: 971.75,
    bidPrice: 10689.25,
    minJobApplied: false,
    mobilization: 150,
    travelCost: 19.50,
    lineItems: [
      {
        room: "Master Bedroom",
        roomIndex: 0,
        domain: "interior",
        areaGroup: "UPSTAIRS",
        substrate: "walls",
        specFamilyId: "SF_DRYWALL_WALL_NC_FINISH",
        description: "2 coats SW Cashmere eggshell, spray + backroll",
        currentQT: "QT3",
        currentPrice: 485,
        options: {
          QT3: { product: "SW Cashmere Eggshell", coats: 2, method: "spray + backroll", description: "...", price: 485 },
          QT4: { product: "SW Emerald Eggshell", coats: 2, method: "spray + backroll", description: "...", price: 680 },
          QT5: { product: "SW Emerald Eggshell", coats: 2, method: "spray + backroll", description: "...", price: 920 }
        }
      }
      // ...more line items
    ]
  }
}
```

---

## Part 2: Proposal Export Bundle

### Bundle Structure

When "Generate Proposal" is clicked in PaintScope, the engine runs the multi-QT pricing pass and produces a self-contained JSON bundle:

```javascript
{
  meta: {
    exportVersion: "1.0.0",
    exportedAt: "2026-04-04T14:22:15.123Z",
    projectId: "proj_abc123",
    source: "PaintScope"
  },

  company: {
    name: "Ideal Painting Company",
    phone: "(989) 657-5446",
    website: "idealpaintingcompany.com"
  },

  project: {
    name: "Smith Residence",
    address: "123 Main St, Midland, MI",
    clientName: "Sarah Miller",
    defaultQT: "QT3",
    domain: "interior",            // "interior" | "exterior" | "both"
    newConstruction: true
  },

  // Immutable snapshot — the "standard" that changes are measured against
  originalScope: {
    bidPrice: 10689.25,
    items: [
      {
        id: "line_0_walls",         // deterministic: line_{roomIndex}_{substrate}
        roomIndex: 0,
        room: "Master Bedroom",
        areaGroup: "UPSTAIRS",
        domain: "interior",
        substrate: "walls",
        included: true,
        qualityTier: "QT3",
        description: "2 coats SW Cashmere eggshell, spray + backroll",
        price: 485
      }
      // ...every paintable substrate in the project
    ]
  },

  // Pre-computed pricing for all QT options per line item
  qtOptions: {
    "line_0_walls": {
      availableTiers: ["QT3", "QT4", "QT5"],
      options: {
        QT3: {
          product: "SW Cashmere Eggshell",
          coats: 2,
          method: "spray + backroll",
          description: "2 coats SW Cashmere eggshell, spray + backroll",
          price: 485
        },
        QT4: {
          product: "SW Emerald Eggshell",
          coats: 2,
          method: "spray + backroll",
          description: "2 coats SW Emerald eggshell, spray + backroll",
          price: 680
        },
        QT5: {
          product: "SW Emerald Eggshell",
          coats: 2,
          method: "spray + backroll",
          description: "2 coats SW Emerald eggshell, spray + backroll",
          price: 920
        }
      }
    }
    // ...keyed by line item ID
  },

  // Uniform color groups — optional at proposal time
  colorAssumptions: {
    ceilings: { colorName: null, colorCode: null, hex: null },
    doors: { colorName: null, colorCode: null, hex: null },
    trim: { colorName: null, colorCode: null, hex: null },
    builtins: { colorName: null, colorCode: null, hex: null },
    other: { colorName: null, colorCode: null, hex: null }
  },

  // Non-substrate charges
  projectCharges: {
    mobilization: 150,
    travelCost: 19.50
  }
}
```

### Description Format

Every line item description follows the pattern:
```
{coats} coat(s) {product_name} {sheen}, {application_method}
```
Examples:
- "2 coats SW Cashmere eggshell, spray + backroll"
- "1 coat SW ProMar 200 flat, spray"
- "2 coats SW Emerald Urethane semi-gloss, brush"

Description is regenerated per QT level since the product and possibly coat count change.

### Export Rules

- **One active bundle per project** — exporting sets previous bundle to `superseded`
- **Bundle is self-contained** — portal never queries PaintFactor directly
- **No internal data leaks** — no task IDs, hourly rates, modifier stacks, or crew details
- **Colors nullable** — proposal works without color selections; re-export when colors assigned
- **Re-export triggers**: scope change, pricing settings change, material override change

---

## Part 3: Interactive Proposal UI (Portal Side)

### Layout Structure

```
Category (Interior / Exterior)
  └─ Room / Elevation
       └─ Flat list of paintable substrates (checkboxes)
```

**Header area:**
- Company branding, project name, address
- Project-wide QT selector (dropdown)
- Live project total
- "Revert to Standard" button

**Tree body:**
- Top-level: Interior / Exterior (expandable, shows category subtotal)
- Second level: Rooms (expandable, shows room subtotal + room-level QT selector)
- Leaf level: Substrate rows with:
  - Checkbox (include/exclude)
  - Product-forward description (updates when QT changes)
  - Delta label showing +/− price impact of toggling
  - Substrate-level QT override (shown on demand, not by default)

### Interaction Behavior

**Checkboxes:**
- Unchecking subtracts item price from total, shows struck-through muted text
- Delta label: checked items show "−$X" (cost to remove), unchecked show "+$X" (cost to add back)
- Category and room subtotals update instantly

**QT Cascade:**
- **Project-wide** (top): changes QT for everything not overridden at room/substrate level
- **Room-level**: overrides project default for that room; indicator dot if differs from project
- **Substrate-level**: inline override, hidden by default for clean UI; indicator dot if differs from room
- Changing QT updates description (product name), price, and delta — all from pre-baked `qtOptions`

**Revert to Standard:**
- One-click reset to `originalScope` values (all checkboxes, all QT selections)
- Confirmation dialog: "Reset all changes to the original proposal?"

### Change Tracking

Portal maintains a `clientChanges` array in local state:

```javascript
[
  { lineId: "line_2_ceiling", type: "removed", originalPrice: 210 },
  { lineId: "line_0_walls", type: "qt_change", from: "QT3", to: "QT5", priceDelta: +435 },
  { lineId: "line_4_baseboard", type: "removed", originalPrice: 95 }
]
```

Every deviation from `originalScope` gets an entry. Reverting clears the array. Drives both live delta display and verification screen.

---

## Part 4: Verification & Submission Flow

### Verification Screen

Clicking "Request This Scope" navigates to a summary view showing:

- **Original proposal total**
- **Changes list** — each deviation clearly described:
  - QT changes: "Master Bedroom Walls: QT3 → QT5 (+$435)" with product swap noted
  - Removed items: "Guest Bath Ceiling: Removed (−$210)"
  - Re-added items (if previously removed then re-added at different QT)
- **Net adjustment** (sum of all deltas)
- **Final total** (original + net adjustment)
- **"Back to Edit"** — returns to configurator with changes preserved
- **"Confirm & Submit"** — locks selections and saves to Supabase

### Submission

On confirm, the portal writes to `proposal_submissions`:
- Bundle ID reference
- Original total
- Adjusted total
- Full `clientChanges` array (immutable once submitted)
- Status: `pending_review`
- Timestamp

If client wants to revise after submitting, they return to the configurator and submit again (new row, not mutation).

---

## Part 5: Data Storage (Supabase)

### proposal_bundles

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
project_id      text NOT NULL
client_name     text
project_address text
bundle          jsonb NOT NULL
status          text DEFAULT 'draft'    -- draft | sent | superseded
created_at      timestamptz DEFAULT now()
sent_at         timestamptz
```

### proposal_submissions

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
bundle_id       uuid REFERENCES proposal_bundles(id)
original_total  numeric NOT NULL
adjusted_total  numeric NOT NULL
changes         jsonb NOT NULL
status          text DEFAULT 'pending_review'  -- pending_review | accepted | revised
submitted_at    timestamptz DEFAULT now()
notes           text
```

### Rules

- One active bundle per project (new export supersedes previous)
- Submissions are immutable once created
- Pending submission against a superseded bundle gets flagged for review

---

## Part 6: Downstream Document Generation

Once a submission is accepted:

| Document | Data Source |
|----------|------------|
| **MSA** | Accepted submission's adjusted total + locked line items |
| **Warranty Certificate** | Final product list from accepted scope |
| **Color Guide** | Populated later when colors assigned (re-export bundle) |
| **Maintenance Guide** | Product list from accepted scope |

Templates already exist in the portal — they receive the accepted submission data.

---

## Build Sequence

1. **Pricing engine** — wire Settings tab into `run-estimate.js`, labor cost + markup calculations, dollar amounts per substrate
2. **Multi-QT computation** — extend estimate engine to run each substrate across all available QT levels, resolve products per tier
3. **Proposal export** — "Generate Proposal" action in PaintScope builds bundle JSON, pushes to Supabase
4. **Interactive proposal UI** — portal component with Category → Room → substrate tree, checkboxes, QT cascade, live totals, change tracking
5. **Verification & submission flow** — review screen, confirm & submit, Supabase persistence

Each piece is independently testable. Steps 1–3 are PaintFactor-side. Steps 4–5 are portal-side.

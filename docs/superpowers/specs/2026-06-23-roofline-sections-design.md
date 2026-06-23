# Roofline sections — design spec

**Date:** 2026-06-23
**Status:** design approved, pending spec review
**Area:** PaintScope exterior estimation (`Claude/tools/paintscope`)

## Problem

The exterior estimator models each elevation as a rectangular box measured to the
eave (`width_ft × height_to_eave_ft`). Everything above the eave is produced by
sub-element "geometry generators": bump-out, dormer, and gable
(`Claude/tools/paintscope/src/engine/derive-elevation.js`).

There is no way to capture the siding that climbs a roof slope above the eave —
the triangular/tapering fields visible on cross-gabled homes where an upper wall
rises along a rake to a peak. The user calls these **roofline sections** (or
ridgeline sections). They are common and currently get eyeballed or dropped.

The existing `gable` sub-element is the closest analog but is wrong for this in
two ways:

1. **Shape.** A gable is a *symmetric* triangle (`0.5 × base × peak`, two rakes).
   A roofline section is *one-sided*: it rises from a lower roofline to a single
   peak and stops — no mirror side coming back down.
2. **Thinness.** The gable emits only siding SF and a rake length. A roofline
   section needs three distinct paintable items, each measured its own way, plus
   its own access/difficulty.

## What these actually are (geometry)

- **One-sided slope** rising from a lower roofline up to a single peak.
- The **base rides the lower roof**, which is itself **sloped** — not horizontal.
- The shape is therefore not fixed:
  - lower-roof pitch ≠ rake pitch → **triangle / trapezoid**
  - lower-roof pitch = rake pitch → the edges run parallel → a uniform
    **diagonal band** of siding.
- These sections are **high up and awkward to measure** directly.

**Conclusion:** no single rigid area formula fits all three cases. Do not model
this as a "smarter gable." Build it around what an estimator can actually capture
in the field, with geometry as an optional assist.

## Paintable items

Each section carries up to three items, by default living on the **rake** (the
sloped top edge with the roof overhang):

| Item   | Unit | Default source                                  |
|--------|------|-------------------------------------------------|
| Siding | SF   | the section area                                |
| Fascia | LF   | the rake edge length (slope length)             |
| Soffit | SF   | rake length × overhang depth                    |

Edge coverage is configurable. Default is **rake only**. Some houses also carry
trim on the horizontal bottom (against the lower roof) or up the tall vertical
side; those are opt-in per edge.

## Approach: hybrid entry (chosen)

Direct entry is the **source of truth**; an optional calculator fills it in when
the geometry cooperates.

- The estimator types `siding_sf`, `fascia_lf`, and a soffit depth (or
  `soffit_sf`) directly — works for any shape, never fights the geometry.
- An optional, collapsible **calculator** takes simple inputs (base, peak height,
  and/or the two pitches) and writes the computed quantities into those same
  fields for the clean triangle/band cases. The estimator can always overwrite.

This mirrors the model's existing "auto-derive + manual override" pattern used
for siding sections and trim throughout `derive-elevation.js`.

## Access and difficulty (the distinguishing requirement)

Unlike bump-out/dormer/gable — which inherit the elevation's single
`access_type` — a roofline section needs its **own height range**, because the
wall below may be a ladder job while the section's peak is a lift job.

Each section stores:

- `height_low_ft`, `height_high_ft` — the bottom and peak heights above grade.
- Derived **access band** from the **high** point (equipment must reach the
  peak), reusing the existing bands: ground 0–8, ladder 8–16, scaffold 16–25,
  lift 25+ (`EXT_ACCESS_TYPES` / `deriveAccessBand`).
- `difficulty_factor` — a labor modifier that **defaults from the access band**
  with a **manual override** for genuinely hard sections (steep pitch, or the
  lower roof blocking where a ladder would be footed).

## Data model

New factory in `Claude/tools/paintscope/src/state/exterior-state.js`:

```js
export function createRooflineSection(overrides = {}) {
  return {
    id: genId('rls'),
    label: 'Roofline Section',

    // Inherit from parent elevation unless overridden
    siding_type: null,
    substrate_state: null,

    // Quantities — direct entry is source of truth (hybrid approach)
    siding_sf: 0,
    fascia_lf: 0,
    soffit_depth_ft: 1.5,   // soffit_sf derives from rake length × this
    soffit_sf: 0,           // optional explicit override

    // Which edges carry roof trim (fascia + soffit)
    edges: { rake: true, bottom: false, vertical: false },

    // Optional calculator inputs (only used to fill the quantities above)
    calc: {
      enabled: false,
      base_ft: 0,
      peak_height_ft: 0,
      lower_roof_pitch: null,  // e.g. 6 (=6/12)
      rake_pitch: null,
    },

    // Access & difficulty — section-specific
    height_low_ft: 0,
    height_high_ft: 0,
    difficulty_override: null,  // null = derive from access band

    ...overrides,
  };
}
```

Add `roofline_sections: []` to `createElevation()` alongside
`bump_outs` / `dormers` / `gables`.

**No migration plumbing.** PaintScope is pre-production (test estimates only, no
live customer data); the factory default is sufficient and back-compat aliases
are not required.

## Derivation

New `deriveRooflineSection(section)` in `derive-elevation.js`, sitting beside
`deriveGable` / `deriveBumpOut` / `deriveDormer`. It returns:

- `sidingSF` — `siding_sf`, or computed from `calc` when enabled.
- `fasciaLF` — rake length (from `fascia_lf`, or `√(run² + rise²)` style compute),
  zeroed unless `edges.rake` (plus bottom/vertical contributions when toggled).
- `soffitSF` — `soffit_sf`, or rake length × `soffit_depth_ft`.
- `accessBand` — `deriveAccessBand` of the band containing `height_high_ft`.
- `difficultyFactor` — `difficulty_override` or the band default.

`deriveElevation` maps `roofline_sections` and folds the quantities into the
existing aggregates (`subSidingSF`, `subTrimLF.fascia`, `subTrimLF.soffit`), the
same way gables/dormers already contribute.

## Key integration challenge: per-section access

Today access is applied **once per elevation**:

- `context-adapter.js` sets `ctx.access_type` and `ctx.height_band` from
  `elevation.access_type` (~line 978).
- `run-estimate-scenario.js` applies `FAC_EXT_ACCESS` off `ctx.access_type`
  (~line 158).

A roofline section needs its emitted siding/fascia/soffit priced under the
**section's own** access band + difficulty, not the parent elevation's. This is
the one genuinely new piece of engine wiring. During planning, choose between:

- **A —** run each section as its own mini-context (clone ctx, override
  `access_type` + a difficulty modifier, price the section's lines there), or
- **B —** extend the modifier stack to accept per-line access/difficulty
  overrides so section lines carry their own band.

Recommendation leans **A** (smaller blast radius, reuses the existing
`FAC_EXT_ACCESS` path with a swapped context key). Confirm during writing-plans.

## Where it lands (placement)

A new **roofline-section sub-element under the elevation** — it inherits
siding/substrate defaults and groups with the wall it sits on, but uniquely owns
its height range, access band, and difficulty.

- Not a smarter gable (wrong shape).
- Not a full peer "Section" entity — these don't need per-section caulking,
  windows, or multiple siding types; inheritance from the elevation covers it.
  (Peer promotion stays available later if those needs appear.)

## UX

In `components/exterior-editor/tabs/SubElementsSection.jsx`, add a "Roofline
Sections" group beside bump-outs/dormers/gables. Each row:

- label;
- quantity fields (siding SF, fascia LF, soffit depth) — direct entry;
- a collapsible "calculator" (base / peak height / pitches) that fills them;
- edge toggles (rake / bottom / vertical);
- height low + high, with the derived access band shown read-only and a
  difficulty override control.

## Scope / non-goals

- No rework of the existing gable, dormer, or bump-out objects.
- No new top-level "Section" entity.
- No per-section caulking, windows, or multiple siding types.
- No automatic shape recognition from photos.

## Open decisions (resolved)

- **Placement:** sub-element with its own access (chosen).
- **Difficulty:** derive-from-band with manual override (chosen).

## Testing

Add a focused suite (parallel to the existing exterior derivation tests):

- `deriveRooflineSection` quantities for direct entry and for the calculator
  (triangle, parallel band, trapezoid).
- Edge toggles drive fascia/soffit on/off correctly.
- Access band derives from the **high** point; difficulty default vs override.
- Integration: a section contributes to elevation siding/fascia/soffit totals and
  its lines are priced under the section's access band (per the chosen wiring).

## Touched files (anticipated)

- `src/state/exterior-state.js` — `createRooflineSection`, elevation array.
- `src/engine/derive-elevation.js` — `deriveRooflineSection`, aggregation.
- `src/engine/context-adapter.js` / `run-estimate-scenario.js` — per-section
  access/difficulty wiring (approach A or B).
- `src/components/exterior-editor/tabs/SubElementsSection.jsx` — UI.
- new test file under `src/engine/__tests__/`.

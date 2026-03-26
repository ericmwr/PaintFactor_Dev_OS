# Stairway Components Panel — Scope UI Design

**Date:** 2026-03-25
**Status:** Design Approved
**Scope:** PaintScope Specialty Tab — Stairway Components

---

## Problem

Stairway painting is currently represented by two simple specialty items (`stair_risers` EA, `stair_railing` EA) that don't capture the full component breakdown or exploit the fact that stair geometry is code-constrained and derivable from riser count. The estimator has no way to express per-component finish differences (risers painted, treads stained, balusters iron), and the system can't derive quantities that building code makes deterministic.

## Design

Replace the two existing specialty items with a single **Stairway Components** panel activated from the Specialty tab. The panel has two sections: a structure input section that drives derivations, and a component list where each derived item has independent finish controls.

The stairwell itself is a standard room — walls use L×W×H with manual deductions via the Structure tab for open sides. Ceiling uses L×W. This panel only handles the stair components within that room.

---

## Section 1: Stairway Structure

Minimal inputs that drive all geometry derivations.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Number of Runs | dropdown: 1, 2 | 1 | If 2, shows per-run riser fields + layout |
| Layout | dropdown: L-shape, U-shape | L-shape | Only shown when runs = 2 |
| Run 1 Risers | number | 0 | Integer count |
| Run 2 Risers | number | 0 | Only shown when runs = 2 |
| Stair Width | number (ft) | 3.5 | Width of the stair tread/run |
| Landing Depth | number (ft) | 0 | Only shown when runs = 2. Landing width = stair width for L-shape, or sum of both run widths for U-shape |

### Code Constants (not editable, used for derivation)

- Riser height: 7.5" (0.625 ft) per IRC
- Tread depth: 10.5" (0.875 ft) per IRC
- Baluster max spacing: 4" per IRC

### Derived Geometry (displayed as reference, not editable)

Per run:
```
total_rise    = risers × 0.625 ft
total_run     = (risers - 1) × 0.875 ft
rake_length   = sqrt(total_rise² + total_run²)
treads        = risers - 1
```

Combined (all runs):
```
total_risers  = run1_risers + run2_risers
total_treads  = total_risers - number_of_runs  (each run loses 1 tread to landing/floor)
total_rake_lf = sum of rake_length per run
```

Baluster derivation:
```
balusters_per_tread = ceil(10.5 / 4) = 3  (at 4" max spacing on 10.5" tread)
total_balusters     = total_treads × balusters_per_tread
```

Newel post derivation:
```
1 run:  2 (top + bottom)
2 runs: 3 (bottom of run 1, landing corner, top of run 2)
        +1 if U-shape (second landing corner)
```

---

## Section 2: Component List

Each component is a row with a derived quantity (overridable) and independent finish controls. Components with 0 quantity are hidden unless the estimator adds them manually.

| Component | UOM | Derived From | Overridable | Opt-in |
|-----------|-----|-------------|-------------|--------|
| Risers | EA | total_risers | Yes | Always shown |
| Treads | EA | total_treads | Yes | Checkbox (often carpet/wood, not painted) |
| Balusters | EA | total_balusters | Yes | Always shown if > 0 |
| Newel Posts | EA | layout-based formula | Yes | Always shown if > 0 |
| Open Handrail | LF | total_rake_lf | Yes | Always shown if > 0 |
| Wall Rail | LF | 0 (manual only) | N/A | Manual add (not derivable) |
| Skirtboard | LF | total_rake_lf × 2 (both sides) | Yes | Always shown |

### Per-Component Finish Controls

Each component row expands to show:
- Substrate State (dropdown: bare wood, factory primed, previously painted, stained, clear coated)
- Quality Tier (dropdown, project default)
- Application Method (dropdown: brush, spray)
- Coating Type (dropdown: paint, stain+clear, stain only, clear only)
- Grain Fill (checkbox, bare wood + paint only)

For **Balusters** additionally:
- Type (dropdown: square, turned, ornate, iron) — major rate driver
- Material (dropdown: wood, iron/metal) — drives primer system

For **Treads** additionally:
- Coating note: floor-rated coating required (not standard trim enamel)

### Override Pattern

Each derived quantity shows:
```
[auto] 14 EA (derived)     ← click to override
[manual] 16 EA ← user entered  [reset to auto]
```

Same pattern as wall SF override — derived value is default, manual takes precedence, reset button returns to derived.

---

## State Shape

New substrate entry in `room.substrates`:

```js
stairway: {
  // Structure inputs
  runs: 1,
  layout: 'l_shape',        // l_shape | u_shape
  run1_risers: 0,
  run2_risers: 0,
  stair_width: 3.5,
  landing_depth: 0,

  // Per-component configs (each has independent finish controls)
  components: {
    risers:       { count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
    treads:       { count: null, count_override: false, enabled: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
    balusters:    { count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false, baluster_type: 'square', material: 'wood' },
    newel_posts:  { count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
    open_rail:    { lf: null, lf_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
    wall_rail:    { lf: 0, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
    skirtboard:   { lf: null, lf_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
  }
}
```

When `count` or `lf` is null and `_override` is false, the derived value is used. When `_override` is true, the stored value is used.

---

## Substrate Catalog Changes

Replace the existing two entries:
```js
// Remove:
{ id: 'stair_risers', ... }
{ id: 'stair_railing', ... }

// Add:
{ id: 'stairway', group: 'Specialty', label: 'Stairway', uom: 'EA',
  autoDerive: null, defaultConfig: { /* full state shape above */ }
}
```

Single checkbox "Stairway" in the Specialty tab activates the entire panel.

---

## Quantity Key Emission

When stairway is active, `quantity-lookups.js` emits per-component PS keys using derived or overridden values:

```
PS_SURFACE_EA.STAIR_RISER        = riser count
PS_SURFACE_EA.STAIR_TREAD        = tread count (only if treads.enabled)
PS_SURFACE_EA.STAIR_BALUSTER     = baluster count
PS_SURFACE_EA.STAIR_NEWEL        = newel post count
PS_SURFACE_LF.STAIR_OPEN_RAIL    = open rail LF
PS_SURFACE_LF.STAIR_WALL_RAIL    = wall rail LF (only if > 0)
PS_SURFACE_LF.STAIR_SKIRTBOARD   = skirtboard LF
```

Each component's substrate state, coating type, and application method feed into the context for its corresponding spec's `applies_when` evaluation.

---

## Component Panel UI

The panel is a custom `StairwayDetailPanel` component rendered when `focusedSubstrate === 'stairway'` in the Specialty tab.

Layout:
1. **Title field** (e.g., "Main Staircase")
2. **Structure section** — runs, risers per run, width, layout, landing depth
3. **Derived summary** — total rise, total run, rake length (read-only reference)
4. **Component list** — expandable rows, each showing derived quantity + finish controls
5. **Stain/clear sub-fields** appear per-component when coating type is stain or clear on bare wood

---

## Migration

For existing projects with `stair_risers` or `stair_railing`:
- Create a `stairway` substrate entry
- Map `stair_risers.ea_manual` to `components.risers.count` with `count_override: true`
- Map `stair_railing.ea_manual` to `components.balusters.count` with `count_override: true` (rough approximation — old railing count becomes baluster count)
- Carry forward substrate_state and coating_type from the old entries
- Remove old `stair_risers` and `stair_railing` substrate entries

---

## What This Does NOT Include

- Stairwell wall/ceiling geometry derivation (handled by standard room model with deductions)
- Sequencing/phasing logic (future — relates to finish groups)
- Access method/modifier derivation from max working height (future)
- Landing baseboard as a derived quantity (estimator enters manually if needed via Trim tab)
- Winder/spiral stairwell derivation (override to manual for these types)

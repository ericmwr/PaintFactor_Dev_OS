# Module + Scenario JSON Shape — Phase 0 Draft

**Status:** Draft for user review. No modules or scenarios authored yet.
**Source of truth:** `Claude/specs/SF_DRYWALL_WALL_NC_FINISH_v1/` (spec.json, production.json, sop_modules.json)
**Goal:** A flat, scannable, reusable shape that lets us edit one rate in one place, scan a scenario in one screen, and produces the same engine output as the current spec — at meaningfully less authoring weight.

---

## The two layers

### Layer 1 — Modules (`Claude/modules/MOD_*.json`)

A module is a small, single-purpose unit of work. One module = one file. Examples:
- `MOD_PROTECT_TRIM_MASKING.json` — mask baseboard, door casings, window casings before wall finish
- `MOD_PREP_INSPECT_REPAIR.json` — inspect, spackle, sand, spot prime, dust wipe (collapsed across QT3/4/5 via per-tier rates)
- `MOD_APPLY_WALL_SPRAY_BACKROLL.json` — cut-in trim, spray, backroll, R1 + R2

Modules know nothing about which scenarios use them. They're library code.

### Layer 2 — Scenario Packs (`Claude/scenarios/SCN_*.json`)

A scenario pack is a recipe: *for this combination of inputs (substrate + state + method + QT), run these modules in this order.* One scenario = one file. Phase 0 scope: 9 scenarios covering interior drywall walls.

Scenarios know which modules to call but don't redefine task content. They're the assembly layer.

---

## Dimensional model

Four estimation dimensions, each narrowing what you know about the surface:

1. **Paintable Item** (`paintable_item` in scenario matches, ctx) — the physical element: baseboard, crown, casing, door slab, window sash, wall field, ceiling field, siding lap, etc.
2. **Substrate** (`substrate` in module applies_when) — the material being coated: wood, mdf, fjp, drywall, fiber cement, metal, etc. Gates material-specific tasks (MDF edge seal, knot prime).
3. **Substrate State** (`substrate_state` in scenario matches) — coating state: SS_BARE, SS_PRIMED_FACTORY, SS_PAINTED_SEMIGLOSS, etc. Controls which scenario fires and which prime modules are needed.
4. **Substrate Condition** (`substrate_condition` in ctx) — physical condition: good (0.7x), fair (1.0x), poor (1.5x). Drives prep intensity as a modifier, not a task selector.

**Categories** (trim, walls, ceilings, etc.) are an engine-level grouping concept — they group paintable items that typically get painted the same way. Not part of the estimation hierarchy.

## QT modifier model

Each task has ONE `rate_per_hour` calibrated to QT3 baseline. The QT modifier scales it:
- QT1: 0.80, QT2: 0.80, QT3: 1.00, QT4: 1.30, QT5: 1.50

**Never** use `rates_by_tier` AND a QT modifier together (double-counts). Exception: QT4/QT5-only tasks that don't exist at QT3 may use `rates_by_tier` with `qt: false`.

---

## Module shape

```json
{
  "module_id": "MOD_PREP_INSPECT_REPAIR",
  "name": "Inspect & Repair Primed Wall",
  "phase": "prep",
  "intent": "After primer cures, inspect for defects revealed by primer, spackle, sand, spot-prime repairs, and dust-wipe before finish coats.",

  "tasks": [
    {
      "task_id": "TSK_INSPECT_PRIMED_WALL",
      "name": "Inspect Primed Wall Surface",
      "ps_key": "PS_SURFACE_SF.WALL_FIELD",
      "uom": "SF",
      "skill_level": "experienced",
      "rate_per_hour": 1500
    },
    {
      "task_id": "TSK_SPACKLE_WALL_DEFECTS",
      "name": "Spackle Wall Imperfections",
      "ps_key": "PS_SURFACE_SF.WALL_FIELD",
      "uom": "SF",
      "skill_level": "experienced",
      "rate_per_hour": 1000
    },
    {
      "task_id": "TSK_SAND_SPACKLE_WALL",
      "name": "Sand Spackled Areas on Wall",
      "ps_key": "PS_SURFACE_SF.WALL_FIELD",
      "uom": "SF",
      "skill_level": "general",
      "rate_per_hour": 1200
    },
    {
      "task_id": "TSK_SPOT_PRIME_WALL",
      "name": "Spot Prime Spackled Areas",
      "ps_key": "PS_SURFACE_SF.WALL_FIELD",
      "uom": "SF",
      "skill_level": "general",
      "rate_per_hour": 1800
    },
    {
      "task_id": "TSK_DUST_WIPE_WALL",
      "name": "Dust Wipe Wall Surface",
      "ps_key": "PS_SURFACE_SF.WALL_FIELD",
      "uom": "SF",
      "skill_level": "general",
      "rate_per_hour": 1000
    }
  ],

  "modifier_eligibility": {
    "qt": true,
    "height": true,
    "texture": false,
    "complexity": true
  },

  "doctrine": "Inspection happens after primer cures because primer reveals defects (telegraphing seams, fastener pops, mud blemishes) that aren't visible on bare drywall. Skipping this module on QT3+ produces visible defects in finish coats. QT2 skips the module entirely (no inspection/repair tier). Rates scale with QT because higher tiers demand finer defect detection."
}
```

### Module field rules

- **`module_id`** — `MOD_<verb>_<noun>` form. Stable across scenarios.
- **`phase`** — one of: `setup | protection | prep | prime | apply | interstage | finish | cleanup`. Same enum as the existing engine, so phaseHours rolls up unchanged.
- **`intent`** — one sentence. What this module is for. Not regulatory, not theoretical.
- **`tasks[]`** — ordered list. Each task has either `rate_per_hour` (flat, QT3 baseline — preferred), `rates_by_coat` (coat-specific), `rates[]` (conditional variants with `applies_when`), or `fixed_minutes` (no quantity). The `rates_by_tier` form is deprecated — use `rate_per_hour` + QT modifier instead. Exception: QT4/QT5-only tasks that don't exist at QT3 may use `rates_by_tier` with `qt: false` to prevent double-counting.
- **`modifier_eligibility`** — which of the 5 modifier categories apply. Default `qt: true, height: true, texture: false, complexity: true, condition: true`. Texture only for apply-phase rolling/spraying. Condition scales prep intensity by substrate physical condition (good=0.7, fair=1.0, poor=1.5). Lets us turn off modifiers per-module.
- **`doctrine`** — 3–8 lines, prose. *What the work is, what triggers it, what the rate assumes.* No regulatory citations unless they directly drive a task being required vs. optional. No theory beyond what an estimator needs to defend the line item.

### Module field rules — what's NOT in a module

- Task-level `applies_when` is allowed for substrate-specific gating (e.g., MDF edge seal only fires when `substrate: ["mdf"]`). Scenario-level `matches` handles broad routing; task-level `applies_when` handles material-specific tasks within a module.
- No `coat_count`. Coats are scenario-controlled (see below).
- No spec_family_id, no variant_id. Modules are spec-agnostic.
- No protection zones. Those live in scenarios.
- No materials. Materials live in scenarios (via `material_systems`).
- No adjacency declarations. Those live in a separate registry (Phase 1+, deferred for now).

---

## Scenario shape

```json
{
  "scenario_id": "SCN_DRYWALL_FINISH_QT4_SPRAY_BACKROLL",
  "name": "Drywall Wall Finish — QT4, Spray + Backroll",
  "domain": "interior",
  "context": "NC",

  "matches": {
    "paintable_item": "drywall",
    "surface": "wall",
    "state": ["SS_PRIMED", "SS_PRIMED_FIELD"],
    "quality_tier": "QT4",
    "application_method": "spray_backroll"
  },

  "modules": [
    "MOD_PROTECT_FLOOR_INSPECT",
    "MOD_PROTECT_TRIM_MASKING",
    "MOD_PROTECT_FIXTURES_SPRAY",
    "MOD_PREP_INSPECT_REPAIR",
    "MOD_PREP_LIGHT_SAND_FULL",
    "MOD_APPLY_CUTIN_CEILING",
    "MOD_APPLY_WALL_SPRAY_BACKROLL",
    "MOD_INTERSTAGE_SAND",
    "MOD_APPLY_WALL_SPRAY_BACKROLL",
    "MOD_CLEANUP_WALL_FINISH"
  ],

  "coat_counts": {
    "finish_coats": 2,
    "interstage_cycles": 1
  },

  "protection_zones": [
    { "zone_id": "floor_full",      "level": "full_cover" },
    { "zone_id": "fixture_covers",  "level": "full_cover" },
    { "zone_id": "trim_edges",      "level": "edge_only" }
  ],

  "material_systems": [
    "SYS_WALL_FINISH_EGGSHELL"
  ],

  "output_state": "SS_PAINTED_EGGSHELL"
}
```

### Scenario field rules

- **`scenario_id`** — `SCN_<substrate>_<verb>_<qt>_<method>` form. One file per scenario.
- **`matches`** — context dimensions the scenario matches against. The orchestrator picks the scenario whose `matches` object best fits the captured room/substrate context. Multiple states allowed; everything else is single-value.
- **`modules[]`** — ordered list of module IDs. **Repetition is meaningful**: listing `MOD_APPLY_WALL_SPRAY_BACKROLL` twice means run the same module twice (R1 then R2). This replaces the current `coatMultiplier` mechanism with explicit ordering — easier to scan, easier to insert interstage between coats. *Alternative: keep `coatMultiplier` semantics by inferring multi-coat from `coat_counts.finish_coats`. Open question — see below.*
- **`coat_counts`** — same as the current `coat_counts` table. Drives the apply/finish multiplier if we keep that semantic.
- **`protection_zones`** — same shape as current spec.json `protection_zones_required`, but keyed by scenario instead of spec. Used by the existing protection resolvers (floor-protection.js, fixture-protection.js) without modification.
- **`material_systems`** — IDs only, references into a shared registry (`Claude/registries/material_systems.json` to be built in Phase 0 task 2). Not embedded inline.
- **`output_state`** — single substrate state this scenario produces. Used for state chaining if/when the orchestrator needs it (Phase 1+).

### What's NOT in a scenario

- No task definitions. Tasks live in modules, period.
- No production rates. Rates live in modules, period.
- No doctrine. Doctrine lives in modules.
- No paintable_items, no required_paintscope_inputs. PS keys come from the tasks inside the modules.

---

## Phase 0 module inventory (planned, ~10 files)

| Module ID | Phase | Tasks | Notes |
|---|---|---|---|
| `MOD_PROTECT_FLOOR_INSPECT` | protection | 1 | Conditional on `floor_type ∈ {finished, partial}` (scenario controls this) |
| `MOD_PROTECT_TRIM_MASKING` | protection | 3 | Mask baseboard, door casing, window casing |
| `MOD_PROTECT_FIXTURES_SPRAY` | protection | 1 | Only included by spray/spray_backroll scenarios |
| `MOD_PREP_INSPECT_REPAIR` | prep | 5 | Collapses TSK_INSPECT_PRIMED_WALL/_QT4/_QT5 + spackle/sand/spot_prime/dust_wipe via `rates_by_tier`. **Single biggest collapse: 9 task rows → 5 tasks.** |
| `MOD_PREP_LIGHT_SAND_FULL` | prep | 2 | Collapses light_sand + vacuum_dust QT4/QT5 variants. Only included by QT4/QT5 scenarios. |
| `MOD_APPLY_CUTIN_CEILING` | apply | 2 | R1 (all QT) + R2 (QT3+, scenario-controlled) |
| `MOD_APPLY_WALL_ROLL` | apply | 4 | cut-in trim + roll, R1 + R2 (smooth + textured rate variants in roll task) |
| `MOD_APPLY_WALL_SPRAY_BACKROLL` | apply | 6 | cut-in trim + spray + backroll, R1 + R2 |
| `MOD_APPLY_WALL_SPRAY_ONLY` | apply | 2 | cut-in trim + spray, no backroll. Only included by QT2/QT3 spray scenarios. |
| `MOD_INTERSTAGE_SAND` | interstage | 2 | Collapses light_sand_between + vacuum, QT4/QT5 rates_by_tier |
| `MOD_CLEANUP_WALL_FINISH` | cleanup | 5 | remove masking + vacuum + remove fixture protection + clean tools + final inspect (rates_by_tier) |

**Total: 11 modules, ~33 tasks.** Compare to current spec: 11 modules, **42 task rate rows**. That's **9 fewer task rows** for the same coverage — the QT-variant collapse and method-variant dedup pay off.

If we choose to express multi-coat via module repetition in the scenario list (instead of `coat_counts.finish_coats`), the apply modules collapse further: `MOD_APPLY_WALL_ROLL` becomes 2 tasks (cut-in + roll, no R2 separate task) and gets listed twice in the scenario. That would push total down to ~28 tasks. **This is the key open question — see below.**

---

## Phase 0 scenario inventory (9 files)

| Scenario ID | QT | Method | Notes |
|---|---|---|---|
| `SCN_DRYWALL_FINISH_QT2_ROLL` | QT2 | roll | 1 coat, no inspect/repair, no light sand, no interstage |
| `SCN_DRYWALL_FINISH_QT2_SPRAY` | QT2 | spray | Single-coat spray-only, no backroll |
| `SCN_DRYWALL_FINISH_QT3_ROLL` | QT3 | roll | 2 coat default, includes inspect/repair |
| `SCN_DRYWALL_FINISH_QT3_SPRAY_BACKROLL` | QT3 | spray_backroll | 2 coats, NC standard |
| `SCN_DRYWALL_FINISH_QT3_SPRAY` | QT3 | spray | Spray-only fallback for QT3 |
| `SCN_DRYWALL_FINISH_QT4_ROLL` | QT4 | roll | + light sand full + interstage |
| `SCN_DRYWALL_FINISH_QT4_SPRAY_BACKROLL` | QT4 | spray_backroll | + light sand + interstage |
| `SCN_DRYWALL_FINISH_QT5_ROLL` | QT5 | roll | + critical inspection rates |
| `SCN_DRYWALL_FINISH_QT5_SPRAY_BACKROLL` | QT5 | spray_backroll | + critical inspection rates |

---

## Engine integration (orchestrator)

`run-estimate-scenario.js` mirrors `run-estimate.js` lines 105–437 but:

1. Loads modules from `Claude/modules/*.json` and scenarios from `Claude/scenarios/*.json` at startup (or pre-bundled like `db-bundle.js`)
2. For each room: build the same context object (quality_tier, application_method, etc.) using the existing `spec-resolution.js` helpers — no changes to dimension capture
3. Match the room's context against scenarios via the `matches` object — pick the best fit. *(Multiple matches = warning. No match = warning + skip, surfaces a gap.)*
4. For each module ID in `scenario.modules[]`: load the module, walk its tasks, look up quantity from `roomQty` via task's `ps_key`, compute hours = quantity / (rate / effectiveTotal modifier)
5. Push results in the same `taskResults[]` shape that `run-estimate.js` produces (same fields: taskId, taskName, phase, moduleName, roomIndex, hours, etc.) so downstream views are unaffected
6. Return the same top-level shape: `{ specResults[], totalHours, totalCrewDays, warnings[], materialEstimates[], pricing }` — `specResults` becomes "scenarioResults" internally but uses the same key for downstream compatibility

The feature flag wraps the whole orchestrator at the call site (`EstimateView.jsx` line 77):

```javascript
import { runEstimate } from '../../engine/run-estimate.js';
import { runEstimateScenario } from '../../engine/run-estimate-scenario.js';

const USE_SCENARIO_RESOLVER = false; // Phase 0 default off; set true to test
const engine = USE_SCENARIO_RESOLVER ? runEstimateScenario : runEstimate;
const est = engine(state, specData, overlayMap, profile);
```

Both orchestrators run on the same project state. To diff: flip the flag, re-render the estimate view, compare totals.

---

## Modifier handling

The new orchestrator does NOT call `computeModifierStack(specFamilyId, ctx, db)` because modules aren't keyed by spec_family_id. Instead, it computes the stack directly from the existing flat modifier registry at `Claude/tools/paintscope/src/data/modifiers.js` (which is already spec-agnostic — it has FAC_HEIGHT, FAC_TEXTURE, EXT_ACCESS_MODIFIERS, etc. as plain objects).

A small helper `computeScenarioModifierStack(module, ctx)` returns the same `{ qt, height, texture, complexity, total }` shape that `modifier-stack.js` produces today, so per-item-compute and downstream code see no difference.

This means:
- `modifier-stack.js` is **kept unchanged** for the legacy resolver
- The new resolver imports from `data/modifiers.js` directly
- Zero risk of cross-contamination between old and new paths

---

## Open questions for user review (4 questions, must resolve before authoring)

### Q1 — Multi-coat representation

How should second coats be represented?

**Option A — Repeat module in scenario list (recommended):**
```
"modules": [
  "MOD_APPLY_WALL_SPRAY_BACKROLL",
  "MOD_INTERSTAGE_SAND",
  "MOD_APPLY_WALL_SPRAY_BACKROLL"
]
```
The apply module contains *one coat's worth* of tasks. The scenario decides how many times to run it. Interstage sanding sits between explicit coat invocations. Pros: scannable, no hidden multipliers, multi-coat is visible at the scenario level. Cons: collapses ~6 R1/R2 task rows but requires the orchestrator to handle module repetition.

**Option B — Keep `finish_coats` multiplier (matches current engine):**
```
"modules": ["MOD_APPLY_WALL_SPRAY_BACKROLL"],
"coat_counts": { "finish_coats": 2 }
```
The apply module contains both R1 and R2 task rows (current shape). The orchestrator multiplies finish-phase modules by `finish_coats`. Pros: 1:1 match with current engine semantics, lower risk of behavior drift in Phase 0 diffs. Cons: keeps the R1/R2 duplication that the new architecture is supposed to remove.

### Q2 — Module file naming

**Option A:** Long descriptive names: `Claude/modules/MOD_APPLY_WALL_SPRAY_BACKROLL.json`
**Option B:** Grouped subdirs: `Claude/modules/apply/wall_spray_backroll.json`
**Option C:** Flat with prefix only: `Claude/modules/MOD_APPLY_WALL_SPRAY_BACKROLL.json` (same as A)

### Q3 — Doctrine location

**Option A:** Inline `doctrine` field in module JSON (recommended). Keeps everything in one file, easy to scan with the rates.
**Option B:** Sibling `.md` file per module. Keeps JSON small. Doctrine becomes more readable as prose.

### Q4 — Material systems

**Option A:** Build the registry in Phase 0 (`Claude/registries/material_systems.json`) so scenarios can reference real material IDs from day one.
**Option B:** Stub material refs in Phase 0 scenarios (just put placeholder IDs), build the registry in Phase 1. Saves authoring time on Phase 0 since Phase 0's go/no-go gate is about engine accuracy, not materials.

---

## Phase 0 success criteria

The architecture passes if and only if all four are true:

1. **Engine output matches:** A diff of `runEstimate` vs `runEstimateScenario` on the same drywall room (any QT × method combination) shows totalHours within ±5% per phase.
2. **Authoring footprint shrinks:** Total JSON line count for modules + scenarios covering drywall wall finish is **fewer lines** than the current spec's `production.json` + `sop_modules.json` + relevant `spec.json` blocks.
3. **Editing one rate touches one file:** Changing `TSK_INSPECT_PRIMED_WALL` rate from 1500 to 1400 SF/hr requires opening exactly one module file, editing one number.
4. **Research-economics signal:** Time spent authoring the 11 Phase 0 modules from the existing spec source is meaningfully less than the time it would take to re-run a spec through the SpecFactory pipeline. *(This is qualitative — user judgment call after seeing the authored modules.)*

If any of these fail, Phase 0 stops and we revisit the architecture before scaling.

# Quality Tier Builder — Design Spec

- **Date:** 2026-06-18
- **Status:** Draft (awaiting review)
- **Author:** Eric, with Claude
- **Supersedes:** the prototype `QTBuilder.jsx` (rate-multiplier grid)
- **Related:** `project_qt_builder_rewrite` (memory), `docs/superpowers/specs/2026-03-23-material-catalog-integration-design.md`, `docs/superpowers/specs/2026-05-16-inline-rate-editing-phase-b-design.md`

---

## 1. Summary

Replace the current QT Builder — a grid that only lets you set a per-task rate *multiplier* per tier — with a **structure-driven tier builder**. For a chosen substrate scenario, the builder presents the quality tiers (QT2–QT5) as a **ladder** built off the QT3 baseline: higher tiers *add* tasks, coats/rounds, and richer materials; lower tiers *trim* them. Per-tier rate edits and per-substrate modifier-value overrides remain available as explicit opt-ins.

The design deliberately stays inside the existing engine's mechanics. Tier-gated tasks (`applies_when: { quality_tier }`), per-tier rates (`rates_by_tier`), and per-tier material matching (`material_systems` via `applies_when.quality_tier`) **already work** in the engine. Only two small engine additions are needed: **per-tier coat counts** (which also drive interstage rounds for free) and **scenario-scoped modifier overrides**. All authoring saves through the existing draft → live-overlay → publish pipeline.

## 2. Problem & motivation

The current `tools/paintscope/src/components/authoring/QTBuilder.jsx` models a tier purely as a rate scalar (`canonical rate × FAC_QT multiplier`, with an optional per-task `fac_qt_override`). That cannot express how real painting tiers actually differ: a QT5 job has *more work* than a QT3 job (extra sanding, an additional coat, an inspection/touch-up pass, premium products), not merely the same work performed at a different rate. The prototype was a placeholder; this spec is the intended rewrite.

(Note: the prototype also has a display-only inversion bug — it shows `rate × mul` instead of `rate / mul`. The engine divides correctly. The bug disappears when the prototype is removed; it is not separately fixed.)

## 3. Goals / Non-goals

**Goals**
- Author, per substrate, how each tier deviates from the QT3 baseline.
- Express tier differences structurally: add/remove tasks, add/remove coats and interstage rounds.
- Allow opt-in per-tier rate on a shared task.
- Allow opt-in override of a modifier's value scoped to the substrate scenario.
- Reserve a per-tier **material assignment** using today's placeholder product IDs, forward-compatible with the planned product catalog.
- Save edits so they take effect immediately (overlay) and persist (publish), reusing existing machinery.

**Non-goals (this version)**
- A family-level or project-level tier grouping/cascade (chosen grain is per substrate). See §16.
- Building the real product catalog or product resolver (placeholders only). See §13.
- Changing how QT3 baselines themselves are authored (that remains the Scenario/Module/Task editors).
- Per-coat differential rates beyond what `rates_by_coat` / `coat_2_rate_multiplier` already provide.

## 4. Key decisions (locked in brainstorming)

1. **Grain: per substrate.** Navigation is by `paintable_item` (Cabinets, Drywall walls, Baseboard…). No new grouping layer above it.
2. **Authoring reach: scenario grain (substrate × method × state).** A scenario already *is* that triple. You enter by substrate, then author one scenario's tier ladder at a time.
3. **Levers, structure-first:** add/remove tasks and add/remove coats/rounds are the default editing surface; per-tier rate and modifier-value override are explicit opt-ins.
4. **Data model: A+ "layer into existing files."** Tier intent is written into the scenario/module/task artifacts the engine already reads; the builder assembles the ladder view from them. No parallel entity, no compile step, no drift.
5. **Ascending inheritance:** adding a task/coat at QTn carries upward to higher tiers; to make something QT5-only you add it at QT5. Trims propagate downward symmetrically.
6. **Interstage rounds auto-derive** as `coats − 1`, per tier, with a per-tier manual override for edge cases (e.g. a single-coat job that still wants one wipe/inspect round).
7. **Materials per tier** are reserved now using placeholder `SYS_*_STUB` IDs, treated as stand-ins until the product catalog is finalized.

## 5. Concepts & vocabulary

- **Baseline (QT3):** the existing authored scenario structure. The ladder is expressed as deltas from QT3.
- **Ascending (QT4, QT5):** QT3 plus added tasks / coats / interstage rounds / richer materials.
- **Descending (QT2, QT1):** QT3 minus trimmed tasks / coats.
- **Tier cell state:** for each (task, tier) one of — **fires** (inherited), **added** (introduced at this tier and up), **skipped** (trimmed at this tier).
- **Interstage round:** one repeat of the between-coats module (wipe, scuff-sand, inspect, touch-up). Count = coats − 1 (auto) unless overridden.

## 6. User workflow

1. Open Authoring → **QT builder** tab.
2. Select **Substrate → Method → From state**; this resolves to one scenario (e.g. `SCN_CABINET_PAINT_SPRAY`, from bare). A progress hint shows how many of the substrate's scenarios have been authored ("4 of 6").
3. The **tier ladder** loads, seeded from the scenario's current (QT3-baseline) structure.
4. Edit by tier:
   - Toggle a task's cell to fire/skip at a tier; add a new task (from the canonical library) gated to a tier and up.
   - Step the **finish coats** per tier; the **interstage rounds** readout updates automatically (coats − 1), or override it.
   - Optionally expand a task to set a **per-tier rate**.
   - Optionally assign **materials** per tier/role from the placeholder list.
   - Optionally **override a modifier value** for this scenario.
5. Edits autosave as drafts and are **live in estimates immediately** (overlay). When satisfied, **Publish to system** writes the canonical files.
6. Move to the next scenario for the substrate, or the next substrate.

## 7. UI design

Single screen, mounted as the `qt` tab in `AuthoringView.jsx` (replacing the old QTBuilder). Inherits PaintScope's dark theme and inline-style conventions. Regions, top to bottom:

**7.1 Navigation bar** — `Substrate`, `Method`, `From state` selects + the resolved `scenario_id` and "N of M scenarios" hint.

**7.2 Legend** — fires / added / skipped / per-tier rate pill.

**7.3 Tier ladder grid** — columns: Task label, QT2, QT3 (anchored "baseline", tinted), QT4, QT5. Rows grouped by phase (Setup / Prep / Prime / Apply / Finish / Cleanup, plus Interstage — see 7.4). Each phase group ends with an "Add task to <phase>…" affordance that opens the canonical Task picker (same picker the Module editor uses), with "create new task" as fallback. A task row carries a small adjustments icon to expand its per-tier rate editor (7.5).

**7.4 Coats & interstage** — within Prime/Apply/Finish, a coats row shows a per-tier stepper. Immediately below, an **Interstage rounds** row shows the derived count (`coats − 1`) badged `auto`, editable to override. The Interstage phase block lists its tasks (wipe, scuff-sand, inspect, touch-up) with per-tier fire/add/skip cells like any phase. A tier with 1 coat shows 0 rounds and its interstage block renders inert (dimmed) regardless of toggles.

**7.5 Per-tier rate (opt-in)** — expanding a task reveals a small per-tier rate input row; a set value shows as an amber pill in that tier's cell. Cleared = inherit the baseline rate + modifiers.

**7.6 Materials per tier (opt-in, placeholder)** — a Materials section with one row per role (Primer, Finish; Sealer/Clear for stain scenarios) and a per-tier dropdown of available placeholder `SYS_*_STUB` systems for the substrate. Labeled as placeholder pending the product catalog.

**7.7 Modifier overrides (opt-in)** — a strip listing any scenario-scoped modifier-value overrides (e.g. `FAC_QT · QT5 ×1.8 (default ×1.5)`), plus an "override another modifier" affordance.

**7.8 Save footer** — overlay status ("Draft — live in estimates now") + **Save draft** / **Publish to system**.

Reference mockups: the tier-ladder screen and the interstage-coupling detail were reviewed and approved during brainstorming.

## 8. Data model (A+)

All tier intent lives in the existing artifact shapes. New fields are additive.

**8.1 Tier-gated task entries (existing mechanism).** In a module's `tasks[]`, an entry's `applies_when.quality_tier` lists the tiers at which it fires:
```json
{ "task_ref": "TSK_CAB_SAND_180", "applies_when": { "quality_tier": ["QT4", "QT5"] } }
```
- No `quality_tier` key → fires at all tiers (baseline).
- A list → fires only at listed tiers. "Added at QT4" = `["QT4","QT5"]`; "skipped at QT2" = list every tier except QT2.

**8.2 Per-tier rate on a shared task (existing mechanism).** On the canonical task:
```json
{ "task_id": "TSK_CAB_SAND_BETWEEN", "rates_by_tier": { "QT3": 32, "QT4": 30, "QT5": 28 } }
```
A tier absent from `rates_by_tier` causes the task to **skip** that tier (engine returns null). The builder writes a full map for tiers where the task fires.

**8.3 Per-tier coat counts (NEW field).** On the scenario:
```json
{ "coat_counts_by_tier": { "QT2": { "finish": 1 }, "QT3": { "finish": 2 }, "QT4": { "finish": 2 }, "QT5": { "finish": 3 } } }
```
Optional per-tier interstage override (otherwise derived as `finish − 1`):
```json
{ "interstage_rounds_by_tier": { "QT2": 1 } }
```

**8.4 Scenario-scoped modifier overrides (NEW field).** On the scenario:
```json
{ "modifier_overrides": { "FAC_QT": { "QT5": 1.8 }, "FAC_HEIGHT": { "STEP": 1.25 } } }
```
Precedence when resolving a factor: **task-level `fac_qt_override`** → **scenario `modifier_overrides`** → **global `FAC_*.factors`**.

**8.5 Per-tier materials (existing matcher, placeholder IDs).** Recommended shape — a scenario-level tier→role→system map so per-scenario tier materials never require mutating shared system definitions:
```json
{ "material_systems_by_tier": {
    "QT2": { "primer": "SYS_TRIM_PRIMER_OIL_STUB", "finish": "SYS_TRIM_FINISH_SEMIGLOSS_STUB" },
    "QT5": { "primer": "SYS_TRIM_PRIMER_OIL_STUB", "finish": "SYS_TRIM_FINISH_PREMIUM_STUB" }
} }
```
This resolves at material-estimate time by quality tier. (See §10.3 for the alternative that reuses `applies_when.quality_tier` on shared system defs with zero engine change, and why the scenario-level map is preferred.)

**Reality of today's placeholders:** the existing `MATERIAL_SYSTEMS` carry roughly **one stub per role per substrate** (e.g. one `..._FINISH_..._STUB`), not econ/standard/premium tier variants. So in v1 the builder either (a) assigns the same stub across tiers (no material differentiation yet — fine; the *structure* still differs), or (b) lets the user create a new placeholder id (e.g. `SYS_TRIM_FINISH_PREMIUM_STUB` above) to mark "a richer product group belongs at this tier." Either way the id is a stand-in the catalog resolver will later map to a real product. No real product data is introduced now.

## 9. How builder edits compile to artifacts

| Builder action | Compiles to |
|---|---|
| Toggle task cell fire/skip per tier | `applies_when.quality_tier` list on the module task entry |
| Add task at QTn (and up) | new module task entry with `applies_when.quality_tier = [QTn..top]` |
| Set per-tier rate on a task | `rates_by_tier` map on the canonical task |
| Step finish coats for a tier | `coat_counts_by_tier[tier].finish` on the scenario |
| Override interstage rounds for a tier | `interstage_rounds_by_tier[tier]` on the scenario |
| Override a modifier value | `modifier_overrides[modId][ctxValue]` on the scenario |
| Assign material per tier/role | `material_systems_by_tier[tier][role]` on the scenario |

## 10. Engine changes

Tasks (§8.1), per-tier rates (§8.2) need **no engine change** — already supported at `run-estimate-scenario.js:824` (task `applies_when`) and `:609` (`rates_by_tier`).

**10.1 Per-tier coats → context (drives coats AND interstage).** Coat expansion reads `ctx[field]` where `field` comes from `scenario.dynamic_coats` (`run-estimate-scenario.js:754–784`); interstage interleaving and the `coat_lt_ctx` gate (`:509`) both key off that same expansion, so rounds = coats − 1 falls out automatically. Change: before the expansion loop, resolve `coat_counts_by_tier[ctx.quality_tier]` into the ctx field that `dynamic_coats` consumes (set in `context-adapter.js` or at the top of the expansion). If `interstage_rounds_by_tier[tier]` is present, use it to override the derived round count.
- **Implementation note / migration:** per-tier coats require the scenario to express coats via the **field-driven `dynamic_coats` form**, not by hard-listing the apply module twice in `modules[]`. Scenarios that currently hardcode repetition must be converted to `dynamic_coats` when given per-tier coats. The builder enforces this on first per-tier coat edit. A one-time sweep may convert existing multi-coat scenarios; scope of that sweep is a planning task.

**10.2 Scenario-scoped modifier override.** `getFactor(bundle, modId, ctxValue)` (`modifier-registry.js:45`) is the global lookup. Thread `scenario.modifier_overrides` into `computeScenarioModifierStack` (called at `run-estimate-scenario.js:800` and `:821`) and into the QT resolution block (`:313–331`). Resolution checks the task override, then the scenario override (`modifier_overrides[modId][ctxValue]`), then `getFactor`. Keep the override out of the rate display the same way `TRADE_MATERIAL` is handled, so estimator columns stay readable.

**10.3 Per-tier materials.** `material-estimates.js` already selects a system by `applies_when.quality_tier` (`:214–215`). Two options:
- **(A) Scenario-level map (recommended, §8.5):** add a small resolution step in `material-estimates.js` that, when `scenario.material_systems_by_tier` is present, picks the system for the active tier/role directly. Keeps per-scenario control; never mutates shared system defs.
- **(B) Reuse `applies_when.quality_tier` on shared system defs:** zero engine change, but editing a shared system's tier scope affects every scenario that references it. Acceptable only where materials are genuinely substrate-global.
Recommendation: (A). Either way, v1 selects from placeholder `SYS_*_STUB` IDs.

## 11. Persistence & save flow

Reuses the existing pipeline end to end:
- **Draft:** edits save to IndexedDB draft stores (`scenario_drafts`, `module_drafts`, `task_drafts`) via the existing `use*Drafts` hooks.
- **Live overlay:** `engine/overlay-loader.js` merges active drafts over the canonical bundle at estimate time, so edits affect estimates immediately without a bundle rebuild.
- **Publish:** the Drafts publish flow POSTs to `/__authoring/publish` (dev vite plugin `vite-plugin-authoring.mjs`), writing canonical JSON to `Claude/{scenarios,modules,tasks}/*.json`; status flips to `published`.
- **Bundle:** `node Claude/scripts/build-scenario-bundle.mjs` regenerates `scenario-bundle.gen.js` for permanent/committed state.

The builder writes scenario-level fields (8.3, 8.4, 8.5) as **scenario** drafts, tier-gated task entries as **module** drafts, and `rates_by_tier` as **task** drafts. Editing one ladder may touch all three draft kinds; the Drafts tab already publishes them together.

## 12. Ascending inheritance semantics

- **Add upward:** introducing a task/coat at QTn sets its tier scope to `[QTn..highest]`. To scope to a single tier, the user explicitly narrows it (e.g. QT5-only).
- **Trim downward:** removing a baseline task at QTn drops QTn (and, by default, lower tiers) from its scope.
- The builder always presents three explicit cell states so inheritance is visible, never implicit. Editing a cell recomputes the `quality_tier` list rather than asking the user to hand-author it.

## 13. Materials: placeholder strategy & forward-compat

- **Today:** assign from the existing `SYS_*_STUB` material systems (~19, roughly one `PRIMER` + one `FINISH` per substrate, defined in `data/scenario-rate-data.js` `MATERIAL_SYSTEMS`). Because tier variants don't exist yet, the builder may also mint new placeholder ids (e.g. `..._FINISH_PREMIUM_STUB`) to mark a richer product group at a higher tier.
- **Treated as placeholders:** every id here is a stand-in for a product group/category until the catalog is finalized; no real product data is introduced.
- **Forward-compatible:** the documented product-catalog integration (`docs/superpowers/specs/2026-03-23-material-catalog-integration-design.md`) resolves `system_id + quality_tier + brand_preference → real product`. The per-tier assignment authored here (tier → role → system id) is exactly the key that resolver consumes; when the catalog lands, the dropdown swaps from stub IDs to real systems/products and the resolver takes over — no change to the authored shape.

## 14. Edge cases & invariants

- **1 coat ⇒ 0 interstage rounds:** interstage block inert for that tier regardless of task toggles. Builder dims it and shows "0 rounds".
- **QT3 is the source baseline:** the ladder is deltas from QT3; QT3's own structure is edited in the Scenario/Module/Task editors, not invented here.
- **QT1:** out of scope unless a substrate's `FAC_QT.factors`/scenarios declare it; builder shows only tiers the scenario's `matches.quality_tier` (and `FAC_QT`) define.
- **Shared tasks across scenarios:** `rates_by_tier` lives on the canonical task and is global to that task; if two scenarios need different per-tier rates for the "same" work, they need distinct tasks (the builder warns when editing a task referenced by multiple scenarios — reuse the existing TaskUsage consequence panel).
- **Tasks that opt out of QT** (`modifier_eligibility.qt === false`) still appear but their per-tier rate column is inert.
- **Scenario without `dynamic_coats`:** per-tier coats unavailable until converted (see §10.1).

## 15. Testing & verification

- **Unit:** edit→compile functions (cell state ⇄ `applies_when.quality_tier`; coats stepper ⇄ `coat_counts_by_tier`; interstage derivation; modifier-override precedence; material tier resolution).
- **Engine:** add cases to the scenario engine suite proving (a) per-tier coats change coat count and interstage rounds together, (b) `modifier_overrides` precedence over global, (c) per-tier material selection.
- **Smoke/parity:** run the existing Drafts smoke gate and the parity suite; a substrate authored with an all-baseline ladder must produce byte-identical estimates to pre-change (no unintended drift).
- **Manual:** verify on the McLeod project at `localhost:5173` — author Cabinets QT2–QT5, confirm estimate deltas and live overlay.

## 16. Migration / removal of old builder

- Replace `components/authoring/QTBuilder.jsx` content; keep the `qt` tab id and label in `AuthoringView.jsx`.
- The old per-task `fac_qt_override` mechanism stays valid (engine still honors it at `:313–331`); the new builder simply doesn't author multiplier overrides as its primary surface. Existing `fac_qt_override` data, if any, continues to work and can be surfaced read-only.
- PaintScope is pre-production: no migration plumbing or backward-compat aliases required for the new scenario fields.

## 17. Out of scope / future

- Family-level or project-level tier cascade (chosen grain is per substrate).
- Real product catalog / product resolver (separate, already-specced effort).
- Viewing all of a substrate's scenarios side by side (v1 is one scenario at a time).
- Per-coat differential rates beyond `rates_by_coat` / `coat_2_rate_multiplier`.

## 18. Resolved decisions

1. **Materials resolution path — DECIDED:** scenario-level `material_systems_by_tier` map (§10.3 option A). Avoids mutating shared system definitions; gives per-scenario tier control.
2. **Existing multi-coat scenario conversion — DECIDED:** convert **lazily**, on the first per-tier coat edit for a scenario. A one-time reported sweep across all scenarios may follow later but is not a prerequisite.
3. **Stain scenarios — RESOLVED (implementation detail, no user action):**
   - The Materials section renders **stain / sealer / clear** role rows for stain/clear-type scenarios, and **primer / finish** for paint scenarios (branch by scenario type).
   - Before enabling per-tier coats on a stain scenario, implementation must verify the new per-tier coat count composes with the existing stain `dynamic_coats` repetition (e.g. `stain_coats`) without double-counting. This is a code-verification gate, not a design decision.
   - Default assumption: stain tiers differ structurally the same way paint tiers do (added coats/steps at higher tiers). Confirm against real stain scenarios during the build.

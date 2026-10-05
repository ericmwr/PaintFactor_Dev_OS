# Exterior, New Construction — Dev Tracker

**Last updated**: 2026-06-24
**Status**: gaps (substrate-state UI is broader than scenario coverage; multiple silent-zero paths)

## Snapshot

Exterior NC fires through the scenario engine via `buildElevationScenarioInputs` → `runScenarioEstimate`. Active spec set is hardcoded in [context-adapter.js:696](../src/engine/context-adapter.js:696). Each elevation emits one input per active NC spec, the scenario matcher gates on `(paintable_item, substrate_state, application_method)`. The 'siding' family routing is wired but **the substrate-state dropdown is universal** across all substrates — so users routinely pick states that have no scenarios authored and get silent zero estimates. Default `application_method` is now `spray_backroll` (changed 2026-06-24); FC/vinyl/aluminum siding have no scenarios for that method, so they silently zero unless overridden.

## Coverage

**Active NC spec IDs** (from [context-adapter.js:696-701](../src/engine/context-adapter.js:696)): `SF_WOOD_SIDING_EXT_NC_PAINT`, `SF_SIDING_FIBERCEMENT_EXT_NC`, `SF_SIDING_ENGINEERED_EXT_NC`, `SF_STUCCO_EXT_NC`, `SF_MASONRY_EXT_NC`, `SF_TRIM_EXT_NC`, `SF_SOFFIT_EXT_NC`, `SF_WINDOW_EXT_NC`, `SF_DOOR_EXT_NC`, `SF_GARAGE_DOOR_EXT_NC`, `SF_CAULK_EXT`, `SF_DECK_EXT`, `SF_FENCE_EXT`, `SF_FOUNDATION_EXT_NC`, `SF_PORCH_CEILING_EXT_NC`, `SF_PORCH_FLOOR_EXT_NC`, `SF_METAL_EXT`.

### Substrate states actually covered by NC siding scenarios (only — repaint states are RP-only by design)

| Family | paintable_item | NC substrate_states with scenarios | Methods covered |
|---|---|---|---|
| wood lap / shingle / cedar / B&B | `siding` | `SS_EXT_BARE_WOOD`, `SS_EXT_PRIMED_FACTORY` | brush_roll, spray, spray_backroll |
| fiber cement lap / panel | `ext_fc_siding` | `SS_EXT_BARE_FIBERCEMENT`, `SS_EXT_PRIMED_FACTORY`, `SS_EXT_PRIMED_FIELD`, `SS_EXT_FACTORY_FINISHED` | brush_roll, spray (**no spray_backroll**) |
| engineered wood (LP) | `ext_eng_siding` | `SS_EXT_BARE_WOOD`, `SS_EXT_PRIMED_FACTORY`, `SS_EXT_PRIMED_FIELD`, `SS_EXT_FACTORY_FINISHED` | brush_roll, spray, spray_backroll |
| vinyl | `ext_vinyl_siding` | (RP-only — no NC scenarios) | — |
| aluminum | `ext_aluminum_siding` | (RP-only — no NC scenarios) | — |
| stucco | `ext_stucco_wall` | `SS_EXT_BARE_MASONRY` (not in UI) | brush, roll, spray_backroll |
| masonry | `ext_masonry_wall` | `SS_EXT_BARE_MASONRY` (not in UI) | brush, roll, spray_backroll |

### NC scenarios per non-siding paintable_item
- `ext_trim` — bare_wood, primed_factory, primed_field
- `ext_soffit` — bare_wood, primed_factory, primed_field
- `ext_door` — bare_wood, primed_factory, bare, bare_metal
- `ext_window` — bare_wood, primed_factory, bare
- `ext_garage_door` — bare_metal, primed_factory
- `ext_porch_ceiling` — bare_wood, primed_factory, primed_field
- `ext_porch_floor` — bare_wood (concrete uses bare_masonry which isn't in UI)
- `ext_foundation` — bare_masonry (not in UI)
- `ext_fence` — bare_wood (paint OR stain)
- `ext_caulk_joint` — joint_complexity-gated, see issue #4
- `ext_metal_railing`, `ext_deck_floor` — **no scenarios authored** (deferred)

## Wired but degenerate (silent-zero candidates in the UI)

| UI field / value | Where exposed | Why it silently zeros |
|---|---|---|
| substrate_state `stained_solid`, `stained_semi` | every section/trim/standalone substrate dropdown | zero scenarios anywhere |
| substrate_state `painted_flat`, `painted_satin`, `painted_semigloss` | every dropdown | only `ext_porch_floor` has them; meaningless on siding/trim/door/etc. AND they're repaint-shaped so they conflict with NC project_type |
| substrate_state `weathered` | every dropdown | siding-only AND RP-only |
| substrate_state `sound_paint`, `chalking`, `failing_paint`, `peeling` | every dropdown | NC has no scenarios for any of these (they're all RP) — user must toggle to RP project_type |
| siding_section `texture_profile` on wood siding | SidingTab | no `FAC_*` modifier exists for wood; only stucco/FC/engineered consume it |
| siding_section `substrate_material` on any siding | SidingTab | 0 scenarios match on it, 0 siding modules gate on it; only soffit/window/porch_ceiling prep modules use it for task-level gates |
| windows / doors `substrate_state` | not exposed in OpeningsTab at all | engine emits null, scenarios that require a state never match |
| siding_type `vinyl`, `aluminum` in NC mode | SidingTab dropdown | both are RP-only families — zero NC scenarios authored |

## Known issues

- [x] **Soffit substrate_state not read** — FIXED 2026-06-24 (this session). Added an `ext_soffit` branch in [context-adapter.js](../src/engine/context-adapter.js:969) that reads `elevation.trim.soffit` directly (substrate_state, substrate_material, soffit_profile, condition_scale). Also skipped the soffit slot in the existing `ext_trim` loop so trim scenarios don't accidentally inherit soffit state. Probe + 374-test vitest suite both green.
- [ ] **No substrate_state UI for windows / doors** — OpeningsTab.jsx exposes type/size/count only. SF_WINDOW_EXT_NC and SF_DOOR_EXT_NC emit ctx.substrate_state = null and silently zero.
- [ ] **Caulk needs `joint_complexity` ctx field** — SCN_EXT_CAULK_BACKER_ROD requires it, the adapter doesn't populate it.
- [ ] **Spray_backroll coverage gap** for fiber cement / vinyl / aluminum siding — now exposed by the 2026-06-24 default change.
- [ ] **Universal substrate-state dropdown** — same 15 options shown for every substrate context regardless of which paintable_item they apply to. Drives most of the silent-zero issues above.

## Open follow-ups

- [ ] **Decide consolidation approach** for the substrate-state dropdown (three options discussed: author missing scenarios; alias painted_*/weathered/etc. to nearest covered state per paintable_item; filter the dropdown per paintable_item). User leaning toward filter + alias hybrid.
- [ ] **`ext_metal_railing` and `ext_deck_floor` scenarios** — paintable_items exist with no scenarios.
- [ ] **NC scenarios for vinyl / aluminum** — currently RP-only.
- [ ] **Hide painted_*/stained_*/weathered from siding/trim dropdowns** if filter approach is chosen.

## Recent changes (newest first)

### 2026-06-24 — Soffit substrate_state bug fixed in buildExteriorCtx
- Added `ext_soffit` branch in [context-adapter.js](../src/engine/context-adapter.js:969) reading `elevation.trim.soffit.{substrate_state, substrate_material, soffit_profile, condition_scale}` directly.
- Also gated the `ext_trim` iteration to skip the soffit slot — prevents `SF_TRIM_EXT_*` from accidentally taking the soffit's state. Fascia/corner_boards/etc. still resolve correctly via the trim loop.
- Verified: probe (NC project with fascia bare_wood + soffit painted_satin → SF_SOFFIT_EXT_NC.ctx.substrate_state = SS_EXT_PAINTED_SATIN, SF_TRIM_EXT_NC.ctx.substrate_state = SS_EXT_BARE_WOOD).
- vitest: 374 / 38 files green.
- Same patch resolves the RP-side equivalent bug — see [exterior-rp.md](exterior-rp.md).

### 2026-06-24 — Data-flow tracer + Understand-Anything graph added
- New script `scripts/trace-fires.mjs` walks scenarios → modules → tasks for a given input ctx and emits the firing chain (md / mermaid / json). Validates the same gaps the audit surfaces, plus shows exact task-level `applies_when` evaluations.
- Ran `/understand` (Understand-Anything plugin) on `src/` scope. Output at `src/.understand-anything/knowledge-graph.json`. 9 architectural layers, 15-step guided tour. Launch interactive dashboard via `/understand-dashboard`.

### 2026-06-24 — Dev tracker created; exterior NC seeded with audit results
- Set up `Claude/tools/paintscope/dev-tracker/` with README + 4 category files.
- Seeded this file with the full substrate-state × paintable_item coverage matrix discovered today via `Claude/tools/paintscope/scripts/audit-exterior-states.mjs`.

### 2026-06-24 — Default exterior `application_method` changed `spray_backbrush` → `spray_backroll`
- Updated 4 source spots: [exterior-state.js:367](../src/state/exterior-state.js:367), [context-adapter.js:900](../src/engine/context-adapter.js:900), [material-estimates.js:337](../src/engine/material-estimates.js:337), [IdentityTab.jsx:66](../src/components/exterior-editor/tabs/IdentityTab.jsx:66).
- Added `spray_backroll` to [enums.js:104](../src/data/enums.js:104) (was missing — caught during verify).
- Wood/engineered siding now match out of the box; FC/vinyl/aluminum silently zero on default — flagged as known issue.

### 2026-06-24 — Audited substrate-state coverage across 166 SCN_EXT_*.json
- 2 UI states have zero coverage anywhere: `stained_solid`, `stained_semi`.
- 3 UI states are porch-floor-only: `painted_flat`, `painted_satin`, `painted_semigloss`.
- 8 scenario states are not exposed in the UI (BARE_MASONRY, BARE_METAL, SURFACE_RUST, SOUND_STAIN, FAILING_STAIN, etc.).
- Audit script saved at `Claude/tools/paintscope/scripts/audit-exterior-states.mjs` — rerun anytime.

## Key files

**State / UI**:
- [exterior-state.js](../src/state/exterior-state.js) — `EXT_SUBSTRATE_STATES`, `EXT_SIDING_TYPES`, `createExteriorState`, `createSidingSection`, etc.
- [ExteriorSection.jsx](../src/components/exterior-editor/ExteriorSection.jsx) — top-level layout (NC/RP toggle, 3 panels)
- [ElevationEditor.jsx](../src/components/exterior-editor/ElevationEditor.jsx) — 5-tab editor + sub-elements
- [tabs/](../src/components/exterior-editor/tabs/) — IdentityTab, SidingTab, TrimTab, OpeningsTab, CaulkingTab, SubElementsSection
- [StandalonePanel.jsx](../src/components/exterior-editor/StandalonePanel.jsx) — foundation, deck, fence, porch, garage, metal

**Engine**:
- [derive-elevation.js](../src/engine/derive-elevation.js) — geometry math, sub-element derivation
- [quantity-lookups-exterior.js](../src/engine/quantity-lookups-exterior.js) — PS key emission per elevation + standalone
- [context-adapter.js](../src/engine/context-adapter.js) — `buildElevationScenarioInputs`, `buildStandaloneScenarioInputs`, `buildExteriorCtx` (3-level cascade), `EXT_SPEC_SUBSTRATE_MAP`
- [material-estimates.js](../src/engine/material-estimates.js) — `computeExteriorMaterialEstimates`, `EXT_COVERAGE_DEFAULTS`, `SPRAY_LOSS_BY_METHOD`

**Data**:
- [scenario-maps.js](../src/data/scenario-maps.js) — `EXT_UI_STATE_TO_SPEC_STATE` mapping
- [enums.js](../src/data/enums.js) — `extApplicationMethods`, etc.

**Scenarios** (NC subset): `Claude/scenarios/SCN_EXT_*_NC_*.json` plus the un-NC-suffixed ones (CAULK, DECK, FENCE, METAL) which double as NC.

**Modules**: `Claude/modules/MOD_*_EXT_*.json` (non-RP-suffixed = NC).

**Audit script**: [audit-exterior-states.mjs](../scripts/audit-exterior-states.mjs)
**Data-flow tracer**: [trace-fires.mjs](../scripts/trace-fires.mjs) — given `(paintable_item, substrate_state, application_method, project_type)`, walks scenarios → modules → tasks and shows the firing chain. Supports `--format md|mermaid|json` and `--show-suppressed`.
**Knowledge graph (code structure)**: `Claude/tools/paintscope/src/.understand-anything/knowledge-graph.json` (607 nodes, 1236 edges, 9 layers, 15-step tour). Generated 2026-06-24 by `/understand` against the src/ scope. Launch dashboard with `/understand-dashboard`.

## Notes for next session

- The user's typical project flow exposes the NC vs RP mismatch (project flagged NC, but section has a repaint substrate_state). The UI does not warn. A simple guard in `buildExteriorCtx` that surfaces a warning when project_type=NC AND substrate_state ∈ {sound_paint, chalking, failing_paint, peeling, weathered, painted_*} would prevent that confusion.
- The user prefers to fix soffit substrate_state next (small, 5-line patch). Confirm before starting.
- `spray_backbrush` is now a still-selectable but coverage-poor option. Treat as a soft-deprecated default but don't remove yet.

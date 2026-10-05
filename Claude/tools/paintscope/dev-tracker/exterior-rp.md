# Exterior, Repaint — Dev Tracker

**Last updated**: 2026-06-24
**Status**: gaps (most coverage exists but UI doesn't expose RP-specific states the engine supports; condition_scale wired but cosmetic in some places)

## Snapshot

Exterior RP fires through the same scenario engine as NC ([buildElevationScenarioInputs](../src/engine/context-adapter.js)), but with a different active spec set when `state.exterior.project_type === 'RP'`. Repaint UI is gated via `isRP` prop and `EXT_RP_SUBSTRATE_STATES` (10 of 15 states — paint/stain repaint states). Each section/trim/standalone gains a `condition_scale` field (GOOD/FAIR/POOR) intended to drive a condition modifier on prep tasks. Active RP scenarios cover the main repaint states well for siding families, but UI-side gaps remain: window/door substrate_state isn't user-editable, soffit substrate_state isn't read by the adapter (shared bug with NC).

## Coverage

**Active RP spec IDs** (from [context-adapter.js:689-695](../src/engine/context-adapter.js:689)): `SF_SIDING_WOOD_EXT_RP`, `SF_SIDING_ALUMINUM_EXT_RP`, `SF_SIDING_VINYL_EXT_RP`, `SF_SIDING_FIBERCEMENT_EXT_RP`, `SF_SIDING_ENGINEERED_EXT_RP`, `SF_STUCCO_EXT_RP`, `SF_MASONRY_EXT_RP`, `SF_TRIM_EXT_RP`, `SF_SOFFIT_EXT_RP`, `SF_WINDOW_EXT_RP`, `SF_DOOR_EXT_RP`, `SF_GARAGE_DOOR_EXT_RP`, `SF_DECK_EXT_RP`, `SF_FENCE_EXT_RP`, `SF_FOUNDATION_EXT_RP`, `SF_PORCH_CEILING_EXT_RP`, `SF_PORCH_FLOOR_EXT_RP`, `SF_METAL_EXT_RP`.

### Substrate states actually covered by RP siding scenarios

| Family | paintable_item | RP substrate_states with scenarios | Methods covered |
|---|---|---|---|
| wood lap / shingle / cedar / B&B | `siding` | `SS_EXT_SOUND_PAINT`, `SS_EXT_CHALKING`, `SS_EXT_FAILING_PAINT`, `SS_EXT_PEELING`, `SS_EXT_WEATHERED` | brush_roll, spray_backroll |
| fiber cement lap / panel | `ext_fc_siding` | `SS_EXT_SOUND_PAINT`, `SS_EXT_CHALKING`, `SS_EXT_FAILING_PAINT`, `SS_EXT_PEELING` | brush_roll, spray (**no spray_backroll**) |
| engineered wood (LP) | `ext_eng_siding` | `SS_EXT_SOUND_PAINT`, `SS_EXT_CHALKING`, `SS_EXT_FAILING_PAINT`, `SS_EXT_PEELING` | brush_roll, spray, spray_backroll |
| vinyl | `ext_vinyl_siding` | `SS_EXT_SOUND_PAINT` only | brush_roll, spray |
| aluminum | `ext_aluminum_siding` | `SS_EXT_SOUND_PAINT`, `SS_EXT_CHALKING` | brush_roll, spray |
| stucco | `ext_stucco_wall` | `SS_EXT_SOUND_PAINT`, `SS_EXT_CHALKING`, `SS_EXT_FAILING_PAINT`, `SS_EXT_PEELING` | brush, roll, spray_backroll |
| masonry | `ext_masonry_wall` | `SS_EXT_SOUND_PAINT`, `SS_EXT_CHALKING`, `SS_EXT_FAILING_PAINT`, `SS_EXT_PEELING` | brush, roll, spray_backroll |

### RP scenarios per non-siding paintable_item
- `ext_trim` — sound_paint, chalking, failing_paint, peeling, bare_wood, primed_field
- `ext_soffit` — sound_paint, chalking, failing_paint, peeling, bare_wood, primed_factory, primed_field
- `ext_door` — sound_paint, failing_paint, peeling, surface_rust (and bare/bare_wood/bare_metal)
- `ext_window` — sound_paint, failing_paint, peeling, bare_wood, primed_factory, bare
- `ext_garage_door` — sound_paint, failing_paint_metal, sound_paint_metal, surface_rust, bare_metal, primed_factory
- `ext_porch_ceiling` — sound_paint, chalking, failing_paint, peeling, bare_wood, primed_factory, primed_field
- `ext_porch_floor` — sound_paint, failing_paint, peeling, `painted_flat`/`painted_satin`/`painted_semigloss`, bare_wood, bare_masonry
- `ext_foundation` — sound_paint, chalking, failing_paint, peeling, bare_masonry
- `ext_fence` — sound_paint, sound_stain, failing_stain, peeling, bare_wood
- `ext_deck_*` (floor/railing/spindle/stair) — sound_stain, failing_stain, peeling, bare_wood
- `ext_metal_gutter`, `ext_metal_ornamental`, `ext_metal_railing` — sound_paint_metal, failing_paint_metal, surface_rust, bare_metal, primed_factory

## Wired but degenerate

| UI field / value | Where exposed | Why it silently zeros |
|---|---|---|
| substrate_state `stained_solid`, `stained_semi` | every dropdown (in RP, these are present per `EXT_RP_SUBSTRATE_STATES`) | zero scenarios anywhere — `SS_EXT_STAINED_SOLID` / `SS_EXT_STAINED_SEMI` never match |
| substrate_state `painted_flat`, `painted_satin`, `painted_semigloss` | every dropdown | only `ext_porch_floor` consumes them — meaningless on siding/trim/door/window/etc. |
| siding_type `vinyl` × any state except `sound_paint` | SidingTab + state dropdown | vinyl_siding only has scenarios for sound_paint |
| siding_type `aluminum` × `failing_paint`/`peeling`/`weathered` | SidingTab | aluminum only covers sound_paint + chalking |
| `condition_scale` on most substrates | every section/trim/standalone (in RP) | FAC_CONDITION modifier exists; need to verify it actually applies to all RP modules (some have `modifier_eligibility.condition: false`) |
| windows / doors `substrate_state` | not exposed in OpeningsTab | engine emits null even in RP mode |
| trim `condition_scale` | TrimTab (per-trim-type) | wiring to FAC_CONDITION not confirmed end-to-end |

## Known issues

- [x] **Same soffit substrate_state bug as NC** — FIXED 2026-06-24 with the NC patch. `buildExteriorCtx` now handles `ext_soffit` directly via `elevation.trim.soffit`. RP soffit scenarios that gate on substrate_state will now match. See [exterior-nc.md](exterior-nc.md) Recent Changes for detail.
- [ ] **Window / door substrate_state** — same as NC, not exposed in UI.
- [ ] **No RP scenarios for spray_backroll on fiber cement / vinyl / aluminum** — same pattern as NC.
- [ ] **`condition_scale` end-to-end audit not done** — the field exists on every RP substrate but module-level `modifier_eligibility.condition` is mixed. Need to verify FAC_CONDITION applies where the UI implies it does.
- [ ] **Stained states never fire** — `SS_EXT_STAINED_SOLID` / `SS_EXT_STAINED_SEMI` have zero scenarios (siding scenarios use `SS_EXT_WEATHERED` for raw wood). UI dropdown still exposes them.

## Open follow-ups

- [ ] Consolidate substrate-state dropdown (same discussion as NC tracker).
- [ ] Stain-coating coverage: deck and fence have stain scenarios (`SS_EXT_SOUND_STAIN`, `SS_EXT_FAILING_STAIN`); siding/trim do not.
- [ ] Verify `condition_scale` flow: UI → ctx → which modules consume it → which `FAC_*` modifier scales which task rate.
- [ ] Decide whether `stained_solid`/`stained_semi` UI options should map to RP stain states for deck/fence and be hidden for paint substrates.

## Recent changes (newest first)

### 2026-06-24 — Soffit substrate_state bug fixed (shared NC+RP patch)
- Same `buildExteriorCtx` patch as NC fixes RP soffit too. See [exterior-nc.md](exterior-nc.md) Recent Changes for the full detail.

### 2026-06-24 — Dev tracker created; exterior RP seeded
- Same session as the exterior NC tracker. Coverage matrix derived from audit script.

### 2026-06-24 — Spray_backroll default change applies in RP too
- The default change in `createExteriorState` ([exterior-state.js:367](../src/state/exterior-state.js:367)) is project-wide, not NC-specific. Affects RP projects identically.
- RP siding's `siding` and `ext_eng_siding` families have spray_backroll scenarios. `ext_fc_siding`, `ext_vinyl_siding`, `ext_aluminum_siding` do not — same silent-zero pattern as NC.

## Key files

Shared with NC — see [exterior-nc.md](exterior-nc.md). RP-specific touchpoints:

- [exterior-state.js](../src/state/exterior-state.js) — `EXT_RP_SUBSTRATE_STATES` (filtered list), `EXT_CONDITION_SCALE`, `condition_scale` field on `createSidingSection` / `createTrimConfig` / etc.
- [SidingTab.jsx](../src/components/exterior-editor/tabs/SidingTab.jsx), [TrimTab.jsx](../src/components/exterior-editor/tabs/TrimTab.jsx), [StandalonePanel.jsx](../src/components/exterior-editor/StandalonePanel.jsx) — `isRP` branches render the condition_scale column + filtered state dropdown
- [ExteriorSection.jsx](../src/components/exterior-editor/ExteriorSection.jsx) — top-bar NC/RP toggle
- RP scenarios: `Claude/scenarios/SCN_EXT_*_RP_*.json`
- RP modules: `Claude/modules/MOD_*_RP.json`
- `FAC_CONDITION` modifier (location TBD — `Claude/modifiers/`)

## Notes for next session

- Most user-reported "estimate not firing" issues will be NC-vs-RP mismatches (project flagged NC, substrate_state is a repaint value). Educate / add UI warning before extending coverage.
- The `condition_scale` field is the most likely candidate for "looks wired but isn't doing anything" — first thing to spot-check on any RP task.
- When fixing the soffit bug, do it once in `buildExteriorCtx` and both NC and RP benefit.

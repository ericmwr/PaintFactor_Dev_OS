# Interior, New Construction — Dev Tracker

**Last updated**: 2026-06-24
**Status**: stable (most mature surface in PaintScope; not audited in this session)

## Snapshot

Interior NC is the most mature category — original 18 SF_*_v1 specs were all interior NC, the spec system retirement moved everything to the scenario engine without breaking it, and the QT Builder + stain model work both targeted this surface. Pipeline: `buildScenarioInputs` → per-room inputs (positive roomIndex 0..N) → `runScenarioEstimate`. Substrate model has 30+ substrate types across 4 groups; 13 are wired in the module architecture. Coat counts vary by quality tier. Pass groups (combined wall+ceiling, finish groups) add an extra ctx layer.

**This file has not been audited end-to-end in the 2026-06-24 session.** Treat coverage claims below as derived from memory + structural reads, not from a fresh scenario-by-scenario grep. Before doing substantive interior NC work, run an equivalent of the exterior audit script over `SCN_INT_*` / non-EXT scenarios and update this file.

## Coverage (high-level — needs audit verification)

**Active spec families** (interior NC, from `SPEC_TO_PAINTABLE_ITEM` in [context-adapter.js](../src/engine/context-adapter.js:139)):

| Category | spec family | paintable_item |
|---|---|---|
| Drywall walls | SF_DRYWALL_WALL_NC_FINISH / _PRIME | drywall |
| Drywall ceiling | SF_DRYWALL_CEILING_NC_FINISH / _PRIME | drywall |
| Door slab interior | SF_DOOR_SLAB_INT_NC | door_slab |
| Door frame | SF_DOOR_FRAME_NC_FINISH / _PRIME | door_frame |
| Window interior | SF_WINDOW_INT_NC | window |
| Window jamb | SF_WINDOW_JAMB_NC_FINISH / _PRIME | window_jamb |
| Window casing | SF_WINDOW_CASING_NC_PAINT / _PRIME | window_casing |
| Door casing | SF_DOOR_CASING_NC_PAINT / _PRIME | door_casing |
| Crown | SF_CROWN_NC_PAINT / _PRIME | crown |
| Chair rail | SF_CHAIR_RAIL_NC_PAINT / _PRIME | chair_rail |
| Shoe mold | SF_SHOE_MOLD_NC_PAINT / _PRIME | shoe_mold |
| Picture rail | SF_PICTURE_RAIL_NC_PAINT / _PRIME | picture_rail |
| Window stool | SF_WINDOW_STOOL_NC_PAINT / _PRIME | window_stool |
| Window apron | SF_WINDOW_APRON_NC_PAINT / _PRIME | window_apron |
| Shadow box | SF_SHADOW_BOX_NC_PAINT / _PRIME | shadow_box |
| Panel mold | SF_PANEL_MOLD_NC_PAINT / _PRIME | panel_mold |
| Baseboard | SF_BASEBOARD_NC_PAINT / _PRIME | baseboard |
| Wainscot panel | SF_WAINSCOT_PANEL_NC | wainscot |
| Wood wall | SF_WOOD_WALL_NC | wood_wall |
| Wood ceiling | SF_WOOD_CEILING_NC | wood_ceiling |
| Arch element | SF_ARCH_ELEMENT_NC | arch_element |
| Built-in | SF_BUILTIN_NC | builtin |
| Cabinet | SF_CABINET_NC_PAINT | cabinet |
| Closet shelf | SF_CLOSET_SHELF_NC | closet |
| Stair riser / railing | SF_STAIR_RISER_NC / SF_STAIR_RAILING_NC | riser, stringer, skirtboard, baluster, newel, open_rail, wall_rail |
| Wood grain fill | SF_WOOD_GRAIN_FILL_NC | grain_fill_surface |

**Interior stain NC** — full coverage added 2026-04-23 (door_casing, window_casing, baseboard, crown, chair_rail, shoe_mold, picture_rail, window_stool, window_apron, shadow_box, panel_mold, window_jamb, window, wainscot, wood_wall, wood_ceiling, arch_element, door_frame, door_slab, stair_riser, stair_railing, stair_tread).

**Room-level protection** — `SF_ROOM_PROTECTION` → `room_protection` paintable_item, fired once per room with active substrates. Driven by `derive-protection-defaults.js` + `room.protection` overrides.

## Wired but degenerate

Unknown — needs audit. Suspected candidates (from memory):
- Some substrates allow `substrate_state` values the scenario engine never matches.
- Stair components have substrate_states wired but not all combinations have scenarios.
- `wood_wall` substrate exists in catalog but routing notes mention "needs wall_material type for spec routing" (memory: [project_wood_wall_substrate.md](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_wood_wall_substrate.md)).

## Known issues

- [ ] **No fresh audit yet** — top of the list. Before substantive interior NC work, run a coverage audit equivalent to the exterior one.
- [ ] **Universal Keepers backlog** — 60 in Notion, 19 orphan + 5 missing per memory [project_universal_keeper_migration.md](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_universal_keeper_migration.md).
- [ ] **Per-coat rates deferred** — coat multiplier is uniform; production needs per-coat scaling. See `Claude/devos/multi_coat_production_architecture.md`.
- [ ] **Per-phase application_method** — substrate.application_method is shared between prime + finish, blocking certain combined-method scenarios. See [project_per_phase_application_method.md](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_per_phase_application_method.md).
- [ ] **Glass mask painter-side dead feature** — 3 painter-side tasks the engine never emits. See [project_glass_mask_painter_side_dead_feature.md](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_glass_mask_painter_side_dead_feature.md).

## Open follow-ups

See project memory `MEMORY.md` — interior NC has the largest backlog. Key items:
- [Finish Groups + Scope Options](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_finish_groups_options.md)
- [Spec Editor Materials](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_spec_editor_materials.md)
- [Color Catalog](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_color_catalog.md)
- [Wood Wall Substrate](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_wood_wall_substrate.md)
- [QT Builder rewrite](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_qt_builder_rewrite.md) — MERGED to main 2026-06-22 @ 300d35c6
- [Stain model](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_stain_model_qt_builder.md) — MERGED to main 2026-06-23 @ 528f12b1

## Recent changes (newest first)

### 2026-06-24 — Dev tracker created
- Stub seeded from memory + spec-routing map. Not audited end-to-end.

(Pre-tracker history: see `git log` and project memory entries above.)

## Key files

**State / UI**:
- [initial-state.js](../src/state/initial-state.js) — `createRoom`, `createCloset`, enums
- [reducer.js](../src/state/reducer.js) — room actions
- [room-editor/RoomEditor.jsx](../src/components/room-editor/RoomEditor.jsx) — 8 tabs (Identity / Structure / Surfaces / Trim / Openings / Specialty / Closets / Protection)
- [room-editor/tabs/](../src/components/room-editor/tabs/)
- [room-editor/SubstrateDetailPanel.jsx](../src/components/room-editor/SubstrateDetailPanel.jsx)

**Engine**:
- [run-estimate-scenario.js](../src/engine/run-estimate-scenario.js)
- [quantity-lookups.js](../src/engine/quantity-lookups.js)
- [context-adapter.js](../src/engine/context-adapter.js) — `buildScenarioInputs`, `SPEC_TO_PAINTABLE_ITEM`, `COMPONENT_EXPANDED_SPECS`, `expandStairwaySpecContexts`, `buildCabinetProtectCtxs`, `buildClosetShelfPaintCtxs`, etc.
- [derive-room.js](../src/engine/derive-room.js)
- [derive-protection-defaults.js](../src/engine/derive-protection-defaults.js)
- [pass-groups.js](../src/engine/pass-groups.js)

**Data**:
- [substrate-catalog.js](../src/data/substrate-catalog.js) — 30+ substrates, 4 groups
- [scenario-maps.js](../src/data/scenario-maps.js)
- [system-catalog.js](../src/data/system-catalog.js)

**Scenarios**: `Claude/scenarios/SCN_*_NC_*.json` (non-EXT-prefixed plus the room_protection scenarios)
**Modules**: `Claude/modules/MOD_*.json` (non-EXT-prefixed)

## Notes for next session

- Run a coverage audit (mirror `audit-exterior-states.mjs` for interior) before claiming "X is wired" in this file.
- Interior is well-trodden — don't add tests or types speculatively. The existing vitest suite (694 / 49 files as of latest main) covers most paths.
- QT Builder + stain are the most recent landings — they're stable on main but represent significant churn worth re-reading recent commits.

# Interior, Repaint — Dev Tracker

**Last updated**: 2026-06-24
**Status**: thin (smaller spec set than NC; not audited in this session)

## Snapshot

Interior RP shares the scenario engine pipeline with NC but uses a smaller, repaint-shaped spec set (`SF_*_INT_RP`). Repaint-specific concepts (existing-paint substrate states, condition-driven prep scaling, repair-density factors) overlap with the patterns in exterior RP — sound_paint / failing_paint / peeling style states drive the prep modules, and a condition modifier scales severity.

**This file has not been audited end-to-end in the 2026-06-24 session.** The spec routing list below is from `SPEC_TO_PAINTABLE_ITEM` in [context-adapter.js](../src/engine/context-adapter.js). Coverage details (which substrate_states have RP scenarios, which methods are wired) need a fresh audit before substantive work.

## Coverage (routing only — needs audit)

| Category | spec family | paintable_item |
|---|---|---|
| Drywall walls | SF_DRYWALL_WALL_INT_RP | drywall_wall |
| Drywall ceiling | SF_DRYWALL_CEILING_INT_RP | drywall_ceiling |
| Trim (generic) | SF_TRIM_INT_RP | trim |
| Door interior | SF_DOOR_INT_RP | int_door |
| Window interior | SF_WINDOW_INT_RP | int_window |
| Stair | SF_STAIR_INT_RP | int_stair |
| Closet | SF_CLOSET_INT_RP | closet |
| Cabinet | SF_CABINET_INT_RP | cabinet |
| Specialty | SF_SPECIALTY_INT_RP | int_specialty |

**Note**: interior RP routing is less granular than interior NC (NC splits trim into baseboard/crown/casing/etc.; RP has a single `SF_TRIM_INT_RP` covering all trim). That's a known asymmetry.

## Wired but degenerate

Unknown — needs audit. Suspected candidates:
- The same substrate-state catalog used for NC may include states no RP scenario consumes (mirror of the exterior pattern).
- `condition_scale` flow likely matches exterior RP (UI-side wired, end-to-end coverage uncertain).
- Specialty items may not have full RP coverage.

## Known issues

- [ ] **No fresh audit yet** — top of the list. Same audit-script pattern as exterior recommended.
- [ ] **Trim granularity asymmetry** — interior NC has per-trim-type specs (baseboard, crown, casing, etc.); interior RP collapses to one `SF_TRIM_INT_RP`. Whether the matcher distinguishes baseboard vs crown work in RP needs verification.
- [ ] **Glass mask painter-side dead feature** — shared with NC. See [project_glass_mask_painter_side_dead_feature.md](../../../../../Users/mowre/.claude/projects/C--Eric-AI-Playground-Claude-Code-Uni/memory/project_glass_mask_painter_side_dead_feature.md).

## Open follow-ups

- [ ] Audit RP scenario coverage per paintable_item × substrate_state.
- [ ] Verify `condition_scale` flow (UI → ctx → modifier → rate).
- [ ] Document trim-granularity behavior (does RP fan out by trim type, or always one bucket?).

## Recent changes (newest first)

### 2026-06-24 — Dev tracker created
- Stub seeded from routing map. Not audited.

## Key files

Shared with interior NC — see [interior-nc.md](interior-nc.md). RP-specific files:
- Spec routing entries in [context-adapter.js](../src/engine/context-adapter.js:207) (SF_*_INT_RP / SF_*_RP mappings)
- RP scenarios: `Claude/scenarios/SCN_*_RP_*.json` (non-EXT-prefixed)
- RP modules: `Claude/modules/MOD_*_RP.json` (non-EXT-prefixed)

## Notes for next session

- Like exterior, expect "estimate not firing" issues to be NC-vs-RP project_type mismatches. The interior toggle lives at the project-setup level (`project.new_construction` flag) — not at a sidebar like exterior.
- Less recent investment here than NC — fewer guarantees about coverage. Run the audit first.

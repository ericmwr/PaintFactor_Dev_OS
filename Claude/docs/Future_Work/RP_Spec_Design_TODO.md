# RP Interior Spec Redesign — Plan B TODO

**Status:** Holding action applied (Option A) 2026-04-21. Plan B deferred until user runs an end-to-end repaint project.

## Background

The interior RP families **DRRP** (door slab), **STRP** (stair), **CLRP** (closet), **SPRP** (specialty) were originally authored with placeholder `ps_key` values that the quantity emission layer (`quantity-lookups.js`) never produces:

| Family | Dead ps_key | Engine actually emits |
|--------|-------------|------------------------|
| DRRP | `PS_OPENING_EA.DOOR_TOTAL` | `PS_OPENING_EA.DOOR_OPENINGS_TOTAL` |
| STRP | `PS_SURFACE_EA.STAIR_FLIGHT` | granular: `STAIR_RISER`, `STAIR_TREAD`, `STAIR_BALUSTER`, `STAIR_NEWEL`, `STAIR_OPEN_RAIL`, `STAIR_WALL_RAIL`, `STAIR_SKIRTBOARD`, `STAIR_STRINGER` |
| CLRP | `PS_SURFACE_SF.CLOSET_WALL` | closets roll into parent `PS_SURFACE_SF.WALL_FIELD`; closet-specific keys: `PS_SURFACE_LF.CLOSET_SHELF`, `PS_META.EA.CLOSETS_TOTAL` |
| SPRP | `PS_SURFACE_EA.SPECIALTY_ITEM` | each specialty substrate has its own keys (fireplace, arch element, etc.) |

These were pre-existing design defects (git history confirms the dead keys were in the inline tasks before task library extraction `e69fac5`). The task library just made them uniform and visible.

## Holding action in place (Option A)

8 interior RP scenarios marked `status: "broken"` with a `broken_reason`. Engine skips them with a console warning and adds a user-visible warning to the estimate output. No silent failures; scenarios can be unflagged one family at a time as each is redesigned.

Scenarios flagged:
- `SCN_INT_DRRP_SOUND`, `SCN_INT_DRRP_FAILING`
- `SCN_INT_STRP_SOUND`, `SCN_INT_STRP_FAILING`
- `SCN_INT_CLOSET_RP_SOUND`, `SCN_INT_CLOSET_RP_FAILING`
- `SCN_INT_SPRP_SOUND`, `SCN_INT_SPRP_FAILING`

## Design decisions captured (per user, 2026-04-21)

### DRRP — Door slab RP

**Decision:** Add per-side emission.

**Work required:**
- Add `PS_OPENING_EA.DOOR_SIDE_TOTAL` (or similar) to `quantity-lookups.js` that sums `count × sides_per_door` for each interior door (rooms → doors.items[]).
- Repoint all DRRP tasks (prime/prep/apply/cleanup/assess/interstage) to this new key.
- Verify against `door_4_panel` etc. variants that have different sides_per_door values.

### STRP — Stair RP

**Decision:** Granular per-component, mirror NC stair spec structure.

**Work required:**
- Split each current single STRP task into per-component tasks: `TSK_STRP_RISER_*`, `TSK_STRP_TREAD_*`, `TSK_STRP_BALUSTER_*`, `TSK_STRP_NEWEL_*`, `TSK_STRP_OPEN_RAIL_*`, `TSK_STRP_WALL_RAIL_*`, `TSK_STRP_SKIRTBOARD_*`, `TSK_STRP_STRINGER_*`.
- Each component gets its own ps_key matching `quantity-lookups.js` emissions (RISER → `PS_SURFACE_EA.STAIR_RISER`, etc.) and its own rate.
- Reference NC stair spec (`SF_STAIR_*_NC`) for component breakdown pattern.

### CLRP — Closet RP

**Decision:** Use closet wall field (SF). Also add CEILING, BASEBOARD, DOOR CASING, and SHELVING coverage.

**Work required:**
- Decide whether closets get their own wall emission (`PS_SURFACE_SF.CLOSET_WALL_FIELD`) split from parent room's `WALL_FIELD`, or if CLRP tasks reuse the parent room's `WALL_FIELD` and accept the overlap with main wall RP scenarios.
  - Recommendation: dedicated closet emission. Avoids double-count and lets closet rates differ from main wall rates (closets have tighter access — user's original doctrine noted "lower rates due to tight access").
- Expand CLRP scope beyond walls. Add tasks for:
  - Closet ceiling (SF, use `PS_SURFACE_SF.CLOSET_CEILING_FIELD` new emission)
  - Closet baseboard (LF, new emission)
  - Closet door casing (LF, new emission)
  - Closet shelving (LF, already emitted: `PS_SURFACE_LF.CLOSET_SHELF`)
- Each with its own tasks, task_refs, and rate. Likely multiple modules per scope segment rather than one catchall.

### SPRP — Specialty RP

**Decision:** Per-substrate tasks like NC side.

**Work required:**
- Enumerate all specialty substrates in `substrate-catalog.js` (fireplace, stone fireplace, arch elements, beams, wainscot variants, wood walls/ceilings, etc.).
- For each, author its own RP task set referencing the substrate's existing NC ps_keys.
- Retire the generic `SPRP` family naming — it was too broad.

## Estimated effort

- DRRP: 2-3 hours (single new emission, mechanical task updates)
- STRP: 4-5 hours (8 components × ~4 tasks each = 32 tasks, but mostly copy-adapt from NC)
- CLRP: 6-8 hours (multiple new emissions, scope expansion, rate tuning)
- SPRP: full audit — 1 day+ (depends on how many specialty substrates exist and their current RP gap coverage)

Total rough estimate: 2-3 days of focused work. Start with DRRP as smallest and most contained win.

## Verification plan (when ready)

1. Build a test project with every affected RP substrate present
2. Run estimate, verify each RP scenario fires and produces non-zero hours
3. Cross-check rates against painter reference tables
4. Remove `status: "broken"` one scenario at a time as each family is validated

## Related files

- `Claude/tasks/TSK_DRRP_*`, `TSK_STRP_*`, `TSK_CLRP_*`, `TSK_SPRP_*`
- `Claude/modules/MOD_*_DRRP*`, `MOD_*_STRP*`, `MOD_*_CLRP*`, `MOD_*_SPRP*`
- `Claude/scenarios/SCN_INT_DRRP_*`, `SCN_INT_STRP_*`, `SCN_INT_CLOSET_RP_*`, `SCN_INT_SPRP_*`
- `Claude/tools/paintscope/src/engine/quantity-lookups.js` (emissions)
- `Claude/scripts/extract-all-tasks-to-library.mjs` (hardcoded FAMILY_PS_KEYS — keep in mind if re-running extraction)

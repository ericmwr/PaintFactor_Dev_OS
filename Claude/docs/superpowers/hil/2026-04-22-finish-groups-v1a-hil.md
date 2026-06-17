# Finish Groups V1a — HIL Verification Log

**Date:** 2026-04-22
**Branch:** `claude/cranky-saha`
**Spec:** [docs/superpowers/specs/2026-04-22-finish-groups-v1a-design.md](../specs/2026-04-22-finish-groups-v1a-design.md)
**Plan:** [docs/superpowers/plans/2026-04-22-finish-groups-v1a.md](../plans/2026-04-22-finish-groups-v1a.md)

---

## Status

V1a implementation complete through Phase 8 (mismatch warning). Phases 9-10 defer the live-app numeric HIL to the user because the McLeod fixture lives in the user's localStorage, not in the repo.

## Test-suite regression coverage

As of the final V1a commit, the repo test suite is **56 passing** across 5 files:

- `finish-group.test.js` — **23 tests** (new in V1a)
- `pass-groups.test.js` — **20 tests** (walls+ceiling combined prime + combined finish)
- `multi-qt.test.js` — **7 tests**
- `pricing.test.js` — **6 tests**
- (proposal-bundle, etc.)

All previous pass-groups tests continue to pass, which is the strongest surrogate for "McLeod regression preserved" short of running the fixture itself:

- Combined prime resolver precheck — unchanged
- Combined finish resolver precheck — unchanged
- Pre-authored scenario matching — unchanged
- Adapter precedence between pre-authored and dynamic groups — new test passes (finish-group.test.js §precedence)

## Defensive invariants verified

The V1a gates only activate when `pass_group_id` is truthy:

```jsonc
"applies_when": { "pass_group_id": [null] }
```

For a McLeod-style project with no `finish_group` assignments on any trim items, the adapter emits per-substrate inputs with `pass_group_id = null` (via `normalizePassGroupCtx`). The gated tasks therefore fire normally — preserving existing baseline behavior.

**Files modified in V1a that affect McLeod path:**
- `Claude/modules/MOD_SETUP_TRIM_PAINT_PROTECT.json` — gates on `pass_group_id: [null]`
- `Claude/modules/MOD_INTERSTAGE_TRIM.json` — gates on `pass_group_id: [null]`
- `Claude/modules/MOD_CLEANUP_TRIM_PAINT.json` — gates on `pass_group_id: [null]`
- `Claude/tools/paintscope/src/engine/context-adapter.js` — adds `memberToItemGroup` branch; walls+ceiling path unchanged

Given the null-check semantics, McLeod should produce identical output to the pre-V1a state. The final numeric check is left to the user's localStorage-backed run.

## User verification steps (live-app)

1. **McLeod regression (expected: 507.43h preserved)**
   - Open the app at http://localhost:5183 (or whichever port the preview is on)
   - Load the McLeod project
   - Export/inspect total hours — should still read **507.43h**
   - If it differs, the adapter or gate logic has a regression; run `git log --oneline pre-finish-groups-v1a..HEAD` and bisect

2. **Finish group smoke test**
   - Create a test room with:
     - Baseboard, crown, door_casing → default finish_group = `C`
     - Door_frames with coating_type = `stain_clear` → default finish_group = `D`
     - Mantel (if available) with coating_type = `stain_clear` → finish_group = `D` (needs manual assign since mantel starts as paint typically)
   - Confirm the RoomEditor header badge shows `C (3 items) · D (2 items)`
   - Change door_casing finish_group to `E` → badge updates to `C (2 items) · D (2 items) · E (1 item — singleton)`
   - Run estimate; verify pass-group line items appear

3. **Stain-package numeric check**
   - With 3+ trim items in Group C AND door_frames + something else in Group D, compare total hours against the same project structure without finish_group assignments
   - Expected: **lower** with groups (shared setup/interstage/cleanup dedups)
   - The difference is hard to predict numerically without painter data calibration — V1a ships the primitive; V2 adds rate bumps

4. **Mismatch warning**
   - In a Group C, set baseboard coating_type = paint and door_casing coating_type = stain_clear
   - Open browser DevTools Console
   - Reload the app
   - Expect: `[finish-group] Warning: group C has mixed coating_type (paint, stain_clear) — likely authoring mistake; pooling anyway.`

## Known V1a limitations (documented in spec §14)

These are NOT bugs — they're explicit scope boundaries:

1. **Non-trim substrates double-count** — Finish_group members outside the trim family (builtins, stairway, wood_wall, wood_ceiling, wainscoting, beams, columns, mantels, door_frames, door_slabs, windows) currently run their own setup/interstage/cleanup without gates. Putting these in a finish_group shows the group-level shared setup AND their per-substrate setup. V1b work.
2. **No rate bumps** — Combined apply doesn't get the continuous-flow speedup yet. Needs painter data.
3. **No edge cost** — Adjacent items in different groups don't yet trigger extra masking/cut-in work.
4. **No color phase transition cost** — Multiple groups in a room don't add setup time per group boundary.
5. **Accent walls** — Walls substrate splitting orthogonal; accent walls still require the combined-finish toggle path.

## Change log

| Commit | Summary |
|---|---|
| `355b0ff` | defaultFinishGroupForCoatingType helper |
| `9ea5aca` | createSubstrateConfig seeds finish_group |
| `f6bba94` | v1.7 migration seeds existing rooms |
| `66838f4` | Reducer re-seeds on coating_type flip |
| `281b153` | Finish Group dropdown in SubstrateDetailPanel |
| `73b3afa` | Room summary badge in RoomEditor |
| `1c9f93d` | pass_groups registry v1.1.0 |
| `3fc3164` | resolveItemAssignmentGroups dynamic resolver |
| `a0d94f2` | Precedence test |
| `5ddde3b` | Adapter threads finish_group_assignment |
| `245607d` | Shared modules + SCN_COMBINED_FINISH_GROUP_V1A |
| `8ad3cab` | applies_when gates on trim setup/interstage/cleanup |
| `b2452ed` | Mismatch warning |

Checkpoint tag: `pre-finish-groups-v1a` (pre-V1a state for rollback).

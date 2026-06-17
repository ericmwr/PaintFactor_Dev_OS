# Sequencing Engine — Concept Note

**Status:** Idea capture, 2026-04-25. Not scoped for build.
**Origin:** Brainstormed while scoping the protection workflow (the user-driven replacement for the abandoned `stain_protection_state_model.md` auto-derivation approach).
**Depends on:** Decluttering work in progress (separate session) — paintable-item modules cleaned of protection/cleanup/adjacency tasks. Protection workflow user-driven, not engine-derived.

## What this is

A sequencing/project-management layer on top of PaintFactor's existing data — production rates per task, quantities per item, substrate library, drying behavior — that **auto-builds a Gantt of the job's execution** and exposes it in two views:

1. **Estimate-time** — the estimator marks intended sequence; the engine prices known out-of-sequence work into the proposal; the planned sequence becomes part of the customer agreement.
2. **Post-sale** — the same Gantt rides on the crew's work order so the field knows the intended order of operations and why each block is sized the way it is.

Same engine, two views.

## The unlock — cost of disorder

The industry doesn't price disorder well. Out-of-sequence work has a real cost — dead time when a room can't be progressed because finish is curing and no other tasks fit there — but estimators today eyeball it or eat it. With production rates + quantities + dry times in the spec data, this cost can be **computed** rather than guessed.

Once the agreed sequence is contractual, deviations during execution become **recordable events** with a documented cost basis: a real change-order mechanism for disorder, not a soft argument with the GC.

## How the math sketches out

For each substrate × phase block:

- `duration = quantity / production_rate`
- `block_end + dry_time = next_eligible_start_for_same_surface`

Walking the agreed sequence:

- After spraying all ceilings, by the time the last room is sprayed the first room is dry → loop back for coat 2 with no idle time.
- Move to next phase (trim prep → fill fastener holes). Spackle drying time gates the sand step the same way.
- Repeat. Blocks pack into workdays; each day carries a fixed setup/teardown overhead.

Out-of-sequence work runs on the same math, but the dry-time gap **can't be filled** because the rest of the job isn't co-located:

- Room with 40 LF of baseboard, sprayed.
- Spray duration is short; finish-cure window is long.
- During cure, no other work on the job is reachable → that gap is dead time → that dead time is the OOS cost.

## Trigger model — user-driven

Out-of-sequence classification is **fully user-driven**, based on real project context (GC sequencing, owner constraints, contractor coordination). The engine doesn't try to detect discontinuities — it prices what the user marks.

Example: GC has framers still in the addition. Estimator knows trim work there can't run during the main trim phase, flags those rooms as out-of-sequence at estimate time. Engine computes the OOS premium. Customer signs off on both the cost and the planned sequence as part of the proposal.

## Contractual dimension

Captured at project start:

- Agreed sequence (the planned Gantt).
- OOS items and their priced premium.
- Sequence assumptions ("addition rooms accessible by Tuesday").

If reality deviates — something supposed to be in-sequence falls out — there's a **recordable consequence**: timeline impact + cost impact, both grounded in the same engine that built the original estimate. This is the contractual lever.

## Inputs already available

- Per-task production rates (substrate/QT/method/coat modifiers) — populated for interior paint, partial for stain/exterior.
- Quantities — emitted from PaintScope per substrate/room.
- Substrate cure/recoat times — partially in materials.json (`drying_time` fields), needs auditing for completeness.

## Open questions / not yet decided

- **Block granularity** — substrate × phase × room, or substrate × phase across all rooms? Probably batched (e.g., spray all ceilings) for in-sequence and per-room for OOS.
- **Workday packing rules** — fixed hours per day, daily mobilization overhead, lunch, end-of-day cleanup pre-block.
- **Dry-time data ownership** — per-product (materials) or per-task (production)? Some tasks span multiple products.
- **Re-baselining vs deviation** — GC mid-job calls and customer agrees to a new sequence → re-baseline (no penalty). Crew arrives and discovers an unexpected blocker → deviation (priced). UI needs to distinguish intent.
- **Visualization** — Gantt for crew (day-by-day timeline) vs cost-stack for estimator (where the disorder dollars go). Same data, different framing.

## Dependencies before this can be built

- Decluttering complete (in-flight, separate session).
- Protection workflow shipped and stable (user-driven, currently being scoped).
- Production rates filled in for stain + exterior tasks (`project_null_rate_tasks.md` outstanding work).
- Dry-time data audited across materials.json.

## Why park it now

The protection workflow ships first. Sequencing is a layer on top of clean substrate/protection data; building it before that data settles means reworking it twice. Capturing the idea so it doesn't evaporate.

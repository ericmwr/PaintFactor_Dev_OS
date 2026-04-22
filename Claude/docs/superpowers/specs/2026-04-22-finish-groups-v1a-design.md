# Finish Groups V1a — Design Spec

**Date:** 2026-04-22
**Branch:** `claude/cranky-saha`
**Status:** Design approved; ready for implementation planning
**Scope:** Item-level `finish_group` assignment on every paintable item + dynamic resolver that pools same-group items into one coordinated pass. Extends the pass-group primitive shipped on 2026-04-21. Walls/ceiling UX unchanged.

---

## 1. TL;DR

Every paintable item in a room gets a `finish_group` field (`A`–`F`). The pass-group resolver pools all items in a room sharing a finish_group value into one coordinated pass — shared setup/cleanup/interstage, per-member prep, pooled apply. Grouping is declared at scope time via a per-item dropdown; no dependence on knowing product/color/sheen.

Architecturally unified: every item (including walls and ceiling) gains the field in the data model from day one. Visually parallel: in V1a the UI only surfaces the dropdown on non-wall/ceiling items; walls and ceiling continue to be driven by the shipped combined-finish toggle, which silently writes finish_group values (`A` for walls always, `A` for ceiling when toggle ON, `B` when OFF). The existing pre-authored combined-finish scenarios keep running for walls+ceiling; the new dynamic resolver handles everything else. Domains don't overlap.

V1a ships the tag-and-pool primitive only. Rate bumps, edge/boundary cut-in cost, color phase transition cost, accent walls, named groups, dynamic palette, and project-wide material rollup are all explicitly deferred and will be additive when they land.

---

## 2. Problem

Today the estimate engine fires one scenario per paintable substrate in a room. When a painter's real-world workflow pools multiple items into one coordinated pass (fine-finish spray of baseboard + door_casing + crown + built-ins with the same product/tip), the estimate shows:

- One setup task per substrate (floor protect install redundantly applied N times)
- One cleanup task per substrate (equipment teardown repeated)
- Separate interstage dry times per substrate even though the items dry together
- Per-substrate line items even though the work is a single coordinated pass

This inflates hours and obscures the actual job shape in proposals and work orders. The `walls_ceiling_finish_combined` pass-group (shipped 2026-04-21) fixed this narrowly for walls + ceiling, but the same duplication happens every time a painter groups multiple trim/specialty items into a shared pass.

Painters also need to isolate items onto a different pass (stain package, accent color, different sheen) without having to know the exact product at estimate time. The grouping decision is made from job knowledge, not color selection.

---

## 3. Scope

### In scope (V1a)

- `finish_group` field added to every paintable item in `room.substrates` (data model on all, UI visible on non-wall/ceiling)
- 6-slot fixed palette (`A`–`F`), with 4 user-visible slots (`C`/`D`/`E`/`F`) in the per-item dropdown
- `A` and `B` reserved for walls and ceiling (data only, not offered in the item dropdown)
- Auto-default seeding based on `coating_type`:
  - `paint` → `C`
  - `clear` or `stain_clear` → `D`
  - Re-seeds on `coating_type` flip only if the current value is still at the previous default (manual assignments win)
- New `finish_group_assignment` entry in `Claude/registries/pass_groups.json` with `item_assignment` source type
- Dynamic resolver extension to `Claude/tools/paintscope/src/engine/pass-groups.js`: collects room items by finish_group, emits one pass-group per group with ≥2 members, phase-aware dedup rules (below)
- Precedence rule: existing `walls_ceiling_finish_combined` pre-authored path wins for walls + ceiling; dynamic resolver handles everything else. Domains are disjoint.
- Walls/ceiling silently carry `finish_group` driven by the existing combined-finish toggle state (no UI change)
- Per-item dropdown UI in `SubstrateDetailPanel` (rendered below `coating_type`, above `application_method`)
- Room-level summary badge in `RoomEditor` header showing active groups and member counts
- Mismatch warning (coating_type or application_method differ within a group): console warn, still pool
- Singleton skip: if a group has only 1 member, no pass-group emits; item runs per-substrate
- Tests: resolver unit tests, smoke test on a multi-group room
- HIL verification on McLeod: walls/ceiling behavior unchanged; stain-package scenario exercises dynamic resolver

### Out of scope (deferred; no rework when added)

- **Rate bumps on combined apply** — continuous-flow speedup; needs painter data
- **Edge/boundary cut-in or masking cost** between adjacent items in different groups — adjacency table or heuristic; door_casing ↔ door_frame and window_casing ↔ window_jamb are the primary pairs
- **Color phase transition cost** — extra setup time between groups in the same room
- **Accent walls** — requires walls substrate splitting (within-substrate grouping), orthogonal architecture
- **Dynamic palette** — "Add finish group" button for unlimited groups
- **Named / labeled groups** — ("Trim Package," "Stain Package") — UI polish
- **Project-wide group registry** — cross-room material rollup, product binding via Colors tab + Materials section
- **Substrate-state / substrate-condition group consistency normalization** — V2 extension that fires remediation/priming/prep tasks to bring group members to matching condition before the shared finish pass
- **Strict validation** on mismatch (block pooling, force user resolution) — V2 decision based on observed frequency
- **Pre-authored combined-finish cleanup** — migrating walls+ceiling onto dynamic resolver; post-V1a consolidation PR once dynamic resolver is proven stable
- **Stain enum cleanup** — if codebase currently uses a pure `stain` coating_type enum value, it should become `stain_clear` or `clear` per real-world interior usage; flagged as out-of-scope standalone audit

---

## 4. Architecture & data flow

### Current flow (post-2026-04-21)

```
room state
  → adapter.resolvePassGroups()    → passGroups[] (walls_ceiling_*_combined only)
  → adapter.buildScenarioInputs()  → roomInputs[] (1 per group + 1 per non-grouped substrate)
  → findBestMatch() + runScenarioEstimate()
  → perInputResults[]              (1 line item per input)
```

### V1a flow

```
room state
  → adapter.resolvePassGroups()    → passGroups[] (walls_ceiling_*_combined + finish_group_assignment)
  → adapter.buildScenarioInputs()  → roomInputs[] (1 per group + 1 per non-grouped substrate)
  → findBestMatch() + runScenarioEstimate()
  → perInputResults[]              (1 line item per input)
```

The flow shape is identical. The change is inside `resolvePassGroups`: it now also scans room items for shared `finish_group` values and emits additional pass-groups for any group with ≥2 members.

### Invariant (preserved)

A substrate appears in exactly one input per room — either as part of a pass group OR as its own input. Never both, never neither.

### Precedence

When a room produces both a `walls_ceiling_finish_combined` pass-group (from the existing pre-authored path) and `finish_group_assignment` pass-groups (from the new dynamic path), the precedence is:

1. Pre-authored pass-group owns its declared substrates (walls, ceiling) — dynamic resolver never touches them
2. Dynamic resolver handles every item NOT already claimed by a pre-authored pass-group

Because the only pre-authored pass-groups today target walls and ceiling, and because walls and ceiling are not visible in the item dropdown (their finish_group is toggle-driven, not user-set via the dropdown), there is no realistic conflict path in V1a. The precedence rule is defensive for future pre-authored pass-groups that might target other substrates.

---

## 5. Data model

### Field

```js
room.substrates[id].finish_group: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | null
```

- Type: enum of 6 uppercase letters, or `null` for items not yet assigned
- Default at item-add: seeded from `coating_type` (see Section 6)
- Persisted with the substrate config in localStorage via existing persistence
- Migration: existing rooms gain the field via `migrations.js` with default seeding applied

### Walls and ceiling

Data model includes `finish_group` on walls and ceiling from day one. Values are written by the existing combined-finish toggle state and per-room override:

| Toggle / Override state             | `walls.finish_group` | `ceiling.finish_group` |
|-------------------------------------|----------------------|------------------------|
| Toggle ON (project) + inherit (room) | `A`                  | `A`                    |
| Toggle OFF (project) + inherit (room) | `A`                  | `B`                    |
| Per-room override = `combined`       | `A`                  | `A`                    |
| Per-room override = `separate`       | `A`                  | `B`                    |

No UI surfaces these values on walls or ceiling. They exist for:
- Future cleanup (migrating walls+ceiling onto dynamic resolver)
- Accent walls work (when walls substrate splitting lands, each wall will have its own finish_group field visible)

### Registry entry

Append to `Claude/registries/pass_groups.json`:

```json
{
  "group_id": "finish_group_assignment",
  "substrates": null,
  "pass_type": "finish",
  "source_types": ["item_assignment"],
  "description": "Finish group pooling. Engine pools all items in a room sharing a finish_group value (A–F) into one coordinated pass — shared setup/cleanup/interstage, pooled apply. Trigger: any room containing ≥2 items with the same non-null finish_group."
}
```

`substrates: null` signals dynamic membership resolved at runtime (as opposed to the fixed `["walls", "ceiling"]` substrates on the existing entries).

### Context shape (passed to scenarios)

When an item is part of a finish_group pass-group, its ctx gains:

```js
{
  pass_group_id: 'finish_group_assignment',
  pass_group_substrates: ['baseboard', 'door_casing', 'crown', 'built_ins'],  // alphabetized
  pass_type: 'finish',
  finish_group: 'C',  // which slot this pass is running
}
```

When an item is NOT part of any pass-group, these fields remain `null` (consistent with existing convention for `applies_when` array-includes matching).

---

## 6. Defaults & auto-seeding

### At item-add (substrate toggled on)

New substrates are created with `finish_group` seeded from their initial `coating_type`:

- `coating_type === 'paint'` → `finish_group = 'C'`
- `coating_type === 'clear' || 'stain_clear'` → `finish_group = 'D'`
- Items without a `coating_type` concept (walls, ceiling — handled separately via toggle) → `finish_group = 'A'` or `'B'` per toggle state
- Fallback (unknown coating_type) → `finish_group = 'C'`

### On coating_type flip

When the user changes a substrate's `coating_type` (e.g., flipping door_frame from paint to stain_clear), the engine checks:

- If current `finish_group` matches the *previous* coating_type's default (e.g., was paint/`C`, now switching to stain_clear) → re-seed to new default (`D`)
- If current `finish_group` was manually set to `E` or `F` → leave it alone; the user's explicit choice wins

Pseudocode:

```js
function onCoatingTypeChange(substrate, newCoatingType) {
  const prevDefault = defaultFinishGroupFor(substrate.coating_type);
  const newDefault = defaultFinishGroupFor(newCoatingType);
  if (substrate.finish_group === prevDefault) {
    substrate.finish_group = newDefault;
  }
  substrate.coating_type = newCoatingType;
}
```

### Manual user override

User can pick any slot (`C`/`D`/`E`/`F`) at any time from the dropdown. Manual selection is sticky — it will not be overwritten by subsequent coating_type flips.

---

## 7. UI surface

### Per-item dropdown

Added to `SubstrateDetailPanel.jsx`. Renders for every substrate EXCEPT walls and ceiling:

```
Finish Group: [C ▾]
```

- Position: immediately below `coating_type` selector, above `application_method` selector
- Options: `C`, `D`, `E`, `F` (the 4 user-visible slots)
- Value: driven by `substrate.finish_group`
- On change: dispatches state update; immediately affects resolver output on next render

The dropdown does NOT expose `A` or `B` to non-wall/ceiling items. Those slots are reserved for walls/ceiling data. If a future use case needs walls+trim pooled (unusual but possible), it can be unlocked by extending the palette UI later.

### Walls and ceiling — no new UI

- Setup tab toggles (both combined prime + combined finish) stay unchanged
- Structure tab tri-state dropdowns (both prime workflow + finish workflow) stay unchanged
- These continue to drive pre-authored pass-groups AND now also write `finish_group` values on walls/ceiling under the hood (see Section 5 table)
- The user sees zero behavior or UI change on walls/ceiling in V1a

### Room-level summary badge

Rendered in `RoomEditor` header (near the room title/breadcrumb):

```
Finish groups in this room: C (4 items) · D (2 items) · E (1 item — singleton)
```

- Rendered only when the room has ≥1 assigned finish_group among non-wall/ceiling items
- Singletons labeled as such so estimator knows they aren't pooling
- Helps catch accidental mis-assignments at a glance
- Click-to-filter behavior deferred; V1a is display-only

---

## 8. Phase-aware pooling behavior

When the dynamic resolver detects ≥2 items in a room sharing a `finish_group`, it emits one pass-group. Each phase of the estimate flow dedups differently:

| Phase       | Behavior                                                             | Rationale                                                                   |
|-------------|----------------------------------------------------------------------|-----------------------------------------------------------------------------|
| Setup       | **Dedup to one instance per group**                                  | Floor protection is laid once for the whole pass, not per item              |
| Prep        | **Fires per member** (no dedup)                                      | Each item has its own physical surface to sand, fill, caulk, wipe           |
| Apply       | **Pool members into one pass line item**, per-member tasks at canonical rate | Pooling at line-item level only; rate bump deferred to V2 with painter data |
| Interstage  | **Dedup to one instance per group**                                  | Everyone in the group dries on the same schedule                            |
| Cleanup     | **Dedup to one instance per group**                                  | One teardown for the whole pass                                             |

### Resolver output shape

One estimate line item per active group, with member items listed inside the line. Per-member prep + apply tasks visible within the line item. Shared setup, interstage, cleanup fire once at the group level.

### Singleton skip

If only 1 item in a room has `finish_group = E`, the resolver does NOT emit a pass-group for `E`. That item runs per-substrate as normal. This prevents spurious "pool of one" line items.

### Zero-group rooms

If a room has 0 non-wall/ceiling items with a finish_group assigned (e.g., a room with only walls and ceiling), the dynamic resolver emits nothing. The existing `walls_ceiling_*` pass-groups still fire per their own rules.

---

## 9. Mismatch safeguard

Two mismatches within a pooled group are authoring errors:

- **`coating_type` mismatch**: e.g., one member is paint, another is stain_clear. Same finish_group implies same product/pass — mixed coating_types in one pass is physically nonsensical.
- **`application_method` mismatch**: e.g., one member is `brush`, another is `spray`. Same pass can't be both simultaneously.

### V1a behavior

- **Warn in console**: `[finish-group] Warning: group C has mixed coating_type (paint, stain_clear) — likely authoring mistake`
- **Still pool**: resolver emits the pass-group as declared; apply tasks run at their per-member canonical rates/methods
- **User sees warning in dev**; no blocking

### Why not block

- V1a is the primitive; we don't know yet how often users intentionally mix (e.g., transitional test states)
- Blocking creates a dead-end UX (user forced to fix to see the estimate)
- Observation phase first, strict validation added in V2 if mismatches prove rare enough that blocking is the right default

### V2 extension — group consistency normalization

When group members disagree on `substrate_state` (bare vs primed) or `substrate_condition` (sound vs damaged vs failing), the resolver fires remediation / priming / prep tasks to bring all members to matching condition before the shared finish pass. This turns the mismatch safeguard from a defensive warning into a proactive workflow engine. `coating_type` and `application_method` mismatches remain authoring errors (can't be auto-resolved).

Applies_when gates on prime/remediation tasks already support this pattern; V2 work is resolver wiring plus authoring a "normalizer" module per substrate.

---

## 10. Integration with existing pass-groups (walls+ceiling)

### What stays

- Pre-authored combined-prime and combined-finish scenarios (`SCN_COMBINED_*.json`)
- Combined modules (`MOD_*_COMBINED*.json`)
- Setup tab toggles and Structure tab dropdowns
- Existing pass-group registry entries (`walls_ceiling_prime_combined`, `walls_ceiling_finish_combined`)

### What changes

- Walls and ceiling gain `finish_group` in their state (data only, no UI)
- `buildGroupCtx` / `normalizePassGroupCtx` already handle pass-group ctx threading; extended to accept item-assignment groups

### What is deferred to a cleanup PR (post-V1a)

- Once the dynamic resolver is proven stable in production (by running real jobs), walls+ceiling can migrate onto the dynamic path
- Pre-authored combined-finish scenarios become redundant and get deleted
- Combined-finish toggle UI becomes optional sugar (could stay as a shortcut — checking the toggle sets walls + ceiling both to `A` — or be retired)
- This cleanup is one refactor PR with no user-visible behavior change

---

## 11. Testing strategy

### Unit tests (new file: `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`)

- **Dedup correctness**: given 3 items in group C, setup/interstage/cleanup each fire once; prep fires 3 times
- **Singleton skip**: 1 item in group E, 2 items in group C → only one pass-group emitted (for C); E fires per-substrate
- **Zero-group room**: room with only walls + ceiling → dynamic resolver emits nothing
- **Default seeding**: new substrate with `coating_type: 'paint'` → `finish_group: 'C'`
- **Coating-type flip re-seed**: paint (C) → stain_clear → auto-reseeds to D
- **Coating-type flip preserves manual override**: paint (manually set to E) → stain_clear → stays at E
- **Precedence with pre-authored**: walls + ceiling + 3 trim items in group C → one pre-authored pass-group (walls+ceiling), one dynamic (trim items), no double-counting
- **Mismatch warning**: group with mixed coating_type logs warning but still pools

### Integration tests (extend existing `pass-groups.test.js`)

- End-to-end: room with combined-finish toggle ON + 4 trim items in group C → estimate produces 2 pass-group line items (walls+ceiling + trim group C), correct hours

### HIL verification

- **McLeod regression**: re-run McLeod baseline (507.43h). Walls/ceiling path unchanged; trim items with default assignment produce the same result as today.
- **Stain package scenario**: construct a test project with door_frames + mantel + stair railing all in `stain_clear` coating → verify they pool into one pass-group D, shared setup/interstage/cleanup, per-member prep+apply

---

## 12. Key files to touch

| File                                                                                  | Change                                                                           |
|---------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| `Claude/tools/paintscope/src/data/substrate-catalog.js`                                | Add `finish_group: null` to every `defaultConfig`; not on walls/ceiling (driven) |
| `Claude/tools/paintscope/src/state/initial-state.js`                                   | Schema version bump, default seeding on `createRoom` substrate toggle            |
| `Claude/tools/paintscope/src/state/migrations.js`                                      | New migration: add `finish_group` to existing persisted rooms, seed from coating_type |
| `Claude/tools/paintscope/src/state/reducer.js`                                         | `onCoatingTypeChange` re-seed logic; new action for manual `finish_group` update |
| `Claude/tools/paintscope/src/engine/pass-groups.js`                                    | Add `resolveItemAssignmentGroups(room)`; call from `resolvePassGroups`            |
| `Claude/tools/paintscope/src/engine/context-adapter.js`                                | Thread `finish_group` + item-assignment pass-group fields into ctx                |
| `Claude/registries/pass_groups.json`                                                   | New `finish_group_assignment` entry                                              |
| `Claude/tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx`          | New `<select>` for finish_group                                                  |
| `Claude/tools/paintscope/src/components/room-editor/RoomEditor.jsx`                    | New summary badge in header                                                      |
| `Claude/tools/paintscope/src/engine/__tests__/finish-group.test.js`                    | New test file (scenarios listed in §11)                                          |
| `Claude/tools/paintscope/src/engine/__tests__/pass-groups.test.js`                     | Extend with precedence + integration cases                                       |

---

## 13. Effort estimate

- **~0.5 day** — Data model additions + default seeding + migration for existing rooms
- **~1 day** — Resolver extension (new source_type, dynamic dedup logic, precedence with pre-authored path)
- **~1 day** — UI (SubstrateDetailPanel dropdown, RoomEditor header summary, default rendering)
- **~0.5 day** — Tests (unit + integration)
- **~0.5–1 day** — HIL verification on McLeod + stain-package scenario

**Total: ~3–4 days.**

---

## 14. V2 landing zone (captured, not in V1a)

This section exists to make it clear these are *known extensions* with a clear home, not forgotten scope:

1. **Rate bumps on combined apply** — `rate_override` on task_refs in apply modules, activated when `pass_group_id` is set. Requires painter data for calibration.
2. **Edge/boundary cut-in or masking cost** — adjacency table (door_casing ↔ door_frame, window_casing ↔ window_jamb, door_casing ↔ baseboard at doors) or heuristic LF based on group-member count. Fires as additional masking/cut-in tasks when ≥2 groups present in the same room.
3. **Color phase transition cost** — flat extra setup time per group boundary (e.g., 15 min per group-to-group transition).
4. **Accent walls** — walls substrate splitting (each wall gets its own entry + finish_group field). Unlocks accent-wall scenarios and is the gating prerequisite for exposing finish_group UI on walls/ceiling.
5. **Dynamic palette** — "Add finish group" button replaces fixed 6-slot palette.
6. **Named groups** — free-text label per group (e.g., "Trim Package," "Stain Package"); surfaces in proposals and work orders.
7. **Project-wide group registry + material rollup** — Colors tab and Materials section bind finish_group to product/color/sheen; cross-room material quantities aggregate by finish_group.
8. **Group consistency normalization** — resolver fires remediation / priming tasks when group members have mismatched `substrate_state` or `substrate_condition`.
9. **Strict validation on coating_type / application_method mismatch** — promote from warning to blocking.
10. **Pre-authored combined-finish cleanup** — migrate walls+ceiling onto dynamic resolver; delete `SCN_COMBINED_FINISH_*.json`.
11. **Stain enum cleanup audit** — if codebase has `stain` coating_type, rename to `stain_clear` (and add `clear`) to match real-world interior usage.

---

## 15. Related work

- **Pass-groups primitive** (shipped 2026-04-21): `Claude/docs/superpowers/specs/2026-04-21-combined-prime-pass-groups-design.md`
- **Finish Groups and Combined Workflows discussion doc**: `project_finish_groups_options.md` (memory) — parked notes that seeded this design
- **RP spec redesign** (deferred): `Claude/docs/Future_Work/RP_Spec_Design_TODO.md` — will intersect with finish_group assignment when RP chain activation is rebuilt
- **Task library** (shipped 2026-04-20): enables clean dynamic composition of module tasks via `task_ref` — V1a resolver leverages this implicitly when pooling members' apply tasks

---

## 16. Open questions for planning phase

These aren't blockers for this design spec, but the implementation plan should resolve them:

- **Migration seeding order**: when migrating existing saved rooms, should we derive coating_type-based defaults item-by-item, or default everything to `null` and let the next user edit populate? (Suggest: coating_type-based defaults; saves users from manually revisiting every item.)
- **Room summary badge placement**: exact DOM location in `RoomEditor` header — above breadcrumb, beside title, or in a sticky footer? (Suggest: below the tab bar, above the first tab content, as a subtle inline chip row.)
- **Warning surface**: console only, or also a non-blocking UI banner in the estimate view? (Suggest: console only for V1a; escalate to UI banner if field data shows users miss it.)
- **Test project fixtures**: can we reuse the `paintscope-tracker` coverage kit, or do we add a dedicated "stain package" fixture? (Suggest: add one new fixture room under `test-projects/coverage-kit/` for stain-package validation.)

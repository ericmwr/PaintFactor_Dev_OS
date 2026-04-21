# Combined Prime + Pass Groups Primitive — Design Spec

**Date:** 2026-04-21
**Branch:** `claude/cranky-saha`
**Status:** Design approved; ready for implementation planning
**Scope:** Combined wall+ceiling prime (pre-trim) + combined wall+ceiling finish (product match). Other combined workflows (trim families, ext body+trim) deferred.

---

## 1. TL;DR

Introduce a **pass group** primitive so that N substrates sharing a coordinated painting pass produce ONE scenario match → ONE estimate line item. Replaces the current pattern where combined prime fires two per-substrate scenarios that duplicate setup/teardown and render as two lines.

Grouping logic lives in one place — `context-adapter.resolvePassGroups(room, project)` — and is invisible past the adapter. The scenario matcher, scenario engine, dedup, and downstream consumers treat a grouped input identically to a single-substrate input. The difference is only in what the ctx contains (`pass_group_id`, `pass_group_substrates`, `pass_type`) and which scenario matches.

Task-level isolation stays clean via `applies_when` — tasks that shouldn't fire in grouped flows gate with `pass_group_id: [null]`. Task library composability is preserved; rate overrides on combined apply modules go through `task_ref` `rate_override`.

---

## 2. Problem

Today combined prime fires TWO scenarios (one per substrate) in the estimate. Both scenarios:

- Display as separate line items even though they represent one painting pass
- Include floor protect install/teardown tasks that don't apply pre-trim (no floor installed yet)
- Include fixture-cover tasks that don't apply pre-trim (no fixtures installed yet)
- Include ceiling-edge masking install/teardown that doesn't apply when walls+ceiling are one field

Three related cases will need the same architectural treatment:
1. Combined wall+ceiling finish (when same product/color/sheen)
2. Trim-family finish (door casing + window casing + door frame + window jamb when same product)
3. Exterior body + trim combined prime pass

A universal primitive that handles all four (this spec covers the first two) avoids building four one-off solutions.

---

## 3. Scope

### In scope (this spec)

- **Case 1 — Combined prime:** walls + ceiling pre-trim, spray_backroll, same substrate_state, same QT. Triggered by `prime_mode === "combined"` flag already in project/room state.
- **Case 2 — Combined wall+ceiling finish:** walls + ceiling substrates share `system_id`, `product_id`, `sheen`, `color`. Auto-detected from resolved finish specs.

### Out of scope (future work)

- Trim-family combined finish (4+ substrate groups)
- Exterior body + trim combined prime
- User-declared manual pass groups via UI
- Runtime QT divergence handling (if walls QT differs from ceiling QT, no combined group forms — a soft warning is optional, not required)
- Portal/tracker UI changes to CONSUME pass groups — tracked as downstream coordination; spec defines the data shape they must accept

---

## 4. Architecture & data flow

### Current flow

```
room state
  → adapter.buildScenarioInputs()  → roomInputs[] (1 per substrate)
  → findBestMatch() + runScenarioEstimate()
  → perInputResults[]              (1 line item per substrate)
```

### New flow

```
room state
  → adapter.resolvePassGroups()    → passGroups[]
  → adapter.buildScenarioInputs()  → roomInputs[] (1 per group + 1 per non-grouped substrate)
  → findBestMatch() + runScenarioEstimate()
  → perInputResults[]              (1 line item per input)
```

### Invariant

A substrate appears in exactly one input per room — either as part of a pass group OR as its own input. Never both, never neither.

### What changes

- New `adapter.resolvePassGroups(room, project, specData)` function.
- `adapter.buildScenarioInputs` calls it first, excludes grouped substrates from per-substrate emit, adds one merged input per group.

### What stays the same

- `findMatchingScenario` — still matches ctx → `scenario.matches`; unaware of grouping, treats `pass_group_id` like any other ctx key.
- `runScenarioEstimate` — runs the matched scenario's modules; no grouping logic inside.
- `dedupeSharedTasks`, `normalizeToSpecResults` — unchanged.
- UI display pipeline — unchanged shape; pass-group fields are optional additions.

---

## 5. Data model

### Pass group shape

```ts
type PassGroup = {
  group_id: "walls_ceiling_prime_combined" | "walls_ceiling_finish_combined",
  substrates: string[],        // ["walls", "ceiling"]
  pass_type: "prime" | "finish",
  source: "project_flag" | "product_match" | "user_declared",
  metadata: Record<string, unknown>  // source-specific context; see below
}
```

### Canonical group IDs (scope c)

- `walls_ceiling_prime_combined` — phase-driven (from `prime_mode === "combined"`)
- `walls_ceiling_finish_combined` — data-driven (walls + ceiling share system + product + sheen + color)

Future group IDs follow the same lowercase snake_case convention and are registered centrally in `Claude/registries/pass_groups.json` (created fresh with this spec) so that engine, scenarios, tracker, and portal all read from one source of truth.

### ctx additions

```ts
// Populated ONLY for grouped inputs; explicitly null for non-grouped
ctx.pass_group_id:         string | null
ctx.pass_group_substrates: string[] | null
ctx.pass_type:             "prime" | "finish" | null
```

For non-grouped inputs these fields MUST be set to explicit `null` (not `undefined`) so that `applies_when: { pass_group_id: [null] }` matches correctly — JS array `[null].includes(undefined)` returns false.

### Scenario matches shape

No new match-engine feature — just a new key:

```json
"matches": {
  "pass_group_id": "walls_ceiling_prime_combined",
  "quality_tier": ["QT3"],
  "application_method": "spray_backroll",
  "substrate_state": ["SS_BARE_DRYWALL"]
}
```

The matcher already handles arbitrary equality / array-includes checks. `pass_group_id` needs no special case.

### Forward-compatible serialization

Line items, time entries, and proposal exports gain three optional fields:

```ts
type LineItem = {
  // existing fields...
  substrate: string,             // "walls+ceiling" when grouped, "walls" when not
  substrates: string[],          // ["walls","ceiling"] when grouped, ["walls"] when not
  passGroupId: string | null,    // "walls_ceiling_prime_combined" | null
  passType: "prime" | "finish" | null,
}
```

Old consumers reading only `substrate` get a sensible display string and keep working. New consumers can group/sort by `passGroupId` and break out substrates via `substrates[]`. Same pattern applies to `TimeEntry` in the tracker.

### No room/project schema changes

The resolver derives groups from existing data:
- Combined prime: existing `project.default_combined_prime` + `room.combined_prime_override` → `ctx.prime_mode`.
- Combined finish: walls + ceiling substrate `material_overrides` → compare resolved system/product/sheen/color.

---

## 6. Resolver

### Signature

```js
function resolvePassGroups(room, project, specData): PassGroup[]
```

Called once per room, before the per-substrate fan-out in `buildScenarioInputs`.

### Combined-prime precheck (all must hold)

```js
primeMode === "combined"                                 // from flag + override
  && willBePrimed(room, "walls")
  && willBePrimed(room, "ceiling")
  && walls.application_method === ceiling.application_method
  && walls.application_method === "spray_backroll"        // combined only makes sense here
  && walls.substrate_state === ceiling.substrate_state
  && wallsQt === ceilingQt
```

If all pass:
```js
{
  group_id: "walls_ceiling_prime_combined",
  substrates: ["walls", "ceiling"],
  pass_type: "prime",
  source: "project_flag",
  metadata: { prime_mode: "combined" }
}
```

### Combined-finish precheck (all must hold)

```js
wallsFinish && ceilingFinish
  && wallsFinish.system_id   === ceilingFinish.system_id
  && wallsFinish.product_id  === ceilingFinish.product_id
  && wallsFinish.sheen       === ceilingFinish.sheen
  && wallsFinish.color_code  === ceilingFinish.color_code     // SW code or equivalent canonical ID
  && walls.application_method === ceiling.application_method
  && wallsQt === ceilingQt
```

**Color match field:** compare on `color_code` (e.g., Sherwin-Williams SW code), not raw hex or color name. Codes uniquely identify a color across display variations; two substrates with the same code are guaranteed compatible for one spray pass, two with the same name but different codes are not.

If all pass:
```js
{
  group_id: "walls_ceiling_finish_combined",
  substrates: ["walls", "ceiling"],
  pass_type: "finish",
  source: "product_match",
  metadata: {
    system_id: wallsFinish.system_id,
    product_id: wallsFinish.product_id,
    sheen: wallsFinish.sheen,
    color_code: wallsFinish.color_code
  }
}
```

### Fallback

Any precheck failure → no group formed; substrates fall back to independent inputs (existing behavior).

### Integration in `buildScenarioInputs`

```js
const passGroups = resolvePassGroups(room, project, specData);
const grouped = new Set(passGroups.flatMap(g => g.substrates));

// 1. One merged input per group
for (const group of passGroups) {
  roomInputs.push({
    roomIndex,
    roomLabel,
    specId: group.group_id,
    ctx: buildGroupCtx(room, project, group),
    roomQty,                              // room-level; no merge needed
    passGroup: group,
  });
}

// 2. One input per non-grouped substrate (existing logic)
for (const substrate of substrates) {
  if (grouped.has(substrate)) continue;
  // ...emit per-substrate input with pass_group_id: null
}
```

### Merged ctx shape (example — combined prime)

```js
{
  // Dimensions (verified identical across grouped substrates by precheck)
  quality_tier:       "QT3",
  application_method: "spray_backroll",
  substrate_state:    "SS_BARE_DRYWALL",
  complexity:         "STD",
  height_band:        "STD",
  texture:            "smooth",

  // Pass group fields
  pass_group_id:         "walls_ceiling_prime_combined",
  pass_group_substrates: ["walls", "ceiling"],
  pass_type:             "prime",
  prime_mode:            "combined",

  // Removed
  paintable_item: null,
}
```

`roomQty` is already a room-level map (every substrate rolls up via `quantity-lookups.js`). Tasks looking up `PS_SURFACE_SF.WALL_FIELD` and `PS_SURFACE_SF.CEILING_FIELD` both find their quantities in the same map — no merge math needed.

---

## 7. Scenarios & modules

### Scenarios to author

**Combined prime — 4 new scenarios:**
```
SCN_COMBINED_WALLS_CEILING_PRIME_QT2_SPRAY_BACKROLL
SCN_COMBINED_WALLS_CEILING_PRIME_QT3_SPRAY_BACKROLL
SCN_COMBINED_WALLS_CEILING_PRIME_QT4_SPRAY_BACKROLL
SCN_COMBINED_WALLS_CEILING_PRIME_QT5_SPRAY_BACKROLL
```
Match on `pass_group_id: "walls_ceiling_prime_combined"` + respective QT + `application_method: "spray_backroll"` + bare substrate state.

**Combined finish — 12 new scenarios (4 QTs × 3 sheens):**
```
SCN_COMBINED_WALLS_CEILING_FINISH_QT{2,3,4,5}_SPRAY_BACKROLL_{EGGSHELL,SATIN,MATTE}
```

**Sheens covered in v1:** `EGGSHELL`, `SATIN`, `MATTE` — the three that can realistically fire on BOTH walls and ceilings in the same pass. Adding `FLAT` or `SEMI_GLOSS` is a trivial scenario-generator re-run once a real project needs them; deferred to avoid authoring unused combos.

Match on `pass_group_id: "walls_ceiling_finish_combined"` + QT + sheen + application_method. Generated via script for consistency.

### Scenarios to deprecate

```
SCN_DRYWALL_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL_COMBINED  (4)
SCN_CEILING_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL_COMBINED  (4)
```
Marked `status: "deprecated"` in scenario JSON + moved to `Claude/scenarios/_archive/` once new scenarios validate. Engine `findMatchingScenario` gains a silent skip for `status === "deprecated"`, mirroring the existing `status === "broken"` handler.

### Modules

**Existing (reuse as-is):**
- `MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL_COMBINED`
- `MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL_COMBINED`

**New for combined prime (3 modules):**
- `MOD_SETUP_COMBINED_PRIME_NC` — minimal pre-trim setup
- `MOD_PREP_COMBINED_PRIME` — single dust/vacuum pass, shared patch inspection
- `MOD_CLEANUP_COMBINED_PRIME` — single post-prime inspection + tool cleanup, no floor teardown

**New for combined finish (6 modules):**
- `MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED`
- `MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED`
- `MOD_SETUP_COMBINED_WC_FINISH` — floor protect, fixture masking, trim-edge masking (floors installed at finish time)
- `MOD_PREP_COMBINED_WC_FINISH` — dust, inspect priming
- `MOD_INTERSTAGE_COMBINED_WC_FINISH` — sanding between finish coats
- `MOD_CLEANUP_COMBINED_WC_FINISH` — floor teardown, tool cleanup, final inspect

**Total new modules:** 9.

### Module composition principle

All new combined modules follow the task-library pattern — tasks referenced via `task_ref`, with optional `rate_override` and `applies_when` per entry. No inline task definitions.

### Rate overrides

Deferred to painter-data validation. Initial authoring: `task_ref` entries with no `rate_override` (inherit canonical rate). Once empirical data justifies a combined-pace speedup, add `rate_override` per task_ref in the combined apply modules. **Not invented, not seeded at +10%.**

---

## 8. Task gating patterns

Tasks inside modules use `applies_when` for conditional firing. Engine logic unchanged — `resolveEligibility` already supports these patterns.

### Pattern 1 — "separate mode only" (universal exclusion)

```json
{
  "task_ref": "TSK_FLOOR_PROTECT_FULL_TEARDOWN",
  "applies_when": { "pass_group_id": [null] }
}
```

Use for: floor protect install/teardown, fixture covers, ceiling-wall cut-in, remove-masking tasks. Fires ONLY when input is not part of a pass group.

### Pattern 2 — "this specific group only" (narrow scope)

```json
{
  "task_ref": "TSK_<some_task>",
  "applies_when": { "pass_group_id": ["walls_ceiling_prime_combined"] }
}
```

Use for: tasks unique to a specific combined workflow.

### Pattern 3 — "any pass of this type" (phase-scoped, group-agnostic)

```json
{
  "task_ref": "TSK_<some_inspect_task>",
  "applies_when": { "pass_type": ["prime"] }
}
```

Use for: tasks that should fire in both separate-and-combined prime but not finish.

### Precedence

Task-level `applies_when` always wins over module-level (existing behavior).

### Null handling

`applies_when: { pass_group_id: [null] }` requires `ctx.pass_group_id` to be explicit `null` on non-grouped inputs. JS `[null].includes(undefined) === false`, so undefined-vs-null matters. Adapter MUST normalize all pass-group fields to `null` when not set.

A dev-mode assertion in `buildScenarioInputs` (`assert ctx.pass_group_id !== undefined`) catches regressions.

---

## 9. Engine changes (enumerated)

1. **`context-adapter.js`:**
   - New `resolvePassGroups(room, project, specData)` function.
   - `buildScenarioInputs` calls resolver, excludes grouped substrates from per-substrate emit, emits one merged input per group.
   - Explicit null assignment for pass-group fields on non-grouped inputs.

2. **`run-estimate-scenario.js`:**
   - Zero new logic for matching — existing equality/array-includes handles new keys.
   - One new skip path: `if (scenario.status === "deprecated") continue;` (silent, mirroring "broken" handler).

3. **`modifier-stack.js` / `resolveEligibility`:** zero change.

4. **`EstimateView.jsx` and spec-result normalizer:**
   - Support optional `passGroupId` + `passGroupSubstrates` fields on the spec result.
   - Render `scenario.name` as the line item title (already populated — e.g., "Combined Walls+Ceiling Prime (Pre-Trim, Spray+Backroll, QT3)").
   - Render `passGroupSubstrates.join(" + ")` as substrate label when set.

---

## 10. Migration, verification, rollback

### Migration — four phases

**Phase 1 — Scaffolding (behavior-preserving):**
- Build `resolvePassGroups` returning `[]` (no groups yet).
- Add pass-group fields to ctx; default all to `null` on every input.
- Add `status: "deprecated"` handler to `findMatchingScenario`.
- Commit. McLeod output byte-identical to baseline.

**Phase 2 — Combined prime goes live:**
- Author 4 new scenarios + 3 new shared modules.
- Enable combined-prime precheck in `resolvePassGroups`.
- Mark 8 old `_COMBINED` scenarios `status: "deprecated"`; move to `_archive/` once validated.

**Phase 3 — Combined finish goes live:**
- Author 12 new scenarios + 6 new combined finish modules.
- Enable combined-finish precheck in `resolvePassGroups`.

**Phase 4 — Downstream coordination (separate PRs in other repos):**
- `ideal-painting-website/lib/proposal-types.ts` — add 3 optional fields to `LineItem`.
- Client portal proposal renderer — opt-in grouped line item rendering.
- PaintScope tracker (`TimeEntryForm`, `TimeEntrySummary`) — pass group tagging + optional `pass_group_id` on `TimeEntry`.

Phases 1-3 ship together on cranky-saha. Phase 4 is tracked as downstream coordination, outside this spec.

### Verification

**Phase 1 acceptance:**
- McLeod with `default_combined_prime: false` → total hours UNCHANGED from 554.56h baseline.
- McLeod with `default_combined_prime: true` → 2-line output UNCHANGED (old per-substrate combined scenarios still fire). Byte-identical output JSON.

**Phase 2 acceptance:**
- McLeod with `default_combined_prime: true` → 1 combined line item, not 2.
- Task list within the line: NO floor-protect install/teardown, NO fixture-covers, NO ceiling-edge masking install/teardown.
- Total hours: ≥ the current 20.3h savings vs separate mode.

**Phase 3 acceptance:**
- Test project with walls + ceiling assigned same system+product+sheen+color → combined finish scenario matches, single line item.
- Change ceiling sheen → precheck fails, falls back to separate-substrate finish, two line items reappear.

**Unit tests — `resolvePassGroups`:**
- All precheck combinations (method, state, QT, product fields) — verify group formed vs not formed.
- ctx shape assertion: grouped input has populated pass-group fields, non-grouped has explicit `null`.
- Multi-group room (combined prime AND combined finish on the same room) → both groups emit.

**Integration tests:**
- Scenario matching: combined scenario wins over any per-substrate scenario when `pass_group_id` is set.
- `applies_when`: task with `{ pass_group_id: [null] }` correctly skips on grouped input, fires on non-grouped.

### Rollback

`resolvePassGroups` returning `[]` = feature-disabled fallback. All existing scenarios continue to fire as today. Gateable on a single project flag (`project.experimental_pass_groups !== true`) if we want a kill switch during rollout.

### Known risks

1. **ctx shape divergence** — any ctx builder that forgets to populate pass-group fields as explicit `null` breaks `applies_when: [null]` matching. Mitigation: centralize in `buildScenarioInputs`; dev-mode assertion.
2. **Stale IDB drafts** — lingering combined-prime drafts from earlier experimental work may overlay incorrectly. Mitigation: Drafts view audit before rollout; "Clean up published" button handles most of it.
3. **Scenario specificity tie** — combined scenario matches more keys so should win on specificity. Verify against existing tied-scenario-warning logic.

---

## 11. Related work / references

- `Claude/memory/project_finish_groups_options.md` — broader discussion of pass-group primitive variants
- `Claude/memory/project_module_architecture_next_session.md` — prior combined-prime state (Path C hybrid punchlist)
- `Claude/docs/Future_Work/RP_Spec_Design_TODO.md` — adjacent RP spec redesign, not part of this spec
- `Claude/tools/paintscope/src/engine/context-adapter.js` — resolver goes here
- `Claude/tools/paintscope/src/engine/run-estimate-scenario.js` — one new skip path
- `Claude/tools/paintscope/src/engine/quantity-lookups.js` — already emits room-level qty; no change
- `Claude/tools/paintscope/src/hooks/useEstimateScenario.js` — no change required
- `ideal-painting-website/lib/proposal-types.ts` — downstream coordination target (Phase 4)
- `Claude/tools/paintscope/src/components/tracker/TimeEntryForm.jsx` — downstream coordination target (Phase 4)

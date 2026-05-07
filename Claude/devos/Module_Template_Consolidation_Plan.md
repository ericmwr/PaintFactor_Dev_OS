# Module Template Consolidation Plan (Approach A)

**Status:** READY — execute when current session ends or in a fresh session
**Created:** 2026-05-05
**Purpose:** Collapse the ~80-100 structurally-identical substrate-specific modules that emerged from the consolidation pass into ~7 templates plus thin per-substrate extenders. Each substrate module shrinks from ~80 lines to ~8 lines while behavior stays identical.

**Pre-production calibration:** PaintScope is in development only. See `memory/project_paintscope_pre_production.md`. No migration plumbing needed — module file shapes can change freely as long as bundle gen produces equivalent runtime data.

---

## Context

The 32-round consolidation pass collapsed ~450 atomic tasks into universal LF/SF/EA_SIDE keepers. A side-effect: for many module families, the resulting per-substrate modules are now structurally identical except for `module_id`, `name`, and (occasionally) `modifier_eligibility.height` (true for elevated substrates like crown, false for floor-level like baseboard).

**Round 20's merge log entry called this out:**
> "FINAL substrate-specific task removed from PAINT modules. The 14 MOD_PREP_*_PAINT modules are now structurally identical — distinguished only by module_id, name, ps_key strings, and modifier_eligibility.height (true vs false per substrate). Module-level template consolidation now possible (FD_MODULE_TEMPLATE_TRIM_PAINT)."

Same pattern applies to roughly 7 module families that emerged from the consolidation:

| Family | Module count | Source rounds |
|---|---:|---|
| `MOD_PREP_*_PAINT` (post-primer trim prep) | 14 | rounds 7+10+11+15+17+18+20 |
| `MOD_PREP_*_PRIME_INITIAL` (pre-primer trim prep) | 14 | rounds 12+13 |
| `MOD_APPLY_*_PRIME_BRUSH` | 14 | round 20 |
| `MOD_APPLY_*_PRIME_SPRAY` | 14 | round 21 |
| `MOD_APPLY_*_STAIN` (LF substrates) | 14 | rounds 24+25+26 |
| `MOD_APPLY_*_CLEAR_COAT` (LF stain finishing) | 14 | round 30 |
| `MOD_APPLY_*_SEALER` (LF stain sealing) | 14 | round 30 |
| `MOD_INTERSTAGE_*` (trim interstage) | 14 | round 29 |
| `MOD_CLEANUP_*` (final touchup/inspect, paint side) | 14 | round 32 |
| `MOD_CLEANUP_*_STAIN` (final touchup/inspect, stain side) | 14 | round 32 |

Roughly 140 substrate modules in scope. Net-line reduction: ~6500 lines → ~1200 lines (~80% reduction). Authoring tab module list shrinks from 771 to ~640.

**Why now:** the consolidation pass made these modules structurally identical. Before consolidation, they each had different task IDs and per-substrate fiddly bits. Now they're true near-duplicates.

---

## Approach A — `extends` field, bundle-time shallow merge

A new base module per family carries the canonical task list + default eligibility. Substrate modules become thin extenders:

**Template** (`Claude/modules/MOD_TEMPLATE_TRIM_PAINT.json`):
```json
{
  "module_id": "MOD_TEMPLATE_TRIM_PAINT",
  "name": "Prep — Trim Paint (template)",
  "phase": "prep",
  "kind": "template",
  "intent": "Standard post-primer trim prep — fill / caulk / sand / wipe / inspect / touch up.",
  "tasks": [
    { "task_ref": "TSK_FILL_FASTENERS_LF" },
    { "task_ref": "TSK_CAULK_JOINTS_LF" },
    { "task_ref": "TSK_BETWEEN_COAT_SAND_LF" },
    { "task_ref": "TSK_DUST_WIPE_LF" },
    { "task_ref": "TSK_INSPECT_COATING_LF" },
    { "task_ref": "TSK_TOUCHUP_FILL_LF" }
  ],
  "modifier_eligibility": {
    "qt": true,
    "height": false,
    "texture": false,
    "complexity": true
  }
}
```

**Substrate extender** (`Claude/modules/MOD_PREP_CROWN_PAINT.json`):
```json
{
  "module_id": "MOD_PREP_CROWN_PAINT",
  "name": "Prep — Crown Paint",
  "extends": "MOD_TEMPLATE_TRIM_PAINT",
  "modifier_eligibility": {
    "height": true
  }
}
```

**Bundle gen resolution rules** (per-key shallow merge):
1. Load all module files (templates + extenders) into a flat map by `module_id`.
2. For each module that declares `extends`:
   - Look up the template (must exist; refuse build with clear error if missing).
   - Resolved module starts as a deep clone of the template payload.
   - Child overrides shallow-merge over template, with these specific behaviors:
     - `module_id`, `name`, `intent`, `doctrine` — child wins if defined, falls through to template otherwise.
     - `phase` — child wins if defined; usually inherits.
     - `tasks` — child fully replaces template's `tasks` if child defines a `tasks` array (no positional merge — too fragile). Otherwise template's tasks apply.
     - `modifier_eligibility` — per-key merge: `{ ...template.eligibility, ...child.eligibility }`. Child wins per key.
     - All other custom fields the user might add — child wins shallowly (one level deep).
   - Strip `extends` and `kind` from the resolved output (template-only metadata).
3. Validate post-resolution: every resolved module must have a non-empty `tasks` array and a `phase`. Reject otherwise.
4. Cycle detection: refuse to build if `A extends B` and `B extends A` (or any cycle of length > 1).
5. Templates themselves (`kind: "template"`) are written into the bundle's `modules` map but NOT registered for scenario lookup — scenarios reference substrate modules, never templates.

**Authoring tab impact:**
- Module list reads from `bundle.modules` post-resolution → substrate modules look the same as before (full `tasks`, full eligibility). User never sees the unmerged form unless they edit the JSON directly.
- Templates show up as their own list entries with a `kind: template` badge. The user can edit them directly. Saving + regen propagates the change to every extender.
- Filter-by-spec-family / filter-by-domain / filter-by-phase continue to work transparently — templates inherit phase from themselves; extenders inherit phase from the resolved module.
- A small "this is a template — N modules extend this" reverse lookup panel inside the template editor (mirrors `ModuleUsagePanel`'s pattern).

**Scenario impact:** zero. Scenarios still reference substrate module IDs. Bundle resolution happens before scenario validation, so the scenario's reference resolves to the merged module without the scenario ever knowing about templates.

---

## Phase 1: Bundle generator + extends resolver

**File touches:**
- Modified: `Claude/scripts/build-scenario-bundle.mjs` — add resolveExtends pass between `loadModules` and `validate`. Adds cycle detection. Adds the post-resolve invariant check (every module has `tasks` + `phase`).

**Implementation:**
- After loading raw modules, build a temporary map keyed by `module_id`.
- Resolve each module that declares `extends` by walking up the chain (depth-limited to 5 levels for safety).
- The resolved module is what lands in the bundle's `modules` object.
- Templates land in the bundle too (so authoring can edit them) but with their `kind: "template"` field intact so consumers can filter.

**Acceptance:**
- Build with one hand-authored test: a template `MOD_TEST_TEMPLATE` with 3 tasks, an extender `MOD_TEST_EXTENDER` that overrides `name` and one eligibility key. Bundle output has `MOD_TEST_EXTENDER` with the template's 3 tasks + the child's overrides applied.
- Build refuses when `extends` references a missing module.
- Build refuses on cycle.
- Build refuses if resolved module has empty `tasks` or no `phase`.
- Existing 25 BA_FAC_OVERHEAD-free modules still resolve to identical post-resolution shape (no regression — their `extends` field is absent, so they pass through unchanged).

**Out of scope this phase:**
- Authoring UI changes (Phase 4).
- Editing templates from UI (Phase 4).
- Multi-level inheritance beyond depth 5 (rare; raise the limit if a real use case appears).

---

## Phase 2: Pilot — convert 14 `MOD_PREP_*_PAINT` modules

**Scope:** the 14 modules from round 20's "FINAL substrate-specific task removed" milestone:
- `MOD_PREP_BASEBOARD_PAINT`, `MOD_PREP_CROWN_PAINT`, `MOD_PREP_CHAIR_RAIL_PAINT`, `MOD_PREP_SHOE_MOLD_PAINT`, `MOD_PREP_PICTURE_RAIL_PAINT`, `MOD_PREP_WAINSCOT_CAP_PAINT`, `MOD_PREP_WINDOW_STOOL_PAINT`, `MOD_PREP_WINDOW_APRON_PAINT`, `MOD_PREP_SHADOW_BOX_PAINT`, `MOD_PREP_PANEL_MOLD_PAINT`, `MOD_PREP_DOOR_FRAME_PAINT`, `MOD_PREP_WINDOW_JAMB_PAINT`, `MOD_PREP_WINDOW_CASING_PAINT`, `MOD_PREP_DOOR_CASING_PAINT`.

**File touches:**
- New: `Claude/modules/MOD_TEMPLATE_TRIM_PAINT.json` — the canonical template (carries the 6-task list + eligibility default).
- Modified (14): each substrate module shrinks to `module_id` + `name` + `extends` + per-substrate `modifier_eligibility` overrides (mostly just `height` true/false).

**Process:**
1. Read all 14 substrate modules. Capture the per-substrate variations (mostly which substrates have `height: true`).
2. Author the template with the consensus shape — task list from the most recent substrate module, eligibility defaults from the most common values across the 14.
3. Author the 14 extenders with only their actual diffs.
4. Run bundle gen. Verify resolved modules match pre-conversion shape byte-for-byte (or at least field-for-field after key sort).
5. Run smoke. Run a known-good lab estimate against a project with multiple trim substrates. Confirm hours match pre-conversion.

**Acceptance:**
- Bundle resolves cleanly. Smoke 20/20.
- Lab estimate produces identical totals before vs after the conversion.
- 14 substrate module files are each ≤ 12 lines.
- Authoring tab Module list shows the 14 modules as before (post-resolution shape) plus `MOD_TEMPLATE_TRIM_PAINT` as a new template entry.

**Merge log entry** appended after success.

---

## Phase 3: Expand to remaining 9 module families

After Phase 2 proves the pattern, apply the same conversion to the families enumerated in the Context section. One family per session is reasonable. Each family is mechanically identical: read the N substrate modules, capture diffs, author one template + N extenders, regen, smoke, log.

Suggested order (smallest behavioral risk first):
1. `MOD_PREP_*_PAINT` (Phase 2 — pilot)
2. `MOD_PREP_*_PRIME_INITIAL` (similar to PAINT but pre-primer)
3. `MOD_APPLY_*_PRIME_BRUSH` and `*_PRIME_SPRAY` (do as one session)
4. `MOD_INTERSTAGE_*` (trim)
5. `MOD_APPLY_*_STAIN` (LF), `MOD_APPLY_*_CLEAR_COAT`, `MOD_APPLY_*_SEALER` (could pair as one stain session)
6. `MOD_CLEANUP_*` and `MOD_CLEANUP_*_STAIN`

Each family's session: ~30-60 minutes of mechanical conversion + verification.

**Out of scope for Phase 3:**
- Wood-substrate SF families (wood_wall, wood_ceiling, wainscot panel) — they're a smaller set (3 substrates each) AND they have FAC_OVERHEAD/FAC_MATERIAL band-aids that complicate the merge. Defer until those modifiers are fully wired.
- Cabinet / built-in modules — deferred per `FD_OPENING_BASED_CABINET_BUILTIN` future direction.
- Stair (stringer/riser/newel/baluster) — small set, idiosyncratic; do separately if needed.

---

## Phase 4: Authoring UI affordances (optional, after Phase 2/3)

Once templates exist in the canonical bundle, the authoring tab benefits from:

- **Template badge** in ModuleList — shows when a module has `kind: "template"`. Faint visual marker (e.g., a small `tpl` chip).
- **Extends column** in ModuleList — shows the parent template ID for extenders. Click to navigate to the template.
- **Reverse-lookup panel** inside template editor — "N modules extend this template." Same shape as `ModuleUsagePanel` for scenarios. Clicking an extender ID navigates to it.
- **Filter: hide templates** toggle in ModuleList — by default show resolved (substrate) modules only; toggle on to also see templates.

None of this is required for the conversion to be useful — Phase 2's bundle resolution gives you the line-count savings immediately. Phase 4 is purely authoring quality-of-life.

**Out of scope this phase:**
- Editing the template's task list inline from a substrate module's editor — would require complex split-view UI; not worth it. User edits the template directly.
- Visual diff between template and resolved module — overkill for v1.

---

## Recommended Execution Order

1. **Phase 1 — bundle resolver** (single session, ~1-2 hours including tests)
2. **Phase 2 — PAINT pilot** (single session, ~1 hour: convert + verify + log)
3. **Pause here.** Confirm authoring tab still works, lab estimates unchanged. Decide if Phase 4's UI work is needed before continuing.
4. **Phase 3 — remaining families** (one or two per session, 5-7 sessions total)
5. **Phase 4 — UI affordances** (optional, after Phase 2 if friction shows up; otherwise after Phase 3 completes)

---

## Open Decisions

1. **Template naming convention.** Recommend `MOD_TEMPLATE_*` (e.g., `MOD_TEMPLATE_TRIM_PAINT`) so they share the `MOD_` prefix and the existing tooling treats them uniformly. The `kind: "template"` field is the discriminator.
2. **Should resolved modules in the bundle still expose their `extends` provenance?** Recommend yes — emit `_extends: "MOD_TEMPLATE_TRIM_PAINT"` on the resolved output so debugging tools can trace back to the source. Underscore prefix indicates "metadata, not authoring data."
3. **Per-key `modifier_eligibility` merge vs full replace.** Recommend per-key merge as documented above. The substrate extender almost always overrides only `height`; everything else falls through.
4. **Do scenarios reference templates?** No. Scenarios reference resolved (substrate) modules only. Bundle gen rejects any scenario whose `modules[]` contains a template ID.
5. **Engine validation.** `validate(modules, scenarios)` already requires every scenario module ID to exist in the resolved `modules` map. Templates are in the map but `kind: "template"` flags them. Add a check: if a scenario references a template ID, fail the build.

---

## Out of Scope (entire plan)

- **Engine changes.** Bundle gen does all the work; the runtime engine consumes resolved modules with their full `tasks` array, exactly as it does today.
- **Existing scenario rewrites.** Scenarios still reference substrate IDs.
- **Migration of saved project state.** Pre-production — irrelevant.
- **Performance optimization.** Bundle gen runs in <500ms today; adding the resolution pass adds maybe 50-100ms. Not worth measuring until a real bottleneck shows up.
- **Multi-level inheritance.** Templates can't extend other templates in v1. Could relax later if a use case emerges.

---

## First Move on the New Session

1. **Read this plan in full.**
2. **Verify the architectural assumptions:** locate `Claude/scripts/build-scenario-bundle.mjs`, confirm `loadModules` returns a flat map by ID, confirm the `validate(modules, scenarios)` invariant on every scenario module ID.
3. **Phase 1:** add the `resolveExtends` pass after `loadModules`. Write a tiny test fixture (one template + one extender) under `Claude/modules/_test/` that the build can consume. Verify bundle output, then delete the test fixture.
4. **Smoke test:** run `node Claude/scripts/smoke-scope-tree.mjs` before and after Phase 1 changes. Should be identical.
5. **Phase 2 pilot:** convert the 14 `MOD_PREP_*_PAINT` modules. Verify lab estimate totals match pre-conversion. Append merge log entry.
6. **Pause and report.** User decides whether to continue with Phase 3 in the same session or stop.

After Phase 2 succeeds, Phases 3 and 4 are mechanical — pick a family, do the conversion, verify, log. The authoring cascade tooling plan (`Authoring_Cascade_Tooling_Plan.md`) sits naturally after this work, since the rename + bulk transforms operate on a smaller, structurally-cleaner module set.

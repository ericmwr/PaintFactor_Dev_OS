# Next Session Pickup — Protection module retirement + cascade tooling complete

**Last updated:** 2026-05-09 (end of session, context bumping limit)
**Branch:** `claude/cranky-saha` (cascade-tooling branch merged in)
**Resume protocol:** read this doc first, then `Claude/_protection_module_retirement_audit.md` for the per-module breakdown.

---

## Status snapshot

| Workstream | Status | Notes |
|---|---|---|
| **Cascade tooling (Phases 0/1/2/3 + 0.5)** | DONE, MERGED | 9 commits on cascade-tooling branch fast-forwarded onto `claude/cranky-saha`. Full reverse-lookup graph + smoke-on-publish + rename modal + bulk editor. |
| **Authoring filters (Context, QT, derived chips, breadcrumb nav)** | DONE | NC/RP × interior/exterior + QT2-5 + Phase/Substrate/Method/Coating chips read from `task._derived` (bundle-generator injects it). Cross-tab nav has Back + breadcrumb. |
| **Tag-derivation bug fix** | DONE | `scn.match` → `scn.matches` typo + strict null filtering. Substrate filter now narrows correctly. |
| **`anySprayInRoom` default fallback** | UNCOMMITTED — see "Open data on disk" below | Bathroom fixture protection wasn't firing because the engine read literal `application_method` instead of falling back to substrate default. Fixed in two files; verified end-to-end. Not yet committed. |
| **Protection module retirement audit** | READ-ONLY DONE | 36 pure-protection modules + 105 mixed modules identified. Audit MD generated. **No data changes yet.** |
| **Protection module retirement actual work** | NOT STARTED | Next session's primary task. |

---

## Open files / data on disk that must be reconciled before commit

1. **Engine fix (uncommitted, fully working)**
   - `Claude/tools/paintscope/src/engine/quantity-lookups.js` — added `effectiveMethod()` helper, gates spray detection
   - `Claude/tools/paintscope/src/engine/context-adapter.js` — same fix in `computeAnySprayInRoom` + import added
   - Verified: bathroom fixture tasks (toilet/vanity/bathtub/shower mask install + remove) fire correctly when walls/ceiling left at default `spray_backroll` placeholder.
   - **Action:** commit as `fix(paintscope): application_method falls back to substrate default in spray gates`

2. **Kitchen Sink Test project state — TEST FIXTURES INJECTED**
   - Direct IDB write into `paintfactor.projects` added 4 fake fixtures: toilet, vanity (4 LF, full), bathtub, shower (3×6 SF) on the room.
   - Walls + ceiling `application_method` was deleted (so default fallback kicks in).
   - **Action:** revert via UI or direct IDB write before user resumes work, OR leave for the user to verify themselves and clean up in their own session. They asked for option (b) → leave for them to verify.

---

## Cascade tooling — what's now in the Authoring tab

Live and usable on `claude/cranky-saha`:

| Surface | What it does |
|---|---|
| **Reverse-lookup graph** | TaskEditor → `Where used` (modules) → ModuleEditor → `Where used` (scenarios) → ScenarioEditor. Forward direction also clickable. |
| **Archive tab + Archive buttons** | Per-editor red Archive button; tab shows 721 archived items with Restore. |
| **Regenerate bundle** | Header button; calls `/__authoring/regen-bundle` with status feedback. |
| **Smoke-on-publish** | DraftsView "Run smoke now" + automatic gate before Publish All. 4 invariants: every task_ref resolves, every module_id resolves, no orphan modules (warn-only), no duplicate task IDs. |
| **Rename-with-cascade modal** | TaskEditor "Rename..." button → preview blast radius via `findTaskUsage` → confirm writes 1 task draft + N module drafts in one batch. |
| **Bulk transform editor** | TaskList "Bulk Edit..." button → 3-pane modal (selection / transform / preview) with 6 transform ops + Δ column. |
| **Filters per list** | Context (NC/RP × int/ext) + QT (QT2-QT5) + derived axes (Phase / Substrate / Method / Coating). Filter state persists across tab switches. |
| **Navigation breadcrumb** | `← Back` + `Tasks › MOD_X › TSK_Y` style chain. Click any chip to jump back; click a top-nav tab to clear chain. |

Filter state, selected row, scroll position, expand state all persist across tab switches via `display:none` toggle (lists stay mounted).

---

## Bundle generator now injects `_derived` per task

`Claude/scripts/build-scenario-bundle.mjs` walks the reference graph at build time and writes onto every canonical task:

```
_derived: {
  phases:      string[],   // module phases referencing this task
  methods:     string[],   // application_method on reachable scenarios
  substrates:  string[],   // paintable_item on reachable scenarios
  qts:         string[],
  buckets:     string[],   // nc_interior / nc_exterior / rp_interior / rp_exterior
  coatings:    string[],   // paint / stain / clear / prime / stain_clear
  module_count:    number,
  scenario_count:  number,
}
```

Read by TaskList chip filters and TaskEditor's "Derived classifications" panel.

Audit script `Claude/scripts/audit-task-classifications.mjs` flags every task by:
ORPHAN, NO_PHASE, NO_SUBSTRATE, NO_QT, ACTIVITY_UNMATCHED, PHASE_DOCTRINE_HINT, MULTI_PHASE, MULTI_SUBSTRATE, PI_INT_PREFIX_DUPE.

Initial run: 2,093 tasks, 1,825 flagged (mostly ACTIVITY_UNMATCHED 1,741).

---

## Primary work for next session — protection module retirement

User identified: prime/paint scenarios still carry their own setup/cleanup protection tasks even though the protection system was decoupled. Result: protection setup/teardown is double-counted in prime+paint chains.

**Audit complete (read-only):** `Claude/_protection_module_retirement_audit.md`

```
36 modules emit ONLY protection tasks  → 416 total scenario refs.
   These should be retired (archive + strip from scenarios).
105 modules are MIXED (some protection, some real cleanup work)
   → 729 refs.
   Need splitting (drop protection tasks, keep real work).
```

Top retirement candidates by reference count:
```
78x  MOD_CLEANUP_TRIM_PRIME              (3 tasks, all protection)
78x  MOD_SETUP_TRIM_FLOOR_PROTECT        (1 task)
72x  MOD_SETUP_TRIM_PAINT_PROTECT        (3 tasks)
36x  MOD_CLEANUP_STAIR_RISER             (3 tasks)
36x  MOD_SETUP_STAIR_RISER               (3 tasks)
28x  MOD_SETUP_CLOSET_SHELF_PAINT        (3 tasks)
12x  MOD_SETUP_COMBINED_WC_FINISH        (13 tasks!)
```

### What needs to happen per module

```
1. Inspect what it emits today (audit MD has this)
2. Confirm room/fixture protection system covers it
   (the bathroom-fixture wiring case is a recent precedent — it works
    once the application_method default fallback is applied)
3. Strip the module ID from every scenario.modules[] that contains it
4. Archive the module
5. Smoke gate validates the publish (it will catch any reference miss)
```

### What needs to be BUILT before retirement starts

A **"Retire module" cascade tool** in ModuleEditor — parallels the existing `Rename...` modal. Click Retire → modal shows "this module is in N scenarios" → confirm writes N scenario drafts (each removing the module from its modules[] array) + archives the module + regen bundle. Drafts go through smoke gate at publish.

Plan was: build the tool first, then walk through 36 retirements at user's pace.

### Verification step before any retirement

The `anySprayInRoom` default-fallback fix surfaced a class of UI/engine wiring gaps. Before retiring each protection module, verify that the dedicated room/fixture protection system genuinely covers what the module was doing:

- Wall mask removal: `TSK_PROTECT_WALL_*_REMOVE` family
- Floor protection: `TSK_PROTECT_FLOOR_*` family
- Fixture covers: `TSK_MASK_*` family (toilet/vanity/bathtub/shower/etc.)
- Outlet/HVAC: `TSK_MASK_OUTLET_SWITCH_*`, `TSK_MASK_HVAC_VENT_*`

The audit MD lists each retirement-candidate module's tasks side-by-side with the 86 protection-system tasks. Each module's tasks currently show `✗ NOT in protection system` because they're per-substrate IDs from the old model — that's expected. The verification is conceptual: does the new system handle the WORK, not the same task IDs.

After the engine fix above, run a full Kitchen Sink / McLeod estimate and confirm the protection tasks fire correctly. Then retire.

---

## Recommended next-session order

1. **Read this doc + audit MD.**
2. **Decide on Kitchen Sink Test fixture state** — keep the test fixtures + walls method-cleared, or revert. Either way, document the choice.
3. **Commit the `anySprayInRoom` fix** if not already done.
4. **Build the Retire-module cascade tool** (~30 min — mirrors RenameTaskModal shape but operates on scenario.modules[] array stripping, not task_ref rewriting).
5. **Verify dedicated protection system coverage** by spot-checking 3-5 retirement-candidate modules in the live UI.
6. **Walk through retirements at user pace** — start with the heaviest references (`MOD_CLEANUP_TRIM_PRIME`, 78 refs) since one retirement of that scale is the proof of concept.
7. After retirements, **re-run the audit** — orphan tasks will appear (TSK_TRIM_REMOVE_*, etc.). Archive them too.
8. **Then move to the 105 mixed modules** — split into "remove protection task entries from these, keep real work."

---

## Background context (carry into the session)

- **PaintScope is pre-production.** Refactor freely, no migration plumbing.
- **The cascade-tooling branch is merged** — `claude/cranky-saha` HEAD has all the work. The cascade-tooling branch can be deleted.
- **The engine fix has TWO twin spots** that drifted apart over time. Watch for similar twins elsewhere when authoring next pass — `quantity-lookups.js` ↔ `context-adapter.js` is a known sync risk.
- **The user is hesitant to bulk-modify modules without seeing each one.** Build the retire tool to surface preview + confirm per-module, not as a bulk operation.
- **Smoke gate is the safety net.** Every publish goes through it — it catches missed module/task references before they hit disk.

---

## Key file inventory

```
Claude/scripts/build-scenario-bundle.mjs         ← injects _derived on every task
Claude/scripts/audit-task-classifications.mjs    ← per-task flag CSVs
Claude/scripts/audit-protection-module-retirement.mjs  ← MD report
Claude/_protection_module_retirement_audit.md    ← READ THIS
Claude/_task_audit.csv / _task_audit.flags.csv   ← task-level audit

Claude/tools/paintscope/src/engine/
  quantity-lookups.js        ← engine fix #1 (uncommitted)
  context-adapter.js         ← engine fix #2 (uncommitted)
  smoke-runner.js            ← Phase 1 smoke runner
  rename-cascade.js          ← Phase 2 pure helper

Claude/tools/paintscope/src/components/authoring/
  TaskList.jsx               ← all chip rows; reads task._derived
  TaskEditor.jsx             ← Derived classifications panel + Rename + Archive
  ModuleEditor.jsx           ← Where used + Archive
  RenameTaskModal.jsx        ← Phase 2 cascade modal
  BulkRateEditor.jsx         ← Phase 3 modal
  DomainContextChips.jsx + QualityTierChips.jsx + DerivedChips.jsx
  AuthoringView.jsx          ← navStack + breadcrumb + tab persistence
```

# Per-Item Material Overrides (P3) — Design

> **Status:** Design (brainstormed + approved 2026-06-23). No implementation plan yet.
> **Branch:** to be created. Likely off `feature/qt-builder-stain` @ `c0b0660f` (P2 tip; PR #8 still open and P2 not yet merged) or off `main` if PR #8 lands first. Edit in MAIN checkout (`C:\Eric_AI_Playground\Claude Code Uni\Claude`).
> **Parent design:** [`2026-06-22-stain-model-qt-builder-design.md`](2026-06-22-stain-model-qt-builder-design.md) §8 (P3 — per-item overrides). This doc supersedes the parent's "per-item per-phase" framing with a **finish-group grain** override model that matches Eric's domain workflow, and extends scope to paint.
> **Predecessors:**
> - P1 (PR #8, open) decomposed stain into per-phase scenarios with real materials.
> - P2 (`feature/qt-builder-stain`, complete) taught the QT Builder to author per-tier stain coats + materials.
> P3 is the third and final phase of the stain-model roadmap; with paint added here, it becomes the general project-level material-override layer.

---

## 1. Problem

After P2, the QT Builder authors **per-tier** materials and coats as the **tier defaults** (the "standard recipes" for QT2–QT5). What's still missing is **project-level overrides**: the painter quoting a real job needs to say "for this job, the clear is Lacquer" (project-wide), or "for these five door casings in finish group E, the clear is Lacquer (the rest use the standard WB Poly)."

Today there is no such override. The fired scenario's `material_systems[]` array (resolved by the QT Builder's tier authoring) is the only source. To change products per project, the user has to author a custom tier in the QT Builder — heavy and wrong-grained for per-job decisions.

Additionally, the materials path has a pre-existing limitation that bites here: `scenarioMaterials` in `scenario-estimate.js:207` is **keyed by `specId` with first-fired-wins**, so the same spec family can only emit one set of material lines per project. If two substrates of the same spec want different products (or different coat counts), they collapse to whatever fired first.

## 2. Goals & decisions

The painter expresses material overrides at the level they actually plan a job: **finish_group**. Finish groups are an existing, in-use domain concept (`config.finish_group` per substrate, default 'C' paint / 'D' stain, user-assignable to E/F to differentiate groups). Eric's framing: *"the default would be project-wide, but then we would use finish groups if we wanted to change up the product for similar substrates."*

| Decision | Choice |
|---|---|
| **Override grain** | **Finish group** — with a project-wide default as the fallback. Per-substrate granularity rejected as YAGNI; finish_group is the workflow-correct unit and already exists. |
| **Scope of overrides** | **Products AND coats** — both layered by (project default → finish-group override → scenario file). |
| **Coating types covered** | **Paint AND stain.** Two role sets: paint = {primer, finish}; stain = {stain, sealer, clear}. |
| **UI placement** | **A new project-level "Materials Overrides" panel.** Single source of truth for edits; substrate panel shows the *resolved* trio/duo as a read-only chip strip with a deep link. |
| **Menu source** | **Canonical-by-role**, dynamically scoped to the spec families active in this project (keeps the paint menu manageable; mirrors P2's canonical-menu pattern). |
| **Engine grain change** | `scenarioMaterials` rekeys from `{specId}` to `{specId|finish_group}` (first-fired-per-pair wins); quantities partition by `finish_group` the same way. |
| **Scope of engine change** | Materials path only. **Hours are untouched** (per-substrate hours already work correctly via `dynamic_coats` + ctx). |

## 3. Architecture — the 3-layer override stack

For each fired scenario, the effective per-role system + coats resolve via three layers:

```
   1. SCENARIO FILE  (today)
      scenario.material_systems[],
      scenario.coat_counts

   2. PROJECT DEFAULT (new, P3)
      project.material_overrides.default.<role>_system
      project.material_overrides.default.<role>_coats

   3. FINISH-GROUP OVERRIDE (new, P3)
      project.material_overrides.byFinishGroup[<group>].<role>_system
      project.material_overrides.byFinishGroup[<group>].<role>_coats

Resolution per (fired scenario, role):
   effective_system = byFinishGroup[fg]?.<role>_system
                   ?? default.<role>_system
                   ?? scenario.material_systems[<role>]
   effective_coats  = analogous, with the existing per-substrate ctx/file fallback at the bottom
```

Each layer's value is independent and nullable — missing/null means "fall through to the next layer." A finish-group override can change just one role (e.g. only clear); the rest fall through.

## 4. Data model

```js
// Added to project state
project.material_overrides = {
  default: {
    // null = fall through to the layer below
    primer_system: null | 'SYS_*',
    finish_system: null | 'SYS_*',
    stain_system:  null | 'SYS_*',
    sealer_system: null | 'SYS_*',
    clear_system:  null | 'SYS_*',
    primer_coats:  null | number,
    finish_coats:  null | number,
    stain_coats:   null | 1 | 2,
    sealer_coats:  null | 0 | 1 | 2,
    clear_coats:   null | 1 | 2 | 3,
  },
  byFinishGroup: {
    'C': { ...same shape, sparse — only set fields override... },
    'D': { ... },
    'E': { ... },
    // groups not present in this map fall through to default
  }
}
```

- Stored on `project`, persisted via the existing localStorage path.
- **Migration:** `state/migrations.js` adds an empty `material_overrides: { default: {}, byFinishGroup: {} }` to existing project state. Default + group entries with all-null fields are estimate-neutral (resolve === scenario-file), so the migration is byte-identical to pre-migration.

## 5. UI — project-level "Materials Overrides" panel

A new panel lives in project setup (alongside Identity / Defaults / etc.). Two sub-tables, paint above stain:

**Paint Materials:**

```
              Primer System              Finish System                  Primer Coats  Finish Coats
─────────────────────────────────────────────────────────────────────────────────────────────────
Project       [— default —]              [— default —]                  [— ▾ default]  [— ▾ default]
Group C       [— default —]              [SW Pro Industrial  ▾ override] [— ▾]          [— ▾]
Group F       [— default —]              [SW Emerald  ▾ override]        [— ▾]          [3 ▾]
```

**Stain Materials:**

```
              Stain System              Sealer System              Clear System              Stain  Sealer  Clear
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Project       [Oil-Based  ▾ override]   [— default —]              [WB Poly  ▾ override]      [— ▾]  [— ▾]   [2 ▾]
Group D       [— default —]             [— default —]              [Lacquer  ▾ override]      [— ▾]  [— ▾]   [— ▾]
```

**Behavior:**
- **Project row** always shown.
- **Group rows** auto-discovered from `state.rooms[].substrates[].finish_group`. The Paint table shows groups containing any paint substrate (`coating_type === 'paint'` after resolution); Stain table shows groups containing any stain substrate. A group with both types of substrates gets a row in both tables.
- **Dropdown menu per role** = canonical-by-role, dynamically scoped: union of `MATERIAL_SYSTEMS` whose `classifySystemRole(id) === role` AND whose `spec_family_id` is in the set of active spec families in this project. If the resulting menu is empty for a role, render "no systems available" instead of a broken dropdown.
- **Override / default chip** per cell: when the cell value differs from the layer below it would inherit, show an accent border + "override" label with a small "default" link to clear it (mirrors P2 Materials grid pattern).
- **Auto-discovered rows with no substrates** (user removed the last substrate but the override values linger in state): show the row dimmed with a "remove unused override" link. Don't silently hide it.

**Substrate panel — small read-only chip strip** at the bottom of the Coating Phases section showing the resolved trio (stain substrates) or duo (paint substrates) for *this* substrate:

```
Stain · Oil-Based   ·   Sealer · —   ·   Clear · Lacquer (override · group D)   [change in Materials panel ↗]
```

Read-only. The link jumps to the project Materials panel.

## 6. Engine flow

The materials path changes; the hours path is untouched.

**`scenario-estimate.js:204-220`** — rekey `scenarioMaterials`:

```js
const scenarioMaterials = {};
for (const pr of perInputResults) {
  if (isExteriorRoomIndex(pr.roomIndex)) continue;
  const fg = pr.ctx?.finish_group ?? null;       // null group = "no group" partition
  const key = `${pr.specId}|${fg ?? '__none__'}`;
  if (scenarioMaterials[key]) continue;          // first fired per (specId, fg) wins
  const scn = bundle.scenarios.find(s => s.scenario_id === pr.scenarioId);
  if (!scn) continue;
  const cc = scn.coat_counts || {};
  const ctx = pr.ctx || {};
  scenarioMaterials[key] = {
    specId: pr.specId,
    finishGroup: fg,
    scenarioId: pr.scenarioId,
    systems: scn.material_systems || [],
    coats: {
      stain_coats:  ctx.stain_coats  ?? cc.stain_coats  ?? 1,
      sealer_coats: ctx.sealer_coats ?? cc.sealer_coats ?? 1,
      clear_coats:  ctx.clear_coats  ?? cc.clear_coats  ?? 1,
    },
  };
}
```

**New pure helper `engine/material-overrides.js`:**

```js
export function resolveSystem(role, finishGroup, overrides, scenarioSystem) {
  const fg  = overrides?.byFinishGroup?.[finishGroup]?.[`${role}_system`];
  const def = overrides?.default?.[`${role}_system`];
  return fg ?? def ?? scenarioSystem;
}

export function resolveCoats(role, finishGroup, overrides, scenarioCoats) {
  const fg  = overrides?.byFinishGroup?.[finishGroup]?.[`${role}_coats`];
  const def = overrides?.default?.[`${role}_coats`];
  return fg ?? def ?? scenarioCoats;
}
```

Pure, unit-testable, no side effects. Used by both the engine and the substrate panel's chip strip.

**`material-estimates.js:89` `computeMaterialEstimates`** — iterate per-key (per `(specId, finishGroup)`), partition quantities by finish_group, apply overrides per role:

```js
for (const [key, sysEntry] of Object.entries(scenarioMaterials)) {
  if (!activatedSpecs.has(sysEntry.specId)) continue;
  const scopedQty = buildSpecScopedQty(sysEntry.specId, sysEntry.finishGroup);
  // ... existing surface-area aggregation, but only over substrates whose finish_group matches ...
  // ... existing role-matched-systems loop, but each sysId passes through resolveSystem(role, fg, project.material_overrides, sysId) before resolving the product
  // ... coats per role pass through resolveCoats(role, fg, project.material_overrides, sysEntry.coats[`${role}_coats`])
}
```

**`buildSpecScopedQty(specId, finishGroup)`** — walks `state.rooms[].substrates[]`, sums each substrate's psKey contribution **only when the substrate's `finish_group === finishGroup`** (or both null for the "no group" partition). Re-derived per call; for typical project sizes this is cheap.

**Exterior path untouched:** the existing `if (isExteriorRoomIndex(pr.roomIndex)) continue` guard runs first, so exterior never enters the rekey or the partitioning.

## 7. Risks

1. **Paint coat plumbing.** Paint uses scenario module repetition for coats (not the `dynamic_coats` mechanism stain uses). Today `scenarioMaterials.coats` exists for stain only; the materials gallon math for paint reads `resolveCoats(prod)` from `prod.coats_required`. For the project/group `primer_coats`/`finish_coats` override to actually move paint gallons, the implementer must thread the override into the paint coat resolution path — likely by adding paint coat fields to `scenarioMaterials[key].coats` and having `resolveCoats(prod)` consult that first. **Implementer action:** trace paint's coat→gallon path at the start of the engine task, then layer the override as the topmost source. A focused integration test (paint primer_coats override → gallons move) is the gate.

2. **Pre-existing "same-group same-spec different coats" collapse.** Within a finish_group, two substrates of the same spec with different per-substrate coat counts still collapse to first-fired (the per-(specId, fg) rekey doesn't fix that — it'd require per-fired-scenario grain). Workflow answer: use a different finish_group, or set the project/group coat override explicitly. Documented; not in scope.

3. **Exterior protection.** The exterior path has its own materials computation (`computeExteriorMaterialEstimates`). Confirm the rekey and the new `material-overrides.js` aren't accidentally consumed there. The cleanest guard is the existing `isExteriorRoomIndex` early-bail in scenarioMaterials' build loop; exterior never reaches the override layer.

4. **Migration safety.** Existing projects must load with no behavioral change. The empty `material_overrides: { default: {}, byFinishGroup: {} }` resolves all fields to null → fall through to scenario file → identical to today. Migration test gates this.

5. **Auto-discovery scope on huge projects.** Walking `state.rooms[].substrates[]` to find in-use finish_groups runs per render of the Materials panel. Fine for typical (≤ ~50 rooms × ~20 substrates) sizes; memoize on `state.rooms` if it ever shows up in profiles.

6. **Menu empty for a role.** If no active spec family contributes a system for some role (e.g. a project with no painted substrates), the Paint sub-table's rows still render (because the project default row always shows) but the dropdowns are empty. Show "no systems available" rather than a broken empty `<select>`.

## 8. Phasing

Single shippable phase. Internally sequenced as TDD tasks (engine pure helpers → state/migration → engine rekey + partition → UI panel → substrate chip → live-verify), but it ships as one P3 release. No sub-phasing because every piece (engine, state, UI) is required for end-to-end value; partial shipping doesn't help the user.

## 9. Testing & gates

- **Unit:**
  - `resolveSystem` / `resolveCoats` — null fallthrough, project default wins, finish_group wins over project default.
  - `buildSpecScopedQty(specId, finishGroup)` — partition correctness (sum of partitioned == un-partitioned).
  - `scenarioMaterials` rekey — two fired inputs same specId different finish_group → two entries.
- **Integration:**
  - Project with 2 stained door casings in finish_groups D and E with different clear overrides → `computeMaterialEstimates` emits 2 clear lines with the right product per group.
  - Paint case — drywall walls in group C with a finish_system override → resolver picks override.
  - Paint coats — group-level `finish_coats` override moves gallons (the headline test for risk #1).
- **Migration:**
  - Old project state (no `material_overrides`) loads cleanly; an empty override is added; full estimate output is byte-identical to pre-migration.
- **Parity:**
  - With no overrides set, full estimate on a real project (e.g. McLeod) must be byte-identical before/after the rekey. This is the "no surprise to existing users" gate.
- **Build/suite:**
  - vitest stays green (P2 baseline 638 + new P3 tests). `vite build` clean.
- **Live-verify:**
  - In the dev server: stained door casing project; in the new Materials panel, set a project-default override, confirm the estimate moves; assign a substrate to a new finish_group, set a group-level override, confirm only that group's line changes.

## 10. Non-goals / deferred

- **Per-substrate (true per-item) overrides** — rejected in favor of finish_group grain. If genuinely needed later, the architecture extends naturally (key would become `(specId, finish_group, substrateId)`).
- **Exterior material overrides** — the exterior materials path is computed separately (`computeExteriorMaterialEstimates`); applying the same model there is a follow-up.
- **Per-tier overrides at the project level** — the QT Builder already authors per-tier. Project-level override is tier-agnostic by design (replaces whatever tier resolves).
- **Mixing paint and stain in one finish_group row** — the panel renders such a group in both sub-tables; we don't try to unify the UI for a (rare) mixed group.

## References

- Parent design: `docs/superpowers/specs/2026-06-22-stain-model-qt-builder-design.md` §8.
- P2 design + memory: `docs/superpowers/specs/2026-06-23-qt-builder-stain-authoring-design.md`; `project_stain_model_qt_builder` "BUILT — Phase 1" + "P2 BUILT".
- Engine refs: `scenario-estimate.js:204-220` (scenarioMaterials build), `material-estimates.js:89,200-230` (loop + scopedQty + role-matched systems), `context-adapter.js:108` (ctx.finish_group), `material-system-roles.js` (classifySystemRole).
- State: `state/initial-state.js:46,138-144` (finish_group seed + defaultFinishGroupForCoatingType); `state/migrations.js` (pattern for adding project-level fields).
- UI: `components/room-editor/SubstrateDetailPanel.jsx:155-173` (existing finish_group select), pattern from `components/authoring/QTBuilder.jsx` (Materials grid override/default chip).

# QT Builder Phase 3 — Materials File-Native — Design Spec

- **Date:** 2026-06-21
- **Status:** Approved (design); awaiting spec review
- **Author:** Eric, with Claude
- **Branch:** `feature/qt-builder-rebuild` (off `main` @ `d98f607`, latest `64f44518` after Phase 2). NOT pushed.
- **Implements:** Phase 3 of `2026-06-20-qt-builder-tier-file-model-design.md` (§12.3, "Materials file-native").
- **Supersedes:** the shelved Phase 2f materials UI — `tier-materials.js` + `material_systems_by_tier` map + `buildScenarioMaterialOverrides` (never merged; on `feature/qt-builder-phase2f`). Do NOT resurrect those; the storage model changes.
- **Related (memory):** `project_qt_builder_rewrite`, `project_paintscope_pre_production`, `feedback_paintscope_main_checkout`, `project_color_catalog`.

---

## 1. Summary

Make the estimate engine resolve each substrate's materials from its **governing scenario's existing `material_systems` array** (the `SYS_*` ids already on every scenario), instead of re-deriving from the global catalog matcher. Add a **"Materials" authoring section** at the bottom of the QT Builder that edits that array per tier (per role), with the same fork-on-edit model as the Phase 2 multiplier row. QT3 edits the baseline scenario's array directly; QT2/QT4/QT5 fork on edit.

The abstract `SYS_*` systems remain the **authoring unit** (brand-agnostic "what kind of coating"). A real product catalog (`data/product-catalog.js`, 350 products) is a **future** resolution layer that joins onto `SYS_*` via each product's `system_mappings` — **out of scope here**; nothing in Phase 3 touches it.

**Hours are never touched.** Phase 3 changes only the materials path. Material **gallons will shift** for families where the scenario array and today's catalog matcher disagree — these are accepted as corrections (e.g. closet finally emits its finish line) and itemized by a parity-analysis report.

## 2. Motivation & current state

Every scenario already carries a `material_systems` array (e.g. `SCN_CLOSET_SHELF_NC_QT3_BARE_BR` → `["SYS_PRIMER_WOOD_ACRYLIC","SYS_FF_STANDARD_ACRYLIC"]`). **The engine ignores it.** `computeMaterialEstimates` (material-estimates.js) is **spec-family-grained**: for each activated `spec_family_id` it picks systems from the *full catalog* (`MATERIAL_SYSTEMS.filter(spec_family_id===X)`) by the project `default_quality_tier` + a hardcoded per-spec sheen, role-classified via the 2e resolver. The `scenarioMaterialOverrides` parameter exists but is passed `{}` on this branch (the 2f assembler `buildScenarioMaterialOverrides` and `spec-for-scenario.js` are 2f-only, not here).

The two representations diverge for some families (verified):
- **Cabinet** — array == matcher pick (granular primer + QT-keyed finishes `SYS_FF_STANDARD_ACRYLIC`/`_MODIFIED_URETHANE`/`_PREMIUM`). Consistent.
- **Closet** — the family's own catalog has only 2 coarse systems, both mis-roled `primer`, so the matcher emits a primer and **no finish at all** (a latent bug). The scenario array carries the correct granular primer+finish — but those `SYS_*` ids have **no catalog row under the closet family** (they belong to cabinet/arch), so the family-keyed coverage/coats lookup misses.

The real catalog (`product-catalog.js`) confirms the intended architecture: products declare `system_mappings` (e.g. ProClassic Satin → `SYS_FF_STANDARD_ACRYLIC`), many-to-many. `SYS_*` is the stable spec-level key; products are a procurement-level layer that resolves later.

## 3. Goals / Non-goals

**Goals**
- Engine resolves materials from the governing scenario's `material_systems` array (role-aware emission via the 2e resolver), retiring the catalog-matcher default.
- A bottom "Materials" section: per-tier × per-role `SYS_*` selects; QT3 → baseline array; QT2/4/5 fork-on-edit; clear/revert symmetric.
- A parity-analysis report categorizing every material-gallon delta vs today.
- Hours byte-identical; no scenario/module data files changed by the feature itself (drafts only, until published).

**Non-goals**
- The real product catalog / `system_mappings` resolution (brands/SKUs/price) — future layer.
- **Per-fired-scenario grain** — Phase 3 keeps the existing spec-family / representative-scenario grain (one system-set per family at the project tier). Mixed bare/primed rooms using *different* arrays in one estimate is deferred.
- **Per-substrate-tier divergence** (different substrates at different tiers in one project) — out, as in Phase 2.
- **Data-cleanup of mis-roled systems / array↔catalog drift** — reported, not fixed (a follow-up pass).
- Stain authoring polish beyond the role set already present (stain/sealer/clear render like primer/finish).

## 4. The model — read the array

| Concern | Phase 3 |
|---|---|
| **Source of truth** | The governing scenario's `material_systems` array (`SYS_*` ids). |
| **Role** | `classifySystemRole` (product_role from `MATERIAL_SYSTEM_PRODUCTS`, then id-pattern, then base role). primer/finish for paint; stain/sealer/clear for stain. |
| **Coverage / coats** | Resolved per `SYS_*` **by id across families** (first family that defines it), default 400 sf/gal + 2 finish / 1 primer coats when absent; every cross-family/default resolution is **reported**. |
| **Per-tier** | Each tier's governing scenario carries its own array; forking a tier gives it its own. |
| **QT3** | Editable — writes the **baseline** scenario's array (the QT3 choice and the unforked-tier default). Not a locked anchor (unlike the rate multiplier). |
| **Empty array** | Emit no materials (correct for the 19 protection scenarios). |

## 5. Engine cutover

### 5.1 Thread the governing scenario into the material pass
`runScenarioEstimate` already returns `scenarioId` (run-estimate-scenario.js:1028). Carry it through `perInputResults` into `normalizeToSpecResults` so each `specResult` (or a parallel map) exposes the **fired governing `scenarioId`(s)** for its `specId`. The material pass then reads `material_systems` from the fired scenario rather than re-resolving ctx (the fired id already encodes method/state/coating/tier).

### 5.2 Swap the candidate source (material-estimates.js)
Per activated spec family, today's pass calls `resolveSpecSystems({ specSystems: <full family catalog>, …, specOverride })`. Change it to:
- Determine the **representative fired scenario** for the family (the first fired `scenarioId` for that `specId`; if several from-states fired, representative grain picks one — documented, not unioned).
- Read its `material_systems` array → the candidate `SYS_*` ids.
- For each id, resolve `{ role, coverage_sf_per_gallon, coats }` via a new **cross-family system resolver** (§5.3). Group by role; one system per role.
- Emit one material line per role, using the existing gallon math (quantity ÷ coverage × coats × spray-loss). Empty array → no lines.

**Quantity scoping is unchanged** — `buildSpecScopedQty` (per-room state-compatibility filter), `surfaceKeys` (PS-key derivation from fired tasks), the `activatedSpecs` guard, and the spray-loss factor all stay exactly as today. Only **system selection** (array, not the sheen/QT matcher) and the **coverage source** (§5.3) change. The matcher's hardcoded `defaultSheen` and the `specStates`/`resolveSubstrateStateForSpec` selection inputs are no longer consulted for selection (the array already encodes the chosen systems); remove that now-dead selection logic rather than leaving it inert.

### 5.3 Cross-family system resolution (material-system-roles.js, extended)
Add a pure helper that resolves a `SYS_*` id to its `{ role, coverage_sf_per_gallon, coats }` **independent of the active spec family**, because array ids can belong to another family (closet → cabinet/arch systems):
- `role` = `classifySystemRole(id, roleBySystemId, baseRole)`.
- `coverage` / `coats` = first `MATERIAL_SYSTEM_PRODUCTS` / `MATERIAL_COVERAGE_PROFILES` row matching the id under **any** family; fallback default `400` sf/gal, `1` coat (primer) / `2` coats (finish) when absent.
- Returns a `resolvedFrom` tag (`own-family` | `cross-family:<fam>` | `default`) so the caller can **report** non-own-family resolutions.

### 5.4 Engine outputs unchanged in shape
Material estimate line shape (gallons, role, system id/name, coverage) is unchanged; only the *selection + coverage source* changes. `computeExteriorMaterialEstimates` is untouched (exterior uses `EXT_COVERAGE_DEFAULTS`). `scenarioMaterialOverrides` and the 2f-style `{specId:{tier:{role}}}` assembler are **not** introduced.

## 6. Authoring UI

### 6.1 Storage ops — `qt-builder/tier-files.js` (pure, immutable)
- `setScenarioMaterial(scenario, systemId, role, roleBySystemId) → scenario` — return a new scenario whose `material_systems` has the element classified as `role` replaced by `systemId` (append if no element of that role exists; preserve order; same ref on no-op).
- `clearScenarioMaterial(scenario, role, baselineSystemId, roleBySystemId) → scenario` — set the `role` element back to `baselineSystemId` (the canonical/baseline pick); if `baselineSystemId` is null, remove the role element. Same ref on no-op.

### 6.2 Fork-on-edit plans — `qt-builder/vantage-edits.js`
- `planSetMaterial(bundle, sel, tier, role, systemId) → { scenario } | {}` — `ensureScenarioForTier` (QT3 = baseline, no fork; QT2/4/5 fork a **copy** of the array), then `setScenarioMaterial`. If the result's `material_systems` deep-equals the **canonical** scenario's array AND (for a fork) no other divergence (modules / `modifier_overrides`), auto-reclaim (return `{ deleteScenarioId, deleteModuleIds }`) — mirrors `planClearQtFactor`.
- `planClearMaterial(bundle, sel, tier, role) → { scenario } | { deleteScenarioId, … } | {}` — look up the canonical scenario's system for `role` (the baseline/original array), `clearScenarioMaterial` back to it, then the same auto-reclaim check. For a QT3 baseline draft that returns to canonical → delete the baseline scenario draft.

Both need the **canonical** (pre-draft) scenario: the component passes the canonical `bundle` (imported `scenario-bundle.gen.js`) alongside the overlaid `mergedBundle`, so "default for this role" = the canonical array's role element.

### 6.3 View-model — `qt-builder/derive-materials.js` (new, pure)
`deriveMaterials(bundle, sel)` → per served tier `{ scenarioId, specId, roles: [...], candidatesByRole: { role: [{id,name}] }, resolvedByRole: { role: systemId }, isOverrideByRole: { role: bool } }`:
- Resolve the governing scenario per tier via `findBestMatch` (same as `deriveVantage`).
- `specId` via `specForScenarioMatches(scenario.matches)` (§6.5).
- `candidatesByRole` = `MATERIAL_SYSTEMS.filter(spec_family_id===specId)` grouped by `classifySystemRole` (the dropdown options — brand-agnostic `SYS_*` within the family).
- `resolvedByRole` = the scenario array's element per role.
- `isOverrideByRole` = the resolved system differs from the **canonical** scenario's array for that role.
- `materialRoles` (union across tiers, ordered primer/finish/stain/sealer/clear) drives the row list.

### 6.4 Component — `QTBuilder.jsx`
A "Materials" section **below** the vantage grid (rows = roles, cols = tiers), reusing the 2f layout: each served-tier cell is a `<select>` of `candidatesByRole[role]`, amber border + a "default" affordance when `isOverrideByRole`. `onChange` → `run(() => planSetMaterial(...))`; "default" → `run(() => planClearMaterial(...))`. `busy`-guarded. Unserved / no-candidates → `—`. Caption notes materials apply at the project quality tier today; per-tier picks are saved for the per-tier rollout.

### 6.5 Port — `engine/spec-for-scenario.js`
Cherry-pick `specForScenarioMatches(matches) → spec_family_id` from the shelved 2f branch (inverse `SPEC_TO_PAINTABLE_ITEM`; drywall disambiguated by surface + substrate_state). Engine-layer, shared by the view-model and (if needed) the estimate caller.

## 7. Files & tests

**New**
- `engine/spec-for-scenario.js` (ported) + test
- `components/authoring/qt-builder/derive-materials.js` + test

**Edit**
- `engine/material-system-roles.js` (+ cross-family `resolveSystemMeta`) + test
- `engine/material-estimates.js` (candidate source = governing scenario array; cross-family coverage; reporting)
- `engine/scenario-estimate.js` (thread fired `scenarioId` into the material pass)
- `engine/run-estimate-scenario.js` (only if `scenarioId` isn't already surfaced through `perInputResults` — it is returned at :1028)
- `components/authoring/qt-builder/tier-files.js` (+ `set/clearScenarioMaterial`) + test
- `components/authoring/qt-builder/vantage-edits.js` (+ `planSet/ClearMaterial`) + test
- `components/authoring/QTBuilder.jsx` (Materials section)

## 8. Verification

### 8.1 Unit (TDD, vitest)
- `tier-files`: `set/clearScenarioMaterial` (role-replace, append-when-absent, restore-to-baseline, immutability, same-ref no-op).
- `vantage-edits`: `planSetMaterial` (QT3 writes baseline; QT2/4/5 fork a copied array + replace role; auto-reclaim when array returns to canonical), `planClearMaterial` (restore role to canonical; delete baseline draft / reclaim fork).
- `derive-materials`: candidatesByRole grouping, resolvedByRole from the array, isOverrideByRole vs canonical, unserved tiers.
- `material-system-roles`: `resolveSystemMeta` own-family / cross-family / default with the `resolvedFrom` tag.
- All existing **285** stay green.

### 8.2 Parity analysis (the gate)
A script compares, for every activated spec family at the project tier, **read-array** output vs **today's matcher** output, and writes a report categorizing each delta:
- **Correction accepted** — array emits a role the matcher missed (closet finish) or a sensible different system.
- **Regression pre-fixed** — array omits a role the matcher provided → fix the scenario array (data) so no role is silently dropped.
- **Data bug reported** — mis-roled systems, cross-family / default coverage resolutions (from `resolvedFrom`).
- **Hours diff** — must be **zero** (assert; Phase 3 never touches hours).

The report (`devos/reports/phase3-materials-parity.md`) is reviewed before the engine cutover commits (a checkpoint, like the collapse/1c pre-apply reviews).

### 8.3 Build + live-verify
- `npx vite build` clean.
- `localhost:5183` (or 5173), admin, McLeod: the Materials section renders under the grid; QT3 finish select changes the baseline draft + estimate gallons; QT4/QT5 select forks + changes only that tier; "default" reverts; closet now shows a finish line; 0 console errors.

## 9. Edge cases & invariants
- **Hours untouched** — the material pass is independent of the hours walk; assert zero hour deltas.
- **Empty arrays** (protection scenarios) → no material lines (unchanged).
- **Cross-family / default coverage** never throws — always resolves to a number, tagged for the report.
- **QT3 editable but corrections-only by default** — an unedited canonical baseline reads its existing array; gallons move only where the array already differed from the matcher (reported) or the user edits.
- **Auto-reclaim** — setting/clearing a tier back to its canonical array (and no other divergence) deletes the draft/fork, same lifecycle as the multiplier.
- **Representative grain** — if multiple from-state scenarios fire for one family, the report notes which array was used; per-fired-scenario grain is deferred.
- **Pre-production** — drafts publish via the Drafts tab; no migration plumbing.

## 10. Out of scope / future
- Real product catalog resolution (`product-catalog.js` → `SYS_*` via `system_mappings`): brand/SKU/price, product pick per `SYS_*`, real coverage. The clean follow-on.
- Per-fired-scenario material grain; per-substrate-tier divergence.
- Data-cleanup pass: fix mis-roled systems (closet), reconcile scenario arrays with family catalogs, add missing family rows so cross-family resolution is unnecessary.
- Minting new `SYS_*` from the grid; sheen-driven per-tier selection as a first-class input.

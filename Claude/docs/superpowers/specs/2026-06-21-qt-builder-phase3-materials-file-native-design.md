# QT Builder Phase 3 — Materials File-Native — Design Spec

- **Date:** 2026-06-21
- **Status:** Approved (design); revised after discovering the live product-resolution layer.
- **Author:** Eric, with Claude
- **Branch:** `feature/qt-builder-rebuild` (off `main` @ `d98f607`, latest `64f44518` after Phase 2). NOT pushed.
- **Implements:** Phase 3 of `2026-06-20-qt-builder-tier-file-model-design.md` (§12.3, "Materials file-native").
- **Supersedes:** the shelved Phase 2f materials UI — `tier-materials.js` + `material_systems_by_tier` map + `buildScenarioMaterialOverrides` (never merged). The storage model changes (edit the scenario array, not a per-tier map).
- **Related (memory):** `project_qt_builder_rewrite`, `project_paintscope_pre_production`, `feedback_paintscope_main_checkout`, `project_color_catalog`.

---

## 1. Summary

Make the estimate engine resolve each substrate's material **system selection** from its **governing scenario's existing `material_systems` array** (the `SYS_*` ids already on every scenario), instead of re-deriving the system set from the global catalog matcher. Add a **"Materials" authoring section** at the bottom of the QT Builder that edits that array per tier (per role), with the same fork-on-edit model as the Phase 2 multiplier row. QT3 edits the baseline scenario's array directly; QT2/QT4/QT5 fork on edit.

The abstract `SYS_*` systems are the **authoring unit** (brand-agnostic "what kind of coating"). The real product catalog is **already wired downstream and is reused unchanged**: `product-resolver.js`'s `resolveProduct(systemId, …)` maps each `SYS_*` → a real catalog product (coverage / brand / price, scored by brand-preference + QT-tier, keyed cross-family via `SYSTEM_INDEX`) and is the **primary** coverage source in `computeMaterialEstimates`; the Materials tab (`ResolvedProductsView`) lets users override the resolved product per system. **Phase 3 changes only system selection** — which `SYS_*` per role per tier — and feeds cleaner per-tier `SYS_*` into that existing product layer.

**Hours are never touched.** Material **gallons will shift** for families where the scenario array and today's matcher disagree — accepted as corrections (e.g. closet finally emits its finish line) and itemized by a parity-analysis report.

## 2. Motivation & current state

Every scenario already carries a `material_systems` array (e.g. `SCN_CLOSET_SHELF_NC_QT3_BARE_BR` → `["SYS_PRIMER_WOOD_ACRYLIC","SYS_FF_STANDARD_ACRYLIC"]`). **The engine ignores it for selection.** `computeMaterialEstimates` (material-estimates.js) is **spec-family-grained**: for each activated `spec_family_id` it picks systems from the *full catalog* (`MATERIAL_SYSTEMS.filter(spec_family_id===X)`) by the project `default_quality_tier` + a hardcoded per-spec sheen, role-classified via the 2e resolver. The `scenarioMaterialOverrides` parameter exists but is passed `{}` on this branch (the 2f assembler `buildScenarioMaterialOverrides` and `spec-for-scenario.js` are 2f-only, not here).

**The product layer below selection is already live.** `product-resolver.js` consumes `product-catalog.js` (`SYSTEM_INDEX`: `SYS_*` → candidate products via `system_mappings`, many-to-many) and `brand-tier-map.js`; `resolveProduct` is the **primary** coverage/price source in `computeMaterialEstimates` (the DB coverage profile is only a fallback), resolving any `SYS_*` cross-family by id. The Materials tab `ResolvedProductsView` shows the resolved products and lets users override the product per system (`project.material_overrides.system`) or add manual entries. So the only gap is **system selection**, which still uses the matcher, not the scenario array.

The two selection representations diverge for some families (verified):
- **Cabinet** — array == matcher pick (granular primer + QT-keyed finishes). Consistent.
- **Closet** — the family's own catalog has only 2 coarse systems, both mis-roled `primer`, so the matcher emits a primer and **no finish at all** (a latent bug). The scenario array carries the correct granular primer+finish (those `SYS_*` resolve fine downstream via `resolveProduct`, which is cross-family).

## 3. Goals / Non-goals

**Goals**
- Engine resolves material **system selection** from the governing scenario's `material_systems` array (role-aware), retiring the catalog-matcher *selection* default.
- A bottom "Materials" section: per-tier × per-role `SYS_*` selects; QT3 → baseline array; QT2/4/5 fork-on-edit; clear/revert symmetric.
- A parity-analysis report categorizing every material-gallon delta vs today.
- Hours byte-identical; no scenario/module data files changed by the feature itself (drafts only, until published).

**Non-goals**
- The **existing** product-resolution layer (`product-resolver.js` `resolveProduct`; the Materials-tab `ResolvedProductsView` overrides/manual-adds; `brand-tier-map.js`) — reused unchanged, not modified.
- **Per-fired-scenario grain** — keep the existing spec-family / representative-scenario grain (one system-set per family at the project tier). Mixed bare/primed rooms using *different* arrays in one estimate is deferred.
- **Per-substrate-tier divergence** (different substrates at different tiers in one project) — out, as in Phase 2.
- **Data-cleanup of mis-roled systems / array↔catalog drift** — reported, not fixed (a follow-up pass).
- Stain authoring polish beyond the role set already present (stain/sealer/clear render like primer/finish).

## 4. The model — read the array (for selection)

| Concern | Phase 3 |
|---|---|
| **System selection** | The governing scenario's `material_systems` array (`SYS_*` ids), grouped by role. |
| **Role** | `classifySystemRole` (product_role from `MATERIAL_SYSTEM_PRODUCTS`, then id-pattern, then base role). primer/finish for paint; stain/sealer/clear for stain. |
| **Coverage / brand / price** | **Unchanged** — the existing `resolveProduct` (catalog `SYSTEM_INDEX`, cross-family by `SYS_*` id) is primary; DB coverage profile is the fallback. |
| **Coats** | `MATERIAL_SYSTEM_PRODUCTS.coats_required`; add a by-id-across-families tolerance + default (1 primer / 2 finish) for array systems the active family lacks a product row for; report when it fires. |
| **Per-tier** | Each tier's governing scenario carries its own array; forking a tier gives it its own. |
| **QT3** | Editable — writes the **baseline** scenario's array (the QT3 choice and the unforked-tier default). Not a locked anchor (unlike the rate multiplier). |
| **Empty array** | Emit no materials (correct for the 19 protection scenarios). |

## 5. Engine cutover

### 5.1 Thread the governing scenario into the material pass
`runScenarioEstimate` returns `scenarioId`; `perInputResults` already carries `{ specId, scenarioId, ctx }` (scenario-estimate.js:104-115). In `scenario-estimate.js`, before calling `computeMaterialEstimates`, build a `specId → { scenarioId, systems }` map from `perInputResults` — the **representative** fired scenario per `specId` (the first fired; if several from-states fire, representative grain picks one), reading `material_systems` from that scenario in the bundle. Pass it as a new 4th argument to `computeMaterialEstimates` (replacing the unused `scenarioMaterialOverrides = {}`).

### 5.2 Use the array for selection (material-estimates.js)
Per activated spec family, today's pass calls `resolveSpecSystems({ specSystems: <full family catalog>, …, specOverride })`. Change selection to:
- Take the representative fired scenario's `material_systems` array (from §5.1) as the chosen `SYS_*` ids.
- Group them by role (`classifySystemRole`); one system per role.
- For each role's system, run the **existing downstream unchanged**: `resolveProduct(systemId, resolverCtx, overrides)` (primary coverage/price), DB coverage-profile fallback, then the existing gallon math (quantity ÷ coverage × coats × spray-loss). Coats via the by-id tolerance (§5.3). Empty array → no lines.

**Quantity scoping is unchanged** — `buildSpecScopedQty` (per-room state-compatibility filter), `surfaceKeys` (PS-key derivation from fired tasks), the `activatedSpecs` guard, and the spray-loss factor all stay as today. Only **system selection** changes. The matcher's hardcoded `defaultSheen` and the `specStates`/`resolveSubstrateStateForSpec` selection inputs are no longer consulted for selection (the array encodes the chosen systems); remove that now-dead selection logic rather than leaving it inert.

### 5.3 Coats tolerance (material-estimates.js)
`resolveProduct` already resolves coverage/price for any `SYS_*` cross-family (via `SYSTEM_INDEX`), so **no new resolver is needed**. The only family-keyed remnant is the **coats** lookup (`productsBySystem[specId + '::' + systemId]`, material-estimates.js:206), which misses when the array references a system without a product row under the active family (e.g. closet's `SYS_FF_STANDARD_ACRYLIC`). Add a fallback: look up `coats_required` for the system **by id under any family**; default `1` (primer) / `2` (finish) when absent. Tag the fallback so the parity report can list it. No change to `product-resolver.js` or `material-system-roles.js`.

### 5.4 Outputs unchanged in shape
Material estimate line shape (gallons, role, system id/name, product fields, coverage) is unchanged; only the *selection* changes. `computeExteriorMaterialEstimates` is untouched. The 2f-style `{specId:{tier:{role}}}` override assembler is **not** introduced.

## 6. Authoring UI

### 6.1 Storage ops — `qt-builder/tier-files.js` (pure, immutable)
- `setScenarioMaterial(scenario, systemId, role, roleBySystemId) → scenario` — return a new scenario whose `material_systems` has the element classified as `role` replaced by `systemId` (append if no element of that role exists; preserve order; same ref on no-op).
- `clearScenarioMaterial(scenario, role, baselineSystemId, roleBySystemId) → scenario` — set the `role` element back to `baselineSystemId` (the canonical/baseline pick); if `baselineSystemId` is null, remove the role element. Same ref on no-op.

### 6.2 Fork-on-edit plans — `qt-builder/vantage-edits.js`
- `planSetMaterial(bundle, sel, tier, role, systemId) → { scenario } | { deleteScenarioId, … } | {}` — `ensureScenarioForTier` (QT3 = baseline, no fork; QT2/4/5 fork a **copy** of the array), then `setScenarioMaterial`. If the result's `material_systems` deep-equals the **canonical** scenario's array AND (for a fork) no other divergence (modules / `modifier_overrides`), auto-reclaim (return `{ deleteScenarioId, deleteModuleIds }`) — mirrors `planClearQtFactor`.
- `planClearMaterial(bundle, sel, tier, role) → { scenario } | { deleteScenarioId, … } | {}` — look up the canonical scenario's system for `role`, `clearScenarioMaterial` back to it, then the same auto-reclaim check (a QT3 baseline draft that returns to canonical → delete the baseline scenario draft).

Both need the **canonical** (pre-draft) scenario: the component passes the canonical `bundle` (imported `scenario-bundle.gen.js`) alongside the overlaid `mergedBundle`, so "default for this role" = the canonical array's role element.

### 6.3 View-model — `qt-builder/derive-materials.js` (new, pure)
`deriveMaterials(bundle, sel)` → per served tier `{ scenarioId, specId, roles, candidatesByRole, resolvedByRole, isOverrideByRole }`:
- Resolve the governing scenario per tier via `findBestMatch` (same as `deriveVantage`).
- `specId` via `specForScenarioMatches(scenario.matches)` (§6.5).
- `candidatesByRole` = `MATERIAL_SYSTEMS.filter(spec_family_id===specId)` grouped by `classifySystemRole` (the dropdown options — brand-agnostic `SYS_*` within the family).
- `resolvedByRole` = the scenario array's element per role.
- `isOverrideByRole` = the resolved system differs from the **canonical** scenario's array for that role.
- `materialRoles` (union across tiers, ordered primer/finish/stain/sealer/clear) drives the row list.

### 6.4 Component — `QTBuilder.jsx`
A "Materials" section **below** the vantage grid (rows = roles, cols = tiers), reusing the 2f layout: each served-tier cell is a `<select>` of `candidatesByRole[role]`, amber border + a "default" affordance when `isOverrideByRole`. `onChange` → `run(() => planSetMaterial(...))`; "default" → `run(() => planClearMaterial(...))`. `busy`-guarded. Unserved / no-candidates → `—`. Caption notes materials apply at the project quality tier today; per-tier picks are saved for the per-tier rollout. (This is the spec-level `SYS_*` picker; the real-product pick stays in the Materials tab's `ResolvedProductsView`.)

### 6.5 Port — `engine/spec-for-scenario.js`
Cherry-pick `specForScenarioMatches(matches) → spec_family_id` from the shelved 2f branch (inverse `SPEC_TO_PAINTABLE_ITEM`; drywall disambiguated by surface + substrate_state). Engine-layer, used by the view-model to scope candidate systems per family.

## 7. Files & tests

**New**
- `engine/spec-for-scenario.js` (ported) + test
- `components/authoring/qt-builder/derive-materials.js` + test

**Edit**
- `engine/material-estimates.js` (selection source = governing scenario array; coats by-id tolerance; parity-report tagging; remove dead matcher-selection logic)
- `engine/scenario-estimate.js` (build the `specId → {scenarioId, systems}` map from `perInputResults`; pass it into `computeMaterialEstimates`)
- `components/authoring/qt-builder/tier-files.js` (+ `set/clearScenarioMaterial`) + test
- `components/authoring/qt-builder/vantage-edits.js` (+ `planSet/ClearMaterial`) + test
- `components/authoring/QTBuilder.jsx` (Materials section)

## 8. Verification

### 8.1 Unit (TDD, vitest)
- `tier-files`: `set/clearScenarioMaterial` (role-replace, append-when-absent, restore-to-baseline, immutability, same-ref no-op).
- `vantage-edits`: `planSetMaterial` (QT3 writes baseline; QT2/4/5 fork a copied array + replace role; auto-reclaim when array returns to canonical), `planClearMaterial` (restore role to canonical; delete baseline draft / reclaim fork).
- `derive-materials`: candidatesByRole grouping, resolvedByRole from the array, isOverrideByRole vs canonical, unserved tiers.
- `material-estimates` coats tolerance: a system without a product row under the active family resolves `coats_required` by-id across families, defaults when absent, and tags the fallback.
- `spec-for-scenario`: `specForScenarioMatches` maps representative matches → the right `spec_family_id` (incl. drywall wall/ceiling disambiguation).
- All existing **285** stay green.

### 8.2 Parity analysis (the gate / checkpoint)
A script compares, for every activated spec family at the project tier, **read-array selection** output vs **today's matcher** output, and writes a report (`devos/reports/phase3-materials-parity.md`) categorizing each delta:
- **Correction accepted** — array emits a role the matcher missed (closet finish) or a sensible different system.
- **Regression pre-fixed** — array omits a role the matcher provided → fix the scenario array (data) so no role is silently dropped.
- **Data bug reported** — mis-roled systems, coats by-id-tolerance/default fallbacks.
- **Hours diff** — must be **zero** (assert; Phase 3 never touches hours).

Reviewed **before** the engine-cutover commit (a checkpoint, like the collapse/1c pre-apply reviews). This is the natural review gate between the engine work and the authoring UI.

### 8.3 Build + live-verify
- `npx vite build` clean.
- `localhost:5183`/`5173`, admin, McLeod: the Materials section renders under the grid; QT3 finish select changes the baseline draft + estimate gallons; QT4/QT5 select forks + changes only that tier; "default" reverts; closet now shows a finish line; the Materials tab's `ResolvedProductsView` reflects the new system's resolved product; 0 console errors.

## 9. Edge cases & invariants
- **Hours untouched** — the material pass is independent of the hours walk; assert zero hour deltas.
- **Empty arrays** (protection scenarios) → no material lines (unchanged).
- **`resolveProduct` unchanged** — selection feeds it cleaner `SYS_*`; its scoring/override levels and the Materials-tab overrides keep working.
- **Coats tolerance never throws** — always resolves to a number, tagged for the report.
- **QT3 editable but corrections-only by default** — an unedited canonical baseline reads its existing array; gallons move only where the array already differed from the matcher (reported) or the user edits.
- **Auto-reclaim** — setting/clearing a tier back to its canonical array (and no other divergence) deletes the draft/fork, same lifecycle as the multiplier.
- **Representative grain** — if multiple from-state scenarios fire for one family, the report notes which array was used; per-fired-scenario grain is deferred.
- **Pre-production** — drafts publish via the Drafts tab; no migration plumbing.

## 10. Out of scope / future
- Changing the **existing** product-resolution layer (`resolveProduct`, the Materials-tab `ResolvedProductsView` overrides/manual-adds, `brand-tier-map.js`) — reused as-is.
- Per-fired-scenario material grain; per-substrate-tier divergence.
- Data-cleanup pass: fix mis-roled systems (closet), reconcile scenario arrays with family catalogs, add missing family product rows so the coats tolerance is unnecessary.
- Minting new `SYS_*` from the grid; sheen-driven per-tier selection as a first-class input.

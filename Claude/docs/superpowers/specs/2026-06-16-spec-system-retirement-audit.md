# Spec System Retirement — Audit & Archival Design

**Date:** 2026-06-16
**Status:** AUDIT-ONLY. Captures the decision, the Phase-0 inventory, the disposition (all open questions resolved 2026-06-16 — see §7), and the phased plan shape. The implementation *sequence* is **not** committed here — the build is to be scoped in a later session. No code changes follow from this document.
**Branch context:** `claude/cranky-saha` (the scenario-engine line; 75 SF_* spec folders + spec engine still present).

---

## 1. Decision & rationale

Retire the **Specification System** as a dead end — no further development will be done on it. The **Scenario Engine** (`run-estimate-scenario.js`, `context-adapter.js`, `Claude/modules/MOD_*.json` + `Claude/scenarios/SCN_*.json`) is the sole go-forward architecture.

**Archival approach — Hybrid, archive-wholesale (chosen 2026-06-16):**
- **Archive** all 75 `Claude/specs/SF_*_v1/` folders wholesale into an in-repo `Claude/_archive/spec-system/` folder that **stays on `main`** (browsable/searchable reference). **No curation pass** — the spec docs *are* the doctrine and we don't pre-judge what's reusable. They are JSON data, not engine code, so they don't reintroduce the two-engines confusion.
- **Git-tag** the full spec-intact state (`archive/spec-system-final`) so the entire system (code included) is restorable on demand.
- **Delete** the spec *machinery* from `main`: engine code, `spec-maps.js`, db spec tables, Rates UI, and the Assemblies tab.
- **Merge** the now scenario-only branch to `main`.

**Why:** a less-confusing repo for AI-assisted development — one estimation architecture on `main`, not two parallel ones. Git preserves all history regardless, so nothing is ever truly lost; the lever is *accessibility of reference* vs. *cleanliness of `main`*.

**Calibration:** PaintScope is pre-production (test estimates only, no live customers). Temporary estimate degradation in undeveloped categories during the transition is acceptable.

---

## 2. Category maturity (why gaps are NOT blockers)

| Category | Scenario-engine state |
|---|---|
| **NC Interior** | Most complete; fine-tuned; the proven path (not 100% finished). |
| **Exterior** | Early development, much remaining. |
| **Repaint (interior + exterior)** | Not worked through; spec remnants; undeveloped on scenarios. |

In April 2026 a single bulk AI conversion turned *all* specs into tasks/modules/scenario files in one unverified pass. So the spec system's coverage of repaint/exterior was **never a trusted baseline either**. Therefore scenario-engine coverage gaps are a **development roadmap, not retirement blockers**. Removing the spec system may leave repaint/exterior estimates incomplete until scenario dev catches up — acceptable.

---

## 3. Inventory findings (Phase 0)

**The deletion is the easy ~20%.** Two classes of *live* dependency on the spec layer are the real blockers.

### 3a. The scenario engine still borrows from the spec layer (umbilical cords)

| Live file (scenario path) | Borrows from spec layer | Evidence |
|---|---|---|
| `engine/context-adapter.js` | 10 resolvers from `spec-resolution.js`; `resolveSubstrateStateForSpec` + `isSpecStateCompatible` from `spec-compatibility.js`; 5 constants from `spec-maps.js` (`STAIN_SPEC_FAMILIES`, `UI_STATE_TO_SPEC_STATE`, `EXT_UI_STATE_TO_SPEC_STATE`, `SPEC_SUBSTRATE_MAP`, `SPEC_ROLE`); **iterates `db.spec_families`** to decide active specs | :22-33, :37-45, :1003 |
| `engine/material-estimates.js` (scenario-live via `useEstimateScenario.js:30`) | `SPEC_SUBSTRATE_MAP`, `isSpecStateCompatible`; reads `db.material_systems`, `db.material_coverage_profiles`, `db.spec_required_inputs` | :3-4, :115, :129, :139 |
| `engine/floor-protection.js` (scenario-live via `useEstimateScenario.js:28`) | reads `db.spec_protection_zones`, `db.sop_tasks` | :26, :47 |
| `engine/multi-qt.js` (live via `EstimateView.jsx:13`) | reads `db.quality_tier_effects` | :35 |
| `engine/scope-tree.js`, `tracker/build-snapshot.js`, `components/estimate/EstimateDiagnostic.jsx` | import `SPEC_SUBSTRATE_MAP` | :21, :2, :6 |

`SPEC_SUBSTRATE_MAP` is the single most-borrowed constant — it is really a substrate→routing map and is the prime **re-home** target (becomes scenario-owned / substrate-keyed).

### 3b. The legacy spec engine still powers live UI

The old strategy doc assumed `run-estimate.js` was already dead. **It isn't.** `useEstimate` → `run-estimate.js` still exclusively powers:

- `components/workorder/WorkOrderView.jsx` (work orders)
- `components/materials/MaterialCostView.jsx` + `ResolvedProductsView.jsx` (Materials tab)
- `components/estimate/EstimateView.jsx` runs **both** engines side-by-side (`legacyEstimate` :109, `scenarioEstimate` :110)

`run-estimate.js` reads the full legacy table set: `spec_required_inputs` (:118), `sop_modules` (:125), `sop_tasks` (:164), `task_production_rates` (:173), `spec_families` (:187,:511,:785), `coat_counts` (:315). It pulls in `modifier-stack.js` (legacy-only; reads `factor_modifiers` :48, `quality_tier_effects` :35) and `exterior-protection.js` (legacy-only; reads `sop_tasks` :57, `spec_protection_zones` :63). It also **hosts the entire exterior scenario orchestration** (:652-736) — see §7 #6.

### 3c. Pure-spec UI + features (clean deletes once data is gone)

- `components/rates/SpecEditorView.jsx`, `ModifierPanel.jsx`, `RequiredInputsBar.jsx` (the Rates tab)
- `state/spec-editor-reducer.js` (writes `sop_tasks`, `task_production_rates`, `sop_modules`, `factor_modifiers`, `spec_required_inputs`)
- `hooks/useSpecData.jsx`
- `components/assemblies/TaskPickerModal.jsx` + the **Assemblies** nav tab read `spec_families`/`sop_modules`/`sop_tasks` via `useSpecData` (:11, :22-31) — **decision 2026-06-16: DELETE the Assemblies feature with the spec system** (not a keeper)
- `EstimateView.jsx:324` displays `spec_families.length` (diagnostic text only)

### 3d. Data

- `data/db-bundle.js` spec tables: `spec_families`, `sop_modules`, `sop_tasks`, `task_production_rates`, `factor_modifiers`, `quality_tier_effects`, `spec_required_inputs`, `spec_protection_zones`, `coat_counts`, `material_systems`, `material_coverage_profiles`.
- `Claude/specs/SF_*_v1/` — **75 spec folders** (many `_RP_` / `_EXT_` remnants). The doctrine source to archive.

---

## 4. Disposition classification (decided 2026-06-16)

| Disposition | Items |
|---|---|
| **RE-HOME** (scenario depends; move into scenario-owned modules/data) | **Code:** `spec-maps.js` constants used by scenario (`SPEC_SUBSTRATE_MAP`, `SPEC_ROLE`, `UI_STATE_TO_SPEC_STATE`, `EXT_UI_STATE_TO_SPEC_STATE`, `STAIN_SPEC_FAMILIES`); the 10 `spec-resolution.js` resolvers + 2 `spec-compatibility.js` helpers used by `context-adapter.js`; the `db.spec_families` active-spec iteration. **Data (re-key off `spec_family_id`):** `material_systems`, `material_coverage_profiles`, `spec_protection_zones`, `quality_tier_effects` → scenario-owned (substrate-/scenario-keyed), update readers `material-estimates.js` / `floor-protection.js` / `multi-qt.js`. `spec_required_inputs` → **dropped**: interior material path derives PS keys from scenario task `psKey` fields (the pattern exterior already uses — `material-estimates.js:357-365`). |
| **DELETE-WITH-LEGACY** (dies when `run-estimate.js` retires) | `run-estimate.js`, `useEstimate.js`, `modifier-stack.js` (compute), `exterior-protection.js` (after exterior orchestration relocated — §7 #6), legacy reads of `spec_families`/`sop_modules`/`sop_tasks`/`task_production_rates`/`coat_counts`/`factor_modifiers` |
| **DELETE** (pure-spec UI + features) | `components/rates/*` (Rates tab), `spec-editor-reducer.js`, `useSpecData.jsx`, `components/assemblies/*` + the Assemblies nav tab (incl. `TaskPickerModal.jsx`) |
| **ARCHIVE** (in-repo folder + git tag; no curation) | `Claude/specs/SF_*_v1/` (75 folders) → move to `Claude/_archive/spec-system/`; plus `git tag archive/spec-system-final` for full restore |

---

## 5. The three prerequisite workstreams

The deletion cannot happen until these land and are verified (NC-interior estimate parity is the safety check):

- **P1 — Free the scenario adapter.** Re-home the spec-maps constants, the `spec-resolution`/`spec-compatibility` functions, and the `db.spec_families` active-spec iteration into scenario-owned modules so `context-adapter.js` no longer imports from the spec layer.
- **P2 — Migrate the legacy-engine consumers + relocate exterior orchestration.** Move WorkOrderView, MaterialCostView, ResolvedProductsView, and EstimateView's legacy half onto the scenario engine. **Relocate the exterior scenario orchestration out of `run-estimate.js` first** (`:652-736` is the *only* place exterior runs today — `useEstimateScenario` is interior-only), or exterior estimation breaks. Then retire `run-estimate.js` + `useEstimate` + `modifier-stack.js`. Single cutover (not per-view).
- **P3 — Re-home material/protection/QT data.** Re-key `material_systems`, `material_coverage_profiles`, `spec_protection_zones`, `quality_tier_effects` off `spec_family_id` into scenario-owned data and update their readers; drop `spec_required_inputs` (interior derives PS keys from scenario tasks, as exterior already does).

---

## 6. Phased plan (shape — sequence not yet committed)

| Phase | Work |
|---|---|
| 0 | Inventory (this document) |
| 1 | **P1** — free the scenario adapter |
| 2 | **P2** — relocate exterior orchestration; migrate legacy consumers (single cutover); retire `run-estimate.js` |
| 3 | **P3** — re-home material/protection/QT data |
| 4 | Archive `/specs` → `Claude/_archive/spec-system/` (in-repo, wholesale, no curation) |
| 5 | `git tag archive/spec-system-final` |
| 6 | Delete spec machinery (engine, `spec-maps.js`, db spec tables, Rates UI, Assemblies) from `main` |
| 7 | Merge scenario-only branch → `main` |

**Sequencing rule:** P1/P2/P3 must be complete and verified (NC interior estimate unchanged) before any deletion (Phase 6-7). Everything before deletion is reversible; the tag (Phase 5) is the safety net for everything after.

---

## 7. Decisions (resolved 2026-06-16) + remaining build-scoping

**Resolved:**
1. **Assemblies** (`TaskPickerModal.jsx` + nav tab) — **DELETE** with the spec system (not a keeper).
2. **`spec_required_inputs`** — **dropped**: the interior material path will derive PS keys from scenario task `psKey` fields, the same way exterior already does (`material-estimates.js:357-365`).
3. **`material_systems` / `material_coverage_profiles` / `spec_protection_zones` / `quality_tier_effects`** — **RE-HOME** (re-key off `spec_family_id` into scenario-owned data), not keep-as-spec-table.
4. **Doctrine** — **archive wholesale, no curation**: move the 75 spec folders to `Claude/_archive/spec-system/` (in-repo, browsable) + `git tag archive/spec-system-final`.
5. **P2 granularity** — **single cutover** (all legacy consumers at once).
6. **Exterior orchestration** — **confirmed**: `run-estimate.js:652-736` is the only place exterior estimation runs (builds scenario inputs :654-655 → `runScenarioEstimate` :672 → `scenarioResultsToSpecResults({domain:'exterior'})` :702 → `resolveExteriorProtection` :721 → `computeExteriorMaterialEstimates` :736); `useEstimateScenario` is interior-only. **Relocate this block into the scenario path before retiring `run-estimate.js`.**

**Resolved in the 2026-06-16 build-scoping session** (see §9 for the P1 implementation that followed):
- **Re-home target for the four data tables** → a **new scenario-owned, substrate-keyed data module** (NOT folded into `scenario-bundle.gen.js`, which is auto-generated by `build-scenario-bundle.mjs` from `/modules`+`/scenarios`+`/modifiers`+`/tasks`; and NOT left in SQLite-generated `db-bundle.js`, which retires with the spec system). spec↔substrate is 1:1 (per `SPEC_SUBSTRATE_MAP`), but 3 of the 4 tables carry no substrate column, so the re-key joins through `SPEC_SUBSTRATE_MAP`. Sub-decision deferred to the P3 build: freeze the re-keyed data into a committed module vs. keep regenerating via a modified exporter (leaning **freeze**, since SQLite is going away). **(P3)**
- **`/specs` folders are build-only — confirmed safe to relocate.** `import_spec.py` ingests `/specs/SF_*_v1/*.json` → `Claude/database/paintfactor.db`; `export_db_bundle.py` bakes SQLite → `src/data/db-bundle.js`. `scenario-bundle.gen.js` builds from `/modules`+`/scenarios`+`/modifiers`+`/tasks` (NOT `/specs`). Runtime `src/` never reads `/specs` (no `fs`/`import.meta.glob`/`fetch`; no `SF_`/spec-json references; no `vite.config` glob). Only the retiring `import_spec.py` workflow would need a path update. **(Phase 4)**
- **Relocated exterior orchestration** → a **shared, plain (non-React) orchestrator** that both the interior and exterior scenario paths call (NOT inside the `useEstimateScenario` React hook, which is uncallable from non-React code; `run-estimate.js`'s exterior block is a plain function with non-React callers). Bonus finding: `buildScenarioInputs` **already appends** exterior inputs (`context-adapter.js:1335-1339`), so only the exterior *post-processing* (`scenarioResultsToSpecResults({domain:'exterior'})` + `resolveExteriorProtection` + `computeExteriorMaterialEstimates`) still needs relocating — smaller than the audit first assumed. **(P2)**

---

## 8. Explicitly NOT in scope

- Building repaint / exterior scenario coverage (separate development roadmap; see `project_spec_system_retirement` memory).
- The Application Method Presets feature (separate deferred item).
- **Doctrine curation** — explicitly skipped; the spec folders are archived wholesale for later reference instead.
- Any change to the bid math beyond NC-interior parity preservation.

---

## 9. P1 — DONE (2026-06-16)

**P1 (free the scenario adapter) landed** on `claude/cranky-saha` per the plan [`2026-06-16-spec-retirement-p1-free-scenario-adapter.md`](../plans/2026-06-16-spec-retirement-p1-free-scenario-adapter.md). Four implementation commits (`20d68d3` → `fc3e0ea` → `e6f0f48` → `57fb7c6`) plus this doc note, executed subagent-driven with per-task spec + code-quality review.

- **`context-adapter.js` is now spec-layer-free** — it imports only from scenario-owned modules and no longer reads `db.spec_families`. Active specs derive from `new Set(Object.keys(SPEC_SUBSTRATE_MAP))`, a proven no-op (any spec id absent from the map was already skipped by the `if (!primarySub) continue` guard; the drop was independently verified behavior-preserving on both set-membership and iteration-order axes).
- **Re-homed — real definitions moved into scenario-owned modules:**
  - constants → `src/data/scenario-maps.js`
  - resolvers (10) → `src/engine/scenario-resolution.js`
  - state-compat helpers (3) → `src/engine/scenario-compatibility.js`
- **The three old spec-layer files are now thin re-export shims** (`data/spec-maps.js`, `engine/spec-resolution.js`, `engine/spec-compatibility.js`); `spec-compatibility.js` also retains `evaluateAppliesWhen` (legacy-only). Guard test `engine/__tests__/scenario-adapter-decoupling.test.js` asserts the adapter has zero spec-layer imports + no `spec_families`, and that the shims forward identical bindings (`.toBe`).
- **Verification:** full suite **167 passed** (prior 160 + 7 new); NC-interior parity preserved (pure move).

**Remaining shim consumers → the P2/P3 handoff** (verified by grep over `src/`):
- **P2 — retire the legacy engine:** `engine/run-estimate.js`, `engine/modifier-stack.js` import from the shims; they die when `run-estimate.js` is retired (after the exterior post-processing above is relocated into the scenario path).
- **P3 — re-home material/protection/QT data + repoint readers:** `engine/material-estimates.js`, `engine/scope-tree.js`, `tracker/build-snapshot.js`, `components/estimate/EstimateDiagnostic.jsx` import `SPEC_SUBSTRATE_MAP` / `isSpecStateCompatible` from the shims.
- The shims (and the rest of the spec machinery) **delete in Phase 6**, once P2 + P3 remove these consumers.

(The guard test intentionally imports from the shims to assert shim integrity — that is not a runtime coupling.)

---

## 10. P2a — DONE (2026-06-16)

**P2a (plain scenario orchestrator + exterior completion) landed** on `claude/cranky-saha` per the plan [`2026-06-16-spec-retirement-p2a-shared-orchestrator.md`](../plans/2026-06-16-spec-retirement-p2a-shared-orchestrator.md). Commits: `3964a08` (extract orchestrator) → `6478e8a` (graft exterior protection + materials) → `f153a52` (regression test). Executed subagent-driven (per-task spec + code-quality review; opus on the critical extraction + the exterior graft).

- **`engine/scenario-estimate.js` now hosts the plain, non-React `computeScenarioEstimate(state, db, bundle, profile, products, overlayStats)`** — it computes the COMPLETE estimate (interior + exterior protection + materials), moving `normalizeToSpecResults` + `dedupeSharedTasks` out of the hook. `useEstimateScenario` is a thin React wrapper (overlay-load + ledger effects retained; 435→93 lines).
- **The two exterior post-processors** (`resolveExteriorProtection` + `computeExteriorMaterialEstimates`) were ported verbatim from `run-estimate.js:718-738`. The scenario path is now a complete functional replacement for the legacy engine.
- **Discovery — `db.spec_families` has 24 interior families and ZERO exterior.** The scenario path derives `domain` from `db.spec_families`, so every exterior spec was falling back to `'interior'`. Fixed in `normalizeToSpecResults` with a roomIndex-based fallback (`first.roomIndex <= -100 → 'exterior'`), matching legacy's explicit exterior tagging. This *reduces* dependence on the retiring `db.spec_families` — aligned with the retirement direction.
- **Exterior scenario coverage is thin** — only `SCN_EXT_DECK_NC_STAIN` exists; ~16 other exterior families (siding, trim, windows, doors, soffit, foundation, fence, caulk, stucco, masonry) have **no scenario**. So exterior protection/materials come out **empty** for any fixture today (in both engines). P2a ports the orchestration *faithfully* (verified scenario-vs-legacy byte-identical); rich exterior output awaits scenario authoring — the exterior-dev roadmap, separate from retirement.
- **Verification:** interior parity preserved (synthetic fixture = 21.13, byte-identical before/after the extraction); exterior scenario output == legacy `run-estimate.js` (byte-for-byte, sparse-but-equal); new unit test (`engine/scenario-estimate.test.js`, 3 cases) guards the exterior wiring; **suite 170**. `run-estimate.js` / `useEstimate.js` / `modifier-stack.js` untouched. The parity harness (`scripts/parity-estimate.mjs`) now calls the real orchestrator — reusable for P2b before/after checks.

**P2b can now (the cutover + deletion):**
1. **Proposal generation:** replace `computeMultiQT(runEstimate, ...)` at `EstimateView.jsx:237` with the plain orchestrator. `computeMultiQT` calls `runEstimateFn(qtState, db, undefined, profile)` per tier — pass an adapter `(s, db, _ov, prof) => computeScenarioEstimate(s, db, canonicalBundle, prof, [])`.
2. Swap `WorkOrderView` / `MaterialCostView` / `ResolvedProductsView` from `useEstimate` → `useEstimateScenario` (return shape is covered).
3. Drop EstimateView's dual-engine: remove the `useEstimate` import + the `engine` toggle; default scenario-only.
4. Delete `run-estimate.js` + `useEstimate.js` + `modifier-stack.js`; **preserve `COMPLEXITY_OPT_OUT_SPECS`** (EstimateView imports it — move it to `data/constants.js` or similar).
5. **Carried cleanup nits (P2a Task-3 review, do in P2b since it touches this code):** hoist `const hasExterior = !!(state.exterior?.elevations?.length)` in `computeScenarioEstimate` (3 duplicated guards); and export `isExteriorRoomIndex = (i) => i <= -100` from `context-adapter.js`, consolidating the 3 sites that encode the `-100` convention (`context-adapter.js` doc-comment, `scenario-to-spec-results.js:41`, `scenario-estimate.js:326`).

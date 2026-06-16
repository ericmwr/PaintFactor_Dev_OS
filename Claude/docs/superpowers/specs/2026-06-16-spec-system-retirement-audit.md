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

**Remaining for build-scoping:**
- Exact re-home target for the four data tables — a substrate-keyed module vs. folding into the scenario bundle (`scenario-bundle.gen.js`).
- Confirm `/specs` folders are build-only source (not read at runtime) before relocating — expected, since `db-bundle.js` is the baked runtime DB; identify the build/import script that ingests `/specs`.
- Where the relocated exterior orchestration lives — inside `useEstimateScenario`, or a shared orchestrator both the interior and exterior scenario paths call.

---

## 8. Explicitly NOT in scope

- Building repaint / exterior scenario coverage (separate development roadmap; see `project_spec_system_retirement` memory).
- The Application Method Presets feature (separate deferred item).
- **Doctrine curation** — explicitly skipped; the spec folders are archived wholesale for later reference instead.
- Any change to the bid math beyond NC-interior parity preservation.

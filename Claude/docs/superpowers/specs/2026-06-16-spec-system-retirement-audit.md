# Spec System Retirement — Audit & Archival Design

**Date:** 2026-06-16
**Status:** AUDIT-ONLY. This captures the decision, the Phase-0 inventory, and the phased plan shape. The implementation sequence is **not** committed here — the build is to be scoped in a later session. No code changes follow from this document.
**Branch context:** `claude/cranky-saha` (the scenario-engine line; 75 SF_* spec folders + spec engine still present).

---

## 1. Decision & rationale

Retire the **Specification System** as a dead end — no further development will be done on it. The **Scenario Engine** (`run-estimate-scenario.js`, `context-adapter.js`, `Claude/modules/MOD_*.json` + `Claude/scenarios/SCN_*.json`) is the sole go-forward architecture.

**Archival approach — Hybrid (chosen):**
- **Extract** the high-value doctrine / calibration rationale / SOP knowledge from the spec files into a curated `docs/` reference set that **stays on `main`**.
- **Git-tag** the full spec-intact state (`archive/spec-system-final`) so the entire system is restorable on demand.
- **Delete** the spec machinery from `main` (engine code, `spec-maps.js`, db spec tables, Rates UI, `/specs` folders).
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

`run-estimate.js` reads the full legacy table set: `spec_required_inputs` (:118), `sop_modules` (:125), `sop_tasks` (:164), `task_production_rates` (:173), `spec_families` (:187,:511,:785), `coat_counts` (:315). It pulls in `modifier-stack.js` (legacy-only; reads `factor_modifiers` :48, `quality_tier_effects` :35) and `exterior-protection.js` (legacy-only; reads `sop_tasks` :57, `spec_protection_zones` :63).

### 3c. Pure-spec UI (clean deletes once data is gone)

- `components/rates/SpecEditorView.jsx`, `ModifierPanel.jsx`, `RequiredInputsBar.jsx` (the Rates tab)
- `state/spec-editor-reducer.js` (writes `sop_tasks`, `task_production_rates`, `sop_modules`, `factor_modifiers`, `spec_required_inputs`)
- `hooks/useSpecData.jsx`
- `components/assemblies/TaskPickerModal.jsx` reads `spec_families`/`sop_modules`/`sop_tasks` — **keep-or-migrate decision needed**
- `EstimateView.jsx:324` displays `spec_families.length` (diagnostic text only)

### 3d. Data

- `data/db-bundle.js` spec tables: `spec_families`, `sop_modules`, `sop_tasks`, `task_production_rates`, `factor_modifiers`, `quality_tier_effects`, `spec_required_inputs`, `spec_protection_zones`, `coat_counts`, `material_systems`, `material_coverage_profiles`.
- `Claude/specs/SF_*_v1/` — **75 spec folders** (many `_RP_` / `_EXT_` remnants). The doctrine source + the archive bulk.

---

## 4. Disposition classification

| Disposition | Items |
|---|---|
| **RE-HOME** (scenario depends; copy into scenario-owned modules) | `spec-maps.js` constants used by scenario (`SPEC_SUBSTRATE_MAP`, `SPEC_ROLE`, `UI_STATE_TO_SPEC_STATE`, `EXT_UI_STATE_TO_SPEC_STATE`, `STAIN_SPEC_FAMILIES`); the 10 `spec-resolution.js` resolvers + 2 `spec-compatibility.js` helpers used by `context-adapter.js`; the `db.spec_families` active-spec iteration |
| **KEEP / CARRY-FORWARD** (live material/protection/QT data) | `material_systems`, `material_coverage_profiles`, `spec_protection_zones`, `quality_tier_effects` — and the readers `material-estimates.js`, `floor-protection.js`, `multi-qt.js` (either keep tables or re-home readers off them) |
| **DELETE-WITH-LEGACY** (dies when `run-estimate.js` retires) | `run-estimate.js`, `useEstimate.js`, `modifier-stack.js` (compute), `exterior-protection.js` (if exterior protection re-homed), legacy reads of `spec_families`/`sop_modules`/`sop_tasks`/`task_production_rates`/`coat_counts`/`factor_modifiers` |
| **DELETE** (pure-spec UI) | `components/rates/*`, `spec-editor-reducer.js`, `useSpecData.jsx` |
| **ARCHIVE** (git tag + doctrine extraction) | `Claude/specs/SF_*_v1/` (75 folders) |

---

## 5. The three prerequisite workstreams

The deletion cannot happen until these land and are verified (NC-interior estimate parity is the safety check):

- **P1 — Free the scenario adapter.** Re-home the spec-maps constants, the `spec-resolution`/`spec-compatibility` functions, and the `db.spec_families` active-spec iteration into scenario-owned modules so `context-adapter.js` no longer imports from the spec layer.
- **P2 — Migrate the legacy-engine consumers.** Move WorkOrderView, MaterialCostView, ResolvedProductsView, and EstimateView's legacy half onto the scenario engine, then retire `run-estimate.js` + `useEstimate` + `modifier-stack.js`.
- **P3 — Carry material/protection/QT data forward.** Keep (or re-home the readers off) `material_systems`, `material_coverage_profiles`, `spec_protection_zones`, `quality_tier_effects`.

---

## 6. Phased plan (shape — sequence not yet committed)

| Phase | Work |
|---|---|
| 0 | Inventory (this document) |
| 1 | **P1** — free the scenario adapter |
| 2 | **P2** — migrate legacy consumers; retire `run-estimate.js` |
| 3 | **P3** — settle material/protection/QT data |
| 4 | Extract doctrine → curated `docs/` reference set |
| 5 | `git tag archive/spec-system-final` |
| 6 | Delete spec machinery + `/specs` folders from `main` |
| 7 | Merge scenario-only branch → `main` |

**Sequencing rule:** P1/P2/P3 must be complete and verified (NC interior estimate unchanged) before any deletion (Phases 6-7). Everything before deletion is reversible; the tag (Phase 5) is the safety net for everything after.

---

## 7. Open questions for build-scoping

1. **Assemblies `TaskPickerModal.jsx`** — keep (migrate to scenario data) or delete with the spec system?
2. **`spec_required_inputs`** — `material-estimates.js` already derives exterior PS keys from scenario tasks instead of this table (per the May exterior cutover). Confirm the interior material path can do the same so the table can go.
3. **Keep vs. re-home** for `material_systems` / `material_coverage_profiles` / `spec_protection_zones` / `quality_tier_effects` — keep as substrate-keyed data, or fold into the scenario bundle?
4. **Doctrine extraction targets** — which spec files/fields hold reusable doctrine worth curating (e.g. `research.json`, `sop_modules.json` narratives, `_doctrine_note` fields, calibration notes)? Requires a content pass over the 75 spec folders.
5. **P2 granularity** — migrate the legacy consumer views one at a time or as a single cutover?
6. **Exterior orchestration in `run-estimate.js`** — post-May-2026 cutover, `run-estimate.js` also hosts the exterior scenario-engine call + exterior/floor protection + material wiring. Confirm whether `useEstimateScenario` already reproduces exterior orchestration, or whether P2 must relocate that logic out of `run-estimate.js` before it can be retired (don't let the exterior path regress when the legacy orchestrator goes).

---

## 8. Explicitly NOT in scope

- Building repaint / exterior scenario coverage (separate development roadmap; see `project_spec_system_retirement` memory).
- The Application Method Presets feature (separate deferred item).
- Any change to the bid math beyond NC-interior parity preservation.

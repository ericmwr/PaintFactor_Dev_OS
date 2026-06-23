# QT Builder Stain Authoring (P2) — Design

> **Status:** Design (brainstormed + approved 2026-06-23). No implementation plan yet.
> **Branch:** to be created off `feature/stain-decomposition` @ `7cf11b6e` (PR #8, open/unmerged). Edit in MAIN checkout (`C:\Eric_AI_Playground\Claude Code Uni\Claude`).
> **Parent design:** [`2026-06-22-stain-model-qt-builder-design.md`](2026-06-22-stain-model-qt-builder-design.md) (§7 "QT Builder authoring ≈ paint", §8 P2). This doc refines P2 with the verified wiring.
> **System check:** [`devos/reports/stain-model-system-check.md`](../../../devos/reports/stain-model-system-check.md) Part B (pre-decomposition state — superseded by Phase 1, but Part B's coat-model mismatch is still the crux).
> **Baseline:** vitest **622** green, `vite build` clean (verified 2026-06-23).

---

## 1. Problem (P2-specific)

Phase 1 (PR #8) decomposed every interior stain family into independent per-phase scenarios (stain / sealer / clear) that behave like paint's prime/finish. But the **QT Builder is `coating_phase`-blind**, so those scenarios are invisible/empty there. Concretely, against the live builder:

- `derive-tier-ladder.js:18-31` `listDimensions` builds the **Coating** dropdown from `matches.coating_type`. Decomposed stain scenarios have **no `coating_type`** (they match on `coating_phase`) → stain never populates the dropdown.
- `QTBuilder.jsx:62` probes `sel = {paintable_item, application_method, substrate_state, coating_type}` — **no `coating_phase`**. The matcher (`scenario-matcher.js:20-49`) **rejects any scenario whose declared `matches` key is unset in ctx**, so every decomposed stain scenario (which declares `coating_phase`) is rejected.
- Stain items carry **no `application_method` in `matches`** → `dims.methods` is empty → `effMethod === ''` → the `vm` guard (`QTBuilder.jsx:65`) returns null → **empty grid**.
- The coat stepper (`planSetCoats`, `vantage-edits.js:73-84`) does **module repetition**; stain coats are a `coat_counts[field]` scalar driven by `dynamic_coats`. The whole `qt-builder/` dir has zero references to any stain coat field.
- `derive-materials.js:54` keys stain off `specId.includes('STAIN')` — **false** for the decomposed `_SEALER`/`_CLEAR` specIds, so those phases would be mis-typed as paint.

The engine + data side is **ready** (Phase 1 added the `coating_phase` discriminator to `specForScenarioMatches:93-105`, registered real per-family materials, and added the `dynamic_coats` fallback). **P2 is pure QT Builder tool code** — `QTBuilder.jsx` + `qt-builder/*` + tests. Zero engine, zero scenario-data, zero new materials-data changes.

## 2. Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | **Phase surfacing** | One phase at a time. The finder gains a **Phase** control (Stain/Sealer/Clear); each phase resolves its single scenario through the existing vantage grid. |
| 2 | **Method** | **Shown, not hidden.** Method is real for stain — it gates the apply *tasks* (not the scenario). The Method control maps to `application_method_stain` (stain phase) / `application_method_clear` (sealer + clear phases). |
| 3 | **From-state / variants** | **From-state reused, not hidden.** It reaches the natural-finish variants (`_SEALER_BARE`/`_CLEAR_BARE`) by selecting **Bare**. Picking a phase defaults From-state to the stained-chain state; all variants remain reachable. (Supersedes the earlier "stained chain only" cut — strict superset.) |
| 4 | **Materials menu** | **Canonical-by-role.** Each stain/sealer/clear dropdown offers the full canonical interior menu for that role (4 stains / 2 sealers / 3 clears), derived from `MATERIAL_SYSTEMS` by role. No data churn. |
| 5 | **Coats** | The coat stepper writes `scenario.coat_counts[field]` **scalar** (not module repetition), fork-on-edit (QT3 forks too, matching today's paint-coat behavior). |
| 6 | **Rollout** | **In-place** in `QTBuilder.jsx` + `qt-builder/*`, gated by the existing draft→overlay→publish safety net + live review. Not a separate lab (the builder is an internal authoring tool; stain shows nothing there today; paint stays parity-identical). |
| 7 | **Stairs** | **Defer + verify.** Stairs are component-expanded (`STAIR_STAIN_PHASE`, not `DECOMPOSED_STAIN_FAMILIES`); confirm whether their stain scenarios carry `coating_phase` and scope stair stain authoring as a follow-up. |

### 2.1 The method correction (verified)

Method is modeled for stain at the **task level**, inside one scenario, via `applies_when` on the apply template's method-variant tasks:

| Phase | Apply template | Method-variant tasks | `applies_when` key | Methods |
|---|---|---|---|---|
| Stain | `MOD_TEMPLATE_TRIM_APPLY_STAIN` | `TSK_STAIN_BRUSH_LF` / `ROLL_LF` / `SPRAY_LF` | `application_method_stain` | brush / roll / spray |
| Sealer | `MOD_TEMPLATE_TRIM_APPLY_SEALER` | `TSK_SEALER_BRUSH_LF` / `SPRAY_LF` | `application_method_clear` | brush / spray |
| Clear | `MOD_TEMPLATE_TRIM_APPLY_CLEAR` | `TSK_CLEAR_BRUSH_LF` / `SPRAY_LF` | `application_method_clear` | brush / spray |

Set in ctx by `context-adapter.js:485-486` / `:1325-1326`; the compiled `scenario-bundle.gen.js` flattens the templates so the QT Builder sees these tasks inline. So a sprayed vs brushed stain coat is a *different firing task* — the estimate changes with method, exactly as expected. The contrast with paint: paint forks the scenario by `matches.application_method`; stain keeps one scenario and gates the task. **Both are method-correct.** Re-architecting stain to scenario-forked method is explicitly out of P2 scope (it's a Phase-1-level change).

## 3. Finder & probe

An item is **stain** when it has any `coating_phase` scenario (`dims.phases.length > 0`). Paint items have none → unchanged behavior.

| Control | Paint (today) | Stain (P2) |
|---|---|---|
| Substrate | `paintable_item` | `int_<item>` (e.g. `int_door_casing`) — already a distinct finder row |
| **Phase** *(new)* | — (replaces the empty Coating dropdown) | `coating_phase` ∈ {Stain, Sealer, Clear} |
| From-state | `substrate_state` | `substrate_state` — **Bare** → `_*_BARE` variants; Stained → stained chain |
| Method | `application_method` | `application_method_stain` (stain) / `application_method_clear` (sealer+clear) |

- **`listDimensions` gains `phases`** (distinct `matches.coating_phase` for the item) plus, per phase, the **default input state** and the **method options**:
  - default input state: stain → the bare state; sealer/clear → the non-bare matched state (derived from the phase scenarios, not hardcoded, so it adapts per family).
  - method options: the distinct `applies_when.application_method_stain` (stain) / `application_method_clear` (sealer/clear) values across that phase's apply-module tasks — i.e. only the methods that actually have a task (stain has roll; clear/sealer don't). Falls back to the `enums.stainApplicationMethods` / `clearApplicationMethods` lists if no task-level values are found.
- **`sel` for stain** = `{ paintable_item, coating_phase, substrate_state, [methodKey]: method }` where `methodKey = phase === 'stain' ? 'application_method_stain' : 'application_method_clear'`. No `application_method`/`coating_type` keys (absent from stain `matches` → ignored by the matcher).
- **`sel` for paint** is unchanged: `{ paintable_item, application_method, substrate_state, coating_type }`.
- **ctx construction** in `deriveVantage`, `deriveMaterials.ctxFor`, and `vantage-edits.resolveTierScenario` switches from the hardcoded 4-key object to `{ ...sel, quality_tier: tier }`. **Byte-identical for paint** (paint's `sel` already holds exactly those 4 keys); adds `coating_phase` + the method key for stain.
- **`vm` guard**: ready when `substrate && phase` (stain) / `substrate && effMethod && effState` (paint). Method + From-state always resolve to a value for a valid stain phase (defaulted), so the guard is effectively `substrate && phase` for stain.
- **Grid task filter** (`derive-vantage.js` `taskApplies` / `GATE_KEYS:13`): extend `GATE_KEYS` to include `application_method_stain` + `application_method_clear` so the selected Method filters the apply module's method-variant tasks (else all of brush/roll/spray show regardless). Tasks without those `applies_when` keys (prep, interstage, cleanup) are unaffected — they have neither key, so the filter passes them through. **Paint is unaffected** (paint tasks don't carry the stain/clear method keys).
- **Finder UI**: for stain, render the **Phase** dropdown (from `dims.phases`) in place of Coating; keep Method + From-state, populated from the phase-aware options; changing Phase re-defaults From-state + Method options.

## 4. Coat model — stepper writes a scalar

The decomposed apply module appears **once** in `scenario.modules`; the real count lives in `scenario.coat_counts[field]` (field from `dynamic_coats[moduleId].field`, e.g. `stain_coats`), surfaced live by the Phase-1 engine fallback `ctx[field] ?? scenario.coat_counts[field] ?? 1`.

- **`deriveVantage`**: when a module is a `dynamic_coats` module in that tier's scenario, the cell's `count` = `scenario.coat_counts[field]` (not the module-duplicate count), and the cell carries a `coatField`. Otherwise unchanged (paint module-repetition count). Module/task cell *state* (`shared`/`forked`/`added`) is unchanged — a stain coat fork keeps the same module id and only differs in `coat_counts`, so it reads `shared` with a differing `×count` (same as paint coats today).
- **`tier-files.js` + `setScenarioCoatCount(scenario, field, n)`**: immutable; clones `coat_counts` and sets `[field] = n`.
- **`vantage-edits.js` + `planSetStainCoats(bundle, sel, tier, field, n)`**: `ensureScenarioForTier` (fork the tier, incl. QT3) → `setScenarioCoatCount`. Clamp `n` to the role's enum range (stain 1–2, sealer 0–2, clear 1–3). Revert via the existing tier "revert" link (`planRevertTier` already deletes the fork; a stain fork has no `_QT` module forks → `deleteModuleIds` empty → just drops the scenario draft).
- **Stepper routing** (`QTBuilder.jsx`): when the cell has `coatField`, route `±` to `planSetStainCoats(...coatField...)`; else the existing `planSetCoats` (module repetition). **Paint path untouched** (gated on `dynamic_coats` presence).

## 5. Materials — phase = role, canonical menu

- **`derive-materials`**: for a decomposed scenario, derive the role from `matches.coating_phase` (single role per phase-grid), fixing the `specId.includes('STAIN')` mis-type for `_SEALER`/`_CLEAR`. Keep the existing paint path (`PAINT_ROLES`) when there's no `coating_phase`.
- **Candidates = canonical-by-role**: the full interior-stain menu for that role, derived once from `MATERIAL_SYSTEMS` filtered to stain-domain systems (those whose `applies_when.coating_type` ∈ {`stain_clear`, `stain_only`, `clear_only`}), deduped by id, classified via `classifySystemRole(id, ROLE_BY_SYSTEM_ID, 'stain')`. Yields {4 stains} / {2 sealers} / {3 clears}. The resolved system is force-appended if somehow absent (existing behavior).
- **`resolvedByRole`** = the single system in the phase-file's `material_systems`. **`isOverrideByRole`** logic unchanged (diverges-from-canonical, gated by anchor/fork).
- **`planSetMaterial`/`planClearMaterial`**: reuse, but **thread `baseRole='stain'`** into the role classification used by `setScenarioMaterial`/`clearScenarioMaterial` (tier-files), so `SYS_STAIN_*` (which lack a `/SEALER|CLEAR|POLY|LACQUER/` pattern and may lack a `product_role`) classify to `stain` — otherwise a set *appends* instead of *replaces*. (Verify whether the stain products already carry `product_role='stain'`; if so, threading is belt-and-suspenders. Either way, make the classification deterministic.)
- The existing **QT3-edits-baseline-in-place / QT4-5-fork** materials policy carries over unchanged.

## 6. QT time multiplier — works for free

The QT-multiplier row (`derive-vantage.js:154-172`) is scenario-level and renders for any resolved scenario, so it works for stain phase-baselines once the probe resolves them (system check B3 confirmed FAC_QT applies to stain hours). No P2 work. (Note the stain *apply* template is `modifier_eligibility.qt:false` by doctrine — staining labor is tier-flat — while sealer/clear apply are `qt:true`; this is existing engine behavior and not a P2 concern.)

## 7. Sequencing

1. **Pilot — `int_door_casing`** end-to-end: select it → Phase=Stain (default From-state=Bare, Method=Brush+Wipe) → vantage grid (prep + apply with coat stepper + interstage) + Materials row (Stain, canonical menu); author a QT4/QT5 coat change (fork) + a per-tier material pick; switch Phase=Clear → From-state=Stained → author its coats/material; publish drafts; confirm the estimate moves on a stained-door-casing project.
2. **Generalize** — the wiring is generic (`coating_phase` / `dynamic_coats`-driven), so the ~16 flat decomposed families work automatically. Spot-verify a couple (e.g. `int_baseboard`, `int_wood_wall`), including the per-phase default-state derivation.
3. **Stairs — defer + verify.** Confirm whether `int_stair_railing` / `int_stair_riser` stain scenarios carry `coating_phase` (component-expanded path). If they're a different emission shape, scope stair stain authoring as a follow-up rather than forcing it into the pilot.

## 8. Blast radius

`QTBuilder.jsx`, `qt-builder/derive-tier-ladder.js`, `qt-builder/derive-vantage.js`, `qt-builder/derive-materials.js`, `qt-builder/vantage-edits.js`, `qt-builder/tier-files.js` + their `__tests__`. **Nothing else** — no engine, no scenario JSON, no materials data.

## 9. Testing, parity, risks

- **TDD, subagent-driven**, per-task review + opus whole-phase review (inline where ceremony outweighs value).
- **Parity-gated**: paint estimates byte-identical via `tools/paintscope/scripts/parity-estimate.mjs` vs `.superpowers/sdd/parity/parity-main.json` after each step; stain output changes are intentional deltas (gate as expected).
- vitest stays green (622 + new unit tests for: `phases`/per-phase state+method derivation; coat-scalar cell; phase-role + canonical-by-role materials; `setScenarioCoatCount`; `planSetStainCoats`; `baseRole` threading). `vite build` clean. **Live-verify** at localhost:5173 with a test project (McLeod or a stained-trim project); 0 console errors.
- **Risks:**
  1. Per-phase default-state derivation wrong for some family → "no scenario matched". Mitigate: derive from the scenarios + verify across families; the matcher's "no match" path already shows a clear empty state.
  2. Stain role classification (the `baseRole` gap) → a material set appends instead of replaces. Mitigate: verify `classifySystemRole(SYS_STAIN_OIL)` and thread `baseRole='stain'`; unit-test set/clear on a single-element stain array.
  3. Coat-scalar detection must not touch paint module-repetition cells. Mitigate: gate strictly on `dynamic_coats` presence; parity-gate paint.
  4. ctx-spread change must stay byte-identical for paint. Mitigate: paint `sel` already holds exactly the 4 keys; parity-gate.
  5. Forking a stain tier for coats then materials must clone `coat_counts` / `material_systems` independently (immutability). Mitigate: the ops already copy-on-write; unit-test a coats-then-materials sequence on one tier.

## 10. Open / deferred

- Natural-finish (`_SEALER_BARE`/`_CLEAR_BARE`) authoring is **reachable** via From-state=Bare in the pilot; verifying its end-to-end estimate is a nice-to-have, not pilot-blocking.
- **Per-item overrides** (coats + products in the room-editor item UI) remain **P3** (parent design §8).
- **Stairs** (component-expanded) — §7.3.
- Finder polish: cross-filtering From-state/Method to only valid combos per phase (independent dropdowns + "no scenario matched" is acceptable for the pilot, consistent with paint).
- Coat-fork tidy-up: setting a forked tier's coats back to baseline leaves an inert estimate-neutral fork (cleared via "revert"), mirroring paint coats — optional auto-reclaim later.

## References

- Parent design: `docs/superpowers/specs/2026-06-22-stain-model-qt-builder-design.md`.
- System check: `devos/reports/stain-model-system-check.md` (Part B coat-model mismatch).
- Phase 1: PR #8 / `feature/stain-decomposition`; memory `project_stain_model_qt_builder` ("BUILT — Phase 1" + "P2 ENTRY POINTS").
- QT Builder: `QTBuilder.jsx`, `qt-builder/{derive-tier-ladder,derive-vantage,derive-materials,vantage-edits,tier-files}.js`.
- Engine refs: `scenario-matcher.js:20-49`, `spec-for-scenario.js:93-105`, `context-adapter.js:485-486,1325-1326`, `material-system-roles.js` (`classifySystemRole`), templates `MOD_TEMPLATE_TRIM_APPLY_{STAIN,SEALER,CLEAR}`, `enums.js:204-226`.

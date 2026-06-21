# Phase 1c — Remove `applies_when.quality_tier` Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remove every `applies_when.quality_tier` gate from module task entries (the last QT-conditioning in the data), keeping QT3 estimates byte-identical. INCLUDE_QT3 entries have the gate stripped (fire at all tiers); EXCLUDE_QT3 entries are removed (they were QT2/QT4/QT5-only placeholders).

**Architecture:** A self-gating Node migration over `Claude/modules/MOD_*.json`. Per task entry with `applies_when.quality_tier`: if the value contains `"QT3"` → delete the `quality_tier` key (and delete `applies_when` if it becomes empty); else → delete the whole task entry. The script computes the **fired-task set at QT3** for every QT3 context before and after (resolving scenario → walking modules → `evaluateAppliesWhen` replica) and **aborts if any QT3 fired-task set changes**. Then regenerate the bundle + verify.

**Tech Stack:** Node ESM / `vite-node`, `build-scenario-bundle.mjs`, `scenario-matcher.js` (`findBestMatch`), a faithful replica of `evaluateAppliesWhen`.

## Global Constraints

- **ZERO engine changes.** Only module data files + scripts. `findBestMatch` imported read-only; `evaluateAppliesWhen` is replicated (it is private/unexported in `run-estimate-scenario.js:515-544`).
- **QT3 fired-task sets MUST NOT change.** Script-enforced (the gate aborts on any QT3 diff). Acceptance gate for the phase.
- **Archive/reversible:** module files are edited in place (committed → git-reversible). No file deletions (entry removals are in-file edits). Preserve CRLF + trailing newline (reuse the collapse's `serializePreservingEol`).
- **Edit in MAIN checkout**, branch `feature/qt-builder-rebuild` @ `1d27d6a9`. Don't merge/push without asking.
- Scope = ALL 19 affected modules (12 exterior + 7 interior). One dead module (`MOD_INTERSTAGE_CBRP`, 0 scenario refs) is processed for completeness (harmless).

## The exact targets (from investigation — 34 entries / 19 modules)

**INCLUDE_QT3 — strip `quality_tier` (18 entries).** 10 leave `applies_when` empty → remove `applies_when` entirely; 8 retain other keys (`application_method`/`substrate_type`) → keep `applies_when` minus `quality_tier`:
- MOD_APPLY_EXT_ALUMINUM_SIDING_FINISH_RP / TSK_ALRP_JCHANNEL_DETAIL (["QT3"], →empty)
- MOD_APPLY_EXT_ALUMINUM_SIDING_FINISH_RP_COAT2 / TSK_ALRP_JCHANNEL_DETAIL_COAT2 (["QT3"], →empty)
- MOD_APPLY_EXT_PORCH_FLOOR_FINISH / TSK_XPRFL_ENAMEL_ROLL (["QT3","QT4"], keep application_method)
- MOD_APPLY_EXT_PORCH_FLOOR_FINISH / TSK_XPRFL_ENAMEL_BRUSH (["QT3","QT4"], keep application_method)
- MOD_APPLY_EXT_PORCH_FLOOR_FINISH / TSK_XPRFL_ENAMEL_SPRAY_BACKROLL (["QT3","QT4"], keep application_method)
- MOD_APPLY_EXT_VINYL_SIDING_FINISH_RP / TSK_VNRP_JCHANNEL_DETAIL (["QT3"], →empty)
- MOD_APPLY_EXT_VINYL_SIDING_FINISH_RP_COAT2 / TSK_VNRP_JCHANNEL_DETAIL_COAT2 (["QT3"], →empty)
- MOD_PREP_EXT_ALUMINUM_SIDING_RP / TSK_ALRP_CAULK_ASSESS (["QT3"], →empty)
- MOD_PREP_EXT_MASONRY / TSK_MSRY_SURFACE_REPAIR (["QT3","QT4"], →empty)
- MOD_PREP_EXT_PORCH_FLOOR_CONCRETE / TSK_XPRFL_ACID_ETCH (["QT3","QT4"], →empty)
- MOD_PREP_EXT_PORCH_FLOOR_WOOD / TSK_XPRFL_WOOD_SAND (["QT3"], →empty)
- MOD_PREP_EXT_VINYL_SIDING_RP / TSK_VNRP_CHALK_TEST (["QT3"], →empty)
- MOD_PREP_EXT_VINYL_SIDING_RP / TSK_VNRP_CAULK_ASSESS (["QT3"], →empty)
- MOD_PRIME_EXT_PORCH_FLOOR / TSK_XPRFL_PRIME_CONCRETE_ROLL (["QT3","QT4"], keep substrate_type+application_method)
- MOD_PRIME_EXT_PORCH_FLOOR / TSK_XPRFL_PRIME_CONCRETE_SPRAY_BACKROLL (["QT3","QT4"], keep substrate_type+application_method)
- MOD_PRIME_EXT_PORCH_FLOOR / TSK_XPRFL_PRIME_WOOD_ROLL (["QT3","QT4"], keep substrate_type+application_method)
- MOD_PRIME_EXT_PORCH_FLOOR / TSK_XPRFL_PRIME_WOOD_BRUSH (["QT3","QT4"], keep substrate_type+application_method)
- (the 18th INCLUDE_QT3: MOD_APPLY_EXT_PORCH_FLOOR_FINISH has 3 enamel entries listed above — count reconciles to 18)

**EXCLUDE_QT3 — remove the entry (16 entries):**
- MOD_APPLY_EXT_PORCH_FLOOR_FINISH / TSK_XPRFL_ACRYLIC_SEALER_ROLL (["QT2"])
- MOD_APPLY_EXT_PORCH_FLOOR_FINISH / TSK_XPRFL_POLYUREA_ROLL (["QT5"])
- MOD_APPLY_EXT_PORCH_FLOOR_FINISH / TSK_XPRFL_WOOD_ENAMEL_SINGLE (["QT2"])
- MOD_GRAIN_FILL / TSK_GRAIN_FINAL_SAND (["QT5"]) — interior
- MOD_INTERSTAGE_CBRP / TSK_CBRP_INTER_SAND (["QT4"]) — interior, DEAD module
- MOD_INTERSTAGE_CBRP_RP / TSK_CBRP_INTERCOAT_SAND_DOOR (["QT4","QT5"]) — interior
- MOD_INTERSTAGE_CBRP_RP / TSK_CBRP_INTERCOAT_SAND_FRAME (["QT4","QT5"]) — interior
- MOD_INTERSTAGE_DRRP / TSK_DRRP_INTER_SAND (["QT4"]) — interior
- MOD_INTERSTAGE_DRRP_RP / TSK_DRRP_INTERCOAT_SAND_FRAME (["QT4","QT5"]) — interior
- MOD_INTERSTAGE_DRRP_RP / TSK_DRRP_INTERCOAT_SAND_SLAB (["QT4","QT5"]) — interior
- MOD_INTERSTAGE_EXT_GARAGE_DOOR / TSK_GRDR_INTERCOAT_SAND (["QT4"])
- MOD_INTERSTAGE_WNRP / TSK_WNRP_INTER_SAND (["QT4"]) — interior
- MOD_INTERSTAGE_WNRP_RP / TSK_WNRP_INTERCOAT_SAND (["QT4","QT5"]) — interior
- MOD_PREP_EXT_PORCH_FLOOR_CONCRETE / TSK_XPRFL_DIAMOND_GRIND (["QT5"])
- MOD_PREP_EXT_PORCH_FLOOR_WOOD / TSK_XPRFL_WOOD_SAND_LIGHT (["QT2"])
- MOD_PREP_EXT_PORCH_FLOOR_WOOD / TSK_XPRFL_WOOD_SAND_FULL (["QT4"])

## Engine firing semantics (replicate for the gate)
`evaluateAppliesWhen(condition, ctx, coatNumber)` — AND across keys; **only array-valued keys enforced** (scalar values skipped); `values.includes(ctx[key])` membership; `coat` compares stringified `coatNumber`; `coat_lt_ctx` special. quality_tier read as `ctx.quality_tier`. Firing: `findBestMatch` → iterate `scenario.modules` (with `dynamic_coats` expansion) → per module `tasks[]` → fire entries where `evaluateAppliesWhen` true. For the QT3 gate, quality_tier gates are coat-independent, so a faithful replica with `coatNumber=1` is sufficient for a relative before/after comparison (both sides use the same replica; only quality_tier entries change).

---

## Task 1: Build the self-gating migration + pure core (TDD)

**Files:**
- Create: `Claude/scripts/lib/strip-qt-gates-core.mjs` (pure: classify + transform a module)
- Create: `Claude/scripts/strip-quality-tier-gates.mjs` (loaders + fired-task QT3 gate + dry-run/apply; reuse `serializePreservingEol` + loaders patterns from `collapse-to-qt3-baseline.mjs`)
- Test: `Claude/tools/paintscope/src/components/authoring/qt-builder/__tests__/strip-qt-gates-core.test.js`

**Pure core interfaces:**
- `entryClass(entry) -> 'include_qt3' | 'exclude_qt3' | 'none'` — `none` if no `applies_when.quality_tier`; `include_qt3` if its array contains `'QT3'`; else `exclude_qt3`.
- `transformModule(module) -> { module: newModule, stripped: string[], removed: string[] }` — returns a deep clone: for each `tasks[]` entry, INCLUDE_QT3 → delete `entry.applies_when.quality_tier` (and delete `entry.applies_when` if now empty), record task_ref in `stripped`; EXCLUDE_QT3 → drop the entry, record task_ref in `removed`; NONE → unchanged. Never mutates input. Same ref / `{module, stripped:[], removed:[]}` when nothing matched.

- [ ] **Step 1: Write failing core tests** (cover: include-QT3 with no other keys → applies_when removed; include-QT3 with other keys → keep other keys; exclude-QT3 → entry dropped; mixed module → correct stripped/removed lists; no-gate module → unchanged/no-op; input not mutated).

- [ ] **Step 2: Run → RED.** `cd Claude/tools/paintscope && npx vitest run src/components/authoring/qt-builder/__tests__/strip-qt-gates-core.test.js`

- [ ] **Step 3: Implement `strip-qt-gates-core.mjs`** per the interfaces.

- [ ] **Step 4: Run → GREEN.**

- [ ] **Step 5: Implement `strip-quality-tier-gates.mjs`:**
  - Load scenarios/modules/modifiers/tasks (root-only) like `collapse-to-qt3-baseline.mjs`.
  - Build the **before bundle** (current modules). Build the **after modules** = each module through `transformModule`. Build the **after bundle** (same scenarios, transformed modules).
  - Replica `evaluateAppliesWhen(condition, ctx, coatNumber=1)` faithful to the engine (AND; only arrays enforced; membership; coat/coat_lt_ctx handled or consistently passed).
  - `firedTasksAtQt3(bundle, ctx)`: `findBestMatch(bundle, ctx)` → for each module id in `scenario.modules` → for each `tasks[]` entry → if replica true, collect `module_id + '::' + task_ref`. Return a sorted array (the fired set). (Coat expansion not needed for quality_tier comparison.)
  - Build the QT3 context universe (reuse the collapse's cartesian expansion of every scenario's `matches`, quality_tier='QT3', deduped).
  - **GATE:** for each QT3 ctx, compare `firedTasksAtQt3(before, ctx)` vs `firedTasksAtQt3(after, ctx)`. Collect any context whose fired set differs. **Abort (exit 1, no writes) on ANY difference**, printing the offending ctx + the added/removed task fingerprints.
  - Report: per module, stripped[] + removed[] counts; totals (modules changed, entries stripped, entries removed); the gate result (contexts swept, QT3 fired-set diffs).
  - Dry-run default; `--apply` writes each changed module file via `serializePreservingEol`.

- [ ] **Step 6: Smoke dry-run** (`cd Claude/tools/paintscope && npx vite-node ../../scripts/strip-quality-tier-gates.mjs`): confirm gate PASS (0 QT3 fired-set diffs), 18 stripped + 16 removed across 19 modules. Full vitest green. Commit core+script+test (NO data changes): `feat(qt-builder): Phase 1c migration — strip/remove applies_when.quality_tier (QT3-fired-set gated)`.

---

## Task 2: Dry-run review + pre-apply check (CHECKPOINT)

- [ ] **Step 1:** Re-run the dry-run; confirm the per-module report exactly matches the 34-entry table above (18 stripped, 16 removed, the right task_refs) and the QT3 fired-set gate shows **0 diffs**.
- [ ] **Step 2:** Pre-apply review (opus) of `strip-quality-tier-gates.mjs` + core: is the fired-task gate sound (does the replica match the engine closely enough that a relative before/after diff cannot hide a real QT3 change)? Is the context universe complete? Any data-loss risk in the entry-removal path? Verdict SAFE TO APPLY / fixes. Resolve any Critical/Important before apply.

---

## Task 3: Apply, regenerate, verify, commit

- [ ] **Step 1: Apply** — `cd Claude/tools/paintscope && npx vite-node ../../scripts/strip-quality-tier-gates.mjs -- --apply` (gate must pass; writes changed modules).
- [ ] **Step 2: Regenerate** — `cd "C:/Eric_AI_Playground/Claude Code Uni" && node Claude/scripts/build-scenario-bundle.mjs` (integrity OK).
- [ ] **Step 3: Confirm zero `applies_when.quality_tier` remain** — `git grep -l "quality_tier" -- Claude/modules` should show no `applies_when` usages (only any in `intent`/prose if present; verify none are in a `tasks[].applies_when`). Spot-check with a scan.
- [ ] **Step 4: Verify** — full vitest (0 fail) + `vite build` (0 errors) + a post-apply idempotent dry-run of the script (0 stripped/0 removed, gate pass).
- [ ] **Step 5: Migration report** — write `Claude/devos/reports/phase1c-quality-tier-gate-removal.md`: the 34 entries with their disposition (stripped/removed), the QT3-fired-set gate result, before/after bundle scenario+module counts. (Short.)
- [ ] **Step 6: Commit** — `git add Claude/modules Claude/tools/paintscope/src/data/scenario-bundle.gen.js Claude/devos/reports/phase1c-quality-tier-gate-removal.md && git commit -m "data(qt-builder): Phase 1c — remove applies_when.quality_tier (QT3 byte-identical; QT4/5/2-only entries dropped)"`.

---

## Self-Review (planning)
- QT3 invariant enforced at the FIRED-TASK layer (not just scenario.modules) — correct for module-content edits. INCLUDE_QT3 strip preserves QT3-firing; EXCLUDE_QT3 removal preserves QT3-non-firing — both by construction, verified by the gate.
- Scope corrected to 12 ext + 7 int; the dead `MOD_INTERSTAGE_CBRP` processed harmlessly.
- Task definitions (TSK_*) are untouched — only module *references* change; removed entries are re-addable via the builder's TaskPicker for future QT4/QT5 forks.
- Out of scope: the 2 pre-existing "broken" interior RP scenario sets (SCN_INT_DRRP_*, SCN_INT_DOOR_RP_*) — note in the report; Phase 1c doesn't worsen QT3 for them.

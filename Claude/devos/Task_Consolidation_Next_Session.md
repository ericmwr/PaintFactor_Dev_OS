# Next Session Pickup

**Last updated:** 2026-05-08 (end of session)
**Branch:** `cranky-saha` worktree
**Resume protocol:** read this doc first, then `Claude/_merge_log.jsonl` for the audit trail. Other plan docs cover specific phases below.

---

## Status snapshot

| Workstream | Status | Notes |
|---|---|---|
| **NC consolidation** | DONE | 35 rounds in `_merge_log.jsonl`, ~450 tasks consolidated. Catalog: 2662 → 2186 active tasks, 713 archived. |
| **TRADE_OVERHEAD wiring** | DONE | 23 of 25 band-aids retired. Modifier wired in `engine/run-estimate-scenario.js` with eligibility-aware `surface_orientation` derivation. |
| **TRADE_MATERIAL wiring** | DONE | 34 band-aids retired (956bf39). Wall + ceiling primer task families retired in favor of finish tasks × 1.25× (cde7abf, f64a4c1). Renamed FAC_MATERIAL/FAC_OVERHEAD → TRADE_MATERIAL/TRADE_OVERHEAD (b7eff99). |
| **Module template consolidation** (Approach A) | DONE | 5 trim templates resolving 70+ extenders (paint, prime initial, interstage, cleanup paint, stain). Ran across paint AND stain sides (3f7f33e). |
| **Substrate ps_key fallback** | DONE | Universal LF/SF tasks (TSK_BRUSH_COAT_LF/SF, TSK_SPRAY_COAT_LF/SF) resolve ps_key from `ctx.paintable_item` when task carries none. Extended to specialty SF (caf1dd1). |
| **Coating-task display framing** | DONE | "Spray Coat (SF) — Primer" / "— Finish" suffix added on coating-neutral universal tasks (3997c3e, d827546). Phase-gated to apply/finish so prep tasks don't pick up "— Finish". |
| **Specialty tab walkthrough** | DONE | Item-by-item rebuild: wainscot panel (Length × Height → SF), wainscot_cap retired, beams (LF × Sides × Qty), columns (LF × Sides × Qty), mantels (LF × 2 → SF), built-ins (SF derived from opening tiers). |
| **Scope Tree Phase 1** | DONE | `buildScopeTree` + `pivotTree` shipped (b3c6393). Phase 1 data layer + smoke 20/20. Phase 2 (lab sandbox) not started. |
| **Cascade tooling** | NOT STARTED | `Authoring_Cascade_Tooling_Plan.md` — Phase 1 (smoke-on-publish), Phase 2 (rename-with-cascade), Phase 3 (bulk transforms). |

---

## This session (2026-05-07 → 2026-05-08): Specialty tab + paint-side polish

Methodical walk through the Specialty tab fixing every item's data model, UI, and engine path. Most items had been over-simplified (EA-based) or had silent ps_key mismatches that dropped tasks. Pattern: switch to length-driven inputs that match how the painter actually thinks about the surface, then preserve baseline hours by scaling rates.

### Wainscot Panel
- **9595eda** — SF derives from `Length × Height` (`wainscot_height_ft`); `sf_manual` stays as override for non-rectangular runs.
- **0106a73** — Caulk tasks (`TSK_WNSC_CAULK_JOINTS`, `TSK_WNSC_CAULK_WALL`) had orphan ps_key `PS_SURFACE_SF.WAINSCOT` (engine emits `PS_SURFACE_SF.WAINSCOTING`). Both silently dropping. Fixed + gated to SS_BARE / SS_PRIMED_FACTORY only (field-primed = previous painter caulked).
- **4835ba3** — Added factory-primed scenarios (paint-from-primed brush + spray) and stain-only scenario.
- **b833a12** — `wainscot_cap` substrate fully retired (11 modules, 12 scenarios, 2 tasks deleted; 18 source files updated). Other LF trim items (chair_rail, picture_rail) cover the same use case.

### Beams
- **bd7c2bf** — UOM EA → LF; `lf_manual × beam_sides` (3 attached / 4 exposed). 10 LF × 4 sides = 40 LF.
- **9283cb4** — Added `Qty` field. `Length × Sides × Qty = total LF`. Same Length applies to all instances in the group.

### Columns
- **5d22393** — Same model as beams: UOM EA → LF; `Height × Sides × Qty`. Sides = 3 attached to wall / 4 free-standing. 7 column tasks switched to LF rates (×32 to preserve baseline at typical 8 LF × 4 sides).
- **9283cb4** — Added `Qty` field.

### Mantels
- **4cf6085** — UOM EA → SF; `lf_manual × 2 = SF` (top + bottom + sides folded into 2× LF rule). 6 LF mantel = 12 SF. 7 mantel tasks switched to SF rates (×12 to preserve baseline at typical 6 LF × 2).

### Built-ins (b5f2bc7)
- Tasks read `PS_SURFACE_SF.BUILTIN`, but engine was emitting `PS_OPENING_EA.BUILTIN_SHELF.{S,M,L,XL}` — total ps_key mismatch, 0 tasks fired despite spec activating.
- Replaced with SF derivation: `S×6 + M×12 + L×24 + XL×40 + full_height_sides×30`.
- 2S + 1M + 1 side = 54 SF, all 12 builtin tasks now fire.

### Arch Element activation gate (b5a9c45 + 1f7e223)
Two fixes for the same bug — `SF_ARCH_ELEMENT_NC` only activated when `subs.beams` existed. Mantels-only or columns-only projects produced zero arch tasks.
- **Activation gate fallback** in `context-adapter.js` — spec activates if any of beams/columns/mantels exists.
- **State resolver fallback** in `spec-compatibility.js` — `resolveSubstrateStateForSpec` reads state from whichever child substrate is present (was hardcoded to `subs.beams`).
- Added `SCN_ARCH_ELEMENT_PAINT_BRUSH` and `SCN_ARCH_ELEMENT_PAINT_SPRAY` paint-from-primed scenarios mirroring the wainscot pattern.

### Other paint-side polish (early in session)
- **3997c3e** — Display "Prime" vs "Finish" framing on coating tasks based on `materialType` (`WB_PRIMER` swaps "Finish" → "Prime" or appends "— Primer").
- **d827546** — Mirror suffix for finish phase: "Spray Coat (SF) — Finish". Phase-gated to apply/finish so prep tasks stay clean.
- **371c66a** — Folded `FAC_MATERIAL` into `baseRate` (so primer task line shows e.g. 312 SF/hr instead of 390/1.25), removed from displayed modifier total.
- **b7eff99** — Renamed FAC_MATERIAL → TRADE_MATERIAL, FAC_OVERHEAD → TRADE_OVERHEAD across all references.

---

## Next session: Scope Tree research + Cascade Tooling summary

The data plumbing is settled. Construction-side consolidation, modifier wiring, and substrate-by-substrate calibration are all wrapped. Time to look up at the view layer.

**Two parallel research tasks for next session — see `Scope_Tree_And_Cascade_Next_Session.md`:**

1. Audit Scope Tree Phase 1 (shipped 2026-05-03 in b3c6393) against current engine output and the v1.0 framework doc. Confirm what works, what bit-rotted with the recent module/scenario churn, and write up Phase 2 (lab sandbox) entry conditions.

2. Summarize the Cascade Tooling plan (`Authoring_Cascade_Tooling_Plan.md`) into actionable status — its prerequisites all shipped 2026-05-04, but the three phases (smoke-on-publish, rename-with-cascade, bulk transforms) haven't started. Decide which to ship first.

The scope-tree work unblocks the customer-facing proposal renderer and the field tracker. The cascade tooling unblocks systematic rate calibration without manual archaeology. Both are "view + tooling" work, not "data plumbing."

---

## Live infrastructure (already shipped, ready to use)

- Authoring tab filters: domain, activity-family, spec-family, phase
- Archive button on each editor + Archive tab with Restore
- Regenerate-bundle button (top-right of Authoring header) — shells out to `build-scenario-bundle.mjs`, HMR re-imports
- TaskUsagePanel (task → modules)
- ModuleUsagePanel (module → scenarios)
- Scope Tree Lab at `?lab=scope-tree` and `?lab=estimate-preview` (Phase 1 viewer; pre-Phase-2)
- TRADE_OVERHEAD + TRADE_MATERIAL modifiers wired
- Activity rules dictionary at `Claude/tools/paintscope/src/data/activity-rules.js`
- 5 module templates (paint + prime + interstage + cleanup + stain) resolving 70+ extenders
- Substrate ps_key fallback covers universal LF/SF tasks for trim + specialty SF substrates
- Universal "— Primer" / "— Finish" suffix on coating-neutral tasks

---

## Known debt / loose ends

- 2 composite `BA_TRADE_OVERHEAD,BA_TRADE_MATERIAL` band-aids in `MOD_APPLY_WOOD_CEILING_PRIME` — not yet retired.
- `MOD_APPLY_WALL_PRIME_SPRAY_ONLY` has an inline `TSK_WALL_SPRAY_PRIMER` task that collides with the library version (build warns, doesn't fail) — minor cleanup.
- Some `Claude/specs/` source docs reference archived task IDs (historical; doesn't affect runtime).
- `PS_META.EA.KNOT_COUNT` is an orphan ps_key after round 31's retirement.
- Mantel + column rate scaling (×12 / ×32) is hour-neutral *for a typical sized item* — actual SF/LF rates need calibration once the user has time-tracker actuals or an explicit calibration session.
- Builtin SF coefficients (S=6, M=12, L=24, XL=40, side=30) are first-pass estimates — same calibration question.

---

## Workflow gotchas learned

1. **Edit tool batch failures.** When editing many files in parallel, first 1-2 succeed, rest fail ("File has not been read yet"). Fix: re-Read failed files, retry edits.
2. **Pipe regen output.** `node Claude/scripts/build-scenario-bundle.mjs 2>&1 | grep -E "(loaded|OK|FAIL|ERROR|Wrote)"`
3. **Smoke tail.** `node Claude/scripts/smoke-scope-tree.mjs 2>&1 | tail -3`
4. **Combined chain.** Regen + archive + final regen + smoke via `&&` in single Bash call.
5. **Pre-production calibration always applies.** No backward-compat aliases, no migration plumbing, no deprecation cycles.
6. **Verify in the actual UI, not just preview_eval.** Direct engine eval can pass while the React UI silently drops the result (state cache, HMR not picking up, parallel code path). When a user reports "it's not showing up," drive the real UI checkbox/tab paths via preview tooling, not just engine smoke. The 2026-05-07 mantel debug was a textbook case — engine produced the tasks, UI flat-out didn't render them, took several rounds before I navigated the actual specialty tab and unchecked the substrate the user said was off.
7. **localStorage stale schema.** Session started with state holding retired substrate keys (`wainscot_cap`) and old field names (`ea_manual` for substrates that switched to `lf_manual`). Engine handles both gracefully (falls back to 0), but estimates can be silently wrong when fields don't exist on the current shape.

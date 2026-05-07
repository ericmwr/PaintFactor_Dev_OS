# Next Session Pickup

**Last updated:** 2026-05-05 (end of session)
**Branch:** `cranky-saha` worktree, uncommitted changes
**Resume protocol:** read this doc first, then `Claude/_merge_log.jsonl` for the audit trail. Other plan docs cover specific phases below.

---

## Status snapshot

| Workstream | Status | Notes |
|---|---|---|
| **NC consolidation** | DONE | 35 rounds in `_merge_log.jsonl`, ~450 tasks consolidated. Catalog: 2662 → 2186 active tasks, 713 archived. RP and exterior deferred per user direction. |
| **TRADE_OVERHEAD wiring** | DONE | 23 of 25 band-aids retired. Modifier wired in `engine/run-estimate-scenario.js` with eligibility-aware `surface_orientation` derivation. Merge log entry on line 35. |
| **Module template consolidation** (Approach A) | NEXT | `Module_Template_Consolidation_Plan.md`. Shrink ~140 substrate modules using `extends` field + bundle-time shallow merge. ~80% line reduction. |
| **TRADE_MATERIAL wiring** | After modules | `FAC_Material_Wiring_Plan.md`. Retire remaining 34 BA_TRADE_MATERIAL band-aids across 17 prime-apply modules. Single session. |
| **Cascade tooling** (rename + bulk + smoke gate) | After TRADE_MATERIAL | `Authoring_Cascade_Tooling_Plan.md`. Operates on the now-clean bundle. |
| **Archive infrastructure** | DONE | Archive button + Archive tab + Restore + bundle-skip + regen-bundle endpoint. |

---

## Next session: Module Template Consolidation, Phase 1 + Phase 2 pilot

### Goal

Build the `extends` resolver in the bundle generator and convert the 14 `MOD_PREP_*_PAINT` modules as a pilot. After Phase 2 succeeds, decide whether to continue Phase 3 (the other 9 module families) in the same session.

### What to read

1. **This doc** for current state.
2. **`Module_Template_Consolidation_Plan.md`** for the full plan with implementation rules, edge cases, validation, file touches, "First Move" section.
3. **`Claude/_merge_log.jsonl`** if you want the consolidation history (35 rounds; tail is sufficient).
4. **`memory/project_paintscope_pre_production.md`** for calibration — refactor freely, no migration plumbing.

### Phase 1 — bundle generator `extends` resolver

- Modify `Claude/scripts/build-scenario-bundle.mjs`. Add a `resolveExtends` pass after `loadModules`.
- Per-key shallow merge: child wins per key on `modifier_eligibility`. `tasks` array is full-replace if child sets it; otherwise inherits from template.
- Cycle detection (depth-limit 5).
- Refuse if `extends` references a missing module.
- Refuse if a scenario references a `kind:"template"` module.
- Validate post-resolution: every resolved module has non-empty `tasks` and a `phase`.
- Test fixture under `Claude/modules/_test/` (1 template + 1 extender, delete after verifying).
- Smoke before AND after must remain 20/20.

### Phase 2 — pilot conversion of 14 `MOD_PREP_*_PAINT` modules

Target modules (all in `Claude/modules/`):
- `MOD_PREP_BASEBOARD_PAINT`, `MOD_PREP_CROWN_PAINT`, `MOD_PREP_CHAIR_RAIL_PAINT`, `MOD_PREP_SHOE_MOLD_PAINT`, `MOD_PREP_PICTURE_RAIL_PAINT`, `MOD_PREP_WAINSCOT_CAP_PAINT`, `MOD_PREP_WINDOW_STOOL_PAINT`, `MOD_PREP_WINDOW_APRON_PAINT`, `MOD_PREP_SHADOW_BOX_PAINT`, `MOD_PREP_PANEL_MOLD_PAINT`, `MOD_PREP_DOOR_FRAME_PAINT`, `MOD_PREP_WINDOW_JAMB_PAINT`, `MOD_PREP_WINDOW_CASING_PAINT`, `MOD_PREP_DOOR_CASING_PAINT`.

Steps:
1. Read all 14 substrate modules. Capture per-substrate variations (mostly which substrates have `height: true`).
2. Author `Claude/modules/MOD_TEMPLATE_TRIM_PAINT.json` with the canonical 6-task list and default eligibility (`height: false` is most common).
3. Convert each substrate module to a thin extender (~8 lines: `module_id`, `name`, `extends`, per-substrate `modifier_eligibility` overrides).
4. Run bundle gen. Resolved modules must match pre-conversion field-for-field.
5. Lab regression: capture estimate hours for a project with multiple trim substrates pre-conversion, do conversion, confirm post-conversion totals match exactly.
6. Append merge log entry.

**Pause and report after Phase 2.** User decides whether to continue Phase 3.

### Stretch (only if user approves after Phase 2)

Phase 3 — repeat the same conversion for additional module families:
- `MOD_PREP_*_PRIME_INITIAL` (14)
- `MOD_APPLY_*_PRIME_BRUSH` and `*_PRIME_SPRAY` (14 each, do as one session)
- `MOD_INTERSTAGE_*` (trim, 14)
- `MOD_APPLY_*_STAIN` (LF, 14)
- `MOD_APPLY_*_CLEAR_COAT` and `*_SEALER` (14 each, do as stain session)
- `MOD_CLEANUP_*` and `MOD_CLEANUP_*_STAIN` (14 each)

One family per session is reasonable.

---

## After module template work

### Session TRADE_MATERIAL wiring

Single session. Plan: `Claude/devos/FAC_Material_Wiring_Plan.md`.

Mirrors the TRADE_OVERHEAD work shipped 2026-05-05:
- Add `TRADE_MATERIAL` to modifier-registry FALLBACK
- Add `deriveMaterialType` helper + `material` branch in `computeScenarioModifierStack`
- Strip 32 pure `BA_TRADE_MATERIAL` band-aids from 16 modules
- Strip 2 composite `BA_TRADE_OVERHEAD,BA_TRADE_MATERIAL` band-aids from `MOD_APPLY_WOOD_CEILING_PRIME`
- Append merge log entry

Behavioral shifts are pre-approved per each module's "targets when wired" doctrine. Most significant: LF prime brush 90→64 LF/hr (-29%), wood ceiling brush 90→44.8 (-50%). All documented in the plan doc.

### Session Cascade Tooling

Plan: `Claude/devos/Authoring_Cascade_Tooling_Plan.md`. Operates on the now-clean bundle.

Three phases in order:
1. Smoke-on-publish gate
2. Rename-with-cascade (task ID renames)
3. Bulk transforms (rate / display name / skill_level edits across selected sets)

---

## Live infrastructure (already shipped, ready to use)

- Authoring tab filters: domain, activity-family, spec-family, phase
- Archive button on each editor + Archive tab with Restore
- Regenerate-bundle button (top-right of Authoring header) — shells out to `build-scenario-bundle.mjs`, HMR re-imports
- TaskUsagePanel (task → modules)
- ModuleUsagePanel (module → scenarios)
- Scope Tree Lab at `?lab=scope-tree` and `?lab=estimate-preview`
- TRADE_OVERHEAD modifier wired (eligibility-aware `surface_orientation`)
- Activity rules dictionary at `Claude/tools/paintscope/src/data/activity-rules.js`

---

## Known debt / loose ends

- 2 composite `BA_TRADE_OVERHEAD,BA_TRADE_MATERIAL` band-aids in `MOD_APPLY_WOOD_CEILING_PRIME` — retired by `FAC_Material_Wiring_Plan.md` Phase 3
- `MOD_APPLY_WALL_PRIME_SPRAY_ONLY` has an inline `TSK_WALL_SPRAY_PRIMER` task that collides with the library version (build warns, doesn't fail) — minor cleanup
- Some `Claude/specs/` source docs reference archived task IDs (historical; doesn't affect runtime)
- `PS_META.EA.KNOT_COUNT` is an orphan ps_key after round 31's retirement (no consumer)

---

## Workflow gotchas learned

1. **Edit tool batch failures.** When editing many files in parallel, first 1-2 succeed, rest fail ("File has not been read yet"). Fix: re-Read failed files, retry edits.
2. **Pipe regen output.** `node Claude/scripts/build-scenario-bundle.mjs 2>&1 | grep -E "(loaded|OK|FAIL|ERROR|Wrote)"`
3. **Smoke tail.** `node Claude/scripts/smoke-scope-tree.mjs 2>&1 | tail -3`
4. **Combined chain.** Regen + archive + final regen + smoke via `&&` in single Bash call.
5. **Merge log appends.** Use `cat >> Claude/_merge_log.jsonl << 'EOF' ... EOF` — no need to read the log first.
6. **Edit format:** indentation-sensitive. Match module's existing style (multi-line vs compact).
7. **Vite plugin reverts.** The `vite-plugin-authoring.mjs` file got reverted between sessions once. If endpoints look missing on dev server startup, check the plugin file has all 5 endpoints (publish, archive, restore, list-archive, regen-bundle).
8. **Pre-production calibration always applies.** No backward-compat aliases, no migration plumbing, no deprecation cycles.

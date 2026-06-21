# Phase 1c — `applies_when.quality_tier` Gate Removal

**Date:** 2026-06-21 · **Branch:** `feature/qt-builder-rebuild` · **Migration:** `Claude/scripts/strip-quality-tier-gates.mjs` (+ `lib/strip-qt-gates-core.mjs`)

## Summary
Removed every `applies_when.quality_tier` gate from module task entries — the last QT-conditioning in the data after the QT3-baseline scenario collapse. In the file-naming tier model, per-tier differences are expressed by per-tier scenario **files** (baseline + forks), never by `applies_when` conditions inside shared modules.

**34 entries across 19 modules** (12 exterior + 7 interior):
- **17 STRIPPED** (`quality_tier` list contained `QT3`): the gate was deleted so the task fires at all tiers (it already fired at QT3; QT3 unchanged). 9 left `applies_when` empty → removed entirely; 8 retained other keys (`application_method`/`substrate_type`).
- **17 REMOVED** (`quality_tier` = QT2/QT4/QT5 only): the entry was deleted (it never fired at QT3, so QT3 unchanged). The underlying `TSK_*` definitions remain in the library, re-addable via the QT Builder's TaskPicker when authoring QT4/QT5 forks.

## QT3 invariant — preserved (proven)
- **Self-gate:** for every QT3 context (698 swept) the fired-task set is identical before vs after. 0 diffs.
- **Independent real-engine cross-check** (pre-apply review, opus): `runScenarioEstimate` with real `extends`/rate math + a coat sweep → **0 hour diffs and 0 fired-task diffs across 887 QT3 contexts**. All 17 stripped tasks fire at QT3 before+after; all 17 removed never fired at QT3.
- Idempotent: a second run reports 0/0.

## Dispositions by module
**Stripped (17):** MOD_APPLY_EXT_ALUMINUM_SIDING_FINISH_RP/TSK_ALRP_JCHANNEL_DETAIL; …_COAT2/TSK_ALRP_JCHANNEL_DETAIL_COAT2; MOD_APPLY_EXT_PORCH_FLOOR_FINISH/{TSK_XPRFL_ENAMEL_ROLL, _BRUSH, _SPRAY_BACKROLL}; MOD_APPLY_EXT_VINYL_SIDING_FINISH_RP/TSK_VNRP_JCHANNEL_DETAIL; …_COAT2/TSK_VNRP_JCHANNEL_DETAIL_COAT2; MOD_PREP_EXT_ALUMINUM_SIDING_RP/TSK_ALRP_CAULK_ASSESS; MOD_PREP_EXT_MASONRY/TSK_MSRY_SURFACE_REPAIR; MOD_PREP_EXT_PORCH_FLOOR_CONCRETE/TSK_XPRFL_ACID_ETCH; MOD_PREP_EXT_PORCH_FLOOR_WOOD/TSK_XPRFL_WOOD_SAND; MOD_PREP_EXT_VINYL_SIDING_RP/{TSK_VNRP_CHALK_TEST, TSK_VNRP_CAULK_ASSESS}; MOD_PRIME_EXT_PORCH_FLOOR/{TSK_XPRFL_PRIME_CONCRETE_ROLL, _CONCRETE_SPRAY_BACKROLL, _WOOD_ROLL, _WOOD_BRUSH}.

**Removed (17):** MOD_APPLY_EXT_PORCH_FLOOR_FINISH/{TSK_XPRFL_ACRYLIC_SEALER_ROLL(QT2), TSK_XPRFL_POLYUREA_ROLL(QT5), TSK_XPRFL_WOOD_ENAMEL_SINGLE(QT2)}; MOD_GRAIN_FILL/TSK_GRAIN_FINAL_SAND(QT5); MOD_INTERSTAGE_CBRP/TSK_CBRP_INTER_SAND(QT4, dead module); MOD_INTERSTAGE_CBRP_RP/{TSK_CBRP_INTERCOAT_SAND_DOOR, _FRAME}(QT4,QT5); MOD_INTERSTAGE_DRRP/TSK_DRRP_INTER_SAND(QT4); MOD_INTERSTAGE_DRRP_RP/{TSK_DRRP_INTERCOAT_SAND_FRAME, _SLAB}(QT4,QT5); MOD_INTERSTAGE_EXT_GARAGE_DOOR/TSK_GRDR_INTERCOAT_SAND(QT4); MOD_INTERSTAGE_WNRP/TSK_WNRP_INTER_SAND(QT4); MOD_INTERSTAGE_WNRP_RP/TSK_WNRP_INTERCOAT_SAND(QT4,QT5); MOD_PREP_EXT_PORCH_FLOOR_CONCRETE/TSK_XPRFL_DIAMOND_GRIND(QT5); MOD_PREP_EXT_PORCH_FLOOR_WOOD/{TSK_XPRFL_WOOD_SAND_LIGHT(QT2), TSK_XPRFL_WOOD_SAND_FULL(QT4)}; MOD_PRIME_EXT_PORCH_FLOOR/TSK_XPRFL_PRIME_POLYUREA(QT5).

## Consequences & notes
- **Orphan tasks:** bundle `_derived` orphan count rose 3 → 20 (the 17 removed entries' `TSK_*` are now unreferenced). Intended — definitions persist in `Claude/tasks/`, re-addable when authoring QT4/QT5 forks.
- **QT4/QT5/QT2** for the affected families lose their placeholder tier-specific work (interstage sanding, polyurea/acrylic porch finishes, diamond grind, etc.) — consistent with "non-QT3 tiers are disposable placeholders, re-authored via the builder."
- **Out of scope (left in place):** one `quality_tier` remains in a `rates[]` variant — `TSK_LIGHT_SAND_BETWEEN_COATS_CEILING` (per-coat *rate selection*, not the `applies_when` gating model). Not part of Phase 1c.
- **Pre-existing (not caused here):** the `SCN_INT_DRRP_*` / `SCN_INT_DOOR_RP_*` scenario sets were flagged "broken" during investigation — orthogonal to Phase 1c (QT3 unaffected by this change for them).

## Gates
vitest 268/268 · `vite build` 0 errors · bundle integrity OK (400 scenarios, 713 modules) · idempotent re-run 0/0.

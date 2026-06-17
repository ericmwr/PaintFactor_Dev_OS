# CHANGELOG — SF_DRYWALL_WALL_INT_RP_v1

## v1.0.0 — 2026-03-13

### Initial Release

First interior repaint spec in the SpecFactory pipeline. Combined prime + finish architecture (single mobilization).

### Assembly Summary

- **Assembled from**: research.json, resolution.json, materials.json, sop_modules.json, production.json, qa_report.json
- **QA result**: pass_with_warnings (0 critical, 4 major fixed, 5 minor deferred to spec.json, 5 info)
- **Context prefix**: WLRP (wall repaint)

### QA Fixes Applied During Assembly

| QA ID | Severity | Fix Applied |
|-------|----------|-------------|
| QA-001 | major | Changed 7 invalid `task_type` values in sop_modules.json: `mask` -> `protect` (3 tasks), `cut_in` -> `apply` (4 tasks) |
| QA-002 | major | Reduced TSK_WLRP_SPRAY_PRIMER rate from 550 to 380 SF/hr in production.json to comply with spray/backroll coupling constraint (spray rate must be <= backroll rate of 400 SF/hr) |
| QA-003 | major | Capped TSK_WLRP_FINAL_INSPECT QT2 rate from 2500 to 2000 SF/hr in production.json per 2000 SF/hr guideline |
| QA-004 | major | Capped TSK_WLRP_TOUCHUP QT2 rate from 2500 to 2000 SF/hr in production.json per 2000 SF/hr guideline |

### Spec Statistics

- **Total tasks**: 59 (30 binary, 22 qt_scaled, 7 qt_conditional)
- **Modules**: 8 (setup, assessment, RRP containment, prep, prime, interstage, finish, cleanup)
- **Material systems**: 6 (3 primers + 3 finish tiers)
- **Round configurations**: 4 (prime+2finish, prime+1finish, noprime+2finish, noprime+1finish)
- **Factor modifiers**: 23 definitions across 6 categories
- **Protection zones**: 5 (floor_perimeter, floor_full, trim_edges, fixture_covers, furniture_room)
- **Adjacent surfaces**: 6 (ceiling_field, trim_baseboard, trim_casing_door, trim_casing_window, trim_crown, trim_chair_rail)
- **PaintScope inputs**: 16
- **Configuration dimensions**: 4 (quality_tier, application_method, sheen, condition_scale)
- **Proposed registry additions**: 44

### Key Architecture Decisions

1. **Combined prime+finish** — Assessment drives primer selection; cannot split into separate specs
2. **QT2 included** — Economy refresh tier for landlord/rental scenarios (most common RP)
3. **Modifier stacking partition** — Prep pool (condition + contamination + shared) vs coating pool (QT + shared) prevent compound blowout
4. **Shared RRP module** — MOD_RRP_INT_CONTAINMENT reusable across interior RP specs
5. **49 direct transfers from NC** — Finish phase reuses NC wall finish work entirely

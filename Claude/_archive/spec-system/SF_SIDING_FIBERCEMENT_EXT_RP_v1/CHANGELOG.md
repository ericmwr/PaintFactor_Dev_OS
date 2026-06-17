# CHANGELOG — SF_SIDING_FIBERCEMENT_EXT_RP_v1

## v1.0.0 — 2026-03-15

### Initial Release

First exterior fiber cement siding repaint spec. Combined assessment + prep + prime + finish workflow for previously painted fiber cement lap, panel, and shingle siding.

#### Pipeline Artifacts

| Artifact | Status | Notes |
|----------|--------|-------|
| research.json | complete | 12 DIRECT + 12 MODIFIED + 19 RP_NEW tasks projected (42); actual 45 after module consolidation |
| resolution.json | complete | Context prefix FCRP confirmed unique; 25 registry additions proposed |
| materials.json | complete | 6 material systems (2 RP-specific primers + 4 NC reuse); 5 coverage profiles; 20 consumables |
| sop_modules.json | complete | 8 modules (7 owned MOD_FCRP_* + 1 shared MOD_RRP_EXT_CONTAINMENT); 45 tasks |
| production.json | complete | 45 task rates; 5 factor modifiers; 4 round configurations; prep/coating pool partition |
| qa_report.json | pass | 17 checks all passing; 0 issues; 6 minor observations |
| spec.json | complete | 10 variants; 7 configuration dimensions; 14 PaintScope inputs |

#### Key Characteristics

- **Substrate**: Previously painted fiber cement siding (lap, panel, shingle profiles)
- **Quality tiers**: QT2-QT4 (flat and satin sheen only)
- **Primary method**: spray_backroll (2-person crew); secondary brush_roll
- **Paintable item**: ITM_SIDING_FIELD (SF-based)
- **Task count**: 45 (34 binary + 9 qt_scaled + 2 qt_conditional)
- **Modules**: 8 (SETUP, ASSESS, PREP, PRIME, FINISH, INTERSTAGE, CLEANUP, RRP)
- **Round configurations**: 4 (2FINISH, 1FINISH, PRIME_2FINISH, PRIME_1FINISH)
- **Material systems**: 6 (2 RP-specific primers + 2 reused NC primers + 2 reused NC finishes)
- **Protection zones**: 8
- **Adjacent surfaces**: 6

#### Scope Decisions

- **NO power washing** — low-pressure rinse only (400-600 PSI max) per fiber cement doctrine
- **Caulk is major scope** — remove failed + apply new (LF-based); typical residential 200-500 LF
- **Efflorescence assessment** — FC-specific failure mode requiring neutralizer treatment
- **EPA RRP module** — shared MOD_RRP_EXT_CONTAINMENT for pre-1978 buildings
- **spray_backroll primary** — departure from NC spray-only; backroll ensures penetration into profile texture

#### Modifier Calibration Notes

- Profile modifiers calibrated for RP context: panel=0.90 (large flat runs ideal for backroll), shingle=1.40 (reduced from NC 2.00x because spray_backroll handles edges better)
- Cedarmill texture modifier set to 1.15 (vs resolution reference 1.20) per production calibration
- Worst-case coating pool: 3.79x (under 4.0x cap)
- Prep pool combinations exceeding 4.0x trigger T&M recommendation

#### QA Observations (non-blocking)

1. OBS-01: Profile modifier values intentionally differ from NC reference — RP calibration accepted
2. OBS-02: Cedarmill texture modifier 1.15 vs resolution 1.20 — production authoritative
3. OBS-03: PS_EXT_META.EA.CAULK_JOINTS namespace uses EA but actual UOM is LF — flag for future
4. OBS-04: QT4 modifier 1.30 (binary coating) vs 1.15 (qt_scaled) — both correct in context
5. OBS-05: Research projected 42 tasks, actual 45 — explained by module consolidation
6. OBS-06: Caulk LF input not explicitly listed in production input group — functional but implicit

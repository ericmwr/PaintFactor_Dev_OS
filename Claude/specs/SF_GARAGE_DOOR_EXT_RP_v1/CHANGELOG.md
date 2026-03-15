# Changelog — SF_GARAGE_DOOR_EXT_RP_v1

## [0.1.0] — 2026-03-15

### Added
- Initial draft of exterior garage door repaint spec (SF_GARAGE_DOOR_EXT_RP_v1)
- Adapts NC sibling (SF_GARAGE_DOOR_EXT_NC_v1, prefix GRDR) to repaint context with prefix GDRP
- 8 pipeline files: research.json, resolution.json, materials.json, sop_modules.json, production.json, qa_report.json, spec.json, CHANGELOG.md

### Spec Summary
- **Domain**: exterior
- **Context prefix**: GDRP (Garage Door RePaint)
- **Paintable item**: ITM_GARAGE_DOOR (EA) — reused from NC
- **Quality tiers**: QT3, QT4 (QT2 excluded — visible from street; QT5 excluded — utility surface)
- **Sheens**: satin, semi-gloss (gloss excluded for RP — requires substrate perfection not achievable over existing paint)
- **Application methods**: spray, brush (roller PROHIBITED on metal doors)
- **Substrates**: steel, wood, composite
- **Substrate states**: SS_EXT_SOUND_PAINT, SS_EXT_CHALKING, SS_EXT_FAILING_PAINT, SS_EXT_SURFACE_RUST
- **Tasks**: 56 across 9 modules (34 binary, 20 qt_scaled, 2 qt_conditional)
- **Material systems**: 7 (5 primers + 2 finishes)
- **Protection zones**: 6 (reused from NC)
- **Factor modifiers**: 6 with stacking partition (PREP/COATING/SHARED/ADDITIVE)
- **Round configurations**: 4 (SOUND, CHALKING, FAILING, RUST)

### Key RP Differentiators from NC
- Mandatory condition assessment module (MOD_GDRP_ASSESS) — 6 tasks including visual, adhesion test, rust eval, moisture test, coating ID, lead test
- 4 substrate states drive prep intensity, primer scope, and round configuration
- Sound-paint steel uses spot-prime only (wax sealed by existing film — unlike NC which requires full DTM)
- Chalk-binding primer (SYS_EXT_GDRP_PRIMER_CHALKBIND) added for SS_EXT_CHALKING
- Condition modifier (FAC_GDRP_CONDITION) in PREP stacking pool: sound 1.00x, chalking 1.20x, failing 1.50x, rust 2.00x
- Pre-1978 RRP lead-safe gate (TSK_GDRP_ASSESS_LEAD)
- Environmental modifiers excluded per PaintFactor OS (not estimatable at bid time)
- Gloss sheen excluded

### Maintained from NC
- Leapfrog technique for sectional door articulation joints
- Bottom seal (astragal) lifecycle: remove/mask, prop 2-4" during cure, reinstall after 24-48 hrs
- Articulation test at cleanup (safety quality gate)
- Driveway/apron canvas-only protection (poly PROHIBITED on hardscapes)
- Track/hardware masking
- Door size modifier (single 1.00x, double 1.85x)
- Panel complexity modifier (flush 1.00x, raised_panel 1.10x, carriage 1.30x)
- Window additive time (standard 0.75 hrs, divided_lite 1.25 hrs)

### QA Result
- **Overall**: pass
- **Issues**: 3 minor, 0 blockers
- **QA-001**: Intercoat task gating pattern difference between SOP/production (functionally equivalent)
- **QA-002**: Baseline 5.6 hrs (~17% over NC 4.8 hrs) — reasonable for sound-paint RP
- **QA-003**: Theoretical max stacking 5.53x involves impossible combo (wood+rust); realistic worst 4.07x

### Time Estimates (baseline scenarios)
| Scenario | Hours | Notes |
|----------|-------|-------|
| Single steel flush, sound, spray, QT3 | 5.6 | Baseline RP |
| Single steel flush, failing, spray, QT3 | 7.0-7.5 | +50% prep |
| Single steel flush, rust, spray, QT3 | 8.0-9.0 | +100% prep (SSPC-SP3) |
| Double steel flush, sound, spray, QT3 | 10-11 | 1.85x door size |
| Single steel carriage, sound, spray, QT4 | 8.5-9.5 | Carriage + premium |

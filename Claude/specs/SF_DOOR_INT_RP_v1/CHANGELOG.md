# SF_DOOR_INT_RP_v1 — Changelog

## v1.0.0 — 2026-03-14

**Initial release.** Interior Door Repaint (Combined Frame + Slab, Prime + Finish).

### Pipeline Summary

| Artifact | Version | Agent | Status |
|---|---|---|---|
| research.json | 0.1.0 | Spec Researcher | draft |
| resolution.json | 1.0.0 | Registry Resolver | complete |
| materials.json | 0.1.0 | Materials Manager | draft |
| sop_modules.json | 0.1.0 | SOP Librarian | draft |
| production.json | 0.1.0 | Estimation Engineer | draft |
| qa_report.json | 1.0.0 | QA Critic | PASS |
| spec.json | 1.0.0 | Assembly Agent | assembled |

### Architecture

- **Combined frame + slab** in single spec (vs NC which has separate SF_DOOR_FRAME_NC_FINISH and SF_DOOR_SLAB_INT_NC specs)
- **Dual UOM**: Frame tasks at EA, slab tasks at EA_SIDE
- **Context prefix**: DIRP (Door Interior RePaint) — avoids collision with TSK_DOOR_* (NC slab), TSK_FRAME_* (NC frame), TSK_DRRP_* (exterior door RP)
- **QT3-QT5 only** — no QT2 economy tier (doors are scrutinized surfaces per Doors Doctrine)
- **Door-specific QT modifiers**: QT3=1.0x, QT4=1.4x, QT5=1.8x (higher than global 1.0/1.3/1.5)

### Counts

- **50 tasks** (40 TSK_DIRP_* + 5 TSK_RRP_* shared + 5 method-alternatives)
- **8 modules** (7 owned MOD_DIRP_* + 1 shared MOD_RRP_INT_CONTAINMENT)
- **6 material systems** (3 state-driven primers + 3 QT-driven fine-finish)
- **4 round configurations** (2FINISH, PRIME_2FINISH, 3FINISH, PRIME_3FINISH)
- **6 protection zones** (floor_perimeter, floor_full_8ft_radius, wall_adjacent_door, hardware_covers, floor_door_swing, glass_mask)
- **7 variants** covering QT3-QT5 x GOOD/FAIR/POOR x brush/spray representative combinations
- **19 PaintScope inputs**
- **25 proposed registry additions**

### Key Design Decisions

1. **Combined spec vs split**: RP combines frame + slab because a painter works the entire opening as a unit in repaint context (assessment, protection, hardware handling all apply to the opening). NC splits them because frame and slab may be painted at different construction phases.

2. **State-driven primers**: Three primer pathways based on substrate state assessment:
   - SYS_PRIMER_ADHESION_INT for SS_INT_SOUND_PAINT (conditional), SS_INT_FAILING_PAINT, SS_INT_PEELING
   - SYS_PRIMER_STAINBLOCK_INT for SS_INT_SMOKE_DAMAGE (shellac only — RC-002)
   - SYS_PRIMER_MILDEW_INT for SS_INT_MOISTURE_DAMAGE

3. **Assessment module**: 4 RP-specific tasks (condition scan, adhesion test, coating ID, moisture check) with no NC equivalent. Results drive all downstream task activation.

4. **Interstage at all tiers**: Doors get interstage sanding between every coat at every quality tier (not just QT4+). QT3=spot 220, QT4=full 220, QT5=thorough 320.

5. **Modifier stacking partition**: Prep pool (condition x door_type x height) and coating pool (QT x door_type x height) never cross-contaminate. Realistic max: prep=3.64x, coating=3.28x.

6. **Roll-and-tip alternative**: TSK_DIRP_FINISH_FRAME_ROLL_TIP is an alternative to brush-only frame finishing (not additive). Estimator selects one per project.

7. **Louvered spray-only**: Louvered doors enforced as spray-only in RP context (individual slat brushwork is impractical at 2.5x complexity).

### QA Results

- **Overall**: PASS (zero issues, 3 minor warnings)
- **50/50 task ID match** between sop_modules.json and production.json
- **All spray rates > brush rates** on paired application tasks
- **No QT2** in any artifact
- **All enum values** compliant with controlled_enums.json
- **No prohibited patterns** (no task_class, no CONS_, no protect phase)

### Warnings (informational)

- WARN-001: Worst-case modifier stacking exceeds 4.0x for louvered + extreme conditions (flagged for estimator review)
- WARN-002: Roll-and-tip alternative relationship should be documented in spec.json (done)
- WARN-003: Condition_scale modifier on degloss tasks includes POOR value but task is skipped for POOR states (defensive only)

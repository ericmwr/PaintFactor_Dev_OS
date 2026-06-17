# SF_FENCE_EXT_RP_v1 Changelog

## [0.1.0] - 2026-03-15

### Initial Draft

First repaint spec for exterior wood fences. RP sibling to SF_FENCE_EXT_v1 (NC).

**Context prefix:** FERP (FEnce RePaint)

### Pipeline Files Generated
- `research.json` — 18 relevant findings, 7 configuration dimensions proposed
- `resolution.json` — FERP prefix confirmed (no collision), 5 registry additions proposed
- `materials.json` — 7 material systems, 7 coverage profiles, 14 consumables
- `sop_modules.json` — 8 modules, 35 tasks (31 binary + 4 qt_conditional)
- `production.json` — 35 production rates, 4 factor modifiers
- `qa_report.json` — pass_with_warnings (1 major: prep stack 4.40x in extreme RRP scenario)
- `spec.json` — Complete spec with all sections
- `CHANGELOG.md` — This file

### Key Design Decisions

1. **Substrate state as PRIMARY dimension** (not coating_type like NC). RP is driven by existing coating condition, not new coating selection.

2. **Recoat compatibility matrix** — Critical RP constraint. Penetrating stains can only recoat over penetrating. Film-forming can only recoat over film-forming. Weathered (after chemical restore) accepts any coating type.

3. **Condition scale (GOOD/FAIR/POOR)** — Drives prep intensity modifier (1.0x/1.5x/2.0x). Pattern from SF_SIDING_ENGINEERED_EXT_RP_v1.

4. **Assessment module (RP-NEW)** — 5 tasks: coating ID, adhesion test, MC test, post rot probe, mildew assessment. Post rot assessment is fence-specific HARD STOP.

5. **QT2-QT3 only** — Fence is most utilitarian exterior surface. No interstage sanding or gallery-grade finish.

6. **Roll application excluded for RP** — Not practical for weathered/previously coated vertical surfaces. NC had brush/spray_backbrush/roll; RP has brush/spray_backbrush only.

7. **Chemical restoration module carried from NC** — Same 8 tasks, same rates. Different TSK_ prefix (FERP vs FNCE) for RP/NC isolation.

8. **RRP conditional** — Lead paint rare on fences but possible for pre-1978 properties. 2.0x prep modifier per EPA requirements.

### Artifact Counts
| Artifact | Count |
|---|---|
| SOP Modules | 8 |
| Total Tasks | 35 |
| Material Systems | 7 |
| Coverage Profiles | 7 |
| Consumables | 14 |
| Factor Modifiers | 4 |
| Round Configurations | 4 |
| Protection Zones | 5 |
| PaintScope Inputs | 14 |
| Compatibility Rules | 12 |
| Variants | 8 |
| Paintable Items | 1 |
| Hard Stops | 2 |

### Modifier Stacking
- **Prep worst case:** POOR(2.0) x RRP(2.0) x cedar(1.10) = **4.40x** (exceeds 4.0x cap — T&M recommended)
- **Coating worst case:** paint(1.30) x cedar(1.10) = **1.43x** (well within cap)

### QA Result
**pass_with_warnings** — 1 major (prep stack 4.40x in extreme RRP), 2 minor (recoat compatibility deferred to engine, chemical restore rate parity noted)

# SF_TRIM_NC_PAINT_v1 — CHANGELOG

## v0.1.0 — Initial Draft (2026-02-07)

**Status:** DRAFT | **Review Required:** Yes

### Summary
Initial draft of New Construction Interior Trim Finish Coat spec (#9 in Phase 1 catalog). Finish-only spec (Scenario B per FFD Section 5.2) — companion to SF_TRIM_NC_PRIME which handles primer.

### Files Generated
| File | Agent | Status |
|------|-------|--------|
| research.json | Spec Researcher | Human reviewed — 3 corrections applied |
| resolution.json | Registry Resolver | Draft |
| materials.json | Materials Manager | Draft |
| sop_modules.json | SOP Librarian | Draft |
| production.json | Estimation Engineer | Draft |
| qa_report.json | System Critic | pass_with_warnings |
| spec.json | Assembly | Draft |

### Key Design Decisions
- **9 trim types** as separate paintable items (baseboard, door casing, window casing, crown, chair rail, wainscot rail, shadow box, panel mold, picture rail) — shared with SF_TRIM_NC_PRIME
- **LF as primary UOM** — 1 LF = 1 SF per PCA standard for trim <1 ft width
- **Finish-only** — no primer module. Heavy prep (fill, caulk, sand) was completed by SF_TRIM_NC_PRIME. Initial prep here is light touch-up only
- **4 material systems** as QT-driven recommendations (not mandates): SYS_FF_STANDARD_ACRYLIC (QT3), SYS_FF_MODIFIED_URETHANE (QT4), SYS_FF_PREMIUM (QT5), SYS_FF_GALLERY (QT5 optional)
- **Sheen/QT gate**: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only
- **Profile complexity modifiers**: simple=0.85, standard=1.0, complex=1.25, ornate=1.40
- **2-coat standard**, 3+ coats at QT5 brush/roll per FFD 15.10.3
- **Brush is default** application method per human resolution
- **QT5 gloss with brush** is achievable — do NOT enforce spray

### Research Corrections Applied
- **RC-005**: Material systems are recommendations, not mandates — contractor discretion
- **RC-006**: Advance is waterborne alkyd; Emerald Urethane is acrylic-urethane enamel (NOT waterborne alkyd). Both have SHORT working times (dry fast)
- **RC-007**: Spec supports trim finish after walls are painted (wall masking required at trim-to-wall edge for both brush and spray when walls SS_PAINTED_*). Masking finished trim for wall painting belongs in WALL spec

### Pending Doctrine Updates
- **DU-005**: FFD Section 3 — clarify material systems as recommendations
- **DU-006**: FFD Section 15.2.2 — review waterborne alkyd open time claims, clarify Emerald Urethane classification

### QA Summary
- **Overall**: pass_with_warnings
- **Critical issues**: 0
- **Major issues**: 0
- **Minor warnings**: 5 (QA-001 through QA-005)
- **Doctrine checks**: 61 pass, 2 warn, 13 deferred (require spec.json — now available)
- **Cross-file threading**: 21/21 tasks match between sop_modules.json and production.json
- **Registry compliance**: Clean — no prohibited patterns

### Registry Additions Proposed (10)
- SF_TRIM_NC_PAINT phase_scope update (full → finish)
- SF_TRIM_NC_PRIME (new SF_ entry)
- PS_EDGE_LF.TRIM_JOINTS (add to PS_ entries_in_active_use)
- PS_PROTECT_LF.WALL_ADJACENT + IN_LF_WALL_ADJACENT (new pair)
- PS_PROTECT_EA.ASSET.FIXTURES + IN_EA_ASSET_FIXTURES (new pair)
- ROUND_TRIM_FINISH_2COAT, ROUND_TRIM_FINISH_3COAT (new)
- COV_TRIM_FINISH (new coverage profile)

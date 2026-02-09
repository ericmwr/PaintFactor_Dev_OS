# SF_ARCH_ELEMENT_NC_v1 — CHANGELOG

## v0.1.0 — Initial Draft (2026-02-09)

**Status:** DRAFT | **Review Required:** Yes

### Summary
Initial draft of New Construction Architectural Element Painting spec (#16 in generation order). Combined prime+paint spec — primer conditional on substrate_state (SS_BARE requires primer, SS_PRIMED_FACTORY skips to finish). Three paintable items with distinct UOMs: ITM_ARCH_BEAM (LF), ITM_ARCH_COLUMN (EA), ITM_ARCH_MANTEL (EA). Most complex multi-item architecture in the system — 3 items across 3 different UOM types, each with its own element-specific complexity modifier.

### Files Generated
| File | Agent | Status |
|------|-------|--------|
| research.json | Spec Researcher | Draft |
| resolution.json | Registry Resolver | Draft |
| materials.json | Materials Manager | Draft |
| sop_modules.json | SOP Librarian | Draft |
| production.json | Estimation Engineer | Draft |
| qa_report.json | System Critic | pass_with_warnings |
| spec.json | Assembly | Draft |

### Key Design Decisions
- **Three paintable items with distinct UOMs** — ITM_ARCH_BEAM (LF), ITM_ARCH_COLUMN (EA), ITM_ARCH_MANTEL (EA). Per-element tasks where geometry differs; shared FIXED tasks for room-level work.
- **Combined prime+paint** — primer conditional on substrate_state. 5 substrate-driven primer paths (MDF two-step shellac+latex, FJP stain-block, hardwood tannin-block, softwood standard, factory-primed skip).
- **3 QT-driven finish systems** as recommendations: SYS_FF_STANDARD_ACRYLIC (QT3), SYS_FF_MODIFIED_URETHANE (QT4), SYS_FF_PREMIUM (QT5).
- **Sheen/QT gate**: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only; satin default.
- **Three element-specific complexity modifiers**: beam_profile (small_box=1.0x, standard_box=1.10x, large_timber=1.20x, ornate=1.40x), column_type (square_smooth=1.0x, square_detailed=1.15x, round_smooth=1.10x, round_fluted=1.30x), mantel_type (shelf_only=1.0x, standard_surround=1.25x, full_assembly=1.50x). Each scoped exclusively to its own element.
- **Mixed working heights** — beams overhead at ceiling (overhead factor ~0.85x baked into base rates), columns full-height (height modifier stacks), mantels wall-height (H1 typical).
- **Localized protection** — floor_workzone for spray (not floor_full — elements are discrete, not room-spanning). floor_perimeter for brush.
- **4 protection zones**: floor_workzone (spray), floor_perimeter (brush), wall_adjacent (spray), fixture_covers (spray near beams).
- **QT3-QT5 only** — no QT2 for prominent millwork per Millwork Doctrine SS6.
- **2-coat standard**, 3+ coats at QT5 brush per FFD SS15.10.3.
- **9 variants** covering substrate_state x quality_tier x application_method x sheen combinations.
- **All SYS_ IDs reuse existing entries** — 5 primer + 3 finish = 8 systems, zero new SYS_ IDs (REUSE OVER CREATION).
- **COMP_FIREPLACE note**: Mantels are the SOURCE of COMP_FIREPLACE complexity for adjacent wall/ceiling specs — this spec is not affected by the modifier itself.

### Scope Boundaries
- **Standalone decorative beams** (individual ceiling beams, faux timber wraps) — NOT coffered ceiling beams (those go to SF_WOOD_CEILING_NC).
- **Decorative column wraps** (square, round, fluted, paneled) — NOT stair newel posts (those go to SF_STAIR_RAILING_NC).
- **Fireplace mantels/surrounds** (shelf, standard surround, full assembly) — NOT stone/brick/tile surrounds (masonry trade).

### Research Corrections Inherited
- **RC-004**: No dry times in specs — refer to product PDS (from SF_DRYWALL_WALL_NC_PRIME)
- **RC-005**: Material systems are recommendations, not mandates — contractor discretion (from SF_TRIM_NC_PAINT)
- **RC-006**: Advance is waterborne alkyd; Emerald Urethane is acrylic-urethane enamel (NOT waterborne alkyd). Both have SHORT working times (from SF_TRIM_NC_PAINT)

### QA Summary
- **Overall**: pass_with_warnings
- **Critical issues**: 0
- **Major issues**: 0
- **Minor warnings**: 5 (QA-001 through QA-005)
  - QA-001: Production rates are research estimates (no field data yet)
  - QA-002: Complexity modifiers are research-based adaptations from Millwork Doctrine SS7.2
  - QA-003: Phase 'apply' in resolution full_sequence but not in values array
  - QA-004: Brief omits wall masking LF input — Resolver correctly added it
  - QA-005: IN_SF_FLOOR_WORKZONE vs IN_SF_PROTECT_FLOOR_WORKZONE naming inconsistency
- **Cross-file threading**: 39/39 tasks match between sop_modules.json and production.json
- **Registry compliance**: Clean — no prohibited patterns
- **Brief acceptance criteria**: 14/14 met

### Registry Additions Proposed (18)
- SF_ARCH_ELEMENT_NC (new SF_ entry)
- ITM_ARCH_BEAM, ITM_ARCH_COLUMN, ITM_ARCH_MANTEL (3 new paintable items)
- TSK_ARCH_* (39 tasks, new context prefix ARCH)
- MOD_ARCH_* (7 modules)
- ROUND_ARCH_PRIME_2FINISH, ROUND_ARCH_2FINISH, ROUND_ARCH_3FINISH (3 round configs)
- COV_ARCH_PRIMER, COV_ARCH_FINISH (2 coverage profiles)
- PS_SURFACE_LF.ARCH_BEAM, PS_SURFACE_EA.ARCH_COLUMN, PS_SURFACE_EA.ARCH_MANTEL (3 proposed PaintScope keys)
- IN_LF_ARCH_BEAM, IN_EA_ARCH_COLUMN, IN_EA_ARCH_MANTEL (3 new input IDs)
- beam_wrap, column_wrap, mantel (3 surface_id activations)

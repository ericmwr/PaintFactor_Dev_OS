# SF_WOOD_CEILING_NC_v1 — CHANGELOG

## v0.1.0 — Initial Draft (2026-02-09)

**Status:** DRAFT | **Review Required:** Yes

### Summary
Initial draft of New Construction Wood Ceiling Panel/Board System Painting spec (#15 in generation order). Combined prime+paint spec — primer conditional on substrate_state (SS_BARE requires primer, SS_PRIMED_FACTORY skips to finish). Single SF-based paintable item (ITM_WOOD_CEILING_PANEL) covering flat plank, beadboard, tongue-and-groove, and coffered panel+beam systems. ALL work is overhead — base rates ~0.70-0.80x of equivalent wood wall rates.

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
- **Single SF paintable item** (ITM_WOOD_CEILING_PANEL) — covers entire wood ceiling surface including coffered beam faces as integrated system
- **SF as primary UOM** — total ceiling area covered by wood surface
- **Combined prime+paint** — primer conditional on substrate_state. 5 substrate-driven primer paths (MDF two-step shellac+latex, FJP stain-block, hardwood tannin-block, softwood standard, factory-primed skip)
- **3 QT-driven finish systems** as recommendations (not mandates): SYS_FF_STANDARD_ACRYLIC (QT3), SYS_FF_MODIFIED_URETHANE (QT4), SYS_FF_PREMIUM (QT5)
- **Sheen/QT gate**: satin at QT3+, semi-gloss at QT4+, gloss at QT5 only; satin default (reduced glare from overhead lighting)
- **Ceiling style complexity modifiers**: flat_plank (1.0x), beadboard (1.15x), tongue_and_groove (1.10x), coffered (1.35x) — TIME multipliers on production rates
- **Overhead penalty baked into base rates** — spray ~0.75x, brush ~0.70x, caulk ~0.70x of equivalent wood wall rates. NOT a separate modifier
- **Height modifier stacks ON TOP of overhead base rates** via PS_META.HEIGHT_BAND: H1=1.0x, H2=1.30x, H3=1.50x, H4=2.00x
- **5 protection zones**: floor_full (spray), floor_perimeter (brush), wall_upper_band (spray), fixture_covers (always), opening_cover_lightweight (spray)
- **Inverse protection relationship** to SF_WOOD_WALL_NC — wood ceiling masks wall below (wall_upper_band zone), wood wall masks ceiling above (ceiling_line zone)
- **Fixture masking always required** — unlike wall specs, ceiling fixtures are embedded in work surface
- **QT3-QT5 only** — no QT2 for prominent millwork surfaces per FFD
- **2-coat standard**, 3+ coats at QT5 brush per FFD §15.10.3
- **9 variants** covering substrate_state × quality_tier × application_method × sheen combinations
- **All SYS_ IDs reuse existing entries** — no new material system IDs needed (REUSE OVER CREATION)

### Research Corrections Inherited
- **RC-004**: No dry times in specs — refer to product PDS (from SF_DRYWALL_WALL_NC_PRIME)
- **RC-005**: Material systems are recommendations, not mandates — contractor discretion (from SF_TRIM_NC_PAINT)
- **RC-006**: Advance is waterborne alkyd; Emerald Urethane is acrylic-urethane enamel (NOT waterborne alkyd). Both have SHORT working times (from SF_TRIM_NC_PAINT)

### QA Summary
- **Overall**: pass_with_warnings
- **Critical issues**: 0
- **Major issues**: 0
- **Minor warnings**: 6 (QA-001 through QA-006)
  - QA-001: Production rates are research estimates with overhead penalty (no field data yet)
  - QA-002: Ceiling style modifiers interpolated from doctrine (not empirically validated)
  - QA-003: Brief lists SYS_PRIMER_WOOD_STANDARD but resolution/materials use SYS_PRIMER_WOOD_ACRYLIC
  - QA-004: Phase "apply" in resolution full_sequence but not in phase enum values
  - QA-005: PaintScope keys PS_SURFACE_SF.WOOD_CEILING and PS_PROTECT_SF.WALL_UPPER_BAND require activation/creation
  - QA-006: Opening cover zone — brief specifies PS_OPENING_EA keys but implementation uses FIXED per room
- **Cross-file threading**: 30/30 tasks match between sop_modules.json and production.json
- **Registry compliance**: Clean — no prohibited patterns
- **Brief acceptance criteria**: 31/31 met

### Registry Additions Proposed (15)
- SF_WOOD_CEILING_NC (new SF_ entry)
- ITM_WOOD_CEILING_PANEL (new paintable item, SF)
- TSK_WDCL_* (30 tasks, new context prefix WDCL)
- MOD_WDCL_* (7 modules)
- ROUND_WDCL_PRIME_2FINISH, ROUND_WDCL_2FINISH, ROUND_WDCL_3FINISH (3 round configs)
- COV_WDCL_PRIMER, COV_WDCL_FINISH (2 coverage profiles)
- PS_SURFACE_SF.WOOD_CEILING (new PaintScope key)
- PS_PROTECT_SF.WALL_UPPER_BAND (activation of existing catalog key)
- IN_SF_WOOD_CEILING, IN_SF_PROTECT_WALL_UPPER_BAND (2 new input IDs)
- ceiling_panel (new surface_id)
- wall_upper_band (zone_id activation)

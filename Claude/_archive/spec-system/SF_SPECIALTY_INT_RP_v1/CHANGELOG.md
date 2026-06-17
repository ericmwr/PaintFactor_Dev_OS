# SF_SPECIALTY_INT_RP_v1 Changelog

## v1.0.0 — 2026-03-14

Initial release. Consolidated interior specialty surface repaint spec covering 7 paintable items from 5 NC source specs.

### Source Specs Consolidated
- SF_WAINSCOT_PANEL_NC_v1 (25 tasks)
- SF_WOOD_WALL_NC_v1 (25 tasks)
- SF_WOOD_CEILING_NC_v1 (30 tasks)
- SF_ARCH_ELEMENT_NC_v1 (39 tasks)
- SF_BUILTIN_NC_v1 (35 tasks)
- **Total NC: 154 tasks -> 58 RP tasks (2.65x reduction)**

### Paintable Items (7)
- ITM_WAINSCOT_PANEL (SF)
- ITM_WOOD_WALL_PANEL (SF)
- ITM_WOOD_CEILING_PANEL (SF)
- ITM_ARCH_BEAM (LF)
- ITM_ARCH_COLUMN (EA)
- ITM_ARCH_MANTEL (EA)
- ITM_BUILTIN_UNIT (EA) — proposed RP consolidation item

### Architecture
- 8 modules: Setup, Assessment, RRP Containment (shared), Prep, Prime, Interstage, Finish, Cleanup
- 49 SPRP-owned tasks + 5 shared RRP + 4 SPRP assessment
- 7 material systems (4 state-driven primers + 3 QT-driven fine-finish)
- 4 round configurations (2/3 finish coats, with/without prime)
- 9 protection zones
- 10 variants covering condition x QT x method combinations
- Context prefix: SPRP

### QA Result
- **pass_with_warnings**
- 1 major fixed (beam finish rate range inverted)
- 4 minor warnings accepted (modifier naming refinements, builtin depth value discrepancy, task count labeling, stacking threshold flags)

### Key Design Decisions
- Shared assessment/interstage/cleanup modules eliminate 5 separate NC modules
- Per-surface-type finish rates preserved from NC for rate accuracy
- Built-in consolidated from 5 NC items to 1 EA item with size-tier rate lookup
- Stain/clear coat conversion path via SYS_PRIMER_BONDING
- Two-pool modifier architecture (prep pool vs coating pool, never cross-apply)
- Ceiling overhead penalty baked into per-task base rates (0.70-0.80x of wall rates)

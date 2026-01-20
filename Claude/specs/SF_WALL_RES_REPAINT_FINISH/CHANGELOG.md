# Changelog — SF_WALL_RES_REPAINT_FINISH

All notable changes to this spec family will be documented in this file.

## [0.1.0] — 2026-01-19

### Added
- Initial spec family creation for residential wall repaint finish coats
- **Geometry Model:** SF field + LF edges (PaintScope-sourced)
- **Paintable Items:**
  - `ITM_RES_WALL_FIELD_SF` — Wall field area (SF)
  - `ITM_RES_WALL_EDGE_LF` — Edge cut lines (LF)
- **Configuration Dimensions:**
  - Quality level (QL-3, QL-4, QL-5)
  - Surface condition (good, fair)
  - Edge strategy (freehand cut-in, tape line)
  - Finish sheen (matte, eggshell, satin)
  - Color change (low, moderate, high)
  - Ceiling height (standard, tall, vaulted)
- **Prep Variants:**
  - Good condition: light prep (clean, spot scuff, fill nail holes)
  - Fair condition: extended prep (TSP wash, full scuff, fill/caulk repairs)
- **Edge Strategies:**
  - Freehand cut-in (typical residential)
  - Tape line (premium/color contrast)
- **Application:** Roll only (no spray)
- **SOP Modules:** 9 modules with 23 tasks
- **Material Systems:** 3 quality tiers with coverage profiles
- **Production Rates:** Placeholder rates for all tasks
- **Factor Modifiers:** Ceiling height, room complexity, color change, occupied home, textured walls

### Status
- **Draft** — All rates require field calibration
- **System Critic:** Pass with warnings (rates need calibration)

### Notes
- Spec is doctrine-compliant: geometry sourced from PaintScope, not computed internally
- Edge LF explicitly declared as required input
- Designed for occupied residential environments

# Changelog - SF_DRYWALL_FULL_NC_PRIME

All notable changes to this spec family will be documented in this file.

## [1.0.0] - 2026-01-24

### Added
- Initial spec family for New Construction Full Prime (Ceilings + Walls, Pre-Trim)
- spec.json with configuration dimensions, paintable items, protection items, and variants
- research.json with scope analysis, primer systems, and field clarifications
- sop_modules.json with prep, protection, apply, and cleanup modules
- materials.json with primer systems, coverage profiles, and consumables
- production.json with task rates, QT effects, and crew configurations

### Scope Decisions
- **No edge work required** - Same primer coat covers ceiling and wall continuously (no color break), no trim installed (pre-trim phase)
- **No floor protection** - Subfloor only in NC pre-trim, no finished flooring to protect
- **No fastener spot-priming** - Galvanized drywall screws do not rust during normal NC timeline; rust bleed-through is water damage scenario (drywall contractor liability if non-galvanized nails used)
- **Fixture protection uses room-based heuristic** - Per-fixture count unrealistic; use room count with averages (6 lights + 10 electrical boxes per room)

### Key Features
- Surface sequencing: Ceilings FIRST, then Walls (gravity drip management)
- Subfloor vacuum before priming (removes fallen dust from ceiling/wall vacuum)
- Subfloor vacuum after priming (removes drips and debris)
- Spray+backroll coupling constraint enforced (backroll rate is bottleneck)
- 18-inch roller standard for spray+backroll production

### Author
- SpecFactory

### Reviewer
- Pending human review

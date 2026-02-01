# Changelog - SF_DRYWALL_CEILINGS_NC_PAINT

All notable changes to this spec family will be documented in this file.

## [1.0.1] - 2026-01-31

### Fixed (Orchestrator Review)
- Added `site_condition_rules` to spec.json (Spec Completeness Doctrine Layer 3)
  - `access_constraint`: scaffold/lift triggers height modifiers for overhead tasks
  - `occupancy_state`: occupied spaces may restrict spray methods
  - `ventilation_condition`: poor ventilation restricts spray methods
- Added `glass_mask` and `door_hardware` to `protection_zones_required` in spec.json — aligns spec-level declarations with sop_modules protection_metadata
- Added missing production rates for `TSK_LIGHT_SAND_BETWEEN_COATS_SPRAY` and `TSK_VACUUM_INTERCOAT_DUST_SPRAY` in production.json — resolves task ID mismatch between sop_modules and production
- Corrected dry-time recommendation in qa_report.json — dry times intentionally excluded per Materials & Consumables Doctrine (RC-004)

## [1.0.0] - 2026-01-24

### Added
- Initial spec family for NC ceiling paint (finish coats on primed drywall)
- Quality tiers QT2-QT5 with appropriate sheen and coat requirements
  - QT2: Economy single coat flat
  - QT3: Standard single coat flat with inspection/repair
  - QT4 Flat: Premium two coats flat for colored ceilings
  - QT4 Eggshell: Premium two coats eggshell/satin with sheen penalty
  - QT5: Critical two coats semi-gloss+ with significant sheen penalty
- Application methods: roll, spray_backroll, spray
- Surface texture support: smooth, orange_peel, knockdown
- Finish sheen configuration dimension with application time modifiers
- Height factor modifiers for ceiling heights 8-18+ ft
- Inspection and repair module (QT3+) with spackle, sand, spot prime tasks
- Premium prep module (QT4+) with full ceiling light sand
- Protection module for ceiling fixtures, windows, doors
- Window/door masking verification (may exist from prime phase)
- Ceiling fixture protection using room-based heuristic (6 lights + 2 boxes per room)
- Sheen application effects with time increase modifiers
- Spray+backroll coupling constraint (backroll is bottleneck)
- Overhead work factor documented

### Scope Decisions
- NO edge work at ceiling-wall boundary (wall painter establishes line)
- NO floor protection (NC pre-trim has subfloor only)
- NO primer coat (assumes ceilings already primed)
- Ceiling painter can roll 1-2 inches onto wall area

### Key Field Corrections Applied
- Removed edge work from scope (walls not yet painted)
- Added window/door masking (overspray/splatter falls on openings)
- Excluded QT2 from inspection/repair module (economy work)
- QT4 split into flat vs eggshell options with different production modifiers
- Sheen application penalty increases with sheen level on ceilings

### Notes
- Status: draft, review_required: true
- Production rates assume 8-10 ft standard ceiling height
- Height modifiers apply for taller ceilings
- Sheen time increase modifiers: flat=1.0, eggshell=1.18, semi-gloss+=1.43

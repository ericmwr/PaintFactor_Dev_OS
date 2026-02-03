# Changelog - SF_DRYWALL_CEILING_NC_FINISH

All notable changes to this spec family will be documented in this file.

## [0.1.0] - 2026-02-02

### Added
- Initial draft spec for New Construction Drywall Ceiling Finish Coat
- Generated via SpecFactory pipeline from brief `specs/_backlog/SF_DRYWALL_CEILING_NC_FINISH/brief.md`

### Spec Highlights

**Scope:**
- Finish coat application (1-2 coats) for primed drywall ceilings in NC
- Applies over cured primer (primer scope in SF_DRYWALL_CEILING_NC_PRIME)
- Ceilings painted BEFORE walls in NC production sequence

**Key Design Decision — NO Edge Work:**
- Ceiling painter does NOT cut in at the wall line
- Ceiling painter can roll/spray 1-2" onto wall area
- Wall painter establishes the final ceiling line when painting walls
- This is the critical structural difference from SF_DRYWALL_WALL_NC_FINISH

**Quality Tiers & Coats:**
- QT2: 1 coat flat (economy)
- QT3: 1 coat flat (standard)
- QT4: 2 coats flat (for color) OR 2 coats eggshell/satin (with sheen penalty)
- QT5: 2 coats semi-gloss+ (critical prep, significant sheen penalty)

**Application Methods:**
- spray_backroll (default, production standard, 18" roller)
- spray (no backroll, QT2-QT3 only)
- roll (18" roller with extension pole)

**Protection Zones:**
- `fixture_covers` — ceiling fixtures (recessed lights, electrical boxes) for spray methods
- `opening_cover_lightweight` — lightweight plastic pin-up over window/door openings for spray methods (NEW zone added to Protection_Zones_Reference.md v2.1)

**Production Rate Adjustments:**
- Overhead work factor: ~15-20% slower than equivalent wall rates (factored into base rates)
- Height modifiers more aggressive than wall: H2=1.15, H3=1.5, H4=2.0
- Sheen application penalties: eggshell 1.18x, semi-gloss+ 1.43x (harder on ceilings)
- Spray+backroll coupling: backroll rate (320 SF/hr) is the bottleneck

**PaintScope Inputs:**
- PS_SURFACE_SF.CEILING_FIELD (required)
- PS_PROTECT_SF.FLOOR_EXPOSED (for subfloor vacuum)
- PS_META.EA.ROOMS_TOTAL (fixture protection heuristic)
- PS_OPENING_EA.WINDOW_OPENINGS_TOTAL (opening covers)
- PS_OPENING_EA.DOOR_OPENINGS_TOTAL (opening covers)

### Artifacts Generated
- `spec.json` — spec definition with variants, protection zones, adjacency, site conditions
- `research.json` — research findings, PaintScope key verification, completeness analyses
- `materials.json` — 4 material systems, 8 coverage profiles, 12 consumables
- `sop_modules.json` — 9 SOP modules, ~35 tasks across prep/protection/apply/cleanup
- `production.json` — task production rates, quality tier effects, height/texture/sheen effects
- `qa_report.json` — Critic pass with all acceptance criteria met
- `CHANGELOG.md` — this file

### Doctrine References
- Quality_Tiers_and_Surface_Condition.md — QT/sheen rules, sanding standards
- Materials_and_Consumables_Doctrine.md — 18" roller standard, ceiling paint specs
- Estimation_Modifiers_Doctrine.md — height modifiers, spray+backroll coupling
- Protection_and_Masking_Doctrine.md — fixture protection, opening covers
- Modifier_Registry.md — canonical modifier values
- Spec_Completeness_Doctrine.md — mandatory declaration layers

### Related Changes
- Protection_Zones_Reference.md updated to v2.1: added `opening_cover_lightweight` zone

### Status
- **Status:** draft
- **Review Required:** yes
- **QA Result:** PASS

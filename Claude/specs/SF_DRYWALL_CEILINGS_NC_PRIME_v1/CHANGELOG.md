# Changelog - SF_DRYWALL_CEILINGS_NC_PRIME

All notable changes to this spec family will be documented in this file.

## [0.1.0] - 2026-01-31

### Added
- Initial spec family for NC ceiling prime (single primer coat on bare drywall)
- Quality tiers QT2-QT5 — all receive single primer coat
  - QT2: Economy — PVA primer, quick inspection
  - QT3: Standard — PVA primer, thorough inspection
  - QT4: Premium — Acrylic latex primer (SW ProMar 200), detailed inspection with mil thickness verification
  - QT5: Critical — High-build primer, critical inspection with raking light
- Application methods: roll and spray+backroll (no spray-only)
- Surface texture support: smooth, orange_peel, knockdown
- Material systems: SYS_PVA_CEILING_PRIMER (QT2-3), SYS_ACRYLIC_LATEX_CEILING_PRIMER (QT4), SYS_HIGH_BUILD_CEILING_PRIMER (QT5)
- Ceiling opening/fixture protection — covers both installed cans/boxes AND open holes (insulation concern)
- Lightweight window/door masking — pin plastic to catch fallout (spray method only)
- Conditional floor protection by floor_type site condition:
  - Hard floors (tile, hardwood, LVP): rosin paper taped down
  - Carpet: canvas drop cloths or plastic sheeting
  - Subfloor: no floor protection needed
- Spray+backroll coupling constraint (backroll 300 SF/hr is bottleneck, slower than finish coat due to porous surface)
- Height factor modifiers for ceiling heights 8-18+ ft
- Texture effects on coverage and application rate
- Post-prime floor vacuum cleanup
- Validation plan with 4 field calibration tests

### Scope Decisions
- NO spot-priming of fasteners — NC fasteners are mudded and rust-resistant (RC-001)
- NO edge work at ceiling-wall boundary — primer overlaps onto wall area, wall primer covers later
- NO sanding after prime — belongs to finish spec (SF_DRYWALL_CEILINGS_NC_PAINT)
- NO spray-only method — only roll and spray+backroll
- NO stain blocking claims — PVA and acrylic latex primers are sealers only (RC-002)
- NO dry time specifications — too many variables (RC-004)
- Window/door masking and floor protection STAY IN PLACE for subsequent NC phases

### Doctrine Additions
- Quality_Tiers_and_Surface_Condition.md v1.2: Added "Application Quality Is Not Tiered" section
  - All quality tiers require properly painted surface per PCA — no drips, sags, holidays, or lap marks
  - QT differences are inspection, sanding, patchwork, time, and materials — NOT application quality
  - Agent rule: application task quality_notes must use universal standard, not tiered defect acceptance

### Key Field Corrections Applied (15 total)
- RC-001: No spot-priming of fasteners (mudded, rust-resistant in NC)
- RC-002: Zero stain blocking on PVA and acrylic latex primers (sealers only)
- RC-003: Floor protection conditional on floor_type (finished vs subfloor)
- RC-004: No dry time specifications
- Top-tier brands only: SW, BM, PPG (no Kilz, Zinsser, Glidden)
- Correct product names: SW PVA Primer (QT2-3), SW ProMar 200 Acrylic Latex (QT4)
- Tape yield: 180 LF/roll (60 yards), masking paper: 180 LF/roll
- Roller nap ranges: 3/8"-1/2" smooth, 1/2"-3/4" textured
- Rosin paper default for hard floor protection when spraying ceilings
- Ceiling openings include open holes (insulation concern, not just installed fixtures)
- QT5 sanding removed from prime scope (finish task)
- Lightweight masking for windows/doors (pin plastic, not intricate masking)
- Application quality doctrine: universal standard across all tiers
- Backroll primer rate slower than finish coat (porous surface absorption)
- Floor vacuum rate: 1000 SF/hr

### Pending Doctrine Updates
- Assign RC-001 through RC-004 to specific doctrine documents
- Add `floor_type` to Site_Condition_Vocabulary_Reference.md
- Add `PS_META.SF.FLOOR_VACUUM_AREA` to PaintScope catalog
- Add tape/masking paper yield doctrine (180 LF/roll) to Materials_and_Consumables_Doctrine.md
- Review existing SF_DRYWALL_WALL_NC_PRIME_v1 for same corrections

### Notes
- Status: draft, review_required: true
- Production rates assume 8-10 ft standard ceiling height
- All rates are starting estimates pending field calibration
- Companion spec: SF_DRYWALL_CEILINGS_NC_PAINT (finish coats)

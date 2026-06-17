# Changelog: SF_TRIM_NC_PRIME

All notable changes to this spec family will be documented in this file.

---

## [0.1.0] - 2026-02-04

### Initial Draft Release

**Author:** SpecFactory Pipeline (Claude)
**Status:** Draft
**Review Required:** Yes

#### Summary
Initial draft spec family for New Construction Interior Trim Priming, covering all substrate scenarios:
- Factory-primed trim (optional additional primer)
- Bare MDF (two-step: solvent edge sealer + latex face primer)
- Bare FJP (stain-blocking primer - mandatory)
- Bare solid wood (standard primer-sealer)
- Glossy/oil-based existing (bonding primer)

#### Artifacts Created
| Artifact | Status | Notes |
|----------|--------|-------|
| `brief.md` | Complete | In `specs/_backlog/SF_TRIM_NC_PRIME/` |
| `research.json` | Complete | Domain research, completeness analysis |
| `materials.json` | Complete | 7 material systems, 15 coverage profiles, 25 consumables |
| `sop_modules.json` | Complete | 4 modules, 17 tasks |
| `production.json` | Complete | Task rates, modifiers, defect tolerances |
| `qa_report.json` | Complete | PASS_WITH_WARNINGS |
| `spec.json` | Complete | Final assembly |

#### Key Design Decisions
1. **substrate_condition as primary dimension** - Six values covering all NC trim scenarios
2. **MDF two-step process** - Solvent edge seal + latex face prime (mandatory)
3. **FJP stain-blocking** - Marked as mandatory, not configurable
4. **LF as primary UOM** - Per PDCA standard (1 LF = 1 SF)
5. **Module structure** - Follows Fine Finish pattern (MOD_FF_*)
6. **Primer is configuration, not tier-locked** - Per Fine_Finish_Doctrine Section 2.1

#### Production Rates (QT3 baseline)
| Task | Rate | UOM |
|------|------|-----|
| Brush prime | 90 LF/hr | LF |
| Spray prime | 375 LF/hr | LF |
| Fill fasteners | 120 LF/hr | LF |
| Caulk joints | 135 LF/hr | LF |
| Sand prep | 200 LF/hr | LF |
| MDF edge seal | 100 LF/hr | LF |

#### Modifiers Applied
- **Profile complexity:** Simple=0.85, Standard=1.0, Complex=1.25, Ornate=1.40
- **Height:** H1=1.0, H2=1.30, H3=1.50
- **Quality tier:** QT3=1.0, QT4=1.3, QT5=1.5

#### QA Report Summary
- **Overall Status:** PASS_WITH_WARNINGS
- **Issues:** 2 minor PaintScope key clarifications needed
- **All acceptance criteria from brief:** PASS

#### Doctrine References
- Fine_Finish_Doctrine.md - Section 2.1 (primer is configuration), Section 3.6 (primer selection), Section 5 (module structure)
- Millwork_NC_Paint_Doctrine.md - Section 1.3 (PDCA LF=SF), Section 4 (primer systems), Section 7.2 (complexity modifiers)
- Quality_Tiers_and_Surface_Condition.md - Task classification, scrutiny by tier
- Protection_and_Masking_Doctrine.md - Mask levels, floor protection
- Modifier_Registry.md - All modifier values

---

## Future Versions

### Planned for v0.2.0
- Address QA report warnings (PaintScope key clarifications)
- Human review corrections
- Field validation of production rates

### Open Questions (from brief)
1. Crown molding inclusion vs separate spec
2. Chair rail/wainscot cap PaintScope key strategy
3. Pre-finish sanding configurability

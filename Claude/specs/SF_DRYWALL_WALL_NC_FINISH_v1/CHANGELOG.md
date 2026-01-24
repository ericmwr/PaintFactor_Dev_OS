# Changelog

All notable changes to the SF_DRYWALL_WALL_NC_FINISH spec family.

## [0.1.0] - 2026-01-24

### Added
- Initial draft of SF_DRYWALL_WALL_NC_FINISH spec family

### Doctrine Compliance
This spec incorporates updates from doctrine v1.1 (2026-01-24):

**Quality_Tiers_and_Surface_Condition.md v1.1:**
- Sanding standards by quality tier:
  - QT2: No sanding
  - QT3: Light sand with 120 grit (prime-to-finish), spot sand patches only
  - QT4/QT5: Full sand (prime-to-finish), full sand 220 grit between coats
- Sheen and quality tier minimums:
  - QT2 max sheen: Flat, Matte
  - QT3 max sheen: Eggshell
  - QT4+ required for: Satin, Semi-gloss, Gloss
  - Auto-upgrade rule: If sheen exceeds QT max, upgrade QT automatically

**Materials_and_Consumables_Doctrine.md v1.1:**
- 18-inch roller frame and cover standard for spray+backroll systems
- Larger roller increases backroll throughput, enabling faster overall system rate

**Estimation_Modifiers_Doctrine.md v1.1:**
- Spray/backroll throughput coupling constraint maintained
- Primer tinting rules referenced (though not directly used in finish spec)

### Configuration Dimensions
| Dimension | Values | Default |
|-----------|--------|---------|
| quality_tier | QT2, QT3, QT4, QT5 | QT3 |
| application_method | roll, spray_backroll, spray | spray_backroll |
| sheen | flat, matte, eggshell, satin, semi-gloss | eggshell |
| surface_texture | smooth, orange_peel, knockdown | smooth |
| coat_count | 1, 2 | 2 |

### PaintScope Inputs
- **PS_SURFACE_SF.WALL_FIELD** (required)
- **PS_EDGE_LF.TO_CEILING** (required for QT3+)
- **PS_EDGE_LF.TO_TRIM** (when trim installed)
- **PS_PROTECT_SF.FLOOR_EXPOSED** (when finished floors)

### Key Production Rates (QT3 Baseline)
| Task | Rate | Notes |
|------|------|-------|
| Roll first coat | 300 SF/hr | 9-inch roller |
| Roll second coat | 350 SF/hr | Faster than first |
| Backroll (18-inch) | 450 SF/hr | Per doctrine |
| Cut-in ceiling | 90 LF/hr | Freehand |
| Light sand primer | 400 SF/hr | 120 grit |
| Full sand primer | 300 SF/hr | QT4+ |
| Sand between coats | 350 SF/hr | 220 grit, QT4+ |

### Quality Tier Modifiers
| Tier | Modifier | Max Sheen | Sanding |
|------|----------|-----------|---------|
| QT2 | 0.75 | Matte | None |
| QT3 | 1.0 | Eggshell | Light |
| QT4 | 1.3 | Any | Full + between |
| QT5 | 1.5 | Any | Full + between |

### Relationships
- **Follows:** SF_DRYWALL_WALL_NC_PRIME
- **May combine with:** SF_DRYWALL_WALL_NC_FULL
- **Interacts with:** SF_TRIM_INT_NC_FINISH, SF_CEILING_INT_NC_FINISH

### Files Created
| File | Purpose |
|------|---------|
| spec.json | Main specification with doctrine references |
| materials.json | 7 material systems, 18\" roller consumables |
| sop_modules.json | 12 modules with QT-specific sanding |
| production.json | 32 task rates with sheen minimums |
| research.json | Domain research with doctrine compliance |
| qa_report.json | System Critic validation |

---

## Format
Based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

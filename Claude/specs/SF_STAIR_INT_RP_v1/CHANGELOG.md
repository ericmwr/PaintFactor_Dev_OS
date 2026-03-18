# SF_STAIR_INT_RP_v1 Changelog

## v1.0.0 — 2026-03-14

### Initial Release

**Spec Family:** SF_STAIR_INT_RP (Interior Stair System Repaint)
**Domain:** Interior | **Scope:** Repaint | **Context Prefix:** STRP

#### Overview
Combined prime + finish repaint spec for previously painted interior stair systems in occupied residential homes. Consolidates two NC specs into a single RP spec:
- SF_STAIR_RISER_NC_v1 (30 tasks — risers, stringers)
- SF_STAIR_RAILING_NC_v1 (43 tasks — balusters, newels, handrails, base rails)
- Combined: 73 NC tasks consolidated into 69 RP tasks

#### Artifact Summary
| Artifact | Count |
|---|---|
| Total tasks | 69 (44 binary + 25 qt_scaled) |
| SOP modules | 8 (7 owned MOD_STRP_* + 1 shared MOD_RRP_INT_CONTAINMENT) |
| Material systems | 7 (3 state-driven primers + 3 QT-driven finish + 1 optional poly topcoat) |
| Round configurations | 4 |
| Protection zones | 5 |
| Paintable items | 6 (dual UOM: EA + LF) |
| PaintScope inputs | 15 |
| Variants | 10 |
| Configuration dimensions | 7 |

#### Key Design Decisions
- **Consolidation:** Single RP spec replaces two NC specs because all stair components are already installed and painted in RP — painter assesses and works on entire stairway system in one visit
- **State-driven primer:** Replaces 8+ NC substrate-driven primers with 3 state-driven systems (adhesion, stain-block, mildew-resistant) plus no-primer path for sound paint
- **Canonical painting sequence:** Stringers -> risers -> balusters -> newels -> handrails -> base rails — enforced within every coat module
- **Dual UOM:** Risers/balusters/newels in EA, stringers/handrails/base rails in LF
- **QT3 minimum:** No QT2 — stairs are scrutinized, prominent surfaces
- **Baluster profile modifier:** Square=1.0x, turned=1.75x on baluster-specific tasks only (not spray finish)
- **Tread protection:** FIRST task, LAST removal, daily verification in occupied home context

#### QA Result
**pass_with_warnings** — 1 major issue found and fixed:
- task_count_summary in sop_modules.json was 68; actual count is 69 (corrected)

#### Pipeline Artifacts
- research.json — Doctrine-driven research with 18 relevant findings
- resolution.json — Pre-resolved registry values
- materials.json — 7 material systems with coverage profiles
- sop_modules.json — 8 modules, 69 tasks
- production.json — 69 task production rates with modifier stacking rules
- qa_report.json — QA validation (14 checks, 13 passed, 1 major fixed)
- spec.json — Assembled specification

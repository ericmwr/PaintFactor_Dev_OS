# CHANGELOG — SF_DRYWALL_WALL_NC_PRIME

## v0.1.0 — 2026-02-02

**Author:** SpecFactory pipeline
**Status:** draft
**Brief:** `specs/_backlog/SF_DRYWALL_WALL_NC_PRIME/brief.md`
**Sibling Reference:** `SF_DRYWALL_CEILING_NC_PRIME_v1`

### Summary

Initial draft of the New Construction Drywall Wall Prime spec. Generated through the full SpecFactory pipeline (researcher → materials → sop → estimation → critic → assembly) with two inline human corrections applied.

### Pipeline Artifacts

| Step | Agent | Output | Status |
|------|-------|--------|--------|
| 1 | Spec Researcher | research.json | Complete |
| 2 | Materials Manager | materials.json | Complete |
| 3 | SOP Librarian | sop_modules.json | Complete |
| 4 | Estimation Engineer | production.json | Complete |
| 5 | Critic | qa_report.json | Pass with warnings |
| 6 | Assembly | spec.json + CHANGELOG.md | Complete |

### Key Decisions

- **RC-005: Spray-only removed.** Spray-only is never valid for priming bare drywall. Backroll is always required for sealing. `application_method` reduced to `[roll, spray_backroll]`. Stakeholder directive (Eric) — declared as gospel doctrine.
- **Fixture removal uses per-room heuristic.** Average 6 outlets/switches per room (range 3-10). Driven by `PS_META.EA.ROOMS_TOTAL`. Individual fixture counting is impractical on job sites.
- **Fixture protection approach:** Outlet covers and switch plates are REMOVED (not masked). HVAC registers are removed and labeled. Light fixtures are loosened and masked. No reinstallation during prime phase — stays off until after finish paint.
- **Wall rates are 14-19% faster than ceiling equivalents** due to no overhead fatigue factor.

### Human Feedback Applied

| ID | Correction | Applied To |
|----|-----------|------------|
| HF-001 | Fixture protection: remove covers (don't mask), loosen/mask fixtures, no reinstall during prime | sop_modules.json, production.json |
| HF-002 | Spray-only is NEVER valid for drywall prime — backroll always required (RC-005) | All 4 artifacts |

### Research Corrections Inherited

- **RC-001:** No spot-priming NC drywall fasteners
- **RC-002:** PVA/acrylic primers are sealers, not stain blockers
- **RC-003:** Floor protection conditional on floor_type
- **RC-004:** No dry times in specs

### Research Corrections Added

- **RC-005:** Spray-only is never valid for priming bare drywall — backroll always required for sealing (pending doctrine codification)

### QA Warnings (non-blocking)

- **QA-001:** Brief still lists `spray` as application_method — needs update
- **QA-002:** RC-005 lacks formal doctrine_assignment target_doc
- **QA-003:** Fixture cover removal scoped to spray_backroll only — evaluate for roll method

### Brief Acceptance Criteria

All 10 criteria from brief Section 10 are met:

- [x] Quality tier drives inspection/repair intensity
- [x] Wall height modifiers (1.0 / 1.3 / 1.5 / 2.0)
- [x] Wall production rates distinct from ceiling (faster)
- [x] Floor protection: floor_perimeter for roll, floor_full for spray_backroll
- [x] Material system references PVA/drywall-specific primer
- [x] PaintScope key verification passes
- [x] RC-001 through RC-004 inherited and enforced
- [x] All 4 adjacency surfaces declared
- [x] Structure mirrors ceiling prime with wall-specific adjustments
- [x] Cross-spec deduplication note for inspection/repair with finish spec

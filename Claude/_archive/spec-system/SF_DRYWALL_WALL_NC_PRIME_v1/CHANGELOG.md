# CHANGELOG — SF_DRYWALL_WALL_NC_PRIME

## v1.0.0 — 2026-02-04

**Author:** SpecFactory Pipeline (Claude)
**Status:** draft (pending review)
**Brief:** `specs/_backlog/SF_DRYWALL_WALL_NC_PRIME/brief.md`

### Summary

Complete redo of the NC Drywall Wall Prime spec in the current format with all review corrections applied. Generated through the full SpecFactory pipeline with inline human review at research.json stage.

### Pipeline Artifacts

| Step | Agent | Output | Status |
|------|-------|--------|--------|
| 0 | Spec Researcher | brief.md | Complete (recreated) |
| 1 | Spec Researcher | research.json | Complete |
| 2 | Materials Manager | materials.json | Complete |
| 3 | SOP Librarian | sop_modules.json | Complete |
| 4 | Estimation Engineer | production.json | Complete |
| 5 | Critic | qa_report.json | PASS |
| 6 | Assembly | spec.json + CHANGELOG.md | Complete |

### Key Changes from v0.1.0

1. **No ceiling masking** — We do NOT mask drywall ceilings when working on walls. Cut in (roll method) or spray directly into the wall-to-ceiling corner (spray+backroll when ceiling is primed).

2. **Ceiling cut-in conditional** — Cut-in at ceiling line is only required for roll method. For spray+backroll when ceiling is already primed, no cut-in needed.

3. **Roller nap correction** — 1/2" nap for orange peel and knockdown textures. Do NOT use 3/4" nap for knockdown (3/4" only for stomp/popcorn or porous masonry).

4. **18-inch roller typical but not mandatory** — 9-inch roller is acceptable when obstacles prevent 18-inch use.

5. **Wall rates are independent** — Production rates are independently researched, not derived from ceiling rates.

6. **LF heuristic for fastener holes** — Standard approach for estimating fastener fill work.

### Human Feedback Applied

| ID | Correction | Applied To |
|----|-----------|------------|
| HF-001 | No ceiling masking for wall work | research.json, sop_modules.json, spec.json |
| HF-002 | Spray+backroll: no cut-in when ceiling is primed | research.json, sop_modules.json, production.json |
| HF-003 | Roller nap 1/2" for knockdown, not 3/4" | materials.json, sop_modules.json, production.json |
| HF-004 | 18" roller typical but 9" acceptable | research.json, materials.json, production.json |
| HF-005 | Wall rates independent (not derived from ceiling) | research.json |
| HF-006 | Use LF heuristic for fastener holes | research.json |

### Research Corrections Applied

- **RC-001:** No spot-priming NC drywall fasteners
- **RC-002:** PVA/acrylic primers are sealers, not stain blockers
- **RC-003:** Floor protection conditional on floor_type
- **RC-004:** No dry times in specs

### Critical Constraints

- **Spray-only prohibited:** Backroll is MANDATORY for primer on bare drywall
- **No ceiling masking:** Cut in or spray into corner, never mask drywall ceilings
- **Roller nap:** 1/2" for knockdown, 3/4" only for stomp/popcorn or porous masonry
- **Roller size flexibility:** 18" typical, 9" acceptable when needed

### Brief Acceptance Criteria

All 12 criteria from brief Section 10 are met:

- [x] quality_tier is config dimension driving inspection/repair intensity
- [x] application_method excludes spray-only (only roll and spray_backroll)
- [x] Wall height modifiers use Modifier_Registry values (H1=1.0, H2=1.30, H3=1.50, H4=2.00)
- [x] Floor protection zones correct: floor_perimeter for roll, floor_full for spray_backroll
- [x] Material system references PVA/drywall primer as SEALER (not stain blocker)
- [x] No spot-prime tasks for fasteners (per RC-001)
- [x] No dry times specified in materials (per RC-004)
- [x] Floor protection conditional on floor_type site condition (per RC-003)
- [x] Adjacency declares all four adjacent surfaces
- [x] State declarations: valid_input_states = SS_BARE, output_state = SS_PRIMED_FIELD
- [x] Cross-spec coordination note for inspection/repair deduplication
- [x] PaintScope key verification passes

---

## v0.1.0 — 2026-02-02

**Author:** SpecFactory pipeline
**Status:** superseded by v1.0.0

Initial draft of the New Construction Drywall Wall Prime spec. This version predated the current spec format and several key doctrine corrections.

**Superseded** — See v1.0.0 for current spec.

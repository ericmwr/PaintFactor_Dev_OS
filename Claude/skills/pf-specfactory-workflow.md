---
name: pf-specfactory-workflow
description: End-to-end SpecFactory pipeline: structure → research → materials → LEGO SOP → production → critic gate → artifacts.
---

# SpecFactory Workflow

When generating/revising a spec family, produce a complete artifact set.

## Required artifacts
Create folder: `specs/<family_id>/`
- `spec.json`
- `materials.json`
- `sop_modules.json`
- `production.json`
- `qa_report.json`
- `CHANGELOG.md`

## Pipeline steps
1) Structure:
   - Use product-architect input or explicit domain brief.
2) Research:
   - Call spec-researcher for structured findings + risks.
3) Materials:
   - Call materials-manager for systems + coverage + consumables + compatibility.
4) SOP:
   - Call sop-librarian to create LEGO modules/tasks/rounds using materials systems.
5) Production:
   - Call estimation-engineer for task rates + factors + quality effects.
6) QA:
   - Call critic for pass/fail. Iterate until pass or user stops.

## Rules
- Default status = draft + review_required = true
- Quality tiers expressed via rounds + systems; multipliers only where justified
- Doors counted per side when applicable
- Explicit uncertainty flags are mandatory

---
name: pf-output-packaging
description: Standardize how DevOS and SpecFactory outputs are packaged into repo artifacts with review gates and changelogs.
---

# Output Packaging Standard

## SpecFactory packages
For `/specs/<family_id>/`:
- `spec.json` (structure/variants/assumptions)
- `materials.json` (systems/coverage/consumables/compatibility)
- `sop_modules.json` (modules/tasks/rounds/applicability)
- `production.json` (rates/factors/quality effects)
- `qa_report.json` (critic status/issues)
- `CHANGELOG.md`

## DevOS packages
For `/devos/memory/`:
- `northstar.md`
- `standards.md`
- `schema-notes.md`
- `_workbench.md`
- `_compiled_output.md`

## Review gate defaults
- Everything is `draft` unless explicitly approved by the human.
- Outputs must list:
  - assumptions
  - exclusions
  - risks
  - uncertainties

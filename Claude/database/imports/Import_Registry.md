# Import Registry

**Last Updated:** 2026-02-09  
**Reference:** specs/_backlog/_catalog.md  
**Authority:** docs/System/DataFactory_Architecture.md

---

## How to Use

- **Import Orchestrator:** Read this file to determine what needs importing. Pick the first `not_imported` entry with a spec status of `generated` or higher.
- **Human:** Update status as imports progress. Add notes for failures.
- **"Import next spec"** → first `not_imported` entry below with eligible spec status.
- **"What's the import status?"** → summarize this file.

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `not_imported` | Spec exists but has never been imported to the database |
| `importing` | Import in progress (transient) |
| `imported` | Import + validation passed, awaiting human review |
| `approved` | Human reviewed and confirmed |
| `failed` | Import or validation failed (see Notes) |
| `outdated` | Newer spec version exists; re-import needed |

---

## Prerequisites for Import

A spec must meet ALL conditions:
1. All 5 artifact files present in `specs/<SF_ID>_v1/`
2. Spec status in backlog catalog ≥ `generated`
3. qa_report.json status is `pass` or `pass_with_warnings`
4. Schema validation passes (`python scripts/validate_specs.py`)
5. Database schema is current (no pending migrations)

---

## Registry

### Phase 1 — Core Coverage

| # | Spec Family ID | Spec Version | Spec Status | Import Status | Validation | Import Date | Notes |
|---|----------------|-------------|-------------|---------------|------------|-------------|-------|
| 1 | SF_DRYWALL_CEILING_NC_PRIME | 0.1.0 | generated | not_imported | — | — | |
| 2 | SF_DRYWALL_CEILING_NC_FINISH | 0.1.0 | generated | not_imported | — | — | |
| 3 | SF_DOOR_SLAB_INT_NC | — | in_progress | not_imported | — | — | Spec generation incomplete |
| 4 | SF_DOOR_FRAME_NC_FINISH | 1.0.0 | generated | not_imported | — | — | |
| 5 | SF_CLOSET_SHELF_NC | 0.1.0 | generated | not_imported | — | — | |
| 6 | SF_DRYWALL_WALL_NC_PRIME | 1.0.0 | generated | not_imported | — | — | Recommended pilot |
| 7 | SF_DRYWALL_WALL_NC_FINISH | 0.1.0 | generated | not_imported | — | — | |
| 8 | SF_TRIM_NC_PRIME | 0.1.0 | generated | not_imported | — | — | |
| 9 | SF_TRIM_NC_PAINT | 0.1.0 | generated | not_imported | — | — | |

### Phase 2 — Extended Coverage

| # | Spec Family ID | Spec Version | Spec Status | Import Status | Validation | Import Date | Notes |
|---|----------------|-------------|-------------|---------------|------------|-------------|-------|
| 10 | SF_WINDOW_INT_NC | 0.1.0 | generated | not_imported | — | — | |
| 11 | SF_STAIR_RISER_NC | 0.1.0 | generated | not_imported | — | — | |
| 12 | SF_STAIR_RAILING_NC | 0.1.0 | generated | not_imported | — | — | |

### Phase 3 — Custom/Architectural

| # | Spec Family ID | Spec Version | Spec Status | Import Status | Validation | Import Date | Notes |
|---|----------------|-------------|-------------|---------------|------------|-------------|-------|
| 13 | SF_WAINSCOT_PANEL_NC | 0.1.0 | generated | not_imported | — | — | |
| 14 | SF_WOOD_WALL_NC | 0.1.0 | generated | not_imported | — | — | |
| 15 | SF_WOOD_CEILING_NC | 0.1.0 | generated | not_imported | — | — | |

---

## Pilot Import Plan

**First import:** SF_DRYWALL_WALL_NC_PRIME (v1.0.0)
- Simplest geometry (SF-based walls)
- Prime-only (fewer material systems, fewer quality effects)
- Exercises all 5 artifact files
- Validates basic pipeline

**Second import:** SF_DOOR_FRAME_NC_FINISH (v1.0.0)
- Structurally different (EA-based, fine finish)
- Different protection zones
- Confirms schema universality

---

## Re-import Rules

1. When a spec is updated to a new version, mark existing import as `outdated`
2. Re-import deletes all normalized data for that spec_family_id (raw JSON preserved)
3. Re-import follows the same pipeline: Importer → Validator → Registry update
4. Import log retains history of all import attempts (success and failure)

---

## Relationship to Spec Backlog

This registry mirrors `specs/_backlog/_catalog.md` but tracks database import status, not spec generation status. A spec can be `generated` in the backlog but `not_imported` here. Both registries must be consulted to understand full system state.

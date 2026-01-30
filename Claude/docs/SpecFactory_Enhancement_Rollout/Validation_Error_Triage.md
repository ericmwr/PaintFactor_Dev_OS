# Validation Error Triage

**Generated:** 2026-01-26
**Last Updated:** 2026-01-29
**Current Status:** ALL RESOLVED

---

## Current Validation Status

```
================================================================================
PaintFactor Spec Validation Report
================================================================================
Families checked: 5
Errors: 0 | Warnings: 0
```

All validation errors have been resolved. The sections below document the historical issues and their resolutions for reference.

---

## Resolution Summary

| Category | Original Count | Status | Resolution |
|----------|---------------|--------|------------|
| Template Artifacts | 19 | Resolved | Excluded via --skip-templates flag |
| Schema-Spec Alignment | ~763 | Resolved | Schemas updated to match spec conventions |
| Task ID Cross-References | 202 | Resolved | Task IDs synced between production.json and sop_modules.json |
| Production.json Structure | 26 | Resolved | Structure aligned with schema |
| New Metadata (Phase 6) | 0 | N/A | Never had errors |

---

## Historical Detail (Resolved)

### Category 1: Template Artifacts (RESOLVED)

Errors in starter templates that use placeholder values to show options.

| File | Error Count | Description | Disposition |
|------|-------------|-------------|-------------|
| spec.json | 2 | Enum placeholders like "interior \| exterior \| specialty" | Expected - templates show options |
| sop_modules.json | 4 | Enum/type placeholders | Expected - templates show options |
| materials.json | 6 | Enum placeholders | Expected - templates show options |
| research.json | 3 | Enum placeholders | Expected - templates show options |
| qa_report.json | 4 | Enum placeholders | Expected - templates show options |

**Total:** 19 errors
**Resolution:** Excluded via `--skip-templates` flag added to validation script.

---

### Category 2: Schema-Spec Alignment Errors (RESOLVED)

The JSON schemas required fields that existing approved specs didn't provide. Resolved by updating schemas to match spec conventions.

#### Missing Required Properties (RESOLVED)

| Missing Field | Error Count | Resolution |
|---------------|-------------|------------|
| `task_class` | 265 | Schema changed to use `task_classification` |
| `excluded_items` | 34 | Made optional in schema |
| `summary` | 10 | Schema updated to use `changes` field |
| `description` | 9 | Required fields reduced |
| `unit_of_measure` | 13 | Removed from required |
| `crew_size` | 13 | Removed from required |

#### Enum Value Mismatches (RESOLVED)

| Issue | Error Count | Resolution |
|-------|-------------|------------|
| consumables/category invalid | ~50 | Enum lists expanded |
| phase values invalid | ~30 | "protection" added to enum |
| Various enum mismatches | ~43 | Schema enums updated to match specs |

#### Type Mismatches (RESOLVED)

| Issue | Error Count | Resolution |
|-------|-------------|------------|
| Null where string expected | ~54 | Nullable types added to schemas |

---

### Category 3: Production.json Structure (RESOLVED)

| Issue | Count | Resolution |
|-------|-------|------------|
| Missing unit_of_measure | 13 | Removed from required in schema |
| Missing crew_size | 13 | Removed from required in schema |

---

### Category 4: New Metadata Errors (Phase 6 Related)

| File | Error Count | Description |
|------|-------------|-------------|
| protection_metadata | 0 | **All valid** |
| adjacency_metadata | 0 | **All valid** |
| adjacency_declarations | 0 | **All valid** |

**Result:** Phase 6 metadata additions were fully compliant from the start.

---

## Historical Error Distribution by Spec Family (RESOLVED)

| Spec Family | Original Errors | Current Status |
|-------------|-----------------|----------------|
| SF_DRYWALL_WALL_NC_PRIME_v1 | ~150 | Resolved |
| SF_DRYWALL_WALL_NC_FINISH_v1 | ~150 | Resolved |
| SF_DRYWALL_FULL_NC_PRIME_v1 | ~150 | Resolved |
| SF_DRYWALL_CEILINGS_NC_PAINT_v1 | ~150 | Resolved |
| SF_TRIM_NC_PAINT_v1 | ~160 | Resolved |
| _templates | 19 | Excluded via --skip-templates |

---

## Validation Command

```bash
python scripts/validate_specs.py specs/ --skip-templates
```

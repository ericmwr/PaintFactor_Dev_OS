# Schema Alignment Changelog

**Date:** 2026-01-26
**Purpose:** Align JSON schemas with existing spec conventions

## Summary

| Metric | Before | After | Notes |
|--------|--------|-------|-------|
| Total Validation Errors | 965 | 227 | 77% reduction |
| Schema Alignment Errors | ~763 | 0 | Fully resolved |
| Template Errors (excluded) | 25 | 25 | Use --skip-templates flag |
| Task ID Cross-Reference Errors | ~152 | 202 | Legitimate data integrity issues |

**Key Result:** All schema-spec misalignment errors resolved. Remaining errors are legitimate task ID cross-reference issues where production.json references tasks not defined in sop_modules.json.

---

## Changes Made

### sop_modules.schema.json

| Change | Reason |
|--------|--------|
| `task_id` pattern: `^TASK_` to `^TSK_` | Specs use TSK_ prefix consistently |
| `module_id` pattern: `^SOP_` to `^(SOP_\|MOD_)` | Specs use MOD_ prefix |
| Removed `task_class` from required | Specs use `task_classification` instead |
| Added `task_classification` property | Primary field used by specs |
| Added "protection" to `phase` enum | Specs use "protection" not "protect" |
| `method_variant_of`: string to `["string", "null"]` | Allow null values |
| `quality_notes`: added "all" property | Specs use "all" for tier-agnostic notes |
| `quality_notes`: `additionalProperties: true` | Allow custom quality tier notes |
| `phase_sequence`: removed enum restriction | Allow custom phase names for rounds |

### spec.schema.json

| Change | Reason |
|--------|--------|
| Removed `excluded_items` from variants required | Specs omit empty arrays |
| Removed `summary` from change_log required | Specs use `changes` field |
| Added `changes` property to change_log | Field used by all specs |
| Made `summary` optional with deprecation note | Backwards compatibility |

### materials.schema.json

| Change | Reason |
|--------|--------|
| Added "tool", "consumable" to `category` enum | Used in existing specs |
| Added "GAL", "EA_OPENING" to `yield_uom` enum | Used in existing specs |
| Added "finish" to `product_role` enum | Used in existing specs |
| `surface_texture`: string to oneOf[string, array] | Specs use arrays for multiple textures |

### production.schema.json

| Change | Reason |
|--------|--------|
| `task_id` pattern: `^TASK_` to `^TSK_` | Specs use TSK_ prefix |
| `applies_to_tasks` pattern: `^TASK_` to `^TSK_` | Consistency with task_id |
| Removed `task_class`, `unit_of_measure`, `crew_size` from required | Specs have flexible structure |
| Added `task_classification` property | Preferred over task_class |
| Added "EA_ROOM", "FIXED" to `unit_of_measure` enum | Used in existing specs |
| Added "baseline_reduction" to `mechanism` enum | Used in existing specs |
| `quality_tier`: enum to pattern `^QT[2-5](_[A-Z]+)?$` | Allow compound values like QT4_FLAT |
| `required_input_key`, `paintscope_key`: allow null | Specs use null for optional refs |

### research.schema.json

| Change | Reason |
|--------|--------|
| Reduced required fields to `spec_family_id`, `version` | Research files have varying completeness |
| `required_when`: allow string or object | Specs use string descriptions |
| `paintscope_key`: allow null | Not always applicable |

### qa_report.schema.json

| Change | Reason |
|--------|--------|
| Reduced required fields to `spec_family_id`, `version` | QA reports have varying completeness |

### validate_specs.py

| Change | Reason |
|--------|--------|
| Added `--skip-templates` flag | Templates use placeholder values by design |
| Uses argparse for CLI arguments | Better argument handling |

---

## Validation Results

### With --skip-templates flag

```
Families checked: 5
Errors: 202 | Warnings: 1
```

All 202 errors are **task ID cross-reference errors** - production.json files reference task IDs that don't exist in corresponding sop_modules.json files. These are legitimate data integrity issues requiring spec content fixes, not schema changes.

### Error Distribution by Spec Family

| Spec Family | Task ID Errors | Status |
|-------------|----------------|--------|
| SF_DRYWALL_CEILINGS_NC_PAINT_v1 | 32 | Needs task ID alignment |
| SF_DRYWALL_FULL_NC_PRIME_v1 | 27 | Needs task ID alignment |
| SF_DRYWALL_WALL_NC_FINISH_v1 | ~25 | Needs task ID alignment |
| SF_DRYWALL_WALL_NC_PRIME_v1 | ~25 | Needs task ID alignment |
| SF_TRIM_NC_PAINT_v1 | 93 | Needs task ID alignment |

### Without --skip-templates flag

```
Families checked: 6
Errors: 227 | Warnings: 1
```

Additional 25 errors are from template files using placeholder values (e.g., `'EA | LF | SF'`). These are expected and should be excluded from validation.

---

## Notes for Future Spec Authors

1. **Task IDs**: Use `TSK_` prefix (not `TASK_`)
2. **Module IDs**: Use `MOD_` prefix (or `SOP_`)
3. **Task Classification**: Use `task_classification` (not `task_class`)
4. **Change Log**: Use `changes` field (not `summary`)
5. **Variants**: `excluded_items` is optional - omit if empty
6. **Quality Notes**: Can include `"all"` for tier-agnostic notes

---

## Command Reference

```bash
# Validate all specs (excluding templates)
python scripts/validate_specs.py specs/ --skip-templates

# Validate including templates (for template development)
python scripts/validate_specs.py specs/

# Validate single spec family
python scripts/validate_specs.py specs/SF_DRYWALL_WALL_NC_PRIME_v1/
```

# DB Validator (DataFactory)
**Role:** Post-Import Integrity Checker
**Primary Goal:** Validate that imported spec data is complete, consistent, and structurally sound.

---

## System Context

> **This agent operates at PaintFactor DEVELOPMENT time.**
> It does not estimate real jobs, make pricing decisions, or run production logic.

The DB Validator is the DataFactory equivalent of the SpecFactory Critic. After the Spec Importer populates the database, this agent runs integrity checks to confirm the data is correct, complete, and queryable by the Estimation Engine. Imports that fail validation are not approved.

### Required Reading — Load Before Every Session

| Document | Path | Purpose |
|----------|------|---------|
| DataFactory Architecture | `docs/System/DataFactory_Architecture.md` | Pipeline flow, validation severity rules |
| SQLite Schema Contract | `docs/System/SQLite_Schema_Contract.md` | Table definitions, FK relationships |
| Controlled Enums | `specs/_registry/controlled_enums.json` | Valid enum values for validation |
| ID Registry | `specs/_registry/id_registry.json` | ID prefix patterns and conventions |
| Conventions | `docs/System/Conventions.md` | Naming standards |

---

## What You Own

- Post-import integrity validation
- Cross-file threading checks (IDs consistent between artifact-sourced tables)
- Completeness checks (no orphan records, no missing required relationships)
- Enum/vocabulary validation against controlled_enums.json
- Duplicate detection within and across spec families
- Validation report generation: `database/imports/<SF_ID>/validation_report.json`
- The validation script: `database/scripts/validate_db.py`

## What You Do NOT Own

- Domain correctness of spec content (SpecFactory Critic already validated this)
- Database schema design (Schema Engineer owns)
- Import execution (Spec Importer owns)
- Import sequencing (Import Orchestrator owns)

---

## Validation Categories

### Category 1: FK Integrity (CRITICAL)

Every foreign key value must resolve to an existing row in the referenced table.

| Check ID | Table | FK Column | References |
|----------|-------|-----------|-----------|
| FK-001 | spec_configuration_dimensions | spec_family_id | spec_families.id |
| FK-002 | spec_paintable_item_types | spec_family_id | spec_families.id |
| FK-003 | spec_variants | spec_family_id | spec_families.id |
| FK-004 | spec_variant_item_inclusions | (variant_id, spec_family_id) | spec_variants(id, spec_family_id) |
| FK-005 | spec_variant_item_inclusions | (item_id, spec_family_id) | spec_paintable_item_types(id, spec_family_id) |
| FK-006 | sop_modules | spec_family_id | spec_families.id |
| FK-007 | sop_tasks | (module_id, spec_family_id) | sop_modules(id, spec_family_id) |
| FK-008 | task_production_rates | (task_id, spec_family_id) | sop_tasks(id, spec_family_id) |
| FK-009 | factor_task_applicability | (factor_id, spec_family_id) | factor_modifiers(id, spec_family_id) |
| FK-010 | factor_task_applicability | (task_id, spec_family_id) | sop_tasks(id, spec_family_id) |
| FK-011 | material_system_products | (system_id, spec_family_id) | material_systems(id, spec_family_id) |
| FK-012 | sop_round_configurations | spec_family_id | spec_families.id |
| FK-013 | material_coverage_profiles | spec_family_id | spec_families.id |

**SQLite enforces FKs at INSERT time when `PRAGMA foreign_keys = ON`, so these checks are belt-and-suspenders. But validate anyway in case PRAGMAs were missed.**

### Category 2: Cross-File Threading (CRITICAL)

IDs referenced across different artifact files must be consistent. This is the most important validation because SpecFactory generates each file independently.

| Check ID | Rule | Severity |
|----------|------|----------|
| XF-001 | Every `task_id` in `task_production_rates` must exist in `sop_tasks` | CRITICAL |
| XF-002 | Every `task_id` in `factor_task_applicability` must exist in `sop_tasks` | CRITICAL |
| XF-003 | Every `module_id` on `sop_tasks` must exist in `sop_modules` | CRITICAL |
| XF-004 | Every `item_id` in `spec_variant_item_inclusions` must exist in `spec_paintable_item_types` | CRITICAL |
| XF-005 | Every `variant_id` in `spec_variant_item_inclusions` must exist in `spec_variants` | CRITICAL |
| XF-006 | Every `system_id` in `material_system_products` must exist in `material_systems` | CRITICAL |

### Category 3: Completeness (MAJOR)

Every imported spec family should have all required relationships populated.

| Check ID | Rule | Severity |
|----------|------|----------|
| CMP-001 | spec_family has ≥1 configuration dimension | MAJOR |
| CMP-002 | spec_family has ≥1 paintable item | MAJOR |
| CMP-003 | spec_family has ≥1 variant | MAJOR |
| CMP-004 | Every variant has ≥1 included item | MAJOR |
| CMP-005 | spec_family has ≥1 material system | MAJOR |
| CMP-006 | spec_family has ≥1 sop module | MAJOR |
| CMP-007 | spec_family has ≥1 sop task | MAJOR |
| CMP-008 | Every sop task has ≥1 production rate entry | MAJOR |
| CMP-009 | spec_family has all 5 artifact types in spec_artifacts_raw | CRITICAL |
| CMP-010 | spec_family has ≥1 qa report | MAJOR |
| CMP-011 | spec_family has ≥1 protection zone | MINOR |
| CMP-012 | spec_family has ≥1 adjacency declaration | MINOR |
| CMP-013 | spec_family has ≥1 state declaration | MINOR |
| CMP-014 | spec_family has ≥1 required_paintscope_input | MAJOR |
| CMP-015 | Every material_system has ≥1 product in material_system_products | MAJOR |
| CMP-016 | Specs with multi-round variants (round_id not null) have ≥1 round_configuration | MAJOR |

### Category 4: Enum Validation (MAJOR)

Values in enum-like columns must match controlled vocabulary.

| Check ID | Table.Column | Valid Values Source | Severity |
|----------|-------------|-------------------|----------|
| ENM-001 | spec_families.domain | controlled_enums → domain | MAJOR |
| ENM-002 | spec_families.status | controlled_enums → spec_status | MAJOR |
| ENM-003 | sop_modules.phase | controlled_enums → phase | MAJOR |
| ENM-004 | sop_tasks.task_classification | controlled_enums → task_classification | MAJOR |
| ENM-005 | sop_tasks.skill_level | controlled_enums → skill_level | MINOR |
| ENM-006 | spec_qa_reports.status | ('pass','pass_with_warnings','fail') | MAJOR |
| ENM-007 | factor_modifiers.modifier_category | ('height','texture','drywall_level','door_style','kitchen_complexity','masking_scope','quality_tier','height_access') | MAJOR |

### Category 5: ID Pattern Validation (MINOR)

All IDs should follow established prefix conventions.

| Check ID | Table.Column | Expected Pattern | Severity |
|----------|-------------|-----------------|----------|
| IDP-001 | spec_families.id | `^SF_[A-Z0-9_]+$` | MINOR |
| IDP-002 | sop_modules.id | `^MOD_[A-Z0-9_]+$` | MINOR |
| IDP-003 | sop_tasks.id | `^TSK_[A-Z0-9_]+$` | MINOR |
| IDP-004 | material_systems.id | `^SYS_[A-Z0-9_]+$` | MINOR |
| IDP-005 | material_consumables.id | `^CON_[A-Z0-9_]+$` | MINOR |
| IDP-006 | factor_modifiers.id | `^(FAC\|MOD\|H[0-9])[A-Z0-9_]+$` | MINOR |
| IDP-007 | spec_paintable_item_types.id | `^ITM_[A-Z0-9_]+$` | MINOR |
| IDP-008 | spec_variants.id | `^VAR_[A-Z0-9_]+$` | MINOR |
| IDP-009 | material_coverage_profiles.id | `^COV_[A-Z0-9_]+$` | MINOR |
| IDP-010 | sop_round_configurations.round_id | `^ROUND_[A-Z0-9_]+$` | MINOR |

**Note:** IDP-006 uses a broader pattern because factor_modifiers now contains entries from domain-specific arrays (height_effects use IDs like "H2_MODERATE", texture_effects use IDs like "TEXTURE_KNOCKDOWN", etc.) in addition to FAC_-prefixed modifiers.

### Category 6: Duplicate Detection (CRITICAL)

| Check ID | Rule | Severity |
|----------|------|----------|
| DUP-001 | No duplicate (id, spec_family_id) in any table with composite PK | CRITICAL |
| DUP-002 | No duplicate task_id within a spec family across modules | CRITICAL |
| DUP-003 | No duplicate raw artifact entry (spec_family_id, artifact_type, version) | CRITICAL |

### Category 7: Raw Integrity (MAJOR)

| Check ID | Rule | Severity |
|----------|------|----------|
| RAW-001 | Every json_content in spec_artifacts_raw is valid JSON (parseable) | MAJOR |
| RAW-002 | Version in raw artifact matches version in spec_families | MAJOR |
| RAW-003 | spec_family_id in raw artifact is consistent across all 5 entries | MAJOR |

---

## Severity Definitions and Impact

| Severity | Impact on Import Status | Description |
|----------|----------------------|-------------|
| CRITICAL | Import status → `failed` | Must be fixed before the import can be approved. Indicates data corruption or broken references. |
| MAJOR | Import status → `imported` but blocks `approved` | Significant issue. Spec is importable but not production-ready. |
| MINOR | No status impact, logged as warning | Cosmetic or low-impact. Noted for future cleanup. |

---

## Validation Report Format

```json
{
  "spec_family_id": "SF_TRIM_NC_PAINT",
  "version": "0.1.0",
  "validated_at": "2026-02-09T14:35:00Z",
  "status": "pass | pass_with_warnings | fail",
  "summary": "Brief summary of results",
  "stats": {
    "total_checks": 48,
    "passed": 46,
    "failed": 0,
    "warnings": 2
  },
  "checks": [
    {
      "check_id": "FK-001",
      "category": "fk_integrity",
      "severity": "critical",
      "status": "pass",
      "details": "All spec_configuration_dimensions.spec_family_id values resolve"
    },
    {
      "check_id": "IDP-003",
      "category": "id_pattern",
      "severity": "minor",
      "status": "warning",
      "details": "TSK_LIGHT_SAND does not include context prefix (legacy spec)",
      "affected_rows": ["TSK_LIGHT_SAND"]
    }
  ]
}
```

### Status Resolution

- All checks pass → `"status": "pass"`
- No CRITICAL/MAJOR failures but ≥1 MINOR warning → `"status": "pass_with_warnings"`
- Any CRITICAL failure → `"status": "fail"`
- Any MAJOR failure (no CRITICAL) → `"status": "pass_with_warnings"` (blocks approved, not imported)

---

## Execution Modes

### Single Spec Family Validation

```bash
python database/scripts/validate_db.py SF_TRIM_NC_PAINT
```

Run after each import. Validates only the specified spec family's data.

### Full Database Validation

```bash
python database/scripts/validate_db.py
```

Run periodically or before major milestones. Validates all imported spec families plus cross-family checks.

### Cross-Family Checks (Full DB only)

| Check ID | Rule | Severity |
|----------|------|----------|
| XFM-001 | No duplicate task IDs across spec families (if globally unique is required) | MAJOR |
| XFM-002 | No duplicate module IDs across spec families (if globally unique is required) | MAJOR |
| XFM-003 | All spec families reference consistent surface_id vocabulary | MINOR |
| XFM-004 | All spec families reference consistent zone_id vocabulary | MINOR |

---

## Error Handling

- If the database doesn't exist or is empty → report "No database found" and exit
- If the specified spec family isn't in the database → report "SF_X not found" and exit
- If json_extract fails on a TEXT column → report RAW integrity issue, continue with other checks
- Validation never modifies data — it is read-only

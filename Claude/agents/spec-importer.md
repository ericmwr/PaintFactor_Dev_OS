# Spec Importer (DataFactory)
**Role:** Artifact-to-Database Import Engine
**Primary Goal:** Read spec family artifact files and decompose them into normalized SQLite INSERT statements.

---

## System Context

> **This agent operates at PaintFactor DEVELOPMENT time.**
> It does not estimate real jobs, make pricing decisions, or run production logic.

The Spec Importer is the workhorse of DataFactory. It reads completed spec artifacts (JSON files produced by SpecFactory), translates them into SQL INSERT statements per the SQLite Schema Contract, and executes them within a single transaction. It stores raw JSON first as a safety net, then normalizes into relational tables.

### Required Reading — Load Before Every Session

| Document | Path | Purpose |
|----------|------|---------|
| SQLite Schema Contract | `docs/System/SQLite_Schema_Contract.md` | **Primary doctrine.** Column-by-column mapping from JSON to tables |
| DataFactory Architecture | `docs/System/DataFactory_Architecture.md` | Pipeline flow, transaction model, error handling |
| Structural Keys | `specs/_registry/structural_keys.json` | Canonical key names for all artifact types |
| Conventions | `docs/System/Conventions.md` | ID prefixes, naming standards |

### JSON Schema References

Understand exact artifact structure before importing:
- `specs/_schemas/spec.schema.json`
- `specs/_schemas/materials.schema.json`
- `specs/_schemas/sop_modules.schema.json`
- `specs/_schemas/production.schema.json`
- `specs/_schemas/qa_report.schema.json`

---

## What You Own

- Reading spec family artifact files (read-only — NEVER modify specs)
- JSON → relational decomposition per SQLite Schema Contract
- Raw JSON storage in `spec_artifacts_raw`
- Transaction management (all-or-nothing per spec family)
- INSERT statement generation and execution
- Import report generation (`database/imports/<SF_ID>/import_report.json`)
- The import script: `database/scripts/import_spec.py`

## What You Do NOT Own

- Database schema design (Schema Engineer owns)
- Post-import validation (DB Validator owns)
- Import sequencing and registry management (Import Orchestrator owns)
- Spec content correctness (SpecFactory Critic already validated this)

---

## Critical Rules

### Rule 1: Raw First, Normalize Second

ALWAYS store all 5 raw JSON files in `spec_artifacts_raw` BEFORE inserting into normalized tables. This ensures the original data is preserved regardless of what happens during normalization.

### Rule 2: Single Transaction Per Spec Family

Wrap the entire import (raw + normalized) in one transaction. If ANY insert fails, ROLLBACK everything. Partial imports do not exist.

```python
conn.execute("BEGIN TRANSACTION")
try:
    # Insert raw JSON (5 rows)
    # Insert into spec_families (1 row)
    # Insert into all child tables
    conn.execute("COMMIT")
except Exception:
    conn.execute("ROLLBACK")
    raise
```

### Rule 3: Never Modify Spec Artifacts

Read-only access to `specs/<SF_ID>_v1/`. The Spec Importer consumes artifacts, never writes to them. If an artifact has a problem, report it and abort — fixing is SpecFactory's job.

### Rule 4: All 5 Files Required

If ANY of the 5 required artifact files is missing, abort the import entirely. Do not attempt partial imports.

Required files:
1. `spec.json`
2. `materials.json`
3. `sop_modules.json`
4. `production.json`
5. `qa_report.json`

### Rule 5: Idempotent Re-import

When re-importing, delete all existing data for the spec_family_id first (except raw artifacts, which are preserved with old version tags). Then import fresh.

---

## Import Workflow

### Step 1: Load Artifacts

```python
spec_path = "specs/SF_TRIM_NC_PAINT_v1/"
spec      = load_json(spec_path + "spec.json")
materials = load_json(spec_path + "materials.json")
sop       = load_json(spec_path + "sop_modules.json")
production= load_json(spec_path + "production.json")
qa        = load_json(spec_path + "qa_report.json")
```

### Step 2: Extract Spec Family ID and Version

```python
sf_id   = spec["spec_family"]["id"]       # e.g., "SF_TRIM_NC_PAINT"
version = spec["spec_family"]["version"]   # e.g., "0.1.0"
```

### Step 3: Store Raw JSON

Insert 5 rows into `spec_artifacts_raw`:

| artifact_type | json_content |
|--------------|-------------|
| spec | (full spec.json as string) |
| materials | (full materials.json as string) |
| sop_modules | (full sop_modules.json as string) |
| production | (full production.json as string) |
| qa_report | (full qa_report.json as string) |

### Step 4: Normalize spec.json

| Source Path | Target Table | Notes |
|------------|-------------|-------|
| spec_family | spec_families | 1 row. Include `context` field if present. |
| configuration_dimensions[] | spec_configuration_dimensions | 1 row per dimension. Include `prohibited` if present. |
| paintable_items[] | spec_paintable_item_types | 1 row per item. Include `conditional`/`conditional_on` if present. Include `surface_ref` if present (TEXT). |
| variants[] | spec_variants | 1 row per variant. See **coat count dual-pattern** and **item inclusion tri-pattern** below. |
| (variant item inclusions) | spec_variant_item_inclusions | See **item inclusion tri-pattern** below. |
| scope_boundaries.includes[] | spec_scope_boundaries | boundary_type='include' |
| scope_boundaries.excludes[] | spec_scope_boundaries | boundary_type='exclude', extract route_to |
| required_paintscope_inputs[] | spec_required_inputs | 1 row per input. Map `required` → `is_required`. Include `status` if present. |
| protection_zones_required[] | spec_protection_zones | 1 row per zone. See **protection zone field mapping** below. |
| adjacency_declarations | spec_adjacency_declarations | See **adjacency shape handling** below. |
| state_declarations OR substrate_state_rules | spec_state_declarations | See **state declaration dual-key** below. |
| change_log[] | spec_change_log | 1 row per change entry |

**Adjacency shape handling:** `adjacency_declarations` can be a single object (one primary_surface) or an array of objects (multiple primary_surfaces). Before iterating, check type: if single object, wrap in `[obj]`. Then for each object, iterate `adjacent_surfaces[]` to produce one row per adjacent surface, carrying `primary_surface` from the parent.

#### Structural Variation Handling (Interior vs Exterior)

Interior and exterior specs use different JSON key names and shapes for several concepts. The importer MUST check for all variants. When updating `import_spec.py`, use fallback chains (try key A, then key B) so both domains work with the same code.

**Coat count dual-pattern (variants):**
- Interior pattern: `var["coats_primer"]` and `var["coats_finish"]` (flat integers)
- Exterior pattern: `var["coats"]["prime"]` and `var["coats"]["finish"]` (nested object)
- Resolution: `coats_primer = var.get("coats_primer") or var.get("coats", {}).get("prime")`
- Same for `coats_finish`: `var.get("coats_finish") or var.get("coats", {}).get("finish")`

**Item inclusion tri-pattern (variants):**
- Interior pattern A: `var["included_items"]` (list) → is_included=1; `var["excluded_items"]` (list) → is_included=0
- Interior pattern B: (no item keys) — skip
- Exterior pattern: `var["active_items"]` (list) → is_included=1; no excluded list
- Resolution: Check `included_items` first, then fall back to `active_items`. Check `excluded_items` independently.
```python
included = var.get("included_items") or var.get("active_items", [])
excluded = var.get("excluded_items", [])
```

**State declaration dual-key:**
- Interior key: `spec.get("state_declarations")`
- Exterior key: `spec.get("substrate_state_rules")`
- Resolution: `state_data = spec.get("state_declarations") or spec.get("substrate_state_rules")`
- Both produce 1 row in `spec_state_declarations`. Store `valid_input_states` as full JSON object. If `primer_routing` sub-object exists, store as `primer_routing` TEXT (JSON) column.

**Protection zone field mapping:**
- Interior: `upgrades_to_zone`, `upgrades_to_level`, `upgrade_condition`
- Exterior: `upgrade_level` (maps to `upgrades_to_level`), `upgrade_when` (maps to `upgrade_condition`)
- Resolution:
```python
upgrades_to_level = z.get("upgrades_to_level") or z.get("upgrade_level")
upgrade_condition = z.get("upgrade_condition") or z.get("upgrade_when")
# upgrade_condition may be a JSON object — store as json.dumps() if dict
```

**Round configurations dual-location:**
- Interior: `round_configurations` in `sop_modules.json`
- Exterior: `round_configurations` may be in `spec.json` instead of (or in addition to) `sop_modules.json`
- Resolution: Check `sop_modules.json` first. If not found, check `spec.json`. If found in both, prefer `sop_modules.json` (canonical source). Deduplicate by `round_id`.

### Step 5: Normalize materials.json

| Source Path | Target Table | Notes |
|------------|-------------|-------|
| material_systems[] | material_systems | 1 row per system. Include `allowed_sheens`, `product_role`, `quality_tier` if present. |
| material_systems[].products[] OR .primer/.finish | material_system_products | See tri-pattern note below |
| coverage_profiles[] | material_coverage_profiles | 1 row per profile. Map `profile_id` → id column. Include `waste_factor`, `uom_basis` if present. |
| consumables[] | material_consumables | 1 row per consumable. Map `category` → `consumable_category` column. |

**Material system products tri-pattern:** Three structures exist:
- **Drywall pattern:** `material_systems[].products[]` — iterate the array, each entry becomes a row
- **Cabinet pattern:** `material_systems[].primer` / `.finish` — treat each role-keyed object as a separate row, derive `product_role` from the key name ("primer"/"finish"). Map `.type` → `product_type`, `.products` → `example_products`, `.coats` → `coats_required`, `.coverage_sf_per_gallon` → `coverage_sf_per_gallon`, `.coverage_range[0]` → `coverage_range_low`, `.coverage_range[1]` → `coverage_range_high`.
- **Exterior flat pattern:** No `products[]` array, no `primer`/`finish` sub-objects. System-level fields contain the product data directly: `product_role` (TEXT), `coverage_sf_per_gallon` (REAL), `coverage_range` (array), `coats` (INTEGER). Create a single `material_system_products` row from the system-level fields. Map `system.product_role` → `product_role`, `system.coats` → `coats_required`, `system.coverage_sf_per_gallon` → `coverage_sf_per_gallon`, `system.coverage_range[0]` → `coverage_range_low`, `system.coverage_range[1]` → `coverage_range_high`.

Check which pattern exists: if `products` key is a list, use Drywall pattern. If `primer` or `finish` keys exist as objects, use Cabinet pattern. If neither exists but `product_role` is a string on the system, use Exterior flat pattern.

**Material systems — exterior fields:** Exterior specs may include these additional fields on material_systems entries:
- `product_role` TEXT — "primer", "finish", etc. Store in `material_systems.product_role` column.
- `quality_tier` — array or string. Store as JSON in `applies_when` if not already present there.
- `substrate_states` — array of SS_ values. Store as JSON in `applies_when`.

**Coverage profiles — exterior patterns:** Exterior coverage_profiles may use different nesting:
- `coverage_by_state` (object keyed by SS_EXT_* values) — store as JSON TEXT in `coverage_by_item` column
- `coverage_by_system` (object keyed by SYS_EXT_* values) — store as JSON TEXT in `coverage_by_item` column
- `waste_factor` (REAL) — store in `waste_factor` column
- `uom_basis` (TEXT, e.g., "LF") — store in `uom_basis` column
- `surface_condition_modifier` (object) — store as JSON TEXT in `coverage_by_item` or `notes`

**Note:** `consumable_notes`, `protection_materials`, `compatibility_rules`, `risk_notes`, `uncertainty_flags`, `material_quantity_notes`, `assumptions` (if present at top level) are NOT imported — preserved in `spec_artifacts_raw` only.

### Step 6: Normalize sop_modules.json

| Source Path | Target Table | Notes |
|------------|-------------|-------|
| round_configurations[] | sop_round_configurations | 1 row per config (if present). Store `phase_sequence` as JSON array. Also check spec.json if not found here. |
| sop_modules[] | sop_modules | 1 row per module, sort_order from array index |
| sop_modules[].tasks[] | sop_tasks | 1 row per task, module_id from parent, sort_order from array index. Include `qt_behavior` if present. See **exterior task fields** below. |

**Exterior task fields:** Exterior sop_tasks may contain additional fields not present in interior specs:
- `substrate_state_rules` — array of objects with `state_id`, `action` (required/excluded), `primer_system`. Store as JSON TEXT in `substrate_state_rules` column.
- `site_condition_rules` — object with `exclude_when` conditions (wind, dew_point, temperature). Store as JSON TEXT in `site_condition_rules` column.
- `manual_capture_required` — object with capture instructions. Store as JSON TEXT in `notes` or dedicated column if present.

### Step 7: Normalize production.json

| Source Path | Target Table | Notes |
|------------|-------------|-------|
| task_production_rates[] | task_production_rates | 1 row per task rate. See rate mapping below. |
| Domain modifier arrays | factor_modifiers | See factor modifier mapping below. |
| factor_modifiers[].applies_to_tasks[] | factor_task_applicability | 1 row per factor→task pair (only when explicit task linkage exists) |
| quality_tier_effects[] | quality_tier_effects | 1 row per tier effect |

**Rate mapping:** Tasks use different rate patterns:
- Binary tasks: `rate_per_hour` (flat REAL), `rate_range_low`, `rate_range_high`
- Qt_scaled tasks: `rates_by_tier` (JSON object)
- FIXED_TIME tasks: `fixed_minutes` (single value), `fixed_minutes_range_low`, `fixed_minutes_range_high`
- Per-tier fixed time: `fixed_time_minutes_by_tier` → `fixed_minutes_by_tier` column (JSON object)

Map `rate_basis_notes` → `notes` column.

**Factor modifier mapping:** Production.json stores modifiers in domain-specific arrays. Map each into the unified `factor_modifiers` table with a `modifier_category` discriminator:

| Source Array | modifier_category value |
|-------------|------------------------|
| `height_effects[]` | "height" |
| `texture_effects[]` | "texture" |
| `drywall_level_effects[]` | "drywall_level" |
| `factor_modifiers[]` (cabinet-style unified) | Derive from modifier type (e.g., "door_style", "kitchen_complexity", "masking_scope") |
| `access_effects[]` or access entries in `factor_modifiers[]` | "access" |
| `profile_effects[]` or profile entries in `factor_modifiers[]` | "profile_complexity" |
| `coating_type_effects[]` | "coating_type" |
| `coating_system_effects[]` | "coating_system" |
| `substrate_type_effects[]` | "substrate_type" |

For each modifier entry, map `modifier_id` or `factor_id` → `id` column. Map `time_modifier` → `time_modifier` column. If the source entry has `applies_to_tasks[]` OR `applies_to[]`, explode into `factor_task_applicability` rows. If no explicit task linkage exists (e.g., height_effects), skip the junction table — the Estimation Engine resolves these at runtime.

**Factor modifier — applies_to dual-key:**
- Interior: `entry["applies_to_tasks"]`
- Exterior: `entry["applies_to"]`
- Resolution: `tasks = entry.get("applies_to_tasks") or entry.get("applies_to", [])`

**Factor modifier — values map pattern (exterior):**
Exterior factor_modifiers may use a `values` object instead of a single `time_modifier`:
```json
"values": { "ground": 1.00, "ladder": 1.35, "scaffold": 1.60, "lift": 1.50 }
```
When `values` is present as a dict, store it as JSON TEXT in the `values_map` column. The `time_modifier` column should be NULL in this case (multiple values, no single modifier).

**Note:** `crew_configurations`, `coupling_constraints`, `critical_constraints`, `modifier_stacking_examples`, `validation_plan`, `risks`, `assumptions`, and input_group header objects (if present at top level) are NOT imported — preserved in `spec_artifacts_raw` only.

### Step 8: Normalize qa_report.json

| Source Path | Target Table | Notes |
|------------|-------------|-------|
| (root) | spec_qa_reports | 1 row. Map `review_status` → `status` (normalize case: "PASS"→"pass"). Store entire qa_report as `full_report` JSON blob. Extract `recommendation` or `notes` → `summary`. |

**Field mapping from actual QA report root:**
- `spec_family_id` → spec_family_id
- `version` → version
- `critic_agent` or `generated_by` → reviewed_by
- `review_date` or `generated_at` → review_date
- `overall_result` (preferred) or `review_status` (fallback) → status (normalize case: "PASS"→"pass")
- `recommendation` or `notes` or `summary` → summary
- Entire JSON → full_report

---

## JSON-to-Column Mapping Details

### Flattened Values (direct column mapping)

Values extracted from JSON and stored in their own typed columns:
- All `id` / `*_id` fields → TEXT
- `name`, `description`, `context` → TEXT
- `unit_of_measure`, `phase`, `status`, `domain`, `modifier_category` → TEXT (enum-like)
- `rate_per_hour`, `coverage_sf_per_gallon`, `time_modifier`, `value`, `value_min`, `value_max` → REAL
- `fixed_minutes`, `fixed_minutes_range_low`, `fixed_minutes_range_high` → REAL
- `rate_range_low`, `rate_range_high`, `coverage_range_low`, `coverage_range_high` → REAL
- `yield_per_unit`, `continuity_rate_modifier` → REAL
- `crew_size`, `sort_order`, `coats_primer`, `coats_finish`, `coats_required` → INTEGER
- `review_required`, `is_required`, `is_included`, `conditional` → INTEGER (0/1)
- `version`, `date`, `author` → TEXT
- `surface_ref` → TEXT (exterior paintable items — PaintScope surface reference)
- `product_role` → TEXT (exterior material_systems — "primer"/"finish")
- `waste_factor` → REAL (exterior coverage profiles)
- `uom_basis` → TEXT (exterior coverage profiles — "LF", "SF", etc.)

### JSON TEXT Storage (complex objects stored as strings)

Values stored as JSON strings in TEXT columns, queryable via `json_extract()`:
- `applies_when` → store as `json.dumps(obj)`
- `allowed_values` → store as `json.dumps(arr)`
- `prohibited` → store as `json.dumps(arr)`
- `conditional_on` → store as `json.dumps(obj)`
- `protection_zones` (on variants) → store as `json.dumps(arr)`
- `tools_required` → store as `json.dumps(arr)`
- `appears_in_tiers` → store as `json.dumps(arr)`
- `quality_notes` → store as `json.dumps(obj)`
- `protection_metadata` → store as `json.dumps(obj)`
- `adjacency_metadata` → store as `json.dumps(obj)`
- `rates_by_tier` → store as `json.dumps(obj)`
- `effect_details` → store as `json.dumps(obj)`
- `full_report` → store as `json.dumps(entire_qa_json)`
- `affected_tasks` → store as `json.dumps(arr)`
- `valid_input_states` → store as `json.dumps(obj)` (object with states array + notes)
- `output_state_map` → store as `json.dumps(obj)`
- `required_when` → store as `json.dumps(obj)`
- `condition` (factor_modifiers, protection zones) → store as `json.dumps(obj)` if object, else as string
- `example_products` → store as `json.dumps(arr)`
- `phase_sequence` → store as `json.dumps(arr)`
- `surface_texture` → store as `json.dumps(arr)` if array, else as string
- `drywall_finish_level` → store as `json.dumps(arr)`
- `substrate_state_rules` (on sop_tasks) → store as `json.dumps(arr)` — exterior task-level state routing
- `site_condition_rules` (on sop_tasks) → store as `json.dumps(obj)` — exterior weather/condition gating
- `primer_routing` (on state_declarations) → store as `json.dumps(obj)` — exterior per-substrate primer routing
- `values_map` (on factor_modifiers) → store as `json.dumps(obj)` — exterior multi-value modifier maps
- `defect_tolerance` (on task_production_rates) → store as `json.dumps(obj)` — exterior per-tier QC criteria
- `coverage_by_state` / `coverage_by_system` (on coverage_profiles) → store as `json.dumps(obj)` in `coverage_by_item`

### Array Explosion (arrays become junction table rows)

Arrays that become their own rows in junction/child tables:
- `variants[].included_items[]` → 1 row each in `spec_variant_item_inclusions`
- `variants[].excluded_items[]` → 1 row each in `spec_variant_item_inclusions`
- `factor_modifiers[].applies_to_tasks[]` → 1 row each in `factor_task_applicability` (only when explicit)
- `adjacency_declarations[].adjacent_surfaces[]` → 1 row each in `spec_adjacency_declarations`
- `scope_boundaries.includes[]` → 1 row each in `spec_scope_boundaries`
- `scope_boundaries.excludes[]` → 1 row each in `spec_scope_boundaries`
- `material_systems[].products[]` → 1 row each in `material_system_products`

---

## Import Report Format

After successful import, generate:

```json
{
  "spec_family_id": "SF_TRIM_NC_PAINT",
  "version": "0.1.0",
  "imported_at": "2026-02-09T14:30:00Z",
  "status": "success",
  "rows_inserted": {
    "spec_artifacts_raw": 5,
    "spec_families": 1,
    "spec_configuration_dimensions": 3,
    "spec_paintable_item_types": 4,
    "spec_variants": 6,
    "spec_variant_item_inclusions": 18,
    "spec_scope_boundaries": 8,
    "spec_required_inputs": 5,
    "spec_protection_zones": 3,
    "spec_adjacency_declarations": 4,
    "spec_state_declarations": 1,
    "spec_change_log": 2,
    "material_systems": 4,
    "material_system_products": 8,
    "material_coverage_profiles": 3,
    "material_consumables": 8,
    "sop_round_configurations": 1,
    "sop_modules": 7,
    "sop_tasks": 25,
    "task_production_rates": 25,
    "factor_modifiers": 5,
    "factor_task_applicability": 20,
    "quality_tier_effects": 4,
    "spec_qa_reports": 1
  },
  "total_rows": 156,
  "warnings": [],
  "duration_seconds": 0.5
}
```

---

## Raw-Only Sections (Not Imported to Normalized Tables)

These sections appear in spec artifacts but are preserved ONLY in `spec_artifacts_raw`. Do not create tables or columns for them:

**spec.json:** `cross_spec_boundaries`, `site_condition_rules` (spec-level — distinct from task-level), `production_summary`, `sop_module_summary`, `qa_summary`, `doctrine_references`, `research_corrections`, `sequencing_notes`, `relationships`, `material_systems` (duplicate of materials.json — use materials.json as canonical source)

**materials.json:** `consumable_notes`, `protection_materials`, `compatibility_rules`, `risk_notes`, `uncertainty_flags`, `material_quantity_notes`, `assumptions`

**production.json:** `crew_configurations`, `coupling_constraints`, `critical_constraints`, `modifier_stacking_examples`, `validation_plan`, `risks`, `assumptions`, input_group header objects (e.g., `trim_surface_input_group`)

**sop_modules.json:** (none — all sections are imported)

**qa_report.json:** `exterior_validation_summary` (captured in `full_report` blob)

---

## Error Handling

| Error Type | Action |
|-----------|--------|
| Missing artifact file | Abort entirely. Report which file(s) missing. |
| JSON parse error | Abort entirely. Report file and error details. |
| Missing required field in JSON | Abort entirely. Report field path. |
| FK violation during INSERT | ROLLBACK. Report which table, which FK, which value. |
| UNIQUE constraint violation | ROLLBACK. Report duplicate ID details. |
| Unknown/unexpected JSON structure | Log warning, skip the field, continue if non-critical. |

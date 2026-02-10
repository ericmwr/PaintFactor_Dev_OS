# SQLite Schema Contract

**Status:** DRAFT
**Version:** 1.1.0
**Last Updated:** 2026-02-10
**Doctrine Level:** 1 (System)
**Authority:** DataFactory_Architecture.md, PaintFactor_OS.md
**Derived From:** Spec → Database Mapping Guide (`specs/_templates/Spec → Database Mapping Guide.md`)

---

## 1. Purpose

This document is the binding contract between spec artifact JSON structure and SQLite table design. It defines every table, column, type, constraint, and the exact JSON path that populates each column.

The Schema Engineer uses this document to produce `create_tables.sql`. The Spec Importer uses it to produce INSERT statements. The DB Validator uses it to verify integrity. All three agents must agree on this contract.

---

## 2. SQLite Type Conventions

| Concept | SQLite Type | Notes |
|---------|-------------|-------|
| String | TEXT | All strings, including IDs |
| Integer | INTEGER | Includes booleans (0/1) and auto-increment PKs |
| Decimal | REAL | Production rates, modifiers, coverage values |
| JSON blob | TEXT | Stored as JSON string, queryable via json_extract() |
| Date | TEXT | ISO 8601 format: "2026-02-09" |
| Datetime | TEXT | ISO 8601 format: "2026-02-09T14:30:00Z" |
| Boolean | INTEGER | 0 = false, 1 = true |
| Auto PK | INTEGER PRIMARY KEY AUTOINCREMENT | For junction/child tables without natural keys |

### Required PRAGMAs

Every connection to the database must execute:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

---

## 3. Table Definitions

### Table Group 1: Spec Structure (from spec.json)

---

#### `spec_families`

**Source:** `spec.json → spec_family`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | PRIMARY KEY | spec_family.id | e.g., "SF_TRIM_NC_PAINT" |
| name | TEXT | NOT NULL | spec_family.name | |
| description | TEXT | | spec_family.description | |
| context | TEXT | | spec_family.context | e.g., "NC" for new construction, "REPAINT" |
| domain | TEXT | NOT NULL, CHECK(domain IN ('interior','exterior','specialty')) | spec_family.domain | |
| version | TEXT | NOT NULL | spec_family.version | Semver: "0.1.0" |
| status | TEXT | NOT NULL, CHECK(status IN ('draft','review_required','approved','deprecated')) | spec_family.status | |
| review_required | INTEGER | NOT NULL DEFAULT 1 | spec_family.review_required | 0/1 |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | — | Auto-generated |
| updated_at | TEXT | NOT NULL DEFAULT (datetime('now')) | — | Auto-generated |
| created_by | TEXT | | — | "SpecFactory" or agent name |
| reviewed_by | TEXT | | — | Human reviewer name |

---

#### `spec_configuration_dimensions`

**Source:** `spec.json → configuration_dimensions[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Surrogate PK |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| dimension_id | TEXT | NOT NULL | configuration_dimensions[].dimension_id | e.g., "quality_tier" |
| description | TEXT | | configuration_dimensions[].description | |
| allowed_values | TEXT | NOT NULL | configuration_dimensions[].values | JSON array: '["QT2","QT3","QT4","QT5"]' |
| default_value | TEXT | | configuration_dimensions[].default | |
| prohibited | TEXT | | configuration_dimensions[].prohibited | JSON array of prohibited values, e.g., '["QT5"]' |
| notes | TEXT | | configuration_dimensions[].notes | |
| sort_order | INTEGER | | — | Derived from array index |

**Unique constraint:** (spec_family_id, dimension_id)

---

#### `spec_paintable_item_types`

**Source:** `spec.json → paintable_items[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | NOT NULL | paintable_items[].item_id | e.g., "ITM_TRIM_RUN" |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| name | TEXT | NOT NULL | paintable_items[].name | |
| unit_of_measure | TEXT | NOT NULL | paintable_items[].unit_of_measure | SF/LF/EA |
| counting_rules | TEXT | | paintable_items[].counting_rules | |
| conditional | INTEGER | | paintable_items[].conditional | 0/1 — whether item is conditionally included |
| conditional_on | TEXT | | paintable_items[].conditional_on or .condition | JSON object specifying inclusion conditions |
| notes | TEXT | | paintable_items[].notes | |

**Primary key:** (id, spec_family_id) — items can appear in multiple spec families

---

#### `spec_variants`

**Source:** `spec.json → variants[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | NOT NULL | variants[].variant_id | e.g., "VAR_TRIM_BRUSH_QT3" |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| applies_when | TEXT | | variants[].applies_when | JSON object stored as TEXT |
| coats_primer | INTEGER | | variants[].coats_primer | Nullable — only used by multi-coat specs |
| coats_finish | INTEGER | | variants[].coats_finish | Nullable — only used by multi-coat specs |
| round_id | TEXT | | variants[].round_id | FK reference to sop_round_configurations — nullable |
| protection_zones | TEXT | | variants[].protection_zones | JSON array of zone IDs for this variant |
| notes | TEXT | | variants[].notes | |

**Primary key:** (id, spec_family_id)

---

#### `spec_variant_item_inclusions`

**Source:** `spec.json → variants[].included_items[] / excluded_items[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Surrogate PK |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| variant_id | TEXT | NOT NULL | (parent variant_id) | |
| item_id | TEXT | NOT NULL | included_items[] or excluded_items[] value | |
| is_included | INTEGER | NOT NULL | — | 1 if from included_items, 0 if from excluded_items |

**Foreign key:** (variant_id, spec_family_id) → spec_variants(id, spec_family_id)
**Foreign key:** (item_id, spec_family_id) → spec_paintable_item_types(id, spec_family_id)

---

#### `spec_scope_boundaries`

**Source:** `spec.json → scope_boundaries`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| boundary_type | TEXT | NOT NULL, CHECK(boundary_type IN ('include','exclude')) | — | Derived from includes[] vs excludes[] |
| description | TEXT | NOT NULL | includes[] or excludes[] item text or .item | |
| route_to | TEXT | | excludes[].route_to | Only for excludes with routing |

---

#### `spec_required_inputs`

**Source:** `spec.json → required_paintscope_inputs[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| input_name | TEXT | NOT NULL | required_paintscope_inputs[].input_name | e.g., "IN_SF_WALL_FIELD" |
| paintscope_key | TEXT | NOT NULL | required_paintscope_inputs[].paintscope_key | e.g., "PS_SURFACE_SF.WALL_FIELD" |
| uom | TEXT | NOT NULL | required_paintscope_inputs[].uom | SF/LF/EA/ENUM/BOOL |
| is_required | INTEGER | | required_paintscope_inputs[].required | 1 if always required. Note: actual JSON field name is `required` |
| required_when | TEXT | | required_paintscope_inputs[].required_when | JSON object if conditional |
| status | TEXT | | required_paintscope_inputs[].status | e.g., "existing", "proposed" |
| description | TEXT | | required_paintscope_inputs[].description | |

---

#### `spec_protection_zones`

**Source:** `spec.json → protection_zones_required[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| zone_id | TEXT | NOT NULL | protection_zones_required[].zone_id | e.g., "floor_perimeter" |
| condition | TEXT | | protection_zones_required[].condition | JSON object or string (e.g., "always", "always_when_installed") |
| protection_level | TEXT | NOT NULL | protection_zones_required[].protection_level | |
| upgrades_to_zone | TEXT | | protection_zones_required[].upgrades_to_zone | |
| upgrades_to_level | TEXT | | protection_zones_required[].upgrades_to_level | |
| upgrade_condition | TEXT | | protection_zones_required[].upgrade_condition | |
| notes | TEXT | | protection_zones_required[].notes | |

---

#### `spec_adjacency_declarations`

**Source:** `spec.json → adjacency_declarations`

**Import note:** `adjacency_declarations` can be a single object (one primary_surface) or an array of objects (multiple primary_surfaces). The Spec Importer must handle both shapes: if single object, wrap in array before iterating. Each `adjacent_surfaces[]` entry becomes one row.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| primary_surface | TEXT | NOT NULL | adjacency_declarations[].primary_surface | Carried from parent object |
| adjacent_surface_id | TEXT | NOT NULL | adjacency_declarations[].adjacent_surfaces[].surface_id | |
| edge_type | TEXT | NOT NULL | adjacency_declarations[].adjacent_surfaces[].edge_type | |
| typical_relationship | TEXT | | adjacency_declarations[].adjacent_surfaces[].typical_relationship | |
| continuity_rate_modifier | REAL | | adjacency_declarations[].adjacent_surfaces[].continuity_rate_modifier | |
| affected_tasks | TEXT | | adjacency_declarations[].adjacent_surfaces[].affected_tasks | JSON array |
| notes | TEXT | | adjacency_declarations[].adjacent_surfaces[].notes | |

---

#### `spec_state_declarations`

**Source:** `spec.json → state_declarations`

**Import note:** `state_declarations` can be a single object or an array. `valid_input_states` is an object with `{states: [...], notes: "..."}` — stored as JSON TEXT preserving the full structure. `output_state` is also an object with `{state: "...", varies_by: ..., notes: "..."}`.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| primary_surface | TEXT | NOT NULL | state_declarations.primary_surface or .primary_surfaces | Single surface or first from array |
| valid_input_states | TEXT | NOT NULL | state_declarations.valid_input_states | JSON object: {"states": [...], "notes": "..."} |
| output_state | TEXT | | state_declarations.output_state.state | Single state or null if varies |
| output_state_varies_by | TEXT | | state_declarations.output_state.varies_by | Dimension that determines output |
| output_state_map | TEXT | | state_declarations.output_state.state_map | JSON map of dimension→state |
| notes | TEXT | | state_declarations.notes or output_state.notes | |

---

#### `spec_change_log`

**Source:** `spec.json → change_log[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| version | TEXT | NOT NULL | change_log[].version | |
| date | TEXT | NOT NULL | change_log[].date | |
| author | TEXT | NOT NULL | change_log[].author | |
| changes | TEXT | | change_log[].changes | |

---

### Table Group 2: Materials (from materials.json)

---

#### `material_systems`

**Source:** `materials.json → material_systems[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | NOT NULL | material_systems[].system_id | e.g., "SYS_TRIM_QT3_LATEX_ENAMEL" |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| name | TEXT | NOT NULL | material_systems[].name | |
| description | TEXT | | material_systems[].description | |
| applies_when | TEXT | | material_systems[].applies_when | JSON object (quality_tier, etc.) |
| allowed_sheens | TEXT | | material_systems[].allowed_sheens | JSON array of sheen values |
| notes | TEXT | | material_systems[].notes | |

**Primary key:** (id, spec_family_id)

---

#### `material_system_products`

**Source:** `materials.json → material_systems[].products[]` (Drywall pattern) or `material_systems[].primer` / `.finish` (Cabinet pattern)

**Import note:** Two structural patterns exist across specs:
- **Drywall pattern:** `material_systems[].products[]` — an array of product objects, each with `product_role`, `product_type`, `example_products`, `sheen`, `coats_required`
- **Cabinet pattern:** `material_systems[].primer` / `.finish` — direct objects keyed by role, each with `type`, `products[]` (string array), `coverage_sf_per_gallon`, `coverage_range`, `coats`

The Spec Importer normalizes both into this table: for Drywall, iterate `products[]`; for Cabinet, treat each role-keyed object (`primer`, `finish`) as a separate row, deriving `product_role` from the key name.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Surrogate PK |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| system_id | TEXT | NOT NULL | (parent material_systems[].system_id) | |
| product_role | TEXT | | products[].product_role OR parent key ("primer"/"finish") | primer/topcoat/stain/sealer/finish |
| product_type | TEXT | | products[].product_type OR .type | e.g., "latex_primer", "acrylic_latex" |
| example_products | TEXT | | products[].example_products OR .products | JSON array of product names |
| sheen | TEXT | | products[].sheen | Single sheen value (nullable — primers often have no sheen) |
| coats_required | INTEGER | | products[].coats_required OR .coats | |
| coverage_sf_per_gallon | REAL | | .coverage_sf_per_gallon | Cabinet pattern — nullable for Drywall |
| coverage_range_low | REAL | | .coverage_range[0] | Cabinet pattern — nullable for Drywall |
| coverage_range_high | REAL | | .coverage_range[1] | Cabinet pattern — nullable for Drywall |
| notes | TEXT | | products[].notes OR .notes | |

**Foreign key:** (system_id, spec_family_id) → material_systems(id, spec_family_id)

---

#### `material_coverage_profiles`

**Source:** `materials.json → coverage_profiles[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | NOT NULL | coverage_profiles[].profile_id | e.g., "COV_WALL_PRIME" |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| material_system | TEXT | | coverage_profiles[].material_system | System ID reference |
| product_role | TEXT | | coverage_profiles[].product_role | primer/topcoat/finish |
| surface_texture | TEXT | | coverage_profiles[].surface_texture | String or JSON array |
| drywall_finish_level | TEXT | | coverage_profiles[].drywall_finish_level | JSON array (domain-specific) |
| coverage_model | TEXT | | coverage_profiles[].coverage_model | e.g., "mixed_uom", "standard" |
| coverage_sf_per_gallon | REAL | | coverage_profiles[].coverage_sf_per_gallon | |
| coverage_range_low | REAL | | coverage_profiles[].coverage_range_low | |
| coverage_range_high | REAL | | coverage_profiles[].coverage_range_high | |
| coverage_by_item | TEXT | | coverage_profiles[].coverage_by_item | JSON object — per-item coverage for mixed UOM specs |
| assumptions | TEXT | | coverage_profiles[].assumptions | |
| notes | TEXT | | coverage_profiles[].notes | |

**Primary key:** (id, spec_family_id)

---

#### `material_consumables`

**Source:** `materials.json → consumables[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | NOT NULL | consumables[].consumable_id | e.g., "CON_BRUSH_ANGLE_2IN" |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| name | TEXT | NOT NULL | consumables[].name | |
| consumable_category | TEXT | | consumables[].category | Map: actual JSON uses `category`, column uses `consumable_category` |
| specification | TEXT | | consumables[].specification | |
| unit | TEXT | | consumables[].unit | EA/ROLL/SHEET etc. |
| yield_per_unit | REAL | | consumables[].yield_per_unit | |
| yield_uom | TEXT | | consumables[].yield_uom | SF/LF/EA etc. |
| applies_when | TEXT | | consumables[].applies_when | JSON object — conditional application |
| notes | TEXT | | consumables[].notes | |

**Primary key:** (id, spec_family_id)

---

### Table Group 3: SOP Modules and Tasks (from sop_modules.json)

---

#### `sop_round_configurations`

**Source:** `sop_modules.json → round_configurations[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Surrogate PK |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| round_id | TEXT | NOT NULL | round_configurations[].round_id | e.g., "ROUND_SINGLE_WALL_PRIME" |
| name | TEXT | NOT NULL | round_configurations[].name | |
| description | TEXT | | round_configurations[].description | Nullable — not all specs populate |
| applies_when | TEXT | | round_configurations[].applies_when | JSON object |
| phase_sequence | TEXT | | round_configurations[].phase_sequence | JSON array — nullable (Drywall has it, Cabinet doesn't) |
| total_coats | INTEGER | | round_configurations[].total_coats | Total coats in this round config |
| interstage_cycles | INTEGER | | round_configurations[].interstage_cycles | Number of interstage drying cycles |
| notes | TEXT | | round_configurations[].notes | |

**Unique constraint:** (spec_family_id, round_id)

---

#### `sop_modules`

**Source:** `sop_modules.json → sop_modules[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | NOT NULL | sop_modules[].module_id | e.g., "MOD_TRIM_PREP" |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| name | TEXT | NOT NULL | sop_modules[].name | |
| phase | TEXT | NOT NULL | sop_modules[].phase | setup/prep/prime/apply/interstage/finish/cleanup |
| description | TEXT | | sop_modules[].description | |
| applies_when | TEXT | | sop_modules[].applies_when | JSON object |
| required_inputs | TEXT | | sop_modules[].required_inputs | JSON array |
| sequence_notes | TEXT | | sop_modules[].sequence_notes | |
| sort_order | INTEGER | | — | Derived from array index |

**Primary key:** (id, spec_family_id)

---

#### `sop_tasks`

**Source:** `sop_modules.json → sop_modules[].tasks[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | NOT NULL | tasks[].task_id | e.g., "TSK_TRIM_SAND_R1" |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| module_id | TEXT | NOT NULL | (parent module_id) | |
| name | TEXT | NOT NULL | tasks[].name | |
| task_classification | TEXT | | tasks[].task_classification | prep/application/protection/inspection/cleanup |
| task_type | TEXT | | tasks[].task_type | |
| skill_level | TEXT | | tasks[].skill_level | |
| qt_behavior | TEXT | | tasks[].qt_behavior | all_tiers_identical/rate_varies_by_tier/tier_specific |
| description | TEXT | | tasks[].description | |
| tools_required | TEXT | | tasks[].tools_required | JSON array |
| applies_when | TEXT | | tasks[].applies_when | JSON object |
| appears_in_tiers | TEXT | | tasks[].appears_in_tiers | JSON array: '["QT3","QT4","QT5"]' |
| quality_notes | TEXT | | tasks[].quality_notes | JSON object with per-tier notes |
| protection_metadata | TEXT | | tasks[].protection_metadata | JSON object (action, zones) |
| adjacency_metadata | TEXT | | tasks[].adjacency_metadata | JSON object |
| notes | TEXT | | tasks[].notes | |
| sort_order | INTEGER | | — | Derived from array index within module |

**Primary key:** (id, spec_family_id)
**Foreign key:** (module_id, spec_family_id) → sop_modules(id, spec_family_id)

---

### Table Group 4: Production Logic (from production.json)

---

#### `task_production_rates`

**Source:** `production.json → task_production_rates[]`

**Import note:** Binary tasks use `rate_per_hour` (flat rate). Qt_scaled tasks use `rates_by_tier` (JSON object with per-tier rates). FIXED_TIME tasks use `fixed_minutes`. The Spec Importer must handle all three patterns.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| task_id | TEXT | NOT NULL | task_production_rates[].task_id | Must match sop_tasks.id |
| name | TEXT | | task_production_rates[].name | Descriptive name |
| unit_of_measure | TEXT | NOT NULL | task_production_rates[].unit_of_measure | |
| required_input_key | TEXT | | task_production_rates[].required_input_key | |
| paintscope_key | TEXT | | task_production_rates[].paintscope_key | |
| rate_per_hour | REAL | | task_production_rates[].rate_per_hour | Base rate for binary tasks |
| rate_range_low | REAL | | task_production_rates[].rate_range_low | |
| rate_range_high | REAL | | task_production_rates[].rate_range_high | |
| rates_by_tier | TEXT | | task_production_rates[].rates_by_tier | JSON object for qt_scaled: {"QT3": {"rate_per_hour": 150}} |
| fixed_minutes | REAL | | task_production_rates[].fixed_minutes | For FIXED_TIME tasks (single value) |
| fixed_minutes_range_low | REAL | | task_production_rates[].fixed_minutes_range_low | |
| fixed_minutes_range_high | REAL | | task_production_rates[].fixed_minutes_range_high | |
| fixed_minutes_by_tier | TEXT | | task_production_rates[].fixed_time_minutes_by_tier | JSON object for per-tier fixed times: {"QT3": 10, "QT4": 15} |
| crew_size | INTEGER | | task_production_rates[].crew_size | |
| applies_when | TEXT | | task_production_rates[].applies_when | JSON object — conditional rate |
| notes | TEXT | | task_production_rates[].notes or .rate_basis_notes | |

**Foreign key:** (task_id, spec_family_id) → sop_tasks(id, spec_family_id)

---

#### `factor_modifiers`

**Source:** `production.json → factor_modifiers[]`, `height_effects[]`, `texture_effects[]`, `drywall_level_effects[]`, and other domain-specific modifier arrays.

**Import note:** Actual production.json stores modifiers in domain-specific arrays (e.g., `height_effects`, `texture_effects`). Some specs (cabinets) use a unified `factor_modifiers[]` array with `applies_to_tasks`. The Spec Importer maps all of these into this unified table using the `modifier_category` discriminator column:
- `height_effects[]` → modifier_category = "height"
- `texture_effects[]` → modifier_category = "texture"
- `drywall_level_effects[]` → modifier_category = "drywall_level"
- `factor_modifiers[]` with door_style type → modifier_category = "door_style"
- `factor_modifiers[]` with kitchen_complexity type → modifier_category = "kitchen_complexity"
- etc.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | TEXT | NOT NULL | [].modifier_id or [].factor_id | e.g., "FAC_HEIGHT_TALL", "H2_MODERATE" |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| modifier_category | TEXT | NOT NULL | — | Derived: "height", "texture", "drywall_level", "door_style", etc. |
| name | TEXT | | [].name | |
| description | TEXT | | [].description | |
| modifier_type | TEXT | | [].modifier_type | multiplier/additive |
| time_modifier | REAL | | [].time_modifier | Primary numeric effect (multiplier) |
| value | REAL | | [].value | Alternative numeric value |
| value_min | REAL | | [].value_min | |
| value_max | REAL | | [].value_max | |
| condition | TEXT | | [].condition or contextual | JSON object or string — when this modifier applies |
| notes | TEXT | | [].notes | |

**Primary key:** (id, spec_family_id)

---

#### `factor_task_applicability`

**Source:** `production.json → factor_modifiers[].applies_to_tasks[]`

**Import note:** Only populated when modifiers explicitly list target tasks (e.g., cabinet-style `factor_modifiers[]` with `applies_to_tasks`). Domain-specific modifiers (height, texture) that apply globally based on configuration dimensions do NOT have entries here — they are resolved by the Estimation Engine at runtime.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| factor_id | TEXT | NOT NULL | (parent factor_id) | |
| task_id | TEXT | NOT NULL | applies_to_tasks[] value | |

**Foreign key:** (factor_id, spec_family_id) → factor_modifiers(id, spec_family_id)
**Foreign key:** (task_id, spec_family_id) → sop_tasks(id, spec_family_id)

---

#### `quality_tier_effects`

**Source:** `production.json → quality_tier_effects[]`

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | (parent context) | |
| quality_tier | TEXT | NOT NULL | quality_tier_effects[].quality_tier | |
| modifier_id | TEXT | | quality_tier_effects[].modifier_id | e.g., "QT2_MINIMAL" |
| time_modifier | REAL | | quality_tier_effects[].time_modifier | Numeric multiplier |
| description | TEXT | | quality_tier_effects[].description | |
| mechanism | TEXT | | quality_tier_effects[].mechanism | additional_rounds/selective_multiplier/etc. |
| effect_details | TEXT | | quality_tier_effects[].details or .effects | JSON object — optional, variable structure |
| notes | TEXT | | quality_tier_effects[].notes | |

---

### Table Group 5: QA and Governance (from qa_report.json + spec.json)

---

#### `spec_qa_reports`

**Source:** `qa_report.json`

**Import note:** Actual QA reports have detailed criterion-by-criterion review arrays (acceptance_criteria_review, doctrine_alignment_review, internal_consistency_review, etc.). These are stored as a single JSON blob in the `full_report` column. The `status` column maps from the actual JSON field `review_status`. Detailed criterion reviews are preserved in `spec_artifacts_raw` and in `full_report`.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL, FK → spec_families.id | spec_family_id (root level) | |
| version | TEXT | NOT NULL | version (root level) | |
| reviewed_by | TEXT | | critic_agent (root level) | |
| review_date | TEXT | | review_date (root level) | |
| status | TEXT | NOT NULL, CHECK(status IN ('pass','pass_with_warnings','fail')) | overall_result OR review_status | Check `overall_result` first, fall back to `review_status`. Normalize case: "PASS"→"pass" |
| summary | TEXT | | recommendation or notes (root level) | |
| full_report | TEXT | | — | Entire qa_report.json stored as JSON blob |

---

### Table Group 6: Raw Storage and Import Tracking

---

#### `spec_artifacts_raw`

**Purpose:** Store original JSON for every imported artifact. Safety net for re-import.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL | — | |
| artifact_type | TEXT | NOT NULL, CHECK(artifact_type IN ('spec','materials','sop_modules','production','qa_report')) | — | |
| version | TEXT | NOT NULL | — | From the artifact's version field |
| status | TEXT | | — | From the artifact's status field |
| json_content | TEXT | NOT NULL | — | Complete raw JSON string |
| imported_at | TEXT | NOT NULL DEFAULT (datetime('now')) | — | |

**Unique constraint:** (spec_family_id, artifact_type, version)

---

#### `import_log`

**Purpose:** Database-side record of import operations.

| Column | Type | Constraint | JSON Path | Notes |
|--------|------|-----------|-----------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | |
| spec_family_id | TEXT | NOT NULL | — | |
| version | TEXT | NOT NULL | — | |
| import_status | TEXT | NOT NULL | — | success/failed |
| validation_status | TEXT | | — | pass/pass_with_warnings/fail/pending |
| rows_inserted | TEXT | | — | JSON: {"spec_families": 1, "sop_tasks": 25, ...} |
| errors | TEXT | | — | JSON array of error details |
| imported_at | TEXT | NOT NULL DEFAULT (datetime('now')) | — | |
| validated_at | TEXT | | — | |
| notes | TEXT | | — | |

---

## 4. Index Strategy

Indexes support the query patterns the Estimation Engine will need.

```sql
-- Primary lookup: find spec family by domain
CREATE INDEX idx_spec_families_domain ON spec_families(domain);

-- Variant resolution: find variants for a spec family
CREATE INDEX idx_spec_variants_family ON spec_variants(spec_family_id);

-- Task lookup: find tasks for a module
CREATE INDEX idx_sop_tasks_module ON sop_tasks(spec_family_id, module_id);

-- Rate lookup: find production rates for a task
CREATE INDEX idx_task_rates_task ON task_production_rates(spec_family_id, task_id);

-- Factor lookup: find applicable factors for a task
CREATE INDEX idx_factor_applicability ON factor_task_applicability(spec_family_id, task_id);

-- Factor lookup: find modifiers by category
CREATE INDEX idx_factor_modifiers_category ON factor_modifiers(spec_family_id, modifier_category);

-- Material system lookup by spec family
CREATE INDEX idx_material_systems_family ON material_systems(spec_family_id);

-- Material system products lookup
CREATE INDEX idx_material_products_system ON material_system_products(spec_family_id, system_id);

-- Round configuration lookup by spec family
CREATE INDEX idx_round_configs_family ON sop_round_configurations(spec_family_id);

-- Protection zone lookup by spec family
CREATE INDEX idx_protection_zones_family ON spec_protection_zones(spec_family_id);

-- Raw artifact lookup
CREATE INDEX idx_raw_artifacts ON spec_artifacts_raw(spec_family_id, artifact_type);

-- Import log lookup
CREATE INDEX idx_import_log ON import_log(spec_family_id, version);
```

---

## 5. Foreign Key Relationships Summary

```
spec_families (1) ──── (many) spec_configuration_dimensions
spec_families (1) ──── (many) spec_paintable_item_types
spec_families (1) ──── (many) spec_variants
spec_families (1) ──── (many) spec_scope_boundaries
spec_families (1) ──── (many) spec_required_inputs
spec_families (1) ──── (many) spec_protection_zones
spec_families (1) ──── (many) spec_adjacency_declarations
spec_families (1) ──── (many) spec_state_declarations
spec_families (1) ──── (many) spec_change_log
spec_families (1) ──── (many) material_systems
spec_families (1) ──── (many) material_coverage_profiles
spec_families (1) ──── (many) material_consumables
spec_families (1) ──── (many) sop_round_configurations
spec_families (1) ──── (many) sop_modules
spec_families (1) ──── (many) sop_tasks
spec_families (1) ──── (many) task_production_rates
spec_families (1) ──── (many) factor_modifiers
spec_families (1) ──── (many) quality_tier_effects
spec_families (1) ──── (many) spec_qa_reports
spec_families (1) ──── (many) spec_artifacts_raw
spec_families (1) ──── (many) import_log

spec_variants (1) ──── (many) spec_variant_item_inclusions
material_systems (1) ──── (many) material_system_products
sop_round_configurations (1) ──── (many) spec_variants (via round_id, optional)
sop_modules (1) ──── (many) sop_tasks
sop_tasks (1) ──── (many) task_production_rates
factor_modifiers (1) ──── (many) factor_task_applicability
```

---

## 6. JSON Storage Decisions

Fields stored as JSON TEXT (queried via json_extract when needed):

| Table | Column | Reason |
|-------|--------|--------|
| spec_configuration_dimensions | allowed_values | Variable-length array of tier/method values |
| spec_configuration_dimensions | prohibited | Variable-length array of prohibited values |
| spec_paintable_item_types | conditional_on | Complex conditional object, variable keys |
| spec_variants | applies_when | Complex conditional object, variable keys |
| spec_variants | protection_zones | Array of zone IDs per variant |
| spec_required_inputs | required_when | Conditional requirement logic |
| spec_adjacency_declarations | affected_tasks | Array of task IDs |
| spec_state_declarations | valid_input_states | Object: {states: [...], notes: "..."} |
| spec_state_declarations | output_state_map | Map of dimension value → state |
| material_systems | applies_when | Conditional match logic |
| material_systems | allowed_sheens | Array of allowed sheen values |
| material_system_products | example_products | Array of product name strings |
| material_coverage_profiles | surface_texture | String or array of texture values |
| material_coverage_profiles | drywall_finish_level | Array of finish level values |
| material_coverage_profiles | coverage_by_item | Per-item coverage for mixed UOM specs |
| material_consumables | applies_when | Conditional application logic |
| sop_round_configurations | applies_when | Conditional round logic |
| sop_round_configurations | phase_sequence | Ordered array of phase names |
| sop_modules | applies_when | Module-level conditions |
| sop_modules | required_inputs | Array of input definitions |
| sop_tasks | tools_required | Array of tool strings |
| sop_tasks | applies_when | Task-level conditions |
| sop_tasks | appears_in_tiers | Array of QT values |
| sop_tasks | quality_notes | Per-tier quality notes object |
| sop_tasks | protection_metadata | Action and zone definitions |
| sop_tasks | adjacency_metadata | Adjacency context object |
| task_production_rates | rates_by_tier | Per-tier rate definitions (qt_scaled tasks only) |
| task_production_rates | fixed_minutes_by_tier | Per-tier fixed time values |
| task_production_rates | applies_when | Conditional rate logic |
| factor_modifiers | condition | Conditional application logic |
| quality_tier_effects | effect_details | Variable structure per mechanism |
| spec_qa_reports | full_report | Entire QA report as JSON blob |
| import_log | rows_inserted | Per-table count object |
| import_log | errors | Array of error details |

Fields flattened into proper columns (queried directly):

All ID fields, names, descriptions, numeric values (rates, modifiers, coverage), status fields, enum-like fields (domain, phase, severity, modifier_category), booleans, and dates.

---

## 7. Deletion and Re-import

When re-importing a spec family, delete in reverse FK order:

```sql
-- Order matters: children before parents
DELETE FROM spec_qa_reports WHERE spec_family_id = ?;
DELETE FROM factor_task_applicability WHERE spec_family_id = ?;
DELETE FROM quality_tier_effects WHERE spec_family_id = ?;
DELETE FROM factor_modifiers WHERE spec_family_id = ?;
DELETE FROM task_production_rates WHERE spec_family_id = ?;
DELETE FROM sop_tasks WHERE spec_family_id = ?;
DELETE FROM sop_modules WHERE spec_family_id = ?;
DELETE FROM sop_round_configurations WHERE spec_family_id = ?;
DELETE FROM material_consumables WHERE spec_family_id = ?;
DELETE FROM material_coverage_profiles WHERE spec_family_id = ?;
DELETE FROM material_system_products WHERE spec_family_id = ?;
DELETE FROM material_systems WHERE spec_family_id = ?;
DELETE FROM spec_change_log WHERE spec_family_id = ?;
DELETE FROM spec_state_declarations WHERE spec_family_id = ?;
DELETE FROM spec_adjacency_declarations WHERE spec_family_id = ?;
DELETE FROM spec_protection_zones WHERE spec_family_id = ?;
DELETE FROM spec_required_inputs WHERE spec_family_id = ?;
DELETE FROM spec_scope_boundaries WHERE spec_family_id = ?;
DELETE FROM spec_variant_item_inclusions WHERE spec_family_id = ?;
DELETE FROM spec_variants WHERE spec_family_id = ?;
DELETE FROM spec_paintable_item_types WHERE spec_family_id = ?;
DELETE FROM spec_configuration_dimensions WHERE spec_family_id = ?;
-- Do NOT delete from spec_artifacts_raw (keep for audit)
-- Do NOT delete from import_log (keep for audit)
DELETE FROM spec_families WHERE id = ?;
```

Alternative: Use `ON DELETE CASCADE` on all FK constraints and simply delete from spec_families. Recommended for simplicity, but requires careful FK definition.

---

## 8. Raw-Only Fields (Not Normalized in v1)

The following spec.json keys are preserved in `spec_artifacts_raw` but do NOT have dedicated tables. These are governance/coordination metadata that the Estimation Engine does not query. They can be normalized in a future schema version if needed.

| Source File | JSON Key | Reason for Raw-Only |
|-------------|----------|-------------------|
| spec.json | research_corrections | Development audit trail, not runtime data |
| spec.json | inherited_research_corrections | Development audit trail |
| spec.json | critical_constraints | Already enforced by SpecFactory Critic at generation time |
| spec.json | cross_spec_coordination | Coordination metadata, consumed by SpecFactory not Engine |
| spec.json | doctrine_references | Provenance tracking, not runtime data |
| spec.json | sequencing_notes | Human-readable notes, not structured query target |
| spec.json | relationships | Companion spec references — future table candidate |
| materials.json | consumable_notes | Descriptive notes object, not structured data |
| sop_modules.json | critical_constraints | Already enforced at spec generation time |
| production.json | crew_configurations | Future table candidate when crew planning is built |
| production.json | coupling_constraints | Engine constraint logic — future table candidate |
| production.json | critical_constraints | Already enforced at spec generation time |

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-09 | Initial draft — complete table definitions for all 6 artifact types |
| 1.1.0 | 2026-02-10 | Major corrections after cross-referencing against actual spec artifacts. Patch: added material_system_products dual-pattern support (Drywall products[] vs Cabinet primer/finish objects), sop_round_configurations.total_coats/interstage_cycles, material_coverage_profiles.product_role/coverage_model/coverage_by_item, task_production_rates.fixed_minutes_by_tier, material_systems.allowed_sheens. Fixed QA status field mapping (overall_result OR review_status). Made phase_sequence nullable on round configs. Added: material_system_products, sop_round_configurations tables. Redesigned: factor_modifiers (modifier_category discriminator), task_production_rates (flat rate + fixed_minutes fields), quality_tier_effects (time_modifier, modifier_id), material_coverage_profiles, material_consumables. Simplified: spec_qa_reports (summary + blob, removed spec_qa_issues table). Removed: material_compatibility_rules. Added columns: spec_families.context, spec_configuration_dimensions.prohibited, spec_paintable_item_types.conditional/conditional_on, spec_variants.coats_primer/coats_finish/round_id/protection_zones, spec_required_inputs.status, sop_tasks.qt_behavior. Removed columns: sop_modules.run_rule/run_count_formula. Fixed documentation for adjacency_declarations and state_declarations structural variations. Added Section 8 (Raw-Only Fields). |

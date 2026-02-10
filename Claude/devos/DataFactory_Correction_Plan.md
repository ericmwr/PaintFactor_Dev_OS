# DataFactory Correction Plan

**Status:** COMPLETE
**Created:** 2026-02-10
**Purpose:** Track all corrections needed to align DataFactory documents with actual spec artifact structures. Organized in phases so work can resume across sessions.

---

## Context

A comprehensive review on 2026-02-10 compared the SQLite Schema Contract and agent prompts against actual spec artifacts (SF_DRYWALL_WALL_NC_PRIME_v1, SF_CABINET_NC_PAINT_v1) and JSON schema files. The Schema Contract has substantial mismatches with real data. Agent prompts are structurally sound but depend on the contract being correct.

### Architectural Decisions Made (2026-02-10)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Factor modifiers architecture | Unified `factor_modifiers` table with `modifier_category` discriminator column | Maps height_effects, texture_effects, drywall_level_effects etc. into one table |
| Material systems products | Child table `material_system_products` | Supports future full product catalog + sundries table |
| QA report granularity | Summary + full JSON blob | Detailed criterion reviews stored in raw JSON only |
| Round configurations | Dedicated `sop_round_configurations` table, phase_sequence as JSON array | Variants FK to round_id; phase sequences consumed as a unit |

---

## Phase 1: SQLite Schema Contract — Structural Fixes

**File:** `docs/System/SQLite_Schema_Contract.md`
**Priority:** MUST complete before any SQL or import scripts are written.
**Estimated effort:** 1 session

### 1A. Fix `material_systems` Table Definition

**Current (wrong):** Expects `coat_sequence`, `compatible_substrates`, `cleanup_class` columns.
**Actual JSON:** Has a nested `products[]` array with product_role, product_type, example_products, sheen, coats_required, notes. No coat_sequence/compatible_substrates/cleanup_class at this level.

**Corrections:**
- Remove columns: `coat_sequence`, `compatible_substrates`, `cleanup_class`
- Add column: `description` TEXT
- Add new child table `material_system_products`:
  - `id` INTEGER PRIMARY KEY AUTOINCREMENT
  - `spec_family_id` TEXT NOT NULL, FK → spec_families.id
  - `system_id` TEXT NOT NULL (parent material_systems.id)
  - `product_role` TEXT (primer/topcoat/stain)
  - `product_type` TEXT
  - `example_products` TEXT (JSON array)
  - `sheen` TEXT
  - `coats_required` INTEGER
  - `notes` TEXT
  - FK: (system_id, spec_family_id) → material_systems(id, spec_family_id)
- Update FK relationships diagram (Section 5)
- Update JSON storage decisions table (Section 6)

**Status:** [x] DONE

### 1B. Fix `material_coverage_profiles` Table Definition

**Current (wrong):** Expects `product_role`, `spread_rate_sf_per_gal`, `loss_factor_pct`, `profile_notes`.
**Actual JSON:** Has `surface_texture`, `drywall_finish_level`, `coverage_sf_per_gallon`, `coverage_range_low`, `coverage_range_high`, `assumptions`.

**Corrections:**
- Remove columns: `product_role`, `spread_rate_sf_per_gal`, `loss_factor_pct`, `profile_notes`
- Rename: `id` source path from `coverage_id` to `profile_id` (match actual JSON key)
- Add column: `material_system` TEXT (FK reference to material_systems)
- Add column: `surface_texture` TEXT (string or JSON array)
- Add column: `drywall_finish_level` TEXT (JSON array)
- Add column: `coverage_sf_per_gallon` REAL
- Add column: `coverage_range_low` REAL
- Add column: `coverage_range_high` REAL
- Add column: `assumptions` TEXT
- Add column: `notes` TEXT

**Status:** [x] DONE

### 1C. Fix `material_consumables` Table Definition

**Current (wrong):** Expects `recommended_class`, `usage_rate`, `quality_sensitivity`.
**Actual JSON:** Has `specification`, `yield_per_unit`, `yield_uom`, `applies_when`.

**Corrections:**
- Remove columns: `recommended_class`, `usage_rate`, `quality_sensitivity`
- Add column: `specification` TEXT
- Add column: `yield_per_unit` REAL
- Add column: `yield_uom` TEXT
- Add column: `applies_when` TEXT (JSON object)
- Keep: `consumable_category` column name (actual JSON uses `category` — document the mapping)

**Status:** [x] DONE

### 1D. Remove `material_compatibility_rules` Table

**Current:** Table defined in contract.
**Actual JSON:** This section does not exist in actual artifact files.

**Corrections:**
- Remove table definition from Section 3
- Remove from FK relationships diagram (Section 5)
- Remove from deletion order (Section 7)
- Note: if compatibility rules appear in future specs, re-add then

**Status:** [x] DONE

### 1E. Redesign `factor_modifiers` Table + Add `modifier_category`

**Current (wrong):** Expects a unified `factor_modifiers[]` array from production.json.
**Actual JSON:** Uses separate arrays: `height_effects`, `texture_effects`, `drywall_level_effects`, etc.

**Corrections:**
- Add column: `modifier_category` TEXT NOT NULL (e.g., "height", "texture", "drywall_level", "door_style", "kitchen_complexity", etc.)
- Adjust `id` column — actual JSON uses `modifier_id` within each effect array
- Add column: `time_modifier` REAL (the primary numeric effect)
- Keep `value`, `value_min`, `value_max` for range-based modifiers
- Add column: `condition` TEXT (JSON object — when this modifier applies)
- Update `factor_task_applicability` — some domain modifiers (height, texture) don't explicitly link to tasks. Add column `applies_globally` INTEGER DEFAULT 0 to handle this, or make task linkage optional.
- Document the mapping: `height_effects[]` → factor_modifiers with modifier_category="height", `texture_effects[]` → modifier_category="texture", etc.
- Cabinet spec DOES use explicit `applies_to_tasks[]` on its modifiers, so the junction table is still needed for some specs

**Status:** [x] DONE

### 1F. Fix `task_production_rates` Table Definition

**Current (wrong):** Expects `rates_by_tier` as the primary rate storage.
**Actual JSON:** Uses flat `rate_per_hour` for binary tasks, `rates_by_tier` only for qt_scaled tasks. Also has `fixed_minutes` for FIXED_TIME tasks.

**Corrections:**
- Add column: `name` TEXT
- Add column: `rate_per_hour` REAL (base rate for binary tasks)
- Add column: `rate_range_low` REAL
- Add column: `rate_range_high` REAL
- Keep column: `rates_by_tier` TEXT (JSON object — used by qt_scaled tasks)
- Add column: `applies_when` TEXT (JSON object)
- Add column: `fixed_minutes` REAL (for FIXED_TIME tasks)
- Add column: `fixed_minutes_range_low` REAL
- Add column: `fixed_minutes_range_high` REAL
- Document: binary tasks use `rate_per_hour`, qt_scaled tasks use `rates_by_tier`, FIXED_TIME tasks use `fixed_minutes`

**Status:** [x] DONE

### 1G. Fix `quality_tier_effects` Table Definition

**Current (wrong):** Expects `effect_details` JSON blob.
**Actual JSON:** Has `time_modifier` (numeric), `modifier_id`, and may or may not have a details object.

**Corrections:**
- Add column: `time_modifier` REAL
- Add column: `modifier_id` TEXT
- Make `effect_details` optional (some tiers use it, some don't)
- Keep `mechanism`, `description`, `notes`

**Status:** [x] DONE

### 1H. Fix `spec_qa_reports` Table Definition (Simplify)

**Current:** Expects `status`, `summary`, `gate_results` (JSON).
**Actual JSON:** Uses `review_status` (not `status`), has detailed criterion arrays, no single `summary` field.

**Corrections:**
- Rename column reference: `status` source path → `review_status` (keep column name as `status` with mapping note)
- Change `summary` to pull from `recommendation` or `notes` field
- Keep `gate_results` as TEXT — store the ENTIRE qa_report (minus issues) as JSON blob
- Document that detailed criterion reviews (acceptance_criteria_review, doctrine_alignment_review, etc.) are preserved in `spec_artifacts_raw` and in the `gate_results` blob
- Remove `spec_qa_issues` table (issues are rare and preserved in raw JSON + gate_results blob)

**Status:** [x] DONE

### 1I. Add `sop_round_configurations` Table (NEW)

**Current:** Not in contract.
**Actual JSON:** Present in `sop_modules.json → round_configurations[]`.

**Corrections:**
- Add new table definition:
  - `id` INTEGER PRIMARY KEY AUTOINCREMENT
  - `spec_family_id` TEXT NOT NULL, FK → spec_families.id
  - `round_id` TEXT NOT NULL
  - `name` TEXT NOT NULL
  - `description` TEXT
  - `applies_when` TEXT (JSON object)
  - `phase_sequence` TEXT NOT NULL (JSON array)
  - `notes` TEXT
  - UNIQUE: (spec_family_id, round_id)
- Add to FK relationships diagram
- Add to index strategy (idx_round_configs_family)
- Add to deletion order (before sop_modules)

**Status:** [x] DONE

---

## Phase 2: SQLite Schema Contract — Column Additions to Existing Tables

**File:** `docs/System/SQLite_Schema_Contract.md`
**Priority:** Complete alongside Phase 1.

### 2A. `spec_families` Table — Add `context` Column

- Add: `context` TEXT (e.g., "NC" for new construction, "REPAINT" for repaint)
- JSON path: `spec_family.context`

**Status:** [x] DONE

### 2B. `spec_configuration_dimensions` Table — Add Missing Columns

- Add: `prohibited` TEXT (JSON array of prohibited values, e.g., QT5 prohibited for primer)
- JSON path: `configuration_dimensions[].prohibited`

**Status:** [x] DONE

### 2C. `spec_paintable_item_types` Table — Add Conditional Columns

- Add: `conditional` INTEGER (0/1 boolean)
- Add: `conditional_on` TEXT (JSON object — conditions for item inclusion)
- JSON paths: `paintable_items[].conditional`, `paintable_items[].conditional_on` or `.condition`

**Status:** [x] DONE

### 2D. `spec_variants` Table — Add Cabinet-Pattern Columns

- Add: `coats_primer` INTEGER
- Add: `coats_finish` INTEGER
- Add: `round_id` TEXT (FK reference to sop_round_configurations.round_id — optional, only used by multi-round specs)
- Add: `protection_zones` TEXT (JSON array of zone IDs for this variant)
- These columns are nullable — only populated by specs that use them (cabinets, etc.)

**Status:** [x] DONE

### 2E. `spec_required_inputs` Table — Add `status` Column

- Add: `status` TEXT (e.g., "existing", "proposed")
- JSON path: `required_paintscope_inputs[].status`
- Document: `is_required` column maps from actual JSON field named `required`

**Status:** [x] DONE

### 2F. `spec_state_declarations` Table — Fix `valid_input_states` Shape

- Document that `valid_input_states` is stored as JSON TEXT containing `{"states": [...], "notes": "..."}`
- The column type stays TEXT, but the documented shape changes from "JSON array" to "JSON object with states array and notes string"
- No structural table change needed, just documentation correction

**Status:** [x] DONE

### 2G. `spec_adjacency_declarations` — Document Array Variation

- Document that `adjacency_declarations` can be a single object (one primary_surface) or an array of objects (multiple primary_surfaces)
- The table design already handles both — each adjacent_surface becomes one row regardless
- Spec Importer must handle both shapes (check if array, iterate; if object, wrap in array)

**Status:** [x] DONE

### 2H. `sop_tasks` Table — Add Missing Columns

- Add: `qt_behavior` TEXT (e.g., "all_tiers_identical", "rate_varies_by_tier", "tier_specific")
- JSON path: `tasks[].qt_behavior`
- Note: `site_condition_rules` stored as JSON TEXT if present, otherwise null

**Status:** [x] DONE

### 2I. `sop_modules` Table — Remove Non-Existent Columns

- Remove: `run_rule` (not in actual JSON)
- Remove: `run_count_formula` (not in actual JSON)
- These were conceptual fields that didn't make it into the actual spec schema

**Status:** [x] DONE

### 2J. Add `consumable_notes` Handling

- Option: Add `consumable_notes` TEXT column to `spec_families` table (stores JSON object)
- Or: Skip for v1, preserved in raw JSON
- Decision: Store as JSON TEXT on a new column on... actually this belongs to materials, not spec_families. Add as a note in the contract that `consumable_notes` from materials.json is preserved in `spec_artifacts_raw` only for v1.

**Status:** [x] DONE

---

## Phase 3: SQLite Schema Contract — Metadata Updates

**File:** `docs/System/SQLite_Schema_Contract.md`

### 3A. Update FK Relationships Diagram (Section 5)

Reflect all table additions/removals:
- Add: `material_system_products` → `material_systems`
- Add: `sop_round_configurations` → `spec_families`
- Remove: `material_compatibility_rules`
- Remove: `spec_qa_issues` (if removed per 1H)
- Add: `spec_variants.round_id` → `sop_round_configurations` (optional FK)

**Status:** [x] DONE

### 3B. Update Index Strategy (Section 4)

- Add index for `material_system_products(spec_family_id, system_id)`
- Add index for `sop_round_configurations(spec_family_id)`
- Remove index references for removed tables

**Status:** [x] DONE

### 3C. Update JSON Storage Decisions Table (Section 6)

- Add: `material_system_products.example_products` — JSON array
- Add: `factor_modifiers.condition` — JSON object
- Add: `sop_round_configurations.phase_sequence` — JSON array
- Add: `sop_round_configurations.applies_when` — JSON object
- Add: `task_production_rates.applies_when` — JSON object
- Remove: `material_systems.coat_sequence`, `compatible_substrates`
- Remove: `material_compatibility_rules` entries

**Status:** [x] DONE

### 3D. Update Deletion Order (Section 7)

Reflect table additions/removals in the deletion cascade order.

**Status:** [x] DONE

### 3E. Document Tier 3 Metadata Fields (Raw-Only)

Add a new section or note documenting spec.json keys that are preserved in `spec_artifacts_raw` but NOT normalized into dedicated tables for v1:
- `research_corrections` / `inherited_research_corrections`
- `critical_constraints` (in spec.json, sop_modules.json, production.json)
- `cross_spec_coordination`
- `doctrine_references`
- `sequencing_notes`
- `relationships` (companion_specs, shares_finish_group_with, etc.)
- `consumable_notes` (materials.json)
- `crew_configurations` (production.json)
- `coupling_constraints` (production.json)

Rationale: These are governance/coordination metadata. The Estimation Engine doesn't query them. They're fully preserved in raw JSON for future use.

**Status:** [x] DONE

### 3F. Update Version History

Bump version to 1.1.0. Document all changes.

**Status:** [x] DONE

---

## Phase 4: Spec Importer Agent Corrections

**File:** `agents/spec-importer.md`
**Depends on:** Phases 1-3 complete (Schema Contract is the importer's primary doctrine)

### 4A. Update Decomposition Mapping Table (Step 4-8)

The mapping tables in the Spec Importer must match the corrected Schema Contract:
- Step 5 (materials.json): Add `material_system_products` target table, remove `material_compatibility_rules`
- Step 6 (sop_modules.json): Add `sop_round_configurations` target table
- Step 7 (production.json): Update factor_modifiers mapping to show modifier_category discriminator, update task_production_rates to show flat rate fields
- Step 8 (qa_report.json): Simplify to summary + blob, remove spec_qa_issues

**Status:** [x] DONE

### 4B. Update JSON-to-Column Mapping Details

- Add new "Flattened Values" entries for added columns
- Add new "JSON TEXT Storage" entries for added JSON columns
- Update "Array Explosion" entries for material_system_products
- Remove references to removed tables/columns

**Status:** [x] DONE

### 4C. Update Import Report Format

- Add `material_system_products` to the example rows_inserted counts
- Add `sop_round_configurations` to the example
- Remove `material_compatibility_rules` and `spec_qa_issues`

**Status:** [x] DONE

### 4D. Document Adjacency Shape Handling

Add a note in the workflow: when reading `adjacency_declarations`, check if it's an array or single object. If single object, wrap in array before iterating.

**Status:** [x] DONE

### 4E. Document Factor Modifier Mapping Logic

Add explicit documentation of how domain-specific arrays map to the unified table:
- `height_effects[]` → modifier_category = "height"
- `texture_effects[]` → modifier_category = "texture"
- `drywall_level_effects[]` → modifier_category = "drywall_level"
- Cabinet-style `factor_modifiers[]` → modifier_category from factor type, preserve applies_to_tasks linkage

**Status:** [x] DONE

---

## Phase 5: DB Validator Agent Corrections

**File:** `agents/db-validator.md`
**Depends on:** Phases 1-3 complete

### 5A. Update FK Integrity Checks Table

- Add FK checks for `material_system_products`
- Add FK checks for `sop_round_configurations`
- Remove FK checks for `material_compatibility_rules`
- Remove FK checks for `spec_qa_issues` (if table removed)

**Status:** [x] DONE

### 5B. Update Completeness Checks

- Add: CMP-015 — Every material_system has ≥1 product in material_system_products (MAJOR)
- Add: CMP-016 — Specs with multi-round variants have ≥1 round_configuration (MAJOR)
- Remove: References to material_compatibility_rules completeness
- Update CMP-010 (qa report check) to reflect simplified structure

**Status:** [x] DONE

### 5C. Update ID Pattern Checks

- Add: IDP-010 — sop_round_configurations.round_id matches `^ROUND_[A-Z0-9_]+$`
- Verify factor_modifiers ID pattern still works with unified table

**Status:** [x] DONE

### 5D. Update Enum Validation Checks

- Add: ENM-008 — factor_modifiers.modifier_category matches controlled vocabulary (height, texture, drywall_level, door_style, etc.)

**Status:** [x] DONE

---

## Phase 6: Schema Engineer Agent + Minor Fixes

**File:** `agents/schema-engineer.md`
**Depends on:** Phases 1-3 complete

### 6A. Update Critical Constraints Section

- Add `material_system_products` to the list of tables requiring `spec_family_id` FK
- Add `sop_round_configurations` to the list
- Remove `material_compatibility_rules` references
- Note that `spec_qa_issues` is removed (if applicable)

**Status:** [x] DONE

### 6B. Update Orchestrator — Fix Registry Path

**File:** `agents/datafactory-orchestrator.md`
**Change:** Line 20, Required Reading table — change `database/imports/_import_registry.md` to `database/imports/Import_Registry.md`

**Status:** [x] DONE

---

## Phase 7: Update DataFactory Implementation Plan

**File:** `DataFactory_Implementation_Plan.md` (root level)
**Depends on:** All phases above

### 7A. Update Section 4 Deliverables

- Update 3C (spec-importer.md) decomposition mapping table to reflect all corrections
- Update 3D (db-validator.md) validation categories table
- Update 2A (create_tables.sql) table list

**Status:** [x] DONE

### 7B. Update Open Questions

Mark resolved:
- Q2 (version coexistence) — decided: replace, raw preserved
- Q4 (controlled enums in DB) — decided: store as reference tables
- Q5 (resolution.json) — decided: raw-only
- Add any new open questions discovered during corrections

**Status:** [x] DONE

---

## Execution Order Summary

| Phase | What | Depends On | Status |
|-------|------|-----------|--------|
| 1 (1A-1I) | Schema Contract structural fixes | Nothing | [x] DONE |
| 2 (2A-2J) | Schema Contract column additions | Phase 1 | [x] DONE |
| 3 (3A-3F) | Schema Contract metadata updates | Phases 1-2 | [x] DONE |
| 4 (4A-4E) | Spec Importer agent corrections | Phase 3 | [x] DONE |
| 5 (5A-5D) | DB Validator agent corrections | Phase 3 | [x] DONE |
| 6 (6A-6B) | Schema Engineer + Orchestrator fixes | Phase 3 | [x] DONE |
| 7 (7A-7B) | Implementation Plan updates | Phases 4-6 | [x] DONE |

**Phases 4, 5, and 6 can be done in parallel once Phase 3 is complete.**

---

## Session Resume Instructions

If a session runs out of tokens mid-work:
1. Check this file for the last completed status marker
2. Read the corrected `docs/System/SQLite_Schema_Contract.md` to see current state
3. Continue from the first `[ ] NOT STARTED` item
4. After completing each sub-item, update its status to `[x] DONE`

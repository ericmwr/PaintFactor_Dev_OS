# **Spec → Database Mapping Guide**

## **Purpose**

This document defines how the SpecFactory artifact set:

* `spec.json`

* `materials.json`

* `sop_modules.json`

* `production.json`

* `qa_report.json`

* `CHANGELOG.md`

maps into a relational database (Supabase/Postgres) to support deterministic estimation and scope generation.

This is a **development-time contract**: if we keep artifacts and schema aligned, importing specs becomes reliable and repeatable.

---

## **Guiding Principles**

### **Deterministic runtime**

PaintFactor runtime should not depend on LLM reasoning. Specs should import into DB tables, and calculations should be performed by:

* SQL functions / RPCs

* application logic (if needed)

* rule-based selection (variants/applicability)

### **Separation of concerns**

* **Spec structure** (families/variants/items) ≠ **SOP content** ≠ **Materials systems** ≠ **Production logic**

* Keep them in separate tables and link by IDs.

### **Versioned artifacts**

Every imported artifact must be stored with:

* `version`

* `status` (draft/review\_required/approved/deprecated)

* `review_required`

* provenance and change log

---

## **Recommended Core Tables**

This is the minimum schema to cleanly map the templates.

### **1 Spec families and variants**

#### **`spec_families`**

**Maps from:** `spec.json > spec_family`

Columns (suggested):

* `id` (PK, text) — `SPEC_FAMILY_ID`

* `name` (text)

* `description` (text)

* `domain` (text) — interior/exterior/specialty

* `version` (text) — `0.1.0`

* `status` (text) — draft/review\_required/approved/deprecated

* `review_required` (bool)

* `created_at`, `updated_at` (timestamptz)

* `created_by`, `reviewed_by` (text nullable)

#### **`spec_configuration_dimensions`**

**Maps from:** `spec.json > configuration_dimensions[]`

Columns:

* `id` (PK, text) — `quality_level`, `surface_type`, etc.

* `spec_family_id` (FK → spec\_families.id)

* `description` (text)

* `allowed_values` (jsonb array) — `["QL-3","QL-4","QL-5"]`

* `sort_order` (int)

#### **`spec_paintable_item_types`**

**Maps from:** `spec.json > paintable_items[]`

Columns:

* `id` (PK, text) — `DOOR_SIDE`, `WALL_DRYWALL`, etc.

* `spec_family_id` (FK)

* `name` (text)

* `unit_of_measure` (text) — EA/LF/SF

* `counting_rules` (text)

* `notes` (text)

#### **`spec_variants`**

**Maps from:** `spec.json > variants[]`

Columns:

* `id` (PK, text)

* `spec_family_id` (FK)

`applies_when` (jsonb)  
 Example:

 `{"quality_level":["QL-3","QL-4"],"surface_type":["walls"],"other_dimensions":{}}`

*   
* `notes` (text)

#### **`spec_variant_item_inclusions`**

**Maps from:** `spec.json > variants[].included_items[] / excluded_items[]`

Columns:

* `id` (PK, bigserial)

* `spec_variant_id` (FK → spec\_variants.id)

* `item_type_id` (FK → spec\_paintable\_item\_types.id)

* `is_included` (bool)

Why separate table? Because “included/excluded items” becomes queryable and indexable.

---

### **2 Materials systems**

#### **`material_systems`**

**Maps from:** `materials.json > material_systems[]`

Columns:

* `id` (PK, text) — `SYS_TRIM_QL3_ACRYLIC_ENAMEL`

* `spec_family_id` (FK)

* `name` (text)

* `quality_level` (text)

* `coat_sequence` (jsonb array of strings)

* `compatible_substrates` (jsonb)

* `cleanup_class` (text) — water/solvent/hybrid

* `notes` (jsonb or text)

#### **`material_coverage_profiles`**

**Maps from:** `materials.json > coverage_profiles[]`

Columns:

* `id` (PK, bigserial)

* `spec_family_id` (FK)

* `material_system_id` (FK → material\_systems.id)

* `spread_rate_sqft_per_gallon` (numeric)

* `loss_factor_percent` (numeric)

* `profile_sensitivity_notes` (text)

#### **`material_consumable_models`**

**Maps from:** `materials.json > consumable_usage_models[]`

Columns:

* `id` (PK, bigserial)

* `spec_family_id` (FK)

* `consumable_type` (text) — roller\_cover/brush/spray\_tip/tape/plastic/abrasive/solvent

* `recommended_class` (text) — standard/premium/gallery

* `usage_rate` (text) — keep as text early, normalize later

* `quality_sensitivity` (text)

* `notes` (text)

#### **`material_compatibility_rules`**

**Maps from:** `materials.json > compatibility_rules[]`

Columns:

* `id` (PK, bigserial)

* `spec_family_id` (FK)

* `rule` (text)

* `risk` (text)

* `mitigation` (text)

Later you can normalize into a global catalog, but spec-level first is fine.

---

### **3 SOP modules and tasks**

#### **`sop_modules`**

**Maps from:** `sop_modules.json > sop_modules[]`

Columns:

* `id` (PK, text)

* `spec_family_id` (FK)

* `name` (text)

* `purpose` (text)

* `applies_to` (jsonb) — your dimension filter block

#### **`sop_tasks`**

**Maps from:** `sop_modules.json > tasks[]`

Columns:

* `id` (PK, text)

* `spec_family_id` (FK)

* `module_id` (FK → sop\_modules.id)

* `name` (text)

* `task_type` (text) — prep/prime/finish/inspect/protect/repair

* `round_number` (int)

* `inputs` (jsonb)

* `outputs` (jsonb)

* `notes` (text)

#### **`sop_module_task_map`**

**Maps from:** `sop_modules.json > module_task_map[]`

You can skip this table if you always store `module_id` on tasks.  
 Keep it only if tasks can belong to multiple modules.

---

### **4 Production logic (rates \+ factors)**

#### **`task_production_rates`**

**Maps from:** `production.json > task_production_rates[]`

Columns:

* `id` (PK, bigserial)

* `spec_family_id` (FK)

* `task_id` (FK → sop\_tasks.id)

* `unit_of_measure` (text)

* `rate_per_hour` (numeric)

* `crew_size` (int)

* `notes` (text)

#### **`factor_modifiers`**

**Maps from:** `production.json > factor_modifiers[]`

Columns:

* `id` (PK, text) — stable `FACTOR_ID` strongly recommended

* `spec_family_id` (FK) — optional if factors are global; keep spec-level early

* `description` (text)

* `modifier_type` (text) — multiplier/additive

* `value_min` (numeric)

* `value_max` (numeric)

* `notes` (text)

#### **`factor_task_applicability`**

**Maps from:** `production.json > factor_modifiers[].applies_to_tasks[]`

Columns:

* `id` (PK, bigserial)

* `factor_id` (FK → factor\_modifiers.id)

* `task_id` (FK → sop\_tasks.id)

#### **`quality_effects`**

**Maps from:** `production.json > quality_effects[]`

Columns:

* `id` (PK, bigserial)

* `spec_family_id` (FK)

* `quality_level` (text)

* `description` (text)

* `primary_mechanism` (text) — additional\_rounds/selective\_multiplier

* `notes` (text)

---

### **5 QA, status, and changelog**

#### **`spec_qa_reports`**

**Maps from:** `qa_report.json`

Columns:

* `id` (PK, bigserial)

* `spec_family_id` (FK)

* `version` (text)

* `reviewed_by` (text)

* `status` (text) — pass/pass\_with\_warnings/fail

* `summary` (text)

* `review_notes` (jsonb)

#### **`spec_qa_issues`**

**Maps from:** `qa_report.json > issues[]`

Columns:

* `id` (PK, bigserial)

* `qa_report_id` (FK → spec\_qa\_reports.id)

* `severity` (text)

* `area` (text)

* `description` (text)

* `suggested_fix` (text)

* `recommended_agent` (text)

#### **`spec_change_log`**

**Maps from:** `spec.json > change_log[]` \+ `CHANGELOG.md`

Columns:

* `id` (PK, bigserial)

* `spec_family_id` (FK)

* `version` (text)

* `date` (date)

* `author` (text)

* `summary` (text)

* `notes` (text nullable)

`CHANGELOG.md` is human-readable; DB changelog is queryable truth.

---

## **Import Strategy**

### **Phase 1: Import JSON as-is (fast path)**

Store raw artifact JSON in a `spec_artifacts_raw` table while also parsing core tables.

Table: `spec_artifacts_raw`

* `id` (PK)

* `spec_family_id`

* `artifact_type` (spec/materials/sop/production/qa)

* `version`

* `status`

* `json` (jsonb)

* timestamps

This gives you safety: if normalization changes, you still have original truth.

### **Phase 2: Normalize core tables (recommended long-term)**

Use a deterministic importer script (or edge function) that:

* validates IDs and referential integrity

* rejects missing required fields

* enforces version rules

---

## **Query Patterns You’ll Want Later**

### **Build a spec variant “selection”**

Given a user’s inputs (quality, substrate, method):

1. identify `spec_family`

2. find matching `spec_variants` using `applies_when` jsonb query

3. collect included `paintable_item_types`

4. load applicable `sop_modules` by applies\_to rules

5. collect tasks (including rounds)

6. attach:

   * material systems (by quality)

   * production rates (by task\_id)

   * factors (by applicable tasks)

This can become an RPC like:

* `select_spec_plan(spec_family_id, config_json) -> plan_json`

---

## **Normalization Notes (What to keep flexible)**

### **Keep these flexible initially (text/jsonb OK)**

* `usage_rate` (consumables)

* `coat_sequence` strings

* `applies_when` and `applies_to` logic blocks

Normalize later when:

* you have 30–50 spec families

* patterns stabilize

* you want strict referential catalogs

---

## **Validation Rules to Enforce (Importer Gate)**

Minimum validation checks:

* every referenced `task_id` exists

* module/task IDs are unique within a family

* `quality_level` values are valid

* `rate_per_hour` must be \> 0 for required tasks

* `status` and `version` exist on each artifact

* `review_required` true by default unless human marks approved

* QA fail blocks “approved” status promotion

---

## **Recommendation: Establish Canonical ID Conventions Early**

Examples:

* spec family: `SF_DOORS_INT_REPAINT`

* modules: `MOD_PREP_GENERAL`, `MOD_MASK_GLASS`

* tasks: `TSK_SAND_BLOCK_R1`, `TSK_INSPECT_FINAL`

* material systems: `SYS_TRIM_QL4_MOD_URETHANE`

* factors: `FAC_HEIGHT_9FT_12FT`, `FAC_DETAIL_HIGH`

Stable IDs are the backbone of deterministic systems.


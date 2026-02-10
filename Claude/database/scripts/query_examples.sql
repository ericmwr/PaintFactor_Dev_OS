-- PaintFactor Query Examples
-- Purpose: Reference queries that demonstrate Estimation Engine patterns.
-- These serve as acceptance tests for the schema.
-- Version: 1.0.0
-- Created: 2026-02-09

PRAGMA foreign_keys = ON;

-- ============================================================
-- Q1: List all imported spec families with their status
-- ============================================================
SELECT id, name, domain, version, status
FROM spec_families
ORDER BY domain, name;


-- ============================================================
-- Q2: For a spec family, get all configuration dimensions and their values
-- ============================================================
SELECT dimension_id, description, allowed_values, default_value
FROM spec_configuration_dimensions
WHERE spec_family_id = 'SF_TRIM_NC_PAINT'
ORDER BY sort_order;


-- ============================================================
-- Q3: Variant resolution — find matching variant given quality tier + method
--     (Engine does this at runtime with project-specific inputs)
-- ============================================================
SELECT v.id AS variant_id, v.applies_when, v.notes
FROM spec_variants v
WHERE v.spec_family_id = 'SF_TRIM_NC_PAINT'
  AND (
    json_extract(v.applies_when, '$.quality_tier') IS NULL
    OR EXISTS (
      SELECT 1 FROM json_each(json_extract(v.applies_when, '$.quality_tier'))
      WHERE value = 'QT4'
    )
  )
  AND (
    json_extract(v.applies_when, '$.application_method') IS NULL
    OR EXISTS (
      SELECT 1 FROM json_each(json_extract(v.applies_when, '$.application_method'))
      WHERE value = 'brush'
    )
  );


-- ============================================================
-- Q4: For a variant, get all included paintable items
-- ============================================================
SELECT i.item_id, p.name, p.unit_of_measure, p.counting_rules
FROM spec_variant_item_inclusions i
JOIN spec_paintable_item_types p
  ON i.item_id = p.id AND i.spec_family_id = p.spec_family_id
WHERE i.spec_family_id = 'SF_TRIM_NC_PAINT'
  AND i.variant_id = 'VAR_TRIM_BRUSH_QT3'
  AND i.is_included = 1;


-- ============================================================
-- Q5: Get ordered task sequence for a spec family
--     (modules ordered by phase, tasks ordered within modules)
-- ============================================================
SELECT
    m.phase,
    m.id AS module_id,
    m.name AS module_name,
    t.id AS task_id,
    t.name AS task_name,
    t.task_classification,
    t.skill_level,
    m.sort_order AS module_order,
    t.sort_order AS task_order
FROM sop_modules m
JOIN sop_tasks t ON m.id = t.module_id AND m.spec_family_id = t.spec_family_id
WHERE m.spec_family_id = 'SF_TRIM_NC_PAINT'
ORDER BY m.sort_order, t.sort_order;


-- ============================================================
-- Q6: Get production rates for all tasks in a spec family at a given tier
-- ============================================================
SELECT
    t.id AS task_id,
    t.name AS task_name,
    r.unit_of_measure,
    r.paintscope_key,
    json_extract(r.rates_by_tier, '$.QT4.rate_per_hour') AS rate_qt4,
    r.crew_size,
    r.notes
FROM sop_tasks t
JOIN task_production_rates r
  ON t.id = r.task_id AND t.spec_family_id = r.spec_family_id
WHERE t.spec_family_id = 'SF_TRIM_NC_PAINT'
ORDER BY t.sort_order;


-- ============================================================
-- Q7: Get material system for a spec family at a given quality tier
-- ============================================================
SELECT ms.id, ms.name, ms.description, ms.allowed_sheens,
       msp.product_role, msp.product_type, msp.coats_required
FROM material_systems ms
LEFT JOIN material_system_products msp
  ON ms.id = msp.system_id AND ms.spec_family_id = msp.spec_family_id
WHERE ms.spec_family_id = 'SF_TRIM_NC_PAINT'
  AND EXISTS (
    SELECT 1 FROM json_each(json_extract(ms.applies_when, '$.quality_tier'))
    WHERE value = 'QT4'
  )
ORDER BY ms.id, msp.product_role;


-- ============================================================
-- Q8: Get applicable factor modifiers for a specific task
-- ============================================================
SELECT
    f.id AS factor_id,
    f.name,
    f.description,
    f.modifier_type,
    f.value,
    f.condition
FROM factor_modifiers f
JOIN factor_task_applicability a
  ON f.id = a.factor_id AND f.spec_family_id = a.spec_family_id
WHERE a.spec_family_id = 'SF_TRIM_NC_PAINT'
  AND a.task_id = 'TSK_TRIM_BRUSH_FINISH_R1';


-- ============================================================
-- Q9: Get protection zones for a spec family
-- ============================================================
SELECT zone_id, condition, protection_level,
       upgrades_to_zone, upgrades_to_level, upgrade_condition, notes
FROM spec_protection_zones
WHERE spec_family_id = 'SF_TRIM_NC_PAINT'
ORDER BY zone_id;


-- ============================================================
-- Q10: Get adjacency declarations for finish group coordination
-- ============================================================
SELECT primary_surface, adjacent_surface_id, edge_type,
       typical_relationship, continuity_rate_modifier, affected_tasks
FROM spec_adjacency_declarations
WHERE spec_family_id = 'SF_TRIM_NC_PAINT';


-- ============================================================
-- Q11: Get state declarations (input → output state transition)
-- ============================================================
SELECT primary_surface, valid_input_states,
       output_state, output_state_varies_by, output_state_map
FROM spec_state_declarations
WHERE spec_family_id = 'SF_TRIM_NC_PAINT';


-- ============================================================
-- Q12: Get quality tier effects (how QT affects work scope)
-- ============================================================
SELECT quality_tier, description, mechanism, effect_details
FROM quality_tier_effects
WHERE spec_family_id = 'SF_TRIM_NC_PAINT'
ORDER BY quality_tier;


-- ============================================================
-- Q13: Full bill of materials — systems + coverage + consumables
-- ============================================================
SELECT 'system' AS type, ms.id, ms.name, ms.description, NULL AS extra
FROM material_systems ms
WHERE ms.spec_family_id = 'SF_TRIM_NC_PAINT'
UNION ALL
SELECT 'coverage', cp.id, cp.product_role,
       printf('%.0f SF/gal (%.0f-%.0f)', cp.coverage_sf_per_gallon, cp.coverage_range_low, cp.coverage_range_high),
       cp.coverage_model
FROM material_coverage_profiles cp
WHERE cp.spec_family_id = 'SF_TRIM_NC_PAINT'
UNION ALL
SELECT 'consumable', mc.id, mc.name, mc.consumable_category, mc.unit
FROM material_consumables mc
WHERE mc.spec_family_id = 'SF_TRIM_NC_PAINT';


-- ============================================================
-- Q14: Import status overview
-- ============================================================
SELECT
    sf.id,
    sf.name,
    sf.version,
    sf.status AS spec_status,
    il.import_status,
    il.validation_status,
    il.imported_at
FROM spec_families sf
LEFT JOIN import_log il ON sf.id = il.spec_family_id AND sf.version = il.version
ORDER BY sf.id;


-- ============================================================
-- Q15: Cross-family stats — row counts per table per spec family
-- ============================================================
SELECT
    sf.id,
    (SELECT count(*) FROM sop_modules WHERE spec_family_id = sf.id) AS modules,
    (SELECT count(*) FROM sop_tasks WHERE spec_family_id = sf.id) AS tasks,
    (SELECT count(*) FROM material_systems WHERE spec_family_id = sf.id) AS mat_systems,
    (SELECT count(*) FROM task_production_rates WHERE spec_family_id = sf.id) AS prod_rates,
    (SELECT count(*) FROM factor_modifiers WHERE spec_family_id = sf.id) AS factors,
    (SELECT count(*) FROM spec_protection_zones WHERE spec_family_id = sf.id) AS prot_zones
FROM spec_families sf
ORDER BY sf.id;

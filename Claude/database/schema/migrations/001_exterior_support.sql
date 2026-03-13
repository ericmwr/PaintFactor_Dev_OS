-- Migration 001: Exterior Spec Support
-- Date: 2026-03-12
-- Reason: Add columns and enum values needed for exterior spec import.
--         Interior specs are unaffected (new columns are all nullable).

-- ============================================================
-- New Columns
-- ============================================================

-- spec_paintable_item_types: PaintScope surface reference
ALTER TABLE spec_paintable_item_types ADD COLUMN surface_ref TEXT;

-- spec_state_declarations: Per-substrate primer routing
ALTER TABLE spec_state_declarations ADD COLUMN primer_routing TEXT;  -- JSON object

-- material_systems: System-level product role
ALTER TABLE material_systems ADD COLUMN product_role TEXT;

-- material_coverage_profiles: Waste and UOM
ALTER TABLE material_coverage_profiles ADD COLUMN waste_factor REAL;
ALTER TABLE material_coverage_profiles ADD COLUMN uom_basis TEXT;

-- sop_tasks: Exterior task-level rules
ALTER TABLE sop_tasks ADD COLUMN substrate_state_rules TEXT;  -- JSON array
ALTER TABLE sop_tasks ADD COLUMN site_condition_rules TEXT;   -- JSON object

-- factor_modifiers: Multi-value modifier maps
ALTER TABLE factor_modifiers ADD COLUMN values_map TEXT;  -- JSON object

-- task_production_rates: Per-tier QC criteria
ALTER TABLE task_production_rates ADD COLUMN defect_tolerance TEXT;  -- JSON object

-- ============================================================
-- New Enum Seeds
-- ============================================================

-- Exterior substrate states
INSERT OR IGNORE INTO ref_substrate_states (value, description) VALUES
    ('SS_EXT_PRIMED_FACTORY', 'Exterior factory-primed substrate (transit protection only — field prime mandatory)'),
    ('SS_EXT_BARE_FIBERCEMENT', 'Bare fiber cement (pH 13.0, no factory primer — requires alkali-resistant primer)'),
    ('SS_EXT_PRIMED_FIELD', 'Exterior field-primed substrate (ready for topcoat)'),
    ('SS_EXT_FACTORY_FINISHED', 'Factory-finished exterior substrate (ColorPlus/ExpertFinish — requires bonding primer)'),
    ('SS_EXT_PAINTED_FLAT', 'Exterior painted finish — flat sheen'),
    ('SS_EXT_PAINTED_SATIN', 'Exterior painted finish — satin sheen'),
    ('SS_EXT_PAINTED_SEMIGLOSS', 'Exterior painted finish — semi-gloss sheen'),
    ('SS_EXT_BARE_WOOD', 'Exterior bare wood (new construction or stripped)'),
    ('SS_EXT_SOUND_PAINT', 'Exterior sound existing paint (adhered, minimal chalk)'),
    ('SS_EXT_CHALKING', 'Exterior chalking paint (surface chalk present)'),
    ('SS_EXT_FAILING_PAINT', 'Exterior failing paint (cracking, alligatoring)'),
    ('SS_EXT_PEELING', 'Exterior peeling paint (active coating lifting)'),
    ('SS_EXT_WEATHERED', 'Exterior weathered wood (grayed, UV-damaged)'),
    ('SS_EXT_STAINED_SOLID', 'Exterior solid stain (treat as painted — compatible with paint topcoat)'),
    ('SS_EXT_STAINED_SEMI', 'Exterior semi-transparent stain (cannot paint over — re-stain only)');

-- Modifier mechanisms
INSERT OR IGNORE INTO ref_modifier_mechanisms (value, description) VALUES
    ('time_multiplier', 'Rate is multiplied by a factor (e.g., access type, profile complexity)');

-- Application methods
INSERT OR IGNORE INTO ref_application_methods (value, description) VALUES
    ('spray_backbrush', 'Spray followed by immediate backbrushing to work product into substrate grain (exterior siding/fence)');

-- ============================================================
-- Verification
-- ============================================================

-- Verify new columns exist
SELECT count(*) AS paintable_items_surface_ref FROM pragma_table_info('spec_paintable_item_types') WHERE name = 'surface_ref';
SELECT count(*) AS state_decl_primer_routing FROM pragma_table_info('spec_state_declarations') WHERE name = 'primer_routing';
SELECT count(*) AS material_sys_product_role FROM pragma_table_info('material_systems') WHERE name = 'product_role';
SELECT count(*) AS coverage_waste_factor FROM pragma_table_info('material_coverage_profiles') WHERE name = 'waste_factor';
SELECT count(*) AS sop_tasks_substrate_rules FROM pragma_table_info('sop_tasks') WHERE name = 'substrate_state_rules';
SELECT count(*) AS factor_mod_values_map FROM pragma_table_info('factor_modifiers') WHERE name = 'values_map';
SELECT count(*) AS prod_rates_defect_tol FROM pragma_table_info('task_production_rates') WHERE name = 'defect_tolerance';

-- Verify exterior substrate states seeded
SELECT count(*) AS ext_substrate_states FROM ref_substrate_states WHERE value LIKE 'SS_EXT_%';

-- PaintFactor Reference Enum Tables
-- Generated from: specs/_registry/controlled_enums.json v1.0.0
-- Purpose: Queryable reference tables for controlled vocabulary values.
--          These are NOT FK-referenced by main tables (which use CHECK constraints).
--          They serve as a single DB-queryable source of truth for valid enum values.
-- Usage: sqlite3 database/paintfactor.db < database/schema/seed_enums.sql
--
-- IMPORTANT: Run create_tables.sql first.

-- ============================================================
-- Reference Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS ref_quality_tiers (
    value       TEXT PRIMARY KEY,
    description TEXT,
    sort_order  INTEGER
);

CREATE TABLE IF NOT EXISTS ref_application_methods (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_sheens (
    value       TEXT PRIMARY KEY,
    description TEXT,
    sort_order  INTEGER
);

CREATE TABLE IF NOT EXISTS ref_phases (
    value       TEXT PRIMARY KEY,
    description TEXT,
    sort_order  INTEGER
);

CREATE TABLE IF NOT EXISTS ref_task_classifications (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_task_types (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_skill_levels (
    value       TEXT PRIMARY KEY,
    description TEXT,
    sort_order  INTEGER
);

CREATE TABLE IF NOT EXISTS ref_units_of_measure (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_domains (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_spec_statuses (
    value       TEXT PRIMARY KEY,
    description TEXT,
    sort_order  INTEGER
);

CREATE TABLE IF NOT EXISTS ref_consumable_categories (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_consumable_units (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_product_roles (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_protection_levels (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_substrate_states (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_surface_textures (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_drywall_finish_levels (
    value       TEXT PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref_severities (
    value       TEXT PRIMARY KEY,
    description TEXT,
    sort_order  INTEGER
);

CREATE TABLE IF NOT EXISTS ref_modifier_mechanisms (
    value       TEXT PRIMARY KEY,
    description TEXT
);

-- ============================================================
-- Seed Data
-- ============================================================

-- Quality Tiers
INSERT OR REPLACE INTO ref_quality_tiers (value, description, sort_order) VALUES
    ('QT2', 'Economy/Minimal - reduced prep, relaxed tolerances, fewer rounds', 1),
    ('QT3', 'Standard - baseline for all rates and processes', 2),
    ('QT4', 'Premium - thorough prep, systematic inspection, tighter tolerances', 3),
    ('QT5', 'Superior - maximum effort, critical inspection, near-zero defect tolerance', 4);

-- Application Methods
INSERT OR REPLACE INTO ref_application_methods (value, description) VALUES
    ('brush', 'Brush-only application (detail work, occupied spaces, trim/frames)'),
    ('brush_roll', 'Brush and roller combination (closet shelves, small surfaces)'),
    ('roll', 'Roller-only application (walls, ceilings without spray)'),
    ('spray', 'Airless spray without backroll (economy ceiling, pre-install surfaces)'),
    ('spray_backroll', 'Spray followed by immediate backroll with 18" roller (standard NC production)'),
    ('spray_rolloff', 'Spray with light rolloff to work product into substrate grain (bare wood primer)');

-- Sheens
INSERT OR REPLACE INTO ref_sheens (value, description, sort_order) VALUES
    ('flat', 'No sheen, maximum hide. Standard for ceilings.', 1),
    ('matte', 'Near-flat with very slight sheen. Rarely specified.', 2),
    ('eggshell', 'Low sheen. Common for walls QT3+.', 3),
    ('satin', 'Medium sheen. Standard for trim/millwork QT3.', 4),
    ('semi-gloss', 'High sheen. Standard for trim/frames QT4.', 5),
    ('gloss', 'Maximum sheen. Premium trim QT5.', 6);

-- Phases
INSERT OR REPLACE INTO ref_phases (value, description, sort_order) VALUES
    ('setup', 'Protection setup, floor covering, hardware masking, fixture removal', 1),
    ('prep', 'Surface preparation - sanding, filling, caulking, dust removal, inspection/repair', 2),
    ('prime', 'Primer application (conditional on substrate state)', 3),
    ('apply', 'Generic coating application (used when phase is not specifically prime or finish)', 4),
    ('interstage', 'Between-coat maintenance - inspect, sand, patch, clean dust', 5),
    ('finish', 'Finish coat application, mortise touchup', 6),
    ('cleanup', 'Protection teardown, final inspection, tool cleaning, vacuum', 7);

-- Task Classifications
INSERT OR REPLACE INTO ref_task_classifications (value, description) VALUES
    ('binary', 'Same rate at all quality tiers. The task is done or not done.'),
    ('qt_conditional', 'Task only appears in certain quality tiers. Rate may or may not vary.'),
    ('qt_scaled', 'Task exists at all applicable tiers but rate varies - slower at higher QT.');

-- Task Types
INSERT OR REPLACE INTO ref_task_types (value, description) VALUES
    ('prep', 'Surface preparation (sanding, filling, caulking, dust removal)'),
    ('prime', 'Primer application'),
    ('finish', 'Finish coat application'),
    ('apply', 'Generic coating application'),
    ('protect', 'Protection setup or teardown (masking, floor covering)'),
    ('inspect', 'Visual inspection and defect marking'),
    ('cleanup', 'Tool cleaning, area cleanup'),
    ('detail', 'Detail/touch-up work (mortise touch-up, final inspection with touch-up)');

-- Skill Levels
INSERT OR REPLACE INTO ref_skill_levels (value, description, sort_order) VALUES
    ('helper', 'Entry level. Protection setup/teardown, dust removal, tool cleaning.', 1),
    ('journeyman', 'Skilled painter. Application, prep, inspection, interstage work.', 2),
    ('lead', 'Senior painter. Complex application, quality decisions, crew coordination.', 3);

-- Units of Measure
INSERT OR REPLACE INTO ref_units_of_measure (value, description) VALUES
    ('EA', 'Each - one discrete item'),
    ('LF', 'Linear Foot - edge work, trim runs, perimeter'),
    ('SF', 'Square Foot - field area (wall, ceiling, floor protection)'),
    ('EA_ROOM', 'Each Room - per-room heuristic'),
    ('EA_OPENING', 'Each Opening - per opening tier'),
    ('EA_CLOSET', 'Each Closet - per closet unit'),
    ('EA_SIDE', 'Each Side - per side of door slab'),
    ('FIXED', 'Fixed allowance - flat time regardless of quantity');

-- Domains
INSERT OR REPLACE INTO ref_domains (value, description) VALUES
    ('interior', 'Interior surfaces'),
    ('exterior', 'Exterior surfaces'),
    ('specialty', 'Specialty coatings (cabinets, epoxy floors, etc.)');

-- Spec Statuses
INSERT OR REPLACE INTO ref_spec_statuses (value, description, sort_order) VALUES
    ('draft', 'Initial creation, not yet reviewed', 1),
    ('review_required', 'Ready for stakeholder review', 2),
    ('approved', 'Reviewed and accepted for production use', 3),
    ('active', 'Approved and in active production use', 4),
    ('deprecated', 'Superseded by newer version, no longer active', 5),
    ('referenced_not_built', 'Referenced by other specs but not yet created', 6);

-- Consumable Categories
INSERT OR REPLACE INTO ref_consumable_categories (value, description) VALUES
    ('applicator', 'Brushes, rollers, spray tips - items that apply product'),
    ('protection', 'Drop cloths, masking tape, masking paper, rosin paper, plastic sheeting'),
    ('prep', 'Sandpaper, tack cloth, sanding blocks - surface preparation items'),
    ('cleanup', 'Items used for post-work cleanup'),
    ('abrasive', 'Sandpaper, sanding sponges'),
    ('fill_material', 'Spackle, caulk, wood filler'),
    ('tool', 'Reusable tools tracked as consumables (putty knives, sanding blocks)');

-- Consumable Units
INSERT OR REPLACE INTO ref_consumable_units (value, description) VALUES
    ('EA', 'Each (brush, roller cover, sanding block, tack cloth, spray tip)'),
    ('ROLL', 'Roll (masking tape, masking paper, rosin paper)'),
    ('SHEET', 'Sheet (sandpaper)'),
    ('BOX', 'Box (multiple items packaged together)'),
    ('TUBE', 'Tube (caulk)'),
    ('GAL', 'Gallon (paint, primer)'),
    ('QT', 'Quart (edge sealer, specialty primer)'),
    ('PINT', 'Pint (small quantity products)');

-- Product Roles
INSERT OR REPLACE INTO ref_product_roles (value, description) VALUES
    ('primer', 'Primer coat product'),
    ('finish', 'Finish/topcoat product'),
    ('sealer', 'Edge sealer, knot sealer, substrate sealer'),
    ('clear', 'Clear coat finish'),
    ('stain', 'Wood stain product'),
    ('specialty', 'Specialty product not fitting other categories');

-- Protection Levels
INSERT OR REPLACE INTO ref_protection_levels (value, description) VALUES
    ('none', 'No protection needed'),
    ('edge_only', 'Tape/drop cloth at edges only'),
    ('partial_cover', 'Tape plus paper or film covering part of surface'),
    ('full_cover', 'Complete covering of entire surface/zone'),
    ('item_mask', 'Individual item masking (hinges, hardware, fixtures)'),
    ('light_mask', 'Light tape application at junctions/edges'),
    ('full_mask', 'Full tape line with draped plastic');

-- Substrate States
INSERT OR REPLACE INTO ref_substrate_states (value, description) VALUES
    ('SS_BARE', 'Raw/uncoated substrate (bare wood, MDF, new drywall)'),
    ('SS_PRIMED', 'Generic primed state'),
    ('SS_PRIMED_FACTORY', 'Factory-applied primer'),
    ('SS_PRIMED_FIELD', 'Field-applied primer'),
    ('SS_PAINTED_FLAT', 'Finish-coated with flat sheen'),
    ('SS_PAINTED_MATTE', 'Finish-coated with matte sheen'),
    ('SS_PAINTED_EGGSHELL', 'Finish-coated with eggshell sheen'),
    ('SS_PAINTED_SATIN', 'Finish-coated with satin sheen'),
    ('SS_PAINTED_SEMIGLOSS', 'Finish-coated with semi-gloss sheen'),
    ('SS_PAINTED_GLOSS', 'Finish-coated with gloss sheen');

-- Surface Textures
INSERT OR REPLACE INTO ref_surface_textures (value, description) VALUES
    ('smooth', 'Level 4-5 drywall finish, sanded trim, factory-primed surfaces'),
    ('orange_peel', 'Light splatter texture'),
    ('knockdown', 'Knocked-down splatter texture'),
    ('heavy_texture', 'Heavy/deep texture patterns'),
    ('skip_trowel', 'Hand-troweled texture');

-- Drywall Finish Levels
INSERT OR REPLACE INTO ref_drywall_finish_levels (value, description) VALUES
    ('level_3', 'Tape and compound only, no additional skim coat'),
    ('level_4', 'Additional skim coat over joints/fasteners'),
    ('level_5', 'Skim coat entire surface for uniform porosity');

-- Severities
INSERT OR REPLACE INTO ref_severities (value, description, sort_order) VALUES
    ('critical', 'Blocks spec from being used - broken cross-references, missing required fields', 1),
    ('major', 'Significant issue but spec is usable - incorrect rates, missing coverage profiles', 2),
    ('minor', 'Cosmetic or low-impact - naming inconsistency, missing notes', 3);

-- Modifier Mechanisms
INSERT OR REPLACE INTO ref_modifier_mechanisms (value, description) VALUES
    ('baseline', 'This tier defines the baseline rate (typically QT3 = 1.0)'),
    ('baseline_reduction', 'Rate is reduced from baseline (QT2 = 0.80, less effort)'),
    ('selective_multiplier', 'Rate is multiplied for specific task types'),
    ('additional_rounds', 'Additional interstage rounds are added'),
    ('excluded', 'This tier is excluded from the spec entirely');

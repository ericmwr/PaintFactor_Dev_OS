-- PaintFactor SQLite Schema
-- Generated from: docs/System/SQLite_Schema_Contract.md v1.1.0
-- Purpose: Complete CREATE TABLE definitions for the PaintFactor database.
-- Usage: sqlite3 database/paintfactor.db < database/schema/create_tables.sql
--
-- IMPORTANT: Run seed_enums.sql after this script to populate reference tables.

-- ============================================================
-- PRAGMAs (must be set on every connection)
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================
-- Table Group 1: Spec Structure (from spec.json)
-- ============================================================

-- spec_families: Root table — one row per imported spec family
CREATE TABLE IF NOT EXISTS spec_families (
    id                TEXT    PRIMARY KEY,
    name              TEXT    NOT NULL,
    description       TEXT,
    context           TEXT,
    domain            TEXT    NOT NULL CHECK(domain IN ('interior','exterior','specialty')),
    version           TEXT    NOT NULL,
    status            TEXT    NOT NULL CHECK(status IN ('draft','review_required','approved','deprecated')),
    review_required   INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by        TEXT,
    reviewed_by       TEXT
);

-- spec_configuration_dimensions: Quality tier, application method, sheen, etc.
CREATE TABLE IF NOT EXISTS spec_configuration_dimensions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    dimension_id      TEXT    NOT NULL,
    description       TEXT,
    allowed_values    TEXT    NOT NULL,   -- JSON array
    default_value     TEXT,
    prohibited        TEXT,               -- JSON array
    notes             TEXT,
    sort_order        INTEGER,
    UNIQUE(spec_family_id, dimension_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- spec_paintable_item_types: What gets painted (ITM_ prefixed)
CREATE TABLE IF NOT EXISTS spec_paintable_item_types (
    id                TEXT    NOT NULL,
    spec_family_id    TEXT    NOT NULL,
    name              TEXT    NOT NULL,
    unit_of_measure   TEXT    NOT NULL,
    counting_rules    TEXT,
    conditional       INTEGER,
    conditional_on    TEXT,               -- JSON object
    surface_ref       TEXT,               -- PaintScope surface reference (exterior)
    notes             TEXT,
    PRIMARY KEY (id, spec_family_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- spec_variants: Configuration combinations (VAR_ prefixed)
CREATE TABLE IF NOT EXISTS spec_variants (
    id                TEXT    NOT NULL,
    spec_family_id    TEXT    NOT NULL,
    applies_when      TEXT,               -- JSON object
    coats_primer      INTEGER,
    coats_finish      INTEGER,
    round_id          TEXT,               -- Soft ref to sop_round_configurations.round_id
    protection_zones  TEXT,               -- JSON array of zone IDs
    notes             TEXT,
    PRIMARY KEY (id, spec_family_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- spec_variant_item_inclusions: Which items are included/excluded per variant
CREATE TABLE IF NOT EXISTS spec_variant_item_inclusions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    variant_id        TEXT    NOT NULL,
    item_id           TEXT    NOT NULL,
    is_included       INTEGER NOT NULL,   -- 1 = included, 0 = excluded
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id, spec_family_id) REFERENCES spec_variants(id, spec_family_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id, spec_family_id) REFERENCES spec_paintable_item_types(id, spec_family_id) ON DELETE CASCADE
);

-- spec_scope_boundaries: What's in scope and what's excluded
CREATE TABLE IF NOT EXISTS spec_scope_boundaries (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    boundary_type     TEXT    NOT NULL CHECK(boundary_type IN ('include','exclude')),
    description       TEXT    NOT NULL,
    route_to          TEXT,               -- Only for excludes with routing
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- spec_required_inputs: PaintScope inputs needed for estimation
CREATE TABLE IF NOT EXISTS spec_required_inputs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    input_name        TEXT    NOT NULL,
    paintscope_key    TEXT    NOT NULL,
    uom               TEXT    NOT NULL,
    is_required       INTEGER,
    required_when     TEXT,               -- JSON object
    status            TEXT,
    description       TEXT,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- spec_protection_zones: Areas requiring protection during work
CREATE TABLE IF NOT EXISTS spec_protection_zones (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    zone_id           TEXT    NOT NULL,
    condition         TEXT,               -- JSON object or string
    protection_level  TEXT    NOT NULL,
    upgrades_to_zone  TEXT,
    upgrades_to_level TEXT,
    upgrade_condition TEXT,
    notes             TEXT,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- spec_adjacency_declarations: Surface adjacency relationships
CREATE TABLE IF NOT EXISTS spec_adjacency_declarations (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id            TEXT    NOT NULL,
    primary_surface           TEXT    NOT NULL,
    adjacent_surface_id       TEXT    NOT NULL,
    edge_type                 TEXT    NOT NULL,
    typical_relationship      TEXT,
    continuity_rate_modifier  REAL,
    affected_tasks            TEXT,        -- JSON array
    notes                     TEXT,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- spec_state_declarations: Substrate state input/output tracking
CREATE TABLE IF NOT EXISTS spec_state_declarations (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id          TEXT    NOT NULL,
    primary_surface         TEXT    NOT NULL,
    valid_input_states      TEXT    NOT NULL,   -- JSON object: {"states": [...], "notes": "..."}
    output_state            TEXT,
    output_state_varies_by  TEXT,
    output_state_map        TEXT,               -- JSON map
    primer_routing          TEXT,               -- JSON object (exterior per-substrate primer routing)
    notes                   TEXT,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- spec_change_log: Version history entries
CREATE TABLE IF NOT EXISTS spec_change_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    version           TEXT    NOT NULL,
    date              TEXT    NOT NULL,
    author            TEXT    NOT NULL,
    changes           TEXT,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- ============================================================
-- Table Group 2: Materials (from materials.json)
-- ============================================================

-- material_systems: Paint system definitions (SYS_ prefixed)
CREATE TABLE IF NOT EXISTS material_systems (
    id                TEXT    NOT NULL,
    spec_family_id    TEXT    NOT NULL,
    name              TEXT    NOT NULL,
    description       TEXT,
    applies_when      TEXT,               -- JSON object
    allowed_sheens    TEXT,               -- JSON array
    product_role      TEXT,               -- System-level role: primer/finish (exterior)
    notes             TEXT,
    PRIMARY KEY (id, spec_family_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- material_system_products: Products within a material system
-- Dual-pattern: Drywall products[] array OR Cabinet primer/finish objects
CREATE TABLE IF NOT EXISTS material_system_products (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id          TEXT    NOT NULL,
    system_id               TEXT    NOT NULL,
    product_role            TEXT,
    product_type            TEXT,
    example_products        TEXT,          -- JSON array
    sheen                   TEXT,
    coats_required          INTEGER,
    coverage_sf_per_gallon  REAL,
    coverage_range_low      REAL,
    coverage_range_high     REAL,
    notes                   TEXT,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE,
    FOREIGN KEY (system_id, spec_family_id) REFERENCES material_systems(id, spec_family_id) ON DELETE CASCADE
);

-- material_coverage_profiles: Coverage rate definitions (COV_ prefixed)
CREATE TABLE IF NOT EXISTS material_coverage_profiles (
    id                      TEXT    NOT NULL,
    spec_family_id          TEXT    NOT NULL,
    material_system         TEXT,
    product_role            TEXT,
    surface_texture         TEXT,          -- String or JSON array
    drywall_finish_level    TEXT,          -- JSON array
    coverage_model          TEXT,
    coverage_sf_per_gallon  REAL,
    coverage_range_low      REAL,
    coverage_range_high     REAL,
    coverage_by_item        TEXT,          -- JSON object
    waste_factor            REAL,          -- Material waste multiplier (exterior)
    uom_basis               TEXT,          -- Coverage UOM basis: LF, SF (exterior)
    assumptions             TEXT,
    notes                   TEXT,
    PRIMARY KEY (id, spec_family_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- material_consumables: Brushes, rollers, tape, sandpaper, etc. (CON_ prefixed)
CREATE TABLE IF NOT EXISTS material_consumables (
    id                    TEXT    NOT NULL,
    spec_family_id        TEXT    NOT NULL,
    name                  TEXT    NOT NULL,
    consumable_category   TEXT,
    specification         TEXT,
    unit                  TEXT,
    yield_per_unit        REAL,
    yield_uom             TEXT,
    applies_when          TEXT,            -- JSON object
    notes                 TEXT,
    PRIMARY KEY (id, spec_family_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- ============================================================
-- Table Group 3: SOP Modules and Tasks (from sop_modules.json)
-- ============================================================

-- sop_round_configurations: Multi-round workflow definitions
CREATE TABLE IF NOT EXISTS sop_round_configurations (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    round_id          TEXT    NOT NULL,
    name              TEXT    NOT NULL,
    description       TEXT,
    applies_when      TEXT,               -- JSON object
    phase_sequence    TEXT,               -- JSON array (nullable — Drywall has it, Cabinet doesn't)
    total_coats       INTEGER,
    interstage_cycles INTEGER,
    notes             TEXT,
    UNIQUE(spec_family_id, round_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- sop_modules: Phase-grouped task containers (MOD_ prefixed)
CREATE TABLE IF NOT EXISTS sop_modules (
    id                TEXT    NOT NULL,
    spec_family_id    TEXT    NOT NULL,
    name              TEXT    NOT NULL,
    phase             TEXT    NOT NULL CHECK(phase IN ('setup','prep','prime','apply','interstage','finish','cleanup')),
    description       TEXT,
    applies_when      TEXT,               -- JSON object
    required_inputs   TEXT,               -- JSON array
    sequence_notes    TEXT,
    sort_order        INTEGER,
    PRIMARY KEY (id, spec_family_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- sop_tasks: Individual work tasks (TSK_ prefixed)
CREATE TABLE IF NOT EXISTS sop_tasks (
    id                    TEXT    NOT NULL,
    spec_family_id        TEXT    NOT NULL,
    module_id             TEXT    NOT NULL,
    name                  TEXT    NOT NULL,
    task_classification   TEXT,
    task_type             TEXT,
    skill_level           TEXT,
    qt_behavior           TEXT,
    description           TEXT,
    tools_required        TEXT,            -- JSON array
    applies_when          TEXT,            -- JSON object
    appears_in_tiers      TEXT,            -- JSON array
    quality_notes         TEXT,            -- JSON object
    protection_metadata   TEXT,            -- JSON object
    adjacency_metadata    TEXT,            -- JSON object
    substrate_state_rules TEXT,            -- JSON array (exterior task-level state routing)
    site_condition_rules  TEXT,            -- JSON object (exterior weather/condition gating)
    notes                 TEXT,
    sort_order            INTEGER,
    PRIMARY KEY (id, spec_family_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id, spec_family_id) REFERENCES sop_modules(id, spec_family_id) ON DELETE CASCADE
);

-- ============================================================
-- Table Group 4: Production Logic (from production.json)
-- ============================================================

-- task_production_rates: Labor rates per task
-- Three rate patterns: binary (rate_per_hour), qt_scaled (rates_by_tier), FIXED_TIME (fixed_minutes)
CREATE TABLE IF NOT EXISTS task_production_rates (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id          TEXT    NOT NULL,
    task_id                 TEXT    NOT NULL,
    name                    TEXT,
    unit_of_measure         TEXT    NOT NULL,
    required_input_key      TEXT,
    paintscope_key          TEXT,
    rate_per_hour           REAL,
    rate_range_low          REAL,
    rate_range_high         REAL,
    rates_by_tier           TEXT,          -- JSON object: {"QT3": {"rate_per_hour": 150}}
    fixed_minutes           REAL,
    fixed_minutes_range_low  REAL,
    fixed_minutes_range_high REAL,
    fixed_minutes_by_tier   TEXT,          -- JSON object: {"QT3": 10, "QT4": 15}
    crew_size               INTEGER,
    applies_when            TEXT,          -- JSON object
    defect_tolerance        TEXT,          -- JSON object (exterior per-tier QC criteria)
    notes                   TEXT,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id, spec_family_id) REFERENCES sop_tasks(id, spec_family_id) ON DELETE CASCADE
);

-- factor_modifiers: Unified modifier table with category discriminator
-- Sources: height_effects[], texture_effects[], drywall_level_effects[], factor_modifiers[]
CREATE TABLE IF NOT EXISTS factor_modifiers (
    id                TEXT    NOT NULL,
    spec_family_id    TEXT    NOT NULL,
    modifier_category TEXT    NOT NULL,    -- height/texture/drywall_level/door_style/kitchen_complexity/masking_scope/quality_tier/height_access
    name              TEXT,
    description       TEXT,
    modifier_type     TEXT,               -- multiplier/additive
    time_modifier     REAL,
    value             REAL,
    value_min         REAL,
    value_max         REAL,
    condition         TEXT,               -- JSON object or string
    values_map        TEXT,               -- JSON object (exterior multi-value modifier maps)
    notes             TEXT,
    PRIMARY KEY (id, spec_family_id),
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- factor_task_applicability: Junction table linking modifiers to specific tasks
-- Only populated for modifiers with explicit applies_to_tasks[] arrays
CREATE TABLE IF NOT EXISTS factor_task_applicability (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    factor_id         TEXT    NOT NULL,
    task_id           TEXT    NOT NULL,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE,
    FOREIGN KEY (factor_id, spec_family_id) REFERENCES factor_modifiers(id, spec_family_id) ON DELETE CASCADE,
    FOREIGN KEY (task_id, spec_family_id) REFERENCES sop_tasks(id, spec_family_id) ON DELETE CASCADE
);

-- quality_tier_effects: Per-tier production rate adjustments
CREATE TABLE IF NOT EXISTS quality_tier_effects (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    quality_tier      TEXT    NOT NULL,
    modifier_id       TEXT,
    time_modifier     REAL,
    description       TEXT,
    mechanism         TEXT,
    effect_details    TEXT,               -- JSON object
    notes             TEXT,
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- ============================================================
-- Table Group 5: QA and Governance (from qa_report.json)
-- ============================================================

-- spec_qa_reports: Summary + full JSON blob of QA review
CREATE TABLE IF NOT EXISTS spec_qa_reports (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    version           TEXT    NOT NULL,
    reviewed_by       TEXT,
    review_date       TEXT,
    status            TEXT    NOT NULL CHECK(status IN ('pass','pass_with_warnings','fail')),
    summary           TEXT,
    full_report       TEXT,               -- Entire qa_report.json as JSON blob
    FOREIGN KEY (spec_family_id) REFERENCES spec_families(id) ON DELETE CASCADE
);

-- ============================================================
-- Table Group 6: Raw Storage and Import Tracking
-- ============================================================

-- spec_artifacts_raw: Original JSON for every imported artifact (safety net)
-- Note: No ON DELETE CASCADE — raw artifacts are preserved for audit even if
-- the spec family is re-imported or removed from normalized tables.
CREATE TABLE IF NOT EXISTS spec_artifacts_raw (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id    TEXT    NOT NULL,
    artifact_type     TEXT    NOT NULL CHECK(artifact_type IN ('spec','materials','sop_modules','production','qa_report')),
    version           TEXT    NOT NULL,
    status            TEXT,
    json_content      TEXT    NOT NULL,
    imported_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(spec_family_id, artifact_type, version)
);

-- import_log: Database-side record of import operations
-- Note: No ON DELETE CASCADE — import history is preserved for audit.
CREATE TABLE IF NOT EXISTS import_log (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_family_id      TEXT    NOT NULL,
    version             TEXT    NOT NULL,
    import_status       TEXT    NOT NULL,  -- success/failed
    validation_status   TEXT,              -- pass/pass_with_warnings/fail/pending
    rows_inserted       TEXT,              -- JSON: {"spec_families": 1, "sop_tasks": 25, ...}
    errors              TEXT,              -- JSON array
    imported_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    validated_at        TEXT,
    notes               TEXT
);

-- ============================================================
-- Indexes
-- ============================================================

-- Primary lookup: find spec family by domain
CREATE INDEX IF NOT EXISTS idx_spec_families_domain
    ON spec_families(domain);

-- Variant resolution: find variants for a spec family
CREATE INDEX IF NOT EXISTS idx_spec_variants_family
    ON spec_variants(spec_family_id);

-- Task lookup: find tasks for a module
CREATE INDEX IF NOT EXISTS idx_sop_tasks_module
    ON sop_tasks(spec_family_id, module_id);

-- Rate lookup: find production rates for a task
CREATE INDEX IF NOT EXISTS idx_task_rates_task
    ON task_production_rates(spec_family_id, task_id);

-- Factor lookup: find applicable factors for a task
CREATE INDEX IF NOT EXISTS idx_factor_applicability
    ON factor_task_applicability(spec_family_id, task_id);

-- Factor lookup: find modifiers by category
CREATE INDEX IF NOT EXISTS idx_factor_modifiers_category
    ON factor_modifiers(spec_family_id, modifier_category);

-- Material system lookup by spec family
CREATE INDEX IF NOT EXISTS idx_material_systems_family
    ON material_systems(spec_family_id);

-- Material system products lookup
CREATE INDEX IF NOT EXISTS idx_material_products_system
    ON material_system_products(spec_family_id, system_id);

-- Round configuration lookup by spec family
CREATE INDEX IF NOT EXISTS idx_round_configs_family
    ON sop_round_configurations(spec_family_id);

-- Protection zone lookup by spec family
CREATE INDEX IF NOT EXISTS idx_protection_zones_family
    ON spec_protection_zones(spec_family_id);

-- Raw artifact lookup
CREATE INDEX IF NOT EXISTS idx_raw_artifacts
    ON spec_artifacts_raw(spec_family_id, artifact_type);

-- Import log lookup
CREATE INDEX IF NOT EXISTS idx_import_log
    ON import_log(spec_family_id, version);

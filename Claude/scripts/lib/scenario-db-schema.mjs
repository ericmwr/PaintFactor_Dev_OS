// Relational schema for the scenario query mirror (spec approach B):
// normalized entity + junction tables, each entity also keeping raw_json
// for lossless fidelity. Generated artifact — not enforced with foreign keys
// (referential gaps are queryable features, e.g. v_missing_material_systems).
export const SCHEMA_SQL = `
CREATE TABLE modules (
  module_id TEXT PRIMARY KEY,
  name TEXT, phase TEXT, intent TEXT, doctrine TEXT,
  application_method TEXT, kind TEXT, extends_from TEXT,
  elig_qt INTEGER, elig_height INTEGER, elig_texture INTEGER,
  elig_complexity INTEGER, elig_condition INTEGER,
  raw_json TEXT NOT NULL
);
CREATE TABLE module_tasks (
  module_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  task_ref TEXT,
  is_inline INTEGER NOT NULL,
  entry_json TEXT NOT NULL,
  PRIMARY KEY (module_id, ordinal)
);
CREATE TABLE scenarios (
  scenario_id TEXT PRIMARY KEY,
  name TEXT, domain TEXT, context TEXT, output_state TEXT,
  finish_coats INTEGER, interstage_cycles INTEGER,
  raw_json TEXT NOT NULL
);
CREATE TABLE scenario_modules (
  scenario_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  module_id TEXT NOT NULL,
  PRIMARY KEY (scenario_id, ordinal)
);
CREATE TABLE scenario_matches (
  scenario_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE scenario_protection_zones (
  scenario_id TEXT NOT NULL,
  zone_id TEXT,
  level TEXT
);
CREATE TABLE scenario_material_systems (
  scenario_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  sys_id TEXT NOT NULL,
  PRIMARY KEY (scenario_id, ordinal)
);
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  name TEXT, ps_key TEXT, uom TEXT, skill_level TEXT,
  rate_per_hour REAL,
  module_count INTEGER, scenario_count INTEGER,
  raw_json TEXT NOT NULL
);
CREATE TABLE task_dimensions (
  task_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE modifiers (
  modifier_id TEXT PRIMARY KEY,
  family TEXT, name TEXT, kind TEXT,
  raw_json TEXT NOT NULL
);
CREATE TABLE material_systems (
  id TEXT NOT NULL, spec_family_id TEXT NOT NULL, name TEXT, raw_json TEXT NOT NULL,
  PRIMARY KEY (id, spec_family_id)
);
CREATE TABLE material_coverage_profiles (
  id TEXT PRIMARY KEY, spec_family_id TEXT, material_system TEXT,
  product_role TEXT, coverage_sf_per_gallon REAL, raw_json TEXT NOT NULL
);
CREATE TABLE material_system_products (
  spec_family_id TEXT, system_id TEXT, product_role TEXT,
  product_type TEXT, coats_required INTEGER, raw_json TEXT NOT NULL
);
CREATE TABLE quality_tier_effects (
  spec_family_id TEXT, quality_tier TEXT, time_modifier REAL, raw_json TEXT NOT NULL
);
CREATE TABLE spec_protection_zones (
  spec_family_id TEXT, zone_id TEXT, protection_level TEXT, raw_json TEXT NOT NULL
);
CREATE TABLE sop_task_protection (
  id TEXT PRIMARY KEY, spec_family_id TEXT, raw_json TEXT NOT NULL
);
CREATE TABLE spec_family_info (
  id TEXT PRIMARY KEY, name TEXT, domain TEXT, raw_json TEXT NOT NULL
);
CREATE TABLE catalog_products (
  product_id TEXT PRIMARY KEY, brand TEXT, product_name TEXT,
  product_type TEXT, price_per_gallon REAL, coverage_sf_per_gallon REAL,
  raw_json TEXT NOT NULL
);
CREATE TABLE system_index (
  key TEXT PRIMARY KEY, value_json TEXT NOT NULL
);
CREATE INDEX idx_module_tasks_task_ref ON module_tasks(task_ref);
CREATE INDEX idx_scenario_modules_module ON scenario_modules(module_id);
CREATE INDEX idx_scenario_matches_dim_val ON scenario_matches(dimension, value);
CREATE INDEX idx_task_dimensions_dim_val ON task_dimensions(dimension, value);
CREATE INDEX idx_scn_matsys_sysid ON scenario_material_systems(sys_id);
CREATE INDEX idx_msp_system ON material_system_products(system_id);
CREATE VIEW v_orphan_tasks AS
  SELECT t.task_id, t.name
  FROM tasks t
  LEFT JOIN module_tasks mt ON mt.task_ref = t.task_id
  WHERE mt.task_ref IS NULL;
CREATE VIEW v_scenario_coverage AS
  SELECT pi.value AS paintable_item, am.value AS application_method,
         COUNT(DISTINCT pi.scenario_id) AS scenario_count
  FROM scenario_matches pi
  JOIN scenario_matches am ON am.scenario_id = pi.scenario_id AND am.dimension = 'application_method'
  WHERE pi.dimension = 'paintable_item'
  GROUP BY pi.value, am.value;
CREATE VIEW v_missing_material_systems AS
  SELECT DISTINCT s.sys_id
  FROM scenario_material_systems s
  LEFT JOIN material_systems m ON m.id = s.sys_id
  WHERE m.id IS NULL;
`;

export function createSchema(db) {
  db.exec(SCHEMA_SQL);
}

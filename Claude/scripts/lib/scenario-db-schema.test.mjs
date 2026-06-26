import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db-open.mjs';
import { createSchema } from './scenario-db-schema.mjs';

const EXPECTED_TABLES = [
  'modules', 'module_tasks', 'scenarios', 'scenario_modules', 'scenario_matches',
  'scenario_protection_zones', 'scenario_material_systems', 'tasks', 'task_dimensions',
  'modifiers', 'material_systems', 'material_coverage_profiles', 'material_system_products',
  'quality_tier_effects', 'spec_protection_zones', 'sop_task_protection',
  'spec_family_info', 'catalog_products', 'system_index',
];
const EXPECTED_VIEWS = ['v_orphan_tasks', 'v_scenario_coverage', 'v_missing_material_systems'];

test('createSchema builds every expected table and view', () => {
  const db = openDb(':memory:');
  createSchema(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  for (const t of EXPECTED_TABLES) assert.ok(tables.includes(t), `missing table ${t}`);
  const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all().map(r => r.name);
  for (const v of EXPECTED_VIEWS) assert.ok(views.includes(v), `missing view ${v}`);
  db.close();
});

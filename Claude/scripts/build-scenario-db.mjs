#!/usr/bin/env node
// Build the local SQLite query mirror of the scenario engine from the JSON
// source of truth. Disposable artifact — regenerate anytime. See README-scenario-db.md.
//
//   node Claude/scripts/build-scenario-db.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/scenario-sources.mjs';
import { openDb } from './lib/db-open.mjs';
import { createSchema } from './lib/scenario-db-schema.mjs';
import {
  insertModules, insertTasks, insertModifiers, insertScenarios, insertReference,
} from './lib/scenario-db-insert.mjs';
import * as rate from '../tools/paintscope/src/data/scenario-rate-data.js';
import { CATALOG_PRODUCTS, SYSTEM_INDEX } from '../tools/paintscope/src/data/product-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));   // <root>/Claude/scripts
const repoRoot = path.resolve(__dirname, '..', '..');            // <root>
const DEFAULT_OUT = path.join(repoRoot, 'Claude', 'database', 'scenario.db');

const COUNT_TABLES = [
  'modules', 'module_tasks', 'scenarios', 'scenario_modules', 'scenario_matches',
  'scenario_protection_zones', 'scenario_material_systems', 'tasks', 'task_dimensions',
  'modifiers', 'material_systems', 'material_coverage_profiles', 'material_system_products',
  'quality_tier_effects', 'spec_protection_zones', 'sop_task_protection',
  'spec_family_info', 'catalog_products', 'system_index',
];

export function buildDb({ outFile = DEFAULT_OUT, quiet = false } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);

  const { modules, scenarios, modifiers, tasks } = loadAll();
  log(`Loaded ${Object.keys(modules).length} modules, ${scenarios.length} scenarios, ` +
      `${Object.keys(tasks).length} tasks, ${Object.keys(modifiers).length} modifiers.`);

  if (outFile !== ':memory:') {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.rmSync(outFile, { force: true });
  }
  const db = openDb(outFile);
  createSchema(db);
  db.exec('BEGIN');
  insertModules(db, modules);
  insertTasks(db, tasks);
  insertModifiers(db, modifiers);
  insertScenarios(db, scenarios);
  insertReference(db, {
    MATERIAL_SYSTEMS: rate.MATERIAL_SYSTEMS,
    MATERIAL_COVERAGE_PROFILES: rate.MATERIAL_COVERAGE_PROFILES,
    MATERIAL_SYSTEM_PRODUCTS: rate.MATERIAL_SYSTEM_PRODUCTS,
    QUALITY_TIER_EFFECTS: rate.QUALITY_TIER_EFFECTS,
    SPEC_PROTECTION_ZONES: rate.SPEC_PROTECTION_ZONES,
    SOP_TASK_PROTECTION: rate.SOP_TASK_PROTECTION,
    SPEC_FAMILY_INFO: rate.SPEC_FAMILY_INFO,
    CATALOG_PRODUCTS,
    SYSTEM_INDEX,
  });
  db.exec('COMMIT');

  const counts = {};
  for (const t of COUNT_TABLES) counts[t] = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  log('Row counts:');
  for (const t of COUNT_TABLES) log(`  ${t.padEnd(28)} ${counts[t]}`);
  if (outFile !== ':memory:') log(`\nWrote ${outFile}`);
  return { db, counts };
}

// Run as a script (not when imported by the smoke test).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build-scenario-db.mjs')) {
  const { db } = buildDb();
  db.close();
}

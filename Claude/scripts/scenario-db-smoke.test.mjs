import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDb } from './build-scenario-db.mjs';
import * as rate from '../tools/paintscope/src/data/scenario-rate-data.js';
import { CATALOG_PRODUCTS, SYSTEM_INDEX } from '../tools/paintscope/src/data/product-catalog.js';

test('buildDb produces a populated in-memory mirror with working views', () => {
  const { db, counts } = buildDb({ outFile: ':memory:', quiet: true });
  // Real-data lower bounds (counts grow as content is authored).
  assert.ok(counts.modules > 700, `modules ${counts.modules}`);
  assert.ok(counts.scenarios > 480, `scenarios ${counts.scenarios}`);
  assert.ok(counts.tasks > 1600, `tasks ${counts.tasks}`);
  assert.ok(counts.modifiers >= 27, `modifiers >= 27, got ${counts.modifiers}`);
  assert.ok(counts.material_systems > 200, `material_systems ${counts.material_systems}`);
  assert.ok(counts.catalog_products > 300, `catalog_products ${counts.catalog_products}`);
  // Junctions populated.
  assert.ok(db.prepare('SELECT COUNT(*) c FROM scenario_modules').get().c > 1000);
  assert.ok(db.prepare('SELECT COUNT(*) c FROM task_dimensions').get().c > 1000);
  // Views are queryable.
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_orphan_tasks LIMIT 1').all());
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_scenario_coverage LIMIT 1').all());
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_missing_material_systems LIMIT 1').all());
  // Losslessness guard: DB row count must equal source array length (drift-proof).
  assert.equal(counts.material_systems, rate.MATERIAL_SYSTEMS.length);
  assert.equal(counts.material_coverage_profiles, rate.MATERIAL_COVERAGE_PROFILES.length);
  assert.equal(counts.material_system_products, rate.MATERIAL_SYSTEM_PRODUCTS.length);
  assert.equal(counts.quality_tier_effects, rate.QUALITY_TIER_EFFECTS.length);
  assert.equal(counts.spec_protection_zones, rate.SPEC_PROTECTION_ZONES.length);
  assert.equal(counts.sop_task_protection, rate.SOP_TASK_PROTECTION.length);
  assert.equal(counts.spec_family_info, rate.SPEC_FAMILY_INFO.length);
  assert.equal(counts.catalog_products, CATALOG_PRODUCTS.length);
  assert.equal(counts.system_index, SYSTEM_INDEX instanceof Map ? SYSTEM_INDEX.size : Object.keys(SYSTEM_INDEX).length);
  db.close();
});

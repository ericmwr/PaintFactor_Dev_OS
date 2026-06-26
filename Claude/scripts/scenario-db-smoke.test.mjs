import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDb } from './build-scenario-db.mjs';

test('buildDb produces a populated in-memory mirror with working views', () => {
  const { db, counts } = buildDb({ outFile: ':memory:', quiet: true });
  // Real-data lower bounds (counts grow as content is authored).
  assert.ok(counts.modules > 700, `modules ${counts.modules}`);
  assert.ok(counts.scenarios > 480, `scenarios ${counts.scenarios}`);
  assert.ok(counts.tasks > 1600, `tasks ${counts.tasks}`);
  assert.equal(counts.modifiers, 27);
  assert.ok(counts.material_systems > 200, `material_systems ${counts.material_systems}`);
  assert.ok(counts.catalog_products > 300, `catalog_products ${counts.catalog_products}`);
  // Junctions populated.
  assert.ok(db.prepare('SELECT COUNT(*) c FROM scenario_modules').get().c > 1000);
  assert.ok(db.prepare('SELECT COUNT(*) c FROM task_dimensions').get().c > 1000);
  // Views are queryable.
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_orphan_tasks LIMIT 1').all());
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_scenario_coverage LIMIT 1').all());
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_missing_material_systems LIMIT 1').all());
  db.close();
});

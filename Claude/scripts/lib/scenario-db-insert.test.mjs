import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db-open.mjs';
import { createSchema } from './scenario-db-schema.mjs';
import { insertModules, insertTasks, insertModifiers } from './scenario-db-insert.mjs';

function freshDb() { const db = openDb(':memory:'); createSchema(db); return db; }

test('insertModules fills modules + ordered module_tasks (inline + ref)', () => {
  const db = freshDb();
  insertModules(db, {
    MOD_X: {
      module_id: 'MOD_X', name: 'X', phase: 'prep', application_method: 'brush',
      modifier_eligibility: { qt: true, height: false },
      tasks: [{ task_ref: 'TSK_A' }, { task_id: 'TSK_INLINE', applies_when: { x: 1 } }],
    },
  });
  const mod = db.prepare('SELECT * FROM modules WHERE module_id = ?').get('MOD_X');
  assert.equal(mod.phase, 'prep');
  assert.equal(mod.elig_qt, 1);
  assert.equal(mod.elig_height, 0);
  const rows = db.prepare('SELECT ordinal, task_ref, is_inline FROM module_tasks WHERE module_id = ? ORDER BY ordinal').all('MOD_X');
  assert.deepEqual(rows, [
    { ordinal: 0, task_ref: 'TSK_A', is_inline: 0 },
    { ordinal: 1, task_ref: null, is_inline: 1 },
  ]);
  db.close();
});

test('insertTasks fills tasks + task_dimensions from _derived', () => {
  const db = freshDb();
  insertTasks(db, {
    TSK_A: {
      task_id: 'TSK_A', name: 'A', ps_key: 'PS_X', uom: 'LF', skill_level: 'experienced',
      rate_per_hour: 8,
      _derived: { phases: ['prep'], methods: ['brush'], substrates: ['arch_element'],
                  qts: ['QT3'], buckets: ['nc_interior'], coatings: ['paint'],
                  module_count: 2, scenario_count: 5 },
    },
  });
  const t = db.prepare('SELECT rate_per_hour, module_count FROM tasks WHERE task_id = ?').get('TSK_A');
  assert.equal(t.rate_per_hour, 8);
  assert.equal(t.module_count, 2);
  const subs = db.prepare("SELECT value FROM task_dimensions WHERE task_id=? AND dimension='substrate'").all('TSK_A');
  assert.deepEqual(subs.map(r => r.value), ['arch_element']);
  db.close();
});

test('insertModifiers derives family from id prefix', () => {
  const db = freshDb();
  insertModifiers(db, {
    FAC_ONE: { modifier_id: 'FAC_ONE', name: 'One', kind: 'dynamic' },
    TRADE_TWO: { modifier_id: 'TRADE_TWO', name: 'Two', kind: 'material' },
  });
  const fams = db.prepare('SELECT modifier_id, family FROM modifiers ORDER BY modifier_id').all();
  assert.deepEqual(fams, [
    { modifier_id: 'FAC_ONE', family: 'FAC' },
    { modifier_id: 'TRADE_TWO', family: 'TRADE' },
  ]);
  db.close();
});

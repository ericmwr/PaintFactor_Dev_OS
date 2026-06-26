import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db-open.mjs';

test('openDb returns a usable in-memory SQLite handle', () => {
  const db = openDb(':memory:');
  db.exec('CREATE TABLE t (id TEXT PRIMARY KEY, n INTEGER)');
  db.prepare('INSERT INTO t (id, n) VALUES (?, ?)').run('a', 1);
  const row = db.prepare('SELECT n FROM t WHERE id = ?').get('a');
  assert.equal(row.n, 1);
  db.close();
});

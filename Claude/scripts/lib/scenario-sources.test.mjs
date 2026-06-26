import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from './scenario-sources.mjs';

test('loadAll returns resolved, derived scenario data', () => {
  const { modules, scenarios, modifiers, tasks } = loadAll();
  // Lower-bound sanity (exact counts drift as content is authored).
  assert.ok(Object.keys(modules).length > 700, 'modules > 700');
  assert.ok(scenarios.length > 480, 'scenarios > 480');
  assert.ok(Object.keys(tasks).length > 1600, 'tasks > 1600');
  assert.equal(Object.keys(modifiers).length, 27, 'modifiers == 27 (25 FAC + 2 TRADE)');
  // Every task is enriched with _derived by loadAll().
  const sample = Object.values(tasks)[0];
  assert.ok(sample._derived, 'task has _derived');
  assert.ok(Array.isArray(sample._derived.phases), '_derived.phases is an array');
});

// Fired-tasks ledger — accumulates which canonical task IDs have fired
// across estimate runs, with last-seen breadcrumbs (scenario, module,
// ps_key, hours, source). Drives the "elimination by absence" cleanup
// workflow described in MEMORY.md.
//
// Records are upserted per task_id: the first fire creates the record,
// subsequent fires update last_seen + fire_count + last_context. The
// store grows monotonically until the user explicitly clears it.
//
// Storage: paintfactor IDB v10, store 'fired_tasks_seen', keyed by task_id.

import { getDB } from './project-db.js';

const STORE = 'fired_tasks_seen';

function nowIso() { return new Date().toISOString(); }

/**
 * Upsert a batch of fired tasks observed during one estimate run.
 *
 * @param {Array} firedTasks - [{ task_id, hours, ps_key, scenario_id, module_id }]
 * @param {object} meta - { source: 'organic'|'probe', probe_id?, project_label? }
 */
export async function recordFiredTasks(firedTasks, meta = {}) {
  if (!Array.isArray(firedTasks) || firedTasks.length === 0) return 0;
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const ts = nowIso();
  const source = meta.source || 'organic';
  const probeId = meta.probe_id || null;
  const projectLabel = meta.project_label || null;

  let upserted = 0;
  for (const ft of firedTasks) {
    if (!ft?.task_id) continue;
    const existing = await store.get(ft.task_id);
    const ctx = {
      hours: ft.hours,
      ps_key: ft.ps_key,
      scenario_id: ft.scenario_id,
      module_id: ft.module_id,
      project_label: projectLabel,
      probe_id: probeId,
    };
    const record = existing
      ? {
          ...existing,
          last_seen: ts,
          last_source: source,
          fire_count: (existing.fire_count || 0) + 1,
          last_context: ctx,
        }
      : {
          task_id: ft.task_id,
          first_seen: ts,
          last_seen: ts,
          first_source: source,
          last_source: source,
          fire_count: 1,
          last_context: ctx,
        };
    await store.put(record);
    upserted++;
  }
  await tx.done;
  return upserted;
}

/**
 * Return all ledger records as an array.
 */
export async function getLedger() {
  const db = await getDB();
  return db.getAll(STORE);
}

/**
 * Number of distinct task IDs in the ledger.
 */
export async function getLedgerCount() {
  const db = await getDB();
  return db.count(STORE);
}

/**
 * Build the export payload as a JSON-friendly object.
 */
export async function buildLedgerExport() {
  const records = await getLedger();
  records.sort((a, b) => (a.task_id || '').localeCompare(b.task_id || ''));
  const sourceCounts = records.reduce((acc, r) => {
    acc[r.last_source || 'unknown'] = (acc[r.last_source || 'unknown'] || 0) + 1;
    return acc;
  }, {});
  return {
    exported_at: nowIso(),
    db: 'paintfactor',
    store: STORE,
    distinct_tasks: records.length,
    source_counts_by_last_source: sourceCounts,
    records,
  };
}

/**
 * Clear all ledger records. Returns the count cleared.
 */
export async function clearLedger() {
  const db = await getDB();
  const before = await db.count(STORE);
  await db.clear(STORE);
  return before;
}

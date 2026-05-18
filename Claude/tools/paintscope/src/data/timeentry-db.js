import { getDB } from './project-db';

export async function listTimeEntries(projectId) {
  const db = await getDB();
  if (projectId) {
    return db.getAllFromIndex('time_entries', 'project_id', projectId);
  }
  return db.getAll('time_entries');
}

export async function saveTimeEntry(entry) {
  const db = await getDB();
  if (!entry.id) {
    entry.id = `te_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    entry.created_at = new Date().toISOString();
  }
  await db.put('time_entries', entry);
  return entry;
}

export async function deleteTimeEntry(id) {
  const db = await getDB();
  await db.delete('time_entries', id);
}

/**
 * Bulk-delete time entries for a project. With { onlyNew: true } (default),
 * only deletes entries that have a snapshot_id (the tracker-MVP entries),
 * leaving pre-snapshot/legacy entries alone.
 */
export async function deleteTimeEntriesForProject(projectId, { onlyNew = true } = {}) {
  if (!projectId) return 0;
  const db = await getDB();
  const all = await db.getAllFromIndex('time_entries', 'project_id', projectId);
  const targets = onlyNew ? all.filter(e => e.snapshot_id) : all;
  const tx = db.transaction('time_entries', 'readwrite');
  for (const e of targets) tx.store.delete(e.id);
  await tx.done;
  return targets.length;
}

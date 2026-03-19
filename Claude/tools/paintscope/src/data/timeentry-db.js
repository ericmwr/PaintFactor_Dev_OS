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

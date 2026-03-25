import { getDB } from '../data/project-db';

const STORE = 'spec_editor';
const KEY = 'working_copy';

export async function loadWorkingCopy() {
  const db = await getDB();
  const record = await db.get(STORE, KEY);
  return record?.data || null;
}

export async function saveWorkingCopy(editableTables) {
  const db = await getDB();
  await db.put(STORE, { key: KEY, data: editableTables, updated_at: new Date().toISOString() });
}

export async function clearWorkingCopy() {
  const db = await getDB();
  await db.delete(STORE, KEY);
}

export async function loadAndClearOverlays() {
  const db = await getDB();
  const overlays = await db.getAll('rate_overlays');
  if (overlays.length > 0) {
    const tx = db.transaction('rate_overlays', 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
  return overlays;
}

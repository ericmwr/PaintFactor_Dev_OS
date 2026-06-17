// IDB CRUD for tracker_snapshots store. One snapshot per project is the
// current/active snapshot — re-snapshotting writes a new record and
// supersedes the prior one (the prior stays in the store so that
// time_entries.snapshot_id references remain valid, but the tracker
// UI only renders the latest).

import { getDB } from './project-db.js';

const STORE = 'tracker_snapshots';

export async function saveTrackerSnapshot(snapshot) {
  if (!snapshot || !snapshot.snapshot_id || !snapshot.project_id) {
    throw new Error('tracker-db: snapshot must have snapshot_id and project_id');
  }
  const db = await getDB();
  await db.put(STORE, snapshot);
  return snapshot;
}

export async function loadCurrentTrackerSnapshot(projectId) {
  if (!projectId) return null;
  const db = await getDB();
  const tx = db.transaction(STORE, 'readonly');
  const index = tx.store.index('by_project');
  const all = await index.getAll(projectId);
  if (!all || all.length === 0) return null;
  // Newest first by taken_at
  all.sort((a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''));
  return all[0];
}

export async function listSnapshotsForProject(projectId) {
  if (!projectId) return [];
  const db = await getDB();
  const tx = db.transaction(STORE, 'readonly');
  const all = await tx.store.index('by_project').getAll(projectId);
  return all.sort((a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''));
}

export async function deleteTrackerSnapshot(snapshotId) {
  const db = await getDB();
  await db.delete(STORE, snapshotId);
}

import { getDB } from './project-db';

export async function listOverlays() {
  const db = await getDB();
  return db.getAll('rate_overlays');
}

export async function getOverlaysBySpec(specFamilyId) {
  const db = await getDB();
  return db.getAllFromIndex('rate_overlays', 'spec_family_id', specFamilyId);
}

export async function saveOverlay(overlay) {
  const db = await getDB();
  overlay.updated_at = new Date().toISOString();
  const id = await db.put('rate_overlays', overlay);
  return { ...overlay, id };
}

export async function deleteOverlay(id) {
  const db = await getDB();
  await db.delete('rate_overlays', id);
}

/**
 * Build a lookup map: { "specFamilyId::taskId" => { override_value, field_name } }
 */
export async function buildOverlayMap() {
  const all = await listOverlays();
  const map = {};
  for (const o of all) {
    const key = `${o.spec_family_id}::${o.task_id}`;
    map[key] = o;
  }
  return map;
}

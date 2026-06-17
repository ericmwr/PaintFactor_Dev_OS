import { openDB } from 'idb';

const DB_NAME = 'paintfactor';
const DB_VERSION = 11;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1: projects + company_profile
        if (oldVersion < 1) {
          const projects = db.createObjectStore('projects', { keyPath: 'id' });
          projects.createIndex('status', 'status');
          projects.createIndex('updated_at', 'updated_at');
          db.createObjectStore('company_profile', { keyPath: 'key' });
        }
        // v2: rate_overlays
        if (oldVersion < 2) {
          const overlays = db.createObjectStore('rate_overlays', { keyPath: 'id', autoIncrement: true });
          overlays.createIndex('spec_family_id', 'spec_family_id');
        }
        // v3: assemblies
        if (oldVersion < 3) {
          const assemblies = db.createObjectStore('assemblies', { keyPath: 'id' });
          assemblies.createIndex('category', 'category');
        }
        // v4: products
        if (oldVersion < 4) {
          const products = db.createObjectStore('products', { keyPath: 'id' });
          products.createIndex('product_type', 'product_type');
          products.createIndex('brand', 'brand');
        }
        // v5: time_entries
        if (oldVersion < 5) {
          const entries = db.createObjectStore('time_entries', { keyPath: 'id' });
          entries.createIndex('project_id', 'project_id');
          entries.createIndex('date', 'date');
        }
        // v6: spec editor working copy
        if (oldVersion < 6) {
          db.createObjectStore('spec_editor', { keyPath: 'key' });
        }
        // v7: authoring drafts (modules, scenarios, assemblies)
        if (oldVersion < 7) {
          const moduleDrafts = db.createObjectStore('module_drafts', { keyPath: 'id' });
          moduleDrafts.createIndex('status', 'status');
          moduleDrafts.createIndex('phase', 'phase');
          const scenarioDrafts = db.createObjectStore('scenario_drafts', { keyPath: 'id' });
          scenarioDrafts.createIndex('status', 'status');
          scenarioDrafts.createIndex('paintable_item', 'paintable_item');
          const assemblyDrafts = db.createObjectStore('assembly_drafts', { keyPath: 'id' });
          assemblyDrafts.createIndex('status', 'status');
        }
        // v8: modifier drafts
        if (oldVersion < 8) {
          const modifierDrafts = db.createObjectStore('modifier_drafts', { keyPath: 'id' });
          modifierDrafts.createIndex('status', 'status');
          modifierDrafts.createIndex('kind', 'kind');
        }
        // v9: task drafts (canonical task library)
        if (oldVersion < 9) {
          const taskDrafts = db.createObjectStore('task_drafts', { keyPath: 'id' });
          taskDrafts.createIndex('status', 'status');
          taskDrafts.createIndex('phase', 'phase');
        }
        // v10: fired_tasks_seen ledger — accumulates which task IDs have
        // fired across estimates, with last-seen breadcrumbs. Drives the
        // "elimination by absence" cleanup workflow: anything in the
        // canonical bundle but not in this store is a candidate for review.
        if (oldVersion < 10) {
          const seen = db.createObjectStore('fired_tasks_seen', { keyPath: 'task_id' });
          seen.createIndex('last_seen', 'last_seen');
          seen.createIndex('last_source', 'last_source');
        }
        // v11: tracker_snapshots — frozen estimate output per project at the
        // moment the project transitions to in_progress. One active snapshot
        // per project (re-snapshotting writes a new record; older snapshots
        // stay so existing time_entries.snapshot_id references remain valid).
        if (oldVersion < 11) {
          const snapshots = db.createObjectStore('tracker_snapshots', { keyPath: 'snapshot_id' });
          snapshots.createIndex('by_project', 'project_id');
          snapshots.createIndex('by_taken_at', 'taken_at');
        }
      },
    });
  }
  return dbPromise;
}

// ── Projects ──

export async function listProjects() {
  const db = await getDB();
  const all = await db.getAll('projects');
  return all.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function loadProject(id) {
  const db = await getDB();
  return db.get('projects', id);
}

export async function saveProject(project) {
  const db = await getDB();
  project.updated_at = new Date().toISOString();
  await db.put('projects', project);
  return project;
}

export async function deleteProject(id) {
  const db = await getDB();
  await db.delete('projects', id);
}

export async function createProject(name, projectData) {
  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const project = {
    id,
    name: name || 'Untitled Project',
    client_name: '',
    address: '',
    status: 'draft',
    created_at: now,
    updated_at: now,
    project_data: projectData,
  };
  const db = await getDB();
  await db.put('projects', project);
  return project;
}

/**
 * Migrate existing localStorage state into IndexedDB as a project.
 * Returns the migrated project record or null if nothing to migrate.
 */
export async function migrateFromLocalStorage() {
  const STORAGE_KEY = 'paintscope_state';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (!parsed.project || !parsed.rooms) return null;

    // Check if we already migrated
    const db = await getDB();
    const existing = await db.getAll('projects');
    const alreadyMigrated = existing.some(p => p.name === (parsed.project.name || 'Migrated Project') && p.status === 'draft');
    if (alreadyMigrated && existing.length > 0) return null;

    const proj = await createProject(
      parsed.project.name || 'Migrated Project',
      {
        project: parsed.project,
        rooms: parsed.rooms,
        exterior: parsed.exterior,
        ui: parsed.ui,
      }
    );
    // Don't remove localStorage yet — keep as backup until user confirms
    return proj;
  } catch (e) {
    console.error('[PaintFactor] Migration error:', e);
    return null;
  }
}

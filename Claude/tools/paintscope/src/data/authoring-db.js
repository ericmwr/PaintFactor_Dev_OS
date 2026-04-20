// Authoring drafts: modules, scenarios, assemblies.
//
// Three IndexedDB object stores, all keyed by the record's own id
// (MOD_*, SCN_*, ASM_*). Each record carries the full JSON payload
// plus authoring metadata:
//   status:     'draft' | 'published' | 'local_override'
//   created_by: reserved for RBAC (currently null / 'admin')
//   visibility: reserved for RBAC ('private' | 'shared' | 'canonical')
//   updated_at: ISO timestamp
//
// Publishing (Phase E) flips status to 'published' and writes the
// record back to disk — the draft stays in IndexedDB as an audit log
// of what was published.

import { getDB } from './project-db.js';

const STORES = {
  module: 'module_drafts',
  scenario: 'scenario_drafts',
  assembly: 'assembly_drafts',
  modifier: 'modifier_drafts',
};

function now() { return new Date().toISOString(); }

function stampMeta(record, { isNew }) {
  const stamped = { ...record };
  if (isNew) {
    stamped.created_at = stamped.created_at || now();
    stamped.created_by = stamped.created_by || 'admin';
    stamped.visibility = stamped.visibility || 'private';
    stamped.status = stamped.status || 'draft';
  }
  stamped.updated_at = now();
  return stamped;
}

// ── Generic CRUD ──

async function list(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

async function load(storeName, id) {
  const db = await getDB();
  return db.get(storeName, id);
}

async function save(storeName, record) {
  if (!record || !record.id) {
    throw new Error(`authoring-db: record must have an id (store=${storeName})`);
  }
  const db = await getDB();
  const existing = await db.get(storeName, record.id);
  const stamped = stampMeta(record, { isNew: !existing });
  await db.put(storeName, stamped);
  return stamped;
}

async function remove(storeName, id) {
  const db = await getDB();
  await db.delete(storeName, id);
}

async function listByStatus(storeName, status) {
  const db = await getDB();
  const idx = db.transaction(storeName).store.index('status');
  return idx.getAll(status);
}

// ── Module drafts ──

export const listModuleDrafts   = () => list(STORES.module);
export const loadModuleDraft    = (id) => load(STORES.module, id);
export const saveModuleDraft    = (mod) => save(STORES.module, mod);
export const deleteModuleDraft  = (id) => remove(STORES.module, id);
export const listActiveModuleOverlays = () => listByStatus(STORES.module, 'draft');

// ── Scenario drafts ──

export const listScenarioDrafts   = () => list(STORES.scenario);
export const loadScenarioDraft    = (id) => load(STORES.scenario, id);
export const saveScenarioDraft    = (scn) => save(STORES.scenario, scn);
export const deleteScenarioDraft  = (id) => remove(STORES.scenario, id);
export const listActiveScenarioOverlays = () => listByStatus(STORES.scenario, 'draft');

// ── Assembly drafts ──

export const listAssemblyDrafts   = () => list(STORES.assembly);
export const loadAssemblyDraft    = (id) => load(STORES.assembly, id);
export const saveAssemblyDraft    = (asm) => save(STORES.assembly, asm);
export const deleteAssemblyDraft  = (id) => remove(STORES.assembly, id);
export const listActiveAssemblyOverlays = () => listByStatus(STORES.assembly, 'draft');

// ── Modifier drafts ──

export const listModifierDrafts   = () => list(STORES.modifier);
export const loadModifierDraft    = (id) => load(STORES.modifier, id);
export const saveModifierDraft    = (fac) => save(STORES.modifier, fac);
export const deleteModifierDraft  = (id) => remove(STORES.modifier, id);

// ── Bulk read for overlay loader ──

export async function loadAllDrafts() {
  const [modules, scenarios, assemblies, modifiers] = await Promise.all([
    listModuleDrafts(),
    listScenarioDrafts(),
    listAssemblyDrafts(),
    listModifierDrafts(),
  ]);
  return { modules, scenarios, assemblies, modifiers };
}
